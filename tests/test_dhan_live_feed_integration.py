"""
Dhan Live Market Data Feed & Trade Preparation Test Suite
=========================================================
Tests:
1. DhanService registry & instrument resolution
2. DhanWSAdapter initialization, health check, and binary packet decoding
3. Market Data Gateway adapter registration & Failover chain priority
4. Dashboard Dhan API endpoints (/api/dhan/status, /api/dhan/instruments)
"""
import struct
import pytest
from src.dhan_service import DhanService, OFFICIAL_DHAN_KEYS
from market_data_gateway.adapters.dhan_ws import DhanWSAdapter
from market_data_gateway.gateway import MarketDataGateway
from market_data_gateway.failover_manager import FAILOVER_CHAINS
from market_data_gateway.adapters.base import NormalizedQuote


def test_dhan_service_instrument_resolution():
    ds = DhanService(client_id="test_client_id", access_token="test_token")
    assert len(OFFICIAL_DHAN_KEYS) >= 20

    # Test Index resolution
    nifty = ds.resolve_symbol("NIFTY")
    assert nifty is not None
    assert nifty["security_id"] == "13"
    assert nifty["exchange_segment"] == "IDX_I"

    banknifty = ds.resolve_symbol("BANKNIFTY")
    assert banknifty is not None
    assert banknifty["security_id"] == "25"

    # Test Equities resolution
    reliance = ds.resolve_symbol("RELIANCE")
    assert reliance is not None
    assert reliance["security_id"] == "2885"

    tcs = ds.resolve_symbol("TCS")
    assert tcs is not None
    assert tcs["security_id"] == "11536"


def test_dhan_ws_adapter_initialization():
    adapter = DhanWSAdapter()
    assert adapter.provider_id == "dhan_ws"
    assert adapter.provider_name == "Dhan HQ Live Market Feed"
    assert adapter.get_status() in ("DISCONNECTED", "NOT_CONFIGURED", "CONNECTED", "MARKET_CLOSED")


def test_dhan_ws_binary_ticker_decoding():
    adapter = DhanWSAdapter()
    emitted_quotes = []
    adapter.set_quote_callback(lambda q: emitted_quotes.append(q))

    # Binary Frame: Header (8 bytes) + Ticker Payload (8 bytes) = 16 bytes
    # Header: resp_code=2 (uint8), msg_len=16 (uint16), exch_seg=0 (uint8), sec_id=2885 (uint32)
    # Payload: ltp=2950.50 (float32), ltt=1725600000 (uint32)
    header = struct.pack("<BHBI", 2, 16, 0, 2885)
    payload = struct.pack("<fI", 2950.50, 1725600000)
    frame = header + payload

    adapter._handle_binary_frame(frame)

    assert len(emitted_quotes) == 1
    quote = emitted_quotes[0]
    assert isinstance(quote, NormalizedQuote)
    assert quote.symbol == "RELIANCE"
    assert quote.last_price == 2950.50
    assert quote.provider == "dhan_ws"
    assert quote.data_mode == "REAL_TIME"


def test_dhan_ws_binary_quote_decoding():
    adapter = DhanWSAdapter()
    emitted_quotes = []
    adapter.set_quote_callback(lambda q: emitted_quotes.append(q))

    # Binary Frame: Header (8 bytes) + Quote Payload (42 bytes) = 50 bytes
    # Header: resp_code=4 (uint8), msg_len=50 (uint16), exch_seg=0 (uint8), sec_id=1333 (uint32) - HDFCBANK
    header = struct.pack("<BHBI", 4, 50, 0, 1333)
    # Payload: ltp=1650.25, ltq=10, ltt=1725600000, avg_price=1645.0, volume=2500000,
    # sell_qty=50000, buy_qty=60000, open=1640.0, close=1635.0, high=1655.0, low=1630.0
    payload = struct.pack(
        "<fHIfIIIffff",
        1650.25, 10, 1725600000, 1645.0, 2500000,
        50000, 60000,
        1640.0, 1635.0, 1655.0, 1630.0
    )
    frame = header + payload

    adapter._handle_binary_frame(frame)

    assert len(emitted_quotes) == 1
    quote = emitted_quotes[0]
    assert quote.symbol == "HDFCBANK"
    assert quote.last_price == 1650.25
    assert quote.open == 1640.0
    assert quote.high == 1655.0
    assert quote.low == 1630.0
    assert quote.close == 1635.0
    assert quote.volume == 2500000.0
    assert quote.provider == "dhan_ws"


def test_gateway_and_failover_chains():
    gateway = MarketDataGateway()
    assert "dhan_ws" in gateway.adapters
    assert isinstance(gateway.adapters["dhan_ws"], DhanWSAdapter)

    # Verify dhan_ws is registered in failover chains for Indian Equities and Indices
    assert "dhan_ws" in FAILOVER_CHAINS["INDIAN_EQUITIES"]
    assert "dhan_ws" in FAILOVER_CHAINS["INDIAN_INDICES"]
    assert "dhan_ws" in FAILOVER_CHAINS["OPTIONS"]
    assert "dhan_ws" in FAILOVER_CHAINS["FUTURES"]


def test_dashboard_dhan_endpoints():
    from dashboard import app
    client = app.test_client()

    resp = client.get("/api/dhan/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["broker"] == "DHAN"

    inst_resp = client.get("/api/dhan/instruments")
    assert inst_resp.status_code == 200
    inst_data = inst_resp.get_json()
    assert inst_data["status"] == "success"
    assert inst_data["count"] >= 20
    assert "RELIANCE" in inst_data["instruments"]
    assert "NIFTY" in inst_data["instruments"]
