"""
End-to-end detection pipeline (Days 3-5).

    video  ->  frames (OpenCV)  ->  YOLOv8 vehicle detection  ->  per-lane counts
           ->  DetectionRecord  ->  DB sink (Supabase or mock CSV)  +  local CSV

`run_pipeline` samples one frame every `sample_seconds` of *video* time, counts
vehicles per lane, pushes the reading to the configured sink, and (optionally)
sleeps to emit at a realistic 5-10s live cadence. Returns all records so they
can also be dumped to CSV for model training.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import config
from .db import Sink, get_sink
from .detection import DetectionRecord, VehicleDetector, save_detections_csv
from .logging_utils import get_logger
from .video_ingest import iter_frames

log = get_logger(__name__)


def run_pipeline(
    video_path: Path,
    intersection_id: str | None = None,
    sample_seconds: float = 5.0,
    sink: Sink | None = None,
    detector: VehicleDetector | None = None,
    realtime: bool = False,
    csv_out: Path | None = None,
) -> list[DetectionRecord]:
    """
    Process a video into per-lane vehicle counts and push each reading to the DB.

    Args:
        sample_seconds: seconds of video between sampled frames (== push cadence).
        realtime:       if True, sleep `sample_seconds` between pushes to mimic
                        a live camera feed. Off by default for fast batch runs.
    """
    intersection_id = intersection_id or config.DEFAULT_INTERSECTION_ID
    detector = detector or VehicleDetector(intersection_id=intersection_id)
    sink = sink or get_sink()

    log.info("Running pipeline on %s (sample every %.1fs)", video_path, sample_seconds)
    records: list[DetectionRecord] = []
    # Anchor synthetic timestamps to 'now' spaced by sample_seconds so the
    # resulting series is monotonic even in fast batch mode.
    base_ts = datetime.now(timezone.utc)

    for i, frame in enumerate(iter_frames(video_path, every_n_seconds=sample_seconds)):
        ts = (base_ts + timedelta(seconds=i * sample_seconds)).isoformat()
        rec = detector.detect_record(frame, ts=ts)
        sink.push(rec)
        records.append(rec)
        log.info("[%s] %s pushed -> %s (total=%d)",
                 intersection_id, ts, rec.lane_counts, rec.total)
        if realtime:
            time.sleep(sample_seconds)

    if records:
        save_detections_csv(records, csv_out)
    log.info("Pipeline complete: %d readings pushed for %s", len(records), intersection_id)
    return records
