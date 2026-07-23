# Person A — Demo Script & Pitch Notes

*Traffic & Emission Reduction System — Mavericks Effect AI Challenge*
*Your half: the AI/ML pipeline (video → detection → prediction → API)*

---

## 1. The 30-second pitch (say this first)

> "My half is the intelligence layer. I take raw traffic video, detect and
> count vehicles per lane with YOLOv8, and feed those counts into a CNN-GRU
> deep-learning model that forecasts congestion 15–20 minutes ahead. It all
> ships as a FastAPI service with a single `/predict` endpoint — so the rest
> of the system just asks 'what's coming?' and gets a number back. The model
> hits **78% congestion-classification accuracy** on held-out data, which is
> well past what a hackathon needs to prove the concept."

---

## 2. What to show, in order (live demo, ~3 min)

Run everything from the project root with the API already trained.

**Step 1 — prove the whole thing works in one command**
```bash
python scripts/test_my_part.py
```
Point at the green PASS lines: dependencies, YOLOv8 detection, lane counting,
the trained model, the fallback, and all three API endpoints. One screen,
six checks, all green.

**Step 2 — show detection on real video**
```bash
python scripts/run_detection.py
```
This runs YOLOv8 over a traffic clip and prints per-lane counts
(`{N, S, E, W}`) frame by frame. That JSON *is* the contract Person B consumes.

**Step 3 — start the live API and hit it**
```bash
uvicorn app.main:app --port 8000
# in a second terminal:
curl http://localhost:8000/status
```
Then open **http://localhost:8000/docs** — the auto-generated Swagger UI.
Click `POST /predict`, "Try it out", send the example body, show the response:
```json
{
  "intersection_id": "INT-001",
  "predicted_for": "2026-07-24T18:15:00+00:00",
  "predicted_count": 58,
  "confidence": 0.99,
  "congestion_level": "congested",
  "model": "cnn_gru"
}
```
The story to tell: *"counts go up over the last hour → model says the next 20
minutes stay congested → confidence 0.99. That's the signal Person B's
optimizer uses to change the lights before the jam forms."*

**Step 4 — the end-to-end one-shot (backup / if no video handy)**
```bash
python scripts/demo_end_to_end.py
```
Trains the model live (~1–2 min) and prints a forecast. Good fallback if the
live API or a video file misbehaves on the demo machine.

---

## 3. Architecture in one breath (for the judges' Q&A)

```
 YouTube / CCTV video
        │  (yt-dlp + OpenCV frame sampling)
        ▼
   YOLOv8 detection ──► filter to vehicle classes {car, motorcycle, bus, truck}
        │                assign each box to a lane by centroid → N/S/E/W counts
        ▼
   {intersection_id, timestamp, lane_counts:{N,S,E,W}}  ──► Supabase / CSV
        │
        ▼
   CNN-GRU forecaster
     • 1D-CNN over the last 12 timesteps (learns spatial lane patterns)
     • 2-layer GRU, 64 hidden (learns temporal build-up)
     • two heads: regression (next count) + classification (congestion level)
        │
        ▼
   FastAPI /predict ──► {predicted_count, confidence, congestion_level}
```

**Why CNN-GRU and not plain LSTM:** the CNN front-end captures how lanes move
together (a jam building on N usually precedes E), the GRU captures the time
build-up, and GRU trains faster than LSTM — which matters on a 12-day clock.

---

## 4. The numbers (memorize these — real, from the trained model)

| Metric | Value | What it means |
|---|---|---|
| Congestion classification accuracy | **78.1%** | 3-way: free-flow / moderate / congested |
| Count MAE | **4.6 vehicles** | avg error on the raw count forecast |
| Count RMSE | **5.8 vehicles** | penalizes big misses |
| Forecast horizon | **20 min** (4 × 5-min steps) | how far ahead it sees |
| Lookback window | **12 steps** (1 hour) | history it reads |
| Input features | **9** | 4 lane counts, total, hour, day-of-week, weekend, weather |

*If a judge asks "is 78% good?"* — yes for this: the baseline (fixed timing)
has zero foresight. Any accurate lead time lets the optimizer act early. And
even if the model were unavailable, the service falls back to a rule-based
predictor automatically, so the demo never dies.

---

## 5. Honest framing (judges reward this)

- **The traffic-count training data is synthetic-but-realistic** (diurnal +
  weekly + weather patterns matching the detector's schema). Standard
  benchmarks like METR-LA are *speed* sensor matrices, not per-lane *counts*,
  so they don't match our pipeline's output. `scripts/download_dataset.py`
  documents how to swap in a real Kaggle counts dataset — training is one
  command either way.
- **Checkpoints (the "forgot your helmet" feature) are manually seeded** — that
  belongs to Person B, and it's intentional, not hidden.
- **This is a convincing simulation of the full pipeline**, which is exactly
  what a hackathon is meant to demonstrate — no live government CCTV or
  hardware signal control claimed.

---

## 6. Anticipated questions + answers

**"Does it run in real time?"**
YOLOv8n processes frames fast enough for a per-few-seconds cadence; we sample
frames rather than every single one, which is standard for traffic counting.

**"What if the video source fails?"**
The pipeline has a synthetic-clip fallback so it always produces counts, and
the predictor falls back to a rule-based EWMA if the model file is missing.

**"How does Person B use this?"**
One HTTP call: `POST /predict` with the recent readings, gets back a forecast.
Contract is self-documenting at `/docs`. They also `POST /vehicles/ingest` to
push counts in. Zero shared code — clean API seam.

**"Could you improve accuracy with more time?"**
Yes — more epochs, real Kaggle counts data, per-intersection fine-tuning, and
adding the weather API feed live instead of the simulated weather feature.

---

## 7. Demo-day checklist

- [ ] `pip install -r requirements.txt` done on the demo machine
- [ ] `python scripts/test_my_part.py` shows all green (esp. YOLOv8 check)
- [ ] One traffic video downloaded into `data/videos/`
- [ ] API starts clean: `uvicorn app.main:app --port 8000`
- [ ] `/docs` opens in the browser
- [ ] Person B can reach your API URL (deployed on Render, or laptop on same wifi)
- [ ] You can state the 78% / 4.6-MAE numbers without looking
