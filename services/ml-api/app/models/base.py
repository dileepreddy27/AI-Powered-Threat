from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import numpy as np


class BaseAnomalyModel(ABC):
    def __init__(self, name: str) -> None:
        self.name = name
        self.fitted = False

    @abstractmethod
    def fit(self, features: np.ndarray) -> None:
        ...

    @abstractmethod
    def score_samples(self, features: np.ndarray) -> np.ndarray:
        ...

    def info(self) -> dict[str, Any]:
        return {"fitted": self.fitted}

