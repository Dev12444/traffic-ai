# 🚦 Traffic & Emission Reduction System (Mavericks Effect AI Challenge)

> **AI-Driven Adaptive Traffic Control & Emission Reduction Grid**  
> *Built for the Mavericks Effect AI Challenge (July 18–30, 2026)*

---

## 📌 Problem Statement
Urban intersections run on fixed-timing traffic signals that fail to adapt to real-time traffic conditions. This causes avoidable gridlock, wasted fuel, and elevated urban carbon emissions. Our system processes live CCTV/dashcam traffic video, predicts congestion 15–20 minutes ahead using deep learning, dynamically optimizes traffic signal green-time splits, and recommends adaptive alternate routes — complete with playful civic features.

---

## 🏗️ System Architecture & Team Split

```
 ┌────────────────────────────────────────────────────────┐
 │                      PERSON A                          │
 │         AI / ML Computer Vision & Forecast             │
 └──────────────────────────┬─────────────────────────────┘
                            │ (POST /predict & /vehicles/ingest)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                      PERSON B                          │
 │       Node.js Backend • PostGIS DB • React Dashboard   │
 └──────────────────────────┬─────────────────────────────┘
                            │ (GeoJSON & REST API)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │            REACT + MAPLIBRE GL JS DASHBOARD            │
 └────────────────────────────────────────────────────────┘
```

- **Person A (AI / Computer Vision & ML)**:
  - Video ingestion & vehicle detection using **YOLOv8** (lane vehicle counts).
  - Time-series congestion prediction using **CNN-GRU** model (20-min forecast, 78.1% accuracy).
  - Deployed FastAPI inference endpoint: `https://traffic-ai-dqi6.onrender.com`

- **Person B (Backend API, Database, Spatial Engine & Frontend Dashboard)**:
  - **Node.js (Express)** orchestration server & Supabase database integration.
  - **Adaptive Signal Timing Calculator**: Computes proportional green-time splits based on current + predicted load vs. 35s/35s fixed baseline.
  - **"Forgot Your Helmet?" Route Constraint Engine**: Spatial path calculation buffering 150m away from active police checkpoints.
  - **React + MapLibre GL JS Dashboard**: Dark-mode interactive map of 6 Ahmedabad corridors, signal split inspector, 20-min forecast curves, impact KPIs, and simulation controls.

---

## 🚀 Key Features

1. **Live Traffic Heatmap & Intersections**: Real-time vehicle density tracking across 6 key Ahmedabad corridors (CG Road, SG Highway, Ashram Road, Navrangpura, Satellite, Paldi).
2. **20-Min AI Congestion Forecasting**: CNN-GRU model forecasting congestion trends with 78.1% validation accuracy.
3. **Proportional Adaptive Signal Timing**: Reallocates green-light cycles (e.g. 52s N-S / 18s E-W) to minimize queue wait times.
4. **"Forgot Your Helmet?" Feature**: Toggleable routing constraint that recalculates paths avoiding active police checkpoints while remaining 100% legal.
5. **Impact Summary Dashboard**: Displays estimated time saved (412.5 hrs/day), CO₂ reduced (1,576 kg/day), and network speed increase (+23.4%).
6. **Civic Nudges**: Witty status updates ("Rush hour roast", "Signal flip countdown", best-behaved corridor leaderboard).

---

## 🔌 API Endpoints Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /intersections` | GET | List 6 Ahmedabad intersections with location & status |
| `GET /vehicles` | GET | Latest lane counts per intersection |
| `POST /vehicles/ingest` | POST | Ingest lane counts from vision pipeline |
| `POST /predictions` | POST | Persist & return 20-min forecast from Person A model |
| `GET /signals` | GET | Adaptive green-time splits vs fixed baseline |
| `GET /routes` | GET | Routes with optional `avoidCheckpoints=true` constraint |
| `GET /checkpoints` | GET | Active police checkpoint locations |
| `GET /stats` | GET | Network impact KPIs (Time saved, CO₂ reduced) |
| `GET /nudges` | GET | Civic nudges and leaderboard |
| `POST /simulate/tick` | POST | Trigger live traffic flow update across network |

---

## ⚡ How to Run Locally

### Prerequisites
- Node.js 18+
- Python 3.10+ (for Person A service if running locally)

### 1. Start Backend Server:
```bash
cd backend
npm install
node server.js
```
*Backend runs on http://localhost:5000*

### 2. Start Frontend Dashboard:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on http://localhost:5173*

---

## 🎤 Pitch & Demo Script for Judges

1. **The Problem (30s)**: Show static traffic signals idling empty lanes while adjacent lanes back up 200 meters.
2. **Live Vision & Prediction (45s)**: Click an intersection on the MapLibre dashboard. Point out live N/S/E/W lane counts from YOLOv8 and the 20-minute CNN-GRU forecast curve.
3. **Adaptive Signal Optimization (45s)**: Demonstrate how the green-split gauge reallocates 52s green to N-S and 18s green to E-W, saving ~12s wait time per vehicle.
4. **"Forgot Your Helmet?" Feature (45s)**: Flip the helmet toggle. Watch the map route automatically adjust to bypass 2 police checkpoints via Navrangpura Northern Arc while explaining the legal constraint pathfinding.
5. **Impact & Scalability (30s)**: Highlight the top KPI bar showing 412.5 hours saved and 1,576 kg CO₂ reduced per day.
