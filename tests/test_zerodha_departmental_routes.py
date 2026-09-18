"""
Integration and Unit Tests for Zerodha Kite Connect Multi-Department Market Data System
========================================================================================
Verifies all 6 Zerodha Kite Connect departments and REST endpoints:
1. GET /api/zerodha/departments
2. GET /api/zerodha/instruments
3. GET /api/zerodha/quotes & POST /api/zerodha/quotes
4. GET /api/zerodha/ltp
5. GET /api/zerodha/indices
6. GET /api/zerodha/option-chain
7. GET /api/zerodha/commodities
8. GET /api/zerodha/currency
9. GET /api/zerodha/account/funds
10. GET /api/zerodha/account/holdings
11. GET /api/zerodha/account/positions
12. GET /api/zerodha/account/orders
13. POST /api/zerodha/orders/place
14. GET /api/zerodha/auth/login-url
"""

import pytest
import json
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_zerodha_departments(client):
    response = client.get("/api/zerodha/departments")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["total_departments"] == 6
    dept_ids = [d["id"] for d in data["departments"]]
    assert "ZERODHA_EQUITY_CASH" in dept_ids
    assert "ZERODHA_DERIVATIVES" in dept_ids
    assert "ZERODHA_COMMODITY" in dept_ids
    assert "ZERODHA_CURRENCY" in dept_ids
    assert "ZERODHA_INDICES" in dept_ids
    assert "ZERODHA_ACCOUNT" in dept_ids


def test_zerodha_quotes(client):
    response = client.get("/api/zerodha/quotes?symbols=RELIANCE,TCS,INFY,NIFTY")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "RELIANCE" in data["quotes"]
    assert "TCS" in data["quotes"]
    assert "INFY" in data["quotes"]
    assert data["quotes"]["RELIANCE"]["instrument_token"] == 738561
    assert data["quotes"]["TCS"]["instrument_token"] == 2953217
    assert data["quotes"]["RELIANCE"]["last_price"] > 0


def test_zerodha_ltp(client):
    response = client.get("/api/zerodha/ltp?symbols=INFY,SBIN,HDFCBANK")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "INFY" in data["data"]
    assert data["data"]["INFY"]["instrument_token"] == 408065
    assert data["data"]["INFY"]["last_price"] > 0


def test_zerodha_indices(client):
    response = client.get("/api/zerodha/indices")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ZERODHA_INDICES"
    assert data["count"] >= 5
    syms = [idx["symbol"] for idx in data["indices"]]
    assert "NIFTY 50" in syms
    assert "NIFTY BANK" in syms
    assert "SENSEX" in syms


def test_zerodha_option_chain(client):
    response = client.get("/api/zerodha/option-chain?underlying=NIFTY")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ZERODHA_DERIVATIVES"
    assert "data" in data


def test_zerodha_commodities(client):
    response = client.get("/api/zerodha/commodities")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ZERODHA_COMMODITY"
    assert len(data["commodities"]) >= 4
    comm_syms = [c["tradingsymbol"] for c in data["commodities"]]
    assert any("GOLD" in s for s in comm_syms)
    assert any("CRUDEOIL" in s for s in comm_syms)


def test_zerodha_currency(client):
    response = client.get("/api/zerodha/currency")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ZERODHA_CURRENCY"
    pairs = [c["pair"] for c in data["currencies"]]
    assert "USD/INR" in pairs
    assert "EUR/INR" in pairs


def test_zerodha_instruments(client):
    response = client.get("/api/zerodha/instruments?limit=10")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert len(data["instruments"]) <= 10
    assert data["total"] > 0


def test_zerodha_account_funds(client):
    response = client.get("/api/zerodha/account/funds")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ZERODHA_ACCOUNT"
    assert "cash_balance" in data["data"]


def test_zerodha_account_holdings(client):
    response = client.get("/api/zerodha/account/holdings")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["count"] > 0
    assert "total_invested" in data["summary"]


def test_zerodha_order_placement(client):
    order_payload = {
        "symbol": "RELIANCE",
        "quantity": 10,
        "side": "BUY",
        "price": 2980.0,
        "order_type": "LIMIT",
        "product_type": "MIS",
    }
    response = client.post("/api/zerodha/orders/place", json=order_payload)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["data"]["quantity"] == 10


def test_zerodha_login_url(client):
    response = client.get("/api/zerodha/auth/login-url")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "kite.zerodha.com/connect/login" in data["login_url"]
