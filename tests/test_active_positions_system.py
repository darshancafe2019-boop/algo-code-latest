import pytest
import json
import sqlite3
from datetime import datetime, timezone
from dashboard import app
from src import config, db
from src.command_bus import CommandBus, CommandStatus


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def setup_test_positions():
    """Seed test positions in trades_log."""
    db.init_db()
    now_str = datetime.now(timezone.utc).isoformat()
    conn = db.get_connection()
    c = conn.cursor()

    # Clean up previous test entries
    c.execute("DELETE FROM trades_log WHERE symbol LIKE 'TEST/%' OR bot_id = 'test-pos-bot'")

    # Seed Long Position
    c.execute(
        """
        INSERT INTO trades_log (
            trade_id, symbol, direction, entry_price, position_size, stop_loss, take_profit,
            status, execution_mode, bot_id, bot_instance_name, strategy_name, leverage, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "TEST-LONG-01", "TEST/USDT", "LONG", 60000.0, 0.5, 58800.0, 62400.0,
            "OPEN", "PAPER", "test-pos-bot", "Alpha Tester", "TrendFollower", 5.0, now_str
        )
    )
    long_id = c.lastrowid

    # Seed Short Position
    c.execute(
        """
        INSERT INTO trades_log (
            trade_id, symbol, direction, entry_price, position_size, stop_loss, take_profit,
            status, execution_mode, bot_id, bot_instance_name, strategy_name, leverage, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "TEST-SHORT-01", "TEST/USDT", "SHORT", 65000.0, 0.2, 66300.0, 62400.0,
            "OPEN", "PAPER", "test-pos-bot", "Alpha Tester", "TrendFollower", 5.0, now_str
        )
    )
    short_id = c.lastrowid

    conn.commit()
    conn.close()

    yield {"long_id": long_id, "short_id": short_id}

    # Teardown
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM trades_log WHERE symbol LIKE 'TEST/%' OR bot_id = 'test-pos-bot'")
    conn.commit()
    conn.close()


def test_api_positions_get_structure(client, setup_test_positions):
    """Test GET /api/positions returns enriched positions with full telemetry and summary."""
    res = client.get("/api/positions")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "positions" in data
    assert "summary" in data

    summary = data["summary"]
    assert "total_unrealized_pnl" in summary
    assert "open_positions_count" in summary
    assert "total_margin_used" in summary
    assert "long_exposure" in summary
    assert "short_exposure" in summary
    assert "portfolio_risk_utilization_pct" in summary
    assert summary["market_feed_status"] == "LIVE"
    assert summary["broker_sync_status"] == "SYNCHRONIZED"

    # Find the seeded test long position
    long_pos = next((p for p in data["positions"] if p["id"] == setup_test_positions["long_id"]), None)
    assert long_pos is not None
    assert long_pos["symbol"] == "TEST/USDT"
    assert long_pos["direction"] == "LONG"
    assert long_pos["entry_price"] == 60000.0
    assert long_pos["position_size"] == 0.5
    assert "unrealized_pnl" in long_pos
    assert "unrealized_pnl_pct" in long_pos
    assert "sl_distance_price" in long_pos
    assert "tp_distance_price" in long_pos
    assert "liquidation_price" in long_pos
    assert "r_multiple" in long_pos
    assert "risk_reward_ratio" in long_pos


def test_modify_position_protection_valid(client, setup_test_positions):
    """Test modifying Stop Loss and Take Profit with valid parameters."""
    target_id = setup_test_positions["long_id"]
    res = client.post(
        f"/api/positions/{target_id}/modify-protection",
        json={
            "stop_loss": 59000.0,
            "take_profit": 63500.0,
            "source": "Pytest Test Runner"
        }
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["stop_loss"] == 59000.0
    assert data["take_profit"] == 63500.0

    # Verify database persistence
    row = db.safe_query_one("SELECT stop_loss, take_profit FROM trades_log WHERE id = ?", (target_id,))
    assert row["stop_loss"] == 59000.0
    assert row["take_profit"] == 63500.0


def test_modify_position_protection_invalid_bounds(client, setup_test_positions):
    """Test that modifying SL higher than TP on a LONG is rejected."""
    target_id = setup_test_positions["long_id"]
    res = client.post(
        f"/api/positions/{target_id}/modify-protection",
        json={
            "stop_loss": 64000.0,
            "take_profit": 61000.0,  # Invalid: TP lower than SL on a LONG
        }
    )
    assert res.status_code == 400
    data = res.get_json()
    assert data["status"] == "error"


def test_partial_close_position_fractional(client, setup_test_positions):
    """Test closing 50% of an open position."""
    target_id = setup_test_positions["long_id"]
    res = client.post(
        f"/api/positions/{target_id}/partial-close",
        json={
            "percentage": 50,
            "source": "Pytest Partial Scale Test"
        }
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["closed_quantity"] == 0.25
    assert data["remaining_quantity"] == 0.25

    # Verify position in database is still OPEN with reduced size
    row = db.safe_query_one("SELECT position_size, status FROM trades_log WHERE id = ?", (target_id,))
    assert row["status"] == "OPEN"
    assert row["position_size"] == 0.25


def test_partial_close_position_100_percent(client, setup_test_positions):
    """Test closing 100% of an open position."""
    target_id = setup_test_positions["short_id"]
    res = client.post(
        f"/api/positions/{target_id}/partial-close",
        json={
            "percentage": 100,
            "source": "Pytest Full Exit Test"
        }
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"

    # Verify position is now marked CLOSED
    row = db.safe_query_one("SELECT status FROM trades_log WHERE id = ?", (target_id,))
    assert row["status"] == "CLOSED"


def test_command_bus_protection_and_partial_close(setup_test_positions):
    """Test CommandBus dispatching for MODIFY_POSITION_PROTECTION and PARTIAL_CLOSE_POSITION."""
    target_id = setup_test_positions["long_id"]

    # 1. Modify Protection via CommandBus
    res = CommandBus.execute(
        action="MODIFY_POSITION_PROTECTION",
        payload={
            "position_id": target_id,
            "stop_loss": 58500.0,
            "take_profit": 64000.0,
        },
        user="test_operator"
    )
    assert res.get("status") == "SUCCEEDED" or res.get("success") is True
    data = res.get("data", {})
    assert data.get("stop_loss") == 58500.0

    # 2. Partial Close via CommandBus
    res2 = CommandBus.execute(
        action="PARTIAL_CLOSE_POSITION",
        payload={
            "position_id": target_id,
            "percentage": 50,
        },
        user="test_operator"
    )
    assert res2.get("status") == "SUCCEEDED" or res2.get("success") is True
    data2 = res2.get("data", {})
    assert "remaining_quantity" in data2
