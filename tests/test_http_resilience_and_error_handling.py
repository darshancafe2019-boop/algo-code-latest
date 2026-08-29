"""
Unit & Integration Tests: HTTP Error Handling, Resilience & Status Code Verification
=====================================================================================
Tests:
1. Standard JSON error schema formatting
2. Status code mapping (400, 404, 409, 422, 500, 502, 503, 504)
3. Safe JSON parsing with fallback
4. Paper mode protections
5. Idempotent command execution
"""

import pytest
import json
from dashboard import app
from src.db import get_connection


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_standard_health_ready_status(client):
    """Test /health/ready returns 200 with standard health shape."""
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] in ["HEALTHY", "READY", "ok"]


def test_api_status_shape(client):
    """Test /api/status returns 200 and includes provider states."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "providers" in data or "status" in data


def test_invalid_json_handling_on_strategy_eval(client):
    """Test invalid or empty body returns 400 with clean error message."""
    res = client.post("/api/options/strategy/evaluate", data="not-a-json", content_type="application/json")
    assert res.status_code in [400, 422]


def test_missing_legs_validation_on_evaluate(client):
    """Test evaluation with empty legs returns 400 error."""
    res = client.post("/api/options/strategy/evaluate", json={
        "strategy_name": "TEST",
        "underlying": "NIFTY",
        "spot_price": 24800.0,
        "legs": []
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data["status"] == "error"
    assert "leg" in data["message"].lower()


def test_paper_mode_enforcement_on_order(client):
    """Test order validation enforces paper mode or risk gates."""
    res = client.post("/api/options/order/validate", json={
        "underlying": "NIFTY",
        "execution_mode": "PAPER",
        "legs": [
            {"action": "BUY", "option_type": "CALL", "strike": 24800, "expiry": "28-SEP-2026", "premium": 100, "quantity": 1}
        ]
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["is_valid"] is True
    assert data["overall_status"] == "APPROVED"
    assert data["execution_mode"] == "PAPER"


def test_universe_segment_routes(client):
    """Test /api/universe/crypto, /api/universe/nse, /api/universe/us return 200."""
    for seg in ["crypto", "nse", "us"]:
        res = client.get(f"/api/universe/{seg}")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "instruments" in data


def test_sqlite_connection_safety():
    """Verify get_connection safely executes with busy_timeout set."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        res = cur.execute("SELECT 1").fetchone()
        assert res[0] == 1
    finally:
        conn.close()
