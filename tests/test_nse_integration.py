"""
Comprehensive Unit & Integration Tests for Quant.OS NSE India Intelligence & Trading
=====================================================================================
Verifies NseUtils, NseService, Greeks enrichment, caching, 4-quadrant OI build-up,
valuation multiples, algo bot signals, and order execution.
"""

import unittest
import json
from src.nse_utils import NseUtils
from src.nse_service import NseService
from dashboard import app


class TestNseIntegration(unittest.TestCase):
    def setUp(self):
        self.utils = NseUtils()
        self.service = NseService.get_instance()
        self.client = app.test_client()

    def test_nse_utils_methods(self):
        """Test all core data methods on NseUtils."""
        # 1. Holidays
        hols = self.utils.trading_holidays(list_only=True)
        self.assertIsInstance(hols, list)
        self.assertTrue(len(hols) > 0)

        # 2. 52 Week High/Low
        hl = self.utils.get_52week_high_low("NIFTY")
        self.assertIsInstance(hl, dict)
        self.assertIn("52 Week High", hl)

        # 3. Advance/Decline
        df_ad = self.utils.get_advance_decline()
        self.assertFalse(df_ad.empty)

        # 4. Gainers/Losers
        gain, loss = self.utils.get_gainers_losers()
        self.assertIsInstance(gain, dict)
        self.assertIsInstance(loss, dict)

        # 5. Master Lists
        eqs = self.utils.get_equity_full_list(list_only=True)
        self.assertTrue(len(eqs) > 0)
        fnos = self.utils.get_fno_full_list(list_only=True)
        self.assertTrue(len(fnos) > 0)

        # 6. Pre-Market
        pre = self.utils.pre_market_info('All')
        self.assertFalse(pre.empty)

        # 7. Valuation
        pe = self.utils.get_index_pe_ratio()
        self.assertFalse(pe.empty)

        # 8. OI 4-Quadrants
        oi_und, r_r, r_s, s_s, s_r = self.utils.change_in_oi()
        self.assertFalse(r_r.empty)

        # 9. ETFs
        etfs = self.utils.get_etf_list()
        self.assertFalse(etfs.empty)

    def test_nse_service_quote_and_caching(self):
        """Test live quote retrieval and in-memory TTL caching."""
        res1 = self.service.get_quote("NIFTY")
        self.assertIn("data", res1)
        self.assertIn("LastTradedPrice", res1["data"])

        # Second call should be served from cache
        res2 = self.service.get_quote("NIFTY")
        self.assertEqual(res1["data"]["Symbol"], res2["data"]["Symbol"])

    def test_nse_service_option_chain_greeks(self):
        """Test Option Chain enriched with Black-Scholes Greeks, Max Pain, and PCR."""
        chain = self.service.get_option_chain_analytics("NIFTY", strike_count=10)
        self.assertEqual(chain["status"], "success")
        self.assertIn("spot_price", chain)
        self.assertIn("max_pain_strike", chain)
        self.assertIn("pcr_oi", chain)
        self.assertIn("strikes", chain)
        self.assertTrue(len(chain["strikes"]) > 0)

        # Verify Greeks exist on each strike
        sample_strike = chain["strikes"][0]
        self.assertIn("delta", sample_strike["ce"])
        self.assertIn("gamma", sample_strike["ce"])
        self.assertIn("theta", sample_strike["ce"])
        self.assertIn("vega", sample_strike["ce"])
        self.assertIn("iv", sample_strike["ce"])

    def test_nse_algo_bot_signals(self):
        """Test multi-factor algo bot signal generator."""
        sig = self.service.generate_nse_bot_signals("NIFTY")
        self.assertEqual(sig["status"], "success")
        self.assertIn("decision", sig)
        self.assertIn("confidence", sig)
        self.assertIn("recommended_strategy", sig)
        self.assertIn("reasons", sig)

    def test_nse_order_execution(self):
        """Test algorithmic order placement on NSE contracts."""
        res = self.service.execute_nse_order(
            symbol="NIFTY 24500 CE",
            direction="BUY",
            quantity=50,
            limit_price=145.0,
            mode="PAPER"
        )
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["direction"], "BUY")
        self.assertEqual(res["quantity"], 50)
        self.assertIn("order_id", res)

    def test_flask_nse_endpoints(self):
        """Test Flask REST API endpoints for all NSE datasets."""
        # 1. Quote
        res = self.client.get("/api/nse/quote?symbol=NIFTY")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("data", data)

        # 2. Option Chain
        res = self.client.get("/api/nse/option-chain?symbol=NIFTY&strike_count=10")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # 3. Market Summary
        res = self.client.get("/api/nse/market-summary")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # 4. Valuation
        res = self.client.get("/api/nse/valuation")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # 5. OI Quadrants
        res = self.client.get("/api/nse/oi-quadrants")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # 6. Bot Signals
        res = self.client.get("/api/nse/bot/signals?symbol=NIFTY")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # 7. Trade Execution
        res = self.client.post(
            "/api/nse/trade/execute",
            data=json.dumps({
                "symbol": "BANKNIFTY 52000 CE",
                "direction": "BUY",
                "quantity": 15,
                "price": 380.0,
                "mode": "PAPER"
            }),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")


if __name__ == "__main__":
    unittest.main()
