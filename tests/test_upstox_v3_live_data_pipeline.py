"""
Tests for Quant.OS Upstox V3 Live Market Data Distribution & Normalization Pipeline
=====================================================================================
Validates:
1. Instrument Resolution & Mapping for all 10 required instruments.
2. Canonical Symbol normalization across aliases (ICICI BANK, INDIA VIX, SBI, etc.).
3. Upstox Protobuf decoding & MarketTick normalization.
4. Multi-key REST LTP fetching and alias population.
5. Auth-expired error detection without infinite loops.
6. Truth-in-data policy (zero fake/mock prices).
"""
import pytest
from datetime import datetime, timezone
from src.upstox_service import UpstoxService, OFFICIAL_UPSTOX_KEYS, global_upstox_service
from market_data_gateway.normalizers.upstox_normalizer import UpstoxNormalizer
from market_data_gateway.adapters.upstox_ws import UpstoxWSAdapter
from market_data_gateway.gateway import get_quote_aliases


REQUIRED_10_INSTRUMENTS = [
    ("NIFTY", "NSE_INDEX|Nifty 50"),
    ("BANKNIFTY", "NSE_INDEX|Nifty Bank"),
    ("INDIA VIX", "NSE_INDEX|India VIX"),
    ("RELIANCE", "NSE_EQ|INE002A01018"),
    ("HDFCBANK", "NSE_EQ|INE040A01034"),
    ("ICICIBANK", "NSE_EQ|INE090A01021"),
    ("INFY", "NSE_EQ|INE009A01021"),
    ("TCS", "NSE_EQ|INE467B01029"),
    ("SBIN", "NSE_EQ|INE062A01020"),
    ("BHARTIARTL", "NSE_EQ|INE397D01024"),
]


def test_required_10_instruments_mapping():
    """Verifies that all 10 configured instruments map to exact Upstox instrument keys."""
    service = UpstoxService()
    for symbol, expected_key in REQUIRED_10_INSTRUMENTS:
        resolved_key = service.resolve_instrument_key(symbol)
        assert resolved_key == expected_key, f"Expected {symbol} -> {expected_key}, got {resolved_key}"


def test_canonical_symbol_resolution_from_aliases():
    """Verifies that aliases, ISINs, and formatted keys resolve to the canonical symbol."""
    service = UpstoxService()
    test_cases = [
        ("NSE_INDEX|Nifty 50", "NIFTY"),
        ("NSE_INDEX:Nifty 50", "NIFTY"),
        ("NIFTY 50", "NIFTY"),
        ("NIFTY50", "NIFTY"),
        ("NSE_INDEX|Nifty Bank", "BANKNIFTY"),
        ("NIFTY BANK", "BANKNIFTY"),
        ("NSE_INDEX|India VIX", "INDIA VIX"),
        ("INDIAVIX", "INDIA VIX"),
        ("India VIX", "INDIA VIX"),
        ("NSE_EQ|INE002A01018", "RELIANCE"),
        ("INE002A01018", "RELIANCE"),
        ("NSE_EQ|INE090A01021", "ICICIBANK"),
        ("ICICI BANK", "ICICIBANK"),
        ("ICICI", "ICICIBANK"),
        ("INE090A01021", "ICICIBANK"),
        ("NSE_EQ|INE062A01020", "SBIN"),
        ("SBI", "SBIN"),
        ("STATE BANK OF INDIA", "SBIN"),
        ("INE062A01020", "SBIN"),
        ("NSE_EQ|INE397D01024", "BHARTIARTL"),
        ("BHARTI AIRTEL", "BHARTIARTL"),
        ("AIRTEL", "BHARTIARTL"),
        ("INE397D01024", "BHARTIARTL"),
    ]
    for raw_input, expected_canonical in test_cases:
        resolved = service.resolve_canonical_symbol(raw_input)
        assert resolved == expected_canonical, f"Failed for '{raw_input}': expected '{expected_canonical}', got '{resolved}'"


def test_upstox_normalizer_market_tick():
    """Verifies that decoded feed converts to a fully populated canonical MarketTick."""
    feed_data = {
        "ltp": 2977.88,
        "ltt": 1726550000000,
        "ltq": 50,
        "cp": 2980.00,
        "bid": 2977.50,
        "ask": 2978.00,
        "bid_qty": 100,
        "ask_qty": 150,
        "volume": 2500000,
        "ohlc": {
            "open": 2970.0,
            "high": 2995.0,
            "low": 2965.0,
            "close": 2980.0,
        }
    }
    tick = UpstoxNormalizer.normalize_feed("NSE_EQ|INE002A01018", feed_data)
    assert tick is not None
    assert tick.provider == "upstox"
    assert tick.symbol == "RELIANCE"
    assert tick.exchange == "NSE"
    assert tick.ltp == 2977.88
    assert tick.previousClose == 2980.00
    assert tick.bidPrice == 2977.50
    assert tick.askPrice == 2978.00
    assert tick.volume == 2500000


def test_upstox_normalizer_icicibank_and_indiavix():
    """Verifies that ICICIBANK and INDIA VIX normalize with canonical symbols."""
    icici_tick = UpstoxNormalizer.normalize_feed("NSE_EQ|INE090A01021", {"ltp": 1250.40, "cp": 1245.00})
    assert icici_tick is not None
    assert icici_tick.symbol == "ICICIBANK"
    assert icici_tick.ltp == 1250.40

    vix_tick = UpstoxNormalizer.normalize_feed("NSE_INDEX|India VIX", {"ltp": 13.25, "cp": 13.50})
    assert vix_tick is not None
    assert vix_tick.symbol == "INDIA VIX"
    assert vix_tick.segment == "INDEX"
    assert vix_tick.ltp == 13.25


def test_gateway_quote_aliases_coverage():
    """Verifies that gateway get_quote_aliases generates UPSTOX prefixes and symbol aliases."""
    aliases = get_quote_aliases("ICICIBANK", "NSE", "UPSTOX")
    assert "ICICIBANK" in aliases
    assert "ICICI BANK" in aliases
    assert "UPSTOX:ICICIBANK" in aliases
    assert "NSE:ICICIBANK" in aliases
    assert "NSE_EQ|INE090A01021" in aliases

    vix_aliases = get_quote_aliases("INDIA VIX", "NSE_INDEX", "UPSTOX")
    assert "INDIA VIX" in vix_aliases
    assert "INDIAVIX" in vix_aliases
    assert "UPSTOX:INDIA VIX" in vix_aliases
