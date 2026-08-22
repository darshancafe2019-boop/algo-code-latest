"""
test_master_execution_and_intelligence.py
=========================================
Comprehensive test suite verifying:
1. End-to-end Paper Trade Execution (BUY -> OPEN -> SQUARE OFF -> CLOSED).
2. Idempotent Order Duplicate Protection (client_order_id idempotency).
3. Risk Gate & Global Kill Switch enforcement.
4. AI Intelligence & Status payload integrity.
"""

import json
import pytest
import time
from dashboard import app
from src import config
from src import db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

class TestMasterPaperExecutionPipeline:
    """Test full execution pipeline from Quick Trade to Position to Square-off."""

    def test_01_paper_buy_execution(self, client):
        client_id = f"test_order_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_id,
            "symbol": "BTC/USDT",
            "direction": "LONG",
            "order_type": "MARKET",
            "quantity": 0.25,
            "price": 65000.0,
            "stop_loss": 63700.0,
            "take_profit": 67600.0,
            "mode": "PAPER",
            "bot_id": "bot-1",
        }

        res = client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["mode"] == "PAPER"
        assert data["direction"] == "LONG"
        assert data["quantity"] == 0.25
        assert data["fill_price"] == 65000.0
        assert "trade_id" in data

    def test_02_idempotency_duplicate_protection(self, client):
        client_id = f"idempotent_order_{int(time.time() * 1000)}"
        payload = {
            "client_order_id": client_id,
            "symbol": "ETH/USDT",
            "direction": "LONG",
            "order_type": "MARKET",
            "quantity": 1.5,
            "price": 3400.0,
            "mode": "PAPER",
        }

        # First request
        res1 = client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res1.status_code == 200
        data1 = res1.get_json()
        trade_id1 = data1["trade_id"]

        # Immediate Duplicate request with same client_order_id
        res2 = client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res2.status_code == 200
        data2 = res2.get_json()
        assert data2["trade_id"] == trade_id1, "Duplicate submission must return cached response without creating second trade."

    def test_03_positions_and_square_off_lifecycle(self, client):
        # 1. Place a trade
        payload = {
            "symbol": "SOL/USDT",
            "direction": "LONG",
            "order_type": "MARKET",
            "quantity": 5.0,
            "price": 145.0,
            "mode": "PAPER",
        }
        res_trade = client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        assert res_trade.status_code == 200
        trade_data = res_trade.get_json()

        # 2. Verify position exists in /api/positions
        res_pos = client.get("/api/positions")
        assert res_pos.status_code == 200
        pos_data = res_pos.get_json()
        positions = pos_data.get("positions", [])
        assert len(positions) > 0
        latest_pos = positions[0]
        pos_id = latest_pos["id"]

        # 3. Square off the position
        res_sq = client.post(f"/api/positions/{pos_id}/square-off", data=json.dumps({"source": "Pytest"}), content_type="application/json")
        assert res_sq.status_code == 200
        sq_data = res_sq.get_json()
        assert sq_data["status"] == "success"

        # 4. Verify position is no longer in open positions
        res_pos_after = client.get("/api/positions")
        pos_after = res_pos_after.get_json().get("positions", [])
        open_ids = [p["id"] for p in pos_after]
        assert pos_id not in open_ids

    def test_04_global_kill_switch_blocking(self, client):
        # Activate kill switch by creating file
        config.KILL_SWITCH_FILE.touch()
        try:
            payload = {
                "symbol": "BTC/USDT",
                "direction": "LONG",
                "quantity": 0.1,
                "price": 65000.0,
                "mode": "PAPER",
            }
            res = client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
            assert res.status_code == 403
            data = res.get_json()
            assert data["status"] == "rejected"
            assert "Kill Switch" in data["message"]
        finally:
            # Clean up kill switch
            if config.KILL_SWITCH_FILE.exists():
                config.KILL_SWITCH_FILE.unlink()

class TestIntelligenceAndBackendRoutes:
    """Test AI Intelligence and backend health routes."""

    def test_05_backend_root_api_health(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "healthy"
        assert data["service"] == "alpha-algo-backend-api"

    def test_06_system_status_and_ai_command(self, client):
        res_st = client.get("/api/status")
        assert res_st.status_code == 200

        # Natural language command execution
        res_cmd = client.post(
            "/api/ai/command",
            data=json.dumps({"prompt": "Show risk status"}),
            content_type="application/json"
        )
        assert res_cmd.status_code == 200
        cmd_data = res_cmd.get_json()
        assert "target_tab" in cmd_data or "explanation" in cmd_data
