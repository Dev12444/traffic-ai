"""
FastAPI inference service (Days 9-10).

Endpoints
    GET  /status          health check + loaded-model info
    POST /predict         recent counts -> 15-20 min congestion forecast
    POST /vehicles/ingest raw counts pushed to the DB sink (Person A writes / B receives)
    POST /ingest          alias of /vehicles/ingest

Startup loads the trained CNN-GRU (or the rule-based fallback) once and reuses
it. Optional bearer-token auth is enabled by setting API_KEY in the environment.

Run locally:
    uvicorn app.main:app --reload --port 8000
Then open http://localhost:8000/docs for interactive request/response docs.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.responses import JSONResponse

from src import config
from src.db import get_sink
from src.detection import DetectionRecord
from src.logging_utils import get_logger
from src.predict import Predictor, RuleBasedPredictor, get_predictor

from .schemas import (
    IngestRequest,
    IngestResponse,
    PredictRequest,
    PredictResponse,
    StatusResponse,
)

log = get_logger("api")

# shared state; populated eagerly on startup, and lazily on first use so the app
# also works under a bare TestClient (which does not run lifespan events).
STATE: dict = {"predictor": None, "sink": None}


def get_state_predictor():
    if STATE["predictor"] is None:
        STATE["predictor"] = get_predictor()
    return STATE["predictor"]


def get_state_sink():
    if STATE["sink"] is None:
        STATE["sink"] = get_sink()
    return STATE["sink"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting %s v%s", config.API_TITLE, config.API_VERSION)
    STATE["predictor"] = get_predictor()
    STATE["sink"] = get_sink()
    log.info("Predictor ready: %s", type(STATE["predictor"]).__name__)
    yield
    log.info("Shutting down.")


app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    description=(
        "Vehicle-count -> 15-20 minute congestion forecast for a 4-lane "
        "intersection (N/S/E/W). Part of the Person A AI/ML pipeline."
    ),
    lifespan=lifespan,
)


# ── auth ────────────────────────────────────────────────────────────────────
def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """Bearer-token check. No-op when API_KEY is unset (local/demo mode)."""
    if not config.API_KEY:
        return
    expected = f"Bearer {config.API_KEY}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization bearer token",
        )


# ── error handling ──────────────────────────────────────────────────────────
@app.exception_handler(ValueError)
async def value_error_handler(_, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


# ── routes ──────────────────────────────────────────────────────────────────
@app.get("/status", response_model=StatusResponse, tags=["health"])
def get_status() -> StatusResponse:
    predictor = get_state_predictor()
    is_trained = isinstance(predictor, Predictor)
    return StatusResponse(
        status="ok",
        api_version=config.API_VERSION,
        model_loaded=predictor is not None,
        model_type="cnn_gru" if is_trained else "rule_based_ewma",
        lookback=config.MODEL_CFG.lookback,
        horizon_minutes=config.MODEL_CFG.horizon * config.MODEL_CFG.step_minutes,
        metrics=getattr(predictor, "metrics", {}) if is_trained else {},
    )


@app.post("/predict", response_model=PredictResponse, tags=["prediction"],
          dependencies=[Depends(require_api_key)])
def predict(req: PredictRequest) -> PredictResponse:
    predictor = get_state_predictor()
    readings = [r.model_dump() for r in req.readings]  # lane_counts -> {"N":..,"S":..}
    result = predictor.predict(readings, intersection_id=req.intersection_id)
    log.info("predict %s -> count=%d conf=%.2f (%s)",
             result["intersection_id"], result["predicted_count"],
             result["confidence"], result["model"])
    return PredictResponse(**result)


def _ingest(req: IngestRequest) -> IngestResponse:
    ts = req.timestamp or datetime.now(timezone.utc).isoformat()
    record = DetectionRecord(
        intersection_id=req.intersection_id,
        timestamp=ts,
        lane_counts=req.lane_counts.as_dict(),
    )
    get_state_sink().push(record)
    log.info("ingest %s @ %s total=%d", record.intersection_id, ts, record.total)
    return IngestResponse(
        status="stored",
        intersection_id=record.intersection_id,
        timestamp=ts,
        total=record.total,
    )


@app.post("/vehicles/ingest", response_model=IngestResponse, tags=["ingest"],
          dependencies=[Depends(require_api_key)])
def ingest_vehicles(req: IngestRequest) -> IngestResponse:
    return _ingest(req)


@app.post("/ingest", response_model=IngestResponse, tags=["ingest"],
          dependencies=[Depends(require_api_key)])
def ingest_alias(req: IngestRequest) -> IngestResponse:
    return _ingest(req)


@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "service": config.API_TITLE,
        "version": config.API_VERSION,
        "docs": "/docs",
        "endpoints": ["/status", "/predict", "/vehicles/ingest", "/ingest"],
    }
