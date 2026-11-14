from __future__ import annotations

import io
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError

APP_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DATABASE_PATH", str(APP_DIR.parent / "forestguard.db")))
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(APP_DIR.parent.parent / "ml/runs/detect/forestguard/weights/best.pt")))
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", "12582912"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MODEL = None
MODEL_ERROR = None

app = FastAPI(
    title="ForestGuard API",
    version="1.0.0",
    description="Forest fire and smoke detection research prototype. Predictions require human verification.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                incident_type TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                description TEXT DEFAULT '',
                observed_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                priority TEXT NOT NULL DEFAULT 'Unreviewed',
                created_at TEXT NOT NULL
            )
        """)


@app.on_event("startup")
def startup():
    global MODEL, MODEL_ERROR
    init_db()
    if MODEL_PATH.exists():
        try:
            from ultralytics import YOLO
            MODEL = YOLO(str(MODEL_PATH))
            MODEL_ERROR = None
        except Exception as exc:
            MODEL_ERROR = f"Could not load model: {exc}"
    else:
        MODEL_ERROR = f"Trained model weights not found at {MODEL_PATH}. Train the model and set MODEL_PATH."


@app.get("/")
def root():
    return {"name": "ForestGuard API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "model_path": str(MODEL_PATH),
        "model_message": MODEL_ERROR,
        "database": "sqlite",
    }


@app.post("/api/detect")
async def detect(file: UploadFile = File(...), confidence: float = Form(0.25)):
    if MODEL is None:
        raise HTTPException(status_code=503, detail=MODEL_ERROR or "Model is not loaded.")
    if not 0.05 <= confidence <= 0.95:
        raise HTTPException(status_code=422, detail="Confidence must be between 0.05 and 0.95.")
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/bmp"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, WEBP or BMP image.")
    content = await file.read()
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is empty or exceeds the 12 MB limit.")
    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image.verify()
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")

    try:
        results = MODEL.predict(source=image, conf=confidence, imgsz=640, verbose=False)
        result = results[0]
        names = result.names
        detections = []
        for box in result.boxes:
            cls_id = int(box.cls.item())
            xyxy = [round(float(v), 2) for v in box.xyxy[0].tolist()]
            detections.append({
                "class_id": cls_id,
                "label": str(names.get(cls_id, cls_id)),
                "confidence": round(float(box.conf.item()), 4),
                "box_xyxy": xyxy,
            })
        detections.sort(key=lambda x: x["confidence"], reverse=True)
        labels = {d["label"].lower() for d in detections}
        fire = any("fire" in x or "flame" in x for x in labels)
        smoke = any("smoke" in x for x in labels)
        status = "Fire detected" if fire else "Smoke detected" if smoke else "No fire/smoke objects detected"
        return {
            "prediction_id": str(uuid.uuid4()),
            "filename": file.filename,
            "image_width": image.width,
            "image_height": image.height,
            "status": status,
            "fire_detected": fire,
            "smoke_detected": smoke,
            "detection_count": len(detections),
            "detections": detections,
            "model": "ForestGuard YOLO",
            "confidence_threshold": confidence,
            "warning": "Research prototype only. A negative prediction does not prove an area is safe. Verify all results with trained personnel and official sources.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")


class IncidentIn(BaseModel):
    incident_type: str = Field(min_length=2, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    description: str = Field(default="", max_length=2000)
    observed_at: Optional[str] = None


class StatusIn(BaseModel):
    status: str


@app.get("/api/incidents")
def list_incidents():
    with db() as conn:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/incidents", status_code=201)
def create_incident(item: IncidentIn):
    if (item.latitude is None) != (item.longitude is None):
        raise HTTPException(status_code=422, detail="Provide both latitude and longitude, or neither.")
    incident_id = "FG-" + uuid.uuid4().hex[:10].upper()
    now = datetime.now(timezone.utc).isoformat()
    observed = item.observed_at or now
    with db() as conn:
        conn.execute(
            """INSERT INTO incidents
            (id, incident_type, latitude, longitude, description, observed_at, status, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Open', 'Unreviewed', ?)""",
            (incident_id, item.incident_type, item.latitude, item.longitude, item.description, observed, now),
        )
    return {"id": incident_id, **item.model_dump(), "status": "Open", "priority": "Unreviewed", "created_at": now}


@app.patch("/api/incidents/{incident_id}/status")
def update_status(incident_id: str, item: StatusIn):
    if item.status not in {"Open", "Under review", "Verified", "False alarm"}:
        raise HTTPException(status_code=422, detail="Invalid incident status.")
    with db() as conn:
        cur = conn.execute("UPDATE incidents SET status=? WHERE id=?", (item.status, incident_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found.")
        row = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    return dict(row)
