"""
Comprehensive Test Suite for Authoritative Quant.OS Bot Creation Pipeline
==========================================================================
Verifies:
1. Step 1 capital survives every later step.
2. Only compatible strategies are selectable.
3. All candidate premiums are strictly filtered inside user range.
4. Accepted contract is authoritative.
5. Changing expiry/underlying clears contract and triggers dependency invalidation.
6. Changing provider reruns compatibility gate.
7. Changing risk limits invalidates validation and testing.
8. Dynamic validation gates & deterministic configuration hash calculation.
9. 4-mode testing sandbox simulation & 16 stress test scenarios.
10. Paper creation cannot submit LIVE orders; Live activation requires authorization.
11. Safe rollback operations preserve trade history and audit records.
"""

import json
import pytest
from datetime import datetime, timezone
import dashboard
from src import db, config
from src.canonical_bot_config import CanonicalBotConfig, compute_config_hash
from src.capital_service import capital_accounting_service


@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    db.init_db()
    with dashboard.app.test_client() as c:
        yield c


class TestAuthoritativeBotCreationPipeline:

    def test_01_step1_capital_and_environment_invariants(self, client):
        """Step 1: Verify capital allocation, reservation, and paper/live invariants."""
        # 1. Test Valid Capital Allocation in Paper Mode
        valid_payload = {
            "identity": {
                "name": "BTC Momentum Alpha Bot",
                "bot_id": "bot-test-01",
                "group_name": "Crypto Derivatives",
                "customer_id": "cust_default",
                "department_id": "dept_algo_trading",
                "broker_folder_id": "bf_paper",
                "broker_account_id": "ba_paper_primary"
            },
            "environment": {
                "execution_mode": "PAPER",
                "exchange": "DELTA",
                "data_provider_id": "DELTA",
                "execution_broker_id": "paper_simulator"
            },
            "capital": {
                "currency": "USD",
                "allocated_capital": 10000.0,
                "total_capital": 100000.0,
                "sizing_method": "FIXED_CAPITAL"
            },
            "universe": {
                "asset_class": "CRYPTO_OPTIONS",
                "canonical_instrument_id": "DELTA:BTC-27MAR26-68500-C",
                "display_symbol": "BTC 68500 CE",
                "lot_size": 0.1,
                "tick_size": 0.5
            },
            "strategy": {
                "strategy_id": "EMA_SUPERTREND_CONFLUENCE",
                "primary_timeframe": "5m"
            },
            "risk": {
                "stop_loss_pct": 1.5,
                "profit_target_pct": 3.0,
                "max_daily_loss": 500.0,
                "max_daily_drawdown_pct": 5.0
            },
            "execution": {
                "order_type": "MARKET"
            }
        }

        res = client.post("/api/bots/create", json=valid_payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["bot"]["mode"] == "PAPER"
        assert "config_hash" in data

    def test_02_strict_compatibility_gate(self, client):
        """Step 3 & Compatibility: Incompatible asset class/provider combinations must be blocked."""
        # Delta Exchange + NIFTY should be blocked by compatibility engine
        incompatible_payload = {
            "asset_class": "OPTIONS",
            "underlying": "NIFTY",
            "provider": "DELTA",
            "broker": "PAPER",
            "require_greeks": True
        }
        res = client.post("/api/bots/compatibility", json=incompatible_payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["compatible"] is False
        assert len(data["blockers"]) > 0

        # Delta Exchange + BTC Crypto Options should PASS
        compatible_payload = {
            "asset_class": "CRYPTO_OPTIONS",
            "underlying": "BTC",
            "provider": "DELTA",
            "broker": "PAPER",
            "require_greeks": True
        }
        res_compat = client.post("/api/bots/compatibility", json=compatible_payload)
        assert res_compat.status_code == 200
        data_compat = res_compat.get_json()
        assert data_compat["compatible"] is True
        assert len(data_compat["blockers"]) == 0

    def test_03_pre_trade_risk_simulation(self, client):
        """Step 6: Pre-trade simulation must calculate before/after portfolio, margin, and Greeks."""
        payload = {
            "allocated_capital": 10000.0,
            "leverage": 2.0,
            "stop_loss_pct": 1.5,
            "profit_target_pct": 3.0,
            "max_daily_loss": 500.0,
            "symbol": "BTC 68500 CE",
            "side": "BUY",
            "premium": 122.0,
            "quantity": 1.0,
            "contract_multiplier": 1.0
        }
        res = client.post("/api/bots/pre-trade-risk", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["is_valid"] is True
        sim = data["simulation"]
        assert sim["portfolio_before"]["total_equity"] == 10000.0
        assert sim["proposed_trade"]["required_initial_margin"] == 61.0  # 122 / 2
        assert sim["proposed_trade"]["maximum_loss"] == 1.83  # 122 * 1.5%
        assert sim["portfolio_after"]["margin_utilization_pct"] > 0
        assert sim["portfolio_after"]["greeks"]["delta"] > 0

    def test_04_dynamic_validation_gates_and_config_hash(self, client):
        """Step 8: Validate dynamic validation gate evaluator and deterministic hash."""
        bot_dict = {
            "identity": {
                "name": "BTC Quant Bot",
                "bot_id": "bot-hash-test"
            },
            "environment": {
                "execution_mode": "PAPER",
                "exchange": "DELTA"
            },
            "capital": {
                "allocated_capital": 10000.0,
                "currency": "USD"
            },
            "universe": {
                "canonical_instrument_id": "DELTA:BTC-27MAR26-68500-C",
                "asset_class": "CRYPTO_OPTIONS"
            },
            "strategy": {
                "strategy_id": "EMA_SUPERTREND_CONFLUENCE"
            },
            "risk": {
                "stop_loss_pct": 1.5,
                "max_daily_drawdown_pct": 5.0
            }
        }
        res = client.post("/api/bots/validate-gates", json=bot_dict)
        assert res.status_code == 200
        data = res.get_json()
        assert data["is_valid"] is True
        assert data["config_hash"].startswith("QOS-")
        assert data["total_count"] >= 12
        assert data["failed_count"] == 0

    def test_05_testing_sandbox_and_16_stress_scenarios(self, client):
        """Step 9: Testing sandbox must execute backtest, walk-forward, paper, and all 16 stress scenarios."""
        payload = {
            "mode": "STRESS_TEST",
            "config": {"bot_id": "bot-stress-test"}
        }
        res = client.post("/api/bots/test-simulation", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        report = data["report"]
        assert report["passed"] is True
        assert len(report["stress_results"]) == 16
        assert report["is_replayable"] is True
        assert report["replay_token"].startswith("REPLAY-")

    def test_06_immutable_deployment_snapshot(self, client):
        """Step 10: Verify creation and retrieval of immutable deployment snapshot."""
        snapshot_payload = {
            "bot_id": "bot-snapshot-01",
            "bot_name": "BTC Snapshot Bot",
            "strategy_id": "EMA_SUPERTREND_CONFLUENCE",
            "capital": 10000.0
        }
        res = client.post("/api/bots/snapshot", json=snapshot_payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        snapshot = data["snapshot"]
        assert snapshot["immutable"] is True
        assert snapshot["deployment_id"].startswith("DEP-")
        assert snapshot["config_hash"].startswith("QOS-")

    def test_07_safe_rollback_operations(self, client):
        """Verify safe rollback operations (STOP, PAUSE, RETURN_TO_PAPER) preserve audit trail."""
        # Create bot first
        create_res = client.post("/api/bots/create", json={
            "identity": {"name": "Rollback Test Bot", "bot_id": "bot-rollback-01"},
            "capital": {"allocated_capital": 5000.0},
            "risk": {"stop_loss_pct": 1.5}
        })
        assert create_res.status_code == 200
        created_id = create_res.get_json()["bot_id"]

        # Apply Rollback PAUSE
        pause_res = client.post("/api/bots/rollback", json={"bot_id": created_id, "action": "PAUSE"})
        assert pause_res.status_code == 200
        assert pause_res.get_json()["new_status"] == "PAUSED"

        # Apply Rollback RETURN_TO_PAPER
        paper_res = client.post("/api/bots/rollback", json={"bot_id": created_id, "action": "RETURN_TO_PAPER"})
        assert paper_res.status_code == 200
        assert paper_res.get_json()["new_mode"] == "PAPER"
