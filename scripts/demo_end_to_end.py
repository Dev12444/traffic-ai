#!/usr/bin/env python3
"""
End-to-end demo (Days 11-12).

Runs the whole Person A pipeline in one shot, no server required:

    1. generate a synthetic count dataset
    2. train the CNN-GRU forecaster (short run) and report test accuracy
    3. load the trained predictor
    4. feed it a recent window of counts and print the 15-20 min forecast
    5. exercise the rule-based fallback for comparison

Usage:
    python scripts/demo_end_to_end.py
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import config
from src.predict import Predictor, RuleBasedPredictor, get_predictor
from src.synthetic_data import generate_traffic_series
from src.train import train_model


def _recent_window(n: int = 12) -> list[dict]:
    """Build a plausible rush-hour window of recent readings ending 'now'."""
    now = datetime.now(timezone.utc).replace(hour=17, minute=30)
    counts = [(9, 8, 4, 5), (11, 10, 5, 6), (13, 12, 5, 7), (15, 14, 6, 8),
              (17, 16, 6, 9), (18, 17, 7, 9), (19, 18, 7, 10), (20, 19, 8, 10),
              (21, 20, 8, 11), (22, 21, 9, 11), (23, 22, 9, 12), (24, 23, 10, 12)]
    out = []
    for i, (n_, s_, e_, w_) in enumerate(counts[-n:]):
        ts = (now - timedelta(minutes=(n - i) * config.MODEL_CFG.step_minutes)).isoformat()
        out.append({"timestamp": ts, "lane_counts": {"N": n_, "S": s_, "E": e_, "W": w_},
                    "weather": 0.3})
    return out


def main() -> None:
    print("=" * 64)
    print("STEP 1-2: generate data + train CNN-GRU forecaster")
    print("=" * 64)
    df = generate_traffic_series(days=45)
    metrics = train_model(df)
    print(f"\nTest congestion accuracy : {metrics['cls_accuracy']*100:5.1f}%")
    print(f"Within-tolerance count   : {metrics['within_tolerance']*100:5.1f}%")
    print(f"Count MAE / RMSE         : {metrics['mae']:.2f} / {metrics['rmse']:.2f}")

    print("\n" + "=" * 64)
    print("STEP 3-4: trained model forecast on a recent rush-hour window")
    print("=" * 64)
    window = _recent_window()
    trained = get_predictor()
    assert isinstance(trained, Predictor), "expected a trained model after training"
    res = trained.predict(window, intersection_id="INT-001")
    for k, v in res.items():
        print(f"  {k:16s}: {v}")

    print("\n" + "=" * 64)
    print("STEP 5: rule-based fallback (same input, for comparison)")
    print("=" * 64)
    fb = RuleBasedPredictor().predict(window, intersection_id="INT-001")
    for k, v in fb.items():
        print(f"  {k:16s}: {v}")

    print("\nDemo complete. Start the API with:  uvicorn app.main:app --port 8000")


if __name__ == "__main__":
    main()
