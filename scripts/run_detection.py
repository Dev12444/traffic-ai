#!/usr/bin/env python3
"""
Run the video -> counts -> CSV/DB detection pipeline (Days 3-5).

Usage:
    python scripts/run_detection.py                         # synthetic demo clip
    python scripts/run_detection.py data/videos/traffic_1.mp4
    python scripts/run_detection.py data/videos/traffic_1.mp4 --id INT-002 --every 5 --realtime
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import config
from src.logging_utils import get_logger
from src.pipeline import run_pipeline
from src.video_ingest import generate_synthetic_video

log = get_logger("run_detection")


def main() -> None:
    ap = argparse.ArgumentParser(description="Traffic detection pipeline")
    ap.add_argument("video", nargs="?", help="Path to a video. Omit to use a synthetic clip.")
    ap.add_argument("--id", default=config.DEFAULT_INTERSECTION_ID, help="intersection_id")
    ap.add_argument("--every", type=float, default=5.0, help="seconds between sampled frames")
    ap.add_argument("--realtime", action="store_true", help="sleep between pushes (live cadence)")
    args = ap.parse_args()

    if args.video:
        video = Path(args.video)
        if not video.exists():
            log.error("Video not found: %s", video)
            sys.exit(1)
    else:
        log.info("No video supplied — generating a synthetic clip.")
        video = generate_synthetic_video(seconds=30, fps=15)

    records = run_pipeline(
        video, intersection_id=args.id, sample_seconds=args.every, realtime=args.realtime
    )
    total = sum(r.total for r in records)
    print(f"\nProcessed {len(records)} readings for {args.id}; "
          f"cumulative vehicles counted = {total}")
    print(f"CSV written to {config.DETECTION_DIR}")


if __name__ == "__main__":
    main()
