"""
Unit Tests for Quant.OS Portfolio Performance Intelligence Engine & High Water Mark
===================================================================================
Tests High Water Mark, Drawdown, Distance from Peak, Recovery Factor, Range Filters,
Events, and Contribution Analytics.
"""

import unittest
from datetime import datetime, timezone, timedelta
import dashboard
from src import db
from src.global_data_engine import GlobalDataEngine

class TestPortfolioPerformanceIntelligence(unittest.TestCase):
    def setUp(self):
        self.app = dashboard.app.test_client()
        self.app.testing = True
        self.engine = GlobalDataEngine.get_instance()
        db.init_db()

    def test_01_high_water_mark_and_drawdown_math(self):
        """Validates that HWM is monotonically non-decreasing and drawdown is mathematically correct."""
        res = self.engine.get_equity_curve(mode="PAPER", time_range="ALL")
        self.assertEqual(res["status"], "success")
        self.assertIn("summary", res)
        self.assertIn("points", res)
        self.assertIn("events", res)
        self.assertIn("contributions", res)

        points = res["points"]
        self.assertGreater(len(points), 0)

        prev_hwm = 0.0
        for pt in points:
            eq = pt["equity"]
            hwm = pt["highWaterMark"]
            dd_pct = pt["drawdownPct"]

            # 1. HWM must never decrease
            self.assertGreaterEqual(hwm, prev_hwm, f"HWM decreased from {prev_hwm} to {hwm}")
            prev_hwm = hwm

            # 2. HWM must be >= Equity
            self.assertGreaterEqual(hwm, eq, f"HWM {hwm} is less than Equity {eq}")

            # 3. Drawdown % must be <= 0.0
            self.assertLessEqual(dd_pct, 0.0001, f"Drawdown % is positive: {dd_pct}")

    def test_02_kpi_summary_contract(self):
        """Validates that summary KPIs match portfolio state."""
        res = self.engine.get_equity_curve(mode="PAPER", time_range="ALL")
        summary = res["summary"]

        self.assertIn("startingEquity", summary)
        self.assertIn("currentEquity", summary)
        self.assertIn("netPnl", summary)
        self.assertIn("totalReturnPct", summary)
        self.assertIn("highWaterMark", summary)
        self.assertIn("distanceFromPeakPct", summary)
        self.assertIn("maxDrawdownPct", summary)
        self.assertIn("recoveryFactor", summary)

        self.assertAlmostEqual(summary["currentEquity"] - summary["startingEquity"], summary["netPnl"], places=2)
        self.assertGreaterEqual(summary["highWaterMark"], summary["currentEquity"])

    def test_03_time_range_filters(self):
        """Verifies that different time range selectors function correctly."""
        ranges = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"]
        for r in ranges:
            res = self.engine.get_equity_curve(mode="PAPER", time_range=r)
            self.assertEqual(res["status"], "success")
            self.assertIsInstance(res["points"], list)

    def test_04_contribution_breakdown_schema(self):
        """Verifies that contribution breakdown includes bot, strategy, symbol, and asset class."""
        res = self.engine.get_equity_curve(mode="PAPER", time_range="ALL")
        contribs = res["contributions"]

        self.assertIn("by_bot", contribs)
        self.assertIn("by_strategy", contribs)
        self.assertIn("by_symbol", contribs)
        self.assertIn("by_asset_class", contribs)

    def test_05_api_portfolio_equity_curve_endpoint(self):
        """Validates REST API endpoint response for /api/portfolio/equity-curve."""
        resp = self.app.get("/api/portfolio/equity-curve?mode=PAPER&range=1M")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        self.assertEqual(data["status"], "success")
        self.assertEqual(data["mode"], "PAPER")
        self.assertIn("summary", data)
        self.assertIn("points", data)
        self.assertIn("events", data)
        self.assertIn("contributions", data)

if __name__ == "__main__":
    unittest.main()
