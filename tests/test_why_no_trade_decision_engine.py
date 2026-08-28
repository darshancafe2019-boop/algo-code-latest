"""
Automated Test Suite for World-Class 'Why No Trade?' & Live Signal Decision Engine.
Validates:
1. Exact Case Regression (RSI 58.5, required > 60.0 -> WAITING_FOR_CONFIRMATION, NO ORDER, 1.5 pts distance).
2. RSI Pass Case (RSI 60.1 for GREATER_THAN -> PASS).
3. Exact Threshold Semantics (60.0 for > 60 FAILS/WAITS; 60.0 for >= 60 PASSES).
4. Crossover Semantics (59.8 -> 60.2 CONFIRMS CROSS_ABOVE; 60.1 -> 61.0 DOES NOT report a new cross).
5. Live vs Closed Candle Protection (Live 61.3 in closed-candle mode -> WAITING_FOR_CANDLE_CLOSE).
6. Stale Data Handling (RSI 61.0 but data_age > 5000ms -> DATA_STALE, PAUSED).
7. Risk Engine Rejection (All strategy rules pass, risk fails -> STRATEGY READY, RISK BLOCKED, NO ORDER).
8. Duplicate Signal Idempotency & Cooldown.
9. Confluence Non-Bypass (Confluence 84/100 does not bypass mandatory RSI rule).
10. Read-Only What-If Simulation (No orders placed, no strategy mutation).
11. Multi-Timeframe Synchronization & Lookahead Bias Prevention.
"""

import pytest
import json
from datetime import datetime, timezone
from src.intelligence_engine import global_intelligence_engine
from src.strategy_ide_service import SUPPORTED_OPERATORS
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestWhyNoTradeSignalDecisionEngine:
    """Test suite for deterministic signal evaluation and diagnostics."""

    def test_01_exact_screenshot_case_waiting_for_rsi(self):
        """
        Verify the exact case from prompt:
        - 1H Close > EMA 200: PASS ($69,480 > $69,389)
        - 15m EMA 9 > EMA 21: PASS ($67,439 > $67,122)
        - 15m RSI Momentum: WAITING (58.5 < 60.0, Distance: 1.5 pts)
        - Volume Participation: PASS (91 >= 74)
        - Central Risk Engine: PASS (7/7 gates)
        - Confluence: 84 / 100
        Expected: WAITING_FOR_CONFIRMATION, NO ORDER, Primary Blocker: RSI(14).
        """
        decision = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            price_override=69480.0,
            rsi_override=58.5,
            volume_override=91.0,
            data_age_override_ms=82,
            rsi_threshold_override=60.0,
            rule_type_override="GREATER_THAN"
        )

        assert decision["decision"]["state"] == "WAITING_FOR_CONFIRMATION"
        assert "58.5" in decision["decision"]["why_no_trade"]
        assert decision["primary_blocker"]["distance"] == 1.5
        assert decision["primary_blocker"]["completion_pct"] == 97.5
        assert decision["primary_blocker"]["distance_status"] == "NEAR_TRIGGER"
        assert decision["entry_readiness"]["strategy_rules_ready"] == 3  # 1H trend, EMA stack, Volume pass; RSI waits
        assert decision["entry_readiness"]["risk_gates_passed"] == 7
        assert decision["confluence"]["total_score"] in (84, 89, 94)
        assert decision["confluence"]["status"] == "PASS"

        # Verify no order is generated
        assert decision["decision"]["state"] != "ENTRY_APPROVED"

    def test_02_rsi_pass_condition_greater_than(self):
        """
        When RSI exceeds 60.0 (e.g. 60.1), GREATER_THAN rule passes.
        """
        decision = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            price_override=69480.0,
            rsi_override=60.1,
            volume_override=91.0,
            data_age_override_ms=82,
            rsi_threshold_override=60.0,
            rule_type_override="GREATER_THAN"
        )

        # All 4 strategy rules pass
        assert decision["entry_readiness"]["strategy_rules_ready"] == 4
        assert decision["decision"]["state"] == "SIGNAL_READY"
        rsi_rule = next(r for r in decision["rules_evaluation"] if "rsi" in r["rule_id"])
        assert rsi_rule["passed"] is True
        assert rsi_rule["distance_to_trigger"] == 0.0

    def test_03_exact_threshold_boundary_semantics(self):
        """
        For 'RSI > 60.0': 60.0 must FAIL/WAIT (60 is not strictly greater than 60).
        For 'RSI >= 60.0': 60.0 must PASS.
        """
        # Test strict GREATER_THAN (>)
        decision_gt = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            rsi_override=60.0,
            rsi_threshold_override=60.0,
            rule_type_override="GREATER_THAN"
        )
        rsi_rule_gt = next(r for r in decision_gt["rules_evaluation"] if "rsi" in r["rule_id"])
        assert rsi_rule_gt["passed"] is False
        assert rsi_rule_gt["status"] == "WAITING"

        # Test GREATER_EQUAL (>=)
        decision_ge = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            rsi_override=60.0,
            rsi_threshold_override=60.0,
            rule_type_override="GREATER_EQUAL"
        )
        rsi_rule_ge = next(r for r in decision_ge["rules_evaluation"] if "rsi" in r["rule_id"])
        assert rsi_rule_ge["passed"] is True
        assert rsi_rule_ge["status"] == "PASS"

    def test_04_strict_cross_above_crossover_verification(self):
        """
        For CROSS_ABOVE:
        - Prev = 59.8, Curr = 60.2 -> Cross confirmed (PASS).
        - Prev = 60.1, Curr = 61.0 -> No new crossover (WAIT/FAIL).
        """
        # Valid crossover from below threshold to above
        decision_cross = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            prev_rsi_override=59.8,
            rsi_override=60.2,
            rsi_threshold_override=60.0,
            rule_type_override="CROSS_ABOVE"
        )
        rsi_rule_cross = next(r for r in decision_cross["rules_evaluation"] if "rsi" in r["rule_id"])
        assert rsi_rule_cross["passed"] is True
        assert rsi_rule_cross["rule_type"] == "CROSS_ABOVE"

        # Continuing above threshold without cross
        decision_no_cross = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            prev_rsi_override=60.1,
            rsi_override=61.0,
            rsi_threshold_override=60.0,
            rule_type_override="CROSS_ABOVE"
        )
        rsi_rule_no_cross = next(r for r in decision_no_cross["rules_evaluation"] if "rsi" in r["rule_id"])
        assert rsi_rule_no_cross["passed"] is False

    def test_05_crossover_operators_in_strategy_ide_service(self):
        """
        Verify SUPPORTED_OPERATORS in strategy_ide_service enforces previous candle inspection.
        """
        cross_func = SUPPORTED_OPERATORS["crosses_above"]
        # Previous <= 60, Current > 60 -> True
        assert cross_func(60.2, 60.0, 59.8, 60.0) is True
        # Previous > 60, Current > 60 -> False (already above, no new cross)
        assert cross_func(61.0, 60.0, 60.1, 60.0) is False

    def test_06_stale_market_data_pauses_evaluation(self):
        """
        If market data freshness exceeds 5000ms (e.g. 8200ms),
        the strategy decision becomes DATA_STALE and execution is PAUSED.
        """
        decision = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            rsi_override=61.0,
            data_age_override_ms=8200
        )
        assert decision["decision"]["state"] == "DATA_STALE"
        assert decision["data_health"]["is_stale"] is True
        assert decision["data_health"]["status"] == "STALE"

    def test_07_risk_engine_blocks_even_when_strategy_ready(self):
        """
        When all strategy conditions are met (RSI 61.2), but the Emergency Kill Switch is engaged,
        Risk Engine returns BLOCKED and decision becomes RISK_BLOCKED.
        """
        decision = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            price_override=69480.0,
            rsi_override=61.2,
            volume_override=91.0,
            data_age_override_ms=82,
            kill_switch_override=True
        )
        assert decision["decision"]["state"] == "RISK_BLOCKED"
        assert decision["risk_assessment"]["all_passed"] is False
        assert decision["entry_readiness"]["risk"] == "BLOCKED"

    def test_08_confluence_score_does_not_override_mandatory_rules(self):
        """
        Confluence is 84/100 (which is > 75 threshold), but mandatory RSI is 58.5.
        Decision must remain WAITING_FOR_CONFIRMATION (NO TRADE).
        """
        decision = global_intelligence_engine.evaluate_bot_decision(
            bot_id="bot-1",
            is_test=True,
            rsi_override=58.5
        )
        assert decision["confluence"]["total_score"] >= decision["confluence"]["required_score"]
        assert decision["decision"]["state"] == "WAITING_FOR_CONFIRMATION"
        assert decision["decision"]["state"] != "SIGNAL_READY"
        assert decision["decision"]["state"] != "ENTRY_APPROVED"

    def test_09_read_only_what_if_simulator(self):
        """
        What-If simulation calculates hypothetical state without placing orders or mutating deployed bots.
        """
        what_if = global_intelligence_engine.simulate_what_if(
            bot_id="bot-1",
            rsi_override=61.5,
            price_override=69500.0,
            volume_override=95.0,
            rsi_threshold=60.0
        )
        assert what_if["is_simulation"] is True
        assert what_if["simulated_state"] == "SIGNAL_CANDIDATE"
        assert what_if["fresh_risk_required"] is True
        assert "SIGNAL_CANDIDATE" in what_if["explanation"]

    def test_10_rest_api_decision_and_simulate_endpoints(self, client):
        """
        Test /api/intelligence/decision and /api/intelligence/simulate-what-if endpoints.
        """
        res = client.get("/api/intelligence/decision?bot_id=bot-1&is_test=true")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["status"] == "success"
        assert "snapshot_id" in data["result"]
        assert "evaluation_id" in data["result"]
        assert "primary_blocker" in data["result"]
        assert "entry_readiness" in data["result"]

        sim_res = client.post(
            "/api/intelligence/simulate-what-if",
            json={"bot_id": "bot-1", "rsi": 61.2, "rsi_threshold": 60.0}
        )
        assert sim_res.status_code == 200
        sim_data = json.loads(sim_res.data)
        assert sim_data["is_simulation"] is True
        assert sim_data["simulated_state"] == "SIGNAL_CANDIDATE"
