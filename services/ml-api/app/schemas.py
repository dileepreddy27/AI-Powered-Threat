from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LogEvent(BaseModel):
    event_time: datetime | None = None
    source_ip: str | None = None
    destination_ip: str | None = None
    method: str = "GET"
    path: str = "/"
    status_code: int = 200
    bytes_sent: int = 0
    user_agent: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class DetectRequest(BaseModel):
    events: list[LogEvent]
    model_name: str | None = None


class TrainRequest(BaseModel):
    events: list[LogEvent] | None = None
    model_names: list[str] | None = None


class ModelInfo(BaseModel):
    name: str
    fitted: bool
    details: dict[str, Any] = Field(default_factory=dict)

