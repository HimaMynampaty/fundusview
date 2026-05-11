"""
modules/glaucoma.py — Glaucoma Risk Assessment (OCT-equivalent)

Detects optic disc and cup boundaries, computes CDR.
Python mirror of src/modes/glaucoma.js.

To swap in a real algorithm: replace the segment_disc_cup() function.
"""

from io import BytesIO
import numpy as np
from PIL import Image


def _segment_disc_cup(arr: np.ndarray) -> dict:
    H, W = arr.shape[:2]
    R, G, B = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)

    step = max(3, min(H, W) // 150)

    # ── Optic disc: large warm bright region ──
    luma = R * 0.299 + G * 0.587 + B * 0.114
    disc_mask = (luma > 160) & (R > B) & (R > 140) & (G > 110)

    # Sample at step resolution
    disc_sub = disc_mask[::step, ::step]
    fy, fx   = np.where(disc_sub)
    if len(fx) < 5:
        return None, None, {"note": "Optic disc not detected — try a clearer fundus image"}

    disc_xs = fx * step
    disc_ys = fy * step
    disc_cx = int(disc_xs.mean())
    disc_cy = int(disc_ys.mean())
    disc_area = len(disc_xs) * step * step
    disc_r  = max(int(np.sqrt(disc_area / np.pi)), 15)

    # ── Optic cup: very bright pixels inside disc ──
    # Build mask within disc boundary
    y_grid, x_grid = np.mgrid[0:H, 0:W]
    within_disc = (x_grid - disc_cx)**2 + (y_grid - disc_cy)**2 < (disc_r * 1.1)**2
    cup_mask    = (R > 210) & (G > 185) & (B > 120) & within_disc

    cup_sub  = cup_mask[::step, ::step]
    cfy, cfx = np.where(cup_sub)
    if len(cfx) > 2:
        cup_area = len(cfx) * step * step
        cup_r    = max(int(np.sqrt(cup_area / np.pi)), int(disc_r * 0.2))
    else:
        cup_r = int(disc_r * 0.25)

    cdr = cup_r / disc_r if disc_r > 0 else 0
    g   = 2 if cdr > 0.65 else 1 if cdr > 0.5 else 0

    markers = [
        {"type":"disc","x":disc_cx,"y":disc_cy,"color":"#00D4AA","shape":"ring","r":disc_r},
        {"type":"cup", "x":disc_cx,"y":disc_cy,"color":"#EF9F27","shape":"ring","r":cup_r},
    ]
    metrics = {
        "disc_r":    disc_r,
        "cup_r":     cup_r,
        "cdr":       f"{cdr:.2f}",
        "grade":     ["Normal","Borderline","Elevated CDR"][g],
        "risk":      ["Low","Moderate","High"][g],
        "riskColor": ["#1D9E75","#BA7517","#A32D2D"][g],
    }
    return markers, metrics, None


def analyze(image_bytes: bytes, action_id: str) -> dict:
    if action_id == "clear":
        return {"markers": [], "heatmap": False, "metrics": None}

    if action_id == "segment":
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        arr = np.array(img)
        markers, metrics, err = _segment_disc_cup(arr)
        if err:
            return {"markers": [], "heatmap": False, "metrics": err}
        return {"markers": markers, "heatmap": False, "metrics": metrics}

    return {"markers": [], "heatmap": False, "metrics": None}
