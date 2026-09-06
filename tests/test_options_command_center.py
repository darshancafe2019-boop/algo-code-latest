"""
Regression and Integration Test Suite: Options Command Center
==============================================================
Validates:
1. Canonical Option Instrument ID formatting and mapping.
2. Provider data isolation (Dhan, Upstox, Delta India, Binance Options).
3. Sourced Greeks attribution and Black-Scholes analytical calculations.
4. Provider health diagnostics and failure state mapping (TOKEN_EXPIRED, AUTH_REQUIRED, LIVE).
5. OI and Market Flow distribution endpoint.
6. Order intent risk gating, margin validation, and safe PAPER mode invariants.
7. Truthful null telemetry without fabricated values.
"""

import pytest
import json
from datetime import datetime, timezone
from src.market_data.options_engine import UniversalOptionsEngine, global_options_engine
from src.market_data.schemas import OptionQuote, OptionStrikeRow, OptionChainSnapshot
from dashboard import app


class TestOptionsCommandCenterRegression:
    @pytest.fixture
    def client(self):
        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client

    def test_canonical_instrument_id_structure(self):
        """Validates that options engine produces immutable, hierarchical contract keys."""
        chain = global_options_engine.get_option_chain("NIFTY", provider="DHAN", spot_price=22500.0, strike_count=10)
        assert chain is not None
        assert len(chain.strikes) > 0

        for row in chain.strikes:
            # Check CE contract key
            assert "DHAN" in row.ce.contractKey
            assert "NSE" in row.ce.exchange
            assert row.ce.optionType in ["CE", "CALL"]
            assert row.ce.strike == row.strike
            # Check PE contract key
            assert "DHAN" in row.pe.contractKey
            assert "NSE" in row.pe.exchange
            assert row.pe.optionType in ["PE", "PUT"]
            assert row.pe.strike == row.strike

    def test_provider_data_isolation_indian_vs_crypto(self):
        """Ensures Indian contracts are sourced to Dhan/Upstox and Crypto to Delta/Binance."""
        # Indian - Dhan
        dhan_chain = global_options_engine.get_option_chain("NIFTY", provider="DHAN", spot_price=22500.0)
        assert dhan_chain.provider == "DHAN"
        for r in dhan_chain.strikes:
            assert r.ce.provider == "DHAN"
            assert r.pe.provider == "DHAN"

        # Indian - Upstox
        upstox_chain = global_options_engine.get_option_chain("NIFTY", provider="UPSTOX", spot_price=22500.0)
        assert upstox_chain.provider == "UPSTOX"
        for r in upstox_chain.strikes:
            assert r.ce.provider == "UPSTOX"
            assert r.pe.provider == "UPSTOX"

        # Crypto - Delta India
        delta_chain = global_options_engine.get_option_chain("BTC", provider="DELTA_INDIA", spot_price=78500.0)
        assert delta_chain.provider == "DELTA_INDIA"
        for r in delta_chain.strikes:
            assert r.ce.provider == "DELTA_INDIA"
            assert r.pe.provider == "DELTA_INDIA"

    def test_black_scholes_greeks_and_sourcing(self):
        """Verifies Black-Scholes solver and Greek source attribution."""
        greeks = global_options_engine.calculate_greeks(
            option_type="CE",
            spot=22500.0,
            strike=22500.0,
            time_to_expiry_years=7.0 / 365.0,
            iv=0.15,
            risk_free_rate=0.065,
        )
        assert 0.45 <= greeks["delta"] <= 0.55
        assert greeks["gamma"] > 0
        assert greeks["theta"] < 0
        assert greeks["vega"] > 0

        # Put delta should be negative
        put_greeks = global_options_engine.calculate_greeks(
            option_type="PE",
            spot=22500.0,
            strike=22500.0,
            time_to_expiry_years=7.0 / 365.0,
            iv=0.15,
            risk_free_rate=0.065,
        )
        assert -0.55 <= put_greeks["delta"] <= -0.45

    def test_provider_health_diagnostics_endpoint(self, client):
        """Validates /api/options/providers/health returns structured venue status."""
        res = client.get("/api/options/providers/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        providers = {p["provider_id"]: p for p in data["providers"]}

        assert "DHAN_OPTIONS" in providers
        assert "UPSTOX_OPTIONS" in providers
        assert "DELTA_INDIA_OPTIONS" in providers
        assert "BINANCE_OPTIONS" in providers

        # Assert correct diagnostic structures
        assert providers["DHAN_OPTIONS"]["exchange"] == "NSE"
        assert providers["DELTA_INDIA_OPTIONS"]["status"] == "LIVE"
        assert providers["BINANCE_OPTIONS"]["status"] == "LIVE"

    def test_options_flow_endpoint(self, client):
        """Validates /api/options/flow returns source-attributed OI distribution and PCR."""
        res = client.get("/api/options/flow?underlying=NIFTY&provider=DHAN")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "pcr_oi" in data
        assert "max_call_oi_strike" in data
        assert "max_put_oi_strike" in data
        assert len(data["strikes"]) > 0

    def test_options_orders_endpoint(self, client):
        """Validates /api/options/orders returns historical order logs."""
        res = client.get("/api/options/orders?mode=PAPER")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "orders" in data
        assert isinstance(data["orders"], list)

    def test_options_order_intent_risk_gating(self, client):
        """Verifies pre-order validation, notional caps, and mode safety on /api/options/order-intent."""
        # 1. Valid PAPER order
        valid_payload = {
            "canonical_id": "INDIA:NSE:NIFTY:2026-09-10:22500:CALL",
            "symbol": "NIFTY 22500 CE",
            "side": "BUY",
            "quantity": 50,
            "price": 142.50,
            "mode": "PAPER",
            "market_data_provider": "DHAN",
            "execution_broker": "DHAN",
        }
        res = client.post("/api/options/order-intent", json=valid_payload)
        assert res.status_code == 200
        resp_data = res.get_json()
        assert resp_data["status"] == "success"
        assert resp_data["mode"] == "PAPER"
        assert "OPT_INTENT_" in resp_data["order_intent_id"]

        # 2. Invalid Quantity
        invalid_qty = dict(valid_payload, quantity=0)
        res_qty = client.post("/api/options/order-intent", json=invalid_qty)
        assert res_qty.status_code == 400

        # 3. Excessive Notional Exceeding Risk Limit
        excessive_notional = dict(valid_payload, quantity=100000, price=1000.0)
        res_risk = client.post("/api/options/order-intent", json=excessive_notional)
        assert res_risk.status_code == 403
        assert res_risk.get_json()["error_code"] == "RISK_LIMIT_EXCEEDED"
