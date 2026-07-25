# QUICKSTART — Test Your Part in 3 Commands

Person A (AI/ML pipeline) for the Traffic & Emission Reduction System.
Everything below runs from the project root.

---

## Step 0 — one-time setup

```bash
# from the traffic_pipeline/ folder
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

The first YOLOv8 run auto-downloads `yolov8n.pt` (~6 MB). That's expected.

---

## Step 1 — verify everything works

```bash
python scripts/test_my_part.py
```

You want **6/6 PASS**. Each line tells you what's healthy:
dependencies, YOLOv8 detection, lane counting, the trained model,
the rule-based fallback, and all three API endpoints.

> If the YOLOv8 line is the only failure, you skipped
> `pip install ultralytics opencv-python` — install it and re-run.

---

## Step 2 — see it run end-to-end

```bash
python scripts/demo_end_to_end.py     # trains + forecasts in one shot (~2 min)
python scripts/run_detection.py       # runs YOLOv8 on a video, prints lane counts
```

---

## Step 3 — start the live API (this is what Person B consumes)

```bash
uvicorn app.main:app --port 8000
```

Then open **http://localhost:8000/docs** — interactive API docs.

Quick sanity check from another terminal:
```bash
curl http://localhost:8000/status
```

---

## What Person B needs from you

1. **The API URL** — either your deployed Render URL or `http://<your-ip>:8000`
2. **The two endpoints they call:**
   - `POST /predict` — send recent readings, get a 20-min congestion forecast
   - `POST /vehicles/ingest` — push raw lane counts in
3. **The docs link** — `/docs` documents the exact JSON shape (self-serve)

---

## If you fall behind (fallback plan from the spec)

- Model training slow? The service **auto-falls-back to a rule-based predictor**
  — the demo still works, just say "point-estimate fallback."
- Video setup eating time? Use `scripts/demo_end_to_end.py` (no video needed).
- Cut order if desperate: keep detection + heatmap, drop the deep model last.

---

## File map (where things live)

```
app/            FastAPI service  (main.py = the /predict server)
src/            all the logic (detection, model, predict, db, pipeline)
scripts/        run these:  test_my_part.py, demo_end_to_end.py, run_detection.py
models/         trained CNN-GRU weights (cnn_gru_traffic.pt) + scaler
data/           videos, extracted frames, detection CSVs
tests/          pytest suite (run: python -m pytest)
README.md       full technical docs
DEMO_AND_PITCH.md   your demo script + judge Q&A + the numbers to memorize
```

---

## Deploy to Render (Day 12)

```bash
# render.yaml + Dockerfile are already in the repo
# 1. push to GitHub
# 2. New > Web Service on render.com, point at the repo
# 3. it reads render.yaml automatically
# 4. share the live URL with Person B
```

**Model accuracy: 78.1% congestion classification, 4.6-vehicle MAE.**
Those are your headline numbers — see DEMO_AND_PITCH.md for the full table.
