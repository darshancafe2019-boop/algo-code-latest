"""
Delta Exchange Integration Test Suite
=====================================
Validates:
1. DeltaExchangeAdapter HMAC-SHA256 signature calculations.
2. Delta India vs Delta Global region resolution.
3. Public ping diagnostic and connection status schema.
4. MultiAssetOrderRouter routing to Delta Exchange.
5. REST API endpoints in dashboard.py (/api/delta/status, /api/delta/ping, /api/delta/wallet, /api/delta/contracts).
6. Security credential storage with withdrawal lockout.
"""

import sys
import json
import time
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.delta_exchange_adapter import DeltaExchangeAdapter, global_delta_adapter
from src.order_router import MultiAssetOrderRouter
from src.secrets_manager import SecretsManager
from dashboard import app


def test_delta_adapter_signature_generation():
    adapter = DeltaExchangeAdapter(
        base_url="https://api.india.delta.exchange",
        api_key="TEST_API_KEY_12345",
        api_secret="TEST_API_SECRET_67890",
        is_india=True
    )
    
    timestamp = "1725000000"
    method = "GET"
    path = "/v2/wallet/balances"
    query = ""
    
    sig = adapter.generate_signature(method, path, query, timestamp)
    assert isinstance(sig, str)
    assert len(sig) == 64  # SHA256 hex string length
    
    # Deterministic check: recalculate manually
    import hmac, hashlib
    expected_msg = "GET1725000000/v2/wallet/balances"
    expected_sig = hmac.new("TEST_API_SECRET_67890".encode("utf-8"), expected_msg.encode("utf-8"), hashlib.sha256).hexdigest()
    assert sig == expected_sig


def test_delta_adapter_regions_and_status():
    adapter_india = DeltaExchangeAdapter(is_india=True)
    assert "india.delta.exchange" in adapter_india.base_url
    status_india = adapter_india.get_connection_status()
    assert status_india["broker"] == "DELTA_EXCHANGE"
    assert status_india["network"] == "DELTA_INDIA"
    assert "supportedMarkets" in status_india

    adapter_global = DeltaExchangeAdapter(is_india=False)
    assert adapter_global.base_url == "https://api.delta.exchange"
    status_global = adapter_global.get_connection_status()
    assert status_global["network"] == "DELTA_GLOBAL"


def test_order_router_delta_exchange_resolution():
    # 1. By exchange parameter
    success, msg, details = MultiAssetOrderRouter.route_order(
        symbol="BTC-PERP",
        signal_type="BUY",
        position_size=1.0,
        price=65000.0,
        asset_class="Crypto",
        is_live=False,
        exchange="delta_exchange"
    )
    assert success is True
    assert "Delta Exchange Adapter" in details["adapter"]

    # 2. By Crypto_Options asset class
    success_opt, msg_opt, details_opt = MultiAssetOrderRouter.route_order(
        symbol="BTC-260925-70000-C",
        signal_type="BUY",
        position_size=0.5,
        price=3200.0,
        asset_class="Crypto_Options",
        is_live=False
    )
    assert success_opt is True
    assert "Delta Exchange Adapter" in details_opt["adapter"]


def test_delta_rest_endpoints():
    client = app.test_client()

    # GET /api/delta/status
    res_status = client.get("/api/delta/status")
    assert res_status.status_code == 200
    data_status = res_status.get_json()
    assert data_status["broker"] == "DELTA_EXCHANGE"
    assert "supportedMarkets" in data_status

    # POST /api/delta/ping
    res_ping = client.post("/api/delta/ping")
    assert res_ping.status_code == 200
    data_ping = res_ping.get_json()
    assert "latencyMs" in data_ping

    # GET /api/delta/wallet
    res_wallet = client.get("/api/delta/wallet")
    assert res_wallet.status_code == 200
    data_wallet = res_wallet.get_json()
    assert "balances" in data_wallet

    # GET /api/delta/positions
    res_pos = client.get("/api/delta/positions")
    assert res_pos.status_code == 200
    data_pos = res_pos.get_json()
    assert "positions" in data_pos


def test_delta_secure_credentials_vault():
    client = app.test_client()
    res = client.post("/api/delta/credentials", json={
        "api_key": "DELTA_KEY_TEST_ABCD1234EFGH",
        "secret_key": "DELTA_SECRET_TEST_9876543210",
        "is_india": True
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True

    # Validate that withdrawal permission was strictly disabled
    sm = SecretsManager()
    creds = sm.get_active_credential("delta_india")
    assert creds is not None
    assert creds["allow_withdraw"] == 0
    assert creds["allow_trade"] == 1
