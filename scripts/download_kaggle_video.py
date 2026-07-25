#!/usr/bin/env python3
"""
Download a real traffic VIDEO from Kaggle (reliable — no YouTube API breakage).

This is the recommended way to get demo footage: Kaggle serves a direct
download, so it sidesteps the yt-dlp / YouTube 400 issues entirely.

────────────────────────────────────────────────────────────────────────────
ONE-TIME KAGGLE SETUP (2 minutes):
  1. Make a free account at https://www.kaggle.com
  2. Go to  https://www.kaggle.com/settings/account  ->  API  ->  "Create New Token"
     (this downloads kaggle.json)
  3. Move it into place:
        mkdir -p ~/.kaggle
        mv ~/Downloads/kaggle.json ~/.kaggle/kaggle.json
        chmod 600 ~/.kaggle/kaggle.json
────────────────────────────────────────────────────────────────────────────

USAGE:
    python scripts/download_kaggle_video.py                 # default dataset
    python scripts/download_kaggle_video.py --dataset shawon10/road-traffic-video-monitoring
    python scripts/download_kaggle_video.py --list          # show curated options

After it lands a .mp4 in data/videos/, run detection:
    python scripts/run_detection.py data/videos/<file>.mp4 --every 3
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import config
from src.logging_utils import get_logger

log = get_logger("download_kaggle_video")

# Curated datasets that contain real traffic .mp4 footage suitable for YOLO.
CURATED = {
    "road-traffic": {
        "id": "shawon10/road-traffic-video-monitoring",
        "note": "street/road vehicle-detection clips incl. traffic_detection.mp4",
    },
    "highway": {
        "id": "aryashah2k/highway-traffic-videos-dataset",
        "note": "highway CCTV traffic footage (good vehicle density)",
    },
    "vehicle-sample": {
        "id": "vivek603/vehicle-detection-sample-and-output-videos",
        "note": "vehicle detection + counting sample videos",
    },
}
DEFAULT_KEY = "road-traffic"


def _kaggle_ready() -> bool:
    if shutil.which("kaggle") is None:
        log.error("kaggle CLI not found. Install it:  pip install kaggle")
        return False
    # Kaggle supports two credential styles:
    #   * new: ~/.kaggle/access_token   (KGAT_... token) or $KAGGLE_API_TOKEN
    #   * old: ~/.kaggle/kaggle.json    ({"username":..,"key":..})
    import os
    kdir = Path.home() / ".kaggle"
    has_new = (kdir / "access_token").exists() or os.getenv("KAGGLE_API_TOKEN")
    has_old = (kdir / "kaggle.json").exists() or (
        os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY")
    )
    if not (has_new or has_old):
        log.error(
            "No Kaggle credentials found. Use ONE of these:\n"
            "  NEW token (KGAT_...):  mkdir -p ~/.kaggle && "
            "echo <YOUR_TOKEN> > ~/.kaggle/access_token && chmod 600 ~/.kaggle/access_token\n"
            "  OR export it:          export KAGGLE_API_TOKEN=<YOUR_TOKEN>\n"
            "  OLD kaggle.json:        move it to ~/.kaggle/kaggle.json\n"
            "Create a token at https://www.kaggle.com/settings/account (API section)."
        )
        return False
    return True


def _download(dataset_id: str) -> bool:
    out = config.VIDEO_DIR
    out.mkdir(parents=True, exist_ok=True)
    log.info("Downloading Kaggle dataset: %s", dataset_id)
    cmd = ["kaggle", "datasets", "download", "-d", dataset_id, "-p", str(out), "--unzip"]
    try:
        subprocess.run(cmd, check=True, timeout=900)
    except subprocess.CalledProcessError as exc:
        log.error("kaggle download failed (%s). Check the dataset id and that you "
                  "accepted its rules on the website.", exc)
        return False
    except Exception as exc:  # noqa: BLE001
        log.error("kaggle download failed: %s", exc)
        return False

    # Some datasets don't --unzip cleanly; unzip any leftover archives.
    for z in out.glob("*.zip"):
        try:
            with zipfile.ZipFile(z) as zf:
                zf.extractall(out)
            z.unlink()
        except Exception:  # noqa: BLE001
            pass

    vids = sorted(set(out.rglob("*.mp4")) | set(out.rglob("*.avi")) | set(out.rglob("*.mov")))
    if not vids:
        log.error("No video files found in the downloaded dataset. Try another: "
                  "python scripts/download_kaggle_video.py --list")
        return False

    log.info("Got %d video file(s):", len(vids))
    for v in vids[:10]:
        log.info("   %s (%.1f MB)", v.relative_to(out), v.stat().st_size / 1e6)

    # Copy the first video to a predictable name at the top of data/videos/.
    primary = vids[0]
    target = out / "traffic_1.mp4"
    if primary.suffix.lower() == ".mp4" and primary != target:
        shutil.copy(primary, target)
        log.info("Primary clip -> %s", target)
    return True


def main() -> None:
    ap = argparse.ArgumentParser(description="Download a real traffic video from Kaggle")
    ap.add_argument("--dataset", help="Kaggle dataset id (owner/name). Overrides --key.")
    ap.add_argument("--key", choices=list(CURATED), default=DEFAULT_KEY,
                    help="curated dataset shortcut")
    ap.add_argument("--list", action="store_true", help="list curated datasets and exit")
    args = ap.parse_args()

    if args.list:
        print("\nCurated traffic-video datasets:\n")
        for k, v in CURATED.items():
            print(f"  --key {k:16s} {v['id']}\n      {v['note']}\n")
        print("Or any Kaggle id:  --dataset owner/dataset-name\n")
        return

    if not _kaggle_ready():
        sys.exit(1)

    dataset_id = args.dataset or CURATED[args.key]["id"]
    if _download(dataset_id):
        print(f"\nReal footage is in {config.VIDEO_DIR}. Run detection:\n"
              f"  python scripts/run_detection.py {config.VIDEO_DIR}/traffic_1.mp4 --every 3\n")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
