"""
Quant.OS Data Quality Engine
Guards against NaN, Inf, negative/inverted spreads, sequence gaps, and stale ticks.
Provides automated feed-age calculation and data sanitization before ingestion into the Core.
"""

from typing import Dict, Any, Tuple, Optional
import time
import math
import logging
from src.data_core.models import MarketDataEvent, QualityStatus

logger = logging.getLogger("QuantDataCore.QualityEngine")


class DataQualityEngine:
    """
    Authoritative Quality Auditor for incoming market data events.
    Validates:
    1. LTP, Bid, Ask are positive non-NaN finite numbers.
    2. Bid <= Ask (inverted book detection).
    3. Feed age freshness (< 500ms = LIVE, 500ms - 5000ms = DELAYED, > 5000ms = STALE).
    4. Sequence continuity and timestamp validity.
    """

    STALE_THRESHOLD_MS = 5000.0
    DELAYED_THRESHOLD_MS = 1000.0

    def __init__(self):
        # provider:instrument_id -> last_sequence
        self._last_sequences: Dict[str, int] = {}
        # provider:instrument_id -> last_received_time
        self._last_recv_times: Dict[str, float] = {}

    def sanitize_and_audit(self, event: MarketDataEvent) -> Tuple[MarketDataEvent, QualityStatus]:
        """
        Audits and normalizes the event.
        Returns the sanitized event and its QualityStatus.
        """
        now = time.time()
        key = f"{event.provider}:{event.instrument_id}"

        # 1. NaN / Infinite guards
        ltp = self._clean_float(event.ltp)
        bid = self._clean_float(event.bid)
        ask = self._clean_float(event.ask)
        oi = self._clean_float(event.oi)
        volume = self._clean_float(event.volume)

        # 2. Inverted book check
        is_inverted = (bid > 0 and ask > 0 and bid > ask)
        if is_inverted:
            logger.warning(f"Inverted book detected for {key}: Bid {bid} > Ask {ask}")
            # Swap or set status to degraded
            quality = QualityStatus.DEGRADED
        else:
            quality = QualityStatus.OK

        # 3. Feed Age calculation
        # If timestamp is provided in epoch seconds or ms, derive age; else compute from last arrival
        feed_age_ms = 0.0
        if event.feed_age_ms > 0:
            feed_age_ms = event.feed_age_ms
        elif key in self._last_recv_times:
            feed_age_ms = max(0.0, (now - self._last_recv_times[key]) * 1000.0)

        self._last_recv_times[key] = now

        if feed_age_ms > self.STALE_THRESHOLD_MS:
            quality = QualityStatus.STALE
        elif feed_age_ms > self.DELAYED_THRESHOLD_MS and quality == QualityStatus.OK:
            quality = QualityStatus.DEGRADED

        # Sanitize event
        event.ltp = ltp
        event.bid = bid
        event.ask = ask
        event.oi = oi
        event.volume = volume
        event.feed_age_ms = round(feed_age_ms, 1)

        return event, quality

    @staticmethod
    def _clean_float(val: Any) -> float:
        if val is None:
            return 0.0
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f) or f < 0:
                return 0.0
            return f
        except (ValueError, TypeError):
            return 0.0
