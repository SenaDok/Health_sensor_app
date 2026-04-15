import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import database
from app.routers import observations, websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to database...")
    await database.connect()
    logger.info("Database connected.")
    yield
    await database.disconnect()
    logger.info("Database disconnected.")


app = FastAPI(
    title="Health Sensor API",
    description="FHIR-compliant health sensor data API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production via env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # Audit logging (non-blocking)
    try:
        from app.core.database import database
        await database.execute(
            """INSERT INTO audit_logs (action, client_ip, user_agent, status_code)
               VALUES (:action, :ip, :ua, :status)""",
            {
                "action": f"{request.method} {request.url.path}",
                "ip": request.client.host if request.client else "unknown",
                "ua": request.headers.get("user-agent", ""),
                "status": response.status_code,
            },
        )
    except Exception:
        pass  # Never crash on audit failure
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(observations.router, prefix="/api/v1", tags=["observations"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
