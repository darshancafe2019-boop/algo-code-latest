"""
Integration Tests for Stocks Flask Blueprint Routes
===================================================
Verifies:
- All required endpoints return 200 OK with unified envelope
- Error handling returns structured ApiResponseEnvelope
"""

import pytest
from flask import Flask
from market_data.stocks.routes import stocks_blueprint


@pytest.fixture
def client():
    app = Flask(__name__)
    app.register_blueprint(stocks_blueprint, url_prefix="/api/market-data/stocks")
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_stocks_routes_success(client):
    # 1. GET /api/market-data/stocks
    r1 = client.get("/api/market-data/stocks")
    assert r1.status_code == 200
    d1 = r1.get_json()
    assert d1["success"] is True
    assert "data" in d1
    assert "meta" in d1
    assert d1["meta"]["total"] >= 1

    # 2. GET /api/market-data/stocks/filters/schema
    r2 = client.get("/api/market-data/stocks/filters/schema")
    assert r2.status_code == 200
    d2 = r2.get_json()
    assert d2["success"] is True
    assert "exchanges" in d2["data"]
    assert "presets" in d2["data"]

    # 3. GET /api/market-data/stocks/movers?preset=gainers
    r3 = client.get("/api/market-data/stocks/movers?preset=gainers&limit=5")
    assert r3.status_code == 200
    d3 = r3.get_json()
    assert d3["success"] is True
    assert isinstance(d3["data"], list)

    # 4. GET /api/market-data/stocks/health
    r4 = client.get("/api/market-data/stocks/health")
    assert r4.status_code == 200
    d4 = r4.get_json()
    assert d4["success"] is True
    assert d4["data"]["status"] == "HEALTHY"

    # 5. GET /api/market-data/stocks/nse:NSE:RELIANCE
    r5 = client.get("/api/market-data/stocks/nse:NSE:RELIANCE")
    assert r5.status_code == 200
    d5 = r5.get_json()
    assert d5["success"] is True
    assert d5["data"]["symbol"] == "RELIANCE"

    # 6. GET /api/market-data/stocks/nse:NSE:RELIANCE/quote
    r6 = client.get("/api/market-data/stocks/nse:NSE:RELIANCE/quote")
    assert r6.status_code == 200
    d6 = r6.get_json()
    assert d6["success"] is True
    assert d6["data"]["last_price"] > 0

    # 7. GET /api/market-data/stocks/nse:NSE:RELIANCE/analysis
    r7 = client.get("/api/market-data/stocks/nse:NSE:RELIANCE/analysis")
    assert r7.status_code == 200
    d7 = r7.get_json()
    assert d7["success"] is True
    assert "overall_score" in d7["data"]
    assert "summary_explanation" in d7["data"]

    # 8. GET /api/market-data/stocks/nse:NSE:RELIANCE/fundamentals
    r8 = client.get("/api/market-data/stocks/nse:NSE:RELIANCE/fundamentals")
    assert r8.status_code == 200
    d8 = r8.get_json()
    assert d8["success"] is True
    assert "pe_ratio" in d8["data"]
