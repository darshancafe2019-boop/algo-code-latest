"""
Unit & Integration Tests for AI Scheduler Deduplication & Single Source of Truth
================================================================================
Verifies:
1. Deterministic task fingerprinting and duplicate task prevention.
2. Idempotency-Key handling.
3. Durable locking and prevention of simultaneous task execution.
4. CRUD operations on canonical scheduled tasks.
5. Single source of truth state reporting.
"""

import pytest
import time
from datetime import datetime, timezone

from trading_orchestrator.scheduler.scheduler import (
    TradingScheduler,
    compute_task_fingerprint,
    global_trading_scheduler,
)
from trading_orchestrator.scheduler.durable_lock import DurableLockManager
from src import db


@pytest.fixture(autouse=True)
def clean_db():
    yield


def test_compute_task_fingerprint_normalization():
    # Different whitespace, casing, or line breaks should yield the exact same fingerprint
    fp1 = compute_task_fingerprint(
        task_type="AI_WORKFLOW",
        prompt="Execute   NIFTY   breakout strategy\n daily",
        schedule="09:15",
        timezone_str="Asia/Kolkata",
        target="NIFTY",
        config_dict={"strategy": "MOMENTUM", "risk": 1.0},
    )

    fp2 = compute_task_fingerprint(
        task_type="ai_workflow",
        prompt="Execute NIFTY breakout strategy daily",
        schedule=" 09:15 ",
        timezone_str="Asia/Kolkata",
        target="nifty",
        config_dict={"risk": 1.0, "strategy": "MOMENTUM"},
    )

    assert fp1 == fp2, "Fingerprint must be normalized and deterministic across whitespace, casing, and dictionary key order."


def test_task_creation_duplicate_prevention():
    scheduler = TradingScheduler()

    prompt = "Unique test prompt for deduplication testing"
    res1 = scheduler.create_task(
        name="Momentum Scan Test",
        schedule="10:30",
        prompt=prompt,
        task_type="AI_CUSTOM",
        timezone_str="Asia/Kolkata",
        target="BANKNIFTY",
    )
    assert res1["created"] is True
    task1 = res1["task"]
    task1_id = task1["id"]

    # Attempt to create the same task again
    res2 = scheduler.create_task(
        name="Momentum Scan Test Duplicate",
        schedule=" 10:30",
        prompt="Unique  test  prompt   for deduplication testing",
        task_type="ai_custom",
        timezone_str="Asia/Kolkata",
        target="banknifty",
    )
    assert res2["created"] is False
    assert res2["task"]["id"] == task1_id
    assert "already exists" in res2["message"]


def test_task_idempotency_key():
    scheduler = TradingScheduler()
    idem_key = f"idem_test_{time.time()}"

    res1 = scheduler.create_task(
        name="Idempotent Task 1",
        schedule="11:00",
        prompt="Idempotent Prompt A",
        idempotency_key=idem_key,
    )
    assert res1["created"] is True
    t1_id = res1["task"]["id"]

    # Second call with same idempotency key
    res2 = scheduler.create_task(
        name="Idempotent Task 2 (Different Name)",
        schedule="11:30",
        prompt="Different Prompt",
        idempotency_key=idem_key,
    )
    assert res2["created"] is False
    assert res2["task"]["id"] == t1_id


def test_task_crud_lifecycle():
    scheduler = TradingScheduler()
    res = scheduler.create_task(
        name="Lifecycle Test Task",
        schedule="14:00",
        prompt="Test lifecycle prompt",
        task_type="AI_WORKFLOW",
    )
    task_id = res["task"]["id"]

    # Read
    task = scheduler.get_task(task_id)
    assert task is not None
    assert task["status"] == "ACTIVE"
    assert task["enabled"] is True

    # Pause
    paused = scheduler.pause_task(task_id)
    assert paused["status"] == "PAUSED"
    assert paused["enabled"] is False

    # Resume
    resumed = scheduler.resume_task(task_id)
    assert resumed["status"] == "ACTIVE"
    assert resumed["enabled"] is True

    # Update
    updated = scheduler.update_task(task_id, {"name": "Renamed Task", "schedule": "14:30"})
    assert updated["name"] == "Renamed Task"
    assert updated["schedule"] == "14:30"

    # Delete
    deleted = scheduler.delete_task(task_id)
    assert deleted is True
    assert scheduler.get_task(task_id) is None


def test_durable_task_locking_prevents_simultaneous_runs():
    lock1 = DurableLockManager.acquire_lock(
        routine_id="TASK_test_simul_run",
        strategy_id="ALL",
        broker="PAPER",
        account_id="DEFAULT",
        mode="PAPER",
        timeout_seconds=60,
    )
    assert lock1 is not None, "First lock acquisition must succeed"

    # Attempt to acquire lock for same task routine
    lock2 = DurableLockManager.acquire_lock(
        routine_id="TASK_test_simul_run",
        strategy_id="ALL",
        broker="PAPER",
        account_id="DEFAULT",
        mode="PAPER",
        timeout_seconds=60,
    )
    assert lock2 is None, "Simultaneous second lock acquisition must be blocked"

    # Release and reacquire
    released = DurableLockManager.release_lock(lock1)
    assert released is True

    lock3 = DurableLockManager.acquire_lock(
        routine_id="TASK_test_simul_run",
        strategy_id="ALL",
        broker="PAPER",
        account_id="DEFAULT",
        mode="PAPER",
        timeout_seconds=60,
    )
    assert lock3 is not None, "Lock must be acquirable after release"
    DurableLockManager.release_lock(lock3)


def test_scheduler_state_single_source_of_truth():
    state = global_trading_scheduler.get_scheduler_state()
    assert "schedulerStatus" in state
    assert "tasks" in state
    assert "jobs" in state
    assert "nextRun" in state
    assert "lastRun" in state
    assert "runningJobs" in state
    assert "failedJobs" in state
    assert "pausedJobs" in state
    assert "timezone" in state
    assert "health" in state
    assert "errors" in state
    assert isinstance(state["tasks"], list)
    assert len(state["tasks"]) >= 6
