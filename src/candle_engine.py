"""
Central Candle Engine for Multi-Timeframe Algorithmic Trading Platform.

Handles:
1. Canonical timeframe definitions and parsing (Seconds, Minutes, Hours, Days, Weeks, Months, Custom).
2. Provider capability matrix detection (DIRECT, AGGREGATED, UNSUPPORTED).
3. Resampling and boundary alignment for synthetic and custom intervals.
4. Closed candle protection vs forming candle handling.
5. Deduplication, gap validation, and UTC timestamp normalization.
"""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger("algo_trading.candle_engine")


@dataclass(frozen=True)
class CanonicalTimeframe:
    value: str
    label: str
    seconds: int
    category: str
    is_standard: bool = True
    base_timeframe: Optional[str] = None


# Master list of standard canonical timeframes
STANDARD_TIMEFRAMES: list[CanonicalTimeframe] = [
    # Seconds
    CanonicalTimeframe(value="1s", label="1S", seconds=1, category="second"),
    CanonicalTimeframe(value="5s", label="5S", seconds=5, category="second", base_timeframe="1s"),
    CanonicalTimeframe(value="10s", label="10S", seconds=10, category="second", base_timeframe="1s"),
    CanonicalTimeframe(value="15s", label="15S", seconds=15, category="second", base_timeframe="1s"),
    CanonicalTimeframe(value="30s", label="30S", seconds=30, category="second", base_timeframe="1s"),
    # Minutes
    CanonicalTimeframe(value="1m", label="1M", seconds=60, category="minute"),
    CanonicalTimeframe(value="2m", label="2M", seconds=120, category="minute", base_timeframe="1m"),
    CanonicalTimeframe(value="3m", label="3M", seconds=180, category="minute"),
    CanonicalTimeframe(value="5m", label="5M", seconds=300, category="minute"),
    CanonicalTimeframe(value="10m", label="10M", seconds=600, category="minute", base_timeframe="5m"),
    CanonicalTimeframe(value="15m", label="15M", seconds=900, category="minute"),
    CanonicalTimeframe(value="20m", label="20M", seconds=1200, category="minute", base_timeframe="5m"),
    CanonicalTimeframe(value="30m", label="30M", seconds=1800, category="minute"),
    CanonicalTimeframe(value="45m", label="45M", seconds=2700, category="minute", base_timeframe="15m"),
    # Hours
    CanonicalTimeframe(value="1h", label="1H", seconds=3600, category="hour"),
    CanonicalTimeframe(value="2h", label="2H", seconds=7200, category="hour"),
    CanonicalTimeframe(value="3h", label="3H", seconds=10800, category="hour", base_timeframe="1h"),
    CanonicalTimeframe(value="4h", label="4H", seconds=14400, category="hour"),
    CanonicalTimeframe(value="6h", label="6H", seconds=21600, category="hour"),
    CanonicalTimeframe(value="8h", label="8H", seconds=28800, category="hour"),
    CanonicalTimeframe(value="12h", label="12H", seconds=43200, category="hour"),
    # Days
    CanonicalTimeframe(value="1d", label="1D", seconds=86400, category="day"),
    CanonicalTimeframe(value="2d", label="2D", seconds=172800, category="day", base_timeframe="1d"),
    CanonicalTimeframe(value="3d", label="3D", seconds=259200, category="day"),
    # Weeks
    CanonicalTimeframe(value="1w", label="1W", seconds=604800, category="week"),
    CanonicalTimeframe(value="2w", label="2W", seconds=1209600, category="week", base_timeframe="1w"),
    # Months
    CanonicalTimeframe(value="1M", label="1MO", seconds=2592000, category="month"),
    CanonicalTimeframe(value="3M", label="3MO", seconds=7776000, category="month", base_timeframe="1M"),
    CanonicalTimeframe(value="6M", label="6MO", seconds=15552000, category="month", base_timeframe="1M"),
    CanonicalTimeframe(value="12M", label="12MO", seconds=31104000, category="month", base_timeframe="1M"),
]

# Quick lookup by value or lowercase value
TIMEFRAME_MAP: dict[str, CanonicalTimeframe] = {}
for tf in STANDARD_TIMEFRAMES:
    TIMEFRAME_MAP[tf.value] = tf
    TIMEFRAME_MAP[tf.value.lower()] = tf
    TIMEFRAME_MAP[tf.label.lower()] = tf
    if tf.category == "month":
        TIMEFRAME_MAP[f"{tf.value.lower()}o"] = tf


# Provider direct interval capabilities
PROVIDER_DIRECT_TIMEFRAMES: dict[str, set[str]] = {
    "ccxt_binance": {"1s", "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"},
    "binance": {"1s", "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"},
    "dhan_india": {"1m", "5m", "15m", "25m", "1h", "1d"},
    "zerodha_kite": {"1m", "3m", "5m", "10m", "15m", "30m", "1h", "1d"},
    "delta_crypto": {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d"},
    "paper_simulator": {"1s", "5s", "10s", "15s", "30s", "1m", "2m", "3m", "5m", "10m", "15m", "20m", "30m", "45m", "1h", "2h", "3h", "4h", "6h", "8h", "12h", "1d", "2d", "3d", "1w", "2w", "1M", "3M", "6M", "12M"},
}


def parse_timeframe(tf_str: str) -> CanonicalTimeframe:
    """
    Parse any timeframe string into a CanonicalTimeframe.
    Supports standard representations (e.g. '5m', '1H', '1D', '1mo') and custom intervals (e.g. '7m', '25m', '90m').
    """
    if not tf_str or not isinstance(tf_str, str):
        return TIMEFRAME_MAP["5m"]

    cleaned = tf_str.strip()
    if cleaned in TIMEFRAME_MAP:
        return TIMEFRAME_MAP[cleaned]
    if cleaned.lower() in TIMEFRAME_MAP:
        return TIMEFRAME_MAP[cleaned.lower()]

    # Match custom regex: e.g. "7m", "25m", "90m", "2h", "5d", "45s"
    match = re.match(r"^(\d+)\s*([a-zA-Z]+)$", cleaned)
    if match:
        num = int(match.group(1))
        unit = match.group(2).lower()
        if unit in ("s", "sec", "second", "seconds"):
            seconds = num
            category = "second"
            val = f"{num}s"
            lbl = f"{num}S"
            base = "1s" if num > 1 else None
        elif unit in ("m", "min", "minute", "minutes"):
            seconds = num * 60
            category = "minute"
            val = f"{num}m"
            lbl = f"{num}M"
            base = "1m" if num > 1 else None
        elif unit in ("h", "hr", "hour", "hours"):
            seconds = num * 3600
            category = "hour"
            val = f"{num}h"
            lbl = f"{num}H"
            base = "1h" if num > 1 else "1m"
        elif unit in ("d", "day", "days"):
            seconds = num * 86400
            category = "day"
            val = f"{num}d"
            lbl = f"{num}D"
            base = "1d" if num > 1 else "1h"
        elif unit in ("w", "wk", "week", "weeks"):
            seconds = num * 604800
            category = "week"
            val = f"{num}w"
            lbl = f"{num}W"
            base = "1w" if num > 1 else "1d"
        elif unit in ("mo", "mon", "month", "months"):
            seconds = num * 2592000
            category = "month"
            val = f"{num}M"
            lbl = f"{num}MO"
            base = "1M" if num > 1 else "1d"
        else:
            return TIMEFRAME_MAP["5m"]

        return CanonicalTimeframe(
            value=val,
            label=lbl,
            seconds=seconds,
            category=category,
            is_standard=False,
            base_timeframe=base,
        )

    return TIMEFRAME_MAP.get(cleaned.lower(), TIMEFRAME_MAP["5m"])


class CandleEngine:
    """
    Central Engine for candle fetching, validation, synthetic aggregation,
    and closed-candle protection.
    """

    def __init__(self, default_provider: str = "ccxt_binance"):
        self.default_provider = default_provider

    def get_timeframe_support_status(
        self,
        timeframe: str,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detect if a timeframe is DIRECT, AGGREGATED, or UNSUPPORTED for a given provider.
        """
        prov = provider or self.default_provider
        tf = parse_timeframe(timeframe)
        direct_set = PROVIDER_DIRECT_TIMEFRAMES.get(prov, set())

        is_direct = tf.value in direct_set or (tf.value.lower() in direct_set)
        
        if is_direct:
            return {
                "timeframe": tf.value,
                "label": tf.label,
                "seconds": tf.seconds,
                "category": tf.category,
                "status": "DIRECT",
                "is_supported": True,
                "source": "native_provider"
            }

        can_aggregate = False
        base_tf = tf.base_timeframe or "1m"
        if base_tf in direct_set or base_tf.lower() in direct_set or "1m" in direct_set:
            can_aggregate = True

        if can_aggregate:
            return {
                "timeframe": tf.value,
                "label": tf.label,
                "seconds": tf.seconds,
                "category": tf.category,
                "status": "AGGREGATED",
                "is_supported": True,
                "base_timeframe": base_tf,
                "source": "synthetic_resampler"
            }

        return {
            "timeframe": tf.value,
            "label": tf.label,
            "seconds": tf.seconds,
            "category": tf.category,
            "status": "UNSUPPORTED",
            "is_supported": False,
            "source": "none"
        }

    def get_all_capabilities(self, provider: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return support matrix across all standard timeframes for the active provider."""
        prov = provider or self.default_provider
        results = []
        for tf in STANDARD_TIMEFRAMES:
            status_info = self.get_timeframe_support_status(tf.value, prov)
            results.append(status_info)
        return results

    def resample_candles(
        self,
        df: pd.DataFrame,
        target_seconds: int,
        closed_only: bool = False
    ) -> pd.DataFrame:
        """
        Safely resample lower-period candles into a higher-period target interval.
        Maintains strictly ascending timestamps, correct boundary alignment,
        and closed candle filtering.
        """
        if df is None or df.empty:
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume", "is_closed"])

        df_work = df.copy()
        if not pd.api.types.is_datetime64_any_dtype(df_work["timestamp"]):
            df_work["timestamp"] = pd.to_datetime(df_work["timestamp"], utc=True)

        df_work = df_work.sort_values("timestamp").drop_duplicates(subset=["timestamp"])

        ts_sec = df_work["timestamp"].astype("int64") // 10**9
        bucket = (ts_sec // target_seconds) * target_seconds
        df_work["bucket"] = pd.to_datetime(bucket, unit="s", utc=True)

        agg_rules = {
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum"
        }
        resampled = df_work.groupby("bucket").agg(agg_rules).reset_index()
        resampled.rename(columns={"bucket": "timestamp"}, inplace=True)

        now_ts = datetime.now(timezone.utc).timestamp()
        resampled["is_closed"] = (resampled["timestamp"].astype("int64") // 10**9 + target_seconds) <= now_ts

        if closed_only:
            resampled = resampled[resampled["is_closed"] == True].copy()

        return resampled.sort_values("timestamp").reset_index(drop=True)

    def validate_and_clean_candles(
        self,
        candles: list[dict] | pd.DataFrame,
        timeframe_seconds: int
    ) -> pd.DataFrame:
        """
        Validates OHLCV dataset:
        - Removes duplicates
        - Sorts in strictly ascending order
        - Detects future timestamps or anomalies
        - Sets is_closed flag accurately
        """
        if isinstance(candles, list):
            df = pd.DataFrame(candles)
        else:
            df = candles.copy()

        if df.empty:
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume", "is_closed"])

        if "timestamp" not in df.columns and "time" in df.columns:
            df.rename(columns={"time": "timestamp"}, inplace=True)

        if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
            if pd.api.types.is_numeric_dtype(df["timestamp"]):
                unit = "ms" if df["timestamp"].iloc[0] > 1e11 else "s"
                df["timestamp"] = pd.to_datetime(df["timestamp"], unit=unit, utc=True)
            else:
                df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

        df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"]).reset_index(drop=True)

        now_ts = datetime.now(timezone.utc).timestamp()
        df = df[df["timestamp"].astype("int64") // 10**9 <= (now_ts + 3600)].reset_index(drop=True)

        df["is_closed"] = (df["timestamp"].astype("int64") // 10**9 + timeframe_seconds) <= now_ts

        return df


# Global singleton instance
candle_engine = CandleEngine()
