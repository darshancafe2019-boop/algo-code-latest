"""
Comprehensive Verification Suite: Indian Market & Upstox V3 Integration
========================================================================
Tests:
1. Upstox Service (Instrument key resolution, authorization signature, funds)
2. Canonical Instrument Resolver (Target Indian symbols & indices)
3. Provider Manager Safe Routing (Indian Equities vs Crypto Perpetuals)
4. Multi-Market Confluence Strategy Evaluation on Indian Market Data
5. Upstox Broker Adapter Dual-Mode Order Execution & Indian Tax/Slippage Simulation
6. Gateway Adapter Registration & Failover Chain
7. Official Upstox V3 Protobuf Binary Frame Decoding
"""

import sys
import unittest
import pandas as pd
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config
from src.upstox_service import UpstoxService, global_upstox_service, OFFICIAL_UPSTOX_KEYS
from src.instrument_resolver import InstrumentResolver, AssetClass, InstrumentType, ResolutionStatus
from src.provider_manager import ProviderManager, global_provider_manager, UpstoxMarketAdapter
from src.upstox_broker_adapter import UpstoxBrokerAdapter, global_upstox_broker_adapter
from src.indicators import generate_indicators
from src.strategy import Strategy
from market_data_gateway.adapters.upstox_ws import UpstoxWSAdapter
from market_data_gateway.failover_manager import FAILOVER_CHAINS
from market_data_gateway.upstox_protobuf_decoder import (
    FeedResponse, Feed, LTPC, decode_market_data_feed
)


class TestIndianMarketIntegration(unittest.TestCase):

    def setUp(self):
        self.service = global_upstox_service
        self.resolver = InstrumentResolver()
        self.provider_mgr = global_provider_manager
        self.broker = global_upstox_broker_adapter

    def test_01_instrument_key_resolution(self):
        """Verify all target Indian stocks and indices resolve to official Upstox keys."""
        target_symbols = [
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
        for sym, expected_key in target_symbols:
            resolved_key = self.service.resolve_instrument_key(sym)
            self.assertEqual(resolved_key, expected_key, f"Resolution failed for {sym}")

    def test_02_canonical_resolver(self):
        """Verify Canonical Instrument Resolver resolves Indian equities and indices."""
        for sym in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "NIFTY", "BANKNIFTY"]:
            res = self.resolver.resolve(sym)
            self.assertTrue(res.is_valid, f"Canonical resolution failed for {sym}: {res.reason}")
            self.assertEqual(res.instrument.asset_class, AssetClass.INDIAN_STOCKS)
            self.assertEqual(res.instrument.quote_asset, "INR")

    def test_03_protobuf_binary_frame_decoding(self):
        """Verify Upstox V3 Protobuf binary frames are correctly decoded into LTP and OHLC."""
        resp = FeedResponse()
        resp.type = 1  # live_feed
        resp.currentTs = 1724938123456
        f = Feed()
        f.ltpc.ltp = 24520.75
        f.ltpc.ltt = 1724938120000
        f.ltpc.cp = 24450.0
        resp.feeds["NSE_INDEX|Nifty 50"].CopyFrom(f)

        binary_data = resp.SerializeToString()
        self.assertGreater(len(binary_data), 0)

        decoded = decode_market_data_feed(binary_data)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["type"], "live_feed")
        self.assertIn("NSE_INDEX|Nifty 50", decoded["feeds"])
        feed_item = decoded["feeds"]["NSE_INDEX|Nifty 50"]
        self.assertEqual(feed_item["ltp"], 24520.75)
        self.assertEqual(feed_item["cp"], 24450.0)

    def test_04_upstox_service_auth_guard(self):
        """Verify Upstox service truthfully reports unauthenticated state when token is missing."""
        test_svc = UpstoxService(access_token="")
        self.assertFalse(test_svc.is_authenticated)
        auth_res = test_svc.authorize_market_data_feed()
        self.assertFalse(auth_res["success"])
        self.assertEqual(auth_res["error"], "UPSTOX_ACCESS_TOKEN_MISSING")

        # Quotes must return empty dict instead of fake data
        quotes = test_svc.fetch_market_quotes(["RELIANCE", "NIFTY"])
        self.assertEqual(quotes, {})

        # Candles must return empty DataFrame instead of fake candles
        df = test_svc.fetch_historical_candles("RELIANCE")
        self.assertTrue(df.empty)
        self.assertIn("close", df.columns)

    def test_05_strategy_evaluation_on_candles(self):
        """Verify that existing multi-indicator confluence strategy evaluates DataFrame candles without modification."""
        sample_data = []
        base = 2900.0
        for i in range(250):
            sample_data.append({
                "timestamp": pd.Timestamp("2026-08-01") + pd.Timedelta(minutes=15 * i),
                "open": base + i * 0.1,
                "high": base + i * 0.1 + 5.0,
                "low": base + i * 0.1 - 5.0,
                "close": base + i * 0.1 + 2.0,
                "volume": 10000.0 + i * 50,
            })
        df = pd.DataFrame(sample_data)
        df_ind = generate_indicators(df)
        self.assertIn("ema_9", df_ind.columns)
        self.assertIn("ema_200", df_ind.columns)
        self.assertIn("macd_hist", df_ind.columns)

        strat = Strategy()
        signal, score, details = strat.evaluate_confluence(df_ind, idx=len(df_ind) - 1)
        self.assertIn(signal, ["BUY", "SELL", "HOLD"])
        self.assertIsInstance(score, (int, float))

    def test_06_provider_manager_routing(self):
        """Verify Provider Manager routes Indian instruments to Upstox and Crypto to Binance."""
        res_ind = self.resolver.resolve("RELIANCE")
        self.assertTrue(res_ind.is_valid)
        adapter_ind = self.provider_mgr.route_instrument(res_ind.instrument)
        self.assertEqual(adapter_ind.provider_id, "upstox")

        res_crypto = self.resolver.resolve("BTC/USDT")
        self.assertTrue(res_crypto.is_valid)
        adapter_crypto = self.provider_mgr.route_instrument(res_crypto.instrument)
        self.assertEqual(adapter_crypto.provider_id, "binance_spot")

    def test_07_upstox_broker_paper_execution(self):
        """Verify Upstox Broker Adapter simulates paper trades with realistic slippage and statutory Indian transaction costs."""
        order = self.broker.place_order(symbol="RELIANCE", side="BUY", quantity=10, price=2980.0)
        self.assertTrue(order["success"])
        self.assertEqual(order["status"], "FILLED")
        self.assertEqual(order["execution_mode"], "PAPER")
        self.assertGreater(order["fees"], 0.0, "Indian transaction fees must be non-zero")
        self.assertGreater(order["average_price"], 0.0)

        # Check position ledger
        positions = self.broker.get_positions()
        rel_pos = [p for p in positions if p["symbol"] == "RELIANCE"]
        self.assertTrue(len(rel_pos) > 0)
        self.assertEqual(rel_pos[0]["quantity"], 10)

    def test_08_gateway_and_failover_chains(self):
        """Verify Gateway failover chains prioritize Upstox for Indian Equities, Indices, and Options."""
        self.assertIn("upstox_ws", FAILOVER_CHAINS["INDIAN_EQUITIES"])
        self.assertEqual(FAILOVER_CHAINS["INDIAN_EQUITIES"][0], "upstox_ws")
        self.assertEqual(FAILOVER_CHAINS["INDIAN_INDICES"][0], "upstox_ws")
        self.assertEqual(FAILOVER_CHAINS["OPTIONS"][0], "upstox_ws")

        ws_adapter = UpstoxWSAdapter()
        self.assertEqual(ws_adapter.provider_id, "upstox_ws")


if __name__ == "__main__":
    unittest.main()
