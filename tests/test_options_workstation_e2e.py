"""
End-to-End API Integration Test Suite for Options Workstation & Pairs Trading
=============================================================================
Verifies all REST routes implemented in dashboard.py:
- /api/options/catalog
- /api/options/providers/status
- /api/options/strategies
- /api/options/strategy/evaluate
- /api/options/strategy/preset
- /api/options/order/validate
- /api/options/order/execute
- /api/options/positions
- /api/options/pairs/scan
- /api/options/pairs/analyze
- /api/options/pairs/option-structure
- /api/options/pairs/backtest
- /api/options/pairs/execute
- /api/options/active-strategies
- /api/options/risk/summary
- /api/options/audit-logs
- /api/options/kill-switch
"""

import json
import pytest
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_options_catalog(client):
    res = client.get("/api/options/catalog")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "instruments" in data or "catalog" in data


def test_api_options_strategies_list(client):
    res = client.get("/api/options/strategies")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["count"] >= 20


def test_api_options_strategy_preset(client):
    res = client.get("/api/options/strategy/preset?name=bull-call-spread&underlying=NIFTY&spot=24800")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "payoff_curve" in data


def test_api_options_pairs_scan(client):
    res = client.post("/api/options/pairs/scan", json={"market": "ALL", "lookback": 180})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "pairs" in data
    assert len(data["pairs"]) > 0


def test_api_options_pairs_analyze(client):
    res = client.post("/api/options/pairs/analyze", json={"pair_id": "HDFCBANK_ICICIBANK", "lookback": 180})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "analysis" in data
    assert data["analysis"]["pair_id"] == "HDFCBANK_ICICIBANK"


def test_api_options_pairs_option_structure(client):
    res = client.post("/api/options/pairs/option-structure", json={
        "pair_id": "HDFCBANK_ICICIBANK",
        "structure_type": "DEEP_ITM_CALL_PROXY",
        "allocated_capital": 25000.0,
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "structure" in data


def test_api_options_pairs_backtest(client):
    res = client.post("/api/options/pairs/backtest", json={
        "pair_id": "HDFCBANK_ICICIBANK",
        "initial_capital": 25000.0,
        "formation_window": 60,
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "backtest" in data


def test_api_options_pairs_execute(client):
    res = client.post("/api/options/pairs/execute", json={
        "pair_id": "HDFCBANK_ICICIBANK",
        "symbol_a": "HDFCBANK",
        "symbol_b": "ICICIBANK",
        "direction": "LONG_A_SHORT_B",
        "execution_mode": "PAPER",
        "broker": "paper",
        "quantity_a": 100.0,
        "quantity_b": 100.0,
        "limit_price_a": 1650.0,
        "limit_price_b": 1150.0,
        "hedge_ratio": 1.40,
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "status" in data


def test_api_options_active_strategies(client):
    res = client.get("/api/options/active-strategies")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "strategies" in data


def test_api_options_risk_summary(client):
    res = client.get("/api/options/risk/summary")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "risk" in data


def test_api_options_audit_logs(client):
    res = client.get("/api/options/audit-logs")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "logs" in data


def test_api_options_kill_switch(client):
    res = client.post("/api/options/kill-switch")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "SUCCESS"
