"""
Unit Tests for Stock Discovery & Taxonomy
=========================================
Verifies:
- Official discovery of Indian, US, and Global equities
- Pure equity validation (rejects options, futures, crypto spot)
- Canonical ID formatting
"""

import pytest
from market_data.stocks.discovery_engine import StockDiscoveryEngine
from market_data.stocks.taxonomy import StockTaxonomy
from market_data.stocks.instrument_master import StockInstrumentMaster
from market_data.common.canonical_ids import make_canonical_id, parse_canonical_id


def test_stock_taxonomy_validation():
    # Valid equity
    valid_stock = {"asset_class": "EQUITY", "instrument_type": "EQUITY", "symbol": "RELIANCE", "exchange": "NSE"}
    assert StockTaxonomy.is_valid_stock(valid_stock) is True

    # Valid US Stock
    valid_us = {"asset_class": "EQUITY", "instrument_type": "EQUITY", "symbol": "AAPL", "exchange": "NASDAQ"}
    assert StockTaxonomy.is_valid_stock(valid_us) is True

    # Invalid: Option contract
    option_item = {"asset_class": "OPTIONS", "instrument_type": "OPTION", "symbol": "NIFTY24DEC25000CE", "exchange": "NSE"}
    assert StockTaxonomy.is_valid_stock(option_item) is False

    # Invalid: Futures contract
    futures_item = {"asset_class": "FUTURES", "instrument_type": "FUTURE", "symbol": "BTC-PERP", "exchange": "BINANCE"}
    assert StockTaxonomy.is_valid_stock(futures_item) is False

    # Invalid: Spot Crypto
    crypto_spot = {"asset_class": "CRYPTO", "instrument_type": "SPOT", "symbol": "PEPE/USDT", "exchange": "BINANCE"}
    assert StockTaxonomy.is_valid_stock(crypto_spot) is False


def test_canonical_id_generation_and_parsing():
    cid_str = make_canonical_id("upstox", "NSE", "INE002A01018")
    assert cid_str == "upstox:NSE:INE002A01018"

    parsed = parse_canonical_id(cid_str)
    assert parsed is not None
    assert parsed.provider == "upstox"
    assert parsed.exchange == "NSE"
    assert parsed.instrument_key == "INE002A01018"


def test_discovery_engine_discovers_stocks():
    engine = StockDiscoveryEngine()
    stocks = engine.discover_all_stocks()
    assert len(stocks) >= 20

    symbols = [s.symbol for s in stocks]
    assert "RELIANCE" in symbols
    assert "TCS" in symbols
    assert "AAPL" in symbols
    assert "NVDA" in symbols

    # Assert zero options or crypto properties
    for s in stocks:
        assert s.instrument_type in ["EQUITY", "ETF", "ADR"]
        assert s.exchange in ["NSE", "BSE", "NASDAQ", "NYSE", "AMEX"]
        assert s.currency in ["INR", "USD"]
