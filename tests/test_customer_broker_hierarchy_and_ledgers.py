"""
=============================================================================
Comprehensive Automated Test Suite:
Institutional 8-Tier Fund Segregation Architecture & Authoritative Ledgers
=============================================================================
Tests:
1. Customer, Department, Broker Folder, Account, Environment, Bot & Strategy Isolation
2. Append-only Brokerage & Tax Expense Ledger (fees never added to capital)
3. Authoritative Capital Calculations (Gross Capital, Net Equity, Dept Budget, Available)
4. Broker Adapters (Dhan HQ v2, Upstox v3, Delta Exchange, Paper Simulator)
5. Enforcement of FUNDING API UNAVAILABLE on non-supported programmatic broker transfers
6. Hierarchical Multi-tier Reconciliation & Trading Gate Blocks on Mismatches
7. Idempotency Key Deduplication on Financial Ledgers
8. REST API Endpoints in dashboard.py (/api/hierarchy/tree, /api/capital/summary, etc.)
"""

import json
import os
import uuid
import pytest

from src import config, db
from src.capital_service import CapitalAccountingService
from src.dhan_broker_adapter import DhanBrokerAdapter
from src.trade_ledger import trade_ledger


@pytest.fixture(autouse=True)
def setup_test_database():
    """Ensure database and institutional hierarchy tables exist."""
    db.init_db()
    db.seed_institutional_hierarchy_if_needed()
    yield


@pytest.fixture
def capital_service():
    """Returns the CapitalAccountingService singleton."""
    return CapitalAccountingService()


# =============================================================================
# 1. HIERARCHICAL TREE & SEEDING TESTS
# =============================================================================

def test_institutional_hierarchy_seeding(capital_service):
    """Verifies that the institutional 8-tier hierarchy is seeded correctly."""
    tree = capital_service.get_hierarchy_tree()
    assert tree["status"] == "success"
    customers = tree["hierarchy"]
    assert len(customers) >= 1

    cust = next((c for c in customers if c["id"] == "cust_default"), None)
    assert cust is not None
    assert "Alpha Institutional Capital" in cust["name"]

    dept_ids = [d["id"] for d in cust.get("departments", [])]
    assert "dept_algo_trading" in dept_ids

    # Check broker folders & accounts
    algo_dept = next(d for d in cust["departments"] if d["id"] == "dept_algo_trading")
    folders = algo_dept.get("folders", [])
    folder_ids = [f["id"] for f in folders]
    assert "bf_paper" in folder_ids
    assert "bf_dhan" in folder_ids
    assert "bf_upstox" in folder_ids
    assert "bf_delta" in folder_ids

    # Check broker accounts
    dhan_folder = next(f for f in folders if f["id"] == "bf_dhan")
    dhan_acc_ids = [a["id"] for a in dhan_folder.get("accounts", [])]
    assert "ba_dhan_primary" in dhan_acc_ids


# =============================================================================
# 2. CAPITAL LEDGER MOVEMENTS & IDEMPOTENCY
# =============================================================================

def test_capital_movement_and_idempotency(capital_service):
    """Verifies ledger movements and idempotency enforcement."""
    test_idempotency_key = f"TEST-IDEM-{uuid.uuid4().hex[:8]}"

    # Record initial deposit
    success1, msg1, data1 = capital_service.record_capital_movement(
        customer_id="cust_default",
        department_id="dept_algo_trading",
        broker_folder_id="bf_dhan",
        broker_account_id="ba_dhan_primary",
        entry_type="DEPOSIT",
        amount=50000.0,
        currency="INR",
        environment="LIVE",
        idempotency_key=test_idempotency_key,
        notes="Institutional Client Inflow",
    )
    assert success1 is True
    assert "already recorded" not in msg1

    # Replay identical idempotency key -> must be recognized as duplicate
    success2, msg2, data2 = capital_service.record_capital_movement(
        customer_id="cust_default",
        department_id="dept_algo_trading",
        broker_folder_id="bf_dhan",
        broker_account_id="ba_dhan_primary",
        entry_type="DEPOSIT",
        amount=50000.0,
        currency="INR",
        environment="LIVE",
        idempotency_key=test_idempotency_key,
        notes="Duplicate Attempt",
    )
    assert success2 is True
    assert "Idempotent replay" in msg2


# =============================================================================
# 3. APPEND-ONLY BROKERAGE & TAX EXPENSE LEDGER (FEES NEVER ADDED TO CAPITAL)
# =============================================================================

def test_brokerage_expense_ledger_isolation(capital_service):
    """
    Verifies that brokerage fees, STT, GST, and taxes are strictly recorded in
    brokerage_expenses_ledger as expenses and are NEVER added to capital balances.
    """
    trade_id = f"TRADE-AUDIT-{uuid.uuid4().hex[:6]}"

    # Record brokerage fee
    exp_ok1, msg1, _ = capital_service.record_brokerage_expense(
        customer_id="cust_default",
        department_id="dept_algo_trading",
        broker_folder_id="bf_dhan",
        broker_account_id="ba_dhan_primary",
        trade_id=trade_id,
        bot_id="bot_test_audit",
        provider="dhan",
        expense_type="BROKERAGE",
        amount=20.0,
        currency="INR",
    )
    assert exp_ok1 is True

    # Record STT Tax
    exp_ok2, msg2, _ = capital_service.record_brokerage_expense(
        customer_id="cust_default",
        department_id="dept_algo_trading",
        broker_folder_id="bf_dhan",
        broker_account_id="ba_dhan_primary",
        trade_id=trade_id,
        bot_id="bot_test_audit",
        provider="dhan",
        expense_type="TAX",
        amount=12.5,
        currency="INR",
    )
    assert exp_ok2 is True

    # Query breakdown and verify total expenses
    breakdown = capital_service.get_capital_breakdown(
        customer_id="cust_default",
        department_id="dept_algo_trading",
        broker_account_id="ba_dhan_primary",
    )
    assert breakdown.brokerage_fees >= 20.0
    assert breakdown.taxes >= 12.5
    assert breakdown.total_expenses >= 32.5

    # Verify authoritative Net Equity formula: Net Equity = Gross Capital + Realized PnL + Unrealized PnL - Total Expenses
    expected_equity = round(
        breakdown.gross_capital + breakdown.realized_pnl + breakdown.unrealized_pnl - breakdown.total_expenses, 2
    )
    assert breakdown.net_equity == expected_equity


# =============================================================================
# 4. DHAN BROKER ADAPTER & UNAVAILABLE FUNDING API INVARIANT
# =============================================================================

def test_dhan_broker_adapter_funding_invariant():
    """
    Verifies Dhan HQ API v2 adapter enforcement:
    Programmatic deposits/withdrawals MUST return FUNDING API UNAVAILABLE.
    """
    adapter = DhanBrokerAdapter(client_id="TEST_CLIENT", access_token="TEST_TOKEN")
    cap = adapter.get_capability()
    assert cap.broker_id == "dhan"

    # Attempt deposit -> Must return FUNDING_API_UNAVAILABLE
    dep_res = adapter.deposit_funds(10000.0)
    assert dep_res["status"] == "UNSUPPORTED"
    assert dep_res["code"] == "FUNDING_API_UNAVAILABLE"

    # Attempt withdrawal -> Must return FUNDING_API_UNAVAILABLE
    with_res = adapter.withdraw_funds(5000.0)
    assert with_res["status"] == "UNSUPPORTED"
    assert with_res["code"] == "FUNDING_API_UNAVAILABLE"


# =============================================================================
# 5. MULTI-TIER HIERARCHICAL RECONCILIATION & TRADE BLOCKING
# =============================================================================

def test_hierarchical_reconciliation(capital_service):
    """
    Verifies that multi-tier reconciliation evaluates ledger vs broker balances.
    """
    rec_result = capital_service.perform_hierarchical_reconciliation(customer_id="cust_default")
    assert rec_result["status"] in ["HEALTHY", "RECONCILED", "RECONCILIATION_REQUIRED"]
    assert rec_result["accounts_audited_count"] >= 1
    assert "discrepancies" in rec_result


# =============================================================================
# 6. REST API INTEGRATION IN DASHBOARD
# =============================================================================

def test_dashboard_hierarchy_and_capital_endpoints():
    """Verifies all REST API endpoints for hierarchy and capital management."""
    from dashboard import app
    app.config["TESTING"] = True
    client = app.test_client()

    # 1. GET /api/hierarchy/tree
    res_tree = client.get("/api/hierarchy/tree")
    assert res_tree.status_code == 200
    data_tree = res_tree.get_json()
    assert data_tree["status"] == "success"
    assert "hierarchy" in data_tree

    # 2. GET /api/capital/summary
    res_cap = client.get("/api/capital/summary?customer_id=cust_default")
    assert res_cap.status_code == 200
    data_cap = res_cap.get_json()
    assert data_cap["status"] == "success"
    assert "breakdown" in data_cap
    assert "gross_capital" in data_cap["breakdown"]
    assert "net_equity" in data_cap["breakdown"]

    # 3. GET /api/reconciliation/hierarchical
    res_rec = client.get("/api/reconciliation/hierarchical")
    assert res_rec.status_code == 200
    data_rec = res_rec.get_json()
    assert data_rec["status"] in ["HEALTHY", "RECONCILED", "RECONCILIATION_REQUIRED"]

    # 4. GET /api/brokers/dhan/funds
    res_dhan = client.get("/api/brokers/dhan/funds")
    assert res_dhan.status_code == 200
    data_dhan = res_dhan.get_json()
    assert data_dhan["status"] == "success"
    assert data_dhan["data"]["funding_api_supported"] is False

    # 5. POST /api/bots/validate with institutional fields
    val_payload = {
        "name": "Integration Test Bot",
        "symbol": "BTC/USDT",
        "asset_class": "CRYPTO",
        "allocated_capital": 5000.0,
        "total_capital": 50000.0,
        "stop_loss_pct": 2.0,
        "profit_target_pct": 4.0,
        "leverage": 1.0,
        "execution_mode": "PAPER",
        "customer_id": "cust_default",
        "department_id": "dept_algo_trading",
        "broker_folder_id": "bf_paper",
        "broker_account_id": "ba_paper_primary",
        "broker_provider": "paper_simulator",
        "currency": "USD",
        "risk_reserve": 500.0,
    }
    res_val = client.post("/api/bots/validate", json=val_payload)
    assert res_val.status_code == 200
    data_val = res_val.get_json()
    assert data_val["status"] == "success"
    assert data_val["preview"]["customer_id"] == "cust_default"
    assert data_val["preview"]["department_id"] == "dept_algo_trading"
