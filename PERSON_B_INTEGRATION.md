# Person A → Person B — API Integration Handoff

This is everything Person B needs to wire the Node.js backend to my FastAPI
inference service. No source code sharing required — just HTTP.

**Base URL:** `http://localhost:8000` locally, or the Render URL once deployed
(e.g. `https://traffic-congestion-api.onrender.com`).

**Interactive docs:** `<base>/docs` (Swagger — try every endpoint in the browser).

**Auth:** none by default. If I set an `API_KEY`, add header
`Authorization: Bearer <key>` to `/predict` and the ingest routes.

---

## The 4 endpoints you'll call

### 1. `GET /status` — health check
Use for your uptime check / to confirm the model loaded.
```json
{
  "status": "ok",
  "model_type": "cnn_gru",
  "lookback": 12,
  "horizon_minutes": 20,
  "metrics": { "cls_accuracy": 0.781, "mae": 4.58 }
}
```

### 2. `POST /predict` — the main one (congestion forecast)
Send the recent readings for an intersection; get the 20-min-ahead forecast.

**Request:**
```json
{
  "intersection_id": "INT-001",
  "readings": [
    { "timestamp": "2026-07-24T17:00:00Z",
      "lane_counts": { "N": 20, "S": 19, "E": 8, "W": 10 },
      "weather": 0.3 }
    // ... send up to 12 readings, oldest first. Fewer is OK.
  ]
}
```
**Response:**
```json
{
  "intersection_id": "INT-001",
  "predicted_for": "2026-07-24T17:20:00+00:00",
  "predicted_count": 58,
  "confidence": 0.99,
  "congestion_level": "congested",
  "model": "cnn_gru"
}
```
`congestion_level` is one of `free_flow | moderate | congested` — map that
straight to your heatmap colors. `predicted_count` is total vehicles across all
4 lanes for the forecast window.

### 3. `POST /vehicles/ingest` — push raw counts into the DB
My detection pipeline calls this automatically, but you can too (e.g. to seed
test data). It writes one row to the `vehicle_counts` table.
```json
{ "intersection_id": "INT-001",
  "timestamp": "2026-07-24T17:00:00Z",
  "lane_counts": { "N": 20, "S": 19, "E": 8, "W": 10 } }
```
Response: `{ "status": "stored", "intersection_id": "INT-001", "total": 57 }`

### 4. `POST /ingest` — identical alias of the above (convenience).

---

## Node.js call example (drop into your Express service)

```js
// npm i node-fetch  (or use built-in fetch on Node 18+)
const AI_BASE = process.env.AI_BASE_URL || "http://localhost:8000";

async function getForecast(intersectionId, recentReadings) {
  const res = await fetch(`${AI_BASE}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AI_API_KEY && {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      }),
    },
    body: JSON.stringify({
      intersection_id: intersectionId,
      readings: recentReadings, // [{timestamp, lane_counts:{N,S,E,W}, weather}]
    }),
  });
  if (!res.ok) throw new Error(`AI /predict ${res.status}: ${await res.text()}`);
  return res.json(); // {predicted_count, confidence, congestion_level, ...}
}
```

Recommended pattern for your `GET /predictions` endpoint: pull the latest ~12
rows from `vehicle_counts` for each intersection, POST them to my `/predict`,
store the result in your `predictions` table, and return it. That matches the
spec's "Person B calls A's model" ownership.

---

## The DB row I write (so your schema lines up)

Table `vehicle_counts`, one row per reading:
```
intersection_id  text
timestamp        timestamptz
lane_counts      jsonb     -- {"N":20,"S":19,"E":8,"W":10}
total            integer   -- convenience sum
```
This matches the spec schema; `total` is an extra I add so you don't have to
sum the JSON in SQL every time.

---

## Contract notes / gotchas

- **Timestamps:** ISO-8601. I accept `Z` or `+00:00`. If you omit it on ingest,
  I stamp "now."
- **Ordering:** `/predict` wants readings oldest-first. If you send more than 12
  I use the most recent 12.
- **Cold start on Render free tier:** first request after idle can take ~30–50s
  while the dyno wakes. Warm it before the demo with a `/status` ping.
- **Fallback:** if my model file is ever missing, `/predict` still returns a
  valid response with `"model": "rule_based_ewma"` — your code doesn't need to
  special-case it, the JSON shape is identical.
- **Weather** is optional (defaults to 0.2). If you wire the OpenWeatherMap feed,
  pass a 0–1 severity; otherwise leave it out.

Ping me if any field shape surprises you — but `/docs` is the source of truth.
