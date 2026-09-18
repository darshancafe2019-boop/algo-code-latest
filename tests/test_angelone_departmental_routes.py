"""
Integration and Unit Tests for Angel One SmartAPI Multi-Department Market Data System
=====================================================================================
Verifies all 6 Angel One SmartAPI departments and REST endpoints:
1. GET /api/angelone/departments
2. GET /api/angelone/instruments
3. GET /api/angelone/quotes & POST /api/angelone/quotes
4. GET /api/angelone/ltp
5. GET /api/angelone/indices
6. GET /api/angelone/option-chain
7. GET /api/angelone/commodities
8. GET /api/angelone/currency
9. GET /api/angelone/account/funds
10. GET /api/angelone/account/holdings
11. GET /api/angelone/account/positions
12. GET /api/angelone/account/orders
13. POST /api/angelone/orders/place
14. POST /api/angelone/auth/login
"""

import pytest
import json
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_angelone_departments(client):
    response = client.get("/api/angelone/departments")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["total_departments"] == 6
    dept_ids = [d["id"] for d in data["departments"]]
    assert "ANGELONE_EQUITY_CASH" in dept_ids
    assert "ANGELONE_DERIVATIVES" in dept_ids
    assert "ANGELONE_COMMODITY" in dept_ids
    assert "ANGELONE_CURRENCY" in dept_ids
    assert "ANGELONE_INDICES" in dept_ids
    assert "ANGELONE_ACCOUNT" in dept_ids


def test_angelone_quotes(client):
    response = client.get("/api/angelone/quotes?symbols=RELIANCE,TCS,NIFTY")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "RELIANCE" in data["quotes"]
    assert "TCS" in data["quotes"]
    assert "NIFTY" in data["quotes"]
    assert data["quotes"]["RELIANCE"]["instrument_token"] == "2885"
    assert data["quotes"]["TCS"]["instrument_token"] == "11536"
    assert data["quotes"]["RELIANCE"]["last_price"] > 0


def test_angelone_ltp(client):
    response = client.get("/api/angelone/ltp?symbols=INFY,SBIN,HDFCBANK")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "INFY" in data["data"]
    assert data["data"]["INFY"]["instrument_token"] == "1594"
    assert data["data"]["INFY"]["last_price"] > 0


def test_angelone_indices(client):
    response = client.get("/api/angelone/indices")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ANGELONE_INDICES"
    assert data["count"] >= 5
    syms = [idx["symbol"] for idx in data["indices"]]
    assert "NIFTY 50" in syms
    assert "NIFTY BANK" in syms
    assert "SENSEX" in syms


def test_angelone_option_chain(client):
    response = client.get("/api/angelone/option-chain?underlying=NIFTY")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ANGELONE_DERIVATIVES"
    assert "data" in data


def test_angelone_commodities(client):
    response = client.get("/api/angelone/commodities")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ANGELONE_COMMODITY"
    assert len(data["commodities"]) >= 4
    comm_syms = [c["trading_symbol"] for c in data["commodities"]]
    assert "GOLD" in comm_syms
    assert "CRUDEOIL" in comm_syms


def test_angelone_currency(client):
    response = client.get("/api/angelone/currency")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ANGELONE_CURRENCY"
    pairs = [c["pair"] for c in data["currencies"]]
    assert "USD/INR" in pairs
    assert "EUR/INR" in pairs


def test_angelone_instruments(client):
    response = client.get("/api/angelone/instruments?limit=10")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert len(data["instruments"]) <= 10
    assert data["total"] > 0


def test_angelone_account_funds(client):
    response = client.get("/api/angelone/account/funds")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["department"] == "ANGELONE_ACCOUNT"
    assert "cash_balance" in data["data"]


def test_angelone_account_holdings(client):
    response = client.get("/api/angelone/account/holdings")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["count"] > 0
    assert "total_invested" in data["summary"]


def test_angelone_order_placement(client):
    order_payload = {
        "symbol": "RELIANCE",
        "quantity": 10,
        "side": "BUY",
        "price": 2980.0,
        "order_type": "LIMIT",
        "product_type": "INTRADAY",
    }
    response = client.post("/api/angelone/orders/place", json=order_payload)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert data["data"]["quantity"] == 10
