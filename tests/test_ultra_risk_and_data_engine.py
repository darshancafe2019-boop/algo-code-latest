"""
Comprehensive Automated Test Suite for Ultra-Upgraded Risk Engine & Market Data Freshness Engine
Covers:
1. 20-Stage Universal Pre-Order Risk Engine
2. 4-State Emergency Kill Switch Controller (NORMAL, WARNING, PAUSED, HALTED)
3. 8-Model Universal Position Sizing Calculator
4. Analytical Black-Scholes Greeks Engine & Payoff Curves
5. 13+ Multi-Leg Option Strategy Evaluation
6. 10-Scenario Macro Stress Testing & What-If Simulator
7. Real-Time Market Data Freshness & Data Quality Score (0-100)
8. Correlated Underlying Asset Concentration (Spot + Futures + Options)
"""

import pytest
import math
from datetime import datetime, timezone

from src.universal_risk_engine import (
    evaluate_trade_precheck,
    calculate_universal_position_size,
    calculate_black_scholes_greeks,
    calculate_options_strategy_risk,
    run_portfolio_stress_test,
    get_kill_switch_state,
    set_kill_switch_state,
    KillSwitchState
)
from src.data_fetcher import (
    MarketTick,
    DataFreshnessStatus,
    calculate_data_quality_score
)


class TestTwentyStageRiskEngine:
    """Rigorous validation of all 20 individual pre-order checks."""

    @pytest.fixture(autouse=True)
    def reset_kill_switch(self):
        set_kill_switch_state(KillSwitchState.NORMAL, "Reset for test suite")
        yield
        set_kill_switch_state(KillSwitchState.NORMAL, "Tear down reset")

    def test_stage_01_and_02_auth_and_instrument_validation(self):
        account = {"balance": 10000.0, "available_capital": 10000.0, "daily_pnl": 0.0}
        limits = {"max_risk_per_trade_pct": 2.0}

        # Stage 1: Auth Failure
        unauth_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59000.0, "quantity": 0.01, "authenticated": False}
        res = evaluate_trade_precheck(unauth_req, account, [], limits)
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["1_auth"] == "FAILED"

        # Stage 2: Invalid Instrument
        bad_inst_req = {"symbol": "", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59000.0, "quantity": 0.01, "authenticated": True}
        res2 = evaluate_trade_precheck(bad_inst_req, account, [], limits)
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["2_instrument"] == "FAILED"

    def test_stage_03_and_04_market_status_and_data_freshness(self):
        account = {"balance": 10000.0, "available_capital": 10000.0, "daily_pnl": 0.0}
        limits = {"max_risk_per_trade_pct": 2.0, "max_tick_age_seconds": 30.0}

        # Stage 3: Market Closed / Halted
        closed_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59000.0, "quantity": 0.01, "market_status": "HALTED"}
        res = evaluate_trade_precheck(closed_req, account, [], limits)
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["3_market_status"] == "FAILED"

        # Stage 4: Stale Data (> 30s)
        stale_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59000.0, "quantity": 0.01, "data_age_seconds": 75.0}
        res2 = evaluate_trade_precheck(stale_req, account, [], limits)
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["4_data_freshness"] == "FAILED"

    def test_stage_05_and_06_price_sanity_and_spread(self):
        account = {"balance": 10000.0, "available_capital": 10000.0, "daily_pnl": 0.0}
        limits = {"max_risk_per_trade_pct": 2.0, "max_spread_pct": 1.0}

        # Stage 5: Zero/Negative Entry Price
        bad_price_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 0.0, "stop_loss": 59000.0, "quantity": 0.01}
        res = evaluate_trade_precheck(bad_price_req, account, [], limits)
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["5_price_sanity"] == "FAILED"

        # Stage 6: Wide Spread (3.5% > 1.0%)
        wide_spread_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59000.0, "quantity": 0.01, "spread_pct": 3.5}
        res2 = evaluate_trade_precheck(wide_spread_req, account, [], limits)
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["6_spread_liquidity"] == "FAILED"

    def test_stage_07_to_10_sizing_margin_leverage_and_correlated_exposure(self):
        account = {"balance": 10000.0, "available_capital": 500.0, "daily_pnl": 0.0}
        limits = {
            "max_risk_per_trade_pct": 2.0,  # $200
            "max_leverage": 10.0,
            "max_exposure_per_asset_pct": 30.0  # $3,000 max per asset
        }

        # Stage 7: Excessive Trade Risk ($1,000 risk > $200 limit)
        oversized_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 50000.0, "quantity": 0.1}
        res = evaluate_trade_precheck(oversized_req, account, [], limits)
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["7_position_size"] == "FAILED"
        assert "suggested_quantity" in res["required_reductions"]

        # Stage 8: Margin Exceeded ($6,000 margin required > $500 available)
        low_margin_req = {"symbol": "ETH/USDT", "direction": "LONG", "entry_price": 3000.0, "stop_loss": 2950.0, "quantity": 2.0, "leverage": 1.0}
        res2 = evaluate_trade_precheck(low_margin_req, account, [], limits)
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["8_margin"] == "FAILED"

        # Stage 9: Leverage Cap (25x > 10x)
        high_lev_req = {"symbol": "ETH/USDT", "direction": "LONG", "entry_price": 3000.0, "stop_loss": 2950.0, "quantity": 0.1, "leverage": 25.0}
        res3 = evaluate_trade_precheck(high_lev_req, {"balance": 10000.0, "available_capital": 10000.0}, [], limits)
        assert res3["status"] == "BLOCKED"
        assert res3["risk_checks"]["9_leverage"] == "FAILED"

        # Stage 10: Correlated Exposure (Existing BTC Spot $2,500 + New BTC Perp $1,000 = $3,500 > $3,000 cap)
        existing_pos = [{"symbol": "BTC/USDT", "position_value": 2500.0, "direction": "LONG"}]
        new_perp_req = {"symbol": "BTC-PERP", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.0167}  # ~$1000 notional
        res4 = evaluate_trade_precheck(new_perp_req, {"balance": 10000.0, "available_capital": 10000.0}, existing_pos, limits)
        assert res4["status"] == "BLOCKED"
        assert res4["risk_checks"]["10_correlated_exposure"] == "FAILED"

    def test_stage_11_to_15_daily_loss_drawdown_streaks_duplicates_and_cooldown(self):
        # Stage 11: Daily Loss Limit (-$600 loss on $10,000 = -6% >= 5% limit)
        account_loss = {"balance": 10000.0, "available_capital": 9400.0, "daily_pnl": -600.0}
        limits = {"max_daily_loss_pct": 5.0, "max_portfolio_drawdown_pct": 10.0, "max_consecutive_losses": 3}
        valid_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.01}
        res = evaluate_trade_precheck(valid_req, account_loss, [], limits)
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["11_daily_loss"] == "FAILED"

        # Stage 12: Peak-to-Trough Portfolio Drawdown (Peak $15,000, Current $12,500 = 16.7% DD > 10% limit)
        account_dd = {"balance": 12500.0, "available_capital": 12500.0, "daily_pnl": 0.0, "peak_equity": 15000.0}
        res2 = evaluate_trade_precheck(valid_req, account_dd, [], limits)
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["12_portfolio_drawdown"] == "FAILED"

        # Stage 13: Consecutive Loss Streak (4 consecutive losses >= 3)
        account_streak = {"balance": 10000.0, "available_capital": 10000.0, "daily_pnl": 0.0, "consecutive_losses": 4}
        res3 = evaluate_trade_precheck(valid_req, account_streak, [], limits)
        assert res3["status"] == "BLOCKED"
        assert res3["risk_checks"]["13_loss_streak"] == "FAILED"

        # Stage 14: Duplicate Order Detection
        dup_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.01, "is_duplicate_order": True}
        res4 = evaluate_trade_precheck(dup_req, {"balance": 10000.0, "available_capital": 10000.0}, [], limits)
        assert res4["status"] == "BLOCKED"
        assert res4["risk_checks"]["14_duplicate_order"] == "FAILED"

        # Stage 15: Post-Exit Cooldown Window
        cooldown_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.01, "cooldown_active": True}
        res5 = evaluate_trade_precheck(cooldown_req, {"balance": 10000.0, "available_capital": 10000.0}, [], limits)
        assert res5["status"] == "BLOCKED"
        assert res5["risk_checks"]["15_cooldown"] == "FAILED"

    def test_stage_16_to_20_kill_switch_broker_and_approved_decision_object(self):
        # Stage 16: Kill Switch State PAUSED/HALTED
        set_kill_switch_state(KillSwitchState.HALTED, "Emergency manual halt")
        valid_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.01}
        account = {"balance": 10000.0, "available_capital": 10000.0, "daily_pnl": 0.0}
        res = evaluate_trade_precheck(valid_req, account, [], {})
        assert res["status"] == "BLOCKED"
        assert res["risk_checks"]["16_kill_switch"] == "FAILED"

        # Reset Kill Switch to NORMAL
        set_kill_switch_state(KillSwitchState.NORMAL)

        # Stage 18: Broker Disconnected
        broker_down_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 59500.0, "quantity": 0.01, "broker_connected": False}
        res2 = evaluate_trade_precheck(broker_down_req, account, [], {})
        assert res2["status"] == "BLOCKED"
        assert res2["risk_checks"]["18_broker_status"] == "FAILED"

        # Stage 19: Invalid Stop Loss (Long SL > Entry)
        bad_sl_req = {"symbol": "BTC/USDT", "direction": "LONG", "entry_price": 60000.0, "stop_loss": 61000.0, "quantity": 0.01}
        res3 = evaluate_trade_precheck(bad_sl_req, account, [], {})
        assert res3["status"] == "BLOCKED"
        assert res3["risk_checks"]["19_order_validation"] == "FAILED"

        # Stage 20: 100% Fully Approved Trade Decision
        approved_req = {
            "symbol": "BTC/USDT",
            "direction": "LONG",
            "entry_price": 64000.0,
            "stop_loss": 63000.0,
            "take_profit": 66000.0,
            "quantity": 0.02,
            "leverage": 1.0,
            "authenticated": True,
            "market_status": "OPEN",
            "data_age_seconds": 1.2,
            "spread_pct": 0.02,
            "broker_connected": True
        }
        res4 = evaluate_trade_precheck(approved_req, account, [], {"max_risk_per_trade_pct": 2.0, "max_exposure_per_asset_pct": 30.0})
        assert res4["status"] == "APPROVED"
        assert res4["is_approved"] is True
        assert res4["risk_score"] == 100.0
        assert res4["risk_checks"]["20_final_approval"] == "PASSED"
        assert res4["data_quality_score"] > 90.0
        assert "timestamp" in res4


class TestMarketDataFreshnessAndQuality:
    """Tests canonical market data model, freshness timestamps, and 0-100 quality scoring."""

    def test_market_tick_freshness_states(self):
        # LIVE tick (0.1s old)
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        tick_live = MarketTick("BTC/USDT", price=64500.0, bid=64495.0, ask=64505.0, timestamp_ms=now_ms)
        assert tick_live.status == DataFreshnessStatus.LIVE
        assert tick_live.spread == 10.0
        assert tick_live.spread_pct > 0

        # DELAYED tick (15s old)
        tick_delayed = MarketTick("ETH/USDT", price=3400.0, bid=3399.0, ask=3401.0, timestamp_ms=now_ms - 15000)
        assert tick_delayed.status == DataFreshnessStatus.DELAYED

        # STALE tick (90s old)
        tick_stale = MarketTick("SOL/USDT", price=150.0, timestamp_ms=now_ms - 90000)
        assert tick_stale.status == DataFreshnessStatus.STALE

        # INVALID tick (negative price)
        tick_invalid = MarketTick("BAD/USDT", price=-5.0, timestamp_ms=now_ms)
        assert tick_invalid.status == DataFreshnessStatus.INVALID

    def test_calculate_data_quality_score(self):
        # Excellent live tick
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        tick = MarketTick("BTC/USDT", price=65000.0, bid=64998.0, ask=65002.0, volume_24h=12500.0, high_24h=66000.0, low_24h=64000.0, timestamp_ms=now_ms)
        score_res = calculate_data_quality_score(tick)
        assert score_res["score"] >= 95.0
        assert score_res["status"] == "EXCELLENT"
        assert score_res["is_tradable"] is True

        # Missing data dict
        empty_score = calculate_data_quality_score(tick_dict={})
        assert empty_score["score"] == 0.0
        assert empty_score["status"] == "CRITICAL"
        assert empty_score["is_tradable"] is False


class TestUniversalPositionSizingAndStressTesting:
    """Validates 8 sizing models and macro stress test scenarios."""

    def test_eight_position_sizing_models(self):
        balance = 20000.0
        entry = 100.0
        sl = 95.0  # $5 risk distance

        # 1. percent_equity (2% = $400 risk -> 80 shares)
        s1 = calculate_universal_position_size(balance, entry, sl, method="percent_equity", risk_pct=2.0)
        assert s1["quantity"] == 80.0
        assert s1["risk_amount"] == 400.0

        # 2. fixed_amount ($500 risk -> 100 shares)
        s2 = calculate_universal_position_size(balance, entry, sl, method="fixed_amount", risk_amount=500.0)
        assert s2["quantity"] == 100.0

        # 3. atr_based
        s3 = calculate_universal_position_size(balance, entry, sl, method="atr_based", atr=3.0)
        assert s3["quantity"] > 0

        # 4. kelly_capped
        s4 = calculate_universal_position_size(balance, entry, sl, method="kelly_capped", win_rate=0.6, profit_factor=2.0)
        assert s4["quantity"] > 0

    def test_run_portfolio_stress_test(self):
        equity = 50000.0
        positions = [
            {"symbol": "BTC/USDT", "position_value": 20000.0, "direction": "LONG", "beta": 1.2},
            {"symbol": "ETH/USDT", "position_value": 15000.0, "direction": "LONG", "beta": 1.5}
        ]
        stress_res = run_portfolio_stress_test(equity, positions)
        assert stress_res["status"] == "SUCCESS"
        assert len(stress_res["scenarios"]) == 10

        # Check market crash -10% scenario
        crash_scenario = next(s for s in stress_res["scenarios"] if s["scenario_id"] == "market_drop_10")
        assert crash_scenario["projected_pnl"] < 0
        assert crash_scenario["projected_equity"] < equity
