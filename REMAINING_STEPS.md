# Remaining Steps — Everything Left to Do (turnkey)

Everything that could be automated is done. These 4 items need your machine,
your accounts, or a camera. Each is spelled out click-by-click. Total time:
**~45–60 minutes.**

---

## ✅ Already done for you (no action needed)
- All detection / model / API code, trained model (78.1% acc), tests (13/13)
- One-command test harness (`scripts/test_my_part.py`)
- Deploy config verified working with slim deps (API boots without OpenCV/YOLO)
- `.gitignore` fixed so the trained model actually commits (was excluded — would
  have made the deployed API silently use the weaker fallback)
- Pitch notes, Person B integration doc, this guide

---

## STEP 1 — Run it locally & confirm YOLOv8 (~10 min) ⚠️ REQUIRED

This is the one piece never executed in the sandbox (disk limit). Do it first.

```bash
cd traffic_pipeline
python -m venv venv
source venv/bin/activate                 # Windows: venv\Scripts\activate
pip install -r requirements.txt          # installs YOLO/OpenCV — a few min
python scripts/test_my_part.py           # want 6/6 PASS
```
**Expected:** all six checks green. The YOLOv8 line downloads `yolov8n.pt`
(~6 MB) on first run and reports vehicle boxes on a frame. If that line is the
only red one, you missed `pip install ultralytics opencv-python`.

---

## STEP 2 — Get real traffic video (~10 min, optional but recommended)

Makes the demo far more convincing than the synthetic clip.

```bash
pip install yt-dlp
python scripts/download_videos.py        # pulls 2 public traffic cams
# then run detection on a real clip:
python scripts/run_detection.py data/videos/traffic_1.mp4 --every 5
```
If YouTube is blocked on your network, the script auto-generates synthetic
clips so nothing breaks — but real footage looks better to judges.

**Tune lane boxes to your video:** the N/S/E/W rectangles in `src/config.py`
(`LANE_REGIONS`) are set for a generic top-down view. To check alignment:
```bash
python -m src.video_ingest        # writes data/frames/lane_overlay.jpg
```
Open that image; nudge the rectangle pixel coords until each covers the right
approach. Only needed if your camera angle differs a lot.

---

## STEP 3 — Deploy to Render (~15 min)

**Prereqs:** a GitHub account and a free Render account (render.com).

### 3a. Push to GitHub
```bash
cd traffic_pipeline
git init
git add -A
git commit -m "Person A: traffic detection + prediction pipeline"
git branch -M main
git remote add origin https://github.com/<you>/traffic-ai.git
git push -u origin main
```
> Confirm the model committed: `git ls-files models/` should list
> `cnn_gru_traffic.pt` and `scaler.joblib`. If not, the deploy uses the weaker
> fallback. (I already fixed .gitignore for this — just verify.)

### 3b. Create the service on Render
1. Go to **dashboard.render.com → New → Web Service**
2. **Connect** your GitHub repo
3. Render auto-detects `render.yaml` — accept it. It sets:
   - Build: `pip install -r requirements-api.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/status`
4. Under **Environment**, optionally set (dashboard, not committed):
   - `API_KEY` — if you want to lock down the API
   - `SUPABASE_URL` / `SUPABASE_KEY` — to write ingests to the real DB
5. **Create Web Service** → wait for build (~3–5 min)

### 3c. Verify the live URL
```bash
curl https://<your-service>.onrender.com/status
```
Should return `"model_type": "cnn_gru"`. If it says `rule_based_ewma`, the model
file didn't commit — fix step 3a and redeploy.

**Give Person B:** the live URL + point them at `PERSON_B_INTEGRATION.md`.

> Free-tier note: the service sleeps after ~15 min idle; first hit takes ~30–50s
> to wake. Ping `/status` a minute before demoing to warm it.

---

## STEP 4 — Record the demo clip (~10 min)

Can't be automated — it's a screen recording. Use QuickTime (Mac) / Xbox Game
Bar (Win) / OBS. Keep it **under 90 seconds**. Follow this shot list:

| # | Shot | What to show / say |
|---|---|---|
| 1 | Terminal: `python scripts/test_my_part.py` | "One command validates the whole pipeline" — pause on the 6 green PASS lines (~5s) |
| 2 | Terminal: `python scripts/run_detection.py data/videos/traffic_1.mp4` | Let 3–4 readings scroll: `{N,S,E,W}` counts appearing. "YOLOv8 counts vehicles per lane, per intersection" |
| 3 | Terminal: `uvicorn app.main:app --port 8000` | Show it boot: "Predictor ready" |
| 4 | Browser: `localhost:8000/docs` | Open `POST /predict` → Try it out → Execute. Show the JSON response with `predicted_count` + `congestion_level`. "Counts rising → model forecasts congestion 20 min ahead, confidence 0.99" |
| 5 | (optional) Browser: your Render URL `/status` | "…and it's live in production" |

**Voiceover line to close:** *"78% congestion accuracy, sub-5-vehicle error,
served as a single API endpoint the rest of the system just queries."*

Save the file as `demo_person_a.mp4` next to the repo.

---

## Final demo-day checklist
- [ ] `test_my_part.py` shows 6/6 on the demo laptop
- [ ] One real traffic video in `data/videos/`
- [ ] Render URL returns `model_type: cnn_gru`
- [ ] Person B has the URL + `PERSON_B_INTEGRATION.md`
- [ ] `demo_person_a.mp4` recorded
- [ ] You can say the numbers cold: **78.1% acc, 4.6 MAE, 20-min horizon**
- [ ] Warmed the Render dyno right before presenting

That's the whole Person A deliverable. Good luck.
