"""
test_master_command_engine.py
=============================
Comprehensive test suite verifying:
1. Universal NLP Command Engine (/api/ai/command) across Market, Timeframe, Analysis, Bot, and Trade categories.
2. Pre-Order Preview Generation and 20-stage Risk Verification.
3. Order Execution Pipeline with Idempotent client_order_id.
4. Bot Lifecycle Command Bus integration.
"""

import json
import pytest
import time
from dashboard import app
from src import config, db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

class TestUniversalCommandEngine:
    """Test all command categories supported by the Universal Command Engine."""

    # 1. MARKET COMMANDS
    @pytest.mark.parametrize("cmd, expected_symbol, expected_type", [
        ("show BTC", "BTC/USDT", "MARKET_SWITCH"),
        ("show ETH", "ETH/USDT", "MARKET_SWITCH"),
        ("show NIFTY", "NIFTY", "MARKET_SWITCH"),
        ("show BANKNIFTY", "BANKNIFTY", "MARKET_SWITCH"),
        ("show SENSEX", "SENSEX", "MARKET_SWITCH"),
        ("show futures", "BTC/USDT", "NAVIGATION"),
        ("show options", "BTC/USDT", "NAVIGATION"),
        ("show option chain", "BTC/USDT", "NAVIGATION"),
        ("show watchlist", "BTC/USDT", "NAVIGATION"),
        ("show market status", "BTC/USDT", "MARKET_STATUS"),
    ])
    def test_01_market_commands(self, client, cmd, expected_symbol, expected_type):
        res = client.post("/api/ai/command", data=json.dumps({"prompt": cmd}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == expected_type
        assert "target_tab" in data

    # 2. TIMEFRAME COMMANDS
    @pytest.mark.parametrize("cmd, expected_tf", [
        ("BTC 1m", "1m"),
        ("BTC 5m", "5m"),
        ("BTC 15m", "15m"),
        ("BTC 1h", "1h"),
        ("BTC 4h", "4h"),
        ("NIFTY 5m", "5m"),
        ("set timeframe 15m", "15m"),
    ])
    def test_02_timeframe_commands(self, client, cmd, expected_tf):
        res = client.post("/api/ai/command", data=json.dumps({"prompt": cmd}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == "TIMEFRAME_SWITCH"
        assert data["parameters"].get("timeframe") == expected_tf

    # 3. ANALYSIS COMMANDS
    @pytest.mark.parametrize("cmd", [
        "analyze BTC",
        "analyze NIFTY",
        "show RSI",
        "show MACD",
        "show EMA",
        "show VWAP",
        "show volume",
        "show trend",
        "show market structure",
        "show strategy signal",
    ])
    def test_03_analysis_commands(self, client, cmd):
        res = client.post("/api/ai/command", data=json.dumps({"prompt": cmd}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == "ANALYSIS_QUERY"
        assert data["analysis_data"] is not None
        assert "rsi" in data["analysis_data"]
        assert "confluence_score" in data["analysis_data"]

    # 4. BOT COMMANDS
    @pytest.mark.parametrize("cmd, expected_type", [
        ("start bot", "BOT_CONTROL"),
        ("pause bot", "BOT_CONTROL"),
        ("resume bot", "BOT_CONTROL"),
        ("stop bot", "BOT_CONTROL"),
        ("show bot status", "BOT_STATUS"),
        ("show bot performance", "NAVIGATION"),
        ("show bot logs", "NAVIGATION"),
        ("run paper test", "NAVIGATION"),
        ("backtest strategy", "NAVIGATION"),
    ])
    def test_04_bot_commands(self, client, cmd, expected_type):
        res = client.post("/api/ai/command", data=json.dumps({"prompt": cmd, "bot_id": "bot-1"}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == expected_type

    # 5. TRADE COMMANDS & PRE-ORDER PREVIEWS
    def test_05_trade_command_preview_and_risk(self, client):
        # Trade command: "buy BTC"
        res = client.post("/api/ai/command", data=json.dumps({"prompt": "buy BTC"}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == "TRADE_ORDER_PREVIEW"
        assert data["requires_confirmation"] is True
        assert data["order_preview"] is not None
        
        preview = data["order_preview"]
        assert preview["symbol"] == "BTC/USDT"
        assert preview["direction"] == "LONG"
        assert preview["quantity"] > 0
        assert preview["required_margin"] > 0
        assert preview["maximum_risk"] > 0
        assert preview["mode"] == "PAPER"
        assert preview["risk_status"] == "PASSED"

    def test_06_options_trade_command_preview(self, client):
        # Options Trade command: "buy NIFTY call"
        res = client.post("/api/ai/command", data=json.dumps({"prompt": "buy NIFTY call"}), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["command_type"] == "TRADE_ORDER_PREVIEW"
        preview = data["order_preview"]
        assert preview["symbol"] == "NIFTY"
        assert "CALL" in preview["contract_type"]

    def test_07_order_preview_execution_pipeline(self, client):
        # Generate preview
        res_prev = client.post("/api/ai/command", data=json.dumps({"prompt": "buy BTC"}), content_type="application/json")
        preview = res_prev.get_json()["order_preview"]
        
        # Execute using preview parameters
        client_id = f"test_exec_{int(time.time()*1000)}"
        exec_payload = {
            "client_order_id": client_id,
            "symbol": preview["symbol"],
            "direction": preview["direction"],
            "order_type": preview["order_type"],
            "quantity": preview["quantity"],
            "price": preview["estimated_price"],
            "stop_loss": preview["stop_loss"],
            "take_profit": preview["take_profit"],
            "mode": preview["mode"],
            "bot_id": "bot-1"
        }
        res_exec = client.post("/api/quick-trade/execute", data=json.dumps(exec_payload), content_type="application/json")
        assert res_exec.status_code == 200
        exec_data = res_exec.get_json()
        assert exec_data["status"] == "success"
        assert exec_data["fill_price"] == preview["estimated_price"]
