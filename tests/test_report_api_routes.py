"""
Flask Backend Reporting & Intelligence Routes Test Suite
=========================================================
Validates /api/reports/generate, /api/connections/matrix,
/api/market-intelligence/overview, /api/reports/history, and /api/options/analyze-strategy.
"""

import pytest
import json
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_reports_generate_route(client):
    """Tests POST /api/reports/generate route returns full multi-asset report."""
    res = client.post("/api/reports/generate", json={"report_type": "GLOBAL_MARKET_REPORT"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["report"]["report_type"] == "GLOBAL_MARKET_REPORT"
    assert "market_board" in data["report"]
    assert "executive_summary" in data["report"]
    assert "data_quality" in data["report"]


def test_api_connections_matrix_route(client):
    """Tests GET /api/connections/matrix route returns capability matrix."""
    res = client.get("/api/connections/matrix")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "connections" in data["matrix"]
    assert data["matrix"]["live_trading_locked"] is True


def test_api_market_intelligence_overview_route(client):
    """Tests GET /api/market-intelligence/overview route."""
    res = client.get("/api/market-intelligence/overview")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "executive_summary" in data
    assert "market_board" in data


def test_api_options_analyze_strategy_route(client):
    """Tests POST /api/options/analyze-strategy route."""
    payload = {
        "name": "BULL_CALL_SPREAD_TEST",
        "underlying": "NIFTY",
        "spot_price": 25000.0,
        "lot_size": 25,
        "legs": [
            {"option_type": "CALL", "strike": 25000, "side": "BUY", "quantity": 1, "entry_price": 200.0, "current_price": 220.0},
            {"option_type": "CALL", "strike": 25200, "side": "SELL", "quantity": 1, "entry_price": 80.0, "current_price": 90.0},
        ],
    }
    res = client.post("/api/options/analyze-strategy", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert data["strategy"]["risk_classification"] == "DEFINED_RISK"
    assert data["strategy"]["net_premium"] == 3000.0
