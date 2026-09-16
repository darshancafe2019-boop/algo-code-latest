"""
Workflow State & Persistence Bridge
===================================
Thread-safe, single source of truth for the active orchestrator workflow run.
Survives page refresh, frontend disconnect, and backend restart.
"""

from __future__ import annotations

import json
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict

from src import db
from trading_orchestrator.workflow.state_machine import WorkflowState, validate_transition


@dataclass
class StateTransitionLog:
    from_state: str
    to_state: str
    timestamp: str
    reason: str


@dataclass
class WorkflowStateContext:
    run_id: str
    checkpoint_id: str
    checkpoint_name: str
    current_state: WorkflowState = WorkflowState.IDLE
    trigger_type: str = "SCHEDULED"  # SCHEDULED, MANUAL, EVENT
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    duration_sec: float = 0.0
    error_message: str = ""
    state_history: List[StateTransitionLog] = field(default_factory=list)
    active_decisions_count: int = 0
    executed_orders_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "checkpoint_id": self.checkpoint_id,
            "checkpoint_name": self.checkpoint_name,
            "current_state": self.current_state.value,
            "trigger_type": self.trigger_type,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_sec": self.duration_sec,
            "error_message": self.error_message,
            "state_history": [asdict(h) for h in self.state_history],
            "active_decisions_count": self.active_decisions_count,
            "executed_orders_count": self.executed_orders_count,
        }


class WorkflowStateManager:
    """Manages thread-safe transitions and DB persistence for the current workflow run."""

    def __init__(self):
        self._lock = threading.RLock()
        self._current: Optional[WorkflowStateContext] = None
        self._load_active_run_from_db()

    def _load_active_run_from_db(self) -> None:
        rows = db.safe_query(
            """
            SELECT * FROM orchestrator_workflow_runs 
            WHERE status NOT IN ('COMPLETED', 'FAILED', 'KILLED') 
            ORDER BY started_at DESC LIMIT 1
            """
        )
        if rows:
            r = dict(rows[0])
            hist = []
            try:
                for h in json.loads(r.get("state_history_json") or "[]"):
                    hist.append(StateTransitionLog(**h))
            except Exception:
                pass

            state_val = r.get("status", "IDLE")
            try:
                wf_state = WorkflowState(state_val)
            except Exception:
                wf_state = WorkflowState.IDLE

            self._current = WorkflowStateContext(
                run_id=r["run_id"],
                checkpoint_id=r["checkpoint_id"],
                checkpoint_name=r["checkpoint_name"],
                current_state=wf_state,
                trigger_type=r.get("trigger_type", "SCHEDULED"),
                started_at=r["started_at"],
                completed_at=r.get("completed_at"),
                duration_sec=float(r.get("duration_sec", 0.0)),
                error_message=r.get("error_message", ""),
                state_history=hist,
                active_decisions_count=int(r.get("decisions_count", 0)),
                executed_orders_count=int(r.get("orders_count", 0)),
            )

    def get_current_context(self) -> Optional[WorkflowStateContext]:
        with self._lock:
            return self._current

    def initialize_run(
        self,
        run_id: str,
        checkpoint_id: str,
        checkpoint_name: str,
        trigger_type: str = "SCHEDULED"
    ) -> WorkflowStateContext:
        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            ctx = WorkflowStateContext(
                run_id=run_id,
                checkpoint_id=checkpoint_id,
                checkpoint_name=checkpoint_name,
                current_state=WorkflowState.RUNNING,
                trigger_type=trigger_type,
                started_at=now_iso,
            )
            ctx.state_history.append(
                StateTransitionLog(
                    from_state=WorkflowState.IDLE.value,
                    to_state=WorkflowState.RUNNING.value,
                    timestamp=now_iso,
                    reason=f"Run initialized via {trigger_type} for {checkpoint_name}",
                )
            )
            self._current = ctx
            self._save_to_db(ctx)
            return ctx

    def transition_to(self, new_state: WorkflowState, reason: str = "") -> None:
        with self._lock:
            if not self._current:
                now_iso = datetime.now(timezone.utc).isoformat()
                self._current = WorkflowStateContext(
                    run_id=f"RUN-ORPHAN-{int(datetime.now().timestamp())}",
                    checkpoint_id="MANUAL",
                    checkpoint_name="Manual Operation",
                    current_state=new_state,
                )
                self._save_to_db(self._current)
                return

            validate_transition(self._current.current_state, new_state)
            now_iso = datetime.now(timezone.utc).isoformat()
            old_state = self._current.current_state
            self._current.current_state = new_state
            self._current.state_history.append(
                StateTransitionLog(
                    from_state=old_state.value,
                    to_state=new_state.value,
                    timestamp=now_iso,
                    reason=reason,
                )
            )
            if new_state in [WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.KILLED]:
                self._current.completed_at = now_iso
                try:
                    start_dt = datetime.fromisoformat(self._current.started_at)
                    self._current.duration_sec = round((datetime.now(timezone.utc) - start_dt).total_seconds(), 2)
                except Exception:
                    pass

            self._save_to_db(self._current)

    def _save_to_db(self, ctx: WorkflowStateContext) -> None:
        hist_json = json.dumps([asdict(h) for h in ctx.state_history])
        db.safe_execute(
            """
            INSERT INTO orchestrator_workflow_runs (
                run_id, checkpoint_id, checkpoint_name, trigger_type, status,
                state_history_json, decisions_count, orders_count, started_at,
                completed_at, duration_sec, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(run_id) DO UPDATE SET
                status=excluded.status,
                state_history_json=excluded.state_history_json,
                decisions_count=excluded.decisions_count,
                orders_count=excluded.orders_count,
                completed_at=excluded.completed_at,
                duration_sec=excluded.duration_sec,
                error_message=excluded.error_message
            """,
            (
                ctx.run_id,
                ctx.checkpoint_id,
                ctx.checkpoint_name,
                ctx.trigger_type,
                ctx.current_state.value,
                hist_json,
                ctx.active_decisions_count,
                ctx.executed_orders_count,
                ctx.started_at,
                ctx.completed_at,
                ctx.duration_sec,
                ctx.error_message,
            )
        )


global_workflow_state_mgr = WorkflowStateManager()
