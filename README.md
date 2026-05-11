# FundusView — Retinal Image Analysis Workstation

A browser-based proof-of-concept for retinal fundus photograph analysis. Supports two clinical screening modes with an interactive image viewer, overlay analysis, and quantitative outputs. All analysis runs directly in the browser — no backend or server required.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Project Structure](#project-structure)
3. [Running Locally](#running-locally)
4. [Deploying to Render](#deploying-to-render)
5. [How to Add a New Mode](#how-to-add-a-new-mode)
6. [How to Swap in a Real Algorithm](#how-to-swap-in-a-real-algorithm)
7. [Public Datasets](#public-datasets)
8. [Known Limitations](#known-limitations)

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
- **Scroll** to zoom (up to 20x), **drag** to pan
- **4x magnifier lens** follows your cursor for detail inspection
- **Crosshair** with live image-space coordinates
- **Measure tool** — click two points to measure pixel distance
- **Checkbox toggles** per overlay type (show/hide individual marker classes)
- **Image gallery** — load multiple images, click thumbnails to switch, hover to remove

---

## Project Structure

```
fundusview/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx                 ← Root component, all application state
    ├── App.css                 ← Global styles and CSS variables
    ├── main.jsx                ← Entry point
    ├── canvas/
    │   └── renderer.js         ← All drawing: image, markers, heatmap, magnifier
    ├── modes/
    │   ├── index.js            ← Modes registry — add new modes here
    │   ├── dr.js               ← DR Screening: actions + analysis logic
    │   └── glaucoma.js         ← Glaucoma Risk: actions + analysis logic
    ├── components/
    │   ├── ImageCanvas.jsx     ← Zoom/pan/hover/measure
    │   ├── ImageGallery.jsx    ← Thumbnail strip with add/remove
    │   ├── ModeSelector.jsx    ← Mode tab strip
    │   ├── OverlayKey.jsx      ← Legend with checkbox toggles
    │   ├── ResultsPanel.jsx    ← Metrics display
    │   └── Toolbar.jsx         ← Actions, tools, zoom controls
    └── utils/
        ├── cluster.js          ← Merges nearby pixel hits into single markers
        ├── transform.js        ← Fit-to-canvas zoom calculation
        └── syntheticFundus.js  ← Generates demo images (no file needed)
```

---

## Running Locally

**Requirements:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173`.

Click **Demo** in the sidebar to generate a synthetic fundus image, then try **Detect Lesions** or **Segment Disc / Cup**. To test with a real image click **Upload** and select any JPG or PNG fundus photograph.

To build for production:

```bash
npm run build
# Output goes into the dist/ folder
```

---

## Deploying to Render

Render hosts the built React app as a static site. Free tier is sufficient.

**Requirements:** Code pushed to a GitHub repository.

### Steps

1. Go to [render.com](https://render.com) and sign in
2. Click **New → Static Site**
3. Connect your GitHub repository
4. Fill in the settings:

| Field | Value |
|---|---|
| Root Directory | *(leave blank)* |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

5. Click **Deploy**

Render builds the project and gives you a live URL like `https://fundusview.onrender.com`. Every push to GitHub triggers an automatic redeploy.

The free static site plan on Render has no sleep behaviour — the site stays live 24/7 at no cost.

---

## How to Add a New Mode

1. Create `src/modes/yourmode.js`:

```js
function analyzeYourMode(imgEl, actionId) {
  if (actionId === 'clear') return { markers: [], heatmap: false, metrics: null }

  if (actionId === 'detect') {
    // imgEl is a loaded HTMLImageElement
    // Draw to an offscreen canvas to read pixel data
    const off = document.createElement('canvas')
    off.width = imgEl.naturalWidth
    off.height = imgEl.naturalHeight
    off.getContext('2d').drawImage(imgEl, 0, 0)
    const { data } = off.getContext('2d').getImageData(0, 0, off.width, off.height)

    // Your detection logic here...

    return {
      markers: [
        { x: 200, y: 300, type: 'finding1', color: '#E24B4A', shape: 'circle', r: 5 }
      ],
      heatmap: false,
      metrics: { count: 1, grade: 'Mild', risk: 'Low', riskColor: '#1D9E75' }
    }
  }

  return { markers: [], heatmap: false, metrics: null }
}

export const YOUR_MODE = {
  id: 'yourmode',
  name: 'Your Mode Name',
  subtitle: 'Brief description',
  accent: '#7F77DD',
  actions: [
    { id: 'detect', label: 'Run Analysis', primary: true },
    { id: 'clear',  label: 'Clear',        ghost: true   },
  ],
  analyze: analyzeYourMode,
  legendItems: [
    { type: 'finding1', color: '#E24B4A', shape: 'circle', label: 'Finding 1' },
  ],
  resultFields: [
    { key: 'count', label: 'Count'                                         },
    { key: 'grade', label: 'Grade',      full: true                        },
    { key: 'risk',  label: 'Risk level', full: true, colorKey: 'riskColor' },
  ],
}
```

2. Register it in `src/modes/index.js`:

```js
import { YOUR_MODE } from './yourmode'
export const MODES = [DR_MODE, GLAUCOMA_MODE, YOUR_MODE]
```

Nothing else changes. The tab, toolbar, overlay key, and results panel all update automatically from the mode config.

---

## How to Swap in a Real Algorithm

All analysis logic lives in a single `analyze(imgEl, actionId)` function in each mode file. The pixel heuristics can be replaced with any approach that returns the same shape:

```js
// Return shape that the UI expects
return {
  markers: [{ x, y, type, color, shape, r }],
  heatmap: false,
  metrics: { /* any key-value pairs matching your resultFields */ }
}
```

To call an external ML model API, replace the pixel-loop block with a `fetch()` call and map the response to the marker format above. The UI does not need to change.

---

## Public Datasets

| Dataset | Use case | Link |
|---|---|---|
| **EyePACS / Kaggle DR** | DR grading (grades 0–4) | [kaggle.com/c/diabetic-retinopathy-detection](https://kaggle.com/c/diabetic-retinopathy-detection) |
| **APTOS 2019** | DR severity, high quality images | [kaggle.com/c/aptos2019-blindness-detection](https://kaggle.com/c/aptos2019-blindness-detection) |
| **DRIVE** | Vessel segmentation ground truth | [drive.grand-challenge.org](https://drive.grand-challenge.org) |
| **RIM-ONE** | Glaucoma / optic disc / CDR | [rimone.retinaimage.org](http://rimone.retinaimage.org) |
| **REFUGE** | Optic disc/cup segmentation | [refuge.grand-challenge.org](https://refuge.grand-challenge.org) |

For a quick demo without downloading anything, use the **Demo** button in the sidebar.

---

## Known Limitations

- **POC algorithms only** — pixel threshold heuristics are not validated for clinical accuracy. Results are for demonstration purposes only.
- **No persistent storage** — images are held in browser memory. Refreshing the page clears the gallery.
- **Glaucoma detection** — works well on the synthetic demo image and high-contrast fundus photos. Low-contrast images may not detect the disc correctly.
- **Large images** — analysis on images over 3000x3000px may be slow as pixel scanning runs on the browser's main thread.
