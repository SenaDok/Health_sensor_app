import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import database
from app.core.fhir_builder import build_fhir_observation
from app.routers.websocket import manager
from app.schemas.observation import ObservationCreate, ObservationList, ObservationResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/observations",
    response_model=ObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a sensor observation",
)
async def create_observation(data: ObservationCreate):
    fhir = build_fhir_observation(data)

    query = """
        INSERT INTO observations
            (resource_type, status, code_system, code_value, code_display,
             value_quantity, value_unit, subject_reference, raw_fhir)
        VALUES
            (:resource_type, :status, :code_system, :code_value, :code_display,
             :value_quantity, :value_unit, :subject_reference, :raw_fhir)
        RETURNING *
    """
    row = await database.fetch_one(
        query,
        {
            "resource_type": "Observation",
            "status": "final",
            "code_system": data.code_system,
            "code_value": data.code_value,
            "code_display": data.code_display,
            "value_quantity": data.value_quantity,
            "value_unit": data.value_unit,
            "subject_reference": data.subject_reference,
            "raw_fhir": json.dumps(fhir),
        },
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")

    result = dict(row)
    result["raw_fhir"] = json.loads(result["raw_fhir"])

    # Broadcast to WebSocket clients
    await manager.broadcast(json.dumps({
        "event": "new_observation",
        "data": {
            "id": str(result["id"]),
            "code_display": result["code_display"],
            "value_quantity": float(result["value_quantity"]),
            "value_unit": result["value_unit"],
            "effective_datetime": result["effective_datetime"].isoformat(),
        }
    }))

    logger.info(f"New observation: {data.code_display} = {data.value_quantity} {data.value_unit}")
    return result


@router.get(
    "/observations",
    response_model=ObservationList,
    summary="List observations",
)
async def list_observations(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    code: Optional[str] = Query(default=None),
):
    where = "WHERE code_value = :code" if code else ""
    params = {"limit": limit, "offset": offset}
    if code:
        params["code"] = code

    rows = await database.fetch_all(
        f"SELECT * FROM observations {where} ORDER BY effective_datetime DESC LIMIT :limit OFFSET :offset",
        params,
    )
    total = await database.fetch_val(
        f"SELECT COUNT(*) FROM observations {where}",
        {"code": code} if code else {},
    )

    items = []
    for row in rows:
        r = dict(row)
        r["raw_fhir"] = json.loads(r["raw_fhir"])
        items.append(r)

    return {"total": total, "items": items}


@router.get(
    "/observations/{observation_id}",
    response_model=ObservationResponse,
    summary="Get single observation as FHIR JSON",
)
async def get_observation(observation_id: str):
    row = await database.fetch_one(
        "SELECT * FROM observations WHERE id = :id",
        {"id": observation_id},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Observation not found")
    r = dict(row)
    r["raw_fhir"] = json.loads(r["raw_fhir"])
    return r
