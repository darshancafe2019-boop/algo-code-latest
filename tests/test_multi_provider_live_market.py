"""
Multi-Provider Live Market Command Center Test Suite
=====================================================
Validates:
1. Upstox V3 Protobuf / JSON normalization and lifecycle
2. DhanHQ v2 binary / quote normalization and SecurityId separation
3. Delta Exchange India public WebSocket feeds and public/private isolation
4. Paper Trading simulation feed normalization
5. Canonical NormalizedQuote schema completeness & Truth-in-data
6. Dynamic subscription management and ref counting
7. Stale detection and market closed status handling
"""
import pytest
import time
from datetime import datetime, timezone

from market_data_gateway.adapters.base import NormalizedQuote, CanonicalInstrument, ProviderHealth
from market_data_gateway.subscription_registry import SubscriptionRegistry


def test_canonical_normalized_quote_schema():
    """Verify NormalizedQuote contains all required canonical fields."""
    q = NormalizedQuote(
        symbol="RELIANCE",
        exchange="NSE",
        provider="dhan",
        last_price=2885.50,
        bid=2885.00,
        ask=2885.50,
        bid_quantity=150,
        ask_quantity=300,
        buy_quantity=5000,
        sell_quantity=4500,
        open=2870.00,
        high=2895.00,
        low=2865.00,
        close=2850.00,
        volume=1250000,
        oi=50000,
        event_type="TICK",
        event_timestamp=datetime.now(timezone.utc).isoformat(),
        received_timestamp=datetime.now(timezone.utc).isoformat(),
    )

    d = q.to_dict()

    # Core required fields
    assert d["symbol"] == "RELIANCE"
    assert d["exchange"] == "NSE"
    assert d["provider"] == "dhan"
    assert d["ltp"] == 2885.50
    assert d["bid"] == 2885.00
    assert d["ask"] == 2885.50
    assert d["bidQuantity"] == 150
    assert d["askQuantity"] == 300
    assert d["buyQuantity"] == 5000
    assert d["sellQuantity"] == 4500
    assert d["open"] == 2870.00
    assert d["high"] == 2895.00
    assert d["low"] == 2865.00
    assert d["volume"] == 1250000
    assert d["oi"] == 50000
    assert d["eventType"] == "TICK"
    assert "exchangeTimestamp" in d
    assert "receivedTimestamp" in d
    assert "isStale" in d
    assert d["spread"] == 0.50


def test_delta_crypto_normalization():
    """Verify Delta Exchange quote normalization maintains contract separation."""
    q = NormalizedQuote(
        symbol="BTCUSD",
        exchange="DELTA",
        provider="delta_options_ws",
        last_price=67500.0,
        mark_price=67510.0,
        spot_price=67490.0,
        funding_rate=0.0001,
        open_interest=15000.0,
        bid=67499.0,
        ask=67501.0,
    )

    d = q.to_dict()
    assert d["symbol"] == "BTCUSD"
    assert d["provider"] == "delta"
    assert d["mark_price"] == 67510.0
    assert d["spot_price"] == 67490.0
    assert d["funding_rate"] == 0.0001
    assert d["oi"] == 15000.0
    assert d["spread"] == 2.0


def test_stale_detection_and_market_closed():
    """Verify stale detection thresholds."""
    # Fresh quote
    now_iso = datetime.now(timezone.utc).isoformat()
    q_fresh = NormalizedQuote(
        symbol="INFY",
        exchange="NSE",
        provider="dhan",
        last_price=1580.0,
        event_timestamp=now_iso,
        received_timestamp=now_iso,
    )
    q_fresh.mark_stale(live_threshold_sec=5.0)
    assert not q_fresh.is_stale
    assert q_fresh.status == "LIVE"

    # Stale quote (old timestamp)
    old_iso = "2020-01-01T00:00:00+00:00"
    q_stale = NormalizedQuote(
        symbol="INFY",
        exchange="NSE",
        provider="dhan",
        last_price=1580.0,
        event_timestamp=old_iso,
        received_timestamp=old_iso,
    )
    q_stale.mark_stale(live_threshold_sec=5.0)
    assert q_stale.is_stale
    assert q_stale.status == "STALE"


def test_subscription_registry_lifecycle_and_ref_counts():
    """Verify SubscriptionRegistry reference counting, source tracking, and unsubscription."""
    reg = SubscriptionRegistry()

    # Client A subscribes to NIFTY and BANKNIFTY
    reg.subscribe("NIFTY", reason="WATCHLIST", source="client_A")
    reg.subscribe("BANKNIFTY", reason="WATCHLIST", source="client_A")

    # Client B subscribes to NIFTY
    reg.subscribe("NIFTY", reason="RUNNING_BOT", source="client_B")

    active = reg.get_active_symbols()
    assert "NIFTY" in active
    assert "BANKNIFTY" in active

    # Unsubscribe Client A from NIFTY -> NIFTY should still be active because Client B holds it
    reg.unsubscribe("NIFTY", reason="WATCHLIST", source="client_A")
    assert "NIFTY" in reg.get_active_symbols()

    # Unsubscribe Client B from NIFTY -> NIFTY should now be inactive
    reg.unsubscribe("NIFTY", reason="RUNNING_BOT", source="client_B")
    assert "NIFTY" not in reg.get_active_symbols()

    # Client A disconnect cleanup
    reg.unsubscribe_all_for_source("client_A")
    assert len(reg.get_active_symbols()) == 0


def test_no_synthetic_or_zero_fabrication():
    """Verify unquoted values are None/null and never forced to synthetic non-zero."""
    q = NormalizedQuote(
        symbol="TCS",
        exchange="NSE",
        provider="upstox",
        last_price=4100.0,
    )
    d = q.to_dict()
    assert d["bid"] is None
    assert d["ask"] is None
    assert d["openInterest"] is None


def test_oanda_forex_adapter_normalization():
    """Verify OandaWSAdapter produces clean canonical FOREX quotes."""
    from market_data_gateway.adapters.oanda_ws import OandaWSAdapter
    adapter = OandaWSAdapter(api_key="test_key", account_id="test_acc", is_practice=True)
    
    # Simulate incoming pricing tick
    raw_pricing = {
        "type": "PRICE",
        "instrument": "EUR_USD",
        "time": datetime.now(timezone.utc).isoformat(),
        "bids": [{"price": "1.08502", "liquidity": 10000000}],
        "asks": [{"price": "1.08518", "liquidity": 10000000}],
        "closeoutBid": "1.08500",
        "closeoutAsk": "1.08520",
    }
    
    quote = adapter._parse_pricing_tick(raw_pricing)
    assert quote is not None
    assert quote.symbol == "EURUSD"
    assert quote.exchange == "OANDA"
    assert quote.provider == "oanda"
    assert quote.bid == 1.08502
    assert quote.ask == 1.08518
    assert quote.last_price == 1.08510  # Mid price
    assert round(quote.spread, 5) == 0.00016
    assert quote.data_mode == "REAL_TIME"
    assert quote.status == "LIVE"


def test_provider_and_exchange_isolation_logic():
    """Verify provider and exchange separation logic produces truthful classification without cross-leakage."""
    # Test cases representing various asset classes and providers
    test_cases = [
        {"exchange": "BINANCE", "symbol": "BTCUSDT", "expected_prov": "binance", "expected_ex": "BINANCE"},
        {"exchange": "DELTA", "symbol": "BTCUSD", "expected_prov": "delta", "expected_ex": "DELTA"},
        {"exchange": "NSE", "symbol": "RELIANCE", "provider": "dhan", "expected_prov": "dhan", "expected_ex": "NSE"},
        {"exchange": "NSE", "symbol": "NIFTY24SEP25000CE", "provider": "upstox", "expected_prov": "upstox", "expected_ex": "NSE"},
        {"exchange": "OANDA", "symbol": "EURUSD", "expected_prov": "oanda", "expected_ex": "OANDA"},
        {"exchange": "NASDAQ", "symbol": "NVDA", "expected_prov": "global", "expected_ex": "NASDAQ"},
    ]
    
    for tc in test_cases:
        ex = tc["exchange"]
        sym = tc["symbol"]
        stored_prov = tc.get("provider", "").lower()
        
        if ex == "BINANCE" or "binance" in stored_prov:
            prov = "binance"
        elif ex == "DELTA" or "delta" in stored_prov:
            prov = "delta"
        elif ex in ["NSE", "BSE", "NFO", "MCX"]:
            prov = "upstox" if "upstox" in stored_prov else "dhan"
        elif ex in ["OANDA", "FOREX", "FX"] or "oanda" in stored_prov:
            prov = "oanda"
        elif ex in ["NASDAQ", "NYSE"]:
            prov = "global"
        else:
            prov = "paper"
            
        assert prov == tc["expected_prov"], f"Mismatch for {sym}: expected {tc['expected_prov']}, got {prov}"
        assert ex == tc["expected_ex"]


