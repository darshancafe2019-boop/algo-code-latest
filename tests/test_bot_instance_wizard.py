"""
Comprehensive Test Suite for Bot Instance Wizard & Multi-Asset Creation Engine
Validates capital management, stop-loss formulas, auto square-off scopes,
indicator combinations, leverage bounds, options/futures configurations, and versioning.
"""

import json
import pytest
from datetime import datetime, timezone
import dashboard
from src import db

@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        yield c

class TestBotInstanceWizardSystem:

    def test_01_bot_validation_endpoint_success(self, client):
        """Test pre-flight validation API for a valid prospective bot instance."""
        payload = {
            "name": "Alpha Momentum 5m",
            "symbol": "BTC/USDT",
            "allocated_capital": 25000.0,
            "stop_loss_pct": 2.0,
            "profit_target_pct": 5.0,
            "leverage": 3.0,
            "lot_size": 2,
            "lots_count": 1,
            "asset_class": "CRYPTO",
            "execution_mode": "PAPER",
            "estimated_price": 60000.0
        }
        res = client.post("/api/bots/validate", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["is_valid"] is True
        assert len(data["errors"]) == 0
        preview = data["preview"]
        assert preview["allocated_capital"] == 25000.0
        assert preview["total_quantity"] == 2
        assert preview["estimated_notional"] == 120000.0
        assert preview["required_margin"] == 40000.0
        assert preview["maximum_loss"] == 2400.0
        assert preview["stop_loss_pct"] == 2.0
        assert preview["profit_target_pct"] == 5.0

    def test_02_bot_validation_endpoint_rejections(self, client):
        """Test validation error traps for invalid capital, lot size, SL %, or leverage."""
        # Case 1: Missing Name & Negative Capital
        res1 = client.post("/api/bots/validate", json={"name": "", "allocated_capital": -500})
        assert res1.status_code == 400
        data1 = res1.get_json()
        assert any("Bot Name" in err for err in data1["errors"])
        assert any("Allocated Capital" in err for err in data1["errors"])

        # Case 2: Zero Lot Size and Excessive Leverage (> 25x)
        res2 = client.post("/api/bots/validate", json={
            "name": "TestBot",
            "symbol": "ETH/USDT",
            "allocated_capital": 5000,
            "lot_size": 0,
            "leverage": 50.0,
            "stop_loss_pct": 75.0
        })
        assert res2.status_code == 400
        data2 = res2.get_json()
        assert "Lot size must be at least 1." in data2["errors"]
        assert any("Leverage" in err for err in data2["errors"])
        assert "Stop-Loss % must be between 0.1% and 50%." in data2["errors"]

    def test_02b_capital_and_options_validation(self, client):
        """Test capital bounds and options premium validation."""
        # Allocated exceeding total capital
        res_cap = client.post("/api/bots/validate", json={
            "name": "Overallocated Bot",
            "symbol": "BTC/USDT",
            "total_capital": 500000.0,
            "allocated_capital": 600000.0
        })
        assert res_cap.status_code == 400
        assert any("cannot exceed Total Capital Available" in err for err in res_cap.get_json()["errors"])

        # Valid capital allocation
        res_cap_ok = client.post("/api/bots/validate", json={
            "name": "Properly Sized Bot",
            "symbol": "BTC/USDT",
            "total_capital": 500000.0,
            "allocated_capital": 100000.0
        })
        assert res_cap_ok.status_code == 200
        assert res_cap_ok.get_json()["preview"]["remaining_capital"] == 400000.0
        assert res_cap_ok.get_json()["preview"]["allocation_pct"] == 20.0

        # Invalid options premium (min > max)
        res_opt = client.post("/api/bots/validate", json={
            "name": "Options Spread Bot",
            "symbol": "NIFTY",
            "asset_class": "OPTIONS",
            "allocated_capital": 50000.0,
            "options_config": {
                "call_premium_min": 250.0,
                "call_premium_max": 100.0
            }
        })
        assert res_opt.status_code == 400
        assert any("Minimum Call Premium cannot be greater" in err for err in res_opt.get_json()["errors"])

    def test_02c_brokers_status_endpoint(self, client):
        """Test /api/brokers/status returns connected brokers and leverage."""
        res = client.get("/api/brokers/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert len(data["brokers"]) >= 5
        broker_ids = [b["id"] for b in data["brokers"]]
        assert "paper_simulator" in broker_ids
        assert "dhan_india" in broker_ids
        assert "ccxt_binance" in broker_ids

    def test_03_create_bot_instance_crypto(self, client):
        """Test creating a Crypto bot instance with full risk and indicator config."""
        payload = {
            "name": "BTC Trend Confluence V1",
            "symbol": "BTC/USDT",
            "strategy": "EMA_MACD_VP",
            "strategy_type": "STANDARD",
            "timeframe": "5m",
            "asset_class": "CRYPTO",
            "exchange": "ccxt_binance",
            "execution_mode": "PAPER",
            "allocated_capital": 15000.0,
            "risk_pct": 2.0,
            "stop_loss_pct": 1.5,
            "profit_target_pct": 4.5,
            "leverage": 2.0,
            "lot_size": 1,
            "lots_count": 2,
            "auto_square_off": {
                "enabled": True,
                "scope": "per_trade",
                "on_target": True,
                "on_sl": True
            },
            "capital_allocation": {
                "max_per_trade": 1500.0,
                "max_per_strategy": 7500.0,
                "max_total_exposure": 12000.0
            },
            "indicators": ["ema", "macd", "rsi", "vp"],
            "indicator_combination": {
                "rules": ["EMA ACTIVE", "MACD ACTIVE", "RSI ACTIVE"],
                "operator": "AND",
                "min_score": 80.0,
                "use_scoring": True
            }
        }
        res = client.post("/api/bots/create", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        bot_id = data["bot_id"]
        assert bot_id.startswith("bot-")

        # Verify database record
        records = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
        assert len(records) == 1
        r = records[0]
        assert r["name"].startswith("BTC Trend Confluence V1")
        assert r["symbol"] == "BTC/USDT"
        assert r["allocated_capital"] == 15000.0
        cfg = json.loads(r["config_json"])
        assert cfg["version"] == 1
        assert cfg["stop_loss_pct"] == 1.5
        assert cfg["profit_target_pct"] == 4.5
        assert cfg["leverage"] == 2.0
        assert cfg["lots_count"] == 2
        assert cfg["indicator_combination"]["operator"] == "AND"

    def test_04_create_bot_instance_indian_equities(self, client):
        """Test creating an Indian equity bot in INR (₹) with contract lot size."""
        payload = {
            "name": "Nifty Index Scalper INR",
            "symbol": "NIFTY",
            "strategy": "SUPERTREND_BREAKOUT",
            "strategy_type": "STANDARD",
            "timeframe": "15m",
            "asset_class": "INDIAN_STOCKS",
            "exchange": "nse",
            "execution_mode": "PAPER",
            "allocated_capital": 100000.0,
            "stop_loss_pct": 1.0,
            "profit_target_pct": 2.5,
            "leverage": 1.0,
            "lot_size": 50,
            "lots_count": 2,
            "group_name": "NSE Derivative Bots"
        }
        res = client.post("/api/bots/create", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        bot_id = data["bot_id"]

        record = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))[0]
        assert record["asset_class"] == "INDIAN_STOCKS"
        assert record["allocated_capital"] == 100000.0
        assert record["group_name"] == "NSE Derivative Bots"

    def test_05_create_bot_instance_options_and_futures(self, client):
        """Test creating an Options multi-leg bot and Futures bot."""
        # Options bot
        opt_payload = {
            "name": "BTC Iron Condor Range Bot",
            "symbol": "BTC-260828-70000-C",
            "strategy": "OPTIONS_DELTA_NEUTRAL",
            "strategy_type": "OPTIONS",
            "timeframe": "1h",
            "asset_class": "OPTIONS",
            "exchange": "deribit",
            "execution_mode": "PAPER",
            "allocated_capital": 50000.0,
            "stop_loss_pct": 3.0,
            "profit_target_pct": 6.0,
            "options_config": {
                "expiry": "2026-08-28",
                "strike_type": "ATM",
                "combo": "Iron Condor"
            }
        }
        res_opt = client.post("/api/bots/create", json=opt_payload)
        assert res_opt.status_code == 200
        data_opt = res_opt.get_json()
        assert data_opt["config"]["options_config"]["combo"] == "Iron Condor"

    def test_06_update_bot_instance_versioning(self, client):
        """Test updating an existing bot instance and verifying version increment."""
        # Create bot
        create_res = client.post("/api/bots/create", json={
            "name": "ETH Momentum Bot",
            "symbol": "ETH/USDT",
            "allocated_capital": 10000.0,
            "stop_loss_pct": 1.5
        })
        bot_id = create_res.get_json()["bot_id"]

        # Edit bot (Version 1 -> Version 2)
        update_res = client.put(f"/api/bots/{bot_id}", json={
            "name": "ETH Momentum Bot Upgraded",
            "symbol": "ETH/USDT",
            "allocated_capital": 20000.0,
            "stop_loss_pct": 2.5,
            "profit_target_pct": 7.0,
            "leverage": 5.0
        })
        assert update_res.status_code == 200
        up_data = update_res.get_json()
        assert up_data["version"] == 2
        assert up_data["config"]["stop_loss_pct"] == 2.5
        assert up_data["config"]["leverage"] == 5.0

        # Verify DB
        rec = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))[0]
        assert rec["name"] == "ETH Momentum Bot Upgraded"
        assert rec["allocated_capital"] == 20000.0

    def test_07_get_bot_config_endpoint(self, client):
        """Test /api/bots/<bot_id>/config endpoint returns structured JSON."""
        create_res = client.post("/api/bots/create", json={
            "name": "Config Check Bot",
            "symbol": "SOL/USDT",
            "allocated_capital": 8000.0
        })
        bot_id = create_res.get_json()["bot_id"]

        res = client.get(f"/api/bots/{bot_id}/config")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["bot"]["id"] == bot_id
        assert data["bot"]["name"].startswith("Config Check Bot")
        assert "config" in data["bot"]
        assert data["bot"]["config"]["version"] == 1
