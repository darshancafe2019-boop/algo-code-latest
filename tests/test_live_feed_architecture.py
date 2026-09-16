"""
Unit and Integration Tests for Quant.OS Live Market Data Feed Architecture
==========================================================================
Tests:
- Normalized models & data quality validation
- FYERS WebSocket adapter & normalizer (Lite & Symbol Update)
- Upstox V3 Protobuf adapter & normalizer (LTPC, Full, Option Greeks)
- Dhan and Delta normalizers
- Central SubscriptionManager, Planner, and Capacity Limits
- Stale Data Detector, Deduplication, and Out-of-Order protection
- MarketDataCache multi-key aliasing
- SimulationFeedAdapter
- Gateway Health, Metrics, and Route Verification
"""
import asyncio
import os
import unittest
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from market_data_gateway.models.tick import MarketTick, validate_tick_quality
from market_data_gateway.models.depth import MarketDepth, DepthLevel
from market_data_gateway.models.option_greeks import OptionGreeks
from market_data_gateway.models.feed_status import FeedState, ProviderHealthReport
from market_data_gateway.normalizers.fyers_normalizer import (
    normalize_fyers_tick,
    normalize_fyers_binary_frame,
)
from market_data_gateway.normalizers.upstox_normalizer import (
    normalize_upstox_feed,
    normalize_upstox_depth,
)
from market_data_gateway.normalizers.dhan_normalizer import (
    normalize_dhan_packet,
    normalize_dhan_json,
)
from market_data_gateway.normalizers.delta_normalizer import (
    normalize_delta_ticker,
    normalize_delta_l2_depth,
)
from market_data_gateway.core.metrics import ProviderMetrics, FeedMetricsTracker
from market_data_gateway.core.stale_detector import StaleDetector, TickDeduplicator
from market_data_gateway.core.reconnect import ReconnectPolicy
from market_data_gateway.core.rate_limiter import FeedRateLimiter
from market_data_gateway.subscriptions.planner import (
    SubscriptionPlanner,
    SubscriptionPriority,
)
from market_data_gateway.subscriptions.resolver import InstrumentResolver
from market_data_gateway.core.subscription_manager import SubscriptionManager
from market_data_gateway.cache.market_cache import MarketDataCache
from market_data_gateway.adapters.fyers_ws import FyersWSAdapter
from market_data_gateway.adapters.upstox_ws import UpstoxWSAdapter
from market_data_gateway.adapters.simulation_feed import SimulationFeedAdapter
from market_data_gateway.gateway import MarketDataGateway, create_app


class TestLiveFeedArchitecture(unittest.TestCase):

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Canonical Models and Data Quality
    # ─────────────────────────────────────────────────────────────────────────

    def test_market_tick_creation_and_quality(self):
        tick = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:RELIANCE-EQ",
            internalInstrumentId="RELIANCE",
            exchange="NSE",
            segment="EQ",
            symbol="RELIANCE",
            ltp=2845.5,
            bidPrice=2845.0,
            askPrice=2846.0,
            volume=1500000.0,
            openInterest=None,
            iv=None,
            delta=None,
            dataMode="FULL_QUOTE",
        )
        self.assertEqual(tick.symbol, "RELIANCE")
        self.assertEqual(tick.ltp, 2845.5)
        self.assertIsNone(tick.openInterest)  # Must be null, never fabricated
        self.assertIsNone(tick.iv)
        self.assertTrue(tick.is_valid())

        # Quality validation test
        valid, reason = validate_tick_quality(tick)
        self.assertTrue(valid)
        self.assertIsNone(reason)

    def test_market_tick_rejects_invalid_values(self):
        # Negative price should be rejected
        bad_tick = MarketTick(
            provider="dhan",
            providerInstrumentId="1333",
            internalInstrumentId="NIFTY",
            exchange="NSE",
            segment="INDEX",
            symbol="NIFTY",
            ltp=-100.0,
        )
        valid, reason = validate_tick_quality(bad_tick)
        self.assertFalse(valid)
        self.assertIn("Non-positive LTP", reason)

        # Inverted spread rejection
        bad_spread = MarketTick(
            provider="delta",
            providerInstrumentId="BTCUSD",
            internalInstrumentId="BTC",
            exchange="DELTA_INDIA",
            segment="CRYPTO",
            symbol="BTC/USD",
            ltp=64000.0,
            bidPrice=64100.0,
            askPrice=63900.0,  # bid > ask inverted spread
        )
        valid, reason = validate_tick_quality(bad_spread)
        self.assertFalse(valid)
        self.assertIn("Crossed market", reason)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. FYERS Normalizer & Adapter
    # ─────────────────────────────────────────────────────────────────────────

    def test_fyers_lite_normalization(self):
        raw_lite = {
            "symbol": "NSE:RELIANCE-EQ",
            "ltp": 2845.50,
            "tt": int(datetime.now(timezone.utc).timestamp()),
        }
        tick = normalize_fyers_tick(raw_lite, is_lite=True)
        self.assertIsNotNone(tick)
        self.assertEqual(tick.provider, "fyers")
        self.assertEqual(tick.symbol, "RELIANCE")
        self.assertEqual(tick.ltp, 2845.50)
        self.assertEqual(tick.dataMode, "LTP")
        self.assertIsNone(tick.openInterest)

    def test_fyers_symbol_update_normalization(self):
        raw_full = {
            "symbol": "NSE:NIFTY50-INDEX",
            "ltp": 24612.00,
            "open_price": 24500.0,
            "high_price": 24650.0,
            "low_price": 24480.0,
            "prev_close_price": 24510.0,
            "vol_traded_today": 8900000,
            "bid_price": 24611.5,
            "ask_price": 24612.5,
            "oi": 145000,
            "tt": int(datetime.now(timezone.utc).timestamp()),
        }
        tick = normalize_fyers_tick(raw_full, is_lite=False)
        self.assertIsNotNone(tick)
        self.assertIn(tick.symbol, ("NIFTY", "NIFTY50"))
        self.assertEqual(tick.ltp, 24612.00)
        self.assertEqual(tick.high, 24650.0)
        self.assertEqual(tick.low, 24480.0)
        self.assertEqual(tick.volume, 8900000)
        self.assertEqual(tick.openInterest, 145000)
        self.assertEqual(tick.dataMode, "FULL_QUOTE")

    def test_fyers_adapter_auth_expired_state(self):
        adapter = FyersWSAdapter(app_id="TEST_APP", access_token="")
        status = adapter.get_status()
        self.assertIn(status, ("NOT_CONFIGURED", "AUTH_REQUIRED", "AUTH_EXPIRED", "DISCONNECTED"))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Upstox V3 Normalizer & Adapter
    # ─────────────────────────────────────────────────────────────────────────

    def test_upstox_ltpc_normalization(self):
        raw_ltpc = {
            "mode": "LTPC",
            "last_price": 24615.0,
            "ltq": 50,
            "ltt": int(datetime.now(timezone.utc).timestamp() * 1000),
            "close": 24500.0,
            "vtt": 320000,
        }
        tick = normalize_upstox_feed("NSE_INDEX|Nifty 50", raw_ltpc)
        self.assertIsNotNone(tick)
        self.assertEqual(tick.provider, "upstox")
        self.assertEqual(tick.symbol, "NIFTY")
        self.assertEqual(tick.ltp, 24615.0)
        self.assertEqual(tick.ltq, 50)
        self.assertEqual(tick.previousClose, 24500.0)

    def test_upstox_option_greeks_normalization(self):
        raw_full = {
            "mode": "OPTION_GREEKS",
            "last_price": 145.20,
            "greeks": {
                "iv": 14.5,
                "delta": 0.52,
                "gamma": 0.0018,
                "theta": -12.4,
                "vega": 18.2,
                "rho": 0.04,
            },
            "oi": 520000,
            "prev_oi": 490000,
        }
        tick = normalize_upstox_feed("NSE_FO|NIFTY24OCT24600CE", raw_full)
        self.assertIsNotNone(tick)
        self.assertEqual(tick.ltp, 145.20)
        self.assertEqual(tick.iv, 14.5)
        self.assertEqual(tick.delta, 0.52)
        self.assertEqual(tick.theta, -12.4)
        self.assertEqual(tick.openInterest, 520000)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Dhan and Delta Normalizers
    # ─────────────────────────────────────────────────────────────────────────

    def test_dhan_json_normalization(self):
        raw_dhan = {
            "symbol": "TCS",
            "security_id": 11536,
            "exchange_segment": "NSE_EQ",
            "last_price": 3890.0,
            "bid_price": 3889.5,
            "ask_price": 3890.5,
            "volume": 450000,
            "open": 3870.0,
            "high": 3910.0,
            "low": 3865.0,
            "previous_close": 3880.0,
            "open_interest": 0,
        }
        tick = normalize_dhan_json(raw_dhan)
        self.assertIsNotNone(tick)
        self.assertEqual(tick.provider, "dhan")
        self.assertEqual(tick.symbol, "TCS")
        self.assertEqual(tick.ltp, 3890.0)
        self.assertEqual(tick.high, 3910.0)

    def test_delta_ticker_normalization(self):
        raw_delta = {
            "symbol": "BTCUSD",
            "close": 64250.0,
            "mark_price": 64252.0,
            "volume": 125000.0,
            "open_interest": 4500.0,
            "quotes": {
                "best_bid": 64249.0,
                "best_ask": 64251.0,
            },
            "greeks": {
                "implied_volatility": 0.48,
                "delta": 0.98,
                "gamma": 0.00002,
                "theta": -5.2,
                "vega": 12.0,
            },
        }
        tick = normalize_delta_ticker(raw_delta)
        self.assertIsNotNone(tick)
        self.assertEqual(tick.provider, "delta")
        self.assertIn(tick.symbol, ("BTCUSD", "BTC/USD"))
        self.assertEqual(tick.ltp, 64250.0)
        self.assertEqual(tick.iv, 0.48)
        self.assertEqual(tick.delta, 0.98)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Central Subscription Planner and Limits
    # ─────────────────────────────────────────────────────────────────────────

    def test_subscription_planner_priorities_and_capacity(self):
        planner = SubscriptionPlanner(max_limits={"test_prov": 5})

        # Request 3 high-priority
        app1, rej1 = planner.plan_subscriptions(
            provider="test_prov",
            symbols=["S1", "S2", "S3"],
            priority=SubscriptionPriority.ACTIVE_STRATEGY,
        )
        self.assertEqual(len(app1), 3)
        self.assertEqual(len(rej1), 0)

        # Request 4 low-priority (capacity is 5, only 2 approved)
        app2, rej2 = planner.plan_subscriptions(
            provider="test_prov",
            symbols=["S4", "S5", "S6", "S7"],
            priority=SubscriptionPriority.BACKGROUND,
        )
        self.assertEqual(len(app2), 2)
        self.assertEqual(len(rej2), 2)
        self.assertEqual(planner.get_active_count("test_prov"), 5)

        # Higher priority can preempt lower priority
        app3, rej3 = planner.plan_subscriptions(
            provider="test_prov",
            symbols=["VIP1"],
            priority=SubscriptionPriority.ACTIVE_STRATEGY,
        )
        self.assertEqual(len(app3), 1)
        self.assertEqual(planner.get_active_count("test_prov"), 5)

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Stale Data Detector, Deduplication & Out-of-Order Handling
    # ─────────────────────────────────────────────────────────────────────────

    def test_stale_data_detector(self):
        detector = StaleDetector(
            live_threshold_sec=1.0,
            fresh_threshold_sec=3.0,
            stale_threshold_sec=10.0,
            disconnected_threshold_sec=30.0,
        )

        now = datetime.now(timezone.utc)
        tick_live = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:RELIANCE-EQ",
            internalInstrumentId="RELIANCE",
            exchange="NSE",
            segment="EQUITY",
            symbol="RELIANCE",
            ltp=2850.0,
            timestamp=now.isoformat(),
            receivedAt=now.isoformat(),
        )
        classified = detector.evaluate(tick_live)
        self.assertEqual(classified.feedStatus, "LIVE")

        # Stale tick (6 seconds old, <= 10.0s)
        old_time = (now - timedelta(seconds=6)).isoformat()
        tick_stale = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:RELIANCE-EQ",
            internalInstrumentId="RELIANCE",
            exchange="NSE",
            segment="EQUITY",
            symbol="RELIANCE",
            ltp=2850.0,
            timestamp=old_time,
            receivedAt=old_time,
        )
        classified_stale = detector.evaluate(tick_stale)
        self.assertEqual(classified_stale.feedStatus, "STALE")

    def test_out_of_order_protection(self):
        detector = StaleDetector()
        now = datetime.now(timezone.utc)

        t1 = (now - timedelta(seconds=2)).isoformat()
        t2 = now.isoformat()

        tick_newer = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:INFY-EQ",
            internalInstrumentId="INFY",
            exchange="NSE",
            segment="EQUITY",
            symbol="INFY",
            ltp=1780.0,
            timestamp=t2,
            receivedAt=t2,
        )
        tick_older = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:INFY-EQ",
            internalInstrumentId="INFY",
            exchange="NSE",
            segment="EQUITY",
            symbol="INFY",
            ltp=1775.0,
            timestamp=t1,
            receivedAt=t1,
        )

        self.assertTrue(detector.is_newer(tick_newer))
        detector.record_tick(tick_newer)

        # Older tick arriving after newer must be detected
        self.assertFalse(detector.is_newer(tick_older))

    def test_tick_deduplication(self):
        dedup = TickDeduplicator()
        tick = MarketTick(
            provider="upstox",
            providerInstrumentId="NSE_INDEX|Nifty 50",
            internalInstrumentId="NIFTY",
            exchange="NSE",
            segment="INDEX",
            symbol="NIFTY",
            ltp=24600.0,
            timestamp="2026-09-16T09:15:00.000Z",
            sequence=1001,
        )
        self.assertFalse(dedup.is_duplicate(tick))
        dedup.record(tick)
        self.assertTrue(dedup.is_duplicate(tick))

    # ─────────────────────────────────────────────────────────────────────────
    # 7. MarketDataCache Multi-Key Aliasing
    # ─────────────────────────────────────────────────────────────────────────

    def test_market_data_cache_aliasing(self):
        cache = MarketDataCache()
        tick = MarketTick(
            provider="fyers",
            providerInstrumentId="NSE:RELIANCE-EQ",
            internalInstrumentId="RELIANCE",
            exchange="NSE",
            segment="EQUITY",
            symbol="RELIANCE",
            ltp=2845.0,
            volume=50000.0,
        )
        cache.put(tick)

        # Query by raw symbol
        self.assertIsNotNone(cache.get("RELIANCE"))
        # Query by exchange prefix
        self.assertIsNotNone(cache.get("NSE:RELIANCE"))
        # Query by provider instrument id
        self.assertIsNotNone(cache.get("NSE:RELIANCE-EQ"))

        cached = cache.get("NSE:RELIANCE")
        self.assertEqual(cached.ltp, 2845.0)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Simulation Feed Adapter
    # ─────────────────────────────────────────────────────────────────────────

    def test_simulation_feed_adapter(self):
        async def run_sim_test():
            sim = SimulationFeedAdapter()
            await sim.connect()
            self.assertIn(sim.get_status(), ("CONNECTED", "LIVE"))

            received = []
            sim.set_quote_callback(lambda q: received.append(q))
            await sim.subscribe(["NIFTY", "BTC/USDT"])

            # Let simulation emit ticks
            await asyncio.sleep(0.3)
            await sim.disconnect()

            self.assertGreater(len(received), 0)
            self.assertIn(received[0].provider, ("simulation", "sim_feed"))
            self.assertEqual(received[0].data_mode, "SIMULATION")

        self.loop.run_until_complete(run_sim_test())

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Instrument Resolver
    # ─────────────────────────────────────────────────────────────────────────

    def test_instrument_resolver(self):
        resolver = InstrumentResolver()
        self.assertEqual(resolver.resolve("NIFTY", "fyers"), "NSE:NIFTY50-INDEX")
        self.assertEqual(resolver.resolve("NIFTY", "upstox"), "NSE_INDEX|Nifty 50")
        self.assertEqual(resolver.resolve("BTC", "delta"), "BTCUSD")
        self.assertEqual(resolver.resolve("RELIANCE", "dhan"), "2885")


if __name__ == "__main__":
    unittest.main()
