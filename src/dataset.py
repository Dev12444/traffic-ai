"""
Windowing + feature engineering for the congestion forecaster (Days 6-8).

Turns a per-lane count time series (from synthetic_data.py or real detections)
into supervised learning windows:

    X : (N, lookback, 9)   past `lookback` timesteps of features
    y_reg : (N,)           TOTAL vehicle count `horizon` steps ahead  (regression)
    y_cls : (N,)           congestion class of that future total       (0/1/2)

Feature vector per timestep (9 dims, matches config.MODEL_CFG.n_features):
    [count_N, count_S, count_E, count_W,
     hour_sin, hour_cos, dow_sin, dow_cos, weather]

Cyclical encodings (sin/cos of hour & day-of-week) let the model see that 23:00
is close to 00:00 and Sunday is close to Monday. Splits are chronological
(70/20/10) to avoid leaking the future into the past; the StandardScaler is fit
on the training rows only and persisted for inference.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from . import config
from .logging_utils import get_logger

log = get_logger(__name__)

FEATURE_COLS = [
    "count_N", "count_S", "count_E", "count_W",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos", "weather",
]


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Add cyclical time features. Input must have hour, day_of_week, weather."""
    out = df.copy()
    out["hour_sin"] = np.sin(2 * np.pi * out["hour"] / 24.0)
    out["hour_cos"] = np.cos(2 * np.pi * out["hour"] / 24.0)
    out["dow_sin"] = np.sin(2 * np.pi * out["day_of_week"] / 7.0)
    out["dow_cos"] = np.cos(2 * np.pi * out["day_of_week"] / 7.0)
    if "weather" not in out:
        out["weather"] = 0.0
    return out


def _make_windows(
    features: np.ndarray, totals: np.ndarray, lookback: int, horizon: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Slide a window; target is the total `horizon` steps after the window end."""
    X, y_reg, y_cls = [], [], []
    last = len(features) - lookback - horizon + 1
    for i in range(last):
        X.append(features[i : i + lookback])
        target_total = totals[i + lookback + horizon - 1]
        y_reg.append(target_total)
        y_cls.append(config.congestion_class(int(target_total)))
    return np.asarray(X, np.float32), np.asarray(y_reg, np.float32), np.asarray(y_cls, np.int64)


@dataclass
class Dataset:
    X_train: np.ndarray
    y_train_reg: np.ndarray
    y_train_cls: np.ndarray
    X_val: np.ndarray
    y_val_reg: np.ndarray
    y_val_cls: np.ndarray
    X_test: np.ndarray
    y_test_reg: np.ndarray
    y_test_cls: np.ndarray
    scaler: StandardScaler

    @property
    def n_features(self) -> int:
        return self.X_train.shape[-1]


def build_dataset(
    df: pd.DataFrame,
    lookback: int | None = None,
    horizon: int | None = None,
) -> Dataset:
    """Full pipeline: features -> chronological split -> scale -> windows."""
    cfg = config.MODEL_CFG
    lookback = lookback or cfg.lookback
    horizon = horizon or cfg.horizon

    feat_df = build_feature_frame(df)
    feats = feat_df[FEATURE_COLS].to_numpy(np.float32)
    totals = feat_df["total"].to_numpy(np.float32)

    # Chronological split BEFORE windowing so no window straddles a boundary.
    n = len(feats)
    i_train = int(n * 0.70)
    i_val = int(n * 0.90)

    scaler = StandardScaler().fit(feats[:i_train])

    def scale(a: np.ndarray) -> np.ndarray:
        return scaler.transform(a).astype(np.float32)

    Xtr, ytr_r, ytr_c = _make_windows(scale(feats[:i_train]), totals[:i_train], lookback, horizon)
    Xva, yva_r, yva_c = _make_windows(scale(feats[i_train:i_val]), totals[i_train:i_val], lookback, horizon)
    Xte, yte_r, yte_c = _make_windows(scale(feats[i_val:]), totals[i_val:], lookback, horizon)

    log.info("Windows -> train=%d val=%d test=%d (lookback=%d horizon=%d)",
             len(Xtr), len(Xva), len(Xte), lookback, horizon)
    return Dataset(Xtr, ytr_r, ytr_c, Xva, yva_r, yva_c, Xte, yte_r, yte_c, scaler)
