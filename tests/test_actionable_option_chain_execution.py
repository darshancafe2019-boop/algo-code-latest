"""
Actionable Option Chain Execution & Order Book Depth Layer - Acceptance Test Suite
==================================================================================
Tests:
1. BTC CALL BUY execution via Paper engine (Delta Exchange instrument)
2. BTC CALL SELL execution via Paper engine (Delta Exchange instrument)
3. BTC PUT BUY execution via Paper engine (Delta Exchange instrument)
4. BTC PUT SELL execution via Paper engine (Delta Exchange instrument)
5. Strikes across ITM, ATM, OTM
6. Missing opposite leg resilience
7. Duplicate order double-click protection (Idempotency Key cache)
8. Global Kill Switch rejection
9. Broker segregation and safety verification (TRADING_MODE=PAPER)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import time
import pytest
from datetime import datetime, timezone

from dashboard import app, _quick_trade_idempotency_cache, _quick_trade_cache_lock
from src import config, db
from src.execution_service import order_execution_service


class TestActionableOptionChainExecution:

    @pytest.fixture(autouse=True)
    def setup_test(self):
        self.client = app.test_client()
        with _quick_trade_cache_lock:
            _quick_trade_idempotency_cache.clear()
        yield
        with _quick_trade_cache_lock:
            _quick_trade_idempotency_cache.clear()

    def test_btc_call_buy_execution(self):
        """Test BUY BTC Call option on Delta Exchange under PAPER mode."""
        client_order_id = f"OPT_TEST_BUY_CE_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "C-BTC-77800-120926",
            "direction": "LONG",
            "side": "BUY",
            "order_type": "LIMIT",
            "quantity": 1.0,
            "price": 525.0,
            "mode": "PAPER",
            "broker": "DELTA",
            "provider": "DELTA_INDIA",
            "underlying": "BTC",
            "strike": 77800,
            "option_type": "CALL",
            "expiry": "12-SEP-2026",
        }

        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
        data = res.get_json()
        assert data["status"] == "success"
        assert data["mode"] == "PAPER"
        assert data["direction"] == "LONG"
        assert data["symbol"] == "C-BTC-77800-120926"
        assert data["client_order_id"] == client_order_id
        assert data["order_state"] in ["OPEN", "FILLED"]

    def test_btc_call_sell_execution(self):
        """Test SELL BTC Call option on Delta Exchange under PAPER mode."""
        client_order_id = f"OPT_TEST_SELL_CE_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "C-BTC-77800-120926",
            "direction": "SHORT",
            "side": "SELL",
            "order_type": "LIMIT",
            "quantity": 1.0,
            "price": 500.0,
            "mode": "PAPER",
            "broker": "DELTA",
            "provider": "DELTA_INDIA",
            "underlying": "BTC",
            "strike": 77800,
            "option_type": "CALL",
            "expiry": "12-SEP-2026",
        }

        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["direction"] == "SHORT"
        assert data["symbol"] == "C-BTC-77800-120926"

    def test_btc_put_buy_execution(self):
        """Test BUY BTC Put option on Delta Exchange under PAPER mode."""
        client_order_id = f"OPT_TEST_BUY_PE_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "P-BTC-78000-120926",
            "direction": "LONG",
            "side": "BUY",
            "order_type": "LIMIT",
            "quantity": 1.0,
            "price": 480.0,
            "mode": "PAPER",
            "broker": "DELTA",
            "provider": "DELTA_INDIA",
            "underlying": "BTC",
            "strike": 78000,
            "option_type": "PUT",
            "expiry": "12-SEP-2026",
        }

        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["symbol"] == "P-BTC-78000-120926"
        assert data["direction"] == "LONG"

    def test_btc_put_sell_execution(self):
        """Test SELL BTC Put option on Delta Exchange under PAPER mode."""
        client_order_id = f"OPT_TEST_SELL_PE_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "P-BTC-78000-120926",
            "direction": "SHORT",
            "side": "SELL",
            "order_type": "LIMIT",
            "quantity": 1.0,
            "price": 475.0,
            "mode": "PAPER",
            "broker": "DELTA",
            "provider": "DELTA_INDIA",
            "underlying": "BTC",
            "strike": 78000,
            "option_type": "PUT",
            "expiry": "12-SEP-2026",
        }

        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["symbol"] == "P-BTC-78000-120926"
        assert data["direction"] == "SHORT"

    def test_different_moneyness_strikes(self):
        """Test strikes across ITM, ATM, and OTM."""
        strikes = [70000, 78000, 85000] # Deep ITM, ATM, Deep OTM
        for strike in strikes:
            client_order_id = f"OPT_TEST_STRIKE_{strike}_{int(time.time() * 1000)}"
            payload = {
                "client_order_id": client_order_id,
                "symbol": f"C-BTC-{strike}-120926",
                "direction": "LONG",
                "quantity": 1.0,
                "price": 600.0,
                "mode": "PAPER",
                "broker": "DELTA",
                "underlying": "BTC",
                "strike": strike,
                "option_type": "CALL",
            }
            res = self.client.post(
                "/api/quick-trade/execute",
                data=json.dumps(payload),
                content_type="application/json"
            )
            assert res.status_code == 200
            data = res.get_json()
            assert data["status"] == "success"
            assert data["symbol"] == f"C-BTC-{strike}-120926"

    def test_duplicate_order_protection(self):
        """Test that submitting the exact same client_order_id returns cached idempotent result without double execution."""
        idempotency_key = f"IDEMPOTENT_OPT_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": idempotency_key,
            "symbol": "C-BTC-77800-120926",
            "direction": "LONG",
            "quantity": 1.0,
            "price": 525.0,
            "mode": "PAPER",
            "broker": "DELTA",
        }

        # First Submission
        res1 = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res1.status_code == 200
        data1 = res1.get_json()

        # Second Submission (Duplicate Double Click)
        res2 = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res2.status_code == 200
        data2 = res2.get_json()

        # Both must return the identical trade_id and client_order_id
        assert data1["trade_id"] == data2["trade_id"]
        assert data1["client_order_id"] == data2["client_order_id"] == idempotency_key

    def test_kill_switch_blocking(self, monkeypatch):
        """Test that active kill switch rejects order submission."""
        monkeypatch.setattr(config, "GLOBAL_TRADING_KILL_SWITCH", True, raising=False)

        client_order_id = f"OPT_KILL_TEST_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "C-BTC-77800-120926",
            "direction": "LONG",
            "quantity": 1.0,
            "price": 525.0,
            "mode": "PAPER",
        }

        res = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 403
        data = res.get_json()
        assert data["status"] == "rejected"
        assert "Kill Switch" in data["message"]

    def test_live_trading_disabled_safety(self):
        """Test that LIVE mode requests fail safely when LIVE_TRADING_ENABLED=false."""
        client_order_id = f"OPT_LIVE_SAFETY_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_order_id,
            "symbol": "C-BTC-77800-120926",
            "direction": "LONG",
            "quantity": 1.0,
            "price": 525.0,
            "mode": "LIVE",
        }

        res = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 403
        data = res.get_json()
        assert data["status"] == "rejected"
