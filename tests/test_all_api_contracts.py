"""
Comprehensive API Contract & Error Elimination Verification Script
Tests all 32+ backend REST API routes to confirm status 200, valid JSON payloads,
correct types, and zero 500 server errors or unhandled exceptions.
"""

import pytest
import dashboard
from src import db

@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        yield c

class TestApiContractsAndErrorElimination:

    def test_01_core_market_apis(self, client):
        """Test /api/ticker, /api/market, /api/orderbook/depth, /api/candles."""
        res = client.get("/api/ticker?symbol=BTC/USDT")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "symbol" in data["data"]
        assert "last" in data["data"]

        res2 = client.get("/api/market")
        assert res2.status_code == 200

        res3 = client.get("/api/orderbook/depth?symbol=BTC/USDT")
        assert res3.status_code == 200
        data3 = res3.get_json()
        assert "bids" in data3
        assert "asks" in data3
        assert isinstance(data3["bids"], list)
        assert isinstance(data3["asks"], list)

        res4 = client.get("/api/candles?symbol=BTC/USDT&timeframe=5m")
        assert res4.status_code == 200
        data4 = res4.get_json()
        assert "candles" in data4
        assert isinstance(data4["candles"], list)

    def test_02_crypto_derivatives_apis(self, client):
        """Test Options & Futures APIs."""
        res1 = client.get("/api/crypto/options/expiries?underlying=BTC")
        assert res1.status_code == 200
        data1 = res1.get_json()
        assert "expiries" in data1
        assert isinstance(data1["expiries"], list)

        res2 = client.get("/api/crypto/options/chain?underlying=BTC")
        assert res2.status_code == 200
        data2 = res2.get_json()
        assert "strikes" in data2
        assert isinstance(data2["strikes"], list)

        res3 = client.get("/api/crypto/futures/contracts?underlying=BTC")
        assert res3.status_code == 200
        data3 = res3.get_json()
        assert "contracts" in data3
        assert isinstance(data3["contracts"], list)

        res4 = client.get("/api/crypto/orders")
        assert res4.status_code == 200
        assert "orders" in res4.get_json()

        res5 = client.get("/api/crypto/positions")
        assert res5.status_code == 200
        assert "positions" in res5.get_json()

        res6 = client.get("/api/crypto/pnl/summary")
        assert res6.status_code == 200
        assert "total_pnl" in res6.get_json()

    def test_03_risk_engine_apis(self, client):
        """Test Risk Management & Sizing calculation endpoints."""
        res1 = client.get("/api/risk/overview")
        assert res1.status_code == 200
        data1 = res1.get_json()
        assert "overview" in data1
        assert "asset_class_exposure" in data1

        res2 = client.get("/api/risk/limits")
        assert res2.status_code == 200
        assert res2.get_json()["status"] == "success"

        res3 = client.get("/api/risk/profiles")
        assert res3.status_code == 200
        assert "profiles" in res3.get_json()

        res4 = client.post("/api/risk/position-size", json={
            "account_balance": 50000,
            "entry_price": 60000,
            "stop_loss_price": 58800,
            "sizing_method": "FIXED_FRACTIONAL",
            "risk_pct": 2.0
        })
        assert res4.status_code == 200
        assert "position_size" in res4.get_json() or "quantity" in res4.get_json()

        res5 = client.post("/api/risk/futures/calculate", json={
            "contract": "BTC-PERP",
            "lots": 2,
            "leverage": 5.0,
            "entry_price": 60000.0,
            "direction": "LONG"
        })
        assert res5.status_code == 200
        data5 = res5.get_json()
        assert "initial_margin" in data5
        assert "notional_value" in data5

        res6 = client.post("/api/risk/options/calculate", json={
            "strategy_type": "BULL_CALL_SPREAD",
            "legs": [
                {"strike": 60000, "option_type": "CALL", "action": "BUY", "premium": 1500, "contracts": 1},
                {"strike": 65000, "option_type": "CALL", "action": "SELL", "premium": 500, "contracts": 1}
            ]
        })
        assert res6.status_code == 200
        data6 = res6.get_json()
        assert "maximum_profit" in data6 or "max_profit" in data6
        assert "payoff_curve" in data6

    def test_04_bot_registry_apis(self, client):
        """Test bot registry CRUD, summary, validation, and events."""
        res1 = client.get("/api/bots")
        assert res1.status_code == 200
        assert "bots" in res1.get_json()

        res2 = client.get("/api/bots/summary")
        assert res2.status_code == 200
        assert "metrics" in res2.get_json()

        res3 = client.get("/api/bots/events")
        assert res3.status_code == 200
        assert "events" in res3.get_json()

        res4 = client.post("/api/bots/validate", json={
            "name": "AuditBot",
            "symbol": "BTC/USDT",
            "allocated_capital": 10000,
            "stop_loss_pct": 2.0,
            "profit_target_pct": 4.0,
            "leverage": 3.0,
            "lot_size": 1,
            "lots_count": 1
        })
        assert res4.status_code == 200
        assert res4.get_json()["is_valid"] is True

    def test_05_system_health_and_analytics(self, client):
        """Test health diagnostics and performance analytics."""
        res1 = client.get("/api/health/system")
        assert res1.status_code == 200
        assert "subsystems" in res1.get_json()

        res2 = client.get("/api/system-health/status")
        assert res2.status_code == 200
        assert "overall_health" in res2.get_json()
        assert "frontend" in res2.get_json()["subsystems"]
        assert "broker" in res2.get_json()["subsystems"]

        res3 = client.get("/api/analytics/summary")
        assert res3.status_code == 200
        assert "data" in res3.get_json()
        assert "trade_count" in res3.get_json()

        res4 = client.get("/api/analytics/win-loss")
        assert res4.status_code == 200
        assert "data" in res4.get_json()

        res5 = client.get("/api/universe/instruments?limit=10")
        assert res5.status_code == 200
        assert "instruments" in res5.get_json()

    def test_06_orders_and_telegram_contracts(self, client):
        """Test canonical /api/orders and /api/notifications/telegram/* endpoints."""
        # 1. GET /api/orders
        res_orders = client.get("/api/orders?limit=10")
        assert res_orders.status_code == 200
        data_orders = res_orders.get_json()
        assert data_orders["success"] is True
        assert data_orders["status"] == "success"
        assert "orders" in data_orders
        assert isinstance(data_orders["orders"], list)
        assert "total_count" in data_orders

        # 2. POST /api/orders (place paper order)
        res_post = client.post("/api/orders", json={
            "symbol": "BTC/USDT",
            "side": "BUY",
            "quantity": 0.05,
            "price": 64000.0,
            "stop_loss": 62500.0,
            "take_profit": 67000.0,
            "execution_mode": "PAPER",
            "bot_id": "test-order-bot"
        })
        assert res_post.status_code in [200, 201]
        post_data = res_post.get_json()
        assert post_data["success"] is True
        assert "order_id" in post_data
        order_id = post_data["order"]["id"]

        # 3. GET /api/orders/<order_id>
        res_get_id = client.get(f"/api/orders/{order_id}")
        assert res_get_id.status_code == 200
        assert res_get_id.get_json()["order"]["symbol"] == "BTC/USDT"

        # 4. DELETE /api/orders/<order_id>
        res_del_id = client.delete(f"/api/orders/{order_id}")
        assert res_del_id.status_code == 200
        assert res_del_id.get_json()["success"] is True

        # 5. DELETE /api/orders (bulk emergency cancel)
        res_del_all = client.delete("/api/orders")
        assert res_del_all.status_code == 200
        assert res_del_all.get_json()["success"] is True

        # 6. POST /api/notifications/telegram/test (structured diagnostic response)
        res_tg = client.post("/api/notifications/telegram/test", json={"bot_name": "TestBot"})
        # Returns 200 if configured or 400 with structured diagnostic error
        assert res_tg.status_code in [200, 400]
        tg_data = res_tg.get_json()
        assert "status" in tg_data
        if res_tg.status_code == 400:
            assert tg_data["success"] is False
            assert "error" in tg_data
            assert "error_code" in tg_data
            assert "missing" in tg_data or "message" in tg_data

