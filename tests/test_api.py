"""API contract tests using FastAPI's TestClient (runs the lifespan/startup)."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _window(n=12):
    return {
        "intersection_id": "INT-001",
        "readings": [
            {"timestamp": None,
             "lane_counts": {"N": 5 + i, "S": 4 + i, "E": 2, "W": 3},
             "weather": 0.2}
            for i in range(n)
        ],
    }


def test_status():
    r = client.get("/status")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model_type"] in ("cnn_gru", "rule_based_ewma")
    assert body["horizon_minutes"] >= 15


def test_predict_contract():
    r = client.post("/predict", json=_window())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["intersection_id"] == "INT-001"
    assert isinstance(body["predicted_count"], int) and body["predicted_count"] >= 0
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["congestion_level"] in ("free_flow", "moderate", "congested")
    assert "predicted_for" in body


def test_predict_rejects_empty_readings():
    r = client.post("/predict", json={"intersection_id": "INT-001", "readings": []})
    assert r.status_code == 422


def test_ingest_and_alias():
    payload = {"intersection_id": "INT-001",
               "lane_counts": {"N": 3, "S": 2, "E": 1, "W": 4}}
    for path in ("/vehicles/ingest", "/ingest"):
        r = client.post(path, json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "stored"
        assert body["total"] == 10


def test_ingest_validation_rejects_negative():
    payload = {"intersection_id": "INT-001",
               "lane_counts": {"N": -1, "S": 2, "E": 1, "W": 4}}
    r = client.post("/vehicles/ingest", json=payload)
    assert r.status_code == 422
