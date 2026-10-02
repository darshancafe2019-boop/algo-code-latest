import pytest
import time
from market_data_gateway.core.interfaces import (
    IMarketDataProvider,
    IExecutionProvider,
    NormalizedMarketEvent,
    ProviderStatus,
    MarketType
)
from market_data_gateway.core.symbol_master import UniversalSymbolMaster, CanonicalMasterRecord
from market_data_gateway.core.provider_registry import ProviderRegistry, ProviderTelemetry
from market_data_gateway.core.order_flow_engine import OrderFlowEngine
from market_data_gateway.core.data_quality import DataQualityEngine


def test_normalized_event_model():
    """Verify Canonical Normalized Market Event structure and fields."""
    evt = NormalizedMarketEvent(
        provider="UPSTOX",
        exchange="NSE",
        segment="NSE_FO",
        symbol="NIFTY26OCT26000CE",
        instrumentKey="NSE_FO|52410",
        instrumentType="OPTION",
        timestampExchange=int(time.time() * 1000),
        timestampReceived=int(time.time() * 1000),
        sequence=101,
        eventType="QUOTE",
        ltp=185.50,
        bid=185.40,
        ask=185.60,
        bidQty=1800,
        askQty=2400,
        volume=95000,
        openInterest=142000,
        strike=26000.0,
        expiry="2026-10-01",
        optionType="CE",
        iv=14.2,
        delta=0.52,
        gamma=0.0012,
        theta=-8.4,
        vega=12.1
    )
    d = evt.to_dict()
    assert d["provider"] == "UPSTOX"
    assert d["ltp"] == 185.50
    assert d["optionType"] == "CE"
    assert d["strike"] == 26000.0
    assert d["delta"] == 0.52


def test_symbol_master_mapping():
    """Test Canonical Symbol mapping to provider-specific keys."""
    master = UniversalSymbolMaster()
    
    # 1. Indian Index Symbol
    canon_nifty = master.resolve_to_canonical("NSE_INDEX|NIFTY 50", "UPSTOX")
    assert canon_nifty == "NIFTY:INDEX"

    # Upstox provider key resolution
    upstox_key = master.get_provider_key("NIFTY:INDEX", "UPSTOX")
    assert upstox_key == "NSE_INDEX|Nifty 50"

    # Dhan provider key resolution
    dhan_key = master.get_provider_key("NIFTY:INDEX", "DHAN")
    assert dhan_key == "13"

    # 2. Crypto Symbol
    canon_btc = master.resolve_to_canonical("BTCUSDT", "BINANCE")
    assert canon_btc == "BTC:USDT:SPOT"
    
    delta_sym = master.get_provider_key("BTC:USDT:SPOT", "DELTA")
    assert delta_sym == "BTCUSD"


def test_provider_registry_telemetry():
    """Test provider registration, tick recording, latency and status transitions."""
    registry = ProviderRegistry()
    registry.register_provider(
        provider_id="upstox_test",
        name="Upstox V3",
        market_types=["NSE_EQ", "NSE_FO"]
    )

    p = registry.get_provider("upstox_test")
    assert p is not None
    assert p.connection_state == "DISCONNECTED"

    # Update state to CONNECTED
    registry.update_connection_state("upstox_test", "CONNECTED", authenticated=True)
    assert p.connection_state == "CONNECTED"
    assert p.authenticated is True

    # Record ticks
    registry.record_tick("upstox_test", latency_ms=15.0)
    registry.record_tick("upstox_test", latency_ms=25.0)

    snap = registry.get_snapshot()
    assert snap["total_providers"] >= 1
    assert snap["providers"]["upstox_test"]["messages_received"] == 2
    assert snap["providers"]["upstox_test"]["latency_ms"] == 25.0


def test_order_flow_engine_imbalance():
    """Verify Level 2 Order Book Imbalance calculation: bidVol / (bidVol + askVol)."""
    engine = OrderFlowEngine()
    
    # 600 bid qty, 400 ask qty -> 60% buy ratio, 40% sell ratio
    bids = [{"price": 100.0, "quantity": 300}, {"price": 99.5, "quantity": 200}, {"price": 99.0, "quantity": 100}]
    asks = [{"price": 100.5, "quantity": 200}, {"price": 101.0, "quantity": 100}, {"price": 101.5, "quantity": 100}]
    
    metrics = engine.update_from_depth(
        symbol="TEST_SYM",
        provider="BINANCE",
        exchange="BINANCE",
        bids=bids,
        asks=asks,
        ltp=100.25
    )

    assert metrics.bid_volume == 600
    assert metrics.ask_volume == 400
    assert metrics.buy_imbalance_pct == 60.0
    assert metrics.sell_imbalance_pct == 40.0
    assert metrics.spread == 0.5
    assert metrics.largest_bid_qty == 300


def test_data_quality_engine():
    """Test Data Quality Engine detection of zero prices, abnormal spreads, and stale ticks."""
    dq = DataQualityEngine()

    # Normal tick
    t1 = NormalizedMarketEvent(
        provider="BINANCE",
        exchange="BINANCE",
        symbol="BTCUSDT",
        ltp=67400.0,
        bid=67399.0,
        ask=67401.0,
        timestampReceived=int(time.time() * 1000)
    )
    res1 = dq.validate_event(t1)
    assert res1["is_valid"] is True

    # Invalid Zero Price tick
    t_zero = NormalizedMarketEvent(
        provider="BINANCE",
        exchange="BINANCE",
        symbol="BTCUSDT",
        ltp=0.0,
        timestampReceived=int(time.time() * 1000)
    )
    res_zero = dq.validate_event(t_zero)
    assert res_zero["is_valid"] is False
    assert "ZERO_OR_NEGATIVE_PRICE" in res_zero["anomalies"]

    # Crossed Book (Bid > Ask)
    t_crossed = NormalizedMarketEvent(
        provider="BINANCE",
        exchange="BINANCE",
        symbol="BTCUSDT",
        ltp=67400.0,
        bid=67500.0,
        ask=67300.0,
        timestampReceived=int(time.time() * 1000)
    )
    res_crossed = dq.validate_event(t_crossed)
    assert "CROSSED_BOOK" in res_crossed["anomalies"]
