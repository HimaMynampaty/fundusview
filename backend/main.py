"""
FundusView Backend — FastAPI
Serves analysis endpoints that the React frontend calls.

Architecture:
  POST /api/analyze/{mode_id}/{action_id}
    ← multipart image upload
    → { markers: [...], metrics: {...} }

Each mode lives in backend/modules/{mode_id}.py and exposes a single
  analyze(image_bytes: bytes, action_id: str) -> dict
function. Swapping the algorithm means replacing only that function.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router

app = FastAPI(
    title="FundusView API",
    description="Retinal image analysis backend — POC pixel heuristics",
    version="0.1.0",
)

# Allow requests from the Vite dev server and the production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80", "http://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "fundusview-backend"}
