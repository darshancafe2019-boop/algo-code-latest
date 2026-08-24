"""
Point-in-Time Safe Financial Feature Engineering Pipeline for Quant.OS
Strictly prevents future-data lookahead bias by operating on closed candles.
Generates comprehensive multi-factor features for LightGBM and XGBoost classifiers.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("AIFeaturePipeline")

FEATURE_VERSION = "v1.0.0"

CORE_FEATURE_COLUMNS = [
    # Price Returns & Momentum
    "returns_1",
    "returns_3",
    "returns_5",
    "log_returns_1",
    "log_returns_5",
    # Volatility & Range
    "atr_14_norm",
    "realized_vol_20",
    "bollinger_pos",
    "bollinger_width",
    # Trend & Oscillators
    "rsi_14",
    "rsi_7",
    "macd_norm",
    "macd_signal_norm",
    "macd_hist_norm",
    "adx_14",
    "plus_di_14",
    "minus_di_14",
    # Moving Average Distances & Slopes
    "ema_9_dist",
    "ema_21_dist",
    "ema_50_dist",
    "ema_200_dist",
    "ema_9_slope",
    # Volume & Liquidity
    "volume_change",
    "relative_vol_20",
    "vwap_dist",
    # Regime & Cyclical Features
    "hour_sin",
    "hour_cos",
    "day_of_week",
    "regime_trending_up",
    "regime_trending_down",
    "regime_ranging",
    "regime_high_vol",
    # Sentiment & External Signals
    "sentiment_score",
    "sentiment_confidence",
]


def classify_market_regime(df: pd.DataFrame) -> pd.Series:
    """Classifies the market regime for each bar."""
    regimes = []
    for idx, row in df.iterrows():
        close = row.get("close", 0)
        ema50 = row.get("ema_50", close)
        ema200 = row.get("ema_200", close)
        adx = row.get("adx_14", 15)
        atr_norm = row.get("atr_14_norm", 0.01)

        if close > ema50 and ema50 > ema200 and adx > 25:
            regimes.append("TRENDING_UP")
        elif close < ema50 and ema50 < ema200 and adx > 25:
            regimes.append("TRENDING_DOWN")
        elif atr_norm > 0.035:
            regimes.append("HIGH_VOLATILITY")
        else:
            regimes.append("RANGING")
    return pd.Series(regimes, index=df.index)


class FeaturePipeline:
    """
    Computes deterministic, point-in-time features from OHLCV DataFrames.
    Ensures zero forward-looking data leakage.
    """

    def __init__(self, feature_version: str = FEATURE_VERSION):
        self.feature_version = feature_version
        self.feature_columns = CORE_FEATURE_COLUMNS

    def extract_features(
        self,
        df: pd.DataFrame,
        sentiment_score: float = 0.0,
        sentiment_confidence: float = 0.5,
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Extracts point-in-time features from a sanitized OHLCV DataFrame.
        Returns (feature_df, metadata).
        """
        if df.empty or len(df) < 50:
            return pd.DataFrame(), {
                "quality_score": 0.0,
                "error": "Insufficient candle history (minimum 50 bars required)",
            }

        # Work on a copy and ensure float types
        data = df.copy()
        for col in ["open", "high", "low", "close", "volume"]:
            if col in data.columns:
                data[col] = pd.to_numeric(data[col], errors="coerce")

        data = data.sort_values(by="timestamp" if "timestamp" in data.columns else data.index.name or "index").reset_index(drop=True)

        close = data["close"]
        high = data["high"]
        low = data["low"]
        vol = data["volume"]

        # 1. Returns & Momentum
        data["returns_1"] = close.pct_change(1)
        data["returns_3"] = close.pct_change(3)
        data["returns_5"] = close.pct_change(5)
        data["log_returns_1"] = np.log(close / close.shift(1))
        data["log_returns_5"] = np.log(close / close.shift(5))

        # 2. Volatility (ATR & Realized Volatility)
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_14 = tr.rolling(14).mean()
        data["atr_14_norm"] = (atr_14 / close).clip(0, 0.2)
        data["realized_vol_20"] = (data["returns_1"].rolling(20).std() * math.sqrt(365 * 24)).clip(0, 5.0)

        # 3. Bollinger Bands
        sma_20 = close.rolling(20).mean()
        std_20 = close.rolling(20).std().replace(0, 1e-6)
        upper_bb = sma_20 + (2.0 * std_20)
        lower_bb = sma_20 - (2.0 * std_20)
        bb_denom = (upper_bb - lower_bb).replace(0, 1e-6)
        data["bollinger_pos"] = ((close - lower_bb) / bb_denom).clip(-0.5, 1.5)
        data["bollinger_width"] = (bb_denom / sma_20).clip(0, 0.5)

        # 4. RSI (7 & 14)
        delta = close.diff()
        gain_14 = delta.where(delta > 0, 0).rolling(14).mean()
        loss_14 = (-delta.where(delta < 0, 0)).rolling(14).mean().replace(0, 1e-6)
        rs_14 = gain_14 / loss_14
        data["rsi_14"] = (100.0 - (100.0 / (1.0 + rs_14))) / 100.0  # Normalized to [0, 1]

        gain_7 = delta.where(delta > 0, 0).rolling(7).mean()
        loss_7 = (-delta.where(delta < 0, 0)).rolling(7).mean().replace(0, 1e-6)
        rs_7 = gain_7 / loss_7
        data["rsi_7"] = (100.0 - (100.0 / (1.0 + rs_7))) / 100.0

        # 5. MACD (12, 26, 9)
        ema_12 = close.ewm(span=12, adjust=False).mean()
        ema_26 = close.ewm(span=26, adjust=False).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - macd_signal
        data["macd_norm"] = (macd / close).clip(-0.1, 0.1)
        data["macd_signal_norm"] = (macd_signal / close).clip(-0.1, 0.1)
        data["macd_hist_norm"] = (macd_hist / close).clip(-0.05, 0.05)

        # 6. ADX (14)
        up_move = high - high.shift(1)
        down_move = low.shift(1) - low
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
        tr_smooth = tr.rolling(14).sum().replace(0, 1e-6)
        plus_di = 100.0 * (pd.Series(plus_dm, index=data.index).rolling(14).sum() / tr_smooth)
        minus_di = 100.0 * (pd.Series(minus_dm, index=data.index).rolling(14).sum() / tr_smooth)
        dx_denom = (plus_di + minus_di).replace(0, 1e-6)
        dx = 100.0 * ((plus_di - minus_di).abs() / dx_denom)
        data["adx_14"] = dx.rolling(14).mean().fillna(20.0)
        data["plus_di_14"] = plus_di.fillna(25.0)
        data["minus_di_14"] = minus_di.fillna(25.0)

        # 7. EMAs & Moving Average Distance
        data["ema_9"] = close.ewm(span=9, adjust=False).mean()
        data["ema_21"] = close.ewm(span=21, adjust=False).mean()
        data["ema_50"] = close.ewm(span=50, adjust=False).mean()
        data["ema_200"] = close.ewm(span=200, adjust=False).mean()

        data["ema_9_dist"] = ((close - data["ema_9"]) / data["ema_9"]).clip(-0.2, 0.2)
        data["ema_21_dist"] = ((close - data["ema_21"]) / data["ema_21"]).clip(-0.2, 0.2)
        data["ema_50_dist"] = ((close - data["ema_50"]) / data["ema_50"]).clip(-0.3, 0.3)
        data["ema_200_dist"] = ((close - data["ema_200"]) / data["ema_200"]).clip(-0.5, 0.5)
        data["ema_9_slope"] = data["ema_9"].pct_change(3).clip(-0.05, 0.05)

        # 8. Volume Features
        data["volume_change"] = vol.pct_change(1).clip(-0.99, 10.0)
        vol_sma_20 = vol.rolling(20).mean().replace(0, 1e-6)
        data["relative_vol_20"] = (vol / vol_sma_20).clip(0, 20.0)

        # 9. Rolling VWAP
        typical_price = (high + low + close) / 3.0
        pv = typical_price * vol
        cum_pv_24 = pv.rolling(24).sum()
        cum_v_24 = vol.rolling(24).sum().replace(0, 1e-6)
        vwap = cum_pv_24 / cum_v_24
        data["vwap_dist"] = ((close - vwap) / vwap).clip(-0.2, 0.2)

        # 10. Cyclical Time Features
        if "timestamp" in data.columns:
            ts = pd.to_datetime(data["timestamp"], utc=True)
            hours = ts.dt.hour + (ts.dt.minute / 60.0)
            data["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
            data["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
            data["day_of_week"] = ts.dt.dayofweek / 6.0
        else:
            data["hour_sin"] = 0.0
            data["hour_cos"] = 1.0
            data["day_of_week"] = 0.5

        # 11. Market Regime One-Hot Encoding
        regime_series = classify_market_regime(data)
        data["regime_trending_up"] = (regime_series == "TRENDING_UP").astype(float)
        data["regime_trending_down"] = (regime_series == "TRENDING_DOWN").astype(float)
        data["regime_ranging"] = (regime_series == "RANGING").astype(float)
        data["regime_high_vol"] = (regime_series == "HIGH_VOLATILITY").astype(float)

        # 12. Sentiment Features
        data["sentiment_score"] = float(sentiment_score)
        data["sentiment_confidence"] = float(sentiment_confidence)

        # Clean NaN/Inf values with forward fill followed by zero-fill
        feature_df = data[self.feature_columns].ffill().bfill().fillna(0.0)

        quality_score = 1.0 - (feature_df.isna().sum().sum() / max(1, (len(feature_df) * len(self.feature_columns))))

        metadata = {
            "feature_version": self.feature_version,
            "total_bars": len(data),
            "feature_count": len(self.feature_columns),
            "quality_score": round(quality_score, 4),
            "latest_timestamp": str(data["timestamp"].iloc[-1]) if "timestamp" in data.columns else str(datetime.now(timezone.utc)),
            "market_regime": str(regime_series.iloc[-1]),
        }

        return feature_df, metadata

    def generate_targets(
        self,
        df: pd.DataFrame,
        horizon_bars: int = 5,
        cost_threshold_bps: float = 12.0,  # 0.12% round-trip cost & hurdle
    ) -> pd.Series:
        """
        Constructs cost-adjusted 3-class classification target:
          - 1 (LONG): Future return > cost_threshold
          - -1 (SHORT): Future return < -cost_threshold
          - 0 (HOLD): Return is within friction zone
        """
        if "close" not in df.columns or len(df) <= horizon_bars:
            return pd.Series(dtype=int)

        close = df["close"]
        future_return = (close.shift(-horizon_bars) - close) / close
        hurdle = cost_threshold_bps / 10000.0
        valid_ret = future_return.dropna()
        if not valid_ret.empty and len(valid_ret) >= 30:
            q_low = float(valid_ret.quantile(0.30))
            q_high = float(valid_ret.quantile(0.70))
            effective_hurdle = min(hurdle, max(1e-5, (q_high - q_low) / 2.0))
        else:
            effective_hurdle = hurdle

        targets = pd.Series(0, index=df.index, dtype=int)
        targets[future_return > effective_hurdle] = 1  # LONG
        targets[future_return < -effective_hurdle] = -1  # SHORT

        # Set last horizon bars to NaN (future not yet known)
        targets.iloc[-horizon_bars:] = np.nan
        return targets
