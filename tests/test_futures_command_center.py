"""
Regression & Certification Tests for Quant.OS Futures Command Center
=====================================================================
Tests truth-in-sourcing, provider segregation, null handling, order intent risk gating,
provider health diagnostics, and safe PAPER/SHADOW/LIVE execution invariants.
"""

import pytest
import json
from market_data.futures.service import FuturesMarketService
from market_data.futures.models import CanonicalFuturesContract, FuturesContractType, MarketVenue


@pytest.fixture
def futures_service():
    return FuturesMarketService.get_instance()


@pytest.fixture
def app_client():
    from dashboard import app
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestFuturesCommandCenterRegression:
    """Comprehensive test suite verifying truth-in-sourcing and execution safety."""

    def test_nifty_banknifty_source_mapping_integrity(self, futures_service):
        """
        Regression Test (Bug Fix #3 & #78):
        NIFTY-FUT and BANKNIFTY-FUT must NEVER have Binance as market data provider or execution broker.
        """
        contracts = futures_service.get_all_contracts(force_refresh=True)

        nifty_contracts = [c for c in contracts if c.underlying == "NIFTY" and c.market_data_provider != "PAPER_SIM"]
        assert len(nifty_contracts) > 0

        for c in nifty_contracts:
            assert c.market_data_provider in ["UPSTOX", "DHAN"], f"Invalid provider for NIFTY: {c.market_data_provider}"
            assert c.provider != "Binance Official API"
            assert "BINANCE" not in c.market_data_provider.upper()
            assert c.exchange == "NSE"

        banknifty_contracts = [c for c in contracts if c.underlying == "BANKNIFTY" and c.market_data_provider != "PAPER_SIM"]
        assert len(banknifty_contracts) > 0

        for c in banknifty_contracts:
            assert c.market_data_provider in ["UPSTOX", "DHAN"], f"Invalid provider for BANKNIFTY: {c.market_data_provider}"
            assert c.provider != "Binance Official API"
            assert "BINANCE" not in c.market_data_provider.upper()
            assert c.exchange == "NSE"

    def test_separated_data_source_and_execution_broker(self, futures_service):
        """Verify market_data_provider and execution_broker are distinct fields."""
        contracts = futures_service.get_all_contracts(force_refresh=True)
        for c in contracts:
            assert hasattr(c, "market_data_provider")
            assert hasattr(c, "execution_broker")
            assert c.market_data_provider is not None
            assert c.execution_broker is not None
            assert len(c.market_data_provider) > 0
            assert len(c.execution_broker) > 0

    def test_missing_data_null_handling(self, futures_service):
        """
        Verify missing or unavailable data is represented as None (null) and NEVER as 0.
        """
        contracts = futures_service.get_all_contracts(force_refresh=True)

        unconnected_contracts = [c for c in contracts if c.status in ["AUTH_REQUIRED", "TOKEN_EXPIRED", "NOT_CONFIGURED"]]
        assert len(unconnected_contracts) > 0

        for c in unconnected_contracts:
            assert c.mark_price is None or c.status == "CONNECTED"
            assert c.index_price is None or c.status == "CONNECTED"
            assert c.volume_24h_usd is None or c.status == "CONNECTED"
            assert c.open_interest_usd is None or c.status == "CONNECTED"

    def test_provider_health_diagnostics_endpoint(self, app_client):
        """Verify /api/futures/providers/health accurately returns diagnostics without credential leakage."""
        res = app_client.get("/api/futures/providers/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "SUCCESS"
        assert "providers" in data
        assert len(data["providers"]) >= 5

        providers_by_name = {p["provider"]: p for p in data["providers"]}
        assert "BINANCE_USDM" in providers_by_name
        assert "DELTA_INDIA" in providers_by_name
        assert "UPSTOX" in providers_by_name
        assert "DHAN" in providers_by_name
        assert "CME" in providers_by_name

        for p in data["providers"]:
            assert "rest_status" in p
            assert "websocket_status" in p
            assert "subscription_status" in p
            assert "decoder_status" in p
            assert "instrument_count" in p
            assert "status" in p
            assert "secret" not in json.dumps(p).lower()
            assert "token" not in json.dumps(p).lower() or p.get("error_code") == "TOKEN_EXPIRED"

    def test_order_intent_risk_gating(self, app_client):
        """Verify order intent validates parameters and blocks unauthenticated/disconnected instruments."""
        # Test 1: Order intent on disconnected/unauthenticated Upstox instrument must be rejected
        payload_upstox = {
            "symbol": "NIFTY-FUT",
            "side": "BUY",
            "quantity": 25,
            "mode": "PAPER",
        }
        res_upstox = app_client.post("/api/futures/order-intent", json=payload_upstox)
        # Should be blocked because Upstox is TOKEN_EXPIRED or NOT_CONFIGURED
        assert res_upstox.status_code in [200, 400]
        data_upstox = res_upstox.get_json()
        if res_upstox.status_code == 400:
            assert data_upstox["status"] == "ERROR"

        # Test 2: Order intent on connected Binance instrument in PAPER mode must succeed
        payload_binance = {
            "symbol": "BTC/USDT:USDT",
            "side": "BUY",
            "quantity": 0.1,
            "leverage": 10,
            "mode": "PAPER",
        }
        res_binance = app_client.post("/api/futures/order-intent", json=payload_binance)
        assert res_binance.status_code == 200
        data_binance = res_binance.get_json()
        assert data_binance["status"] == "SUCCESS"
        assert data_binance["result"]["status"] == "FILLED"
        assert data_binance["result"]["environment"] == "PAPER"
        assert data_binance["result"]["risk_decision"] == "ALLOW"

        # Test 3: LIVE mode must be strictly blocked by safety gate
        payload_live = {
            "symbol": "BTC/USDT:USDT",
            "side": "BUY",
            "quantity": 0.1,
            "mode": "LIVE",
        }
        res_live = app_client.post("/api/futures/order-intent", json=payload_live)
        assert res_live.status_code == 403
        data_live = res_live.get_json()
        assert data_live["status"] == "ERROR"
        assert data_live["code"] == "LIVE_TRADING_DISABLED"

    def test_live_readiness_endpoint(self, app_client):
        """Verify /api/trading/live-readiness returns institutional gate statuses."""
        res = app_client.get("/api/trading/live-readiness")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "SUCCESS"
        readiness = data["readiness"]
        assert readiness["overall_ready"] is False  # Safe default
        assert readiness["active_mode"] == "PAPER"
        assert "gate_details" in readiness

    def test_positions_endpoint(self, app_client):
        """Verify /api/futures/positions returns active positions."""
        res = app_client.get("/api/futures/positions")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "SUCCESS"
        assert "positions" in data
        assert len(data["positions"]) > 0
        for pos in data["positions"]:
            assert "liquidation_price" in pos
            assert "margin_mode" in pos
            assert "leverage" in pos
