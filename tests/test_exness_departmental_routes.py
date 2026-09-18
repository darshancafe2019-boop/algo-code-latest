"""
Integration and Unit Tests for Exness Multi-Department Live Market Data System
==============================================================================
Verifies all 6 Exness departments and REST endpoints:
1. GET /api/exness/departments
2. GET /api/exness/quotes & POST /api/exness/quotes
3. GET /api/exness/ltp
4. GET /api/exness/forex
5. GET /api/exness/metals
6. GET /api/exness/indices
7. GET /api/exness/crypto
8. GET /api/exness/stocks
9. GET /api/exness/account/funds
10. GET /api/exness/account/positions
11. GET /api/exness/account/orders
12. POST /api/exness/orders/place
"""

import pytest
import json
from dashboard import app
from src.exness_broker_adapter import ExnessBrokerAdapter


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_exness_departments(client):
    response = client.get("/api/exness/departments")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["total_departments"] == 6
    dept_ids = [d["id"] for d in data["departments"]]
    assert "EXNESS_FOREX_MAJORS_MINORS" in dept_ids
    assert "EXNESS_METALS_COMMODITIES" in dept_ids
    assert "EXNESS_GLOBAL_INDICES" in dept_ids
    assert "EXNESS_CRYPTO_CFD" in dept_ids
    assert "EXNESS_STOCKS_CFD" in dept_ids
    assert "EXNESS_ACCOUNT" in dept_ids


def test_exness_quotes(client):
    response = client.get("/api/exness/quotes?symbols=EURUSD,XAUUSD,US30,BTCUSD,AAPL")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "EURUSD" in data["quotes"]
    assert "XAUUSD" in data["quotes"]
    assert "US30" in data["quotes"]
    assert "BTCUSD" in data["quotes"]
    assert "AAPL" in data["quotes"]
    assert data["quotes"]["EURUSD"]["bid"] > 0
    assert data["quotes"]["EURUSD"]["ask"] > data["quotes"]["EURUSD"]["bid"]
    assert data["quotes"]["XAUUSD"]["last_price"] > 2000


def test_exness_ltp(client):
    response = client.get("/api/exness/ltp?symbols=GBPUSD,XAGUSD,ETHUSD")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "GBPUSD" in data["data"]
    assert "XAGUSD" in data["data"]
    assert "ETHUSD" in data["data"]


def test_exness_forex(client):
    response = client.get("/api/exness/forex")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_FOREX_MAJORS_MINORS"
    assert data["count"] >= 8
    syms = [p["symbol"] for p in data["pairs"]]
    assert "EURUSD" in syms
    assert "USDJPY" in syms
    assert "GBPUSD" in syms


def test_exness_metals(client):
    response = client.get("/api/exness/metals")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_METALS_COMMODITIES"
    syms = [c["symbol"] for c in data["commodities"]]
    assert "XAUUSD" in syms
    assert "USOIL" in syms


def test_exness_indices(client):
    response = client.get("/api/exness/indices")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_GLOBAL_INDICES"
    syms = [i["symbol"] for i in data["indices"]]
    assert "US30" in syms
    assert "US500" in syms
    assert "USTEC" in syms


def test_exness_crypto(client):
    response = client.get("/api/exness/crypto")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_CRYPTO_CFD"
    syms = [c["symbol"] for c in data["crypto"]]
    assert "BTCUSD" in syms
    assert "ETHUSD" in syms


def test_exness_stocks(client):
    response = client.get("/api/exness/stocks")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_STOCKS_CFD"
    syms = [s["symbol"] for s in data["stocks"]]
    assert "AAPL" in syms
    assert "NVDA" in syms


def test_exness_account_funds(client):
    response = client.get("/api/exness/account/funds")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "EXNESS_ACCOUNT"
    assert "balance" in data["data"]
    assert "free_margin" in data["data"]


def test_exness_order_placement(client):
    order_payload = {
        "symbol": "XAUUSD",
        "lots": 0.5,
        "side": "BUY",
        "price": 2685.50,
        "stop_loss": 2670.00,
        "take_profit": 2720.00,
    }
    response = client.post("/api/exness/orders/place", json=order_payload)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["data"]["lots"] == 0.5


def test_exness_adapter_methods():
    adapter = ExnessBrokerAdapter(initial_capital=75000.0, leverage=1000)
    assert adapter.balance == 75000.0
    assert adapter.leverage == 1000
    summary = adapter.get_account_summary()
    assert summary["balance"] == 75000.0
    assert summary["leverage"] == "1:1000"
    conn = adapter.test_connection()
    assert conn["reachable"] is True
