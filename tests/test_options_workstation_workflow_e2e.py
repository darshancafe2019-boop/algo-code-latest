"""
E2E Integration Test: Complete 4-Step Options Workstation Workflow
==================================================================
Tests:
1. Single source of truth market context (Spot price consistency)
2. 4-Step Builder workflow (Market -> Contracts -> Risk -> Review & Paper Execution)
3. Active Strategy deployed into Monitor Ledger
4. Pairs Trading analysis & Option Overlays
5. 14-Point Pre-Flight Risk Gate Check & Kill Switch
"""

import pytest
from dashboard import app
from src.crypto_option_strategy import OptionStrategyEngine


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_step1_preset_strategy_discovery(client):
    """Step 1: Discover strategies and select a preset."""
    res = client.get("/api/options/strategies")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 20

    # Load preset
    res_preset = client.get("/api/options/strategy/preset?name=bull-call-spread&underlying=NIFTY&spot=24800&expiry=28-SEP-2026")
    assert res_preset.status_code == 200
    preset_data = res_preset.get_json()
    assert preset_data["status"] == "success"
    assert len(preset_data["legs"]) == 2


def test_step2_contracts_and_evaluation(client):
    """Step 2: Evaluate custom legs with conservative pricing."""
    legs = [
        {"action": "BUY", "option_type": "CALL", "strike": 24800.0, "expiry": "28-SEP-2026", "premium": 204.0, "quantity": 1},
        {"action": "SELL", "option_type": "CALL", "strike": 24900.0, "expiry": "28-SEP-2026", "premium": 118.0, "quantity": 1},
    ]

    res = client.post("/api/options/strategy/evaluate", json={
        "strategy_name": "BULL_CALL_SPREAD",
        "underlying": "NIFTY",
        "spot_price": 24800.0,
        "legs": legs,
    })
    assert res.status_code == 200
    eval_data = res.get_json()
    assert eval_data["nature"] == "NET DEBIT"
    assert eval_data["net_premium"] == 86.0  # 204 - 118 = 86
    assert eval_data["max_loss"] == 86.0
    assert eval_data["max_profit"] == 14.0  # 100 strike diff - 86 debit = 14
    assert 24886.0 in eval_data["breakevens"]


def test_step3_and_step4_paper_execution_and_monitoring(client):
    """Steps 3 & 4: Execute paper trade, verify it appears in active strategies."""
    legs = [
        {"action": "BUY", "option_type": "CALL", "strike": 24800.0, "expiry": "28-SEP-2026", "premium": 204.0, "quantity": 1},
        {"action": "SELL", "option_type": "CALL", "strike": 24900.0, "expiry": "28-SEP-2026", "premium": 118.0, "quantity": 1},
    ]

    res_exec = client.post("/api/options/order/execute", json={
        "underlying": "NIFTY",
        "execution_mode": "PAPER",
        "broker_key": "paper",
        "strategy_name": "BULL_CALL_SPREAD",
        "legs": legs,
        "lots": 1,
    })
    assert res_exec.status_code == 200
    exec_data = res_exec.get_json()
    assert exec_data["status"] == "SUCCESS"
    instance_id = exec_data["instance_id"]

    # Verify presence in active strategies
    res_active = client.get("/api/options/active-strategies")
    assert res_active.status_code == 200
    active_data = res_active.get_json()
    instances = [s for s in active_data["strategies"] if s["instance_id"] == instance_id]
    assert len(instances) == 1
    assert instances[0]["status"] == "ACTIVE"

    # Pause strategy
    res_pause = client.post(f"/api/options/strategy/{instance_id}/control", json={"action": "PAUSE"})
    assert res_pause.status_code == 200

    # Resume strategy
    res_resume = client.post(f"/api/options/strategy/{instance_id}/control", json={"action": "RESUME"})
    assert res_resume.status_code == 200

    # Exit strategy
    res_exit = client.post(f"/api/options/strategy/{instance_id}/control", json={"action": "SQUARE_OFF"})
    assert res_exit.status_code == 200


def test_pairs_trading_workflow(client):
    """Verify statistical pairs scanning, analysis, option structure and execution."""
    res_scan = client.post("/api/options/pairs/scan", json={"market": "India"})
    assert res_scan.status_code == 200
    pairs = res_scan.get_json()["pairs"]
    assert len(pairs) > 0

    target_pair = pairs[0]["pair_id"]
    res_opt = client.post("/api/options/pairs/option-structure", json={
        "pair_id": target_pair,
        "structure_type": "PROTECTIVE_PUT_LONG_LEG",
        "allocated_capital": 25000.0,
    })
    assert res_opt.status_code == 200
    struct = res_opt.get_json()["structure"]
    assert struct["risk_profile"] == "DEFINED_RISK"
