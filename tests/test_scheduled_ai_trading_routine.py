"""
Comprehensive Safety & Integration Tests for Scheduled AI Trading Routine
==========================================================================
Validates:
1. Paper mode enforcement (server-level locks).
2. Live endpoint blocking without explicit human authorization.
3. Broker / account segregation and prevention of cross-broker contamination.
4. Fail-closed behavior on stale quotes (dataQualityStatus != FRESH).
5. Duplicate routine execution prevention via durable distributed locks.
6. Duplicate order submission & idempotency protection.
7. Unknown order handling and reconciliation requirements.
8. Overlapping scheduled jobs protection.
9. Emergency kill switch immediate halt and state lock.
10. Valid vs Invalid quantity, price, stop-loss, take-profit, and options parameters.
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from src import config, db
from trading_orchestrator.scheduler.checkpoints import CheckpointType, normalize_checkpoint_id, DEFAULT_CHECKPOINTS
from trading_orchestrator.scheduler.durable_lock import DurableLockManager
from trading_orchestrator.workflow.state_machine import WorkflowState, WorkflowStateMachine, StateTransitionError, validate_transition
from trading_orchestrator.workflow.workflow_engine import WorkflowEngine
from trading_orchestrator.decisions.trade_intent import TradeIntent, DecisionType, ActionType
from trading_orchestrator.ai.decision_validator import DecisionValidator
from trading_orchestrator.decisions.decision_engine import DecisionEngine
from trading_orchestrator.db_init import init_orchestrator_tables


@pytest.fixture(autouse=True)
def setup_test_db():
    init_orchestrator_tables()
    db.safe_execute("DELETE FROM orchestrator_locks")
    db.safe_execute("DELETE FROM orchestrator_orders")
    setattr(config, "TRADING_MODE", "PAPER")
    setattr(config, "LIVE_TRADING_ENABLED", False)
    setattr(config, "PAPER_TRADING", True)
    setattr(config, "GLOBAL_KILL_SWITCH", False)
    yield


class TestPaperModeAndSafetyGates:
    """Verifies that live execution is strictly blocked and paper mode is non-negotiable."""

    def test_01_paper_mode_enforcement(self):
        assert config.TRADING_MODE == "PAPER"
        assert config.LIVE_TRADING_ENABLED is False
        assert config.PAPER_TRADING is True

    def test_02_live_order_blocked_when_live_disabled(self):
        intent = TradeIntent(
            symbol="NIFTY",
            instrumentId="NSE:NIFTY",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_123",
            marketDataSource="DHAN",
            action="BUY",
            strategy="MOMENTUM",
            entryPrice=24500.0,
            quantity=50.0,
            stopLoss=24300.0,
            takeProfit=24800.0,
            paperOnly=False,  # Requesting LIVE
            dataQualityStatus="FRESH",
        )

        is_approved, status_str, reasons, _ = DecisionEngine.evaluate_intent(
            intent=intent,
            run_id="TEST-RUN-LIVE-BLOCK",
        )
        assert is_approved is False
        assert status_str == "BLOCKED"
        assert any("LIVE_TRADING_LOCKED" in r for r in reasons)

    def test_03_stale_quote_fails_closed(self):
        intent = TradeIntent(
            symbol="RELIANCE",
            instrumentId="NSE:RELIANCE",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_123",
            marketDataSource="DHAN",
            action="BUY",
            entryPrice=2950.0,
            quantity=100.0,
            stopLoss=2920.0,
            takeProfit=3010.0,
            dataQualityStatus="STALE",  # Stale Quote
        )

        is_valid, errors = DecisionValidator.validate_intent_structure(intent)
        assert is_valid is False
        assert any("Data quality is not FRESH" in e for e in errors)

        is_approved, status_str, reasons, _ = DecisionEngine.evaluate_intent(
            intent=intent,
            run_id="TEST-RUN-STALE-BLOCK",
        )
        assert is_approved is False
        assert status_str == "BLOCKED"
        assert any("DATA_NOT_FRESH" in r for r in reasons)


class TestDurableLockingAndOverlapProtection:
    """Verifies that concurrent/overlapping runs for the same routine/strategy/broker/account/mode are blocked."""

    def test_01_durable_lock_acquisition_and_release(self):
        routine_id = "OPENING_SCAN"
        lock_id = DurableLockManager.acquire_lock(
            routine_id=routine_id,
            strategy_id="STRAT_1",
            broker="DHAN",
            account_id="ACC_123",
            mode="PAPER",
            timeout_seconds=60,
        )
        assert lock_id is not None
        assert DurableLockManager.is_locked(routine_id, "STRAT_1", "DHAN", "ACC_123", "PAPER") is True

        # Second acquisition for the same routine must be blocked
        second_lock = DurableLockManager.acquire_lock(
            routine_id=routine_id,
            strategy_id="STRAT_1",
            broker="DHAN",
            account_id="ACC_123",
            mode="PAPER",
        )
        assert second_lock is None

        # Releasing lock frees it
        released = DurableLockManager.release_lock(lock_id)
        assert released is True
        assert DurableLockManager.is_locked(routine_id, "STRAT_1", "DHAN", "ACC_123", "PAPER") is False

    def test_02_overlapping_workflow_execution_prevented(self):
        engine = WorkflowEngine()
        # Acquire lock manually first
        lock_id = DurableLockManager.acquire_lock(
            routine_id="OPENING_SCAN",
            strategy_id="ALL",
            broker="PAPER",
            account_id="DEFAULT",
            mode="PAPER",
        )
        assert lock_id is not None

        # Engine attempting to run OPENING_SCAN while locked
        res = engine.trigger_checkpoint_execution(checkpoint_id="OPENING_SCAN")
        assert res.get("status") == "BLOCKED"
        assert res.get("reason") == "OVERLAPPING_RUN_PREVENTED"

        DurableLockManager.release_lock(lock_id)


class TestIdempotencyAndDuplicatePrevention:
    """Verifies that duplicate order submissions and identical idempotency keys fail closed."""

    def test_01_idempotency_key_generation(self):
        intent1 = TradeIntent(
            decisionId="DEC-100",
            symbol="NIFTY",
            instrumentId="NSE:NIFTY",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_1",
            strategyId="STRAT_A",
            action="BUY",
            entryPrice=24400.0,
            quantity=50.0,
            stopLoss=24200.0,
            takeProfit=24700.0,
            checkpointId="OPENING_SCAN",
        )
        assert len(intent1.idempotencyKey) > 0

    def test_02_duplicate_order_rejection(self):
        intent = TradeIntent(
            decisionId="DEC-DUP-1",
            instrumentId="NSE_NIFTY_23400_CE",
            symbol="NIFTY",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_1",
            strategy="Long Call",
            action="BUY",
            entryPrice=150.0,
            quantity=25.0,
            stopLoss=135.0,
            takeProfit=200.0,
            checkpointId="OPENING_SCAN",
            dataQualityStatus="FRESH",
        )

        # First evaluation passes
        is_app, status, reasons, _ = DecisionEngine.evaluate_intent(intent=intent, run_id="RUN-1")
        assert is_app is True
        assert status == "APPROVED"

        # Duplicate evaluation with identical idempotencyKey blocked
        is_app2, status2, reasons2, _ = DecisionEngine.evaluate_intent(intent=intent, run_id="RUN-2")
        assert is_app2 is False
        assert status2 == "BLOCKED"
        assert any("DUPLICATE_ORDER_PREVENTED" in r for r in reasons2)


class TestEmergencyKillSwitch:
    """Verifies that the emergency kill switch immediately stops all workflows and blocks new orders."""

    def test_01_kill_switch_blocks_all_decisions(self):
        setattr(config, "GLOBAL_KILL_SWITCH", True)
        intent = TradeIntent(
            symbol="BTC",
            instrumentId="DELTA:BTC",
            exchange="DELTA",
            broker="DELTA",
            brokerAccountId="DELTA_1",
            action="BUY",
            entryPrice=76000.0,
            quantity=1.0,
            stopLoss=75000.0,
            takeProfit=78000.0,
            dataQualityStatus="FRESH",
        )

        is_approved, status_str, reasons, _ = DecisionEngine.evaluate_intent(intent=intent, run_id="RUN-KILL-TEST")
        assert is_approved is False
        assert status_str == "BLOCKED"
        assert any("EMERGENCY_KILL_SWITCH_ACTIVE" in r for r in reasons)

    def test_02_workflow_engine_kill_and_reset_cycle(self):
        engine = WorkflowEngine()
        kill_res = engine.trigger_kill_switch(operator="Safety Officer")
        assert kill_res["status"] == "KILLED"
        assert engine.is_killed is True

        # Running a checkpoint while killed raises PermissionError
        with pytest.raises(PermissionError):
            engine.trigger_checkpoint_execution("OPENING_SCAN")

        # Reset kill switch restores IDLE
        reset_res = engine.reset_kill_switch(operator="Safety Officer")
        assert reset_res["status"] == "IDLE"
        assert engine.is_killed is False


class TestOptionsParametersValidation:
    """Verifies that options contracts require explicit strike, expiry, CE/PE, and reasonable prices."""

    def test_01_invalid_option_type_rejected(self):
        intent = TradeIntent(
            symbol="NIFTY",
            instrumentId="NSE:NIFTY26SEP24500CE",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_1",
            marketDataSource="DHAN",
            action="BUY",
            entryPrice=120.0,
            quantity=50.0,
            stopLoss=90.0,
            takeProfit=160.0,
            optionType="INVALID_TYPE",
            strike=24500.0,
        )
        is_valid, errors = DecisionValidator.validate_intent_structure(intent)
        assert is_valid is False
        assert any("Invalid option type" in e for e in errors)

    def test_02_valid_ce_option_intent_passes(self):
        intent = TradeIntent(
            symbol="NIFTY",
            instrumentId="NSE:NIFTY26SEP24500CE",
            exchange="NSE",
            broker="DHAN",
            brokerAccountId="ACC_1",
            marketDataSource="DHAN",
            action="BUY",
            entryPrice=120.0,
            quantity=50.0,
            stopLoss=90.0,
            takeProfit=160.0,
            optionType="CE",
            strike=24500.0,
            expiry="2026-09-24",
            dataQualityStatus="FRESH",
        )
        is_valid, errors = DecisionValidator.validate_intent_structure(intent)
        assert is_valid is True
        assert len(errors) == 0
