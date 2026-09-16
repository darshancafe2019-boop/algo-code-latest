"""
Test Suite: Quant.OS Provider Selection & Control Plane System
============================================================
Validates provider registration, category segregation, genuine capability matrices,
decoupled Market Data vs Execution Broker assignment, credential masking,
and REST endpoints.
"""

import json
import pytest
from src.provider_manager.provider_registry import (
    ProviderRegistry,
    ProviderCategory,
    ProviderDefinition,
    global_provider_registry,
)
from src.provider_manager.provider_service import (
    ProviderService,
    global_provider_service,
)
from dashboard import app


class TestProviderRegistry:
    def test_all_14_providers_registered(self):
        providers = global_provider_registry.get_all_providers()
        assert len(providers) >= 14
        
        # Verify Indian Brokers
        indian = global_provider_registry.get_providers_by_category(ProviderCategory.INDIAN_BROKERS)
        indian_ids = [p.id for p in indian]
        assert "dhan" in indian_ids
        assert "upstox" in indian_ids
        assert "fyers" in indian_ids
        assert "zerodha" in indian_ids
        assert "angelone" in indian_ids
        assert "icicidirect" in indian_ids
        assert "fivepaisa" in indian_ids

        # Verify Crypto
        crypto = global_provider_registry.get_providers_by_category(ProviderCategory.CRYPTO)
        crypto_ids = [p.id for p in crypto]
        assert "delta" in crypto_ids
        assert "binance" in crypto_ids
        assert "bybit" in crypto_ids
        assert "okx" in crypto_ids

        # Verify Global / Forex
        forex = global_provider_registry.get_providers_by_category(ProviderCategory.GLOBAL_FOREX)
        forex_ids = [p.id for p in forex]
        assert "metatrader5" in forex_ids
        assert "exness" in forex_ids
        assert "interactive_brokers" in forex_ids

    def test_genuine_capabilities_matrix(self):
        dhan = global_provider_registry.get_provider("dhan")
        assert dhan is not None
        assert dhan.capabilities.marketData is True
        assert dhan.capabilities.orderExecution is True
        assert dhan.capabilities.optionChain is True
        assert dhan.capabilities.crypto is False

        binance = global_provider_registry.get_provider("binance")
        assert binance is not None
        assert binance.capabilities.crypto is True
        assert binance.capabilities.forex is False

        mt5 = global_provider_registry.get_provider("metatrader5")
        assert mt5 is not None
        assert mt5.capabilities.forex is True
        assert mt5.capabilities.crypto is False


class TestProviderService:
    def test_role_partitioning_and_decoupling(self):
        # Set market data to Upstox and execution broker to Dhan
        res_md = global_provider_service.set_active_role("market_data_provider", "upstox")
        assert res_md.get("success") is True
        
        res_exec = global_provider_service.set_active_role("execution_broker", "dhan")
        assert res_exec.get("success") is True

        roles = global_provider_service.get_active_roles()
        assert roles["marketDataProvider"] == "upstox"
        assert roles["executionBroker"] == "dhan"

    def test_credential_masking_never_exposes_secrets(self):
        # Configure test credentials
        global_provider_service.configure_provider(
            provider_id="binance",
            client_id="user_binance_99",
            api_key="BK_KEY_SECRET_12345678",
            api_secret="SUPER_SECRET_RAW_TOKEN_999",
            enabled=True,
        )

        provider_info = global_provider_service.get_provider_status("binance")
        assert provider_info is not None
        masked = provider_info.get("maskedCredentials", {})
        
        # Raw secret must NEVER be returned
        assert "SUPER_SECRET_RAW_TOKEN_999" not in str(provider_info)
        assert masked.get("clientId") == "user_binance_99"
        assert masked.get("apiKey") == "••••••••12345678"

    def test_connection_test(self):
        res = global_provider_service.test_provider_connection("delta")
        assert res["status"] == "success"
        assert "latency_ms" in res



class TestProviderRestEndpoints:
    @pytest.fixture
    def client(self):
        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client

    def test_get_providers_catalog(self, client):
        res = client.get("/api/providers_v2")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["status"] == "success"
        assert data["total_count"] >= 14
        assert "active_roles" in data
        assert "providers" in data

    def test_select_role_api(self, client):
        res = client.post(
            "/api/providers_v2/select",
            json={"role": "market_data_provider", "provider_id": "dhan"},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["status"] == "success"
        assert data["active_roles"]["marketDataProvider"] == "dhan"

    def test_provider_health_api(self, client):
        res = client.get("/api/providers_v2/dhan/health")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["status"] == "success"
        assert "health" in data

    def test_provider_test_connection_api(self, client):
        res = client.post("/api/providers_v2/delta/test", json={})
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["status"] == "success"
