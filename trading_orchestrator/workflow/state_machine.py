"""
Workflow State Machine
======================
Authoritative state transitions for the trading workflow.
Transitions:
IDLE -> SCHEDULED -> RUNNING -> ANALYZING -> DECISION_READY -> RISK_CHECK -> APPROVED -> EXECUTING -> MONITORING -> EXITING -> COMPLETED
Error/Safety States:
FAILED, DEGRADED, BLOCKED, RECONCILIATION_REQUIRED, KILLED
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Set, Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("StateMachine")


class WorkflowState(str, Enum):
    IDLE = "IDLE"
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    ANALYZING = "ANALYZING"
    DECISION_READY = "DECISION_READY"
    RISK_CHECK = "RISK_CHECK"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    MONITORING = "MONITORING"
    EXITING = "EXITING"
    COMPLETED = "COMPLETED"

    # Error and Safety States
    FAILED = "FAILED"
    DEGRADED = "DEGRADED"
    BLOCKED = "BLOCKED"
    RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED"
    KILLED = "KILLED"


# Valid state transitions graph
VALID_TRANSITIONS: Dict[WorkflowState, Set[WorkflowState]] = {
    WorkflowState.IDLE: {
        WorkflowState.SCHEDULED,
        WorkflowState.RUNNING,
        WorkflowState.ANALYZING,
        WorkflowState.KILLED,
    },
    WorkflowState.SCHEDULED: {
        WorkflowState.RUNNING,
        WorkflowState.IDLE,
        WorkflowState.KILLED,
        WorkflowState.FAILED,
    },
    WorkflowState.RUNNING: {
        WorkflowState.ANALYZING,
        WorkflowState.DEGRADED,
        WorkflowState.FAILED,
        WorkflowState.KILLED,
        WorkflowState.COMPLETED,
    },
    WorkflowState.ANALYZING: {
        WorkflowState.DECISION_READY,
        WorkflowState.COMPLETED,
        WorkflowState.BLOCKED,
        WorkflowState.FAILED,
        WorkflowState.KILLED,
    },
    WorkflowState.DECISION_READY: {
        WorkflowState.RISK_CHECK,
        WorkflowState.BLOCKED,
        WorkflowState.COMPLETED,
        WorkflowState.KILLED,
        WorkflowState.FAILED,
    },
    WorkflowState.RISK_CHECK: {
        WorkflowState.APPROVED,
        WorkflowState.BLOCKED,
        WorkflowState.COMPLETED,
        WorkflowState.KILLED,
        WorkflowState.FAILED,
    },
    WorkflowState.APPROVED: {
        WorkflowState.EXECUTING,
        WorkflowState.BLOCKED,
        WorkflowState.COMPLETED,
        WorkflowState.KILLED,
        WorkflowState.FAILED,
    },
    WorkflowState.EXECUTING: {
        WorkflowState.MONITORING,
        WorkflowState.RECONCILIATION_REQUIRED,
        WorkflowState.COMPLETED,
        WorkflowState.FAILED,
        WorkflowState.KILLED,
    },
    WorkflowState.MONITORING: {
        WorkflowState.EXITING,
        WorkflowState.COMPLETED,
        WorkflowState.RECONCILIATION_REQUIRED,
        WorkflowState.DEGRADED,
        WorkflowState.KILLED,
        WorkflowState.FAILED,
    },
    WorkflowState.EXITING: {
        WorkflowState.COMPLETED,
        WorkflowState.RECONCILIATION_REQUIRED,
        WorkflowState.FAILED,
        WorkflowState.KILLED,
    },
    WorkflowState.COMPLETED: {
        WorkflowState.IDLE,
        WorkflowState.SCHEDULED,
        WorkflowState.RUNNING,
        WorkflowState.KILLED,
    },
    # Error states recovery transitions
    WorkflowState.FAILED: {WorkflowState.IDLE, WorkflowState.KILLED},
    WorkflowState.DEGRADED: {WorkflowState.RUNNING, WorkflowState.IDLE, WorkflowState.KILLED},
    WorkflowState.BLOCKED: {WorkflowState.IDLE, WorkflowState.SCHEDULED, WorkflowState.KILLED},
    WorkflowState.RECONCILIATION_REQUIRED: {WorkflowState.IDLE, WorkflowState.KILLED},
    WorkflowState.KILLED: {WorkflowState.IDLE},
}


class StateTransitionError(Exception):
    pass

InvalidStateTransitionError = StateTransitionError


def validate_transition(from_state: WorkflowState, to_state: WorkflowState) -> bool:
    """Validates if transition from from_state to to_state is permissible."""
    if to_state == WorkflowState.KILLED:
        # Emergency kill switch is always permissible from any state
        return True

    allowed = VALID_TRANSITIONS.get(from_state, set())
    if to_state not in allowed:
        msg = f"Invalid state transition attempted: {from_state.value} -> {to_state.value}"
        logger.error(msg)
        raise StateTransitionError(msg)
    return True


class StateTransitionEvent:
    def __init__(self, from_state: WorkflowState, to_state: WorkflowState, reason: str = ""):
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
        self.timestamp = datetime.now(timezone.utc).isoformat()


class WorkflowStateMachine:
    """In-memory state machine for managing step-by-step workflow lifecycle."""

    def __init__(self, initial_state: WorkflowState = WorkflowState.IDLE):
        self._state = initial_state
        self._history: List[StateTransitionEvent] = []

    @property
    def current_state(self) -> WorkflowState:
        return self._state

    def transition_to(self, new_state: WorkflowState, reason: str = "") -> StateTransitionEvent:
        validate_transition(self._state, new_state)
        event = StateTransitionEvent(from_state=self._state, to_state=new_state, reason=reason)
        self._state = new_state
        self._history.append(event)
        return event

    def kill(self, reason: str = "Kill switch triggered") -> StateTransitionEvent:
        return self.transition_to(WorkflowState.KILLED, reason=reason)

    def is_killed(self) -> bool:
        return self._state == WorkflowState.KILLED

    def reset_to_idle(self) -> None:
        self._state = WorkflowState.IDLE

