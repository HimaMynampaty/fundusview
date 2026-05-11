"""
routes/analyze.py
Single endpoint: POST /api/analyze/{mode_id}/{action_id}
Accepts a multipart image upload, routes to the correct module, returns JSON.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from importlib import import_module

router = APIRouter()

# Registry maps mode_id → Python module path
# To add a new mode: create backend/modules/{mode_id}.py and add it here
MODE_MODULES = {
    "dr":       "modules.dr",
    "glaucoma": "modules.glaucoma",
}


@router.post("/analyze/{mode_id}/{action_id}")
async def analyze(mode_id: str, action_id: str, image: UploadFile = File(...)):
    """
    Accepts a fundus image as a multipart file upload.
    Returns JSON with { markers, metrics } matching the frontend's expected shape.
    """
    if mode_id not in MODE_MODULES:
        raise HTTPException(status_code=404, detail=f"Unknown mode: {mode_id}")

    image_bytes = await image.read()

    try:
        module = import_module(MODE_MODULES[mode_id])
        result = module.analyze(image_bytes, action_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result


@router.get("/modes")
def list_modes():
    """Returns available mode IDs so the frontend can check what the backend supports."""
    return {"modes": list(MODE_MODULES.keys())}
