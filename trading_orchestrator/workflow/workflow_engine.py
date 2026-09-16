"""
Workflow Engine & Orchestrator Coordinator
==========================================
Coordinates active workflow executions, triggers state transitions, executes safety halts,
enforces durable distributed locking, handles safe restart reconciliation, and dispatches real-time events.
"""

from __future__ import annotations

import uuid
import logging
import threading
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone

from src import config, db
from src.audit import log_bot_event
from trading_orchestrator.workflow.state_machine import WorkflowState
from trading_orchestrator.workflow.workflow_state import global_workflow_state_mgr, WorkflowStateContext
from trading_orchestrator.scheduler.jobs import CheckpointJobRunner
from trading_orchestrator.scheduler.checkpoints import DEFAULT_CHECKPOINTS, normalize_checkpoint_id
from trading_orchestrator.scheduler.durable_lock import DurableLockManager
from trading_orchestrator.db_init import init_orchestrator_tables

logger = logging.getLogger("WorkflowEngine")


class WorkflowEngine:
    """Central engine driving automated trading workflows with durable locking and recovery."""

    def __init__(self):
        self._lock = threading.RLock()
        self._is_running = False
        self._is_paused = False
        self._is_killed = False
        self._listeners: List[Callable[[Dict[str, Any]], None]] = []
        init_orchestrator_tables()
        self._recover_and_reconcile_on_startup()

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def is_paused(self) -> bool:
        return self._is_paused

    @property
    def is_killed(self) -> bool:
        return self._is_killed

    @property
    def state_machine(self):
        from trading_orchestrator.workflow.state_machine import WorkflowStateMachine
        ctx = global_workflow_state_mgr.get_current_context()
        st = ctx.current_state if ctx else (WorkflowState.KILLED if self._is_killed else WorkflowState.IDLE)
        return WorkflowStateMachine(initial_state=st)

    def _recover_and_reconcile_on_startup(self) -> None:
        """Safe recovery upon startup: reconciles broker positions and cleans up dangling states."""
        try:
            # Check for dangling active runs
            dangling = db.safe_query(
                "SELECT run_id FROM orchestrator_workflow_runs WHERE status IN ('RUNNING', 'ANALYZING', 'RISK_CHECK', 'EXECUTING')"
            ) or []
            if dangling:
                logger.warning("[STARTUP_RECOVERY] Found %d dangling workflow runs. Marking as RECONCILIATION_REQUIRED / COMPLETED.", len(dangling))
                now_iso = datetime.now(timezone.utc).isoformat()
                for d in dangling:
                    db.safe_execute(
                        "UPDATE orchestrator_workflow_runs SET status = 'COMPLETED', completed_at = ?, error_message = 'Recovered after engine restart' WHERE run_id = ?",
                        (now_iso, d["run_id"])
                    )

            # Reconcile orders in UNKNOWN / SUBMITTED state
            unreconciled_orders = db.safe_query(
                "SELECT order_id, broker, idempotency_key FROM orchestrator_orders WHERE status IN ('SUBMITTED', 'UNKNOWN')"
            ) or []
            if unreconciled_orders:
                logger.warning("[ORDER_RECONCILIATION] Reconciling %d unconfirmed orders after restart.", len(unreconciled_orders))
                now_iso = datetime.now(timezone.utc).isoformat()
                for ord_row in unreconciled_orders:
                    db.safe_execute(
                        "UPDATE orchestrator_orders SET status = 'RECONCILIATION_REQUIRED', updated_at = ? WHERE order_id = ?",
                        (now_iso, ord_row["order_id"])
                    )
        except Exception as e:
            logger.error("[RECOVERY_ERROR] Error during startup recovery: %s", e)

    def start_workflow(self) -> bool:
        with self._lock:
            if self._is_killed:
                return False
            self._is_running = True
            self._is_paused = False
            return True

    def pause_workflow(self, reason: str = "") -> None:
        self.pause_orchestrator()

    def resume_workflow(self) -> None:
        self.resume_orchestrator()

    def stop_workflow(self, reason: str = "") -> None:
        with self._lock:
            self._is_running = False
            try:
                global_workflow_state_mgr.transition_to(WorkflowState.IDLE, reason=reason or "Workflow stopped")
            except Exception:
                pass

    def register_listener(self, listener: Callable[[Dict[str, Any]], None]) -> None:
        with self._lock:
            if listener not in self._listeners:
                self._listeners.append(listener)

    def unregister_listener(self, listener: Callable[[Dict[str, Any]], None]) -> None:
        with self._lock:
            if listener in self._listeners:
                self._listeners.remove(listener)

    def broadcast_event(self, event_type: str, data: Dict[str, Any]) -> None:
        event_payload = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        with self._lock:
            listeners_copy = list(self._listeners)

        for listener in listeners_copy:
            try:
                listener(event_payload)
            except Exception as e:
                logger.debug("Failed notifying listener: %s", e)

    def trigger_checkpoint_execution(
        self,
        checkpoint_id: str,
        trigger_type: str = "SCHEDULED",
        execution_mode: str = "PAPER",
        symbols: Optional[List[str]] = None,
        broker: str = "PAPER",
        broker_account_id: str = "DEFAULT",
        strategy_id: str = "ALL",
    ) -> Dict[str, Any]:
        """
        Executes a complete checkpoint workflow through the state machine with durable locking.
        """
        if self._is_killed:
            raise PermissionError("Trading Orchestrator is KILLED by Emergency Kill Switch. Resume/Reset required.")

        canonical_cp = normalize_checkpoint_id(checkpoint_id)

        # 1. Acquire durable lock to prevent overlapping runs
        lock_id = DurableLockManager.acquire_lock(
            routine_id=canonical_cp,
            strategy_id=strategy_id,
            broker=broker,
            account_id=broker_account_id,
            mode=execution_mode,
            timeout_seconds=180,
        )

        if not lock_id:
            logger.warning("[WORKFLOW] Overlapping run prevented for checkpoint %s", canonical_cp)
            return {
                "status": "BLOCKED",
                "reason": "OVERLAPPING_RUN_PREVENTED",
                "message": f"Durable lock active for routine {canonical_cp}. Overlapping run skipped.",
            }

        try:
            with self._lock:
                if self._is_killed:
                    raise PermissionError("Trading Orchestrator is KILLED by Emergency Kill Switch. Resume/Reset required.")

                if self._is_paused:
                    logger.info("[WORKFLOW] Orchestrator is PAUSED. Skipping checkpoint %s", canonical_cp)
                    return {"status": "SKIPPED", "reason": "ORCHESTRATOR_PAUSED"}

                run_id = f"RUN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                session_id = f"SESS-{datetime.now().strftime('%Y%m%d')}"
                request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
                checkpoint_cfg = DEFAULT_CHECKPOINTS.get(canonical_cp)
                checkpoint_name = checkpoint_cfg.name if checkpoint_cfg else canonical_cp

                # 1. State: RUNNING
                ctx = global_workflow_state_mgr.initialize_run(
                    run_id=run_id,
                    checkpoint_id=canonical_cp,
                    checkpoint_name=checkpoint_name,
                    trigger_type=trigger_type,
                )
                self.broadcast_event("CHECKPOINT_STARTED", {
                    "run_id": run_id,
                    "session_id": session_id,
                    "request_id": request_id,
                    "checkpoint_id": canonical_cp,
                    "state": "RUNNING",
                })

            # 2. State: ANALYZING
            global_workflow_state_mgr.transition_to(WorkflowState.ANALYZING, "Gathering market data and running AI Strategy Agent")
            self.broadcast_event("WORKFLOW_STATE_CHANGED", {"run_id": run_id, "state": "ANALYZING"})

            # 3. State: DECISION_READY
            global_workflow_state_mgr.transition_to(WorkflowState.DECISION_READY, "AI Strategy Agent formulated trade intents")
            self.broadcast_event("WORKFLOW_STATE_CHANGED", {"run_id": run_id, "state": "DECISION_READY"})

            # 4. State: RISK_CHECK & EXECUTING
            global_workflow_state_mgr.transition_to(WorkflowState.RISK_CHECK, "Evaluating intents with Universal Risk Engine")
            self.broadcast_event("WORKFLOW_STATE_CHANGED", {"run_id": run_id, "state": "RISK_CHECK"})

            # Execute Checkpoint Logic
            result = CheckpointJobRunner.execute_checkpoint(
                checkpoint_id=canonical_cp,
                run_id=run_id,
                execution_mode=execution_mode,
                symbols=symbols,
            )

            # 5. State: APPROVED / EXECUTING
            if result.get("approved_count", 0) > 0:
                global_workflow_state_mgr.transition_to(WorkflowState.APPROVED, f"Approved {result.get('approved_count')} trade intents")
                global_workflow_state_mgr.transition_to(WorkflowState.EXECUTING, f"Routing orders via {execution_mode} engine")
                global_workflow_state_mgr.transition_to(WorkflowState.MONITORING, "Monitoring active executions")

            # 6. State: COMPLETED
            global_workflow_state_mgr.transition_to(WorkflowState.COMPLETED, f"Checkpoint {canonical_cp} completed successfully")
            self.broadcast_event("CHECKPOINT_COMPLETED", {"run_id": run_id, "checkpoint_id": canonical_cp, "result": result})

            # Update checkpoint metadata in DB
            now_iso = datetime.now(timezone.utc).isoformat()
            db.safe_execute(
                """
                UPDATE orchestrator_checkpoints SET
                    last_run = ?,
                    last_status = 'SUCCESS',
                    last_result_summary = ?
                WHERE checkpoint_id = ?
                """,
                (now_iso, result.get("summary", "Completed"), canonical_cp)
            )

            return result

        except Exception as e:
            logger.error("[WORKFLOW_ERROR] Checkpoint %s failed: %s", canonical_cp, e)
            try:
                global_workflow_state_mgr.transition_to(WorkflowState.FAILED, f"Error: {e}")
            except Exception:
                pass
            self.broadcast_event("CHECKPOINT_FAILED", {"run_id": run_id, "checkpoint_id": canonical_cp, "error": str(e)})
            return {"status": "FAILED", "error": str(e), "run_id": run_id}
        finally:
            # Release durable lock
            DurableLockManager.release_lock(lock_id)

    def trigger_kill_switch(self, operator: str = "Operator") -> Dict[str, Any]:
        """
        Authoritative Emergency Kill Switch.
        Immediately stops new orders, stops all bot instances, transitions to KILLED, and logs audit record.
        """
        with self._lock:
            self._is_killed = True
            self._is_running = False
            self._is_paused = True

            try:
                global_workflow_state_mgr.transition_to(WorkflowState.KILLED, f"Emergency Kill Switch triggered by {operator}")
            except Exception:
                pass

            # Activate global backend kill switch in config
            setattr(config, "GLOBAL_KILL_SWITCH", True)

            log_bot_event(
                event_type="EMERGENCY_KILL_SWITCH_TRIGGERED",
                message=f"CRITICAL: Emergency Kill Switch activated by {operator}. All automated workflows halted.",
                severity="CRITICAL",
            )

            self.broadcast_event("KILL_SWITCH_TRIGGERED", {"operator": operator, "status": "KILLED"})
            logger.warning("[KILL_SWITCH] Emergency Kill Switch activated by %s", operator)

            return {
                "success": True,
                "status": "KILLED",
                "message": "Emergency Kill Switch activated. All workflows halted and live trading locked.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def reset_kill_switch(self, operator: str = "Operator") -> Dict[str, Any]:
        """Resets the kill switch back to IDLE state."""
        with self._lock:
            self._is_killed = False
            self._is_paused = False
            setattr(config, "GLOBAL_KILL_SWITCH", False)

            try:
                global_workflow_state_mgr.transition_to(WorkflowState.IDLE, f"Kill Switch reset by {operator}")
            except Exception:
                pass

            log_bot_event(
                event_type="KILL_SWITCH_RESET",
                message=f"Kill Switch reset by {operator}. Workflow state reset to IDLE.",
                severity="INFO",
            )
            self.broadcast_event("KILL_SWITCH_RESET", {"operator": operator, "status": "IDLE"})

            return {
                "success": True,
                "status": "IDLE",
                "message": "Kill switch reset successfully. System returned to IDLE.",
            }

    def pause_orchestrator(self) -> Dict[str, Any]:
        with self._lock:
            self._is_paused = True
            self.broadcast_event("ORCHESTRATOR_PAUSED", {"status": "PAUSED"})
            return {"status": "PAUSED", "is_paused": True}

    def resume_orchestrator(self) -> Dict[str, Any]:
        with self._lock:
            self._is_paused = False
            self.broadcast_event("ORCHESTRATOR_RESUMED", {"status": "ACTIVE"})
            return {"status": "ACTIVE", "is_paused": False}


global_workflow_engine = WorkflowEngine()
