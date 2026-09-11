import os
os.environ["TESTING"] = "1"
os.environ["AUTH_BOOTSTRAP_ENABLED"] = "true"

import json
from dashboard import app

app.config["TESTING"] = True
client = app.test_client()

print("=" * 60)
print("TESTING BACKEND FLASK ROUTES DIRECTLY VIA TEST CLIENT")
print("=" * 60)

with app.app_context():
    # 1. Test /api/reports/generate
    res = client.post("/api/reports/generate", json={"report_type": "GLOBAL_MARKET_REPORT"})
    print(f"POST /api/reports/generate Status: {res.status_code}")
    data = res.get_json()
    assert res.status_code == 200, f"Expected 200, got {res.status_code} ({data})"
    assert data["ok"] is True
    assert data["report"]["report_type"] == "GLOBAL_MARKET_REPORT"
    assert "market_board" in data["report"]
    print("  [PASS] /api/reports/generate returned complete multi-domain report.")

    # 2. Test /api/connections/matrix
    res = client.get("/api/connections/matrix")
    print(f"GET /api/connections/matrix Status: {res.status_code}")
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert "connections" in data["matrix"]
    print("  [PASS] /api/connections/matrix returned unified connection matrix.")

    # 3. Test /api/market-intelligence/overview
    res = client.get("/api/market-intelligence/overview")
    print(f"GET /api/market-intelligence/overview Status: {res.status_code}")
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert "executive_summary" in data
    print("  [PASS] /api/market-intelligence/overview returned executive summary.")

    # 4. Test /api/reports/history
    res = client.get("/api/reports/history")
    print(f"GET /api/reports/history Status: {res.status_code}")
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert len(data["history"]) >= 1
    print("  [PASS] /api/reports/history returned cached report history.")

print("\nALL FLASK BACKEND REPORTING & INTELLIGENCE ROUTES VERIFIED SUCCESSFULLY!")
