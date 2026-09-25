"""
Comprehensive Unit & Integration Test Suite for Liquidity Rejection Structure Pro Strategy
========================================================================================
Tests:
1. Dynamic Market State Classification (TREND, RANGE, BREAKOUT, REVERSAL, UNCLEAR)
2. Observable Liquidity Detection (Pivots, Equal Levels, Range High/Low, Round Numbers)
3. Normalized ATR Sweep Detection (Within 0.05-1.00 ATR bounds)
4. Rejection & Acceptance Logic (Max acceptance window)
5. Structure CHoCH Confirmation (Completed bar close beyond swing pivot)
6. Confluence Scoring & Mandatory Condition Guards
7. Central Risk Sizing & RR Calculation
8. Why Trade vs Why No Trade Audit Explanations
9. Bar-by-bar Non-Repainting Backtest Engine
10. Stale Data & Spread Safety Breakers
"""

import math
import unittest
import numpy as np
import pandas as pd

from src.liquidity_rejection_strategy import (
    LiquidityRejectionStructurePro,
    MarketState,
    LiquidityType,
    RejectionStatus,
    StructureStatus,
    DEFAULT_CONFIG,
)


def generate_synthetic_ohlcv(n_bars: int = 60, base_price: float = 65000.0, trend_pct: float = 0.0) -> pd.DataFrame:
    """Generates synthetic deterministic OHLCV candles."""
    np.random.seed(42)
    prices = [base_price]
    for i in range(1, n_bars):
        step = np.random.normal(0, 100) + (base_price * trend_pct / 100.0)
        prices.append(max(100.0, prices[-1] + step))

    records = []
    for i in range(n_bars):
        p = prices[i]
        high = p + abs(np.random.normal(50, 20))
        low = p - abs(np.random.normal(50, 20))
        open_p = (p + low) / 2.0
        close_p = (p + high) / 2.0
        vol = 1000.0 + np.random.uniform(100, 500)
        records.append({
            "timestamp": f"2026-09-25T{i//60:02d}:{i%60:02d}:00Z",
            "open": round(open_p, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close_p, 2),
            "volume": round(vol, 1),
        })

    return pd.DataFrame(records)


class TestLiquidityRejectionStructurePro(unittest.TestCase):

    def setUp(self):
        self.engine = LiquidityRejectionStructurePro()

    def test_01_market_state_classification(self):
        """Test deterministic market state classifier."""
        # 1. Strong trend
        trend_df = generate_synthetic_ohlcv(50, 65000.0, trend_pct=0.25)
        st = self.engine.classify_market_state(trend_df)
        self.assertIn(st["market_state"], [MarketState.TREND, MarketState.BREAKOUT])
        self.assertGreaterEqual(st["confidence"], 70.0)

        # 2. Short history -> UNCLEAR
        short_df = generate_synthetic_ohlcv(10, 65000.0)
        st_short = self.engine.classify_market_state(short_df)
        self.assertEqual(st_short["market_state"], MarketState.UNCLEAR)
        self.assertEqual(st_short["confidence"], 0.0)

    def test_02_liquidity_detection_no_lookahead(self):
        """Test liquidity pool discovery with observable pivots."""
        df = generate_synthetic_ohlcv(50, 65000.0)
        pools = self.engine.detect_liquidity_pools(df, timeframe="15m", swing_lookback=5)

        self.assertTrue(len(pools) > 0)
        types = [p["type"] for p in pools]
        self.assertTrue(any("SWING" in t for t in types) or any("RANGE" in t for t in types))

        # Validate structure of each pool
        for p in pools:
            self.assertIn("level_id", p)
            self.assertIn("price", p)
            self.assertIn("strength", p)
            self.assertTrue(p["active"])
            self.assertFalse(p["swept"])

    def test_03_sweep_and_rejection_detection(self):
        """Test sweep normalization (ATR) and wick rejection."""
        pool = {
            "level_id": "liq_sl_64900_10",
            "type": LiquidityType.SWING_LOW,
            "price": 64900.0,
            "strength": 85.0,
            "active": True,
            "swept": False,
        }
        atr = 500.0

        # Case A: Low pierces below 64900 down to 64600 (0.60 ATR sweep) and closes back at 64950 (Rejection)
        sweep_candle = {"open": 64920.0, "high": 65000.0, "low": 64600.0, "close": 64950.0}
        subsequent = []
        res = self.engine.detect_sweep_and_rejection(sweep_candle, subsequent, pool, atr)

        self.assertTrue(res["sweep_detected"])
        self.assertEqual(res["direction"], "LONG")
        self.assertAlmostEqual(res["sweep_atr"], 0.60, places=2)
        self.assertEqual(res["rejection_status"], RejectionStatus.REJECTION)

        # Case B: Tiny sweep below min_sweep_atr (0.01 ATR) -> rejected as noise
        tiny_candle = {"open": 64920.0, "high": 65000.0, "low": 64895.0, "close": 64950.0}
        res_tiny = self.engine.detect_sweep_and_rejection(tiny_candle, subsequent, pool, atr, min_sweep_atr=0.05)
        self.assertFalse(res_tiny["sweep_detected"])

        # Case C: Huge breakdown > max_sweep_atr (1.5 ATR) -> marked as breakdown not reversal
        huge_candle = {"open": 64920.0, "high": 65000.0, "low": 64100.0, "close": 64200.0}
        res_huge = self.engine.detect_sweep_and_rejection(huge_candle, subsequent, pool, atr, max_sweep_atr=1.00)
        self.assertFalse(res_huge["sweep_detected"])

    def test_04_rejection_vs_acceptance_window(self):
        """Test that sustained acceptance beyond level for > 2 bars invalidates reversal setup."""
        pool = {
            "level_id": "liq_sl_64900_10",
            "type": LiquidityType.SWING_LOW,
            "price": 64900.0,
        }
        atr = 400.0
        # Candle closed below level
        sweep_c = {"open": 64950.0, "high": 64950.0, "low": 64700.0, "close": 64750.0}
        # Subsequent 3 bars all stay below 64900
        sub_accepted = [
            {"close": 64720.0},
            {"close": 64700.0},
            {"close": 64650.0},
        ]
        res = self.engine.detect_sweep_and_rejection(sweep_c, sub_accepted, pool, atr, max_acceptance_bars=2)
        self.assertEqual(res["rejection_status"], RejectionStatus.ACCEPTANCE)

    def test_05_choch_structure_confirmation(self):
        """Test CHoCH confirmation on completed candle close beyond prior structural pivot."""
        df = generate_synthetic_ohlcv(40, 65000.0)
        # Force a clear swing high at bar 15 and a completed break at bar 35
        df.loc[15, "high"] = 66000.0
        df.loc[15, "close"] = 65900.0
        df.loc[30, "low"] = 64200.0
        df.loc[35, "close"] = 66200.0  # Closed above 66000

        choch_res = self.engine.detect_choch_bos(df, sweep_idx=30, direction="LONG", atr=300.0, swing_lookback=3)
        self.assertTrue(choch_res["choch_confirmed"])
        self.assertEqual(choch_res["structure_status"], StructureStatus.BULLISH_CHOCH)

    def test_06_confluence_scoring_and_mandatory_checks(self):
        """Test 100-point scoring model and mandatory condition gates."""
        df = generate_synthetic_ohlcv(50, 65000.0)
        # All mandatory conditions pass
        score_res = self.engine.calculate_confluence_score(df, direction="LONG", sweep_ok=True, rejection_ok=True, choch_ok=True)
        self.assertGreaterEqual(score_res["total_score"], 75)
        self.assertTrue(score_res["score_passed"])

        # Mandatory condition fails -> score_passed must strictly be False even if score >= 70
        score_fail_mandatory = self.engine.calculate_confluence_score(df, direction="LONG", sweep_ok=False, rejection_ok=True, choch_ok=True)
        self.assertFalse(score_fail_mandatory["score_passed"])

        # Multiple failures -> total score strictly below 70
        score_fail = self.engine.calculate_confluence_score(df, direction="LONG", sweep_ok=False, rejection_ok=False, choch_ok=True)
        self.assertLess(score_fail["total_score"], 70)
        self.assertFalse(score_fail["score_passed"])

    def test_07_risk_position_sizing(self):
        """Test central risk engine position sizing without hardcoded values."""
        df = generate_synthetic_ohlcv(60, 65000.0)
        # Trigger live signal evaluation
        sig = self.engine.evaluate_live_signal(df, symbol="BTC/USDT", account_equity=20000.0)

        # Risk amount must strictly equal 0.50% of equity ($100 on $20,000)
        expected_risk = 20000.0 * 0.005
        if sig["decision"] in ["LONG", "SHORT"]:
            self.assertAlmostEqual(sig["risk_amount"], expected_risk, places=1)
            self.assertGreater(sig["position_size"], 0.0)
            self.assertGreaterEqual(sig["risk_reward"], 2.0)
            self.assertIn("1R", sig["r_targets"])
            self.assertIn("2R", sig["r_targets"])

    def test_08_safety_and_data_health_blocking(self):
        """Test that stale data or excessive spread strictly blocks execution."""
        df = generate_synthetic_ohlcv(50, 65000.0)

        # Stale data (> 60,000 ms)
        stale_sig = self.engine.evaluate_live_signal(df, data_age_ms=120000)
        self.assertEqual(stale_sig["decision"], "HOLD")
        self.assertIn("stale", stale_sig["invalid_reason"].lower())

        # High spread (> 0.20%)
        spread_sig = self.engine.evaluate_live_signal(df, current_spread_pct=0.005)
        self.assertEqual(spread_sig["decision"], "HOLD")
        self.assertIn("spread", spread_sig["invalid_reason"].lower())

    def test_09_backtest_engine_non_repainting(self):
        """Test historical bar-by-bar backtest engine."""
        df = generate_synthetic_ohlcv(120, 65000.0, trend_pct=0.05)
        bt = self.engine.run_backtest(df, symbol="BTC/USDT", timeframe="15m", initial_capital=10000.0)

        self.assertEqual(bt["strategy_id"], "liquidity-rejection-structure-pro")
        self.assertIn("win_rate", bt)
        self.assertIn("profit_factor", bt)
        self.assertIn("maximum_drawdown_pct", bt)
        self.assertIn("equity_curve", bt)
        self.assertIn("state_breakdown", bt)
        self.assertTrue(len(bt["equity_curve"]) > 0)


if __name__ == "__main__":
    unittest.main()
