# Traffic Congestion Prediction — Person A (AI/ML Pipeline)

Vehicle detection from CCTV/YouTube traffic video + a 15–20 minute congestion
forecast, exposed as a FastAPI service. This is the **Person A** deliverable of
the hackathon project; outputs feed **Person B's** Node.js backend.

```
YouTube / CCTV video
        │  yt-dlp + OpenCV
        ▼
   frame sampling ──► YOLOv8 vehicle detection ──► per-lane counts (N/S/E/W)
        │                                                │
        │                                                ├─► CSV (training corpus)
        │                                                └─► DB sink (Supabase / mock)
        ▼
  CNN-GRU forecaster  ──►  FastAPI  ──►  POST /predict  ──►  {predicted_count, confidence, ...}
   (trained offline)                     GET  /status
                                         POST /vehicles/ingest   (Person A writes / B receives)
```

---

## 1. What's in the box

| Stage | Module | What it does |
|-------|--------|--------------|
| Video ingestion | `src/video_ingest.py`, `scripts/download_videos.py` | yt-dlp download + OpenCV frame extraction (synthetic fallback) |
| Detection | `src/detection.py` | YOLOv8 → per-lane vehicle counts by centroid-in-region |
| Pipeline | `src/pipeline.py`, `scripts/run_detection.py` | video → counts → CSV + DB sink, on a 5–10 s cadence |
| DB sink | `src/db.py` | Supabase/PostgreSQL insert, or a mock CSV when no creds |
| Training data | `src/synthetic_data.py`, `scripts/download_dataset.py` | realistic diurnal/weekly/weather count series |
| Model | `src/model.py`, `src/dataset.py`, `src/train.py` | CNN-GRU multi-task forecaster (count + congestion class) |
| Inference | `src/predict.py` | trained predictor + rule-based EWMA fallback |
| API | `app/main.py`, `app/schemas.py` | FastAPI `/predict`, `/vehicles/ingest`, `/ingest`, `/status` |
| Deploy | `render.yaml`, `Dockerfile`, `Procfile` | Render free-tier / container deployment |
| Tests | `tests/` | detection, model, dataset, and API contract tests |

---

## 2. Quickstart

```bash
# 0. Python 3.10+
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # full stack (detection + model + API)

# 1. Acquire video (real YouTube if possible, synthetic otherwise)
python scripts/download_videos.py

# 2. Run detection: video -> per-lane counts -> CSV + DB sink
python scripts/run_detection.py data/videos/traffic_1.mp4 --every 5

# 3. Build the training dataset (synthetic corpus by default)
python scripts/download_dataset.py --days 60

# 4. Train the forecaster (writes models/cnn_gru_traffic.pt + scaler.joblib)
python scripts/train_model.py

# 5. Serve the API
uvicorn app.main:app --reload --port 8000
#   -> interactive docs at http://localhost:8000/docs

# One-shot end-to-end demo (steps 3–4 + sample forecast, no server):
python scripts/demo_end_to_end.py
```

If you only want to deploy/serve the API (no detection), use the slim deps:
`pip install -r requirements-api.txt`.

---

## 3. API contract (shared with Person B)

Base URL local: `http://localhost:8000`

### `GET /status` — health check
```json
{
  "status": "ok",
  "api_version": "1.0.0",
  "model_loaded": true,
  "model_type": "cnn_gru",
  "lookback": 12,
  "horizon_minutes": 20,
  "metrics": {"cls_accuracy": 0.86, "within_tolerance": 0.91, "mae": 2.1, "rmse": 3.0}
}
```

### `POST /predict` — recent counts → 15–20 min forecast
Request:
```json
{
  "intersection_id": "INT-001",
  "readings": [
    {"timestamp": "2026-07-24T17:00:00+00:00", "lane_counts": {"N": 15, "S": 14, "E": 6, "W": 8}, "weather": 0.3},
    {"timestamp": "2026-07-24T17:05:00+00:00", "lane_counts": {"N": 17, "S": 16, "E": 6, "W": 9}, "weather": 0.3}
  ]
}
```
Response (**the contract Person B consumes**):
```json
{
  "intersection_id": "INT-001",
  "predicted_for": "2026-07-24T17:25:00+00:00",
  "predicted_count": 27,
  "confidence": 0.82,
  "congestion_level": "moderate",
  "model": "cnn_gru"
}
```
`readings` may hold 1..N recent entries (oldest first); the last `lookback` (12)
are used, shorter windows are left-padded. Timestamps are optional (default now).

### `POST /vehicles/ingest` (alias `POST /ingest`) — raw counts into the DB
Person A writes here from the detection pipeline; Person B can also POST counts.
Request:
```json
{"intersection_id": "INT-001", "lane_counts": {"N": 5, "S": 3, "E": 2, "W": 4}, "timestamp": "2026-07-24T17:05:00+00:00"}
```
Response:
```json
{"status": "stored", "intersection_id": "INT-001", "timestamp": "2026-07-24T17:05:00+00:00", "total": 14}
```

### Auth
Set `API_KEY` in the environment to require `Authorization: Bearer <API_KEY>` on
`/predict` and the ingest routes. Unset ⇒ open (fine for local demos).

### cURL examples
```bash
curl localhost:8000/status
curl -X POST localhost:8000/predict -H 'content-type: application/json' \
  -d '{"intersection_id":"INT-001","readings":[{"lane_counts":{"N":15,"S":14,"E":6,"W":8}}]}'
curl -X POST localhost:8000/vehicles/ingest -H 'content-type: application/json' \
  -d '{"intersection_id":"INT-001","lane_counts":{"N":5,"S":3,"E":2,"W":4}}'
```

---

## 4. The model

**CNN-GRU multi-task forecaster** (`src/model.py`):
- Input: `lookback=12` timesteps × 9 features
  `[count_N, count_S, count_E, count_W, hour_sin, hour_cos, dow_sin, dow_cos, weather]`
- 1D temporal Conv → 2-layer GRU → two heads:
  - **regression** head → future *total* vehicle count (Softplus ⇒ never negative)
  - **classification** head → congestion class `{free_flow, moderate, congested}`
- Forecast horizon: `horizon=4` steps × `step_minutes=5` = **20 minutes ahead**.
- `confidence` = softmax max-probability of the congestion head.

**Why synthetic training data?** METR-LA / PEMS-BAY are sensor *speed* matrices
that need Kaggle auth and don't match the 4-lane *count* schema our detector
emits. The spec explicitly allows "use your own YouTube-sourced counts", so
`src/synthetic_data.py` generates a realistic count corpus (two weekday rush
peaks, quieter weekends, a weather factor, Poisson noise) matching the exact
feature schema. `scripts/download_dataset.py` documents how to swap in a real
Kaggle dataset if desired — training is one command either way:
`python -m src.train your_counts.csv`.

**Metrics** are reported on a held-out chronological test split (70/20/10):
congestion classification accuracy (headline; target ≥ 75%), count MAE/RMSE, and
a within-tolerance count accuracy (|err| ≤ max(3, 15%)). See `models/` after
training and `GET /status`.

**Fallback:** if no trained model is present, the API automatically serves the
`RuleBasedPredictor` (EWMA of recent totals + trend) so `/predict` always works.

---

## 5. Lane configuration

Lanes are axis-aligned pixel rectangles on a `1280×720` reference frame
(`src/config.py → LANE_REGIONS`). A detection is assigned to a lane if its
bounding-box centroid falls inside that rectangle. Re-tune per camera by editing
`LANE_REGIONS`; visualize with:
```bash
python -m src.video_ingest   # writes data/frames/lane_overlay.jpg
```

---

## 6. Database integration (Supabase / PostgreSQL)

Set `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_TABLE` (default `vehicle_counts`)
in `.env` to push real rows; otherwise a mock CSV sink is used. Expected table:

```sql
create table vehicle_counts (
  id              bigint generated always as identity primary key,
  intersection_id text        not null,
  timestamp       timestamptz not null,
  lane_counts     jsonb       not null,   -- {"N":5,"S":3,"E":2,"W":4}
  total           int         not null
);
```

---

## 7. Deployment (Render free tier)

1. Push this repo to GitHub (include a trained `models/cnn_gru_traffic.pt` +
   `models/scaler.joblib`, or train in the build step).
2. On Render, create a **Web Service** from the repo — `render.yaml` is picked up
   automatically (build `requirements-api.txt`, start `uvicorn app.main:app`).
3. Set `API_KEY` / `SUPABASE_*` as environment variables in the dashboard.
4. Health check path is `/status`.

Container alternative: `docker build -t traffic-api . && docker run -p 8000:8000 traffic-api`.

---

## 8. Tests

```bash
pip install pytest httpx
pytest                       # detection + model + dataset + API contract tests
```

---

## 9. Project layout

```
traffic_pipeline/
├── app/                  FastAPI service (main.py, schemas.py)
├── src/                  config, ingestion, detection, db, model, dataset, train, predict, pipeline
├── scripts/              download_videos, run_detection, download_dataset, train_model, demo_end_to_end
├── tests/                pytest suite
├── models/               trained artifacts (.pt, .joblib) — git-ignored
├── data/                 videos / frames / detections / datasets — git-ignored
├── requirements.txt      full stack     |  requirements-api.txt  slim deploy stack
├── render.yaml Dockerfile Procfile runtime.txt   deployment
└── README.md
```

---

## 10. Notes & scope

- Use **public** YouTube traffic cameras only — no private/live hardware feeds.
- Detection uses YOLOv8-nano by default (`YOLO_WEIGHTS=yolov8n.pt`); swap to
  `yolov8s.pt`/`m` for accuracy at the cost of speed.
- All configuration is centralized in `src/config.py` and overridable via env
  vars (`.env.example`), which is what the Render deploy relies on.
