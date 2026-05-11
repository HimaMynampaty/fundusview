"""
modules/dr.py — Diabetic Retinopathy analysis (SLO-equivalent)

Python mirror of the frontend src/modes/dr.js analysis logic.
Uses PIL + numpy instead of canvas pixel APIs.

To swap in a real ML model: replace the pixel_scan() function.
The analyze() function signature and return shape must stay the same.
"""

from io import BytesIO
import numpy as np
from PIL import Image


# ── Marker style constants ──────────────────────────────────────
LESION_STYLES = {
    "micro":   {"color": "#E24B4A", "shape": "circle",   "r": 5},
    "exudate": {"color": "#EF9F27", "shape": "diamond",  "r": 7},
    "hemo":    {"color": "#7F77DD", "shape": "triangle", "r": 8},
}


def _cluster(points: list[dict], dist: float) -> list[dict]:
    used = set()
    out  = []
    for i, a in enumerate(points):
        if i in used: continue
        cx, cy, n = a["x"], a["y"], 1
        used.add(i)
        for j, b in enumerate(points):
            if j in used: continue
            if ((a["x"]-b["x"])**2 + (a["y"]-b["y"])**2) < dist**2:
                cx += b["x"]; cy += b["y"]; n += 1; used.add(j)
        out.append({**a, "x": int(cx/n), "y": int(cy/n)})
    return out


def _detect_lesions(arr: np.ndarray) -> tuple[list[dict], dict]:
    H, W = arr.shape[:2]
    R, G, B = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)

    step = max(4, min(H, W) // 120)
    candidates = []

    ys = np.arange(step, H-step, step)
    xs = np.arange(step, W-step, step)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')

    Rsub = R[yy, xx]; Gsub = G[yy, xx]; Bsub = B[yy, xx]

    micro_m   = (Rsub>110)&(Gsub<68)&(Bsub<68)&(Rsub-Gsub>58)
    exudate_m = (Rsub>185)&(Gsub>162)&(Bsub<100)&(Rsub+Gsub-2*Bsub>195)
    hemo_m    = (Rsub>52)&(Rsub<118)&(Gsub<36)&(Bsub<36)&(Rsub-Gsub>26)

    for mask, t in [(micro_m,"micro"),(exudate_m,"exudate"),(hemo_m,"hemo")]:
        fy, fx = np.where(mask)
        for y, x in zip(fy*step+step, fx*step+step):
            candidates.append({"x": int(x), "y": int(y), "type": t})

    markers = _cluster(candidates, 15)

    for m in markers:
        m.update(LESION_STYLES[m["type"]])

    micro   = sum(1 for m in markers if m["type"]=="micro")
    exudate = sum(1 for m in markers if m["type"]=="exudate")
    hemo    = sum(1 for m in markers if m["type"]=="hemo")
    total   = micro + exudate + hemo
    g       = 3 if total>30 else 2 if total>14 else 1 if total>4 else 0

    metrics = {
        "micro": micro, "exudate": exudate, "hemo": hemo,
        "grade":     ["No DR","Mild NPDR","Moderate NPDR","Severe NPDR"][g],
        "risk":      ["Low","Moderate","High","Severe"][g],
        "riskColor": ["#1D9E75","#BA7517","#D85A30","#A32D2D"][g],
    }
    return markers, metrics


def _vessel_density(arr: np.ndarray) -> dict:
    H, W = arr.shape[:2]
    G = arr[:,:,1].astype(float)
    cx, cy = W/2, H/2
    R_fund = min(H, W) * 0.44

    y_grid, x_grid = np.mgrid[0:H, 0:W]
    fundus_mask = (x_grid - cx)**2 + (y_grid - cy)**2 < R_fund**2

    g_fund = G[fundus_mask]
    mean_g = g_fund.mean() if len(g_fund) else 0
    vessel_mask = (G < mean_g * 0.72) & fundus_mask

    fundus_px = int(fundus_mask.sum())
    vessel_px = int(vessel_mask.sum())
    density   = (vessel_px / max(fundus_px, 1)) * 100

    return {
        "vessel_density": f"{density:.1f}%",
        "vessel_pixels":  vessel_px,
        "fundus_pixels":  fundus_px,
        "note": "Estimated via green-channel intensity thresholding",
    }


def analyze(image_bytes: bytes, action_id: str) -> dict:
    """
    Entry point called by the router.
    Returns { markers: [...], heatmap: bool, metrics: {...} }
    """
    if action_id == "clear":
        return {"markers": [], "heatmap": False, "metrics": None}
    if action_id == "heatmap":
        return {"markers": [], "heatmap": True, "metrics": None}

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)

    if action_id == "detect":
        markers, metrics = _detect_lesions(arr)
        return {"markers": markers, "heatmap": False, "metrics": metrics}

    if action_id == "vessel_density":
        metrics = _vessel_density(arr)
        return {"markers": [], "heatmap": False, "metrics": metrics}

    return {"markers": [], "heatmap": False, "metrics": None}
