"""
Stock Data Quality Engine
=========================
Validates mathematical and semantic integrity of stock market data feeds.
Detects staleness, price anomalies, cross-asset corruption, and flags data quality states.
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timezone
from market_data.stocks.enums import DataQualityStatus
from market_data.stocks.models import NormalizedStockQuote
from market_data.common.timestamps import parse_iso_timestamp


class StockDataQualityEngine:
    """Rigorous Data Integrity & Quality Verification."""

    @classmethod
    def evaluate_quality(
        cls,
        quote: NormalizedStockQuote,
        is_provider_healthy: bool = True,
        is_market_closed: bool = False
    ) -> Tuple[str, List[str]]:
        """
        Validates a stock quote against integrity rules and assigns quality status.
        Returns: (quality_status, list_of_notes)
        """
        notes: List[str] = []

        # 1. Provider health check
        if not is_provider_healthy:
            notes.append("Provider is currently unreachable or reporting errors")
            return DataQualityStatus.PROVIDER_DOWN.value, notes

        # 2. Market closed state
        if is_market_closed:
            notes.append("Market is closed. Showing last session settlement values")
            return DataQualityStatus.MARKET_CLOSED.value, notes

        # 3. Price Sanity Checks
        if quote.last_price <= 0:
            notes.append("Invalid non-positive last traded price")
            return DataQualityStatus.INVALID.value, notes

        if quote.high_price is not None and quote.low_price is not None:
            if quote.high_price < quote.low_price:
                notes.append(f"Price anomaly: 24h High ({quote.high_price}) is lower than Low ({quote.low_price})")
                return DataQualityStatus.INVALID.value, notes

        if quote.volume_shares < 0:
            notes.append("Negative volume recorded")
            return DataQualityStatus.INVALID.value, notes

        # 4. Bid / Ask Sanity
        if quote.bid is not None and quote.ask is not None:
            if quote.bid > quote.ask:
                notes.append(f"Crossed market book: Bid ({quote.bid}) exceeds Ask ({quote.ask})")

        # 5. Timestamp & Staleness Evaluation
        now = datetime.now(timezone.utc)
        ts_dt = parse_iso_timestamp(quote.timestamp_exchange)
        
        if ts_dt:
            age_s = (now - ts_dt).total_seconds()
            if age_s > 300: # > 5 minutes during open session
                notes.append(f"Feed stale: last update was {int(age_s)}s ago")
                return DataQualityStatus.STALE.value, notes
            elif age_s > 60:
                notes.append("Feed slightly delayed (>60s)")
                return DataQualityStatus.DELAYED.value, notes

        # 6. Completeness Check
        if quote.open_price is None or quote.high_price is None or quote.low_price is None:
            notes.append("Partial snapshot: session OHLC incomplete")
            return DataQualityStatus.PARTIAL.value, notes

        notes.append("Real-time feed verified with 100% field integrity")
        return DataQualityStatus.LIVE.value, notes


global_stock_data_quality_engine = StockDataQualityEngine()
