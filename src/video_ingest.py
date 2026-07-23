"""
Video ingestion pipeline (Days 3-4).

Responsibilities:
  * Acquire a source traffic video — either a user-supplied file, a direct
    download URL, or a *synthetic* clip we generate ourselves (so the whole
    pipeline runs with zero external dependencies / no YouTube scraping risk).
  * Extract frames at a configurable sampling rate with OpenCV.
  * Provide helpers to overlay the N/S/E/W lane regions for visual validation.

The synthetic generator matters for a hackathon demo: it guarantees the
detection + prediction pipeline is always runnable even if the network is down.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Iterator

import cv2
import numpy as np
import requests
from tqdm import tqdm

from . import config
from .logging_utils import get_logger

log = get_logger(__name__)


# ── Acquisition ─────────────────────────────────────────────────────────────
def download_video(url: str, dest: Path | None = None, timeout: int = 60) -> Path:
    """Download a video from a direct URL to the data/videos dir."""
    dest = dest or config.VIDEO_DIR / "source.mp4"
    log.info("Downloading video from %s", url)
    with requests.get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(
            total=total, unit="B", unit_scale=True, desc="download"
        ) as bar:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                bar.update(len(chunk))
    log.info("Saved video -> %s (%.1f MB)", dest, dest.stat().st_size / 1e6)
    return dest


def generate_synthetic_video(
    dest: Path | None = None,
    seconds: int = 20,
    fps: int = 15,
    n_vehicles: int = 14,
    seed: int = 42,
) -> Path:
    """
    Render a top-down intersection with moving 'vehicles' (colored rectangles)
    travelling along the four approaches. Produces a real .mp4 that YOLO can be
    pointed at, and — because we know the ground-truth vehicle count — it's also
    handy for sanity-checking the detector.

    NOTE: YOLO is trained on real photos, so it will not reliably detect these
    synthetic blocks. For detection validation we therefore ship real sample
    frames too (see scripts/download_sample_frames.py). This synthetic clip
    exercises the *frame-extraction and lane-assignment* plumbing end to end.
    """
    dest = dest or config.VIDEO_DIR / "synthetic_intersection.mp4"
    rng = np.random.default_rng(seed)
    w, h = config.REF_FRAME_SIZE
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(dest), fourcc, fps, (w, h))

    # Each vehicle: a lane, a position along that lane (0..1), a speed, a color.
    lanes = config.LANES
    vehicles = []
    for _ in range(n_vehicles):
        vehicles.append(
            {
                "lane": rng.choice(lanes),
                "pos": rng.random(),
                "speed": rng.uniform(0.004, 0.012),
                "color": tuple(int(c) for c in rng.integers(60, 255, size=3)),
            }
        )

    total_frames = seconds * fps
    for _ in range(total_frames):
        frame = np.full((h, w, 3), 40, dtype=np.uint8)  # dark asphalt
        # draw road cross
        cv2.rectangle(frame, (480, 0), (800, h), (70, 70, 70), -1)
        cv2.rectangle(frame, (0, 260), (w, 460), (70, 70, 70), -1)

        for v in vehicles:
            v["pos"] = (v["pos"] + v["speed"]) % 1.0
            cx, cy = _lane_point(v["lane"], v["pos"], w, h)
            cv2.rectangle(
                frame, (cx - 22, cy - 12), (cx + 22, cy + 12), v["color"], -1
            )
        writer.write(frame)

    writer.release()
    log.info("Generated synthetic video -> %s (%d frames)", dest, total_frames)
    return dest


def _lane_point(lane: str, t: float, w: int, h: int) -> tuple[int, int]:
    """Map a normalized progress t in [0,1] to a pixel position along a lane."""
    if lane == "N":   # travelling downward in the top band
        return 640, int(t * (h // 2))
    if lane == "S":   # travelling upward in the bottom band
        return 640, int(h - t * (h // 2))
    if lane == "E":   # travelling left-to-right in right band
        return int(t * w), 360
    # W
    return int(w - t * w), 360


# ── Frame extraction ────────────────────────────────────────────────────────
def extract_frames(
    video_path: Path,
    out_dir: Path | None = None,
    every_n_seconds: float = 1.0,
    max_frames: int | None = None,
) -> list[Path]:
    """
    Extract frames from a video every `every_n_seconds`. Returns saved paths.
    Frames are resized to REF_FRAME_SIZE so lane coordinates always line up.
    """
    out_dir = out_dir or config.FRAME_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise IOError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps * every_n_seconds)))
    log.info("Extracting frames every %.1fs (%d-frame stride, src fps=%.1f)",
             every_n_seconds, step, fps)

    saved: list[Path] = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            frame = cv2.resize(frame, config.REF_FRAME_SIZE)
            path = out_dir / f"frame_{len(saved):05d}.jpg"
            cv2.imwrite(str(path), frame)
            saved.append(path)
            if max_frames and len(saved) >= max_frames:
                break
        idx += 1
    cap.release()
    log.info("Extracted %d frames -> %s", len(saved), out_dir)
    return saved


def iter_frames(video_path: Path, every_n_seconds: float = 1.0) -> Iterator[np.ndarray]:
    """Yield resized frames without writing them to disk (streaming inference)."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise IOError(f"Could not open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps * every_n_seconds)))
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            yield cv2.resize(frame, config.REF_FRAME_SIZE)
        idx += 1
    cap.release()


# ── Lane overlay (validation) ───────────────────────────────────────────────
def draw_lane_regions(frame: np.ndarray) -> np.ndarray:
    """Return a copy of `frame` with lane rectangles + labels drawn on top."""
    out = frame.copy()
    colors = {"N": (0, 0, 255), "S": (0, 255, 0), "E": (255, 0, 0), "W": (0, 255, 255)}
    for lane, (x1, y1, x2, y2) in config.LANE_REGIONS.items():
        cv2.rectangle(out, (x1, y1), (x2, y2), colors[lane], 2)
        cv2.putText(out, lane, (x1 + 8, y1 + 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, colors[lane], 2)
    return out


if __name__ == "__main__":
    # Smoke test: build a synthetic clip, extract frames, save a lane overlay.
    vid = generate_synthetic_video(seconds=6, fps=10)
    frames = extract_frames(vid, every_n_seconds=1.0)
    if frames:
        first = cv2.imread(str(frames[0]))
        cv2.imwrite(str(config.FRAME_DIR / "lane_overlay.jpg"),
                    draw_lane_regions(first))
        log.info("Wrote lane overlay for visual validation.")
