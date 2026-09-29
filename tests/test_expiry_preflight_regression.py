"""
Regression Test: Expiry Preflight & Strict Dynamic Resolution
============================================================
Specifically verifies the exact prompt failure scenario:
- Given: currentDate = 2026-09-29, expiredContract.expiry = 2026-03-27 -> valid = false, execution = BLOCKED
- Given: currentDate = 2026-09-29, validFutureContract.expiry >= 2026-09-29 -> valid = true, execution = ALLOWED
- Full 24-gate preflight evaluation: 24 PASSED / 0 FAILED with dynamic unexpired contract
"""

import pytest
from src.data_core.models import Environment
from src.data_core.bots.models import BotDeploymentSpec, StrategyLegItem
from src.data_core.bots.consistency_engine import BotConsistencyEngine
from src.contract_resolver import global_contract_resolver
from src.data_core.instruments.contract_validation_service import global_contract_validation_service
from src.market_clock import MarketClock


def test_exact_regression_expired_march_2026_contract():
    """
    Scenario: Bot specifies expired contract 2026-03-27 while current date is 2026-09-29.
    Expected: Preflight Gate 2 fails with 'CRITICAL — CONTRACT EXPIRED' and blocks deployment.
    """
    spec = BotDeploymentSpec(
        bot_id="test_expired_bot_regression",
        bot_name="Expired Regression Bot",
        environment=Environment.PAPER,
        strategy_type="S01_TREND_PULLBACK_EMA",
        underlying_symbol="NIFTY",
        underlying_canonical_id="NSE:NIFTY",
        expiry="2026-03-27",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id="NSE:NIFTY26MARFUT",
                underlying_canonical_id="NSE:NIFTY",
                underlying_symbol="NIFTY",
                exchange="NSE",
                segment="NSE_FNO",
                expiry="2026-03-27",
                side="BUY",
                quantity=65,
                lots=1,
                lot_size=65,
                order_type="MARKET",
                market_data_provider="UPSTOX",
                quote={"ltp": 24500.0, "bid": 24498.0, "ask": 24502.0, "feed_age_ms": 10},
            )
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        execution_account_id="acc_paper_test",
        currency="INR",
        capital_allocation=50000.0,
    )

    report = BotConsistencyEngine.validate_deployment_spec(spec)
    
    # Preflight must NOT be deployable
    assert report.is_deployable is False
    assert report.failed_gates >= 1

    # Specifically check Gate 2 (EXPIRY_CONSISTENCY)
    expiry_gate = next((g for g in report.gates if g.gate_id == "EXPIRY_CONSISTENCY"), None)
    assert expiry_gate is not None
    assert expiry_gate.status == "FAIL"
    assert "EXPIRED" in expiry_gate.actual


def test_exact_regression_dynamic_auto_contract_passes():
    """
    Scenario: Bot specifies dynamic contract resolution ('AUTO' or unexpired cycle >= 2026-09-29).
    Expected: Preflight Gate 2 passes and all 24 gates pass.
    """
    # Dynamically resolve active contract from Upstox
    resolved = global_contract_resolver.resolve_contract(
        broker="UPSTOX",
        exchange="NSE",
        underlying="NIFTY",
        instrument_type="FUT",
        expiry_preference="AUTO",
        mode="PAPER",
    )
    assert resolved is not None
    assert resolved.expiry >= MarketClock.trading_date("NSE")

    spec = BotDeploymentSpec(
        bot_id="test_dynamic_bot_regression",
        bot_name="Dynamic Regression Bot",
        environment=Environment.PAPER,
        strategy_type="S01_TREND_PULLBACK_EMA",
        underlying_symbol="NIFTY",
        underlying_canonical_id="NSE:NIFTY",
        expiry="AUTO",
        legs=[
            StrategyLegItem(
                leg_id="leg_1",
                canonical_instrument_id=resolved.instrument_key,
                underlying_canonical_id="NSE:NIFTY",
                underlying_symbol="NIFTY",
                exchange="NSE",
                segment="NSE_FNO",
                expiry=resolved.expiry,
                side="BUY",
                quantity=resolved.lot_size,
                lots=1,
                lot_size=resolved.lot_size,
                order_type="MARKET",
                market_data_provider="UPSTOX",
                quote={"ltp": 24500.0, "bid": 24498.0, "ask": 24502.0, "feed_age_ms": 10},
            )
        ],
        market_data_provider="UPSTOX",
        execution_broker="PAPER",
        execution_account_id="acc_paper_test",
        currency="INR",
        capital_allocation=2000000.0,
    )

    report = BotConsistencyEngine.validate_deployment_spec(spec)
    
    # Gate 2 must PASS
    expiry_gate = next((g for g in report.gates if g.gate_id == "EXPIRY_CONSISTENCY"), None)
    assert expiry_gate is not None
    assert expiry_gate.status == "PASS"
    assert "Expiry verified" in expiry_gate.actual

    # Full audit must be deployable with 0 failed gates
    assert report.is_deployable is True
    assert report.failed_gates == 0
    assert report.passed_gates == 24
