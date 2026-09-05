import pytest
import json
import uuid
from dashboard import app
from src.db import init_db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    init_db()
    with app.test_client() as client:
        yield client

def test_brokers_status_endpoint(client):
    res = client.get("/api/brokers/status")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert "brokers" in data
    assert len(data["brokers"]) > 0
    broker_ids = [b["id"] for b in data["brokers"]]
    assert "paper_simulator" in broker_ids or "ccxt_binance" in broker_ids


def test_bots_validate_endpoint_valid_config(client):
    payload = {
        "identity": {
            "name": "Integration Test Bot",
            "slug": "integration-test-bot"
        },
        "universe": {
            "market": "NSE",
            "symbol": "TCS",
            "timeframe": "5m"
        },
        "strategy": {
            "strategy_id": "trend_following",
            "strategy_name": "Trend Following Breakout"
        },
        "capital": {
            "allocated_capital": 50000.0,
            "max_leverage": 1.0
        },
        "risk": {
            "max_daily_loss": 2000.0,
            "max_drawdown_pct": 5.0,
            "stop_loss_pct": 1.5,
            "take_profit_pct": 3.0
        },
        "execution": {
            "broker": "PAPER_TRADING",
            "order_routing": "DIRECT"
        }
    }
    res = client.post("/api/bots/validate", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["is_valid"] is True
    assert "evidence_checklist" in data
    assert len(data["evidence_checklist"]) > 0
    assert data["safety_gate_status"] == "ARMED"
    assert data["live_gate_status"] == "LOCKED"

def test_bots_validate_endpoint_invalid_config(client):
    payload = {
        "identity": {
            "name": "",
            "slug": ""
        },
        "capital": {
            "allocated_capital": -100.0
        },
        "risk": {
            "max_daily_loss": 5000.0
        }
    }
    res = client.post("/api/bots/validate", data=json.dumps(payload), content_type="application/json")
    assert res.status_code in [200, 400]
    data = json.loads(res.data)
    assert data["is_valid"] is False
    assert len(data["errors"]) > 0
    statuses = [e["status"] for e in data["evidence_checklist"]]
    assert any(s in ["FAILED", "FAIL", "WARNING"] for s in statuses)

def test_bots_create_deterministic_and_idempotent(client):
    idempotency_key = f"idemp_{uuid.uuid4().hex[:12]}"
    payload = {
        "idempotency_key": idempotency_key,
        "identity": {
            "name": "Deterministic Momentum Bot",
            "slug": "det-momentum-bot"
        },
        "environment": {
            "mode": "PAPER",
            "timezone": "Asia/Kolkata"
        },
        "universe": {
            "market": "NSE",
            "symbol": "INFY",
            "timeframe": "15m"
        },
        "strategy": {
            "strategy_id": "rsi_strategy",
            "strategy_name": "RSI Mean Reversion"
        },
        "capital": {
            "allocated_capital": 75000.0
        },
        "risk": {
            "max_daily_loss": 3000.0,
            "max_drawdown_pct": 5.0,
            "stop_loss_pct": 2.0
        },
        "execution": {
            "broker": "PAPER_TRADING",
            "execution_trigger": "BAR_CLOSE"
        }
    }

    # 1. First creation
    res1 = client.post("/api/bots/create", data=json.dumps(payload), content_type="application/json")
    assert res1.status_code in [200, 201]
    data1 = json.loads(res1.data)
    assert data1["success"] is True
    bot_id = data1["bot"]["id"]
    assert data1["bot"]["status"] in ["CREATED", "STOPPED"]
    assert data1["bot"]["mode"] == "PAPER"
    assert data1["bot"]["slug"].startswith("det-momentum-bot") or data1["bot"]["slug"].startswith("deterministic-momentum-bot")

    # 2. Idempotent replay with same key
    res2 = client.post("/api/bots/create", data=json.dumps(payload), content_type="application/json")
    assert res2.status_code == 200
    data2 = json.loads(res2.data)
    assert data2["success"] is True
    assert data2["idempotent_replay"] is True
    assert data2["bot"]["id"] == bot_id

    # 3. Retrieve config history
    res3 = client.get(f"/api/bots/{bot_id}/config")
    assert res3.status_code == 200
    data3 = json.loads(res3.data)
    assert "history" in data3
    assert len(data3["history"]) >= 1
    assert data3["history"][0]["version"] == 1

def test_bots_drafts_crud_lifecycle(client):
    draft_id = f"draft_{uuid.uuid4().hex[:8]}"
    payload = {
        "draft_id": draft_id,
        "draft_name": "WIP Options Bot",
        "step": 4,
        "data": {
            "universe": {"market": "NSE", "symbol": "BANKNIFTY"},
            "strategy": {"strategy_id": "iron_condor"}
        }
    }

    # Save draft
    post_res = client.post("/api/bots/drafts", data=json.dumps(payload), content_type="application/json")
    assert post_res.status_code == 200
    post_data = json.loads(post_res.data)
    assert post_data["success"] is True

    # Get drafts list
    list_res = client.get("/api/bots/drafts")
    assert list_res.status_code == 200
    list_data = json.loads(list_res.data)
    assert any((d.get("id") == draft_id or d.get("draft_id") == draft_id) for d in list_data["drafts"])

    # Delete draft
    del_res = client.delete(f"/api/bots/drafts?draft_id={draft_id}")
    assert del_res.status_code == 200
    del_data = json.loads(del_res.data)
    assert del_data["success"] is True
