#!/usr/bin/env python3
"""
Prepare the training dataset (Days 6-8).

Primary path (always works, no credentials): generate a realistic synthetic
per-lane count series matching the detector's output schema.

Optional real-dataset path: METR-LA / PEMS-BAY from Kaggle. Those are speed
sensor networks (not 4-lane counts), so they need Kaggle auth AND a mapping
step; the instructions are printed below. For the hackathon, the spec explicitly
allows "use your own YouTube-sourced counts", which is what the synthetic
generator emulates.

Usage:
    python scripts/download_dataset.py                 # synthetic (default)
    python scripts/download_dataset.py --days 90
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.logging_utils import get_logger
from src.synthetic_data import generate_traffic_series, save_dataset

log = get_logger("download_dataset")

KAGGLE_HINT = """
To use a REAL Kaggle dataset instead of the synthetic corpus:

  1. pip install kaggle  and place kaggle.json in ~/.kaggle/
  2. METR-LA:  kaggle datasets download -d annnnguyen/metr-la-dataset
     PEMS-BAY:  kaggle datasets download -d liuxu18/pemsbay
  3. Convert the sensor speed matrix into our schema
     (timestamp, count_N, count_S, count_E, count_W, total, hour,
      day_of_week, weather) by binning 4 nearby sensors as the 4 lanes and
      mapping speed -> flow. Then:
         python -m src.train path/to/converted.csv
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=60, help="days of synthetic data")
    ap.add_argument("--out", default=None, help="output CSV path")
    args = ap.parse_args()

    df = generate_traffic_series(days=args.days)
    out = save_dataset(df, Path(args.out) if args.out else None)
    print(f"\nDataset ready: {out}  ({len(df)} rows)")
    print(f"  total vehicles: mean={df['total'].mean():.1f}  "
          f"min={df['total'].min()}  max={df['total'].max()}")
    print(KAGGLE_HINT)


if __name__ == "__main__":
    main()
