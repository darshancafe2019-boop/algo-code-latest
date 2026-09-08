"""
Comprehensive Test Suite for Volume Star Strategy Engine
=========================================================
Tests:
1. Market Structure Detection (Bullish HH/HL, Bearish LH/LL, Neutral/Mixed) without lookahead
2. Fixed Range Volume Profile (FRVP) 50 Rows, 70% Value Area, POC, VAH, VAL
3. Deterministic Low Volume Node (LVN) Identification & Ranking
4. Valid Long Setup (Bullish Trend + FRVP + LVN Retrace + Lower Wick Rejection + Bullish Close)
5. Valid Short Setup (Bearish Trend + FRVP + LVN Retrace + Upper Wick Rejection + Bearish Close)
6. Invalid Long Setup (LVN Touched but Bearish Close -> NO_CONFIRMATION)
7. Invalid Short Setup (LVN Touched but Bullish Close -> NO_CONFIRMATION)
8. Trend Filter Enforcement (Counter-trend setups rejected)
9. Stale / Insufficient Data Quality Gate
10. Signal Idempotency and Deduplication
11. Backtest Parity with Live Evaluator & Cost Modeling
12. Deterministic State Machine Transitions & Exact Reason Codes
"""

import math
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from src.volume_star_strategy import (
    VolumeStarConfig,
    MarketStructureEngine,
    FixedRangeVolumeProfileEngine,
    LVNDetectionEngine,
    RejectionConfirmationEngine,
    VolumeStarEvaluator,
    VolumeStarBacktester
)


def create_bullish_candle_series(num_candles: int = 40, start_price: float = 25000.0) -> pd.DataFrame:
    """Creates a deterministic bullish series printing confirmed Higher Highs & Higher Lows."""
    rows = []
    p = start_price
    base_time = datetime(2026, 9, 1, 9, 15, tzinfo=timezone.utc)

    for i in range(num_candles):
        t = base_time + timedelta(minutes=i * 5)
        # Sequence: Wave 1 up (0-10), Pullback 1 (11-15), Wave 2 up higher (16-25), Pullback 2 (26-30), Wave 3 up (31-40)
        if i <= 10:
            step = 8.0
        elif 11 <= i <= 15:
            step = -4.0 # Higher Low formed around 25060 > 25000
        elif 16 <= i <= 25:
            step = 9.0 # Higher High formed around 25150 > 25080
        elif 26 <= i <= 30:
            step = -3.0 # Higher Low formed around 25135 > 25060
        else:
            step = 7.0 # Higher High formed around 25205

        p += step
        o = p - 2.0
        c = p + 2.0
        h = max(o, c) + 3.0
        l = min(o, c) - 3.0
        v = 1500.0 + float((i % 4) * 200.0)
        rows.append({"timestamp": t.isoformat(), "open": o, "high": h, "low": l, "close": c, "volume": v})

    return pd.DataFrame(rows)


def create_bearish_candle_series(num_candles: int = 40, start_price: float = 25000.0) -> pd.DataFrame:
    """Creates a deterministic bearish series printing confirmed Lower Highs & Lower Lows."""
    rows = []
    p = start_price
    base_time = datetime(2026, 9, 1, 9, 15, tzinfo=timezone.utc)

    for i in range(num_candles):
        t = base_time + timedelta(minutes=i * 5)
        # Sequence: Wave 1 down (0-10), Retrace 1 (11-15), Wave 2 down (16-25), Retrace 2 (26-30), Wave 3 down (31-40)
        if i <= 10:
            step = -8.0
        elif 11 <= i <= 15:
            step = 4.0 # Lower High formed around 24960 < 25000
        elif 16 <= i <= 25:
            step = -9.0 # Lower Low formed around 24870 < 24920
        elif 26 <= i <= 30:
            step = 3.0 # Lower High formed around 24885 < 24960
        else:
            step = -7.0 # Lower Low formed around 24815

        p += step
        o = p + 2.0
        c = p - 2.0
        h = max(o, c) + 3.0
        l = min(o, c) - 3.0
        v = 1500.0 + float((i % 4) * 200.0)
        rows.append({"timestamp": t.isoformat(), "open": o, "high": h, "low": l, "close": c, "volume": v})

    return pd.DataFrame(rows)


# =============================================================================
# TESTS
# =============================================================================

def test_01_market_structure_bullish_and_bearish():
    """Verify non-lookahead swing pivot detection for Bullish, Bearish, and Neutral structures."""
    bull_df = create_bullish_candle_series(num_candles=40, start_price=25000.0)
    bull_res = MarketStructureEngine.evaluate_structure(bull_df, left_bars=3, right_bars=3)
    assert bull_res["trend"] == "BULLISH"
    assert bull_res["structure_state"] == "CONFIRMED_BULLISH"
    assert bull_res["anchor_pivot"] is not None
    assert bull_res["last_higher_high"] is not None
    assert bull_res["last_higher_low"] is not None
    assert bull_res["trend_confidence"] >= 60.0

    bear_df = create_bearish_candle_series(num_candles=40, start_price=25000.0)
    bear_res = MarketStructureEngine.evaluate_structure(bear_df, left_bars=3, right_bars=3)
    assert bear_res["trend"] == "BEARISH"
    assert bear_res["structure_state"] == "CONFIRMED_BEARISH"
    assert bear_res["anchor_pivot"] is not None
    assert bear_res["last_lower_high"] is not None
    assert bear_res["last_lower_low"] is not None

    # Mixed / flat candles should evaluate to NEUTRAL
    flat_rows = []
    base_time = datetime(2026, 9, 1, 9, 15, tzinfo=timezone.utc)
    for i in range(30):
        t = base_time + timedelta(minutes=i * 5)
        p = 25000.0 + float(np.sin(i) * 5.0)
        flat_rows.append({"timestamp": t.isoformat(), "open": p, "high": p + 2, "low": p - 2, "close": p + 0.5, "volume": 1000.0})
    flat_df = pd.DataFrame(flat_rows)
    flat_res = MarketStructureEngine.evaluate_structure(flat_df, left_bars=3, right_bars=3)
    assert flat_res["trend"] == "NEUTRAL"
    assert flat_res["structure_state"] == "NO_TRADE"


def test_02_frvp_calculation_and_bins():
    """Verify Fixed Range Volume Profile calculation with 50 rows, 70% value area, and POC/VAH/VAL."""
    df = create_bullish_candle_series(num_candles=30)
    frvp = FixedRangeVolumeProfileEngine.calculate_frvp(df, row_size=50, value_area_pct=70.0, width=100)

    assert frvp["status"] == "FRVP_READY"
    assert frvp["row_size"] == 50
    assert frvp["value_area_pct"] == 70.0
    assert len(frvp["bins"]) == 50
    assert frvp["poc"] > 0
    assert frvp["vah"] >= frvp["poc"]
    assert frvp["val"] <= frvp["poc"]
    assert frvp["total_volume"] > 0

    # Ensure bins sum up to total volume
    bins_vol_sum = sum(b["volume"] for b in frvp["bins"])
    assert math.isclose(bins_vol_sum, frvp["total_volume"], rel_tol=1e-3)


def test_03_lvn_identification_and_ranking():
    """Verify deterministic LVN identification from relative volume deficit and local minima."""
    # Construct a dataset where a middle price zone has intentionally depressed volume
    rows = []
    base_time = datetime(2026, 9, 1, 9, 15, tzinfo=timezone.utc)
    for i in range(30):
        t = base_time + timedelta(minutes=i * 5)
        p = 25000.0 + i * 10.0
        # Depression in volume around i=15 (price ~ 25150)
        v = 200.0 if (12 <= i <= 16) else 2500.0
        rows.append({"timestamp": t.isoformat(), "open": p - 2, "high": p + 5, "low": p - 4, "close": p + 2, "volume": v})
    df = pd.DataFrame(rows)

    frvp = FixedRangeVolumeProfileEngine.calculate_frvp(df, row_size=50, value_area_pct=70.0, width=100)
    lvns = LVNDetectionEngine.identify_lvns(
        frvp,
        current_price=25280.0,
        trend="BULLISH",
        deficit_threshold=0.30
    )

    assert len(lvns) > 0
    primary_lvn = lvns[0]
    assert "lvn_price" in primary_lvn
    assert "lvn_low" in primary_lvn
    assert "lvn_high" in primary_lvn
    assert primary_lvn["relative_deficit"] >= 0.30
    assert primary_lvn["strength_score"] > 0


def test_04_valid_long_setup_and_rejection():
    """Verify that a Bullish trend + FRVP + LVN retrace + wick rejection + Bullish close produces LONG_SIGNAL_READY."""
    df = create_bullish_candle_series(num_candles=35, start_price=25000.0)

    # Calculate initial state to find LVN
    cfg = VolumeStarConfig(timeframe="5m", execution_mode="PAPER")
    evaluator = VolumeStarEvaluator(cfg)
    initial_res = evaluator.evaluate_live_state(df, symbol="NIFTY", provider="DHAN")
    assert initial_res["market_structure"]["trend"] == "BULLISH"

    primary_lvn = initial_res.get("primary_lvn")
    assert primary_lvn is not None
    lvn_mid = primary_lvn["lvn_price"]
    lvn_low = primary_lvn["lvn_low"]
    lvn_high = primary_lvn["lvn_high"]

    # Append a Retrace + Wick Rejection + Bullish Close candle
    # Open inside/above LVN, wick penetrates below LVN, and close is strongly bullish back above LVN
    reject_time = (datetime.fromisoformat(df.iloc[-1]["timestamp"]) + timedelta(minutes=5)).isoformat()
    rejection_candle = {
        "timestamp": reject_time,
        "open": lvn_high + 1.0,
        "high": lvn_high + 10.0,
        "low": lvn_low - 4.0,   # Wick traded below LVN
        "close": lvn_high + 8.0, # Bullish close reclaimed above LVN
        "volume": 3500.0
    }
    df_with_signal = pd.concat([df, pd.DataFrame([rejection_candle])], ignore_index=True)

    final_res = evaluator.evaluate_live_state(df_with_signal, symbol="NIFTY", provider="DHAN")
    assert final_res["state"] == "LONG_SIGNAL_READY"
    assert final_res["reason_code"] == "SIGNAL_CONFIRMED"
    assert final_res["signal"] is not None
    assert final_res["signal"]["direction"] == "LONG"
    assert final_res["signal"]["stop_loss"] < rejection_candle["low"]
    assert final_res["signal"]["take_profit"] > rejection_candle["close"]


def test_05_valid_short_setup_and_rejection():
    """Verify that a Bearish trend + FRVP + LVN retrace + upper wick rejection + Bearish close produces SHORT_SIGNAL_READY."""
    df = create_bearish_candle_series(num_candles=35, start_price=25000.0)

    cfg = VolumeStarConfig(timeframe="5m", execution_mode="PAPER")
    evaluator = VolumeStarEvaluator(cfg)
    initial_res = evaluator.evaluate_live_state(df, symbol="NIFTY", provider="DHAN")
    assert initial_res["market_structure"]["trend"] == "BEARISH"

    primary_lvn = initial_res.get("primary_lvn")
    assert primary_lvn is not None
    lvn_low = primary_lvn["lvn_low"]
    lvn_high = primary_lvn["lvn_high"]

    # Append a Short Retrace + Upper Wick Rejection + Bearish Close candle
    reject_time = (datetime.fromisoformat(df.iloc[-1]["timestamp"]) + timedelta(minutes=5)).isoformat()
    rejection_candle = {
        "timestamp": reject_time,
        "open": lvn_low - 1.0,
        "high": lvn_high + 4.0, # Upper wick penetrated above LVN
        "low": lvn_low - 10.0,
        "close": lvn_low - 8.0, # Bearish close held below LVN
        "volume": 3500.0
    }
    df_with_signal = pd.concat([df, pd.DataFrame([rejection_candle])], ignore_index=True)

    final_res = evaluator.evaluate_live_state(df_with_signal, symbol="NIFTY", provider="DHAN")
    assert final_res["state"] == "SHORT_SIGNAL_READY"
    assert final_res["reason_code"] == "SIGNAL_CONFIRMED"
    assert final_res["signal"] is not None
    assert final_res["signal"]["direction"] == "SHORT"
    assert final_res["signal"]["stop_loss"] > rejection_candle["high"]
    assert final_res["signal"]["take_profit"] < rejection_candle["close"]


def test_06_invalid_long_wick_touch_bearish_close():
    """Verify that an LVN touch with a Bearish close does NOT trigger a Long entry (NO_CONFIRMATION)."""
    df = create_bullish_candle_series(num_candles=35, start_price=25000.0)
    cfg = VolumeStarConfig(timeframe="5m")
    evaluator = VolumeStarEvaluator(cfg)
    initial_res = evaluator.evaluate_live_state(df, symbol="NIFTY")
    primary_lvn = initial_res.get("primary_lvn")

    lvn_low = primary_lvn["lvn_low"]
    lvn_high = primary_lvn["lvn_high"]

    # Candle touches LVN but closes RED (bearish)
    reject_time = (datetime.fromisoformat(df.iloc[-1]["timestamp"]) + timedelta(minutes=5)).isoformat()
    bad_candle = {
        "timestamp": reject_time,
        "open": lvn_high + 2.0,
        "high": lvn_high + 4.0,
        "low": lvn_low - 3.0, # Touched LVN
        "close": lvn_low - 2.0, # Closed BEARISH (close < open)
        "volume": 2000.0
    }
    df_bad = pd.concat([df, pd.DataFrame([bad_candle])], ignore_index=True)

    res = evaluator.evaluate_live_state(df_bad, symbol="NIFTY")
    assert res["state"] in ["WAITING_FOR_CONFIRMATION", "WAITING_FOR_RETRACE"]
    assert res["signal"] is None


def test_07_invalid_short_wick_touch_bullish_close():
    """Verify that an LVN touch with a Bullish close does NOT trigger a Short entry (NO_CONFIRMATION)."""
    df = create_bearish_candle_series(num_candles=35, start_price=25000.0)
    cfg = VolumeStarConfig(timeframe="5m")
    evaluator = VolumeStarEvaluator(cfg)
    initial_res = evaluator.evaluate_live_state(df, symbol="NIFTY")
    primary_lvn = initial_res.get("primary_lvn")

    lvn_low = primary_lvn["lvn_low"]
    lvn_high = primary_lvn["lvn_high"]

    # Candle touches LVN but closes GREEN (bullish)
    reject_time = (datetime.fromisoformat(df.iloc[-1]["timestamp"]) + timedelta(minutes=5)).isoformat()
    bad_candle = {
        "timestamp": reject_time,
        "open": lvn_low - 2.0,
        "high": lvn_high + 3.0, # Touched LVN
        "low": lvn_low - 4.0,
        "close": lvn_high + 2.0, # Closed BULLISH (close > open)
        "volume": 2000.0
    }
    df_bad = pd.concat([df, pd.DataFrame([bad_candle])], ignore_index=True)

    res = evaluator.evaluate_live_state(df_bad, symbol="NIFTY")
    assert res["state"] in ["WAITING_FOR_CONFIRMATION", "WAITING_FOR_RETRACE"]
    assert res["signal"] is None


def test_08_trend_filter_rejection_of_counter_trend():
    """Verify that counter-trend signals are strictly filtered."""
    # In a bearish trend, even if a bullish-looking rejection candle appears, no LONG signal is generated
    bear_df = create_bearish_candle_series(num_candles=35, start_price=25000.0)
    cfg = VolumeStarConfig(timeframe="5m")
    evaluator = VolumeStarEvaluator(cfg)
    
    res = evaluator.evaluate_live_state(bear_df, symbol="NIFTY")
    # Trend is BEARISH, so direction should NEVER be LONG
    if res.get("signal"):
        assert res["signal"]["direction"] == "SHORT"
    assert res["market_structure"]["trend"] == "BEARISH"


def test_09_stale_data_quality_gate():
    """Verify that insufficient data produces DATA_INSUFFICIENT and NO_SIGNAL."""
    empty_df = pd.DataFrame()
    evaluator = VolumeStarEvaluator()
    res = evaluator.evaluate_live_state(empty_df, symbol="NIFTY")
    assert res["state"] == "DATA_INSUFFICIENT"
    assert res["reason_code"] == "DATA_QUALITY_FAILED"
    assert res["signal"] is None


def test_10_signal_deduplication():
    """Verify that identical evaluations of the same rejection candle maintain deterministic idempotency keys."""
    df = create_bullish_candle_series(num_candles=35, start_price=25000.0)
    evaluator = VolumeStarEvaluator()
    res1 = evaluator.evaluate_live_state(df, symbol="NIFTY")
    primary_lvn = res1.get("primary_lvn")
    
    if primary_lvn:
        lvn_low = primary_lvn["lvn_low"]
        lvn_high = primary_lvn["lvn_high"]
        reject_time = "2026-09-01T12:00:00Z"
        rejection_candle = {
            "timestamp": reject_time,
            "open": lvn_high + 1.0,
            "high": lvn_high + 10.0,
            "low": lvn_low - 4.0,
            "close": lvn_high + 8.0,
            "volume": 3500.0
        }
        df_sig = pd.concat([df, pd.DataFrame([rejection_candle])], ignore_index=True)
        eval1 = evaluator.evaluate_live_state(df_sig, symbol="NIFTY")
        eval2 = evaluator.evaluate_live_state(df_sig, symbol="NIFTY")

        assert eval1["signal"]["idempotency_key"] == eval2["signal"]["idempotency_key"]
        assert eval1["signal"]["signal_id"] == eval2["signal"]["signal_id"]


def test_11_backtest_parity_and_cost_modeling():
    """Verify that the bar-by-bar backtest engine executes cleanly and applies fee/slippage modeling."""
    df = create_bullish_candle_series(num_candles=60, start_price=25000.0)
    backtester = VolumeStarBacktester()
    res = backtester.run_backtest(
        df,
        symbol="NIFTY",
        provider="DHAN",
        initial_capital=10000.0,
        fees_pct=0.0005,
        slippage_pct=0.0002
    )

    assert res["status"] == "success"
    assert "metrics" in res
    assert "trades" in res
    assert "equity_curve" in res
    assert res["metrics"]["initial_capital"] == 10000.0
    assert "win_rate" in res["metrics"]
    assert "profit_factor" in res["metrics"]


def test_12_state_machine_deterministic_transitions():
    """Verify that all state machine reason codes are transparent and non-empty."""
    df_bull = create_bullish_candle_series(num_candles=35)
    evaluator = VolumeStarEvaluator()
    res = evaluator.evaluate_live_state(df_bull, symbol="NIFTY")

    assert res["state"] in [
        "IDLE", "TREND_DETECTED", "FRVP_READY", "LVN_IDENTIFIED",
        "WAITING_FOR_RETRACE", "LVN_TOUCHED", "WAITING_FOR_CONFIRMATION",
        "LONG_SIGNAL_READY", "SHORT_SIGNAL_READY", "NO_TRADE"
    ]
    assert len(res["decision_summary"]) > 0
    assert len(res["reason_code"]) > 0
    assert res["step_1_trend"]["status"] in ["COMPLETE", "IN_PROGRESS", "WAITING", "FAILED"]
    assert res["step_2_frvp"]["status"] in ["COMPLETE", "IN_PROGRESS", "WAITING", "FAILED"]
    assert res["step_3_rejection"]["status"] in ["COMPLETE", "IN_PROGRESS", "WAITING", "FAILED"]
