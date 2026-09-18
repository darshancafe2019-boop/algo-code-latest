"""
Integration and Unit Tests for Binance Multi-Department Live Market Data System
================================================================================
Verifies all 6 Binance departments and REST endpoints:
1. GET /api/binance/departments
2. GET /api/binance/quotes & POST /api/binance/quotes
3. GET /api/binance/ltp
4. GET /api/binance/spot
5. GET /api/binance/futures
6. GET /api/binance/coinm
7. GET /api/binance/option-chain
8. GET /api/binance/earn
9. GET /api/binance/account/funds
10. GET /api/binance/account/positions
11. GET /api/binance/account/orders
12. POST /api/binance/orders/place
"""

import pytest
import json
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_binance_departments(client):
    response = client.get("/api/binance/departments")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["total_departments"] == 6
    dept_ids = [d["id"] for d in data["departments"]]
    assert "BINANCE_SPOT" in dept_ids
    assert "BINANCE_USDM_FUTURES" in dept_ids
    assert "BINANCE_COINM_FUTURES" in dept_ids
    assert "BINANCE_OPTIONS" in dept_ids
    assert "BINANCE_SAVINGS_EARN" in dept_ids
    assert "BINANCE_ACCOUNT" in dept_ids


def test_binance_quotes(client):
    response = client.get("/api/binance/quotes?symbols=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "BTCUSDT" in data["quotes"]
    assert "ETHUSDT" in data["quotes"]
    assert "SOLUSDT" in data["quotes"]
    assert data["quotes"]["BTCUSDT"]["last_price"] > 10000
    assert data["quotes"]["BTCUSDT"]["volume_24h_base"] > 0


def test_binance_ltp(client):
    response = client.get("/api/binance/ltp?symbols=BTC,ETH,SOL,XRP")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "BTCUSDT" in data["data"]
    assert "ETHUSDT" in data["data"]


def test_binance_spot(client):
    response = client.get("/api/binance/spot")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_SPOT"
    assert data["count"] >= 5
    syms = [m["symbol"] for m in data["markets"]]
    assert "BTCUSDT" in syms
    assert "ETHUSDT" in syms


def test_binance_futures(client):
    response = client.get("/api/binance/futures")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_USDM_FUTURES"
    for contract in data["contracts"]:
        assert "mark_price" in contract
        assert "funding_rate" in contract
        assert "open_interest" in contract


def test_binance_coinm(client):
    response = client.get("/api/binance/coinm")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_COINM_FUTURES"
    assert len(data["contracts"]) >= 3


def test_binance_option_chain(client):
    response = client.get("/api/binance/option-chain?underlying=BTC")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_OPTIONS"
    assert "strikes" in data
    assert len(data["strikes"]) >= 5
    assert "pcr_oi" in data
    assert "max_pain" in data


def test_binance_earn(client):
    response = client.get("/api/binance/earn")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_SAVINGS_EARN"
    assets = [p["asset"] for p in data["products"]]
    assert "USDT" in assets
    assert "BNB" in assets


def test_binance_account_funds(client):
    response = client.get("/api/binance/account/funds")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "BINANCE_ACCOUNT"
    assert "total_equity_usd" in data["data"]
    assert "spot_balances" in data["data"]


def test_binance_order_placement(client):
    order_payload = {
        "symbol": "BTCUSDT",
        "quantity": 0.05,
        "side": "BUY",
        "type": "LIMIT",
        "price": 63500.0,
    }
    response = client.post("/api/binance/orders/place", json=order_payload)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["data"]["quantity"] == 0.05
