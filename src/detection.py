"""
Vehicle detection with YOLOv8 (Days 3-5).

Given a frame, run YOLOv8, keep only vehicle classes above the confidence
threshold, then assign each detection to a lane (N/S/E/W) by testing whether
its bounding-box centroid falls inside a configured lane rectangle.

Public surface:
  * VehicleDetector.count_frame(frame)  -> LaneCounts
  * VehicleDetector.count_video(path)   -> list[DetectionRecord]
  * detections_to_dataframe / save_detections_csv
"""
from __future__ import annotations

import csv
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from . import config
from .logging_utils import get_logger

log = get_logger(__name__)


# ── Data contracts ──────────────────────────────────────────────────────────
@dataclass
class DetectionRecord:
    """One detection reading for an intersection at a point in time."""
    intersection_id: str
    timestamp: str                     # ISO-8601 UTC
    lane_counts: dict[str, int]        # {"N": .., "S": .., "E": .., "W": ..}
    total: int = 0

    def __post_init__(self) -> None:
        if not self.total:
            self.total = sum(self.lane_counts.values())

    def to_flat_dict(self) -> dict:
        """Flatten for CSV / DataFrame rows."""
        row = {
            "intersection_id": self.intersection_id,
            "timestamp": self.timestamp,
            "total": self.total,
        }
        for lane in config.LANES:
            row[f"count_{lane}"] = self.lane_counts.get(lane, 0)
        return row


# ── Detector ────────────────────────────────────────────────────────────────
class VehicleDetector:
    """Thin, testable wrapper around an ultralytics YOLO model."""

    def __init__(
        self,
        weights: str | None = None,
        conf: float | None = None,
        intersection_id: str | None = None,
    ) -> None:
        self.weights = weights or config.YOLO_WEIGHTS
        self.conf = conf if conf is not None else config.YOLO_CONF
        self.intersection_id = intersection_id or config.DEFAULT_INTERSECTION_ID
        self._model = None  # lazy-loaded so importing this module is cheap

    @property
    def model(self):
        if self._model is None:
            # Imported lazily: ultralytics pulls in torch which is heavy.
            from ultralytics import YOLO
            log.info("Loading YOLOv8 weights: %s", self.weights)
            self._model = YOLO(self.weights)
        return self._model

    # -- core -----------------------------------------------------------------
    @staticmethod
    def _assign_lane(cx: float, cy: float) -> str | None:
        """Return the lane whose rectangle contains centroid (cx, cy), else None."""
        for lane, (x1, y1, x2, y2) in config.LANE_REGIONS.items():
            if x1 <= cx <= x2 and y1 <= cy <= y2:
                return lane
        return None

    def count_frame(self, frame: np.ndarray) -> dict[str, int]:
        """Detect vehicles in a single BGR frame and return per-lane counts."""
        counts = {lane: 0 for lane in config.LANES}
        results = self.model.predict(frame, conf=self.conf, verbose=False)
        if not results:
            return counts
        boxes = results[0].boxes
        if boxes is None or boxes.xyxy is None:
            return counts

        xyxy = boxes.xyxy.cpu().numpy()
        cls = boxes.cls.cpu().numpy().astype(int)
        for (x1, y1, x2, y2), c in zip(xyxy, cls):
            if c not in config.VEHICLE_CLASS_IDS:
                continue
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            lane = self._assign_lane(cx, cy)
            if lane is not None:
                counts[lane] += 1
        return counts

    def detect_record(self, frame: np.ndarray, ts: str | None = None) -> DetectionRecord:
        """Produce a full DetectionRecord for one frame."""
        counts = self.count_frame(frame)
        return DetectionRecord(
            intersection_id=self.intersection_id,
            timestamp=ts or datetime.now(timezone.utc).isoformat(),
            lane_counts=counts,
        )

    def count_video(
        self, video_path: Path, every_n_seconds: float = 1.0
    ) -> list[DetectionRecord]:
        """Run detection across a whole video, one record per sampled frame."""
        from .video_ingest import iter_frames  # local import avoids cycle

        records: list[DetectionRecord] = []
        for i, frame in enumerate(iter_frames(video_path, every_n_seconds)):
            rec = self.detect_record(frame)
            records.append(rec)
            log.info("frame %d -> %s (total=%d)", i, rec.lane_counts, rec.total)
        return records


# ── Persistence helpers ─────────────────────────────────────────────────────
def save_detections_csv(records: list[DetectionRecord], path: Path | None = None) -> Path:
    """Write detection records to CSV (mock DB for testing)."""
    path = path or config.DETECTION_DIR / "detections.csv"
    fieldnames = ["intersection_id", "timestamp", "total"] + [f"count_{l}" for l in config.LANES]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow(r.to_flat_dict())
    log.info("Wrote %d detection rows -> %s", len(records), path)
    return path


def detections_to_dataframe(records: list[DetectionRecord]):
    import pandas as pd
    return pd.DataFrame([r.to_flat_dict() for r in records])
