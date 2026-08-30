"""
Comprehensive Test Suite for Delta Exchange Cryptocurrency Options Data Engine
================================================================================
Tests REST client, WebSocket normalization, SQLite schemas, Ingestion coordinator,
Canonical instrument resolver, and Option Chain calculations with Decimal precision.
"""

import os
import json
import pytest
import sqlite3
from decimal import Decimal
from datetime import datetime, timezone

from src import config
from src import db
from src.delta_options_client import DeltaOptionsClient, CircuitBreakerOpenException
from market_data_gateway.adapters.delta_options_ws import DeltaOptionsWSAdapter
from src.delta_options_service import DeltaOptionsService, _format_expiry_date_display
from src.instrument_resolver import global_instrument_resolver, ResolutionStatus, AssetClass, InstrumentType


@pytest.fixture(autouse=True)
def setup_database():
    """Ensures test database tables are initialized before tests run."""
    db.init_db(force=True)
    yield


# ------------------------------------------------------------------------------
# 1. DELTA REST CLIENT TESTS
# ------------------------------------------------------------------------------

def test_delta_client_init_and_health():
    client = DeltaOptionsClient(base_url="https://api.india.delta.exchange")
    assert client.base_url == "https://api.india.delta.exchange"
    health = client.health_check()
    assert health["status"] in ["HEALTHY", "UNHEALTHY"]
    assert "circuit_state" in health
    assert "latency_ms" in health


def test_delta_client_circuit_breaker():
    client = DeltaOptionsClient(base_url="http://127.0.0.1:9999", max_retries=1, timeout_sec=0.5)
    # Trip circuit breaker by forcing consecutive failures
    for _ in range(5):
        try:
            client._request("/non_existent_endpoint")
        except Exception:
            pass
    assert client._circuit_state in ["OPEN", "HALF_OPEN"]


def test_delta_expiry_date_formatter():
    iso_time = "2026-09-25T12:00:00Z"
    dd_mm_yyyy, chain_suffix, dte = _format_expiry_date_display(iso_time)
    assert dd_mm_yyyy == "25-09-2026"
    assert chain_suffix == "250926"
    assert isinstance(dte, float)


# ------------------------------------------------------------------------------
# 2. DELTA WEBSOCKET ADAPTER TESTS
# ------------------------------------------------------------------------------

def test_delta_ws_adapter_message_decoding():
    adapter = DeltaOptionsWSAdapter()
    emitted_quotes = []
    adapter.set_quote_callback(lambda q: emitted_quotes.append(q))

    # Mock Delta WS ticker batch message
    mock_batch_msg = {
        "type": "ticker",
        "sy": "BTC-300826",
        "sp": "78250.0",
        "ts": 1725000000000,
        "d": [
            {
                "s": "C-BTC-78000-300826",
                "i": 149612,
                "m": "450.5",
                "m24hc": "2.5",
                "q": ["445.0", "1.5", "455.0", "2.0", "450.0"],
                "qiv": ["0.55", "0.52", "0.58"],
                "g": ["0.52", "0.00012", "-15.4", "85.2", "0.012"],
                "oi": ["2500.0", "120.0"],
                "pb": ["200.0", "800.0"],
                "volume": "150.0",
            },
            {
                "s": "P-BTC-78000-300826",
                "i": 149613,
                "m": "420.0",
                "m24hc": "-1.8",
                "q": ["415.0", "3.0", "425.0", "1.2", "420.0"],
                "qiv": ["0.56", "0.53", "0.59"],
                "g": ["-0.48", "0.00012", "-14.8", "84.5", "-0.010"],
                "oi": ["3100.0", "-50.0"],
                "pb": ["180.0", "750.0"],
                "volume": "210.0",
            }
        ]
    }

    adapter._handle_message(mock_batch_msg)

    assert len(emitted_quotes) == 2
    assert emitted_quotes[0].symbol == "C-BTC-78000-300826"
    assert emitted_quotes[0].last_price == 450.5
    assert emitted_quotes[0].bid == 445.0
    assert emitted_quotes[0].ask == 455.0

    raw_quote = adapter.get_raw_quote("C-BTC-78000-300826")
    assert raw_quote is not None
    assert raw_quote["product_id"] == 149612
    assert raw_quote["delta"] == 0.52
    assert raw_quote["spot_price"] == 78250.0
    assert raw_quote["mark_iv"] == 0.55


# ------------------------------------------------------------------------------
# 3. DATABASE SCHEMAS & PERSISTENCE TESTS
# ------------------------------------------------------------------------------

def test_delta_database_crud_operations():
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Upsert Underlying
    und_ok = db.upsert_delta_underlying({
        "underlying_symbol": "BTC",
        "name": "Bitcoin",
        "precision": 8,
        "sort_priority": 1,
        "spot_index_symbol": ".DEXBTUSD",
    })
    assert und_ok is True

    underlyings = db.get_delta_underlyings(active_only=True)
    assert any(u["underlying_symbol"] == "BTC" for u in underlyings)

    # 2. Upsert Expiries
    exp_count = db.upsert_delta_expiries("BTC", [
        {
            "expiry_date": "25-09-2026",
            "settlement_time": "2026-09-25T12:00:00Z",
            "days_to_expiry": 26.5,
            "is_active": 1,
        }
    ])
    assert exp_count == 1

    expiries = db.get_delta_expiries("BTC", active_only=True)
    assert len(expiries) >= 1
    assert any(e["expiry_date"] == "25-09-2026" for e in expiries)

    # 3. Upsert Contracts
    contracts_count = db.upsert_delta_contracts([
        {
            "product_id": 999001,
            "symbol": "C-BTC-80000-250926",
            "underlying_symbol": "BTC",
            "contract_type": "call_options",
            "strike_price": 80000.0,
            "settlement_time": "2026-09-25T12:00:00Z",
            "expiry_date": "25-09-2026",
            "tick_size": 0.1,
            "contract_value": "0.001",
            "is_active": 1,
        },
        {
            "product_id": 999002,
            "symbol": "P-BTC-80000-250926",
            "underlying_symbol": "BTC",
            "contract_type": "put_options",
            "strike_price": 80000.0,
            "settlement_time": "2026-09-25T12:00:00Z",
            "expiry_date": "25-09-2026",
            "tick_size": 0.1,
            "contract_value": "0.001",
            "is_active": 1,
        }
    ])
    assert contracts_count == 2

    c_by_id = db.get_delta_contract_by_id(999001)
    assert c_by_id is not None
    assert c_by_id["symbol"] == "C-BTC-80000-250926"

    c_by_sym = db.get_delta_contract_by_symbol("P-BTC-80000-250926")
    assert c_by_sym is not None
    assert c_by_sym["product_id"] == 999002

    # 4. Upsert Quotes
    quotes_count = db.upsert_delta_quotes([
        {
            "product_id": 999001,
            "symbol": "C-BTC-80000-250926",
            "underlying_symbol": "BTC",
            "contract_type": "call_options",
            "strike_price": 80000.0,
            "settlement_time": "2026-09-25T12:00:00Z",
            "mark_price": 620.0,
            "spot_price": 78500.0,
            "best_bid": 615.0,
            "best_ask": 625.0,
            "delta": 0.45,
            "gamma": 0.0001,
            "theta": -18.2,
            "vega": 72.0,
            "mark_iv": 0.54,
            "oi": 1500.0,
            "volume_24h": 320.0,
        }
    ])
    assert quotes_count == 1

    quotes = db.get_delta_quotes("BTC", "2026-09-25")
    assert len(quotes) >= 1
    assert any(q["product_id"] == 999001 and q["mark_price"] == 620.0 for q in quotes)

    # 5. Save & Fetch Chain Snapshot
    snap_id = db.save_delta_chain_snapshot({
        "underlying_symbol": "BTC",
        "expiry_date": "25-09-2026",
        "settlement_time": "2026-09-25T12:00:00Z",
        "spot_price": 78500.0,
        "atm_strike": 78000.0,
        "pcr_oi": 1.15,
        "pcr_vol": 0.95,
        "max_pain_strike": 78000.0,
        "chain_data_json": [{"strike": 80000.0}],
    })
    assert snap_id > 0

    latest_snap = db.get_latest_delta_chain_snapshot("BTC", "25-09-2026")
    assert latest_snap is not None
    assert latest_snap["spot_price"] == 78500.0
    assert latest_snap["atm_strike"] == 78000.0


# ------------------------------------------------------------------------------
# 4. CANONICAL INSTRUMENT RESOLVER TESTS
# ------------------------------------------------------------------------------

def test_instrument_resolver_rejection_of_category_labels():
    res = global_instrument_resolver.resolve("BTC-OPTIONS")
    assert res.status == ResolutionStatus.CATEGORY_ONLY
    assert res.error_code == "INSTRUMENT_CATEGORY_NOT_EXECUTABLE"
    assert res.is_valid is False

    res_eth = global_instrument_resolver.resolve("ETH-OPTIONS")
    assert res_eth.status == ResolutionStatus.CATEGORY_ONLY
    assert res_eth.is_valid is False


def test_instrument_resolver_delta_executable_symbols():
    # Test resolution of exact Delta contract symbol
    res = global_instrument_resolver.resolve("C-BTC-80000-250926")
    assert res.status == ResolutionStatus.RESOLVED
    assert res.is_valid is True
    assert res.instrument.exchange == "DELTA"
    assert res.instrument.provider == "delta_options"
    assert res.instrument.strike == 80000.0
    assert res.instrument.option_type == "CALL"
    assert res.instrument.asset_class == AssetClass.CRYPTO


def test_instrument_resolver_delta_product_id():
    # Ensure contract exists in DB
    db.upsert_delta_contracts([{
        "product_id": 999001,
        "symbol": "C-BTC-80000-250926",
        "underlying_symbol": "BTC",
        "contract_type": "call_options",
        "strike_price": 80000.0,
        "settlement_time": "2026-09-25T12:00:00Z",
        "expiry_date": "25-09-2026",
        "is_active": 1,
    }])
    res = global_instrument_resolver.resolve("999001")
    assert res.status == ResolutionStatus.RESOLVED
    assert res.is_valid is True
    assert res.instrument.canonical_symbol == "C-BTC-80000-250926"


# ------------------------------------------------------------------------------
# 5. DELTA OPTIONS SERVICE & OPTION CHAIN BUILDER TESTS
# ------------------------------------------------------------------------------

def test_delta_options_service_chain_builder():
    service = DeltaOptionsService()
    chain = service.get_option_chain("BTC", expiry="25-09-2026")

    assert chain["underlying"] == "BTC"
    assert "spot_price" in chain
    assert "strikes" in chain
    assert "atm_strike" in chain
    assert "pcr" in chain
    assert "max_pain" in chain
    assert chain["provider"] == "DELTA_EXCHANGE"
    assert chain["environment"] == "INDIA"
    assert chain["data_source"] == "Delta Exchange Live"
