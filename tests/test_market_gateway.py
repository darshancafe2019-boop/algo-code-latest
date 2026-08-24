"""
Market Data Gateway — Unit Tests
=================================
Tests all provider adapters with mocked I/O. No real network calls.
"""
import asyncio
import json
import time
import unittest
from datetime import datetime, timezone, timedelta
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    NormalizedQuote,
    OHLCVCandle,
    CanonicalInstrument,
    ProviderHealth,
)
from market_data_gateway.adapters.not_configured_stub import NotConfiguredAdapter
from market_data_gateway.adapters.yahoo_fallback import YahooFallbackAdapter
from market_data_gateway.subscription_registry import SubscriptionRegistry
from market_data_gateway.failover_manager import FailoverManager, _get_asset_class
from market_data_gateway.gateway_client import GatewayClient


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_quote(symbol="BTC/USDT", price=65000.0, age_sec=0.5) -> NormalizedQuote:
    event_ts = (datetime.now(timezone.utc) - timedelta(seconds=age_sec)).isoformat()
    return NormalizedQuote(
        symbol=symbol,
        exchange="BINANCE",
        provider="binance_ws",
        last_price=price,
        bid=price - 10,
        ask=price + 10,
        volume=10000.0,
        event_timestamp=event_ts,
        data_mode="REAL_TIME",
    )


# ─── NormalizedQuote tests ────────────────────────────────────────────────────

class TestNormalizedQuote(unittest.TestCase):

    def test_fresh_quote_not_stale(self):
        q = _make_quote(age_sec=0.1)
        q.mark_stale(threshold_sec=10.0)
        self.assertFalse(q.is_stale)

    def test_stale_quote_marked(self):
        q = _make_quote(age_sec=15.0)
        q.mark_stale(threshold_sec=10.0)
        self.assertTrue(q.is_stale)

    def test_future_timestamp_age_clamped_to_zero(self):
        q = NormalizedQuote(
            symbol="ETH/USDT", exchange="BINANCE", provider="test",
            last_price=3000.0,
            event_timestamp=(datetime.now(timezone.utc) + timedelta(seconds=5)).isoformat(),
        )
        self.assertEqual(q.age_seconds, 0.0)

    def test_to_dict_includes_age_seconds(self):
        q = _make_quote()
        d = q.to_dict()
        self.assertIn("age_seconds", d)
        self.assertGreaterEqual(d["age_seconds"], 0.0)

    def test_missing_event_timestamp_defaults_to_now(self):
        q = NormalizedQuote(symbol="TEST", exchange="NSE", provider="test", last_price=100.0)
        self.assertNotEqual(q.event_timestamp, "")
        self.assertGreaterEqual(q.age_seconds, 0.0)
        self.assertLess(q.age_seconds, 2.0)


# ─── Subscription Registry tests ─────────────────────────────────────────────

class TestSubscriptionRegistry(unittest.TestCase):

    def setUp(self):
        self.added: List[str] = []
        self.removed: List[str] = []
        self.registry = SubscriptionRegistry(
            add_callback=self.added.append,
            remove_callback=self.removed.append,
        )

    def test_first_subscription_triggers_add_callback(self):
        self.registry.subscribe("BTC/USDT", "WATCHLIST")
        self.assertIn("BTC/USDT", self.added)

    def test_second_reason_no_add_callback(self):
        self.registry.subscribe("BTC/USDT", "WATCHLIST")
        self.registry.subscribe("BTC/USDT", "RUNNING_BOT")
        self.assertEqual(self.added.count("BTC/USDT"), 1)

    def test_remove_last_reason_triggers_remove_callback(self):
        self.registry.subscribe("ETH/USDT", "CHART_VIEW")
        self.registry.unsubscribe("ETH/USDT", "CHART_VIEW")
        self.assertIn("ETH/USDT", self.removed)

    def test_remove_non_last_reason_no_remove_callback(self):
        self.registry.subscribe("ETH/USDT", "WATCHLIST")
        self.registry.subscribe("ETH/USDT", "CHART_VIEW")
        self.registry.unsubscribe("ETH/USDT", "WATCHLIST")
        self.assertNotIn("ETH/USDT", self.removed)

    def test_unknown_reason_rejected(self):
        self.registry.subscribe("SOL/USDT", "INVALID_REASON")  # type: ignore
        self.assertNotIn("SOL/USDT", self.added)

    def test_clear_reason_removes_all_symbols_with_that_reason(self):
        self.registry.subscribe("NIFTY", "RUNNING_BOT")
        self.registry.subscribe("BANKNIFTY", "RUNNING_BOT")
        self.registry.subscribe("BTC/USDT", "WATCHLIST")
        self.registry.clear_reason("RUNNING_BOT")
        self.assertIn("NIFTY", self.removed)
        self.assertIn("BANKNIFTY", self.removed)
        self.assertNotIn("BTC/USDT", self.removed)

    def test_dump_returns_active_symbols(self):
        self.registry.subscribe("AAPL", "BENCHMARK")
        d = self.registry.dump()
        self.assertIn("AAPL", d["symbols"])
        self.assertEqual(d["active_symbol_count"], 1)

    def test_symbol_normalized_to_uppercase(self):
        self.registry.subscribe("btc/usdt", "WATCHLIST")
        self.assertIn("BTC/USDT", self.added)


# ─── Failover Manager tests ───────────────────────────────────────────────────

class _MockAdapter(BaseProviderAdapter):
    def __init__(self, provider_id, status):
        super().__init__(provider_id, f"Mock-{provider_id}")
        self._status = status
        self._quote_cache = {}

    async def connect(self): pass
    async def disconnect(self): pass
    async def subscribe(self, symbols): pass
    async def unsubscribe(self, symbols): pass
    async def get_snapshot(self, symbols): return {}
    async def get_history(self, sym, tf, from_dt, to_dt): return []
    async def get_instruments(self): return []
    async def health_check(self): return ProviderHealth(self.provider_id, self.provider_name, self._status)


class TestFailoverManager(unittest.TestCase):

    def _make_manager(self, primary_status="DISCONNECTED", fallback_status="DELAYED"):
        adapters = {
            "binance_ws": _MockAdapter("binance_ws", primary_status),
            "yahoo_fallback": _MockAdapter("yahoo_fallback", fallback_status),
        }
        return FailoverManager(adapters), adapters

    def test_primary_live_returns_primary(self):
        mgr, adapters = self._make_manager("LIVE", "DELAYED")
        adapter = mgr.get_best_provider("BTC/USDT")
        self.assertEqual(adapter.provider_id, "binance_ws")

    def test_primary_disconnected_falls_back(self):
        mgr, _ = self._make_manager("DISCONNECTED", "DELAYED")
        adapter = mgr.get_best_provider("BTC/USDT")
        self.assertEqual(adapter.provider_id, "yahoo_fallback")

    def test_all_disconnected_returns_none(self):
        mgr, _ = self._make_manager("DISCONNECTED", "DISCONNECTED")
        adapter = mgr.get_best_provider("BTC/USDT")
        self.assertIsNone(adapter)

    def test_failover_transition_logged(self):
        mgr, adapters = self._make_manager("LIVE", "DELAYED")
        mgr.get_best_provider("BTC/USDT")                   # primary
        adapters["binance_ws"]._status = "DISCONNECTED"
        mgr.get_best_provider("BTC/USDT")                   # triggers failover
        self.assertEqual(len(mgr.get_transitions()), 1)
        t = mgr.get_transitions()[0]
        self.assertEqual(t["from_provider"], "binance_ws")
        self.assertEqual(t["to_provider"], "yahoo_fallback")

    def test_asset_class_inference_crypto(self):
        self.assertEqual(_get_asset_class("BTC/USDT"), "CRYPTO")
        self.assertEqual(_get_asset_class("ETH/USDT"), "CRYPTO")

    def test_asset_class_inference_indian_index(self):
        self.assertEqual(_get_asset_class("NIFTY"), "INDIAN_INDICES")
        self.assertEqual(_get_asset_class("SENSEX"), "INDIAN_INDICES")

    def test_asset_class_inference_forex(self):
        self.assertEqual(_get_asset_class("EUR/USD"), "FOREX")

    def test_asset_class_inference_commodities(self):
        self.assertEqual(_get_asset_class("GOLD"), "COMMODITIES")


# ─── Not-Configured Stub tests ────────────────────────────────────────────────

class TestNotConfiguredStub(unittest.IsolatedAsyncioTestCase):

    async def test_health_returns_not_configured(self):
        stub = NotConfiguredAdapter(
            "twelve_data", "Twelve Data",
            ["GLOBAL_EQUITIES"],
            "Set TWELVE_DATA_API_KEY in .env",
        )
        h = await stub.health_check()
        self.assertEqual(h.status, "NOT_CONFIGURED")

    async def test_snapshot_returns_empty(self):
        stub = NotConfiguredAdapter("polygon", "Polygon.io", [], "")
        result = await stub.get_snapshot(["AAPL"])
        self.assertEqual(result, {})

    async def test_history_returns_empty(self):
        stub = NotConfiguredAdapter("databento", "Databento", [], "")
        from_dt = datetime.now(timezone.utc) - timedelta(days=7)
        to_dt = datetime.now(timezone.utc)
        result = await stub.get_history("ES", "1d", from_dt, to_dt)
        self.assertEqual(result, [])


# ─── GatewayClient tests ─────────────────────────────────────────────────────

class TestGatewayClient(unittest.TestCase):

    def test_unavailable_gateway_returns_false(self):
        client = GatewayClient(base_url="http://127.0.0.1:19999", timeout=0.2)
        self.assertFalse(client.is_gateway_available())

    def test_unavailable_snapshot_returns_empty(self):
        client = GatewayClient(base_url="http://127.0.0.1:19999", timeout=0.2)
        result = client.get_snapshot(["BTC/USDT"])
        self.assertEqual(result, {})

    def test_unavailable_is_symbol_safe_returns_false(self):
        client = GatewayClient(base_url="http://127.0.0.1:19999", timeout=0.2)
        is_safe, reason, age = client.is_symbol_safe_for_trading("BTC/USDT")
        self.assertFalse(is_safe)
        self.assertIn("GATEWAY", reason.upper())

    def test_empty_symbols_returns_empty(self):
        client = GatewayClient(base_url="http://127.0.0.1:5051", timeout=0.5)
        result = client.get_snapshot([])
        self.assertEqual(result, {})


# ─── OHLCVCandle tests ────────────────────────────────────────────────────────

class TestOHLCVCandle(unittest.TestCase):

    def test_candle_to_dict(self):
        c = OHLCVCandle(
            symbol="BTC/USDT", exchange="BINANCE", provider="binance_ws",
            timeframe="1h", timestamp="2024-01-01T00:00:00+00:00",
            open=60000.0, high=61000.0, low=59500.0, close=60500.0, volume=1500.0,
        )
        d = c.to_dict()
        self.assertEqual(d["symbol"], "BTC/USDT")
        self.assertEqual(d["close"], 60500.0)
        self.assertTrue(d["is_closed"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
