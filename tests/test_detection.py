"""Detection-layer tests that don't require loading YOLO weights."""
import json
from pathlib import Path

from src import config
from src.detection import DetectionRecord, VehicleDetector, save_detections_csv
from src.db import MockSink


def test_lane_assignment_centroids():
    # centroid inside each configured rectangle -> that lane
    for lane, (x1, y1, x2, y2) in config.LANE_REGIONS.items():
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        assert VehicleDetector._assign_lane(cx, cy) == lane
    # far outside everything -> None
    assert VehicleDetector._assign_lane(-50, -50) is None


def test_detection_record_flatten_and_total():
    rec = DetectionRecord("INT-1", "2026-07-24T00:00:00+00:00", {"N": 2, "S": 1, "E": 0, "W": 3})
    assert rec.total == 6
    flat = rec.to_flat_dict()
    assert flat["count_N"] == 2 and flat["count_W"] == 3
    assert flat["intersection_id"] == "INT-1"


def test_save_csv_roundtrip(tmp_path: Path):
    recs = [DetectionRecord("INT-1", "t0", {"N": 1, "S": 1, "E": 1, "W": 1})]
    out = save_detections_csv(recs, tmp_path / "d.csv")
    text = out.read_text()
    assert "intersection_id" in text and "count_N" in text


def test_mock_sink_writes_json_lane_counts(tmp_path: Path):
    sink = MockSink(tmp_path / "ingest.csv")
    rec = DetectionRecord("INT-9", "t", {"N": 4, "S": 0, "E": 2, "W": 1})
    sink.push(rec)
    lines = (tmp_path / "ingest.csv").read_text().strip().splitlines()
    assert lines[0].startswith("intersection_id")
    # the lane_counts column is a JSON blob
    assert json.loads('{"N": 4, "S": 0, "E": 2, "W": 1}') == {"N": 4, "S": 0, "E": 2, "W": 1}
    assert "INT-9" in lines[1]
