# FundusView — Retinal Image Analysis Workstation

A browser-based proof-of-concept for retinal fundus photograph analysis. Supports two clinical screening modes with interactive image viewing, overlay analysis, and a Python backend API. Designed so the initial pixel-heuristic algorithms can be replaced by validated ML models without changing the application shell.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Running Locally — Frontend Only](#running-locally--frontend-only)
5. [Running Locally — Frontend + Backend](#running-locally--frontend--backend)
6. [Running with Docker](#running-with-docker)
7. [Hosting / Deployment](#hosting--deployment)
8. [How to Add a New Mode](#how-to-add-a-new-mode)
9. [How to Swap in a Real ML Model](#how-to-swap-in-a-real-ml-model)
10. [Public Datasets](#public-datasets)
11. [Database Schema (Next Phase)](#database-schema-next-phase)
12. [API Reference](#api-reference)
13. [Known Limitations](#known-limitations)

---

## What It Does

FundusView is a POC retinal image viewer with two analysis modes:

### DR Screening
Analyzes fundus photographs for signs of Diabetic Retinopathy.

| Action | What it does |
|---|---|
| **Detect Lesions** | Scans pixels for microaneurysms (red circles), hard exudates (yellow diamonds), and hemorrhages (purple triangles). Returns counts and a DR severity grade (No DR → Severe NPDR). |
| **Vessel Density** | Estimates vessel coverage percentage using green-channel intensity thresholding. |
| **Risk Heatmap** | Overlays scripted warm-color zones showing predicted high-lesion-density areas. |

### Glaucoma Risk
Structural analysis for glaucoma risk screening.

| Action | What it does |
|---|---|
| **Segment Disc / Cup** | Detects the optic disc and optic cup boundaries, draws large ring overlays, computes the cup-to-disc ratio (CDR), and grades risk (Normal / Borderline / Elevated). |

### Interactive viewer features
- **Scroll** to zoom (up to 20×), **drag** to pan
- **4× magnifier lens** follows your cursor for detail inspection
- **Crosshair** with live image-space coordinates
- **Measure tool** — click two points to measure pixel distance
- **Checkbox toggles** per overlay type (show/hide individual marker classes)
- **Image gallery** — load multiple images, click thumbnails to switch, hover to remove

---

## Architecture Overview

```
Browser (React + Vite)
        │
        │  POST /api/analyze/{mode}/{action}
        │  multipart image upload → JSON response
        ▼
FastAPI Backend (Python)
        │
        ├── routes/analyze.py      — receives request, routes to module
        │
        ├── modules/dr.py          — DR analysis (PIL + numpy)
        └── modules/glaucoma.py    — Glaucoma analysis (PIL + numpy)

                ↑ swap these functions for real ML models

Nginx (production only)
  /        → serves React build (static files)
  /api/*   → proxies to FastAPI backend
```

**Fallback behaviour:** if the backend is unreachable, the frontend falls back to running the same analysis algorithms directly in the browser using the Canvas pixel API. The header shows a green dot ("API connected") or grey dot ("in-browser mode") so you always know which engine is active.

---

## Project Structure

```
fundusview_v2/
│
├── index.html                  ← Vite entry point
├── package.json
├── vite.config.js
├── Dockerfile                  ← Frontend container (Vite build → Nginx)
├── nginx.conf                  ← Routes / to frontend, /api/* to backend
├── docker-compose.yml          ← Starts frontend + backend together
│
├── src/
│   ├── App.jsx                 ← Root component, all cross-component state
│   ├── App.css                 ← Global reset, CSS variables, animations
│   ├── main.jsx                ← ReactDOM entry point
│   │
│   ├── api/
│   │   └── client.js           ← analyzeImage(), checkBackendHealth()
│   │
│   ├── canvas/
│   │   └── renderer.js         ← ALL drawing: image, markers, heatmap, magnifier
│   │
│   ├── modes/
│   │   ├── index.js            ← MODES registry — add new modes here
│   │   ├── dr.js               ← DR mode: config + in-browser analysis fn
│   │   └── glaucoma.js         ← Glaucoma mode: config + in-browser analysis fn
│   │
│   ├── components/
│   │   ├── ImageCanvas.jsx     ← Zoom/pan/hover/measure, renders via renderer.js
│   │   ├── ImageGallery.jsx    ← Thumbnail strip with add/remove
│   │   ├── ModeSelector.jsx    ← Mode tab strip
│   │   ├── OverlayKey.jsx      ← Legend with checkbox toggles
│   │   ├── ResultsPanel.jsx    ← Metrics display
│   │   └── Toolbar.jsx         ← Actions, tools, zoom controls
│   │
│   ├── constants/
│   │   └── markerStyles.js     ← (legacy — styles now embedded per mode)
│   │
│   └── utils/
│       ├── cluster.js          ← Merges nearby pixel hits into single markers
│       ├── transform.js        ← fitTransform() for initial zoom-to-fit
│       └── syntheticFundus.js  ← Generates demo fundus images (no file needed)
│
└── backend/
    ├── main.py                 ← FastAPI app, CORS config, router registration
    ├── requirements.txt
    ├── Dockerfile              ← Backend container (Python 3.11 + uvicorn)
    │
    ├── routes/
    │   └── analyze.py          ← POST /api/analyze/{mode_id}/{action_id}
    │
    └── modules/
        ├── dr.py               ← Python DR analysis (PIL + numpy)
        └── glaucoma.py         ← Python Glaucoma analysis (PIL + numpy)
```

---

## Running Locally — Frontend Only

No backend needed. Analysis runs in the browser.

**Requirements:** Node.js 18+

```bash
# 1. Install dependencies
cd fundusview_v2
npm install

# 2. Start the dev server
npm run dev

# 3. Open in browser
# http://localhost:5173
```

Click **Demo** in the image gallery sidebar to generate a synthetic fundus image, then click **Detect Lesions** or **Segment Disc / Cup**.

---

## Running Locally — Frontend + Backend

Runs the Python API server so analysis happens server-side.

**Requirements:** Node.js 18+, Python 3.10+

### Step 1 — Start the backend

```bash
cd fundusview_v2/backend

# Install Python dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn main:app --reload
```

The backend starts at `http://localhost:8000`.  
Test it is working: open `http://localhost:8000/api/health` in your browser — you should see `{"status":"ok"}`.

### Step 2 — Start the frontend

Open a second terminal:

```bash
cd fundusview_v2
npm install   # if not done already
npm run dev
```

Open `http://localhost:5173`. The header should show a **green dot** ("API connected"). If it shows grey, the backend is not running — analysis still works in-browser.

---

## Running with Docker

Runs the full stack (frontend + backend + nginx) in containers. No Node.js or Python install needed on the host.

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
cd fundusview_v2

# Build and start all containers
docker compose up --build

# Open in browser
# http://localhost
```

To stop:

```bash
docker compose down
```

### What docker compose starts

| Container | What it runs | Port |
|---|---|---|
| `frontend` | Nginx serving the React build + proxying `/api/*` to backend | 80 |
| `backend` | FastAPI / Uvicorn | 8000 (also exposed directly for testing) |

First build takes 2–5 minutes (downloads base images, installs npm + pip packages). Subsequent builds are fast due to Docker layer caching.

### Rebuilding after code changes

```bash
docker compose up --build
```

Or rebuild only one service:

```bash
docker compose build backend
docker compose up
```

---

## Hosting / Deployment

---

### Render (easiest, free tier available)

Render can host both the frontend and backend as separate services with zero server management.

**Backend (Web Service):**

1. Push your code to a GitHub repository
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo, set the root directory to `backend`
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy — Render gives you a URL like `https://fundusview-backend.onrender.com`

**Frontend (Static Site):**

1. Go to Render → **New Static Site**
2. Connect your repo
3. Set build command: `npm install && npm run build`
4. Set publish directory: `dist`
5. Add an environment variable: `VITE_API_URL` = `https://fundusview-backend.onrender.com/api`
6. Deploy — Render gives you a URL like `https://fundusview.onrender.com`

Update `src/api/client.js` if needed, or just set `VITE_API_URL` in the Render environment variables panel.

**Cost:** Free tier sleeps after 15 min inactivity (cold start ~30s). Paid plan (~$7/month) keeps it always on.

---

## How to Add a New Mode

1. Create `src/modes/yourmode.js`:

```js
function analyzeYourMode(imgEl, actionId) {
  if (actionId === 'clear') return { markers: [], heatmap: false, metrics: null }
  // your analysis logic here
  return { markers: [...], heatmap: false, metrics: {...} }
}

export const YOUR_MODE = {
  id: 'yourmode',
  name: 'Your Mode Name',
  subtitle: 'Description',
  accent: '#7F77DD',        // tab highlight colour
  actions: [
    { id: 'analyse', label: 'Run Analysis', primary: true },
    { id: 'clear',   label: 'Clear',        ghost: true   },
  ],
  analyze: analyzeYourMode,
  legendItems: [
    { type: 'finding1', color: '#E24B4A', shape: 'circle',  label: 'Finding 1' },
  ],
  resultFields: [
    { key: 'count',  label: 'Count' },
    { key: 'grade',  label: 'Grade', full: true },
    { key: 'risk',   label: 'Risk',  full: true, colorKey: 'riskColor' },
  ],
}
```

2. Register it in `src/modes/index.js`:

```js
import { YOUR_MODE } from './yourmode'
export const MODES = [ DR_MODE, GLAUCOMA_MODE, YOUR_MODE ]
```

3. Create the Python backend module `backend/modules/yourmode.py`:

```python
def analyze(image_bytes: bytes, action_id: str) -> dict:
    # your Python analysis here
    return { "markers": [...], "heatmap": False, "metrics": {...} }
```

4. Register it in `backend/routes/analyze.py`:

```python
MODE_MODULES = {
    "dr":       "modules.dr",
    "glaucoma": "modules.glaucoma",
    "yourmode": "modules.yourmode",   # add this line
}
```

That's it. No other files change.

---

## How to Swap in a Real ML Model

The application shell is designed so algorithms are isolated behind a single function call.

**Frontend (in-browser fallback):** replace the pixel-loop block in `src/modes/{mode}.js`. The `analyze(imgElement, actionId)` function signature must stay the same. Return the same `{ markers, heatmap, metrics }` shape.

**Backend (primary path):** replace the logic in `backend/modules/{mode}.py`. The `analyze(image_bytes, action_id)` function signature must stay the same.

Example — replacing the DR detection with a real model call:

```python
# backend/modules/dr.py

import httpx  # or torch, tensorflow, etc.

def analyze(image_bytes: bytes, action_id: str) -> dict:
    if action_id == "detect":
        # Call your model API, or load a local model
        result = my_model.predict(image_bytes)

        # Map model output to FundusView marker format
        markers = [
            {
                "x": int(det.x), "y": int(det.y),
                "type": det.class_name,
                "color": LESION_STYLES[det.class_name]["color"],
                "shape": LESION_STYLES[det.class_name]["shape"],
                "r": LESION_STYLES[det.class_name]["r"],
            }
            for det in result.detections
        ]
        return { "markers": markers, "heatmap": False, "metrics": result.metrics }
```

The frontend receives the same JSON structure either way. No UI code changes.

---

## Public Datasets

The following public datasets are suitable for testing and demonstration:

| Dataset | Modality | Use case | Link |
|---|---|---|---|
| **EyePACS / Kaggle DR** | Fundus | DR grading (grades 0–4) | [kaggle.com/c/diabetic-retinopathy-detection](https://kaggle.com/c/diabetic-retinopathy-detection) |
| **APTOS 2019** | Fundus | DR severity, high quality images | [kaggle.com/c/aptos2019-blindness-detection](https://kaggle.com/c/aptos2019-blindness-detection) |
| **DRIVE** | Fundus | Vessel segmentation ground truth | [drive.grand-challenge.org](https://drive.grand-challenge.org) |
| **RIM-ONE** | Fundus | Glaucoma / optic disc / CDR | [rimone.retinaimage.org](http://rimone.retinaimage.org) |
| **REFUGE** | Fundus | Optic disc/cup segmentation | [refuge.grand-challenge.org](https://refuge.grand-challenge.org) |

For a quick demo without downloading datasets, click the **Demo** button in the sidebar — it generates a synthetic fundus photograph procedurally.

---

## Database Schema (Next Phase)

PostgreSQL is included (commented out) in `docker-compose.yml`. When ready to persist image metadata and analysis results, uncomment the `db` service and create `backend/schema.sql`:

```sql
-- Images table
CREATE TABLE images (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    width       INT,
    height      INT,
    modality    TEXT  -- 'fundus', 'colour_fundus', etc.
);

-- Analysis results
CREATE TABLE analysis_results (
    id          SERIAL PRIMARY KEY,
    image_id    INT REFERENCES images(id) ON DELETE CASCADE,
    mode_id     TEXT NOT NULL,        -- 'dr', 'glaucoma'
    action_id   TEXT NOT NULL,        -- 'detect', 'segment', etc.
    markers     JSONB,                -- [{ x, y, type, ... }]
    metrics     JSONB,                -- { grade, risk, cdr, ... }
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Annotations (manual user markings)
CREATE TABLE annotations (
    id          SERIAL PRIMARY KEY,
    image_id    INT REFERENCES images(id) ON DELETE CASCADE,
    type        TEXT,                 -- 'point', 'rect', 'measure'
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Then add SQLAlchemy or asyncpg to `requirements.txt` and wire the results through the API routes.

---

## API Reference

### `GET /api/health`
Returns backend status.
```json
{ "status": "ok", "service": "fundusview-backend" }
```

### `GET /api/modes`
Returns available mode IDs.
```json
{ "modes": ["dr", "glaucoma"] }
```

### `POST /api/analyze/{mode_id}/{action_id}`
Accepts a multipart image upload. Returns analysis results.

**Parameters:**
- `mode_id` — `dr` or `glaucoma`
- `action_id` — depends on mode (see table below)

| mode_id | action_id | Description |
|---|---|---|
| `dr` | `detect` | Lesion detection |
| `dr` | `vessel_density` | Vessel coverage estimation |
| `dr` | `heatmap` | Risk zone overlay |
| `glaucoma` | `segment` | Disc/cup segmentation + CDR |

**Example request (curl):**
```bash
curl -X POST http://localhost:8000/api/analyze/dr/detect \
  -F "image=@fundus.jpg"
```

**Example response:**
```json
{
  "markers": [
    { "x": 142, "y": 208, "type": "micro",   "color": "#E24B4A", "shape": "circle",   "r": 5 },
    { "x": 301, "y": 175, "type": "exudate", "color": "#EF9F27", "shape": "diamond",  "r": 7 }
  ],
  "heatmap": false,
  "metrics": {
    "micro": 4,
    "exudate": 2,
    "hemo": 0,
    "grade": "Mild NPDR",
    "risk": "Moderate",
    "riskColor": "#BA7517"
  }
}
```

---

## Known Limitations

- **POC algorithms only** — pixel threshold heuristics are not validated for clinical accuracy. Results are for demonstration purposes.
- **No authentication** — the API has no auth layer. Do not expose publicly with real patient data.
- **No persistent storage** — images are held in browser memory only. Refreshing the page clears the gallery.
- **Glaucoma detection accuracy** — the disc/cup detection works well on the synthetic demo image and high-contrast fundus photos. Low-contrast or non-standard images may not detect correctly.
- **Large images** — analysis on images over 3000×3000px may be slow in the browser. The backend handles large images better.
