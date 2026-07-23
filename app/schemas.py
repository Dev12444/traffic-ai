"""
Pydantic request/response models for the API (Days 9-10).

These define — and validate — the exact JSON contract shared with Person B's
Node.js backend. Field examples flow through to the auto-generated OpenAPI docs
at /docs, so the contract is self-documenting.
"""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from src import config


# ── shared ──────────────────────────────────────────────────────────────────
class LaneCounts(BaseModel):
    N: int = Field(0, ge=0, description="Northbound vehicle count")
    S: int = Field(0, ge=0, description="Southbound vehicle count")
    E: int = Field(0, ge=0, description="Eastbound vehicle count")
    W: int = Field(0, ge=0, description="Westbound vehicle count")

    def as_dict(self) -> dict:
        return {"N": self.N, "S": self.S, "E": self.E, "W": self.W}


class VehicleReading(BaseModel):
    """One recent per-lane count reading fed into a prediction."""
    intersection_id: Optional[str] = Field(None, examples=["INT-001"])
    timestamp: Optional[str] = Field(
        None, description="ISO-8601. Defaults to now if omitted.",
        examples=["2026-07-24T10:15:00+00:00"],
    )
    lane_counts: LaneCounts
    weather: Optional[float] = Field(
        0.2, ge=0.0, le=1.0, description="Weather severity 0=clear .. 1=heavy rain/fog"
    )


# ── /predict ────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    intersection_id: Optional[str] = Field(None, examples=["INT-001"])
    readings: List[VehicleReading] = Field(
        ..., min_length=1,
        description="Recent readings, oldest first. Up to `lookback` are used.",
    )

    @field_validator("readings")
    @classmethod
    def _not_empty(cls, v):
        if not v:
            raise ValueError("readings must contain at least one entry")
        return v


class PredictResponse(BaseModel):
    intersection_id: str = Field(..., examples=["INT-001"])
    predicted_for: str = Field(..., description="Timestamp the forecast is for",
                               examples=["2026-07-24T10:35:00+00:00"])
    predicted_count: int = Field(..., ge=0, examples=[27])
    confidence: float = Field(..., ge=0.0, le=1.0, examples=[0.82])
    congestion_level: str = Field(..., examples=config.CONGESTION_LABELS)
    model: str = Field(..., examples=["cnn_gru", "rule_based_ewma"])


# ── /vehicles/ingest ────────────────────────────────────────────────────────
class IngestRequest(BaseModel):
    """Raw vehicle counts pushed from the detection pipeline (or Person B)."""
    intersection_id: str = Field(..., examples=["INT-001"])
    lane_counts: LaneCounts
    timestamp: Optional[str] = Field(None, examples=["2026-07-24T10:15:00+00:00"])


class IngestResponse(BaseModel):
    status: str = Field(..., examples=["stored"])
    intersection_id: str
    timestamp: str
    total: int


# ── /status ─────────────────────────────────────────────────────────────────
class StatusResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    api_version: str
    model_loaded: bool
    model_type: str
    lookback: int
    horizon_minutes: int
    metrics: dict = Field(default_factory=dict)
