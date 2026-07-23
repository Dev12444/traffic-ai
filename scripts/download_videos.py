#!/usr/bin/env python3
"""
Acquire source traffic videos (Days 1-2).

Downloads public YouTube traffic/CCTV/dashcam clips with yt-dlp. YouTube
frequently changes its player API, which makes older yt-dlp versions fail with
"Precondition check failed / HTTP 400". This script defends against that:

  * auto-upgrades yt-dlp to the latest release on first 400/precondition failure
  * retries with alternate player clients (android, web_safari, tv) which
    sidesteps most extraction breakages
  * falls back to generating synthetic clips only if everything fails, so the
    rest of the pipeline is always runnable

Usage:
    python scripts/download_videos.py                  # default sample set
    python scripts/download_videos.py <url1> <url2>    # your own URLs
    python scripts/download_videos.py --no-synthetic   # fail loudly instead of faking
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import config
from src.logging_utils import get_logger
from src.video_ingest import generate_synthetic_video

log = get_logger("download_videos")

# Public traffic recordings. YouTube IDs rot over time — if these fail, paste your
# own URL(s) as CLI args. Pick a *recorded* clip (not a members-only livestream);
# a plain intersection/dashcam recording downloads most reliably.
SAMPLE_URLS = [
    "https://www.youtube.com/watch?v=MNn9qKG2UFI",  # highway traffic recording
    "https://www.youtube.com/watch?v=wqctLW0Hb_0",  # street intersection recording
]

# Player clients tried in order. The default 'ios' client is what throws the
# 400 "precondition" error; these alternates usually work.
PLAYER_CLIENTS = ["android", "web_safari", "tv", "web"]


def _have_yt_dlp() -> bool:
    return shutil.which("yt-dlp") is not None


def _upgrade_yt_dlp() -> None:
    """Pull the latest yt-dlp — the usual fix for YouTube extraction breakage."""
    log.info("Upgrading yt-dlp to the latest release (fixes most YouTube 400s)...")
    for cmd in (
        [sys.executable, "-m", "pip", "install", "-U", "--quiet", "yt-dlp"],
        ["yt-dlp", "-U"],  # self-update if installed as a standalone binary
    ):
        try:
            subprocess.run(cmd, check=True, timeout=180)
            log.info("yt-dlp upgraded via: %s", " ".join(cmd))
            return
        except Exception as exc:  # noqa: BLE001
            log.warning("upgrade attempt failed (%s): %s", " ".join(cmd[:3]), exc)


def _try_download(url: str, dest: Path, seconds: int, client: str | None) -> bool:
    cmd = [
        "yt-dlp",
        "-f", "best[ext=mp4][height<=720]/best[height<=720]/best",
        "--download-sections", f"*0-{seconds}",
        "--force-keyframes-at-cuts",
        "-o", str(dest),
    ]
    if client:
        cmd += ["--extractor-args", f"youtube:player_client={client}"]
    cmd.append(url)
    try:
        subprocess.run(cmd, check=True, timeout=300,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        return dest.exists() and dest.stat().st_size > 0
    except subprocess.CalledProcessError as exc:
        msg = (exc.stderr or b"").decode(errors="ignore")[-300:]
        log.warning("  client=%s failed: %s", client or "default", msg.strip() or exc)
        return False
    except Exception as exc:  # noqa: BLE001
        log.warning("  client=%s failed: %s", client or "default", exc)
        return False


def download_youtube(url: str, dest: Path, seconds: int = 60) -> bool:
    """Download `seconds` of a YouTube video, trying multiple player clients."""
    log.info("Downloading %s -> %s", url, dest.name)
    # first pass: default client, then each alternate
    for client in [None] + PLAYER_CLIENTS:
        if _try_download(url, dest, seconds, client):
            log.info("  OK via client=%s (%.1f MB)", client or "default",
                     dest.stat().st_size / 1e6)
            return True
    return False


def main(argv: list[str]) -> None:
    allow_synthetic = "--no-synthetic" not in argv
    urls = [a for a in argv if not a.startswith("--")] or SAMPLE_URLS

    if not _have_yt_dlp():
        log.error("yt-dlp not installed. Run: pip install -U yt-dlp")
        if not allow_synthetic:
            sys.exit(1)

    ok = 0
    upgraded = False
    for i, url in enumerate(urls):
        dest = config.VIDEO_DIR / f"traffic_{i+1}.mp4"
        if download_youtube(url, dest):
            ok += 1
            continue
        # first failure: upgrade yt-dlp once, then retry this url
        if not upgraded:
            _upgrade_yt_dlp()
            upgraded = True
            if download_youtube(url, dest):
                ok += 1
                continue
        log.warning("Could not download %s after retries.", url)

    if ok == 0:
        log.warning("No real videos downloaded. YouTube may be blocking this "
                    "network, or the sample URLs are stale — paste your own URL "
                    "as an argument: python scripts/download_videos.py <url>")
    if ok < 2 and allow_synthetic:
        log.warning("Generating %d synthetic clip(s) so the pipeline still runs "
                    "(note: YOLO won't detect synthetic blocks — use a real clip "
                    "for the demo).", 2 - ok)
        for i in range(2 - ok):
            dest = config.VIDEO_DIR / f"synthetic_{i+1}.mp4"
            generate_synthetic_video(dest=dest, seconds=20, fps=15, seed=42 + i)

    log.info("Done. %d real video(s) in %s", ok, config.VIDEO_DIR)
    if ok:
        print(f"\nRun detection on a real clip:\n"
              f"  python scripts/run_detection.py {config.VIDEO_DIR}/traffic_1.mp4 --every 3")


if __name__ == "__main__":
    main(sys.argv[1:])
