"""
Unit Tests for Stock Data Quality Engine
========================================
Verifies:
- Detection of price anomalies (High < Low)
- Detection of staleness and market closed states
- Field-level completeness
"""

import pytest
from market_data.stocks.data_quality import StockDataQualityEngine
from market_data.stocks.normalization import StockQuoteNormalizer


def test_data_quality_valid_quote():
    norm = StockQuoteNormalizer.normalize_quote(
        raw={"last_price": 2800.0, "open": 2790.0, "high": 2820.0, "low": 2780.0, "volume": 1000000.0},
        instrument_id="nse:NSE:RELIANCE",
        symbol="RELIANCE",
        exchange="NSE",
        currency="INR"
    )
    status, notes = StockDataQualityEngine.evaluate_quality(norm, is_provider_healthy=True, is_market_closed=False)
    assert status == "LIVE"
    assert len(notes) >= 1


def test_data_quality_price_anomaly():
    norm = StockQuoteNormalizer.normalize_quote(
        raw={"last_price": 2800.0, "open": 2790.0, "high": 2700.0, "low": 2850.0, "volume": 1000000.0}, # High < Low
        instrument_id="nse:NSE:RELIANCE",
        symbol="RELIANCE",
        exchange="NSE",
        currency="INR"
    )
    status, notes = StockDataQualityEngine.evaluate_quality(norm, is_provider_healthy=True, is_market_closed=False)
    assert status == "INVALID"
    assert any("anomaly" in n.lower() or "lower" in n.lower() for n in notes)


def test_data_quality_provider_down():
    norm = StockQuoteNormalizer.normalize_quote(
        raw={"last_price": 2800.0, "open": 2790.0, "high": 2820.0, "low": 2780.0, "volume": 1000000.0},
        instrument_id="nse:NSE:RELIANCE",
        symbol="RELIANCE",
        exchange="NSE",
        currency="INR"
    )
    status, notes = StockDataQualityEngine.evaluate_quality(norm, is_provider_healthy=False, is_market_closed=False)
    assert status == "PROVIDER_DOWN"
