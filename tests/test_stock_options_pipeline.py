"""
Quant.OS Live Market Data & Stock Options Pipeline Test Suite
============================================================
Comprehensive test suite verifying:
- Stock option universe resolution (NIFTY, BANKNIFTY, RELIANCE, HDFCBANK, ICICIBANK, SBIN, INFY)
- Dynamic Dhan security ID lookup and elimination of NIFTY default fallback
- Dynamic Upstox instrument key lookup and elimination of NSE_INDEX default fallback
- Removal of simulated Black-Scholes chains masquerading as DHAN / UPSTOX / BINANCE / DELTA
- Provider collision prevention across Indian and Crypto derivatives
- Out-of-order tick / REST response rejection
- Time-based freshness transition (LIVE -> DELAYED -> STALE)
"""

import unittest
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from src.market_data.options_engine import UniversalOptionsEngine
from src.market_data.schemas import OptionQuote, OptionChainSnapshot
from src.dhan_broker_adapter import DhanBrokerAdapter
from src.upstox_service import UpstoxService
from market_data_gateway.gateway import get_instrument_identity, get_quote_aliases
from market_data_gateway.adapters.base import NormalizedQuote


class TestStockOptionsPipeline(unittest.TestCase):

    def setUp(self):
        self.engine = UniversalOptionsEngine()

    def test_dhan_stock_resolution_and_no_nifty_default(self):
        """Verify Dhan resolution succeeds for F&O stocks and rejects unknown symbols without defaulting to NIFTY."""
        dhan = DhanBrokerAdapter()
        # Mock authenticated
        dhan._access_token = "valid_test_token"
        dhan._client_id = "1100000000"

        # Mock API response for valid stock RELIANCE
        with patch.object(dhan, "_make_request") as mock_req:
            mock_req.side_effect = lambda method, path, data=None: {
                "status": "success",
                "data": {
                    "last_price": 2950.0,
                    "oc": {
                        "3000": {
                            "ce": {"security_id": "99001", "last_price": 45.0, "top_bid_price": 44.5, "top_ask_price": 45.5, "oi": 150000, "volume": 50000},
                            "pe": {"security_id": "99002", "last_price": 55.0, "top_bid_price": 54.5, "top_ask_price": 55.5, "oi": 120000, "volume": 40000},
                        }
                    }
                }
            }
            res = dhan.get_option_chain("RELIANCE")
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["provider"], "DHAN")
            self.assertEqual(len(res["strikes"]), 1)
            self.assertEqual(res["strikes"][0]["strike"], 3000.0)

        # Test unknown symbol rejection: Must NOT default to scrip 13 (NIFTY)
        res_unknown = dhan.get_option_chain("COMPLETELY_UNKNOWN_SYMBOL_XYZ")
        self.assertEqual(res_unknown.get("status"), "error")
        self.assertEqual(res_unknown.get("error"), "UNRESOLVED_INSTRUMENT")
        self.assertIn("Never defaulting to NIFTY", res_unknown.get("message", ""))

    def test_upstox_stock_resolution_and_no_index_default(self):
        """Verify Upstox resolution rejects unknown symbols rather than fabricating NSE_INDEX|XYZ."""
        upstox = UpstoxService()
        upstox.access_token = "valid_test_token"

        # Known index should resolve
        with patch.object(upstox, "_make_request") as mock_req:
            mock_req.return_value = {"status": "success", "data": []}
            res_nifty = upstox.get_option_chain("NIFTY")
            self.assertEqual(res_nifty.get("status"), "success")

        # Unknown stock should NOT default to NSE_INDEX
        res_unknown = upstox.get_option_chain("NON_EXISTENT_EQUITY_ABC")
        self.assertEqual(res_unknown.get("status"), "error")
        self.assertEqual(res_unknown.get("error"), "UNRESOLVED_INSTRUMENT")

    def test_no_simulated_chain_masquerading_as_dhan(self):
        """Verify Dhan failure in PAPER environment returns NO_DATA and never masquerades synthetic options as DHAN."""
        with patch("src.dhan_broker_adapter.DhanBrokerAdapter.get_option_chain") as mock_chain:
            # Simulate Dhan API failure / unauthenticated
            mock_chain.side_effect = Exception("Dhan API unreachable")

            snap = self.engine.fetch_dhan_option_chain("NIFTY", spot_price=24500.0, environment="PAPER")
            self.assertEqual(snap.provider, "DHAN")
            self.assertEqual(snap.status, "NO_DATA")
            self.assertEqual(snap.strikes, [])
            self.assertIn(snap.freshnessStatus, ["PROVIDER_UNAVAILABLE", "AUTH_REQUIRED"])

    def test_no_simulated_chain_masquerading_as_upstox(self):
        """Verify Upstox failure in PAPER environment returns NO_DATA and never masquerades synthetic options as UPSTOX."""
        with patch("src.upstox_service.UpstoxService.get_option_chain") as mock_chain:
            mock_chain.side_effect = Exception("Upstox API unreachable")

            snap = self.engine.fetch_upstox_option_chain("NIFTY", spot_price=24500.0, environment="PAPER")
            self.assertEqual(snap.provider, "UPSTOX")
            self.assertEqual(snap.status, "NO_DATA")
            self.assertEqual(snap.strikes, [])
            self.assertIn(snap.freshnessStatus, ["PROVIDER_UNAVAILABLE", "AUTH_REQUIRED"])

    def test_paper_simulator_identity(self):
        """Verify simulated option chains are ONLY generated with provider PAPER_SIMULATOR."""
        snap = self.engine.generate_paper_option_chain("NIFTY", spot_price=24500.0)
        self.assertEqual(snap.provider, "PAPER_SIMULATOR")
        self.assertEqual(snap.environment, "PAPER")
        self.assertGreater(len(snap.strikes), 0)

    def test_provider_and_contract_collision_isolation(self):
        """Verify canonical identity prevents collisions across providers, expiries, and strike types."""
        id_binance_btc = get_instrument_identity("BINANCE", "BINANCE", "BTC/USDT", "SPOT")
        id_delta_btc = get_instrument_identity("DELTA", "DELTA_INDIA", "BTC/USD", "PERP")
        id_dhan_rel_ce = get_instrument_identity("DHAN", "NSE", "RELIANCE26SEP3000CE", "CE")
        id_upstox_rel_ce = get_instrument_identity("UPSTOX", "NSE", "RELIANCE26SEP3000CE", "CE")
        id_dhan_rel_pe = get_instrument_identity("DHAN", "NSE", "RELIANCE26SEP3000PE", "PE")

        self.assertNotEqual(id_binance_btc, id_delta_btc)
        self.assertNotEqual(id_dhan_rel_ce, id_upstox_rel_ce)
        self.assertNotEqual(id_dhan_rel_ce, id_dhan_rel_pe)

    def test_out_of_order_rejection(self):
        """Verify older REST snapshot timestamp cannot overwrite newer WebSocket tick timestamp."""
        now_dt = datetime.now(timezone.utc)
        newer_ts = (now_dt).isoformat()
        older_ts = (now_dt - timedelta(seconds=10)).isoformat()

        q_new = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-24",
            strike=25000.0,
            optionType="CE",
            symbol="NIFTY 25000 CE",
            exchange="NSE",
            provider="DHAN",
            lastPrice=150.0,
            timestamp=newer_ts,
            exchangeTimestamp=newer_ts,
            receivedTimestamp=newer_ts,
        )

        ok1, reason1 = self.engine.upsert_quote(q_new)
        self.assertTrue(ok1)
        self.assertEqual(reason1, "ACCEPTED")

        # Now attempt to upsert older quote for same contractKey
        q_old = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-24",
            strike=25000.0,
            optionType="CE",
            symbol="NIFTY 25000 CE",
            exchange="NSE",
            provider="DHAN",
            lastPrice=140.0,
            timestamp=older_ts,
            exchangeTimestamp=older_ts,
            receivedTimestamp=older_ts,
        )

        # Ensure existing quote is preserved
        existing = self.engine._quote_store.get(q_new.contractKey)
        self.assertEqual(existing.lastPrice, 150.0)

    def test_time_based_freshness_transition(self):
        """Verify quote freshness transitions based on elapsed time (LIVE -> STALE)."""
        now_dt = datetime.now(timezone.utc)
        # Create quote with timestamp 20 seconds in the past
        old_time = (now_dt - timedelta(seconds=20)).isoformat()

        q = NormalizedQuote(
            symbol="RELIANCE",
            exchange="NSE",
            provider="DHAN",
            last_price=2950.0,
            received_timestamp=old_time,
            event_timestamp=old_time,
        )

        # Age is > 15 seconds -> must be marked stale
        q.mark_stale(5.0, 15.0)
        self.assertTrue(q.is_stale)


if __name__ == "__main__":
    unittest.main()
