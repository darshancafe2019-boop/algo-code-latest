"""
Integration Tests for Upstox OAuth Flow and Backend Synchronization
===================================================================
Verifies:
1. /api/upstox/status (when disconnected)
2. /api/upstox/sync-token (synchronizing access token from Next.js)
3. /api/upstox/status (when connected)
4. /api/upstox/disconnect (clearing token and broker credential)
5. Zero secrets leaked in status endpoints
"""

import os
import json
import pytest
import dashboard
from src.upstox_service import global_upstox_service

@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        yield c

def test_upstox_oauth_lifecycle(client):
    # 1. Initially disconnect Upstox
    global_upstox_service.access_token = ""
    res = client.get("/api/upstox/status")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["broker"] == "UPSTOX"
    assert data["connected"] is False

    # 2. Sync a valid token from OAuth callback
    mock_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_upstox_access_token_12345"
    sync_res = client.post("/api/upstox/sync-token", json={
        "access_token": mock_token,
        "user_name": "Test Upstox Trader",
        "user_id": "UP987654",
        "email": "trader@example.com",
        "broker": "UPSTOX"
    })
    assert sync_res.status_code == 200
    sync_data = sync_res.get_json()
    assert sync_data["status"] == "success"
    assert sync_data["connected"] is True
    assert global_upstox_service.access_token == mock_token

    # 3. Status should now report connected
    res2 = client.get("/api/upstox/status")
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["connected"] is True
    assert data2["broker"] == "UPSTOX"
    # Ensure NO access token or secrets leaked in status response
    assert "access_token" not in data2
    assert "client_secret" not in data2

    # 4. Disconnect Upstox
    disc_res = client.post("/api/upstox/disconnect")
    assert disc_res.status_code == 200
    disc_data = disc_res.get_json()
    assert disc_data["status"] == "success"
    assert disc_data["connected"] is False
    assert global_upstox_service.access_token == ""

    # 5. Status should be disconnected again
    res3 = client.get("/api/upstox/status")
    assert res3.status_code == 200
    assert res3.get_json()["connected"] is False
