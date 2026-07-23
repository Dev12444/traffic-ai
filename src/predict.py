"""
Inference wrappers for the congestion forecaster (Days 9-10).

Two interchangeable predictors, both returning the API's output contract:

    {
        "intersection_id": str,
        "predicted_for":   ISO-8601 timestamp (now + horizon * step_minutes),
        "predicted_count": int,     # forecast TOTAL vehicles across 4 lanes
        "confidence":      float,   # 0..1
        "congestion_level": str,    # free_flow | moderate | congested
    }

  * Predictor          — loads the trained CNN-GRU + scaler.
  * RuleBasedPredictor — EWMA-of-recent-totals fallback (spec's slow-training
                         fallback). Zero dependencies, always works.

`get_predictor()` returns the trained model if artifacts exist, otherwise the
rule-based fallback, so the API always starts even before a model is trained.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence

import numpy as np

from . import config
from .logging_utils import get_logger

log = get_logger(__name__)


# ── helpers ─────────────────────────────────────────────────────────────────
def _parse_ts(ts: str | None) -> datetime:
    if not ts:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def _reading_total(reading: dict) -> int:
    lc = reading.get("lane_counts", {})
    return int(sum(int(lc.get(l, 0)) for l in config.LANES))


def _feature_row(reading: dict) -> list[float]:
    """Build the 9-dim feature vector for one reading."""
    lc = reading.get("lane_counts", {})
    dt = _parse_ts(reading.get("timestamp"))
    hour, dow = dt.hour, dt.weekday()
    weather = float(reading.get("weather", 0.2))
    return [
        float(lc.get("N", 0)), float(lc.get("S", 0)),
        float(lc.get("E", 0)), float(lc.get("W", 0)),
        math.sin(2 * math.pi * hour / 24.0), math.cos(2 * math.pi * hour / 24.0),
        math.sin(2 * math.pi * dow / 7.0), math.cos(2 * math.pi * dow / 7.0),
        weather,
    ]


def _horizon_timestamp(readings: Sequence[dict]) -> str:
    cfg = config.MODEL_CFG
    last = _parse_ts(readings[-1].get("timestamp")) if readings else datetime.now(timezone.utc)
    return (last + timedelta(minutes=cfg.horizon * cfg.step_minutes)).isoformat()


# ── trained model predictor ─────────────────────────────────────────────────
class Predictor:
    def __init__(self, weights_path: str | None = None, scaler_path: str | None = None):
        import joblib
        import torch

        from .model import build_model

        self.cfg = config.MODEL_CFG
        wp = weights_path or self.cfg.weights_path
        sp = scaler_path or self.cfg.scaler_path
        ckpt = torch.load(wp, map_location="cpu", weights_only=False)
        self.model = build_model(self.cfg)
        self.model.load_state_dict(ckpt["state_dict"])
        self.model.eval()
        self.scaler = joblib.load(sp)
        self.metrics = ckpt.get("metrics", {})
        self._torch = torch
        log.info("Loaded trained Predictor (test cls_acc=%.3f)",
                 self.metrics.get("cls_accuracy", float("nan")))

    def _window(self, readings: Sequence[dict]) -> np.ndarray:
        """Build a (1, lookback, 9) scaled window, left-padding if too short."""
        rows = [_feature_row(r) for r in readings]
        lb = self.cfg.lookback
        if len(rows) < lb:
            rows = [rows[0]] * (lb - len(rows)) + rows  # repeat earliest
        rows = rows[-lb:]
        scaled = self.scaler.transform(np.asarray(rows, np.float32)).astype(np.float32)
        return scaled[None, ...]

    def predict(self, readings: Sequence[dict], intersection_id: str | None = None) -> dict:
        if not readings:
            raise ValueError("predict() requires at least one recent reading")
        intersection_id = intersection_id or readings[-1].get(
            "intersection_id", config.DEFAULT_INTERSECTION_ID
        )
        x = self._torch.from_numpy(self._window(readings))
        with self._torch.no_grad():
            count, logits = self.model(x)
            probs = self._torch.softmax(logits, dim=1)[0].numpy()
        cls = int(probs.argmax())
        predicted = max(0, int(round(float(count.item()))))
        return {
            "intersection_id": intersection_id,
            "predicted_for": _horizon_timestamp(readings),
            "predicted_count": predicted,
            "confidence": round(float(probs[cls]), 4),
            "congestion_level": config.CONGESTION_LABELS[cls],
            "model": "cnn_gru",
        }


# ── rule-based fallback ─────────────────────────────────────────────────────
class RuleBasedPredictor:
    """
    Exponentially-weighted moving average of recent totals + a light trend term.
    Confidence is derived from how steady the recent signal is (low variance =>
    high confidence). Always available; used when no trained model exists.
    """

    def __init__(self, alpha: float = 0.5):
        self.alpha = alpha
        log.info("Using RuleBasedPredictor fallback (no trained model loaded)")

    def predict(self, readings: Sequence[dict], intersection_id: str | None = None) -> dict:
        if not readings:
            raise ValueError("predict() requires at least one recent reading")
        intersection_id = intersection_id or readings[-1].get(
            "intersection_id", config.DEFAULT_INTERSECTION_ID
        )
        totals = np.array([_reading_total(r) for r in readings], dtype=float)

        # EWMA
        ewma = totals[0]
        for t in totals[1:]:
            ewma = self.alpha * t + (1 - self.alpha) * ewma
        # light linear trend over the last few points, projected to the horizon
        trend = 0.0
        if len(totals) >= 3:
            trend = float(np.polyfit(np.arange(len(totals)), totals, 1)[0])
        horizon_steps = config.MODEL_CFG.horizon
        predicted = max(0, int(round(ewma + 0.5 * trend * horizon_steps)))

        # confidence: steadier recent signal -> higher confidence
        mean = totals.mean() if totals.mean() > 0 else 1.0
        cv = totals.std() / mean
        confidence = round(float(np.clip(1.0 - cv, 0.4, 0.95)), 4)

        return {
            "intersection_id": intersection_id,
            "predicted_for": _horizon_timestamp(readings),
            "predicted_count": predicted,
            "confidence": confidence,
            "congestion_level": config.CONGESTION_LABELS[config.congestion_class(predicted)],
            "model": "rule_based_ewma",
        }


# ── factory ─────────────────────────────────────────────────────────────────
def get_predictor():
    """Return the trained predictor if artifacts exist, else the fallback."""
    if Path(config.MODEL_CFG.weights_path).exists() and Path(config.MODEL_CFG.scaler_path).exists():
        try:
            return Predictor()
        except Exception as exc:  # pragma: no cover
            log.warning("Failed to load trained model (%s); using fallback", exc)
    return RuleBasedPredictor()
