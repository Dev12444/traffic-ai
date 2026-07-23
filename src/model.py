"""
CNN-GRU congestion forecaster (Days 6-8).

A compact hybrid model:

    input  (B, lookback, n_features)
      -> transpose to (B, n_features, lookback)
      -> 1D temporal Conv (local traffic dynamics) + ReLU
      -> transpose back to (B, lookback, cnn_channels)
      -> GRU (temporal memory) -> last hidden state
      -> shared feature vector, split into two heads:
           * regression head    -> future TOTAL vehicle count  (>= 0 via softplus)
           * classification head -> congestion logits (free/moderate/congested)

The classification head's softmax max-probability is what the API reports as
`confidence`; the regression head gives `predicted_count`. Training this jointly
(multi-task) is more stable than regression alone and gives a calibrated-ish
confidence for free.
"""
from __future__ import annotations

import torch
import torch.nn as nn

from .config import ModelConfig


class CNNGRUForecaster(nn.Module):
    def __init__(self, cfg: ModelConfig | None = None) -> None:
        super().__init__()
        self.cfg = cfg or ModelConfig()
        c = self.cfg

        self.conv = nn.Sequential(
            nn.Conv1d(c.n_features, c.cnn_channels, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(c.cnn_channels),
        )
        self.gru = nn.GRU(
            input_size=c.cnn_channels,
            hidden_size=c.gru_hidden,
            num_layers=c.gru_layers,
            batch_first=True,
            dropout=c.dropout if c.gru_layers > 1 else 0.0,
        )
        self.dropout = nn.Dropout(c.dropout)
        self.reg_head = nn.Sequential(
            nn.Linear(c.gru_hidden, c.gru_hidden // 2),
            nn.ReLU(),
            nn.Linear(c.gru_hidden // 2, 1),
            nn.Softplus(),  # guarantees a non-negative predicted count
        )
        self.cls_head = nn.Sequential(
            nn.Linear(c.gru_hidden, c.gru_hidden // 2),
            nn.ReLU(),
            nn.Linear(c.gru_hidden // 2, c.n_classes),
        )

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        # x: (B, lookback, n_features)
        z = x.transpose(1, 2)              # (B, n_features, lookback)
        z = self.conv(z)                   # (B, cnn_channels, lookback)
        z = z.transpose(1, 2)              # (B, lookback, cnn_channels)
        out, _ = self.gru(z)               # (B, lookback, gru_hidden)
        h = self.dropout(out[:, -1, :])    # last timestep hidden state
        count = self.reg_head(h).squeeze(-1)   # (B,)  >= 0
        logits = self.cls_head(h)              # (B, n_classes)
        return count, logits


def build_model(cfg: ModelConfig | None = None) -> CNNGRUForecaster:
    return CNNGRUForecaster(cfg)
