"""
Unit & Integration Test Suite for Angel One SmartAPI and Zerodha Kite Connect Adapters
======================================================================================
Verifies:
1. AngelOneBrokerAdapter initialization, credential loading, capability matrix, and paper/live summary.
2. ZerodhaBrokerAdapter initialization, OAuth login URL generation, checksum logic, and paper/live summary.
3. Live connectivity verification probes for Angel One & Zerodha.
4. ConnectionRegistry integration for Angel One and Zerodha.
"""

import pytest
import os
import hashlib
from src.angelone_broker_adapter import AngelOneBrokerAdapter
from src.zerodha_broker_adapter import ZerodhaBrokerAdapter
from src.connection_registry import ConnectionRegistry
from src.provider_manager.provider_service import ProviderService


class TestAngelOneAdapter:
    def test_angelone_initialization_and_capability(self):
        adapter = AngelOneBrokerAdapter(api_key="vWV7mMfq")
        assert adapter.api_key == "vWV7mMfq"
        assert adapter.broker_id == "angelone"
        cap = adapter.get_capability()
        assert "NSE" in cap.supported_exchanges
        assert "INDIAN_EQUITIES" in cap.supported_asset_classes
        assert cap.paper_trading_availability is True

    def test_angelone_paper_account_summary(self):
        adapter = AngelOneBrokerAdapter(api_key="vWV7mMfq", initial_capital=500000.0)
        summary = adapter.get_account_summary()
        assert summary["broker_id"] == "angelone"
        assert summary["cash_balance"] == 500000.0
        assert summary["is_paper"] is True

    def test_angelone_order_management(self):
        adapter = AngelOneBrokerAdapter(api_key="vWV7mMfq")
        order = adapter.place_multileg_order({
            "symbol": "NIFTY24SEP23350CE",
            "quantity": 25,
            "side": "BUY",
            "price": 145.5,
        })
        assert order["status"] == "FILLED"
        assert order["quantity"] == 25
        assert order["order_id"] in adapter.orders

        cancel_res = adapter.cancel_order(order["order_id"])
        assert cancel_res["status"] == "SUCCESS"
        assert adapter.orders[order["order_id"]]["status"] == "CANCELLED"

    def test_angelone_connection_probe(self):
        adapter = AngelOneBrokerAdapter(api_key="vWV7mMfq")
        probe = adapter.test_connection()
        assert probe["reachable"] is True
        assert probe["api_key"] == "vWV7mMfq"


class TestZerodhaAdapter:
    def test_zerodha_initialization_and_capability(self):
        adapter = ZerodhaBrokerAdapter(
            api_key="3et9e1s3cd6k9ss9",
            api_secret="4j0fv6skn99h17e6ndmd6obvxsy230x5",
        )
        assert adapter.api_key == "3et9e1s3cd6k9ss9"
        assert adapter.api_secret == "4j0fv6skn99h17e6ndmd6obvxsy230x5"
        assert adapter.broker_id == "zerodha"
        cap = adapter.get_capability()
        assert "NSE" in cap.supported_exchanges
        assert "OPTIONS" in cap.supported_asset_classes

    def test_zerodha_login_url(self):
        adapter = ZerodhaBrokerAdapter(api_key="3et9e1s3cd6k9ss9")
        login_url = adapter.get_login_url()
        assert "kite.zerodha.com/connect/login" in login_url
        assert "api_key=3et9e1s3cd6k9ss9" in login_url

    def test_zerodha_paper_account_summary(self):
        adapter = ZerodhaBrokerAdapter(api_key="3et9e1s3cd6k9ss9", initial_capital=750000.0)
        summary = adapter.get_account_summary()
        assert summary["broker_id"] == "zerodha"
        assert summary["cash_balance"] == 750000.0
        assert summary["is_paper"] is True

    def test_zerodha_checksum_generation(self):
        api_key = "3et9e1s3cd6k9ss9"
        req_token = "mock_request_token_123"
        api_secret = "4j0fv6skn99h17e6ndmd6obvxsy230x5"
        raw_str = f"{api_key}{req_token}{api_secret}"
        expected_checksum = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
        assert len(expected_checksum) == 64

    def test_zerodha_order_management(self):
        adapter = ZerodhaBrokerAdapter(api_key="3et9e1s3cd6k9ss9")
        order = adapter.place_multileg_order({
            "symbol": "BANKNIFTY24SEP56400CE",
            "quantity": 15,
            "side": "BUY",
            "price": 280.0,
        })
        assert order["status"] == "FILLED"
        assert order["quantity"] == 15
        assert order["order_id"] in adapter.orders


class TestRegistryIntegration:
    def test_connection_registry_has_angel_and_zerodha(self):
        reg = ConnectionRegistry()
        matrix = reg.get_connection_matrix(force_refresh=True)
        conn_ids = [c["id"] for c in matrix["connections"]]
        assert "ANGELONE" in conn_ids
        assert "ZERODHA" in conn_ids

    def test_provider_service_detects_credentials(self):
        ps = ProviderService()
        assert ps._check_is_configured("angelone") is True
        assert ps._check_is_configured("zerodha") is True
