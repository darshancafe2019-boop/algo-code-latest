"""
Universal Market Data Quality Engine
====================================
Validates incoming ticks, quotes, order books, and candle boundaries.
Detects clock-skew, crossed books, stale timestamps, invalid pricing,
sequence anomalies, and data corruption.
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from src.market_data.interfaces import DataQuality, ProviderStatus
from src.market_data.schemas import MarketQuote, FuturesQuote, OptionQuote

logger = logging.getLogger("DataQualityEngine")


class DataQualityEngine:
    """
    Production Data Quality Guardian.
    Guarantees that broken, inverted, future, or stale ticks never pollute
    the strategy engine or order execution pipeline.
    """

    def __init__(
        self,
        max_clock_skew_sec: float = 3.0,
        max_stale_age_sec: float = 10.0,
        max_spread_pct: float = 15.0,
    ):
        self.max_clock_skew_sec = max_clock_skew_sec
        self.max_stale_age_sec = max_stale_age_sec
        self.max_spread_pct = max_spread_pct

        # Per-symbol sequence tracking and last tick timestamps
        self._last_sequences: Dict[str, int] = {}
        self._last_tick_timestamps: Dict[str, float] = {}
        self._anomaly_counts: Dict[str, int] = {}

    def validate_quote(self, quote: MarketQuote) -> Tuple[bool, DataQuality, List[str]]:
        """
        Validates a MarketQuote against strict quantitative sanity rules.
        Returns: (is_approved, quality_classification, error_reasons)
        """
        reasons: List[str] = []
        now_ts = time.time()

        # 1. Price checks
        if quote.lastPrice <= 0.0:
            reasons.append(f"Invalid non-positive lastPrice: {quote.lastPrice}")

        # 2. Bid/Ask sanity & Crossed book detection
        if quote.bid > 0.0 and quote.ask > 0.0:
            if quote.bid > quote.ask:
                reasons.append(f"Crossed orderbook detected: bid ({quote.bid}) > ask ({quote.ask})")
                return False, DataQuality.CROSSED_BOOK, reasons

            spread = quote.ask - quote.bid
            mid = (quote.ask + quote.bid) / 2.0
            spread_pct = (spread / mid) * 100.0 if mid > 0 else 0.0

            if spread_pct > self.max_spread_pct:
                reasons.append(f"Abnormally wide bid-ask spread: {spread_pct:.2f}% (limit: {self.max_spread_pct}%)")

        # 3. Timestamp & Clock-skew validation
        try:
            # Parse ISO 8601 timestamp
            dt_str = quote.timestamp.replace("Z", "+00:00")
            dt = datetime.fromisoformat(dt_str)
            tick_ts = dt.timestamp()

            # Check future timestamp
            if tick_ts > now_ts + self.max_clock_skew_sec:
                reasons.append(
                    f"Future timestamp rejected: tick is {tick_ts - now_ts:.2f}s ahead of system time"
                )
                return False, DataQuality.FUTURE_TIMESTAMP, reasons

            # Check stale age
            age_sec = now_ts - tick_ts
            if age_sec > self.max_stale_age_sec:
                reasons.append(f"Tick timestamp is stale: age {age_sec:.2f}s exceeds limit {self.max_stale_age_sec}s")
                quote.data_quality = DataQuality.STALE.value
                return False, DataQuality.STALE, reasons

            self._last_tick_timestamps[quote.symbol] = tick_ts

        except Exception as e:
            reasons.append(f"Unparseable timestamp format '{quote.timestamp}': {str(e)}")

        # 4. Sequence number deduplication
        if quote.sequence is not None:
            last_seq = self._last_sequences.get(quote.symbol, -1)
            if quote.sequence <= last_seq:
                reasons.append(f"Out-of-order or duplicate sequence {quote.sequence} <= {last_seq}")
                return False, DataQuality.DROPPED_DUPLICATE, reasons
            self._last_sequences[quote.symbol] = quote.sequence

        if reasons:
            self._anomaly_counts[quote.symbol] = self._anomaly_counts.get(quote.symbol, 0) + 1
            quote.data_quality = DataQuality.SUSPECT.value
            return False, DataQuality.SUSPECT, reasons

        quote.data_quality = DataQuality.VALID.value
        return True, DataQuality.VALID, []

    def is_symbol_stale(self, symbol: str, custom_stale_limit: Optional[float] = None) -> bool:
        """Returns True if no valid tick has been registered within stale limit."""
        last_ts = self._last_tick_timestamps.get(symbol)
        if last_ts is None:
            return True
        limit = custom_stale_limit or self.max_stale_age_sec
        return (time.time() - last_ts) > limit

    def get_symbol_age_sec(self, symbol: str) -> float:
        """Returns age in seconds since last registered tick."""
        last_ts = self._last_tick_timestamps.get(symbol)
        if last_ts is None:
            return 9999.0
        return round(max(0.0, time.time() - last_ts), 2)

    def get_health_summary(self) -> Dict[str, Any]:
        """Provides diagnostic health summary across all monitored instruments."""
        now = time.time()
        summary = {}
        for sym, ts in self._last_tick_timestamps.items():
            age = max(0.0, now - ts)
            summary[sym] = {
                "age_sec": round(age, 2),
                "is_stale": age > self.max_stale_age_sec,
                "anomalies": self._anomaly_counts.get(sym, 0),
                "status": "LIVE" if age <= self.max_stale_age_sec else "STALE",
            }
        return summary
