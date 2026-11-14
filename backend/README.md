# ForestGuard API

FastAPI service for YOLO fire/smoke inference and persistent incident records.

## Run locally

From the repository root:

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Open http://localhost:8000/docs. Health: http://localhost:8000/health.

Set `MODEL_PATH` to the trained YOLO checkpoint. Default path is `ml/runs/detect/forestguard/weights/best.pt`. If the checkpoint is missing, health reports the reason and image inference returns HTTP 503 rather than inventing a prediction.

## Endpoints

- `GET /health` — API and model status.
- `POST /api/detect` — multipart image file plus optional confidence threshold.
- `GET /api/incidents` — list incidents.
- `POST /api/incidents` — create incident.
- `PATCH /api/incidents/{id}/status` — update human-review status.

SQLite database is created locally at `backend/forestguard.db` unless `DATABASE_PATH` is set.

## Deploy

Build the Docker image from `backend/` and deploy it to a Python/Docker host. Keep the model checkpoint outside Git if large; mount or download it from private object storage at deploy time and set `MODEL_PATH`. Configure `ALLOWED_ORIGINS` to the exact frontend origin instead of `*` for production.

Do not deploy with real emergency-response claims. Add authentication, rate limits, audit logging, monitoring, secure storage and an authorised human review process before handling real public reports.
