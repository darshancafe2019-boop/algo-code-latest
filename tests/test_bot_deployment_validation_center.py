"""
Test Suite: Bot Deployment Validation & Launch Control Center
============================================================
Comprehensive tests for 16-Gate preflight validation, strategy structural consistency,
the specific BTC/NIFTY underlying mismatch regression, defined-risk mathematical solver,
and top liquidity order-flow analytics.
"""

import pytest
from src.data_core.models import Environment
from src.data_core.bots.models import (
    BotDeploymentSpec,
    StrategyLegItem,
    MarketDataContract,
    DataFreshnessContract,
)
from src.data_core.bots.consistency_engine import (
    DeploymentConsistencyEngine,
    global_deployment_consistency_engine,
)
from src.data_core.bots.deployment_engine import BotDeploymentEngine


def test_btc_nifty_underlying_mismatch_regression_blocked():
    """
    CRITICAL REGRESSION TEST:
    Underlying is specified as 'BTC' (crypto options context),
    but strategy legs contain 'NIFTY 24600 CE' / 'NIFTY 24700 CE'.
    MUST be marked FAIL on UNDERLYING_CONSISTENCY and BLOCKED from activation.
    """
    spec = BotDeploymentSpec(
        bot_id="test_bot_btc_nifty_mismatch",
        bot_name="Mismatched Crypto Bot",
        environment=Environment.PAPER,
        strategy_type="BULL_CALL_SPREAD",
        underlying_symbol="BTC",
        underlying_canonical_id="DELTA:BTC",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24600CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                strike=24600.0,
                option_type="CE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26MAR24700CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                strike=24700.0,
                option_type="CE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
            ),
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        capital_allocation=50000.0,
    )

    report = global_deployment_consistency_engine.validate_deployment_spec(spec)

    # Invariants: Must not be deployable
    assert report.is_deployable is False
    assert report.failed_gates >= 1

    # Find the UNDERLYING_CONSISTENCY gate
    underlying_gate = next((g for g in report.gates if g.gate_id == "UNDERLYING_CONSISTENCY"), None)
    assert underlying_gate is not None
    assert underlying_gate.status == "FAIL"
    assert "BTC" in underlying_gate.expected
    assert "NIFTY" in underlying_gate.actual
    assert len(underlying_gate.correction) > 0

    # Ensure it appears in blocking reasons
    assert any("Underlying Mismatch" in reason for reason in report.blocking_reasons)


def test_bull_call_spread_strike_ordering_and_structure_validation():
    """
    Validates Bull Call Spread structural rules:
    - 2 CALL legs with BUY lower strike, SELL higher strike -> PASS
    - Inverted strikes (BUY 24800, SELL 24600) -> FAIL on STRIKE_RELATIONSHIP
    - Expiry mismatch between legs -> FAIL on EXPIRY_CONSISTENCY
    """
    # 1. Valid Bull Call Spread
    valid_spec = BotDeploymentSpec(
        bot_id="test_bcs_valid",
        bot_name="Valid NIFTY Bull Call Spread",
        environment=Environment.PAPER,
        strategy_type="BULL_CALL_SPREAD",
        underlying_symbol="NIFTY",
        underlying_canonical_id="NSE:NIFTY50",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24500CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                expiry="2026-03-27",
                strike=24500.0,
                option_type="CE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=200.0,
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26MAR24700CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                expiry="2026-03-27",
                strike=24700.0,
                option_type="CE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=90.0,
            ),
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        capital_allocation=50000.0,
        stop_loss_pct=2.0,
    )

    report_valid = global_deployment_consistency_engine.validate_deployment_spec(valid_spec)
    strike_gate_valid = next(g for g in report_valid.gates if g.gate_id == "STRIKE_RELATIONSHIP")
    struct_gate_valid = next(g for g in report_valid.gates if g.gate_id == "STRATEGY_STRUCTURE")
    expiry_gate_valid = next(g for g in report_valid.gates if g.gate_id == "EXPIRY_CONSISTENCY")

    assert strike_gate_valid.status == "PASS"
    assert struct_gate_valid.status == "PASS"
    assert expiry_gate_valid.status == "PASS"

    # 2. Inverted Strikes Bull Call Spread (BUY 24700, SELL 24500)
    inverted_spec = BotDeploymentSpec(
        bot_id="test_bcs_inverted",
        bot_name="Inverted BCS Bot",
        environment=Environment.PAPER,
        strategy_type="BULL_CALL_SPREAD",
        underlying_symbol="NIFTY",
        underlying_canonical_id="NSE:NIFTY50",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24700CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                expiry="2026-03-27",
                strike=24700.0,  # Higher strike bought
                option_type="CE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26MAR24500CE",
                underlying_symbol="NIFTY",
                underlying_canonical_id="NSE:NIFTY50",
                expiry="2026-03-27",
                strike=24500.0,  # Lower strike sold
                option_type="CE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
            ),
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        capital_allocation=50000.0,
    )

    report_inv = global_deployment_consistency_engine.validate_deployment_spec(inverted_spec)
    strike_gate_inv = next(g for g in report_inv.gates if g.gate_id == "STRIKE_RELATIONSHIP")
    assert strike_gate_inv.status == "FAIL"
    assert "Inverted strikes" in strike_gate_inv.actual
    assert report_inv.is_deployable is False

    # 3. Expiry Mismatch in Spread Legs
    mismatched_expiry_spec = BotDeploymentSpec(
        bot_id="test_bcs_expiry_mismatch",
        bot_name="Expiry Mismatch BCS Bot",
        environment=Environment.PAPER,
        strategy_type="BULL_CALL_SPREAD",
        underlying_symbol="NIFTY",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24500CE",
                underlying_symbol="NIFTY",
                expiry="2026-03-27",
                strike=24500.0,
                option_type="CE",
                side="BUY",
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26APR24700CE",
                underlying_symbol="NIFTY",
                expiry="2026-04-30",  # Different expiry
                strike=24700.0,
                option_type="CE",
                side="SELL",
            ),
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        capital_allocation=50000.0,
    )

    report_exp = global_deployment_consistency_engine.validate_deployment_spec(mismatched_expiry_spec)
    expiry_gate = next(g for g in report_exp.gates if g.gate_id == "EXPIRY_CONSISTENCY")
    assert expiry_gate.status == "FAIL"
    assert "2026-04-30" in expiry_gate.actual


def test_defined_risk_payoff_mathematical_solver():
    """
    Validates exact closed-form defined-risk options formulas:
    - NIFTY 24500 CE (BUY @ 200) + 24700 CE (SELL @ 90) -> Net Debit: 110/unit = ₹5,500 (lot size 50)
    - Strike Diff = 200
    - Max Profit = (200 - 110) * 50 = ₹4,500
    - Max Loss = 110 * 50 = ₹5,500
    - Breakeven = 24500 + 110 = 24610.0
    - Required Margin = ₹5,500
    - Reward/Risk = 4500 / 5500 = 0.82
    """
    spec = BotDeploymentSpec(
        bot_id="test_bcs_math",
        bot_name="BCS Math Test",
        environment=Environment.PAPER,
        strategy_type="BULL_CALL_SPREAD",
        underlying_symbol="NIFTY",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24500CE",
                underlying_symbol="NIFTY",
                strike=24500.0,
                option_type="CE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=200.0,
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26MAR24700CE",
                underlying_symbol="NIFTY",
                strike=24700.0,
                option_type="CE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=90.0,
            ),
        ],
        capital_allocation=50000.0,
        currency="INR",
        max_slippage_pct=0.2,
    )

    metrics = DeploymentConsistencyEngine.calculate_defined_risk_metrics(spec)

    assert metrics.net_premium == -5500.0  # Net debit ₹5,500
    assert metrics.max_loss == 5500.0
    assert metrics.max_profit == 4500.0
    assert metrics.breakeven_points == [24610.0]
    assert metrics.required_margin == 5500.0
    assert metrics.reward_to_risk_ratio == 0.82
    assert metrics.estimated_fees == 80.0  # 2 legs * ₹40


def test_orderbook_top_liquidity_and_depth_imbalance():
    """
    Validates order book depth analytics, best bid/ask spread bps,
    bid/ask walls, and depth imbalance calculations.
    """
    engine = BotDeploymentEngine()
    analytics = engine.get_orderbook_analytics("bot_nifty_trend_v1")

    assert analytics["instrumentId"] == "NSE:NIFTY26MARFUT"
    assert analytics["provider"] == "UPSTOX"
    assert analytics["bestBid"] > 0
    assert analytics["bestAsk"] > analytics["bestBid"]
    assert analytics["spreadAbs"] > 0
    assert analytics["spreadBps"] > 0
    assert analytics["bidWall"] is not None
    assert analytics["askWall"] is not None
    assert len(analytics["recentLargeTrades"]) > 0


def test_spec_registration_and_full_preflight_audit():
    """
    Validates registration of BotDeploymentSpec, preflight report generation,
    and storage in BotDeploymentEngine.
    """
    engine = BotDeploymentEngine()

    spec = BotDeploymentSpec(
        bot_id="test_bot_spec_e2e_1",
        bot_name="E2E Iron Condor Bot",
        environment=Environment.PAPER,
        strategy_type="IRON_CONDOR",
        underlying_symbol="NIFTY",
        underlying_canonical_id="NSE:NIFTY50",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MAR24000PE",
                underlying_symbol="NIFTY",
                expiry="2026-03-27",
                strike=24000.0,
                option_type="PE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=30.0,
            ),
            StrategyLegItem(
                leg_id="leg_2",
                canonical_instrument_id="NSE:NIFTY26MAR24200PE",
                underlying_symbol="NIFTY",
                expiry="2026-03-27",
                strike=24200.0,
                option_type="PE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=65.0,
            ),
            StrategyLegItem(
                leg_id="leg_3",
                canonical_instrument_id="NSE:NIFTY26MAR25000CE",
                underlying_symbol="NIFTY",
                expiry="2026-03-27",
                strike=25000.0,
                option_type="CE",
                side="SELL",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=70.0,
            ),
            StrategyLegItem(
                leg_id="leg_4",
                canonical_instrument_id="NSE:NIFTY26MAR25200CE",
                underlying_symbol="NIFTY",
                expiry="2026-03-27",
                strike=25200.0,
                option_type="CE",
                side="BUY",
                quantity=50.0,
                lots=1,
                lot_size=50.0,
                limit_price=35.0,
            ),
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        capital_allocation=75000.0,
        stop_loss_pct=2.0,
    )

    reg_spec = engine.register_spec(spec)
    assert reg_spec.bot_id == "test_bot_spec_e2e_1"

    report = engine.validate_spec(spec)
    assert report.total_gates == 16
    assert report.is_deployable is True
    assert report.passed_gates == 16
    assert report.failed_gates == 0

    # Stream event preview buffer test
    engine.record_stream_event(
        "test_bot_spec_e2e_1",
        {
            "receivedTime": "15:30:00.123",
            "provider": "UPSTOX",
            "instrument": "NSE:NIFTY26MAR25000CE",
            "eventType": "QUOTE",
            "price": 70.0,
            "bid": 69.5,
            "ask": 70.5,
            "quantity": 50,
            "latency": 11.5,
        },
    )

    preview = engine.get_stream_preview("test_bot_spec_e2e_1")
    assert len(preview) == 1
    assert preview[0]["instrument"] == "NSE:NIFTY26MAR25000CE"
