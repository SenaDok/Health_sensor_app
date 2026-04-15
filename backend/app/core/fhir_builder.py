from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.observation import ObservationCreate


def build_fhir_observation(data: ObservationCreate) -> dict:
    """Build a FHIR R4 Observation resource from sensor data."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "Observation",
        "id": str(uuid4()),
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": data.code_system,
                    "code": data.code_value,
                    "display": data.code_display,
                }
            ],
            "text": data.code_display,
        },
        "subject": {"reference": data.subject_reference},
        "effectiveDateTime": now,
        "issued": now,
        "valueQuantity": {
            "value": data.value_quantity,
            "unit": data.value_unit,
            "system": "http://unitsofmeasure.org",
        },
    }
