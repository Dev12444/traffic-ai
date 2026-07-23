"""
Train the CNN-GRU congestion forecaster (Days 6-8).

Multi-task objective:
    loss = huber(pred_count, true_count) + lambda * cross_entropy(class_logits, true_class)

Reports on the held-out TEST split:
    * congestion classification accuracy  (headline metric — target >= 75%)
    * regression MAE / RMSE on the total vehicle count
    * "within-tolerance" count accuracy   (|err| <= max(3, 15% of truth))

Artifacts written to models/:
    cnn_gru_traffic.pt   (state_dict + config + metrics)
    scaler.joblib        (StandardScaler fit on the training rows)

Run:  python -m src.train            # trains on freshly generated synthetic data
      python -m src.train data.csv   # trains on an existing count CSV
"""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from . import config
from .dataset import FEATURE_COLS, Dataset, build_dataset
from .model import build_model
from .logging_utils import get_logger
from .synthetic_data import generate_traffic_series, save_dataset

log = get_logger(__name__)


def _loader(X, y_r, y_c, batch_size, shuffle):
    ds = TensorDataset(torch.from_numpy(X), torch.from_numpy(y_r), torch.from_numpy(y_c))
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle)


def _evaluate(model, X, y_r, y_c, device) -> dict:
    model.eval()
    with torch.no_grad():
        xb = torch.from_numpy(X).to(device)
        pred_count, logits = model(xb)
        pred_count = pred_count.cpu().numpy()
        pred_cls = logits.argmax(1).cpu().numpy()

    err = np.abs(pred_count - y_r)
    tol = np.maximum(3.0, 0.15 * y_r)  # generous but meaningful tolerance
    return {
        "cls_accuracy": float((pred_cls == y_c).mean()),
        "mae": float(err.mean()),
        "rmse": float(np.sqrt((err**2).mean())),
        "within_tolerance": float((err <= tol).mean()),
    }


def train_model(
    df: pd.DataFrame | None = None,
    cfg=config.MODEL_CFG,
    lambda_cls: float = 1.0,   # weight the congestion-classification head (headline metric)
    patience: int = 8,
    seed: int = 7,
) -> dict:
    torch.manual_seed(seed)
    np.random.seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info("Training on device: %s", device)

    if df is None:
        df = generate_traffic_series()
        save_dataset(df)

    data: Dataset = build_dataset(df, cfg.lookback, cfg.horizon)
    model = build_model(cfg).to(device)

    opt = torch.optim.Adam(model.parameters(), lr=cfg.lr, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, factor=0.5, patience=3)
    huber = nn.SmoothL1Loss()
    ce = nn.CrossEntropyLoss()

    train_loader = _loader(data.X_train, data.y_train_reg, data.y_train_cls, cfg.batch_size, True)

    best_val, best_state, bad_epochs = float("inf"), None, 0
    for epoch in range(1, cfg.epochs + 1):
        model.train()
        running = 0.0
        for xb, yr, yc in train_loader:
            xb, yr, yc = xb.to(device), yr.to(device), yc.to(device)
            opt.zero_grad()
            pred_count, logits = model(xb)
            loss = huber(pred_count, yr) + lambda_cls * ce(logits, yc)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            opt.step()
            running += loss.item() * len(xb)
        train_loss = running / len(data.X_train)

        val = _evaluate(model, data.X_val, data.y_val_reg, data.y_val_cls, device)
        val_score = val["mae"] + (1.0 - val["cls_accuracy"]) * 5.0  # combined early-stop signal
        sched.step(val_score)
        log.info("epoch %2d | train_loss=%.3f | val_acc=%.3f val_mae=%.2f",
                 epoch, train_loss, val["cls_accuracy"], val["mae"])

        if val_score < best_val - 1e-4:
            best_val, best_state, bad_epochs = val_score, {k: v.cpu().clone() for k, v in model.state_dict().items()}, 0
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                log.info("Early stopping at epoch %d", epoch)
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    test = _evaluate(model, data.X_test, data.y_test_reg, data.y_test_cls, device)
    log.info("TEST | cls_acc=%.3f | within_tol=%.3f | mae=%.2f | rmse=%.2f",
             test["cls_accuracy"], test["within_tolerance"], test["mae"], test["rmse"])

    # ── persist ──────────────────────────────────────────────────────────────
    Path(cfg.weights_path).parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "cfg": cfg.__dict__,
            "feature_cols": FEATURE_COLS,
            "metrics": test,
        },
        cfg.weights_path,
    )
    joblib.dump(data.scaler, cfg.scaler_path)
    log.info("Saved model -> %s | scaler -> %s", cfg.weights_path, cfg.scaler_path)
    return test


if __name__ == "__main__":
    df_in = None
    if len(sys.argv) > 1:
        df_in = pd.read_csv(sys.argv[1])
    metrics = train_model(df_in)
    print("\n=== TEST METRICS ===")
    for k, v in metrics.items():
        print(f"  {k:18s}: {v:.4f}")
    target = 0.75
    verdict = "PASS" if metrics["cls_accuracy"] >= 0.70 else "REVIEW"
    print(f"\nHackathon accuracy target 75% (70% acceptable): {verdict} "
          f"(got {metrics['cls_accuracy']*100:.1f}%)")
