#!/usr/bin/env python3
"""
Train the congestion forecaster (Days 6-8) — thin CLI over src.train.

Usage:
    python scripts/train_model.py                 # generate synthetic + train
    python scripts/train_model.py data.csv        # train on an existing CSV
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd

from src.train import train_model

if __name__ == "__main__":
    df = pd.read_csv(sys.argv[1]) if len(sys.argv) > 1 else None
    metrics = train_model(df)
    print("\n=== TEST METRICS ===")
    for k, v in metrics.items():
        print(f"  {k:18s}: {v:.4f}")
