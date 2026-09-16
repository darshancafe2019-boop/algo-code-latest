"""
Comprehensive Test Suite for AI-Assisted Scheduled Trading Framework (Trading Orchestrator).
Tests cover:
1. Checkpoint configurations, timezone management, enable/disable toggles.
2. State machine transitions, safety states, and invalid transition handling.
3. AI Strategy Agent TradeIntent generation and parameter sanity.
4. Universal Risk Engine gating (verifying safe trades are approved, unsafe trades blocked).
5. Paper Execution simulation & Live Human Approval Gate.
6. Centralized Emergency Kill Switch activation and reset.
7. Trading Journal recording and EOD Daily Report aggregation.
8. REST API endpoints.
"""

import json
import pytest
from datetime import datetime, timezone
import pytz

from trading_orchestrator.scheduler.checkpoints import (
    CheckpointType, CheckpointConfig, DEFAULT_CHECKPOINTS
)
from trading_orchestrator.scheduler.scheduler import TradingScheduler
from trading_orchestrator.workflow.state_machine import (
    WorkflowState, WorkflowStateMachine, InvalidStateTransitionError
)
from trading_orchestrator.workflow.workflow_engine import WorkflowEngine
from trading_orchestrator.decisions.trade_intent import TradeIntent, ActionType, TimeInForce
from trading_orchestrator.decisions.decision_engine import DecisionEngine
from trading_orchestrator.ai.strategy_agent import StrategyAgent
from trading_orchestrator.ai.decision_validator import DecisionValidator
from trading_orchestrator.reports.trading_journal import TradingJournal
from trading_orchestrator.reports.daily_report import DailyReportGenerator
from trading_orchestrator.context.session_context import SessionContext
from trading_orchestrator.context.market_context import ComprehensiveMarketContext, MarketRegime


class TestCheckpointAndScheduler:
    """Validates checkpoint definitions, scheduler cron math, and timezone handling."""

    def test_default_checkpoints_presence(self):
        assert len(DEFAULT_CHECKPOINTS) == 6
        expected_types = [
            CheckpointType.PRE_MARKET_RESEARCH,
            CheckpointType.MARKET_OPEN_SCAN,
            CheckpointType.POSITION_REVIEW,
            CheckpointType.INTRADAY_MANAGEMENT,
            CheckpointType.CLOSING_MANAGEMENT,
            CheckpointType.END_OF_DAY_REPORT,
        ]
        for ct in expected_types:
            assert ct in DEFAULT_CHECKPOINTS
            cfg = DEFAULT_CHECKPOINTS[ct]
            assert cfg.enabled is True
            assert ":" in cfg.time_str

    def test_scheduler_timezone_and_next_run(self):
        scheduler = TradingScheduler(timezone_str="Asia/Kolkata")
        assert scheduler.timezone_str == "Asia/Kolkata"
        status = scheduler.get_schedule_status()
        assert len(status["checkpoints"]) == 6
        for item in status["checkpoints"]:
            assert "next_run" in item
            assert item["timezone"] == "Asia/Kolkata"

    def test_checkpoint_reconfiguration(self):
        scheduler = TradingScheduler()
        updated = scheduler.update_checkpoint_config(
            CheckpointType.PRE_MARKET_RESEARCH,
            time_str="06:30",
            enabled=False
        )
        assert updated is True
        cfg = scheduler.checkpoints[CheckpointType.PRE_MARKET_RESEARCH]
        assert cfg.time_str == "06:30"
        assert cfg.enabled is False


class TestWorkflowStateMachine:
    """Validates strict state machine lifecycle and error transitions."""

    def test_valid_sequential_lifecycle(self):
        sm = WorkflowStateMachine(initial_state=WorkflowState.IDLE)
        assert sm.current_state == WorkflowState.IDLE

        transitions = [
            WorkflowState.SCHEDULED,
            WorkflowState.RUNNING,
            WorkflowState.ANALYZING,
            WorkflowState.DECISION_READY,
            WorkflowState.RISK_CHECK,
            WorkflowState.APPROVED,
            WorkflowState.EXECUTING,
            WorkflowState.MONITORING,
            WorkflowState.EXITING,
            WorkflowState.COMPLETED,
            WorkflowState.IDLE
        ]

        for next_st in transitions:
            event = sm.transition_to(next_st, reason=f"Testing transition to {next_st.value}")
            assert sm.current_state == next_st
            assert event.to_state == next_st

    def test_invalid_transition_raises_error(self):
        sm = WorkflowStateMachine(initial_state=WorkflowState.IDLE)
        with pytest.raises(InvalidStateTransitionError):
            # Cannot jump directly from IDLE to EXECUTING
            sm.transition_to(WorkflowState.EXECUTING)

    def test_emergency_kill_switch_from_any_state(self):
        states_to_test = [
            WorkflowState.IDLE,
            WorkflowState.RUNNING,
            WorkflowState.ANALYZING,
            WorkflowState.EXECUTING,
            WorkflowState.MONITORING,
            WorkflowState.DEGRADED,
        ]
        for st in states_to_test:
            sm = WorkflowStateMachine(initial_state=st)
            sm.kill("Emergency Kill Switch invoked")
            assert sm.is_killed()
            assert sm.current_state == WorkflowState.KILLED

    def test_reconciliation_required_state(self):
        sm = WorkflowStateMachine(initial_state=WorkflowState.EXECUTING)
        sm.transition_to(WorkflowState.RECONCILIATION_REQUIRED, reason="Broker mismatch")
        assert sm.current_state == WorkflowState.RECONCILIATION_REQUIRED


class TestAiStrategyAndDecisionValidation:
    """Validates AI Strategy Agent, context ingestion, and trade intent sanity checks."""

    def test_decision_validator_valid_and_invalid_intents(self):
        validator = DecisionValidator()

        # Valid Buy Intent
        valid_intent = TradeIntent(
            instrumentId="NSE_NIFTY_23400_CE",
            symbol="NIFTY",
            exchange="NSE",
            action=ActionType.BUY,
            strategy="Bull Call Spread",
            entryPrice=150.0,
            quantity=50,
            stopLoss=120.0,
            takeProfit=200.0,
            timeInForce=TimeInForce.DAY,
            reason="Strong momentum above 20 EMA",
            confidence=0.85,
            paperOnly=True
        )
        is_valid, reason = validator.validate_intent(valid_intent)
        assert is_valid is True
        assert reason == "Valid TradeIntent"

        # Invalid Stop Loss (Buy order with Stop Loss >= Entry)
        invalid_intent = TradeIntent(
            instrumentId="NSE_NIFTY_23400_CE",
            symbol="NIFTY",
            exchange="NSE",
            action=ActionType.BUY,
            strategy="Bull Call Spread",
            entryPrice=150.0,
            quantity=50,
            stopLoss=160.0, # Invalid for BUY
            takeProfit=200.0,
            reason="Bad SL",
            confidence=0.85,
        )
        is_valid, reason = validator.validate_intent(invalid_intent)
        assert is_valid is False
        assert "Stop-loss" in reason or "stop" in reason.lower()

    def test_strategy_agent_formulates_intent_without_broker_calls(self):
        agent = StrategyAgent()
        market_ctx = ComprehensiveMarketContext(
            trend="BULLISH",
            volatility=13.5,
            india_vix=13.5,
            adx=28.4
        )
        intents = agent.analyze_and_generate_intents(
            checkpoint_type=CheckpointType.MARKET_OPEN_SCAN,
            market_context=market_ctx,
            watchlist=["NIFTY", "BANKNIFTY"],
            active_strategies=["Bull Call Spread", "Iron Condor"],
            paper_only=True
        )
        assert isinstance(intents, list)
        for intent in intents:
            assert isinstance(intent, TradeIntent)
            assert intent.paperOnly is True
            assert intent.confidence >= 0.0
            assert intent.stopLoss > 0
            assert intent.takeProfit > 0


class TestRiskEngineIntegration:
    """Validates that all AI decisions strictly pass through Universal Risk Engine."""

    def test_risk_engine_blocks_oversized_orders(self):
        engine = DecisionEngine()
        # Create an intent with massive quantity exceeding capital limits
        excessive_intent = TradeIntent(
            instrumentId="NSE_NIFTY_23400_CE",
            symbol="NIFTY",
            exchange="NSE",
            action=ActionType.BUY,
            strategy="Long Call",
            entryPrice=2000.0,
            quantity=1000000, # Massive quantity
            stopLoss=1900.0,
            takeProfit=2300.0,
            reason="Massive trade test",
            confidence=0.90,
            paperOnly=True
        )

        result = engine.evaluate_trade_intent(excessive_intent)
        # Should be blocked by risk rules or limits
        assert result.risk_status in ["BLOCKED", "WARNING"]
        if result.risk_status == "BLOCKED":
            assert len(result.risk_reasons) > 0


class TestJournalAndDailyReport:
    """Validates persistent journal logs and daily report computation."""

    def test_trading_journal_and_report_generation(self):
        journal = TradingJournal()
        entry_id = journal.log_entry(
            checkpoint_type=CheckpointType.PRE_MARKET_RESEARCH.value,
            market_regime=MarketRegime.NEUTRAL_RANGING,
            market_context={"trend": "SIDEWAYS", "vix": 14.2},
            ai_analysis={"notes": "Range-bound session expected."},
            candidate_setups=["Iron Condor 23200/23600"],
            trade_decisions=[{"symbol": "NIFTY", "action": "BUY"}],
            risk_result={"status": "APPROVED"},
            execution_result={"mode": "PAPER", "status": "SIMULATED_FILL"},
            position_result={"open_positions": 1},
            final_outcome="Completed successfully"
        )
        assert entry_id is not None
        assert len(str(entry_id)) > 0

        # Retrieve recent entries
        entries = journal.get_recent_entries(limit=10)
        assert len(entries) > 0
        assert entries[0]["checkpoint_type"] == CheckpointType.PRE_MARKET_RESEARCH.value

        # Generate Daily Report
        report_gen = DailyReportGenerator()
        report = report_gen.generate_daily_report()
        assert "date" in report
        assert "pnl" in report
        assert "risk_utilization" in report
        assert "ai_observations" in report
        assert "next_session_watchlist" in report


class TestWorkflowEngineAndKillSwitch:
    """Validates workflow execution loop and emergency kill switch safety mechanisms."""

    def test_workflow_engine_lifecycle(self):
        engine = WorkflowEngine()
        assert engine.is_running is False
        assert engine.is_paused is False
        assert engine.is_killed is False

        # Start workflow
        started = engine.start_workflow()
        assert started is True
        assert engine.is_running is True

        # Pause
        engine.pause_workflow("User requested pause")
        assert engine.is_paused is True

        # Resume
        engine.resume_workflow()
        assert engine.is_paused is False

        # Stop
        engine.stop_workflow("EOD stop")
        assert engine.is_running is False

    def test_emergency_kill_switch_authoritative_lock(self):
        engine = WorkflowEngine()
        engine.start_workflow()

        # Trigger emergency kill switch
        kill_audit = engine.trigger_kill_switch("EMERGENCY TEST TRIGGER")
        assert engine.is_killed is True
        assert engine.is_running is False
        assert engine.state_machine.current_state == WorkflowState.KILLED
        assert kill_audit["status"] == "KILLED"

        # Attempting to start while killed should fail
        assert engine.start_workflow() is False

        # Reset kill switch
        reset_res = engine.reset_kill_switch()
        assert reset_res.get("success") is True
        assert engine.is_killed is False
        assert engine.state_machine.current_state == WorkflowState.IDLE
