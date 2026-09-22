import pytest
import json
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dashboard import app
from src.bot_runtime_service import global_bot_runtime_service
from src.data_core.core import quant_data_core


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_1_existing_bots_in_fleet_snapshot(client):
    """Verify GET /api/bots returns real persistent bots with canonical fields."""
    res = client.get("/api/bots")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "bots" in data
    assert "metrics" in data
    assert data["total"] >= 1
    assert data["metrics"]["total_bots"] >= 1

    # Check canonical fields on the first bot
    first_bot = data["bots"][0]
    assert "id" in first_bot
    assert "botId" in first_bot
    assert "name" in first_bot
    assert "createdAt" in first_bot
    assert first_bot["createdAt"] is not None
    assert "status" in first_bot
    assert "mode" in first_bot
    assert "instrumentType" in first_bot
    assert "pnl" in first_bot
    assert "capital" in first_bot


def test_2_create_call_option_bot(client):
    """Verify creating a CALL Option Bot reflects in GET /api/bots immediately."""
    payload = {
        "name": "TEST_NIFTY_CALL_MOMENTUM",
        "market": "OPTIONS",
        "instrument_type": "OPTION",
        "option_type": "CALL",
        "underlying": "NIFTY",
        "symbol": "NIFTY26SEP25000CE",
        "strike": 25000,
        "expiry": "2026-09-25",
        "security_id": "123456",
        "lot_size": 25,
        "exchange": "NSE",
        "broker": "DHAN",
        "strategy": "EMA + RSI + VWAP",
        "capital": 50000,
        "mode": "PAPER",
        "timeframe": "5m"
    }

    create_res = client.post(
        "/api/v2/bots/spec",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert create_res.status_code in [200, 201]
    create_data = create_res.get_json()
    bot_id = create_data.get("bot_id")
    assert bot_id is not None

    # Fetch fleet snapshot
    res = client.get("/api/bots")
    assert res.status_code == 200
    data = res.get_json()
    matching = [b for b in data["bots"] if b["id"] == bot_id or b["botId"] == bot_id]
    assert len(matching) == 1

    bot = matching[0]
    assert bot["name"] == "TEST_NIFTY_CALL_MOMENTUM"
    assert bot["instrumentType"] == "OPTION"
    assert bot["optionType"] == "CALL"
    assert bot["strike"] == 25000
    assert bot["expiry"] == "2026-09-25"
    assert bot["mode"] == "PAPER"
    assert bot["status"] in ["STOPPED", "DRAFT", "READY_PAPER", "READY", "RUNNING"]
    assert bot["createdAt"] != ""


def test_3_create_put_option_bot(client):
    """Verify creating a PUT Option Bot reflects in GET /api/bots."""
    payload = {
        "name": "TEST_BANKNIFTY_PUT_REVERSAL",
        "market": "OPTIONS",
        "instrument_type": "OPTION",
        "option_type": "PUT",
        "underlying": "BANKNIFTY",
        "symbol": "BANKNIFTY26SEP52000PE",
        "strike": 52000,
        "expiry": "2026-09-25",
        "security_id": "654321",
        "lot_size": 15,
        "exchange": "NSE",
        "broker": "UPSTOX",
        "strategy": "Mean Reversion",
        "capital": 75000,
        "mode": "PAPER",
        "timeframe": "15m"
    }

    create_res = client.post(
        "/api/v2/bots/spec",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert create_res.status_code in [200, 201]
    create_data = create_res.get_json()
    bot_id = create_data.get("bot_id")

    res = client.get("/api/bots")
    data = res.get_json()
    matching = [b for b in data["bots"] if b["id"] == bot_id]
    assert len(matching) == 1
    assert matching[0]["optionType"] == "PUT"
    assert matching[0]["strike"] == 52000


def test_4_create_futures_bot(client):
    """Verify creating a Futures Bot reflects in GET /api/bots."""
    payload = {
        "name": "TEST_NIFTY_FUTURES_TREND",
        "market": "FUTURES",
        "instrument_type": "FUTURE",
        "underlying": "NIFTY",
        "symbol": "NIFTY26SEPFUT",
        "expiry": "2026-09-25",
        "security_id": "789012",
        "lot_size": 25,
        "exchange": "NSE",
        "broker": "DHAN",
        "strategy": "Supertrend Breakout",
        "capital": 150000,
        "mode": "PAPER",
        "timeframe": "1h"
    }

    create_res = client.post(
        "/api/v2/bots/spec",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert create_res.status_code in [200, 201]
    create_data = create_res.get_json()
    bot_id = create_data.get("bot_id")

    res = client.get("/api/bots")
    data = res.get_json()
    matching = [b for b in data["bots"] if b["id"] == bot_id]
    assert len(matching) == 1
    assert matching[0]["instrumentType"] == "FUTURE"


def test_5_bot_lifecycle_control(client):
    """Verify Start, Pause, Resume, Stop lifecycle operations."""
    # Find a test bot
    res = client.get("/api/bots")
    bots = res.get_json()["bots"]
    target_bot = next(b for b in bots if "TEST_NIFTY_CALL" in b["name"])
    bot_id = target_bot["id"]

    # 1. Start
    start_res = client.post(
        f"/api/bots/{bot_id}/control",
        data=json.dumps({"action": "START"}),
        content_type="application/json"
    )
    assert start_res.status_code == 200

    # 2. Pause
    pause_res = client.post(
        f"/api/bots/{bot_id}/control",
        data=json.dumps({"action": "PAUSE"}),
        content_type="application/json"
    )
    assert pause_res.status_code == 200

    # 3. Resume
    resume_res = client.post(
        f"/api/bots/{bot_id}/control",
        data=json.dumps({"action": "RESUME"}),
        content_type="application/json"
    )
    assert resume_res.status_code == 200

    # 4. Stop
    stop_res = client.post(
        f"/api/bots/{bot_id}/control",
        data=json.dumps({"action": "STOP"}),
        content_type="application/json"
    )
    assert stop_res.status_code == 200


def test_6_bot_deletion_and_cleanup(client):
    """Verify bot deletion cleans up from fleet and DB."""
    # Create temporary bot
    payload = {
        "name": "TEST_BOT_FOR_DELETION",
        "market": "OPTIONS",
        "instrument_type": "OPTION",
        "option_type": "CALL",
        "underlying": "NIFTY",
        "symbol": "NIFTY26SEP26000CE",
        "strike": 26000,
        "expiry": "2026-09-25",
        "capital": 10000,
        "mode": "PAPER",
    }
    create_res = client.post(
        "/api/v2/bots/spec",
        data=json.dumps(payload),
        content_type="application/json"
    )
    bot_id = create_res.get_json().get("bot_id")

    # Delete
    del_res = client.delete(f"/api/bots/{bot_id}?force=true")
    assert del_res.status_code == 200

    # Verify absence
    res = client.get("/api/bots")
    bots = res.get_json()["bots"]
    matching = [b for b in bots if b["id"] == bot_id]
    assert len(matching) == 0


def test_7_bot_detail_and_events(client):
    """Verify GET /api/bots/<id> and GET /api/bots/events."""
    res = client.get("/api/bots")
    bots = res.get_json()["bots"]
    assert len(bots) > 0
    test_bot = bots[0]
    bot_id = test_bot["id"]

    # 1. Bot Detail
    detail_res = client.get(f"/api/bots/{bot_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.get_json()
    assert detail_data["status"] == "success"
    bot_obj = detail_data["bot"]
    assert bot_obj["id"] == bot_id
    assert bot_obj["name"] is not None
    assert bot_obj["createdAt"] is not None

    # 2. Bot Events / Decision feed
    events_res = client.get("/api/bots/events")
    assert events_res.status_code == 200
    events_data = events_res.get_json()
    assert events_data["status"] == "success"
    assert "events" in events_data or "decision_logs" in events_data


def test_8_fleet_summary_metrics(client):
    """Verify fleet summary metrics calculation."""
    res = client.get("/api/bots")
    data = res.get_json()
    metrics = data["metrics"]
    bots = data["bots"]

    assert metrics["total_bots"] == len(bots)
    assert metrics["allocated_capital"] >= 0
    assert "running" in metrics
    assert "paused" in metrics
    assert "stopped" in metrics
    assert "pnl_today" in metrics
    assert "realized_pnl" in metrics
    assert "market_exposure" in metrics
