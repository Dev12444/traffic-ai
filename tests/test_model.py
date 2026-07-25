"""Model + dataset + predictor tests."""
import numpy as np
import torch

from src import config
from src.dataset import FEATURE_COLS, build_dataset
from src.model import build_model
from src.predict import RuleBasedPredictor
from src.synthetic_data import generate_traffic_series


def test_congestion_class_thresholds():
    t0, t1 = config.CONGESTION_THRESHOLDS
    assert config.congestion_class(0) == 0
    assert config.congestion_class(t0 + 1) == 1
    assert config.congestion_class(t1 + 1) == 2


def test_dataset_shapes():
    df = generate_traffic_series(days=6, seed=1)
    ds = build_dataset(df)
    assert ds.X_train.shape[1] == config.MODEL_CFG.lookback
    assert ds.X_train.shape[2] == len(FEATURE_COLS) == config.MODEL_CFG.n_features
    # chronological split -> train is the biggest block
    assert len(ds.X_train) > len(ds.X_val) >= len(ds.X_test) > 0
    # regression targets are non-negative counts
    assert (ds.y_train_reg >= 0).all()


def test_model_forward_shapes():
    model = build_model()
    x = torch.randn(8, config.MODEL_CFG.lookback, config.MODEL_CFG.n_features)
    count, logits = model(x)
    assert count.shape == (8,)
    assert logits.shape == (8, config.MODEL_CFG.n_classes)
    assert (count >= 0).all()  # softplus guarantees non-negative counts


def test_rule_based_predictor_contract():
    readings = [{"timestamp": None, "lane_counts": {"N": 5, "S": 4, "E": 2, "W": 3}}
                for _ in range(6)]
    out = RuleBasedPredictor().predict(readings, intersection_id="INT-X")
    assert set(out) >= {"intersection_id", "predicted_for", "predicted_count",
                        "confidence", "congestion_level", "model"}
    assert out["predicted_count"] >= 0
    assert 0.0 <= out["confidence"] <= 1.0
    assert out["congestion_level"] in config.CONGESTION_LABELS
