"""
QUANT.OS Centralized Market Data Pipeline Test Suite
======================================================
Comprehensive verification of canonical quote validation, freshness evaluation,
stale protection, alias resolution, gateway security, and fail-closed trade safety.

Covers all 20 required production failure and edge-case scenarios.
"""

import time
import json
import math
import queue
import urllib.error
import urllib.request
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from src.market_data.canonical_pipeline import (
    CanonicalQuote,
    validate_canonical_quote,
    evaluate_quote_freshness,
    resolve_symbol_aliases,
    resolve_canonical_quote,
    STATE_LIVE,
    STATE_DELAYED,
    STATE_STALE,
    STATE_UNKNOWN,
    STATE_INVALID,
    STATE_NO_DATA,
    QUALITY_VALIDATED,
    QUALITY_REJECTED,
)
from src.market_data.stream_engine import CentralizedStreamManager
from src.market_data.cache_engine import MarketDataCache


# ─── 1. Valid Fresh Quote ───────────────────────────────────────────────────
def test_valid_fresh_quote():
    now_sec = time.time()
    raw = {
        "symbol": "BTC/USDT",
        "ltp": 65000.0,
        "bid": 64995.0,
        "ask": 65005.0,
        "volume": 1200.5,
        "timestamp": int(now_sec * 1000),  # 0s age
        "provider": "BINANCE",
        "exchange": "BINANCE"
    }
    valid, cq, err = validate_canonical_quote(raw, "BTC/USDT", current_time_sec=now_sec)
    assert valid is True
    assert cq is not None
    assert cq.freshness == STATE_LIVE
    assert cq.is_tradeable is True
    assert cq.data_quality == QUALITY_VALIDATED
    assert cq.ltp == 65000.0
    assert cq.age_ms == 0


# ─── 2. Delayed Quote (5s - 15s) ───────────────────────────────────────────
def test_delayed_quote():
    now_sec = time.time()
    ts_delayed = int((now_sec - 8.0) * 1000)  # 8 seconds old
    raw = {
        "symbol": "ETH/USDT",
        "ltp": 3500.0,
        "timestamp": ts_delayed,
        "provider": "BYBIT"
    }
    valid, cq, err = validate_canonical_quote(raw, "ETH/USDT", current_time_sec=now_sec)
    assert valid is True
    assert cq is not None
    assert cq.freshness == STATE_DELAYED
    assert cq.is_tradeable is False  # Must NOT be tradeable if delayed!
    assert cq.age_ms >= 8000


# ─── 3. Stale Quote (> 15s) ────────────────────────────────────────────────
def test_stale_quote():
    now_sec = time.time()
    ts_stale = int((now_sec - 20.0) * 1000)  # 20 seconds old
    raw = {
        "symbol": "SOL/USDT",
        "ltp": 140.0,
        "timestamp": ts_stale,
        "provider": "DELTA"
    }
    valid, cq, err = validate_canonical_quote(raw, "SOL/USDT", current_time_sec=now_sec)
    assert valid is True
    assert cq is not None
    assert cq.freshness == STATE_STALE
    assert cq.is_tradeable is False
    assert cq.age_ms >= 20000


# ─── 4. Missing Timestamp ──────────────────────────────────────────────────
def test_missing_timestamp():
    raw = {
        "symbol": "BTC/USDT",
        "ltp": 65000.0,
        "timestamp": None,
        "provider": "BINANCE"
    }
    valid, cq, err = validate_canonical_quote(raw, "BTC/USDT")
    assert valid is True
    assert cq is not None
    assert cq.freshness == STATE_UNKNOWN
    assert cq.is_tradeable is False
    assert cq.exchange_timestamp is None


# ─── 5. Invalid Timestamp ──────────────────────────────────────────────────
def test_invalid_timestamp():
    raw = {
        "symbol": "BTC/USDT",
        "ltp": 65000.0,
        "timestamp": "not_a_timestamp_at_all",
        "provider": "BINANCE"
    }
    valid, cq, err = validate_canonical_quote(raw, "BTC/USDT")
    assert valid is True
    assert cq is not None
    assert cq.freshness == STATE_INVALID
    assert cq.is_tradeable is False


# ─── 6. Zero Price ─────────────────────────────────────────────────────────
def test_zero_price():
    raw = {
        "symbol": "NIFTY",
        "ltp": 0.0,
        "timestamp": int(time.time() * 1000)
    }
    valid, cq, err = validate_canonical_quote(raw, "NIFTY")
    assert valid is False
    assert cq is None
    assert err == "NON_POSITIVE_PRICE"


# ─── 7. Negative Price ─────────────────────────────────────────────────────
def test_negative_price():
    raw = {
        "symbol": "NIFTY",
        "ltp": -250.0,
        "timestamp": int(time.time() * 1000)
    }
    valid, cq, err = validate_canonical_quote(raw, "NIFTY")
    assert valid is False
    assert cq is None
    assert err == "NON_POSITIVE_PRICE"


# ─── 8. NaN Price ──────────────────────────────────────────────────────────
def test_nan_price():
    raw = {
        "symbol": "BTC/USDT",
        "ltp": float("nan"),
        "timestamp": int(time.time() * 1000)
    }
    valid, cq, err = validate_canonical_quote(raw, "BTC/USDT")
    assert valid is False
    assert cq is None
    assert err == "NAN_PRICE"


# ─── 9. Infinity Price ─────────────────────────────────────────────────────
def test_infinity_price():
    raw = {
        "symbol": "BTC/USDT",
        "ltp": float("inf"),
        "timestamp": int(time.time() * 1000)
    }
    valid, cq, err = validate_canonical_quote(raw, "BTC/USDT")
    assert valid is False
    assert cq is None
    assert err == "INFINITY_PRICE"


# ─── 10. Gateway Unavailable (Fail-Closed Fallback) ────────────────────────
def test_gateway_unavailable():
    with patch("os.environ.get", side_effect=lambda k, d="": "valid_secret" if k == "MARKET_GATEWAY_SECRET" else d):
        with patch("urllib.request.urlopen", side_effect=ConnectionRefusedError("Connection refused on 5051")):
            with patch("src.ticker_service.get_ticker_service", return_value=None):
                code, res = resolve_canonical_quote("NON_EXISTENT_COIN_XYZ_123")
                # Should not crash; returns 404 NO_DATA fail-closed
                assert code == 404
                assert res["status"] == "no_data"
                assert res["is_tradeable"] is False


# ─── 11. Gateway Timeout (Fail-Closed Fallback) ────────────────────────────
def test_gateway_timeout():
    with patch("os.environ.get", side_effect=lambda k, d="": "valid_secret" if k == "MARKET_GATEWAY_SECRET" else d):
        with patch("urllib.request.urlopen", side_effect=TimeoutError("Request timed out")):
            with patch("src.ticker_service.get_ticker_service", return_value=None):
                code, res = resolve_canonical_quote("NON_EXISTENT_COIN_XYZ_123")
                assert code == 404
                assert res["status"] == "no_data"
                assert res["is_tradeable"] is False


# ─── 12. Gateway Invalid JSON Response ────────────────────────────────────
def test_gateway_invalid_json():
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = b"<html>502 Bad Gateway</html>"

    with patch("os.environ.get", side_effect=lambda k, d="": "valid_secret" if k == "MARKET_GATEWAY_SECRET" else d):
        with patch("urllib.request.urlopen", return_value=mock_resp):
            with patch("src.ticker_service.get_ticker_service", return_value=None):
                code, res = resolve_canonical_quote("NON_EXISTENT_COIN_XYZ_123")
                assert code == 404
                assert res["status"] == "no_data"
                assert res["is_tradeable"] is False


# ─── 13. Missing Gateway Secret ───────────────────────────────────────────
def test_missing_gateway_secret():
    with patch.dict("os.environ", {"MARKET_GATEWAY_SECRET": ""}, clear=False):
        code, res = resolve_canonical_quote("BTC/USDT")
        assert code == 500
        assert res["code"] == "GATEWAY_SECRET_UNCONFIGURED"
        assert "MARKET_GATEWAY_SECRET" in res["message"]


# ─── 14. Ticker Service Without Timestamp ─────────────────────────────────
def test_ticker_service_without_timestamp():
    raw_ticker = {
        "status": "success",
        "symbol": "BTC/USDT",
        "last": 65000.0,
        "price": 65000.0,
        "source_timestamp": None,
        "timestamp": None,
        "provider": "TICKER_SERVICE"
    }
    valid, cq, err = validate_canonical_quote(raw_ticker, "BTC/USDT")
    assert valid is True
    assert cq.freshness == STATE_UNKNOWN
    assert cq.is_tradeable is False


# ─── 15. Ticker Service Stale Timestamp ───────────────────────────────────
def test_ticker_service_stale_timestamp():
    now_sec = time.time()
    stale_ms = int((now_sec - 25.0) * 1000)
    raw_ticker = {
        "status": "success",
        "symbol": "ETH/USDT",
        "last": 3400.0,
        "timestamp": stale_ms,
        "provider": "TICKER_SERVICE"
    }
    valid, cq, err = validate_canonical_quote(raw_ticker, "ETH/USDT", current_time_sec=now_sec)
    assert valid is True
    assert cq.freshness == STATE_STALE
    assert cq.is_tradeable is False
    assert cq.age_ms >= 25000


# ─── 16. Batch Stale Quote Handling ───────────────────────────────────────
def test_batch_stale_quote_handling():
    now_sec = time.time()
    stale_ts = int((now_sec - 30.0) * 1000)
    fresh_ts = int(now_sec * 1000)

    quotes = [
        {"symbol": "BTC/USDT", "ltp": 65000.0, "timestamp": fresh_ts},
        {"symbol": "ETH/USDT", "ltp": 3500.0, "timestamp": stale_ts},
    ]

    evaluated = {}
    for q in quotes:
        v, cq, _ = validate_canonical_quote(q, q["symbol"], current_time_sec=now_sec)
        evaluated[q["symbol"]] = cq

    assert evaluated["BTC/USDT"].freshness == STATE_LIVE
    assert evaluated["BTC/USDT"].is_tradeable is True
    assert evaluated["ETH/USDT"].freshness == STATE_STALE
    assert evaluated["ETH/USDT"].is_tradeable is False


# ─── 17. SSE Disconnect Cleanup ───────────────────────────────────────────
def test_sse_disconnect_cleanup():
    mgr = CentralizedStreamManager(max_queue_size=50)
    cid = "client_test_disconnect"
    q = mgr.register_client(cid)
    assert cid in mgr._client_queues
    assert cid in mgr._client_subscriptions
    assert cid in mgr._client_metrics

    # Simulate disconnect / unregister
    mgr.unregister_client(cid)
    assert cid not in mgr._client_queues
    assert cid not in mgr._client_subscriptions
    assert cid not in mgr._client_metrics


# ─── 18. SSE Slow-Client Protection & Queue Exception Handling ────────────
def test_sse_slow_client_protection():
    mgr = CentralizedStreamManager(max_queue_size=2)
    cid = "slow_client"
    q = mgr.register_client(cid)

    # Put 3 quotes into a queue of maxsize=2
    for i in range(5):
        mgr.send_heartbeat()

    # Manager should drop oldest without throwing queue.Full exception
    stats = mgr.get_stream_stats()
    assert stats["total_dropped"] >= 3
    assert q.qsize() <= 2
    mgr.unregister_client(cid)


# ─── 19. Duplicate Aliases Deduplication ──────────────────────────────────
def test_duplicate_aliases():
    aliases_nifty = resolve_symbol_aliases("NIFTY")
    assert len(aliases_nifty) == len(set(aliases_nifty))
    assert "NIFTY 50" in aliases_nifty
    assert "NSE:NIFTY" in aliases_nifty

    aliases_banknifty = resolve_symbol_aliases("BANK NIFTY")
    assert len(aliases_banknifty) == len(set(aliases_banknifty))
    assert "BANKNIFTY" in aliases_banknifty

    aliases_btc = resolve_symbol_aliases("BTC/USDT")
    assert len(aliases_btc) == len(set(aliases_btc))
    assert "BTCUSDT" in aliases_btc
    assert "BTC-USDT" in aliases_btc


# ─── 20. No-Data Response Structure ───────────────────────────────────────
def test_no_data_response():
    with patch.dict("os.environ", {"MARKET_GATEWAY_SECRET": "test_sec"}, clear=False):
        with patch("urllib.request.urlopen", side_effect=urllib.error.HTTPError("http://127.0.0.1:5051/ltp", 404, "Not Found", {}, None)):
            with patch("src.ticker_service.get_ticker_service", return_value=None):
                code, res = resolve_canonical_quote("UNKNOWN_TEST_SYMBOL_XYZ")
                assert code == 404
                assert res["status"] == "no_data"
                assert res["code"] == "INSTRUMENT_NOT_FOUND"
                assert res["is_tradeable"] is False
                assert res["freshness"] == STATE_NO_DATA
