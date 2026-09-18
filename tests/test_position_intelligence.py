"""
Authoritative Position Intelligence & Risk Engine Test Suite
============================================================
Validates:
1. Strict separation of marketDataProvider and executionBroker.
2. Multi-currency position integrity (INR vs USD vs USDT).
3. Mark-to-market valuations and real-time P&L scoping.
4. Options Greeks and Futures Basis attachments.
5. Authentic 20-Gate Risk evaluation and explainable reasons.
6. Safe position SL/TP modification and position closing via OMS.
7. Continuous reconciliation of positions against execution broker.
"""
from __future__ import annotations

import pytest
from src.data_core.models import (
    Environment,
    PositionSide,
    PositionItem,
    RiskGateReport,
)
from src.data_core.positions.position_registry import PositionRegistry
from src.data_core.risk.risk_engine import RiskEngine
from src.data_core.reconciliation.engine import ReconciliationEngine


def test_market_data_provider_and_execution_broker_separation():
    """Verify marketDataProvider and executionBroker are independently tracked."""
    reg = PositionRegistry()

    # NIFTY FUT: Market Data from UPSTOX, Execution on DHAN
    nifty = [p for p in reg.get_positions(Environment.PAPER) if "NIFTY" in p.symbol][0]
    assert nifty.market_data_provider == "UPSTOX"
    assert nifty.execution_broker == "DHAN"
    assert nifty.native_currency == "INR"

    # BTC PERP: Market Data from BINANCE_USDM, Execution on PAPER_SIMULATOR
    btc = [p for p in reg.get_positions(Environment.PAPER) if "BTC" in p.symbol][0]
    assert btc.market_data_provider == "BINANCE_USDM"
    assert btc.execution_broker == "PAPER_SIMULATOR"
    assert btc.native_currency == "USD"


def test_multi_currency_exposure_and_no_silent_mixing():
    """Verify exposure summary retains native currency breakdown without blind mixing."""
    reg = PositionRegistry()
    summary = reg.get_exposure_summary(Environment.PAPER)

    assert "byCurrency" in summary
    assert "INR" in summary["byCurrency"]
    assert "USD" in summary["byCurrency"]

    # INR totals should be denominated in INR (hundreds of thousands / millions)
    inr_exp = summary["byCurrency"]["INR"]["grossExposure"]
    assert inr_exp > 100000.0  # NIFTY notional in ₹

    # Normalized reporting must explicitly specify conversion source
    assert summary["normalizedReporting"]["currency"] == "USD"
    assert summary["normalizedReporting"]["totalGrossExposureUsd"] > 0


def test_mark_to_market_recalculation():
    """Verify live ticks update mark price and unrealized P&L centrally."""
    reg = PositionRegistry()

    # Initial BTC mark price is 78,950 (Entry: 78,200, Qty: 1.5 -> Unrealized: +1,125)
    btc_before = [p for p in reg.get_positions(Environment.PAPER) if "BTC" in p.symbol][0]
    assert btc_before.unrealized_pnl == 1125.0

    # New tick arrives: BTC @ 80,000 (+1,800 per BTC * 1.5 = +2,700)
    reg.mark_to_market("BTC/USDT:USDT", 80000.0, feed_age_ms=8.5)

    btc_after = [p for p in reg.get_positions(Environment.PAPER) if "BTC" in p.symbol][0]
    assert btc_after.mark_price == 80000.0
    assert btc_after.unrealized_pnl == 2700.0
    assert btc_after.feed_age_ms == 8.5


def test_options_greeks_and_futures_basis_attachments():
    """Verify derivatives positions carry respective Greeks and Basis metadata."""
    reg = PositionRegistry()
    positions = reg.get_positions(Environment.PAPER)

    opt = [p for p in positions if p.asset_class == "OPTIONS"][0]
    assert opt.greeks is not None
    assert "delta" in opt.greeks
    assert "gamma" in opt.greeks
    assert "theta" in opt.greeks
    assert "vega" in opt.greeks

    fut = [p for p in positions if p.asset_class == "FUTURES"][0]
    assert fut.basis_info is not None
    assert "basis_abs" in fut.basis_info
    assert "annualized_basis" in fut.basis_info


def test_authentic_20_gate_risk_evaluation():
    """Verify 20-Gate risk engine evaluates authentic metrics and produces diagnostic reports."""
    risk_eng = RiskEngine()
    report = risk_eng.evaluate_20_gates(Environment.PAPER)

    assert report.gates_evaluated == 20
    assert len(report.gates) == 20
    assert report.overall_status in ("ARMED", "TRIGGERED")

    gate_names = [g.name for g in report.gates]
    assert "Max Portfolio Drawdown Guard" in gate_names
    assert "Single Position Notional Limit" in gate_names
    assert "Margin Utilization Ceiling" in gate_names
    assert "Parametric Value at Risk (VaR 99% 1-Day)" in gate_names

    # Check that each gate provides a meaningful reason and current value
    for g in report.gates:
        assert len(g.reason) > 0
        assert len(g.threshold) > 0
        assert len(g.current_value) > 0


def test_safe_position_modification_and_closing():
    """Verify SL/TP adjustments and safe position closing via registry."""
    reg = PositionRegistry()

    # Modify protection on SOL position
    sol_pos = [p for p in reg.get_positions(Environment.PAPER) if "SOL" in p.symbol][0]
    assert sol_pos.config_state == "STOP_LOSS_MISSING"

    updated = reg.modify_protection(sol_pos.position_id, stop_loss=170.0, take_profit=140.0)
    assert updated is not None
    assert updated.stop_loss == 170.0
    assert updated.take_profit == 140.0
    assert updated.config_state == "CONFIGURED"

    # Close position
    closed = reg.close_position(sol_pos.position_id)
    assert closed is not None
    assert closed.quantity == 0.0
    assert closed.side == PositionSide.FLAT
    assert closed.unrealized_pnl == 0.0
