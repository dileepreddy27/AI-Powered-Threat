from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any

import numpy as np

from ..feature_engineering import (
    RequestRateTracker,
    events_to_feature_matrix,
    summarize_anomaly_types,
    synthetic_benign_events,
)
from ..models.autoencoder import AutoencoderModel
from ..models.base import BaseAnomalyModel
from ..models.baseline import IsolationForestModel, OneClassSVMModel
from ..schemas import LogEvent
from .scoring import build_reason, classify_attack, threat_score


@dataclass
class DetectionRow:
    source_ip: str
    path: str
    model_name: str
    anomaly_score: float
    threat_score: float
    severity: str
    is_anomaly: bool
    attack_type: str
    reason: str
    model_scores: dict[str, float]


class ModelRegistry:
    def __init__(self) -> None:
        self.models: dict[str, BaseAnomalyModel] = {
            "isolation_forest": IsolationForestModel(),
            "one_class_svm": OneClassSVMModel(),
            "autoencoder": AutoencoderModel(),
        }
        self.rate_tracker = RequestRateTracker()
        self._bootstrap()

    def _bootstrap(self) -> None:
        events = synthetic_benign_events()
        features, _ = events_to_feature_matrix(events=events, tracker=RequestRateTracker())
        for model in self.models.values():
            model.fit(features)

    def list_models(self) -> list[dict[str, Any]]:
        response: list[dict[str, Any]] = []
        for model_name, model in self.models.items():
            response.append(
                {
                    "name": model_name,
                    "fitted": model.fitted,
                    "details": model.info(),
                }
            )
        return response

    def train(self, events: list[LogEvent] | None = None, model_names: list[str] | None = None) -> dict[str, Any]:
        training_events = events if events and len(events) > 0 else synthetic_benign_events()
        features, metadata = events_to_feature_matrix(events=training_events, tracker=RequestRateTracker())

        selected_names = model_names if model_names else list(self.models.keys())
        trained: list[str] = []
        for name in selected_names:
            model = self.models.get(name)
            if model is None:
                continue
            model.fit(features)
            trained.append(name)

        return {
            "trained_models": trained,
            "training_rows": int(features.shape[0]),
            "feature_count": int(features.shape[1]),
            "profile_summary": summarize_anomaly_types(metadata),
        }

    def detect(self, events: list[LogEvent], model_name: str | None = None) -> dict[str, Any]:
        if not events:
            return {"detections": [], "summary": {"count": 0, "anomalies": 0, "average_threat_score": 0.0}}

        features, metadata = events_to_feature_matrix(events=events, tracker=self.rate_tracker)
        model_scores = self._collect_model_scores(features)

        selected_model = model_name or "isolation_forest"
        if selected_model not in model_scores:
            selected_model = "isolation_forest"

        rows: list[DetectionRow] = []
        for idx, event in enumerate(events):
            meta = metadata[idx]
            anomaly = float(model_scores[selected_model][idx])
            t_score, severity = threat_score(anomaly_score=anomaly, meta=meta)
            is_anomaly = anomaly >= 0.55 or t_score >= 60
            attack_type = classify_attack(
                path=event.path or "",
                has_sql=float(meta.get("has_sql_keyword", 0)),
                has_pattern=float(meta.get("has_attack_pattern", 0)),
                has_admin=float(meta.get("has_admin_path", 0)),
            )
            rows.append(
                DetectionRow(
                    source_ip=event.source_ip or "unknown",
                    path=event.path or "/",
                    model_name=selected_model,
                    anomaly_score=round(anomaly, 4),
                    threat_score=round(t_score, 2),
                    severity=severity,
                    is_anomaly=is_anomaly,
                    attack_type=attack_type,
                    reason=build_reason(meta=meta, anomaly_score=anomaly),
                    model_scores={name: round(float(scores[idx]), 4) for name, scores in model_scores.items()},
                )
            )

        anomalies = [row for row in rows if row.is_anomaly]
        average_score = mean([row.threat_score for row in rows]) if rows else 0.0
        return {
            "detections": [row.__dict__ for row in rows],
            "summary": {
                "count": len(rows),
                "anomalies": len(anomalies),
                "average_threat_score": round(float(average_score), 2),
                "selected_model": selected_model,
            },
            "model_comparison": {
                model: round(float(np.mean(scores)), 4) for model, scores in model_scores.items()
            },
        }

    def _collect_model_scores(self, features: np.ndarray) -> dict[str, np.ndarray]:
        scores: dict[str, np.ndarray] = {}
        for model_name, model in self.models.items():
            if not model.fitted:
                model.fit(features)
            scores[model_name] = model.score_samples(features)
        return scores
