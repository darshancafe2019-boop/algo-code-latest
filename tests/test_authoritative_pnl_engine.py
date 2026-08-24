"""
Unit and Integration Tests for Quant.OS Authoritative Global Data & P&L Engine
"""

import unittest
from datetime import datetime, timezone
from src.pnl_engine import compute_authoritative_pnl, compute_unrealized_pnl, normalize_currency_amount
from src.global_data_engine import GlobalDataEngine


class TestAuthoritativePnLEngine(unittest.TestCase):

    def test_long_pnl_calculation(self):
        """Verify Long position realized P&L with fees, slippage, and funding."""
        result = compute_authoritative_pnl(
            direction="LONG",
            entry_price=60000.0,
            exit_price=65000.0,
            quantity=0.5,
            fees=12.50,
            slippage=5.0,
            funding=2.50,
            taxes=0.0,
            stop_loss=58000.0,
            currency="USD",
        )
        # Gross = (65000 - 60000) * 0.5 = 2500.0
        self.assertEqual(result["gross_pnl"], 2500.0)
        # Total costs = 12.50 + 5.0 + 2.50 = 20.0
        self.assertEqual(result["total_costs"], 20.0)
        # Net = 2500.0 - 20.0 = 2480.0
        self.assertEqual(result["net_pnl"], 2480.0)
        self.assertTrue(result["is_win"])
        self.assertFalse(result["is_loss"])

    def test_short_pnl_calculation(self):
        """Verify Short position realized P&L with fees and slippage."""
        result = compute_authoritative_pnl(
            direction="SHORT",
            entry_price=65000.0,
            exit_price=62000.0,
            quantity=1.0,
            fees=25.0,
            slippage=10.0,
            funding=0.0,
            taxes=0.0,
            stop_loss=66500.0,
            currency="USD",
        )
        # Gross = (65000 - 62000) * 1.0 = 3000.0
        self.assertEqual(result["gross_pnl"], 3000.0)
        # Net = 3000.0 - 35.0 = 2965.0
        self.assertEqual(result["net_pnl"], 2965.0)
        self.assertTrue(result["is_win"])

    def test_short_loss_calculation(self):
        """Verify Short position loss calculation."""
        result = compute_authoritative_pnl(
            direction="SHORT",
            entry_price=60000.0,
            exit_price=63000.0,
            quantity=1.0,
            fees=20.0,
            currency="USD",
        )
        # Gross = (60000 - 63000) * 1.0 = -3000.0
        self.assertEqual(result["gross_pnl"], -3000.0)
        # Net = -3000.0 - 20.0 = -3020.0
        self.assertEqual(result["net_pnl"], -3020.0)
        self.assertTrue(result["is_loss"])

    def test_unrealized_pnl_mark_to_market(self):
        """Verify mark-to-market unrealized P&L evaluation."""
        unrealized = compute_unrealized_pnl(
            direction="LONG",
            entry_price=64000.0,
            live_price=65600.0,
            quantity=0.25,
            fees=4.0,
        )
        # Gross unrealized = (65600 - 64000) * 0.25 = 400.0
        # Net unrealized = 400.0 - 4.0 = 396.0
        self.assertEqual(unrealized["unrealized_pnl"], 396.0)

    def test_currency_normalization(self):
        """Verify multi-currency normalization to USD base."""
        inr_norm = normalize_currency_amount(100000.0, from_currency="INR", to_currency="USD")
        self.assertTrue(inr_norm["is_converted"])
        self.assertAlmostEqual(inr_norm["normalized_amount"], 1150.0, places=1)

        usdt_norm = normalize_currency_amount(5000.0, from_currency="USDT", to_currency="USD")
        self.assertFalse(usdt_norm["is_converted"])
        self.assertEqual(usdt_norm["normalized_amount"], 5000.0)

    def test_global_data_engine_snapshot(self):
        """Verify canonical portfolio snapshot construction from GlobalDataEngine."""
        gde = GlobalDataEngine.get_instance()
        snapshot = gde.get_portfolio_snapshot(mode="PAPER")
        
        self.assertEqual(snapshot["mode"], "PAPER")
        self.assertEqual(snapshot["baseCurrency"], "USD")
        self.assertGreater(snapshot["equity"], 0)
        self.assertIn("winRate", snapshot)
        self.assertIn("profitFactor", snapshot)
        self.assertIn("reconciliationStatus", snapshot)
        self.assertIn("accountingMethod", snapshot)

    def test_provider_capability_matrix(self):
        """Verify provider catalog contains all integrated adapters."""
        gde = GlobalDataEngine.get_instance()
        providers = gde.get_provider_capabilities()
        p_ids = {p["provider_id"] for p in providers}
        
        self.assertIn("binance_ws", p_ids)
        self.assertIn("angelone", p_ids)
        self.assertIn("yahoo_fallback", p_ids)
        self.assertIn("twelve_data", p_ids)
        self.assertIn("polygon", p_ids)
        self.assertIn("databento", p_ids)


if __name__ == "__main__":
    unittest.main()
