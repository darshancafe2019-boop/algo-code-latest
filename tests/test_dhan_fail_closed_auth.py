"""
Tests for Fail-Closed Dhan 401 Authentication & Execution Safety
================================================================
Verifies:
1. Dhan API 401 error immediately trips auth_status to AUTH_FAILED.
2. Market Data / Broker telemetry reports AUTH_FAILED.
3. Universal Risk Engine blocks all orders targeting Dhan when AUTH_FAILED.
4. ExecutionService / OMS fails closed on Dhan orders.
5. Re-authentication resets the lock, restores AUTHENTICATED status, and unblocks execution.
"""

import pytest
import urllib.error
from unittest.mock import patch, MagicMock

from src.dhan_broker_adapter import dhan_broker_adapter
from src.universal_risk_engine import universal_risk_engine
from src.execution_service import execution_service


def test_dhan_401_triggers_auth_failed():
    # Setup initial state
    dhan_broker_adapter._auth_failed = False
    dhan_broker_adapter.access_token = "invalid_token_sample"
    dhan_broker_adapter.client_id = "1000000000"

    # Simulate HTTP 401 Unauthorized from Dhan API
    http_401_err = urllib.error.HTTPError(
        url="https://api.dhan.co/v2/profile",
        code=401,
        msg="Unauthorized",
        hdrs={},
        fp=None
    )

    with patch("urllib.request.urlopen", side_effect=http_401_err):
        resp = dhan_broker_adapter.get_profile()

    assert dhan_broker_adapter._auth_failed is True
    assert dhan_broker_adapter.auth_status == "AUTH_FAILED"
    assert resp.get("broker_status") == "AUTH_FAILED"
    assert resp.get("http_code") == 401


def test_risk_engine_blocks_dhan_orders_when_auth_failed():
    # Ensure Dhan is in AUTH_FAILED state
    dhan_broker_adapter._auth_failed = True

    # Attempt to evaluate an order for Dhan
    order_intent = {
        "symbol": "RELIANCE",
        "side": "BUY",
        "quantity": 1,
        "entry_price": 2900.0,
        "price": 2900.0,
        "stop_loss": 2850.0,
        "take_profit": 3000.0,
        "broker": "DHAN",
        "authenticated": True,
        "mode": "PAPER"
    }
    account_state = {
        "balance": 1000000.0,
        "available_capital": 1000000.0,
        "daily_pnl": 0.0,
        "peak_equity": 1000000.0
    }

    decision = universal_risk_engine.evaluate_order_intent(order_intent, account_state=account_state)
    assert decision.get("allowed") is False
    assert "Dhan authentication required" in decision.get("message", "")
    assert decision["stages"]["1_auth"] == "FAILED"


def test_execution_service_fails_closed_on_dhan_orders():
    # Ensure Dhan is in AUTH_FAILED state
    dhan_broker_adapter._auth_failed = True

    res = dhan_broker_adapter.place_order(
        symbol="RELIANCE",
        side="BUY",
        quantity=5,
        price=2900.0
    )
    assert res.get("success") is False
    assert res.get("status") == "FAILED"
    assert res.get("error") == "DHAN_AUTH_FAILED"
    assert "Dhan authentication required" in res.get("message", "")


def test_reauthentication_clears_lock_and_unlocks_trading():
    # Ensure Dhan is initially in AUTH_FAILED state
    dhan_broker_adapter._auth_failed = True
    assert dhan_broker_adapter.auth_status == "AUTH_FAILED"

    # Mock successful Dhan profile response on re-auth
    mock_profile_resp = MagicMock()
    mock_profile_resp.read.return_value = b'{"dhanClientId": "1000000000", "tokenValidity": "VALID"}'
    mock_profile_resp.__enter__.return_value = mock_profile_resp

    with patch("urllib.request.urlopen", return_value=mock_profile_resp):
        reauth_res = dhan_broker_adapter.reauthenticate(
            client_id="1000000000",
            access_token="valid_jwt_token_example_123"
        )

    assert reauth_res.get("success") is True
    assert reauth_res.get("status") == "AUTHENTICATED"
    assert dhan_broker_adapter._auth_failed is False
    assert dhan_broker_adapter.auth_status == "AUTHENTICATED"

    # Verify Risk Engine now allows Dhan orders
    order_intent = {
        "symbol": "RELIANCE",
        "side": "BUY",
        "quantity": 1,
        "entry_price": 2900.0,
        "price": 2900.0,
        "stop_loss": 2850.0,
        "take_profit": 3000.0,
        "broker": "DHAN",
        "authenticated": True,
        "mode": "PAPER"
    }
    account_state = {
        "balance": 1000000.0,
        "available_capital": 1000000.0,
        "daily_pnl": 0.0,
        "peak_equity": 1000000.0
    }

    decision = universal_risk_engine.evaluate_order_intent(order_intent, account_state=account_state)
    assert decision.get("allowed") is True
    assert decision["stages"]["1_auth"] == "PASSED"
    assert decision["stages"]["18_broker_status"] == "PASSED"
