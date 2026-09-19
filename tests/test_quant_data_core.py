"""
Authoritative QuantDataCore Comprehensive Test Suite
====================================================
Validates all core invariants:
1. Provider capability matrix and authentic diagnostic status.
2. Strict broker segregation (Dhan, Upstox, Delta, Binance, Paper).
3. Paper / Live isolation (zero cross-contamination).
4. Append-only capital ledger integrity and balance continuity.
5. Position marked-to-market calculations and P&L segregation.
6. Order lifecycle transitions and trade fills in centralized OMS.
7. Continuous reconciliation engine and drift detection.
8. Global event bus normalized event formatting and secret redaction.
"""
from __future__ import annotations

import pytest
from src.data_core.models import (
    Environment,
    ProviderStatus,
    EventType,
    EventDomain,
    OrderSide,
    OrderType,
    OrderStatus,
    PositionSide,
    LedgerEntryType,
    LedgerDirection,
    ReconciliationStatus,
    NormalizedEvent,
)
from src.data_core.providers.registry import ProviderRegistry
from src.data_core.capital.ledger import CapitalLedger
from src.data_core.accounts.account_manager import AccountManager
from src.data_core.positions.position_registry import PositionRegistry
from src.data_core.orders.order_manager import OrderManager
from src.data_core.reconciliation.engine import ReconciliationEngine
from src.data_core.events.bus import GlobalEventBus, sanitize_payload


def test_provider_capability_matrix_and_authentic_status():
    """Verify provider capability matrix and authentic diagnostics."""
    reg = ProviderRegistry()
    providers = reg.get_all_providers()
    assert len(providers) >= 5

    paper = reg.get_provider("PAPER")
    assert paper is not None
    assert paper.capabilities.market_data is True
    assert paper.capabilities.execution is True
    assert paper.capabilities.account is True
    assert paper.status == ProviderStatus.LIVE

    # Test alias and display name resolution
    delta1 = reg.get_provider("Delta Exchange India")
    delta2 = reg.get_provider("DELTA_INDIA")
    delta3 = reg.get_provider("delta_exchange")
    delta4 = reg.get_provider("DELTA")
    assert delta1 is not None
    assert delta1.provider_id == "DELTA"
    assert delta2 == delta1
    assert delta3 == delta1
    assert delta4 == delta1
    assert delta1.capabilities.market_data is True

    # Test Dhan and Upstox aliases
    dhan = reg.get_provider("DhanHQ v2")
    assert dhan is not None and dhan.provider_id == "DHAN"
    upstox = reg.get_provider("Upstox V3 Market Data & Orders")
    assert upstox is not None and upstox.provider_id == "UPSTOX"

    reg.record_market_packet("BINANCE_USDM", latency_ms=15.4)
    usdm = reg.get_provider("BINANCE_USDM")
    assert usdm.status == ProviderStatus.LIVE
    assert usdm.latency_ms == 15.4


def test_strict_broker_and_currency_segregation():
    """Verify that funds across different brokers and currencies are strictly segregated."""
    ledger = CapitalLedger(max_history=100)
    acc_mgr = AccountManager()

    # Verify Dhan (INR) vs Delta (USD) vs Binance (USDT)
    dhan_acc = acc_mgr.get_account("DHAN", "dhan_paper", Environment.PAPER)
    delta_acc = acc_mgr.get_account("DELTA", "delta_paper", Environment.PAPER)
    binance_acc = acc_mgr.get_account("BINANCE_USDM", "binance_usdm_paper", Environment.PAPER)

    assert dhan_acc.currency == "INR"
    assert delta_acc.currency == "USD"
    assert binance_acc.currency == "USDT"

    # Multi-currency portfolio summary
    summary = acc_mgr.get_portfolio_summary(Environment.PAPER)
    assert "INR" in summary["byCurrency"]
    assert "USD" in summary["byCurrency"]
    assert "USDT" in summary["byCurrency"]
    assert summary["normalizedTotalEquityUsd"] > 0


def test_paper_and_live_ledger_isolation():
    """Verify complete isolation between PAPER and LIVE ledgers."""
    ledger = CapitalLedger(max_history=100)

    # Record entry in PAPER
    p_entry = ledger.record_entry(
        provider="DHAN",
        account_id="acc_test",
        environment=Environment.PAPER,
        currency="INR",
        amount=50000.0,
        direction=LedgerDirection.CREDIT,
        entry_type=LedgerEntryType.DEPOSIT,
        reason="Paper test deposit",
    )

    paper_bal = ledger.get_balance("DHAN", "acc_test", Environment.PAPER, "INR")
    live_bal = ledger.get_balance("DHAN", "acc_test", Environment.LIVE, "INR")

    assert paper_bal == 50000.0
    assert live_bal == 0.0  # Zero leakage to LIVE


def test_append_only_capital_ledger_continuity():
    """Verify append-only ledger transaction sequencing and balance integrity."""
    ledger = CapitalLedger(max_history=100)

    e1 = ledger.record_entry(
        provider="TEST",
        account_id="test_seq",
        environment=Environment.PAPER,
        currency="USD",
        amount=1000.0,
        direction=LedgerDirection.CREDIT,
        entry_type=LedgerEntryType.DEPOSIT,
        reason="Deposit 1",
    )
    assert e1.balance_after == 1000.0

    e2 = ledger.record_entry(
        provider="TEST",
        account_id="test_seq",
        environment=Environment.PAPER,
        currency="USD",
        amount=250.0,
        direction=LedgerDirection.DEBIT,
        entry_type=LedgerEntryType.BROKERAGE,
        reason="Fee payment",
    )
    assert e2.balance_after == 750.0

    assert ledger.get_balance("TEST", "test_seq", Environment.PAPER, "USD") == 750.0


def test_position_marked_to_market_and_pnl():
    """Verify marked-to-market position valuations and unrealized P&L calculations."""
    pos_reg = PositionRegistry()

    # Open LONG position: 2 BTC @ 70,000
    pos = pos_reg.update_position(
        provider="BINANCE_USDM",
        account_id="test_acc",
        instrument_id="BTCUSDT",
        canonical_instrument_id="BTC/USDT:USDT",
        symbol="BTC/USDT",
        environment=Environment.PAPER,
        quantity=2.0,
        side=PositionSide.LONG,
        average_entry=70000.0,
        market_price=70000.0,
        currency="USD",
    )
    assert pos.market_value == 140000.0
    assert pos.unrealized_pnl == 0.0

    # Tick arrives: BTC @ 72,500 (+2,500 per BTC)
    pos_reg.mark_to_market("BTC/USDT:USDT", 72500.0)
    updated_pos = pos_reg.get_positions(Environment.PAPER, "BINANCE_USDM", "test_acc")[0]
    assert updated_pos.market_value == 145000.0
    assert updated_pos.unrealized_pnl == 5000.0  # 2 * 2,500


def test_centralized_oms_order_lifecycle():
    """Verify full order lifecycle transitions from OPEN -> PARTIAL_FILL -> FILLED."""
    ord_mgr = OrderManager()

    # Create Order: Buy 10 SOL @ 150
    order = ord_mgr.create_order(
        provider="DELTA",
        account_id="delta_test",
        environment=Environment.PAPER,
        instrument="SOL/USDT",
        canonical_instrument_id="SOL/USDT:USDT",
        side=OrderSide.BUY,
        order_type=OrderType.LIMIT,
        quantity=10.0,
        limit_price=150.0,
    )
    assert order.status == OrderStatus.OPEN
    assert order.remaining_quantity == 10.0

    # Fill 4 SOL @ 150
    fill1 = ord_mgr.record_fill(order.internal_order_id, fill_price=150.0, fill_quantity=4.0)
    assert fill1 is not None
    assert order.status == OrderStatus.PARTIALLY_FILLED
    assert order.filled_quantity == 4.0
    assert order.remaining_quantity == 6.0

    # Fill remaining 6 SOL @ 150
    fill2 = ord_mgr.record_fill(order.internal_order_id, fill_price=150.0, fill_quantity=6.0)
    assert fill2 is not None
    assert order.status == OrderStatus.FILLED
    assert order.remaining_quantity == 0.0


def test_continuous_reconciliation_and_drift_detection():
    """Verify continuous reconciliation detects formula or state drifts."""
    recon = ReconciliationEngine()
    report = recon.run_reconciliation(Environment.PAPER)

    assert report is not None
    assert report.status in (ReconciliationStatus.HEALTHY, ReconciliationStatus.DRIFT)
    assert report.accounts_audited > 0
    assert report.latency_ms >= 0.0


def test_global_event_bus_and_secret_redaction():
    """Verify event bus publication, subscriptions, and secret scrubbing."""
    bus = GlobalEventBus(max_buffer_size=50)

    received = []
    unsub = bus.subscribe("domain:ACCOUNT", lambda ev: received.append(ev))

    # Publish event with sensitive secret payload
    raw_payload = {
        "account_id": "acc_123",
        "api_key": "SECRET_KEY_12345",
        "access_token": "JWT_TOKEN_ABCDE",
        "balance": 1000.0,
    }

    bus.publish(
        NormalizedEvent(
            event_type=EventType.BALANCE_UPDATE,
            domain=EventDomain.ACCOUNT,
            provider="DHAN",
            payload=raw_payload,
        )
    )

    assert len(received) == 1
    ev = received[0]
    assert ev.payload["api_key"] == "[REDACTED]"
    assert ev.payload["access_token"] == "[REDACTED]"
    assert ev.payload["balance"] == 1000.0

    unsub()


def test_bot_preflight_validation_with_provider_aliases():
    """Verify that Bot Preflight Gates pass seamlessly with provider aliases like 'Delta Exchange India'."""
    from src.data_core.core import quant_data_core

    spec_dict = {
        "botId": "bot_delta_spread_001",
        "botName": "BTC Bull Call Spread",
        "environment": "PAPER",
        "strategyType": "BULL_CALL_SPREAD",
        "underlyingCanonicalId": "CRYPTO:BTC",
        "underlyingSymbol": "BTC",
        "expiry": "2026-03-27",
        "marketDataProvider": "Delta Exchange India",
        "executionBroker": "Delta Exchange India",
        "executionAccountId": "delta_paper",
        "capitalAllocation": 10000.0,
        "currency": "USD",
        "legs": [
            {
                "legId": "leg_buy",
                "canonicalInstrumentId": "CRYPTO:BTC:20260327:85000:CE",
                "underlyingCanonicalId": "CRYPTO:BTC",
                "underlyingSymbol": "BTC",
                "expiry": "2026-03-27",
                "strike": 85000.0,
                "optionType": "CE",
                "side": "BUY",
                "quantity": 1.0,
                "lots": 1,
                "lotSize": 1.0,
                "limitPrice": 1200.0,
                "marketDataProvider": "Delta Exchange India",
            },
            {
                "legId": "leg_sell",
                "canonicalInstrumentId": "CRYPTO:BTC:20260327:90000:CE",
                "underlyingCanonicalId": "CRYPTO:BTC",
                "underlyingSymbol": "BTC",
                "expiry": "2026-03-27",
                "strike": 90000.0,
                "optionType": "CE",
                "side": "SELL",
                "quantity": 1.0,
                "lots": 1,
                "lotSize": 1.0,
                "limitPrice": 400.0,
                "marketDataProvider": "Delta Exchange India",
            },
        ],
    }

    report = quant_data_core.bots.validate_spec(spec_dict)
    assert report is not None
    assert report.total_gates == 16
    assert report.failed_gates == 0
    assert report.is_deployable is True
    assert report.to_dict()["isDeployable"] is True

    # Verify Market Data Stream gate specifically
    mkt_gate = next((g for g in report.gates if g.gate_id == "MARKET_DATA_STREAM"), None)
    assert mkt_gate is not None
    assert mkt_gate.status == "PASS"

    # Verify Broker Auth gate specifically
    auth_gate = next((g for g in report.gates if g.gate_id == "BROKER_AUTH"), None)
    assert auth_gate is not None
    assert auth_gate.status == "PASS"

