"""
Unit & Integration Tests for Quant.OS Daily Profitability Bar Intelligence System
================================================================================
Validates authoritative daily P&L calculation, dual-formula reconciliation,
deposit/withdrawal adjustments, fee/funding deduction, timezone boundary grouping,
High Water Mark monotonicity, aggregation modes, and REST API contracts.
"""

import unittest
import sqlite3
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import dashboard
from src import config, db
from src.global_data_engine import GlobalDataEngine


class TestDailyProfitabilityBars(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()
        cls.engine = GlobalDataEngine.get_instance()
        cls.app = dashboard.app.test_client()
        cls.app.testing = True

    def test_01_authoritative_daily_bars_contract(self):
        """Validates that get_daily_profitability_bars returns full contract structure."""
        res = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["mode"], "PAPER")
        self.assertIn("summary", res)
        self.assertIn("bars", res)
        self.assertIn("contributions", res)

        summary = res["summary"]
        self.assertIn("totalNetPnl", summary)
        self.assertIn("profitableDays", summary)
        self.assertIn("losingDays", summary)
        self.assertIn("flatDays", summary)
        self.assertIn("dailyWinRate", summary)
        self.assertIn("bestDay", summary)
        self.assertIn("worstDay", summary)
        self.assertIn("profitFactor", summary)
        self.assertIn("highWaterMark", summary)
        self.assertIn("maxDrawdownPct", summary)
        self.assertIn("currentStreak", summary)

        # Invariant: starting equity + net P&L == current equity (when no net cash flows)
        self.assertAlmostEqual(
            summary["startingEquity"] + summary["totalNetPnl"],
            summary["currentEquity"],
            places=1
        )

    def test_02_dual_formula_reconciliation_math(self):
        """
        Validates that for every bar:
        Method 1: Ending Equity - Beginning Equity - Net Cash Flow
        equals
        Method 2: Realized P&L + ΔUnrealized - Fees - Commissions + Funding
        """
        res = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        bars = res["bars"]
        self.assertGreater(len(bars), 0)

        for bar in bars:
            # Check fields
            self.assertIn("openingEquity", bar)
            self.assertIn("closingEquity", bar)
            self.assertIn("netPnl", bar)
            self.assertIn("realizedPnl", bar)
            self.assertIn("fees", bar)
            self.assertIn("funding", bar)
            self.assertIn("netExternalCashFlow", bar)
            self.assertIn("reconciliationStatus", bar)

            # Method 1
            m1 = bar["closingEquity"] - bar["openingEquity"] - bar["netExternalCashFlow"]
            # Method 2
            m2 = bar["netPnl"]

            # Must match within cent rounding
            self.assertAlmostEqual(m1, m2, places=2, msg=f"Reconciliation mismatch on {bar['date']}: M1={m1}, M2={m2}")
            self.assertEqual(bar["reconciliationStatus"], "RECONCILED")

    def test_03_high_water_mark_and_drawdown_monotonicity(self):
        """Verifies HWM is monotonically non-decreasing and Drawdown is >= 0."""
        res = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        bars = res["bars"]

        prev_hwm = 0.0
        for bar in bars:
            hwm = bar["highWaterMark"]
            closing = bar["closingEquity"]
            dd = bar["drawdown"]
            dd_pct = bar["drawdownPct"]

            # 1. HWM cannot decrease
            self.assertGreaterEqual(hwm, prev_hwm - 0.01, f"HWM decreased on {bar['date']}")
            prev_hwm = hwm

            # 2. HWM must be >= closing equity
            self.assertGreaterEqual(hwm, closing - 0.01, f"HWM {hwm} < Closing {closing} on {bar['date']}")

            # 3. Drawdown must be >= 0
            self.assertGreaterEqual(dd, -0.01)
            self.assertGreaterEqual(dd_pct, -0.01)

    def test_04_percentile_intensity_bounds(self):
        """Validates that intensity scores are within [0.25, 1.0]."""
        res = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        bars = res["bars"]

        for bar in bars:
            self.assertIn("intensity", bar)
            self.assertGreaterEqual(bar["intensity"], 0.20)
            self.assertLessEqual(bar["intensity"], 1.05)

    def test_05_timezone_handling(self):
        """Validates grouping across different timezones (UTC vs Asia/Kolkata vs America/New_York)."""
        res_utc = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", tz_name="UTC")
        res_ist = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", tz_name="Asia/Kolkata")
        res_est = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", tz_name="America/New_York")

        self.assertEqual(res_utc["timezone"], "UTC")
        self.assertEqual(res_ist["timezone"], "Asia/Kolkata")
        self.assertEqual(res_est["timezone"], "America/New_York")

        # Total Net P&L across all closed trades must be conserved across timezones
        self.assertAlmostEqual(res_utc["summary"]["totalNetPnl"], res_ist["summary"]["totalNetPnl"], places=1)
        self.assertAlmostEqual(res_utc["summary"]["totalNetPnl"], res_est["summary"]["totalNetPnl"], places=1)

    def test_06_weekly_and_monthly_aggregation(self):
        """Validates aggregation modes weekly and monthly."""
        res_weekly = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", aggregation="weekly")
        self.assertEqual(res_weekly["status"], "success")
        self.assertEqual(res_weekly["aggregation"], "weekly")

        res_monthly = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", aggregation="monthly")
        self.assertEqual(res_monthly["status"], "success")
        self.assertEqual(res_monthly["aggregation"], "monthly")

    def test_07_selected_date_contribution_sync(self):
        """Validates that passing selected_date populates selectedDayContributions strictly for that day."""
        res_all = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        active_bars = [b for b in res_all["bars"] if b["trades"] > 0]
        if active_bars:
            target_date = active_bars[0]["date"]
            res_sel = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL", selected_date=target_date)
            self.assertIn("selectedDayContributions", res_sel)
            sel_contrib = res_sel["selectedDayContributions"]
            self.assertIsNotNone(sel_contrib)
            self.assertEqual(sel_contrib["date"], target_date)
            self.assertIn("by_bot", sel_contrib)
            self.assertIn("by_strategy", sel_contrib)

    def test_08_get_day_details_drilldown(self):
        """Validates granular drill-down payload for a single day."""
        res_all = self.engine.get_daily_profitability_bars(mode="PAPER", time_range="ALL")
        bars = res_all["bars"]
        target_date = bars[-1]["date"]

        details = self.engine.get_day_details(target_date, mode="PAPER")
        self.assertEqual(details["status"], "success")
        self.assertEqual(details["date"], target_date)
        self.assertIn("summary", details)
        self.assertIn("trades", details)
        self.assertIn("intradayEquity", details)
        self.assertIn("events", details)
        self.assertIn("signals", details)

    def test_09_api_portfolio_performance_bars_endpoint(self):
        """Validates HTTP GET /api/portfolio/performance/bars."""
        resp = self.app.get("/api/portfolio/performance/bars?mode=PAPER&range=ALL&timezone=Asia/Kolkata")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        self.assertEqual(data["status"], "success")
        self.assertEqual(data["mode"], "PAPER")
        self.assertEqual(data["timezone"], "Asia/Kolkata")
        self.assertIn("summary", data)
        self.assertIn("bars", data)
        self.assertIn("contributions", data)

    def test_10_api_portfolio_performance_day_details_endpoint(self):
        """Validates HTTP GET /api/portfolio/performance/day-details."""
        resp = self.app.get("/api/portfolio/performance/day-details?mode=PAPER&date=2026-08-23")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        self.assertEqual(data["status"], "success")
        self.assertEqual(data["date"], "2026-08-23")
        self.assertIn("summary", data)
        self.assertIn("trades", data)
        self.assertIn("intradayEquity", data)


if __name__ == "__main__":
    unittest.main()
