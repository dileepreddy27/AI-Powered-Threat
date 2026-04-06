from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

from .base import BaseAnomalyModel


def _normalize(values: np.ndarray) -> np.ndarray:
    if len(values) == 0:
        return values
    low = float(np.min(values))
    high = float(np.max(values))
    span = high - low
    if span < 1e-8:
        return np.zeros_like(values, dtype=np.float32)
    return ((values - low) / span).astype(np.float32)


class IsolationForestModel(BaseAnomalyModel):
    def __init__(self, contamination: float = 0.08) -> None:
        super().__init__(name="isolation_forest")
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )

    def fit(self, features: np.ndarray) -> None:
        scaled = self.scaler.fit_transform(features)
        self.model.fit(scaled)
        self.fitted = True

    def score_samples(self, features: np.ndarray) -> np.ndarray:
        scaled = self.scaler.transform(features)
        normality = self.model.score_samples(scaled)
        anomaly = -normality
        return _normalize(anomaly)


class OneClassSVMModel(BaseAnomalyModel):
    def __init__(self, nu: float = 0.08) -> None:
        super().__init__(name="one_class_svm")
        self.scaler = StandardScaler()
        self.model = OneClassSVM(kernel="rbf", gamma="scale", nu=nu)

    def fit(self, features: np.ndarray) -> None:
        scaled = self.scaler.fit_transform(features)
        self.model.fit(scaled)
        self.fitted = True

    def score_samples(self, features: np.ndarray) -> np.ndarray:
        scaled = self.scaler.transform(features)
        margin = self.model.decision_function(scaled)
        anomaly = -margin
        return _normalize(anomaly)

