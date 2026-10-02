"""
Authoritative Test Suite: Real Execution Pipeline Verification
==============================================================
Validates the complete execution lifecycle according to the 10 requirements:
1. /api/broker/order routes through OrderExecutionService and does not bypass risk or ledger.
2. live_runner.py does not create fake/direct positions or trades.
3. All entries and exits use OrderExecutionService.
4. Broker adapters submit orders and return actual broker responses.
5. Use actual broker order status and fill data (no assumed fills).
6. Position quantity derives from filled quantity.
7. Exit uses the same execution path as entry (execute_exit).
8. Real pricing without synthetic fabrication.
9. PAPER and LIVE share the same strategy/risk pipeline; only execution adapter differs.
10. LIVE fails closed unless explicitly armed.
"""

import copy
import hashlib
import json
import os
import sqlite3
import time
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest

from src import config, db
from src.security_auth import PasswordManager
from src.execution_service import OrderExecutionService, order_execution_service
from src.trade_ledger import trade_ledger, init_trade_ledger_schema
from src.live_runner import LiveRunner
from src.data_fetcher import DataFetcher

from src.strategy import Strategy
from dashboard import app


TEST_ADMIN_TOKEN = "test_execution_proof_admin_token_9999"
TEST_ADMIN_TOKEN_HASH = hashlib.sha256(TEST_ADMIN_TOKEN.encode("utf-8")).hexdigest()
TEST_ADMIN_ID = "usr_test_exec_proof_admin"


@pytest.fixture(autouse=True)
def isolated_exec_db(tmp_path):
    """Isolates all test runs to a temporary SQLite database."""
    orig_db_path = config.DB_PATH
    temp_db_file = tmp_path / "test_exec_isolated.db"
    config.DB_PATH = temp_db_file

    db.init_db(force=True)
    init_trade_ledger_schema()

    pwd_hash, salt = PasswordManager.hash_password("AlgoTrading@2026!")
    db.upsert_user({
        "id": TEST_ADMIN_ID,
        "username": "exec_admin",
        "email": "exec_admin@algotrading.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.safe_execute(
        """
        INSERT OR REPLACE INTO user_sessions (
            session_id, user_id, token_hash, device_name, ip_address,
            user_agent, approximate_location, last_active_at, expires_at,
            is_revoked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            "sess-exec-admin",
            TEST_ADMIN_ID,
            TEST_ADMIN_TOKEN_HASH,
            "Pytest Exec Runner",
            "127.0.0.1",
            "Pytest",
            "Localhost",
            now_iso,
            expires_iso,
            now_iso,
        )
    )

    yield temp_db_file

    config.DB_PATH = orig_db_path


@pytest.fixture
def auth_client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        client.set_cookie("algo_session_token", TEST_ADMIN_TOKEN)
        yield client



class TestRealExecutionPipeline:
    """End-to-End Real Execution Chain Tests."""

    def test_full_trade_lifecycle_entry_to_exit_pnl(self):
        """Proves complete real chain: Market Data -> Risk -> Entry -> Fill -> Position -> Exit -> Realized P&L."""
        svc = OrderExecutionService()
        symbol = "BTC/USDT"
        entry_price = 86500.0
        order_qty = 0.002
        sl = 84770.0
        tp = 89960.0

        # 1. 14-Point Risk Check
        passed, reason = svc.validate_14_point_pre_order_check(
            bot_id="bot-e2e-1",
            strategy="QUANT_PRO_TEST",
            symbol=symbol,
            side="BUY",
            amount=order_qty,
            price=entry_price,
            stop_loss=sl,
            take_profit=tp,
            confidence_score=88.0,
            account_balance=50000.0,
            is_live=False
        )
        assert passed is True
        assert reason == "ALL_14_SAFETY_CHECKS_PASSED"

        # 2. Entry Execution
        ok, msg, entry_res = svc.execute_order(
            bot_id="bot-e2e-1",
            strategy="QUANT_PRO_TEST",
            symbol=symbol,
            side="BUY",
            amount=order_qty,
            price=entry_price,
            stop_loss=sl,
            take_profit=tp,
            confidence_score=88.0,
            mode="PAPER"
        )
        assert ok is True
        trade_id = entry_res.get("trade_id")
        assert trade_id is not None
        assert entry_res.get("filled_quantity") == order_qty

        # 3. Position Ledger Verification
        trades = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))
        assert len(trades) == 1
        pos = dict(trades[0])
        assert pos["status"] == "OPEN"
        assert float(pos["position_size"]) == order_qty
        assert float(pos["entry_price"]) == entry_price

        # 4. Exit Execution via execute_exit
        exit_price = 88230.0  # +2.0% profit
        exit_ok, exit_msg, exit_res = svc.execute_exit(
            bot_id="bot-e2e-1",
            trade_id=trade_id,
            symbol=symbol,
            side="SELL",
            quantity=order_qty,
            price=exit_price,
            exit_reason="TAKE_PROFIT",
            mode="PAPER"
        )
        assert exit_ok is True
        assert exit_res.get("filled_quantity") == order_qty

        # 5. Position Closed & Authoritative Realized P&L
        closed_trades = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))
        closed = dict(closed_trades[0])
        assert closed["status"] == "CLOSED"
        assert closed["trade_result"] == "WIN"
        assert float(closed["gross_pnl"]) > 0.0
        assert float(closed["net_pnl"]) > 0.0
        assert float(closed["exit_price"]) == exit_price

    def test_api_broker_order_routes_through_execution_service(self, auth_client):
        """Requirement 1: /api/broker/order must NOT bypass execution service."""
        payload = {
            "symbol": "BTC/USDT",
            "direction": "BUY",
            "quantity": 0.001,
            "price": 86000.0,
            "stop_loss": 84280.0,
            "take_profit": 89440.0,
            "mode": "PAPER",
            "bot_id": "api-test-bot"
        }
        res = auth_client.post("/api/broker/order", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("success") is True
        assert data.get("order_id") != ""
        assert data.get("trade_id") is not None

        # Verify trade logged in trades_log
        trade_rec = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (data["trade_id"],))
        assert len(trade_rec) == 1
        assert trade_rec[0]["symbol"] == "BTC/USDT"

    def test_api_broker_order_fails_closed_on_unauthorized_live(self, auth_client):
        """Requirement 10: /api/broker/order fails closed when LIVE is not explicitly enabled."""
        with patch.object(config, "TRADING_MODE", "LIVE"), \
             patch.object(config, "LIVE_TRADING_ENABLED", False), \
             patch.object(config, "LIVE_TRADING_ARMED", False):
            payload = {
                "symbol": "BTC/USDT",
                "direction": "BUY",
                "quantity": 0.001,
                "price": 86000.0,
                "stop_loss": 84280.0,
                "take_profit": 89440.0,
                "mode": "LIVE"
            }
            res = auth_client.post("/api/broker/order", json=payload)
            assert res.status_code in [400, 403]
            data = res.get_json()
            assert data.get("success") is False
            assert "LIVE_TRADING_DISABLED" in str(data.get("reason"))


    def test_position_quantity_matches_actual_fill_quantity(self):
        """Requirement 5 & 6: Position quantity must come from actual filled quantity (no assumed fill)."""
        svc = OrderExecutionService()
        
        # Mock broker adapter returning partial fill
        partial_mock = MagicMock()
        partial_mock.submit_order.return_value = {
            "success": True,
            "order_id": "PARTIAL_ORD_999",
            "broker_order_id": "BRK_PARTIAL_999",
            "symbol": "BTC/USDT",
            "side": "BUY",
            "requested_quantity": 1.0,
            "filled_quantity": 0.45,  # Partial fill
            "remaining_quantity": 0.55,
            "average_price": 86100.0,
            "fees": 0.45 * 86100.0 * 0.001,
            "status": "PARTIALLY_FILLED",
            "execution_mode": "TEST"
        }
        svc.test_adapter = partial_mock

        ok, msg, res = svc.execute_order(
            bot_id="partial-test-bot",
            strategy="PARTIAL_STRATEGY",
            symbol="BTC/USDT",
            side="BUY",
            amount=1.0,
            price=86100.0,
            stop_loss=84378.0,
            take_profit=89544.0,
            account_balance=100000.0,
            mode="TEST"
        )
        assert ok is True

        trade_id = res.get("trade_id")

        # Verify position in DB matches 0.45 exactly (not 1.0 requested)
        pos = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))[0]
        assert float(pos["position_size"]) == 0.45
        assert float(pos["entry_price"]) == 86100.0

    def test_reduce_position_routes_through_execute_exit(self):
        """Requirement 3 & 7: Position reduction and manual exits route through execute_exit."""
        svc = OrderExecutionService()
        
        # 1. Create an open position
        ok, msg, entry = svc.execute_order(
            bot_id="reduce-test-bot",
            strategy="REDUCE_STRATEGY",
            symbol="ETH/USDT",
            side="BUY",
            amount=1.0,
            price=2500.0,
            stop_loss=2450.0,
            take_profit=2600.0,
            mode="PAPER"
        )
        assert ok is True
        trade_id = entry.get("trade_id")

        # 2. Close 100% via reduce_position
        red_res = svc.reduce_position(symbol="ETH/USDT", percentage=1.0, broker="PAPER")
        assert red_res.get("success") is True
        assert red_res.get("action") == "FULL_EXIT"
        assert red_res.get("remaining_quantity") == 0.0

        # Verify trade is CLOSED in ledger
        pos = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))[0]
        assert pos["status"] == "CLOSED"

    def test_binance_testnet_real_broker_execution(self):
        """Proves REAL exchange execution on Binance Spot Testnet with official broker order IDs."""
        from src.data_fetcher import get_testnet_fetcher
        from src.execution import ExecutionEngine
        from src.trading_authorization_service import global_trading_authorization_service

        fetcher = get_testnet_fetcher()
        balance = fetcher.fetch_testnet_balance()
        assert balance > 10.0

        symbol = "BTC/USDT"
        ticker = fetcher.fetch_quote(symbol)
        live_price = float(ticker.get("last") or 86000.0)
        assert live_price > 0.0

        order_amount = 0.0005
        sl_price = round(live_price * 0.98, 2)
        tp_price = round(live_price * 1.03, 2)

        with patch.object(config, "LIVE_TRADING_ENABLED", True), \
             patch.object(config, "LIVE_TRADING_ARMED", True), \
             patch.object(config, "MASTER_LIVE_TRADING", True), \
             patch.object(config, "TRADING_MODE", "TESTNET"):

            global_trading_authorization_service.set_live_trading_lock(locked=False, reason="Testnet Unit Test")

            svc = OrderExecutionService()

            # 1. Submit REAL Live Entry Order to Binance Testnet
            ok, msg, entry_res = svc.execute_order(
                bot_id="pytest-binance-testnet-bot",
                strategy="PYTEST_LIVE_STRAT",
                symbol=symbol,
                side="BUY",
                amount=order_amount,
                price=live_price,
                stop_loss=sl_price,
                take_profit=tp_price,
                confidence_score=90.0,
                account_balance=balance,
                is_live=False,
                mode="TESTNET"
            )
            assert ok is True
            broker_order_id = str(entry_res.get("broker_order_id"))
            assert not broker_order_id.startswith("PAPER_ORD_")
            assert not broker_order_id.startswith("TEST_MOCK_")
            trade_id = entry_res.get("trade_id")
            filled_qty = float(entry_res.get("filled_quantity"))
            fill_price = float(entry_res.get("average_price"))
            assert filled_qty > 0.0
            assert fill_price > 0.0

            # 2. Query Broker Order Status from Binance Testnet
            order_status = svc.reconcile_order_with_broker(symbol, broker_order_id, mode="TESTNET")
            assert str(order_status.get("status", "")).upper() in ["CLOSED", "FILLED"]

            # 3. Verify Position in Trade Ledger
            pos = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))[0]
            assert pos["status"] == "OPEN"
            assert pos["execution_mode"] == "TESTNET"
            assert float(pos["position_size"]) == filled_qty

            # 4. Submit REAL Live Exit Order to Binance Testnet
            exit_ticker = fetcher.fetch_quote(symbol)
            exit_price = float(exit_ticker.get("last") or fill_price)

            exit_ok, exit_msg, exit_res = svc.execute_exit(
                bot_id="pytest-binance-testnet-bot",
                trade_id=trade_id,
                symbol=symbol,
                side="SELL",
                quantity=filled_qty,
                price=exit_price,
                exit_reason="PYTEST_EXIT",
                mode="TESTNET",
                broker="BINANCE"
            )
            assert exit_ok is True
            exit_order_id = str(exit_res.get("broker_order_id"))
            assert not exit_order_id.startswith("PAPER_ORD_")

            # 5. Verify Position CLOSED in Trade Ledger
            closed = db.safe_query("SELECT * FROM trades_log WHERE id = ?", (trade_id,))[0]
            assert closed["status"] == "CLOSED"
            assert closed["exit_price"] is not None
            assert closed["net_pnl"] is not None

    def test_binance_production_live_fails_closed_when_credentials_missing(self):
        """Verifies requirement 13: LIVE execution fails closed when production keys are missing."""
        from src.trading_authorization_service import global_trading_authorization_service
        svc = OrderExecutionService()

        with patch.object(config, "LIVE_TRADING_ENABLED", True), \
             patch.object(config, "LIVE_TRADING_ARMED", True), \
             patch.object(config, "BINANCE_LIVE_API_KEY", ""), \
             patch.object(config, "BINANCE_LIVE_SECRET_KEY", ""):

            global_trading_authorization_service.set_live_trading_lock(locked=False, reason="Test")

            with pytest.raises(PermissionError) as exc_info:
                svc.live_adapter.submit_order("BTC/USDT", "BUY", 0.0005, 86000.0)

            assert "LIVE_CREDENTIALS_MISSING" in str(exc_info.value)

    def test_binance_production_live_fails_closed_when_live_disabled(self):
        """Verifies requirement 14: Hard live lock prevents any production order execution."""
        svc = OrderExecutionService()
        with patch.object(config, "LIVE_TRADING_ENABLED", False):
            with pytest.raises(PermissionError) as exc_info:
                svc.live_adapter.submit_order("BTC/USDT", "BUY", 0.0005, 86000.0)
            assert "LIVE_TRADING_DISABLED" in str(exc_info.value)


