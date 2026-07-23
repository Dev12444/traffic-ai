#!/usr/bin/env python3
"""
=====================================================================
  PERSON A — ONE-COMMAND TEST HARNESS
=====================================================================
Run this on YOUR machine after `pip install -r requirements.txt`.

It checks every piece of the Person A deliverable and prints a clear
PASS / FAIL for each, so you know exactly what's working before the
demo / before handing the API URL to Person B.

    python scripts/test_my_part.py            # full check
    python scripts/test_my_part.py --quick    # skip model training

What it verifies:
    1. Dependencies importable        (torch, fastapi, ultralytics, cv2, ...)
    2. YOLOv8 vehicle detection       (loads weights, runs on a frame)
    3. Lane-counting logic            (N/S/E/W assignment)
    4. Prediction model               (train short run OR load saved model)
    5. Rule-based fallback            (works with no model)
    6. FastAPI endpoints              (/status, /predict, /vehicles/ingest)
=====================================================================
"""
from __future__ import annotations

import argparse
import sys
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

GREEN = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"; DIM = "\033[2m"; RESET = "\033[0m"
results: list[tuple[str, bool, str]] = []


def check(name: str):
    """Decorator that runs a check fn, records PASS/FAIL, never crashes the suite."""
    def wrap(fn):
        print(f"\n{DIM}> {name}...{RESET}")
        try:
            note = fn() or ""
            results.append((name, True, note))
            print(f"  {GREEN}PASS{RESET}  {name}  {DIM}{note}{RESET}")
        except Exception as e:  # noqa: BLE001
            results.append((name, False, str(e)))
            print(f"  {RED}FAIL{RESET}  {name}")
            print(f"{DIM}{traceback.format_exc()}{RESET}")
        return fn
    return wrap


# -- 1. dependencies ----------------------------------------------------------
def test_deps():
    @check("1. Dependencies importable")
    def _():
        import numpy, pandas, sklearn, joblib  # noqa: F401
        import torch  # noqa: F401
        import fastapi, uvicorn  # noqa: F401
        missing = []
        for mod in ("cv2", "ultralytics"):
            try:
                __import__(mod)
            except Exception:
                missing.append(mod)
        if missing:
            return f"{YELLOW}(optional missing: {', '.join(missing)} - detection steps will skip){RESET}"
        return "all core + detection deps present"


# -- 2 & 3. YOLOv8 detection + lane counting ----------------------------------
def test_detection(quick: bool):
    @check("2. YOLOv8 vehicle detection")
    def _():
        try:
            from ultralytics import YOLO  # noqa: F401
            import cv2  # noqa: F401
        except Exception:
            raise RuntimeError("ultralytics/cv2 not installed - run `pip install ultralytics opencv-python`")
        from src.detection import VehicleDetector
        import numpy as np, cv2
        frame_dir = ROOT / "data" / "frames"
        frames = sorted(frame_dir.glob("*.jpg"))
        if frames:
            img = cv2.imread(str(frames[0]))
        else:
            img = (np.random.rand(720, 1280, 3) * 255).astype("uint8")
        det = VehicleDetector()                 # downloads yolov8n.pt first time
        counts = det.count_frame(img)           # runs real YOLO inference
        return f"per-lane counts {counts} on a {img.shape[1]}x{img.shape[0]} frame"

    @check("3. Lane-counting logic (N/S/E/W)")
    def _():
        # Verifies the centroid->lane assignment without needing YOLO weights,
        # by driving the same _assign_lane logic the detector uses.
        from src import config
        from src.detection import VehicleDetector
        assigned = {}
        for lane, (x1, y1, x2, y2) in config.LANE_REGIONS.items():
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            assigned[lane] = VehicleDetector._assign_lane(cx, cy)
        # each region's own centre should map back to that lane
        ok = all(assigned[lane] == lane for lane in config.LANE_REGIONS)
        assert ok, f"lane assignment mismatch: {assigned}"
        return f"centroid->lane mapping correct for {list(config.LANE_REGIONS)}"


# -- 4. prediction model ------------------------------------------------------
def _recent_window(n=12):
    now = datetime.now(timezone.utc).replace(hour=17, minute=30, second=0, microsecond=0)
    counts = [(9,8,4,5),(11,10,5,6),(13,12,5,7),(15,14,6,8),(17,16,6,9),(18,17,7,9),
              (19,18,7,10),(20,19,8,10),(21,20,8,11),(22,21,9,11),(23,22,9,12),(24,23,10,12)]
    out = []
    for i,(n_,s_,e_,w_) in enumerate(counts[-n:]):
        ts = (now - timedelta(minutes=(n-i)*5)).isoformat()
        out.append({"timestamp": ts, "lane_counts": {"N":n_,"S":s_,"E":e_,"W":w_}, "weather":0.3})
    return out


def test_model(quick: bool):
    @check("4. Prediction model (CNN-GRU)")
    def _():
        from src.predict import get_predictor
        model_file = ROOT / "models" / "cnn_gru_traffic.pt"
        if not model_file.exists() and not quick:
            from src.train import train_model
            print(f"    {DIM}(no saved model - training a short run, ~1-2 min){RESET}")
            train_model(epochs=8)
        pred = get_predictor()
        out = pred.predict(intersection_id="INT-001", readings=_recent_window())
        assert out["predicted_count"] >= 0
        assert 0.0 <= out["confidence"] <= 1.0
        return f"model={out['model']} count={out['predicted_count']} conf={out['confidence']:.2f} level={out['congestion_level']}"

    @check("5. Rule-based fallback")
    def _():
        from src.predict import RuleBasedPredictor
        out = RuleBasedPredictor().predict(intersection_id="INT-001", readings=_recent_window())
        assert out["predicted_count"] >= 0
        return f"fallback count={out['predicted_count']} conf={out['confidence']:.2f}"


# -- 6. FastAPI ---------------------------------------------------------------
def test_api():
    @check("6. FastAPI endpoints")
    def _():
        from fastapi.testclient import TestClient
        from app.main import app
        c = TestClient(app)
        s = c.get("/status"); assert s.status_code == 200, f"/status -> {s.status_code}"
        body = {"intersection_id":"INT-001","readings":_recent_window()}
        p = c.post("/predict", json=body); assert p.status_code == 200, f"/predict -> {p.status_code}: {p.text}"
        pj = p.json(); assert {"intersection_id","predicted_for","predicted_count","confidence"} <= pj.keys()
        ing = {"intersection_id":"INT-001","timestamp":datetime.now(timezone.utc).isoformat(),
               "lane_counts":{"N":10,"S":8,"E":4,"W":6}}
        i = c.post("/vehicles/ingest", json=ing); assert i.status_code == 200, f"/ingest -> {i.status_code}: {i.text}"
        return f"/status /predict /vehicles/ingest all 200 - predict={pj['predicted_count']}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="skip model training if no saved model")
    args = ap.parse_args()

    print("=" * 70)
    print("  PERSON A - DELIVERABLE TEST HARNESS")
    print("=" * 70)

    test_deps()
    test_detection(args.quick)
    test_model(args.quick)
    test_api()

    print("\n" + "=" * 70)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    for name, ok, note in results:
        tag = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        print(f"  {tag}  {name}")
    print("-" * 70)
    color = GREEN if passed == total else (YELLOW if passed >= total - 2 else RED)
    print(f"  {color}{passed}/{total} checks passed{RESET}")
    print("=" * 70)
    if passed == total:
        print(f"\n{GREEN}Your part is ready. Start the API:{RESET}  uvicorn app.main:app --port 8000")
        print(f"  Hand Person B this URL + the API docs at /docs")
    else:
        print(f"\n{YELLOW}Some checks failed or skipped - see details above.{RESET}")
        print("  Most common cause: `pip install ultralytics opencv-python` for the detection checks.")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
