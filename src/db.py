"""
Detection sink — push per-lane vehicle counts to Person B's Supabase/PostgreSQL
table, or to a local CSV when no credentials are configured (Days 3-5).

The public contract Person B consumes is one row per reading:

    {
        "intersection_id": "INT-001",
        "timestamp":       "2026-07-24T10:15:00+00:00",
        "lane_counts":     {"N": 5, "S": 3, "E": 2, "W": 4},   # JSON column
        "total":           14
    }

`get_sink()` returns a MockSink or SupabaseSink automatically based on config, so
callers never branch on environment. Both expose the same `.push(record)` /
`.push_many(records)` API.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Iterable, Protocol

from . import config
from .detection import DetectionRecord
from .logging_utils import get_logger

log = get_logger(__name__)


# ── Sink protocol ───────────────────────────────────────────────────────────
class Sink(Protocol):
    def push(self, record: DetectionRecord) -> None: ...
    def push_many(self, records: Iterable[DetectionRecord]) -> int: ...


def _record_to_row(rec: DetectionRecord) -> dict:
    """Shape a DetectionRecord into the DB row schema Person B expects."""
    return {
        "intersection_id": rec.intersection_id,
        "timestamp": rec.timestamp,
        "lane_counts": rec.lane_counts,  # JSON/dict column
        "total": rec.total,
    }


# ── Mock sink (no external deps) ────────────────────────────────────────────
class MockSink:
    """Append rows to a CSV — a stand-in for the DB during local development."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or config.DETECTION_DIR / "ingested_counts.csv"
        self._fieldnames = ["intersection_id", "timestamp", "lane_counts", "total"]
        if not self.path.exists():
            with open(self.path, "w", newline="") as f:
                csv.DictWriter(f, fieldnames=self._fieldnames).writeheader()
        log.info("Using MockSink -> %s (set SUPABASE_URL/KEY for the real DB)", self.path)

    def push(self, record: DetectionRecord) -> None:
        row = _record_to_row(record)
        row["lane_counts"] = json.dumps(row["lane_counts"])  # serialize JSON for CSV
        with open(self.path, "a", newline="") as f:
            csv.DictWriter(f, fieldnames=self._fieldnames).writerow(row)

    def push_many(self, records: Iterable[DetectionRecord]) -> int:
        n = 0
        for rec in records:
            self.push(rec)
            n += 1
        return n


# ── Supabase sink ───────────────────────────────────────────────────────────
class SupabaseSink:
    """Insert rows into a Supabase table via the official client."""

    def __init__(self) -> None:
        from supabase import create_client  # lazy import; optional dependency

        self.table = config.SUPABASE_TABLE
        self.client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        log.info("Using SupabaseSink -> table '%s'", self.table)

    def push(self, record: DetectionRecord) -> None:
        self.client.table(self.table).insert(_record_to_row(record)).execute()

    def push_many(self, records: Iterable[DetectionRecord]) -> int:
        rows = [_record_to_row(r) for r in records]
        if not rows:
            return 0
        self.client.table(self.table).insert(rows).execute()
        return len(rows)


# ── Factory ─────────────────────────────────────────────────────────────────
def get_sink() -> Sink:
    """Return the configured sink (Supabase if credentials present, else mock)."""
    if config.USE_MOCK_DB:
        return MockSink()
    try:
        return SupabaseSink()
    except Exception as exc:  # pragma: no cover - depends on network/creds
        log.warning("Supabase init failed (%s); falling back to MockSink", exc)
        return MockSink()
