"""
Unit Tests for Quote Normalization & Currency Conversion
========================================================
Verifies:
- Decimal-safe calculation of % changes and spreads
- Share volume distinct from turnover
- USD and INR normalized turnover calculations
"""

import pytest
from market_data.stocks.normalization import StockQuoteNormalizer


def test_quote_normalization_precision():
    raw_inr = {
        "last_price": 2845.50,
        "open": 2820.0,
        "high": 2865.0,
        "low": 2820.0,
        "previous_close": 2810.0,
        "bid": 2845.0,
        "ask": 2845.50,
        "volume": 4500000.0,
    }

    norm = StockQuoteNormalizer.normalize_quote(
        raw=raw_inr,
        instrument_id="upstox:NSE:RELIANCE",
        symbol="RELIANCE",
        exchange="NSE",
        currency="INR",
        provider="upstox",
        avg_volume_30d=4200000.0
    )

    assert norm.symbol == "RELIANCE"
    assert norm.last_price == 2845.50
    assert norm.change_pct == 1.26 # ((2845.5 - 2810) / 2810) * 100
    assert norm.spread == 0.50
    assert norm.volume_shares == 4500000.0
    assert norm.relative_volume == 1.07 # 4.5M / 4.2M
    assert norm.turnover_inr is not None
    assert norm.turnover_usd is not None
    assert norm.turnover_usd > 0


def test_quote_normalization_us_stock():
    raw_usd = {
        "last_price": 228.50,
        "open": 226.0,
        "high": 230.0,
        "low": 225.5,
        "previous_close": 226.50,
        "volume": 48000000.0,
    }

    norm = StockQuoteNormalizer.normalize_quote(
        raw=raw_usd,
        instrument_id="nasdaq:NASDAQ:AAPL",
        symbol="AAPL",
        exchange="NASDAQ",
        currency="USD",
        provider="yahoo",
        avg_volume_30d=52000000.0
    )

    assert norm.symbol == "AAPL"
    assert norm.last_price == 228.50
    assert norm.currency == "USD"
    assert norm.change_pct == 0.88 # ((228.5 - 226.5) / 226.5) * 100
    assert norm.turnover_usd is not None
    assert norm.turnover_inr is not None
    assert norm.turnover_inr > norm.turnover_usd # In INR it's multiplied by exchange rate
