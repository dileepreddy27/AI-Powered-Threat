from __future__ import annotations

import numpy as np
import torch
from sklearn.preprocessing import StandardScaler
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

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


class _AutoencoderNet(nn.Module):
    def __init__(self, in_features: int) -> None:
        super().__init__()
        hidden = max(8, in_features // 2)
        bottleneck = max(4, in_features // 4)
        self.encoder = nn.Sequential(
            nn.Linear(in_features, hidden),
            nn.ReLU(),
            nn.Linear(hidden, bottleneck),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(bottleneck, hidden),
            nn.ReLU(),
            nn.Linear(hidden, in_features),
        )

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        latent = self.encoder(inputs)
        return self.decoder(latent)


class AutoencoderModel(BaseAnomalyModel):
    def __init__(self, epochs: int = 12, batch_size: int = 32, lr: float = 1e-3) -> None:
        super().__init__(name="autoencoder")
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        self.scaler = StandardScaler()
        self.device = torch.device("cpu")
        self.net: _AutoencoderNet | None = None

    def fit(self, features: np.ndarray) -> None:
        scaled = self.scaler.fit_transform(features).astype(np.float32)
        n_features = scaled.shape[1]
        self.net = _AutoencoderNet(in_features=n_features).to(self.device)

        dataset = TensorDataset(torch.from_numpy(scaled))
        loader = DataLoader(dataset, batch_size=min(self.batch_size, len(dataset)), shuffle=True)
        optimizer = torch.optim.Adam(self.net.parameters(), lr=self.lr)
        criterion = nn.MSELoss()

        self.net.train()
        for _ in range(self.epochs):
            for (batch,) in loader:
                batch = batch.to(self.device)
                optimizer.zero_grad(set_to_none=True)
                output = self.net(batch)
                loss = criterion(output, batch)
                loss.backward()
                optimizer.step()

        self.fitted = True

    def score_samples(self, features: np.ndarray) -> np.ndarray:
        if self.net is None:
            raise RuntimeError("Autoencoder model is not initialized.")

        scaled = self.scaler.transform(features).astype(np.float32)
        tensor = torch.from_numpy(scaled).to(self.device)
        self.net.eval()
        with torch.no_grad():
            output = self.net(tensor)
            errors = torch.mean((output - tensor) ** 2, dim=1).cpu().numpy()
        return _normalize(errors)

