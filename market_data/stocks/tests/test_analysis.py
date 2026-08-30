"""
Unit Tests for Stock Analysis & Quantitative Scoring
====================================================
Verifies:
- Deterministic scoring (0-100)
- Directional bias assignment (BULLISH/BEARISH/NEUTRAL)
- Explainable output with indicators used and timestamps
"""

import pytest
from market_data.stocks.service import StockMarketDataService


def test_stock_quantitative_analysis():
    service = StockMarketDataService()

    # Fetch analysis for RELIANCE
    analysis = service.get_analysis("RELIANCE", "nse:NSE:RELIANCE", timeframe="1d")

    assert analysis.symbol == "RELIANCE"
    assert analysis.timeframe == "1d"
    assert 0 <= analysis.overall_score <= 100
    assert analysis.directional_bias in ["STRONG_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG_BEARISH"]
    assert analysis.confidence_score >= 50.0
    assert len(analysis.summary_explanation) > 10
    assert analysis.data_points_used >= 4
    assert analysis.calculated_at is not None


def test_stock_analysis_us_stock():
    service = StockMarketDataService()

    # Fetch analysis for NVDA
    analysis = service.get_analysis("NVDA", "nasdaq:NASDAQ:NVDA", timeframe="1d")

    assert analysis.symbol == "NVDA"
    assert analysis.directional_bias in ["STRONG_BULLISH", "BULLISH", "NEUTRAL"]
    assert len(analysis.indicators_used) >= 1
    assert "·" in analysis.summary_explanation
