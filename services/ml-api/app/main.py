from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import DetectRequest, TrainRequest
from .services.model_registry import ModelRegistry

app = FastAPI(title=settings.api_name, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = ModelRegistry()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ml-api"}


@app.get("/models")
def list_models() -> dict[str, object]:
    return {"models": registry.list_models()}


@app.post("/train")
def train(request: TrainRequest) -> dict[str, object]:
    return registry.train(events=request.events, model_names=request.model_names)


@app.post("/detect")
def detect(request: DetectRequest) -> dict[str, object]:
    if not request.events:
        raise HTTPException(status_code=400, detail="events must not be empty")
    return registry.detect(events=request.events, model_name=request.model_name)

