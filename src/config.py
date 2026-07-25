"""
Central configuration for the traffic-prediction pipeline.

Everything tunable lives here so the rest of the codebase never hard-codes
paths, model hyper-parameters, or lane geometry. Values can be overridden with
environment variables (see .env.example) which is important for Render deploys.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # pull .env if present; silently no-ops in production

# ── Filesystem layout ───────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parents[1]        # traffic_pipeline/
DATA_DIR = ROOT_DIR / "data"
VIDEO_DIR = DATA_DIR / "videos"
FRAME_DIR = DATA_DIR / "frames"
DETECTION_DIR = DATA_DIR / "detections"
MODEL_DIR = ROOT_DIR / "models"

for _d in (VIDEO_DIR, FRAME_DIR, DETECTION_DIR, MODEL_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ── Detection settings ──────────────────────────────────────────────────────
YOLO_WEIGHTS = os.getenv("YOLO_WEIGHTS", "yolov8n.pt")  # nano = fast; swap to s/m for accuracy
YOLO_CONF = float(os.getenv("YOLO_CONF", "0.35"))       # min confidence to count a detection
# COCO class ids that count as "vehicles": car, motorcycle, bus, truck
VEHICLE_CLASS_IDS = {2, 3, 5, 7}

# ── Lane geometry ───────────────────────────────────────────────────────────
# Lanes are defined as axis-aligned rectangles (x1, y1, x2, y2) in *pixel*
# coordinates for a reference frame of size REF_FRAME_SIZE. A detection is
# assigned to a lane if its bounding-box centroid falls inside the rectangle.
# These are sensible defaults for a top-down / elevated intersection view and
# are trivially re-tunable per camera.
REF_FRAME_SIZE = (1280, 720)  # (width, height)
LANE_REGIONS: dict[str, tuple[int, int, int, int]] = {
    "N": (480, 0,   800, 300),    # top-center band  -> northbound approach
    "S": (480, 420, 800, 720),    # bottom-center    -> southbound approach
    "E": (800, 260, 1280, 460),   # right-center     -> eastbound approach
    "W": (0,   260, 480,  460),   # left-center      -> westbound approach
}
LANES = list(LANE_REGIONS.keys())  # ["N", "S", "E", "W"]

# ── Prediction model settings ───────────────────────────────────────────────
@dataclass
class ModelConfig:
    """Hyper-parameters for the CNN-GRU congestion forecaster."""
    lookback: int = 12          # past timesteps fed to the model
    horizon: int = 4            # steps ahead to forecast (4 * 5min = 20 min)
    step_minutes: int = 5       # sampling interval of the time series
    # feature columns per timestep: [count_N, count_S, count_E, count_W,
    #                                hour_sin, hour_cos, dow_sin, dow_cos, weather]
    n_features: int = 9
    cnn_channels: int = 32      # temporal-conv filters
    gru_hidden: int = 64
    gru_layers: int = 2
    dropout: float = 0.2
    # congestion is a 3-class problem: 0=free, 1=moderate, 2=congested
    n_classes: int = 3
    lr: float = 1e-3
    batch_size: int = 64
    epochs: int = 40
    weights_path: str = field(default_factory=lambda: str(MODEL_DIR / "cnn_gru_traffic.pt"))
    scaler_path: str = field(default_factory=lambda: str(MODEL_DIR / "scaler.joblib"))


MODEL_CFG = ModelConfig()

# Human-readable congestion labels (index == class id)
CONGESTION_LABELS = ["free_flow", "moderate", "congested"]

# Congestion class boundaries on TOTAL vehicles across the 4 lanes.
# total <= t0 -> free_flow ; t0 < total <= t1 -> moderate ; else -> congested.
CONGESTION_THRESHOLDS = (
    int(os.getenv("CONGESTION_T0", "18")),
    int(os.getenv("CONGESTION_T1", "34")),
)


def congestion_class(total: int) -> int:
    """Map a total vehicle count to a congestion class id (0/1/2)."""
    t0, t1 = CONGESTION_THRESHOLDS
    if total <= t0:
        return 0
    if total <= t1:
        return 1
    return 2


# ── API / integration ───────────────────────────────────────────────────────
API_TITLE = "Traffic Congestion Prediction API"
API_VERSION = "1.0.0"
DEFAULT_INTERSECTION_ID = os.getenv("DEFAULT_INTERSECTION_ID", "INT-001")

# Optional bearer-token auth for the API. Blank == open (fine for local demos).
API_KEY = os.getenv("API_KEY", "")

# Supabase (Person B's DB). If unset, the pipeline falls back to a mock.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "vehicle_counts")
USE_MOCK_DB = not (SUPABASE_URL and SUPABASE_KEY)
