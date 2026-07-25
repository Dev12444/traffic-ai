"""
Synthetic traffic time-series generator (Days 6-8).

Real congestion datasets (METR-LA, PEMS-BAY) are speed sensors, not the 4-lane
vehicle counts our detector produces, and they require Kaggle credentials to
download. So the training corpus here is generated to match *exactly* the schema
the detection pipeline emits — per-lane counts on a fixed sampling interval —
with realistic structure a model can actually learn:

  * two weekday rush-hour peaks (morning ~08:00, evening ~17:30)
  * weekend traffic that is lower and flatter
  * a slow weather factor (rain/fog raise counts by slowing flow)
  * per-lane asymmetry (a commuter corridor: N/S busier than E/W)
  * Poisson-style count noise

`scripts/download_dataset.py` documents how to swap in a real Kaggle dataset;
`src/dataset.py` can window either source identically.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from . import config
from .logging_utils import get_logger

log = get_logger(__name__)

# Per-lane baseline + rush-hour amplitude (a N/S commuter corridor).
_LANE_PROFILE = {
    "N": {"base": 6.0, "amp": 14.0},
    "S": {"base": 5.0, "amp": 15.0},
    "E": {"base": 3.0, "amp": 6.0},
    "W": {"base": 3.0, "amp": 7.0},
}


def _time_of_day_factor(hour_frac: float, is_weekend: bool) -> float:
    """
    Smooth demand curve over a day (hour_frac in [0,24)). Returns ~0..1.
    Weekdays get two sharp commuter peaks; weekends get one broad midday hump.
    """
    if is_weekend:
        # single broad hump centered ~14:00
        return 0.35 + 0.5 * math.exp(-((hour_frac - 14.0) ** 2) / (2 * 3.5**2))
    morning = math.exp(-((hour_frac - 8.0) ** 2) / (2 * 1.1**2))
    evening = math.exp(-((hour_frac - 17.5) ** 2) / (2 * 1.3**2))
    night_floor = 0.08
    return night_floor + 0.92 * max(morning, 0.85 * evening)


def generate_traffic_series(
    days: int = 60,
    step_minutes: int | None = None,
    intersection_id: str | None = None,
    start: datetime | None = None,
    seed: int = 7,
) -> pd.DataFrame:
    """
    Produce a per-lane vehicle-count time series.

    Columns: timestamp, intersection_id, count_N, count_S, count_E, count_W,
             total, hour, day_of_week, weather
    """
    step_minutes = step_minutes or config.MODEL_CFG.step_minutes
    intersection_id = intersection_id or config.DEFAULT_INTERSECTION_ID
    start = start or datetime(2026, 1, 1, tzinfo=timezone.utc)
    rng = np.random.default_rng(seed)

    steps_per_day = (24 * 60) // step_minutes
    n = days * steps_per_day
    rows = []

    # Weather is a slow random walk in [0,1]; higher => rain/fog => more cars queued.
    weather = 0.2
    for i in range(n):
        ts = start + timedelta(minutes=i * step_minutes)
        hour_frac = ts.hour + ts.minute / 60.0
        dow = ts.weekday()  # 0=Mon .. 6=Sun
        is_weekend = dow >= 5

        # evolve weather once per ~3h, clamp to [0,1]
        if i % (180 // step_minutes) == 0:
            weather = float(np.clip(weather + rng.normal(0, 0.15), 0.0, 1.0))
        weather_boost = 1.0 + 0.25 * weather  # up to +25% demand

        tod = _time_of_day_factor(hour_frac, is_weekend) * weather_boost
        counts = {}
        for lane, prof in _LANE_PROFILE.items():
            lam = prof["base"] + prof["amp"] * tod
            lam *= 0.7 if is_weekend else 1.0
            # Poisson gives realistic non-negative integer counts
            counts[lane] = int(rng.poisson(max(lam, 0.1)))

        total = sum(counts.values())
        rows.append(
            {
                "timestamp": ts.isoformat(),
                "intersection_id": intersection_id,
                "count_N": counts["N"],
                "count_S": counts["S"],
                "count_E": counts["E"],
                "count_W": counts["W"],
                "total": total,
                "hour": ts.hour,
                "day_of_week": dow,
                "weather": round(weather, 3),
            }
        )

    df = pd.DataFrame(rows)
    log.info(
        "Generated %d rows (%d days @ %dmin) total mean=%.1f max=%d",
        len(df), days, step_minutes, df["total"].mean(), df["total"].max(),
    )
    return df


def save_dataset(df: pd.DataFrame, path: Path | None = None) -> Path:
    path = path or config.DATA_DIR / "datasets" / "synthetic_traffic.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    log.info("Saved dataset -> %s", path)
    return path


if __name__ == "__main__":
    save_dataset(generate_traffic_series())
