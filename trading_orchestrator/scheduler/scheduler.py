"""
Timezone-Aware Trading Checkpoint & Task Scheduler
=================================================
Authoritative central scheduler engine for Quant.OS.
Schedules and triggers automated trading checkpoints and scheduled AI tasks.
Guarantees single source of truth, idempotent creation, deterministic deduplication,
and durable locking with zero duplicate execution.
"""

from __future__ import annotations

import json
import pytz
import time
import uuid
import hashlib
import logging
import threading
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta, time as dtime

from src import db
from trading_orchestrator.scheduler.checkpoints import (
    DEFAULT_CHECKPOINTS,
    CheckpointConfig,
    CheckpointType,
    normalize_checkpoint_id,
    _CheckpointsDict,
)
from trading_orchestrator.scheduler.durable_lock import DurableLockManager
from trading_orchestrator.workflow.workflow_engine import global_workflow_engine

logger = logging.getLogger("TradingScheduler")


def compute_task_fingerprint(
    task_type: str,
    prompt: str,
    schedule: str,
    timezone_str: str,
    target: str = "",
    config_dict: Optional[Dict[str, Any]] = None,
) -> str:
    """Computes deterministic SHA256 fingerprint for deduplication."""
    norm_type = task_type.strip().upper()
    norm_prompt = " ".join(prompt.strip().split())
    norm_schedule = schedule.strip().lower()
    norm_tz = timezone_str.strip()
    norm_target = target.strip().upper()
    norm_config = json.dumps(config_dict or {}, sort_keys=True)
    raw = f"{norm_type}|{norm_prompt}|{norm_schedule}|{norm_tz}|{norm_target}|{norm_config}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class ScheduledTask:
    id: str
    name: str
    description: str = ""
    type: str = "AI_WORKFLOW"
    prompt: str = ""
    schedule: str = "09:15"
    timezone: str = "Asia/Kolkata"
    status: str = "ACTIVE"  # ACTIVE, PAUSED, RUNNING, COMPLETED, FAILED, DISABLED
    enabled: bool = True
    createdAt: str = ""
    updatedAt: str = ""
    nextRunAt: Optional[str] = None
    lastRunAt: Optional[str] = None
    lastRunStatus: str = "IDLE"
    runCount: int = 0
    failureCount: int = 0
    fingerprint: str = ""
    idempotencyKey: Optional[str] = None
    createdBy: str = "SYSTEM"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "type": self.type,
            "prompt": self.prompt,
            "schedule": self.schedule,
            "timezone": self.timezone,
            "status": self.status,
            "enabled": self.enabled,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt,
            "nextRunAt": self.nextRunAt,
            "lastRunAt": self.lastRunAt,
            "lastRunStatus": self.lastRunStatus,
            "runCount": self.runCount,
            "failureCount": self.failureCount,
            "fingerprint": self.fingerprint,
            "idempotencyKey": self.idempotencyKey,
            "createdBy": self.createdBy,
            "metadata": self.metadata,
        }


class TradingScheduler:
    """Central authoritative scheduler engine for checkpoints and scheduled AI tasks."""

    def __init__(self, timezone_name: str = "Asia/Kolkata", timezone_str: Optional[str] = None):
        self.tz_name = timezone_str or timezone_name
        self.tz = pytz.timezone(self.tz_name)
        self._lock = threading.RLock()
        self._is_running = False
        self._thread: Optional[threading.Thread] = None
        self._last_checked_minute: Optional[str] = None
        self._checkpoints: Dict[str, CheckpointConfig] = _CheckpointsDict()
        self._recent_errors: List[str] = []
        self._init_checkpoints()
        self._sync_default_tasks()

    @property
    def timezone_str(self) -> str:
        return self.tz_name

    @property
    def checkpoints(self) -> Dict[str, CheckpointConfig]:
        return self._checkpoints

    def get_schedule_status(self) -> Dict[str, Any]:
        """Returns schedule configuration and status."""
        return {
            "timezone": self.tz_name,
            "checkpoints": self.get_checkpoints_status(),
        }

    def _compute_next_run(self, scheduled_time_str: str) -> str:
        """Calculates ISO timestamp of the next occurrence of scheduled_time (HH:MM) in local timezone."""
        now_local = datetime.now(self.tz)
        try:
            time_part = scheduled_time_str.strip().split()[0]
            hour, minute = map(int, time_part.split(":"))
            target_time = dtime(hour, minute)
            target_dt = self.tz.localize(datetime.combine(now_local.date(), target_time))
            if target_dt <= now_local:
                target_dt += timedelta(days=1)
            return target_dt.isoformat()
        except Exception:
            return (now_local + timedelta(hours=1)).isoformat()

    def _init_checkpoints(self) -> None:
        """Initializes or loads checkpoint configurations from SQLite."""
        with self._lock:
            for cp_id, cp_cfg in DEFAULT_CHECKPOINTS.items():
                row = db.safe_query("SELECT * FROM orchestrator_checkpoints WHERE checkpoint_id = ?", (cp_id,))
                if not row:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    db.safe_execute(
                        """
                        INSERT INTO orchestrator_checkpoints (
                            checkpoint_id, name, scheduled_time, timezone, is_enabled, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (cp_cfg.checkpoint_id, cp_cfg.name, cp_cfg.scheduled_time, cp_cfg.timezone, 1 if cp_cfg.is_enabled else 0, now_iso)
                    )
                    self._checkpoints[cp_id] = cp_cfg
                else:
                    r = dict(row[0])
                    self._checkpoints[cp_id] = CheckpointConfig(
                        checkpoint_id=r["checkpoint_id"],
                        name=r["name"],
                        description=cp_cfg.description,
                        scheduled_time=r["scheduled_time"],
                        timezone=r.get("timezone", self.tz_name),
                        is_enabled=bool(r.get("is_enabled", 1)),
                        last_run=r.get("last_run"),
                        next_run=r.get("next_run"),
                        last_status=r.get("last_status", "IDLE"),
                        last_duration_sec=float(r.get("last_duration_sec", 0.0)),
                        last_result_summary=r.get("last_result_summary", ""),
                    )

            self._update_all_next_runs()

    def _sync_default_tasks(self) -> None:
        """Synchronizes default checkpoints into the canonical scheduled_tasks table."""
        with self._lock:
            for cp_id, cp in self._checkpoints.items():
                fp = compute_task_fingerprint(
                    task_type="AI_CHECKPOINT",
                    prompt=f"Execute {cp.name} daily routine",
                    schedule=cp.scheduled_time,
                    timezone_str=cp.timezone,
                    target=cp.checkpoint_id,
                )
                existing = db.safe_query("SELECT id FROM scheduled_tasks WHERE id = ?", (cp.checkpoint_id,))
                now_iso = datetime.now(timezone.utc).isoformat()
                next_run = self._compute_next_run(cp.scheduled_time) if cp.is_enabled else None
                status = "ACTIVE" if cp.is_enabled else "PAUSED"

                if not existing:
                    db.safe_execute(
                        """
                        INSERT INTO scheduled_tasks (
                            id, name, description, type, prompt, schedule, timezone,
                            status, enabled, created_at, updated_at, next_run_at,
                            last_run_at, last_run_status, run_count, failure_count,
                            fingerprint, idempotency_key, created_by, metadata_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            cp.checkpoint_id,
                            cp.name,
                            cp.description,
                            "AI_CHECKPOINT",
                            f"Execute {cp.name} daily routine",
                            cp.scheduled_time,
                            cp.timezone,
                            status,
                            1 if cp.is_enabled else 0,
                            now_iso,
                            now_iso,
                            next_run,
                            cp.last_run,
                            cp.last_status,
                            0,
                            0,
                            fp,
                            f"cp_init_{cp.checkpoint_id}",
                            "SYSTEM",
                            json.dumps({"checkpoint_id": cp.checkpoint_id}),
                        )
                    )

    def _update_all_next_runs(self) -> None:
        for cp in self._checkpoints.values():
            if cp.is_enabled:
                cp.next_run = self._compute_next_run(cp.scheduled_time)
            else:
                cp.next_run = None

    def get_checkpoints_status(self) -> List[Dict[str, Any]]:
        with self._lock:
            self._update_all_next_runs()
            return [cp.to_dict() for cp in self._checkpoints.values()]

    def update_checkpoint_config(
        self,
        checkpoint_id: Any,
        scheduled_time: Optional[str] = None,
        is_enabled: Optional[bool] = None,
        time_str: Optional[str] = None,
        enabled: Optional[bool] = None,
        tz_name: Optional[str] = None,
    ) -> Any:
        with self._lock:
            cp_key = normalize_checkpoint_id(checkpoint_id)
            if cp_key not in self._checkpoints:
                raise ValueError(f"Unknown checkpoint ID: {cp_key}")

            effective_time = time_str if time_str is not None else scheduled_time
            effective_enabled = enabled if enabled is not None else is_enabled

            cp = self._checkpoints[cp_key]
            if effective_time is not None:
                cp.scheduled_time = effective_time.strip()
            if effective_enabled is not None:
                cp.is_enabled = effective_enabled
            if tz_name is not None:
                cp.timezone = tz_name.strip()
                self.tz_name = tz_name.strip()
                self.tz = pytz.timezone(self.tz_name)

            cp.next_run = self._compute_next_run(cp.scheduled_time) if cp.is_enabled else None
            now_iso = datetime.now(timezone.utc).isoformat()

            db.safe_execute(
                """
                UPDATE orchestrator_checkpoints SET
                    scheduled_time = ?,
                    is_enabled = ?,
                    timezone = ?,
                    next_run = ?,
                    updated_at = ?
                WHERE checkpoint_id = ?
                """,
                (cp.scheduled_time, 1 if cp.is_enabled else 0, cp.timezone, cp.next_run, now_iso, cp_key)
            )

            # Sync with scheduled_tasks table
            status = "ACTIVE" if cp.is_enabled else "PAUSED"
            db.safe_execute(
                """
                UPDATE scheduled_tasks SET
                    schedule = ?,
                    enabled = ?,
                    timezone = ?,
                    status = ?,
                    next_run_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (cp.scheduled_time, 1 if cp.is_enabled else 0, cp.timezone, status, cp.next_run, now_iso, cp_key)
            )

            return True

    # =========================================================================
    # CANONICAL TASK DEDUPLICATION & CRUD WORKFLOWS
    # =========================================================================

    def create_task(
        self,
        name: str,
        schedule: str,
        prompt: str = "",
        task_type: str = "AI_WORKFLOW",
        timezone_str: Optional[str] = None,
        target: str = "",
        config_dict: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        created_by: str = "USER",
    ) -> Dict[str, Any]:
        """
        Creates a new scheduled task with deterministic duplicate prevention and idempotency.
        If a matching task already exists, returns the existing task without creating a duplicate.
        """
        with self._lock:
            tz = timezone_str or self.tz_name
            fp = compute_task_fingerprint(
                task_type=task_type,
                prompt=prompt,
                schedule=schedule,
                timezone_str=tz,
                target=target,
                config_dict=config_dict,
            )

            # 1. Check idempotency key if provided
            if idempotency_key:
                row = db.safe_query("SELECT * FROM scheduled_tasks WHERE idempotency_key = ?", (idempotency_key,))
                if row:
                    logger.info("[SCHEDULER][IDEMPOTENCY] Matching idempotency key '%s' found. Returning existing task.", idempotency_key)
                    return {"created": False, "task": self._row_to_task_dict(row[0]), "message": "Task already exists (idempotency key matched)."}

            # 2. Check deterministic fingerprint
            row_fp = db.safe_query("SELECT * FROM scheduled_tasks WHERE fingerprint = ?", (fp,))
            if row_fp:
                logger.info("[SCHEDULER][DEDUP] Task with identical fingerprint '%s' exists. Returning existing task.", fp)
                return {"created": False, "task": self._row_to_task_dict(row_fp[0]), "message": "Task already exists (identical configuration)."}

            # 3. Create fresh task
            task_id = f"task_{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            next_run = self._compute_next_run(schedule)
            meta = config_dict or {}
            if target:
                meta["target"] = target

            db.safe_execute(
                """
                INSERT INTO scheduled_tasks (
                    id, name, description, type, prompt, schedule, timezone,
                    status, enabled, created_at, updated_at, next_run_at,
                    last_run_at, last_run_status, run_count, failure_count,
                    fingerprint, idempotency_key, created_by, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task_id,
                    name.strip(),
                    meta.get("description", ""),
                    task_type.strip().upper(),
                    prompt.strip(),
                    schedule.strip(),
                    tz,
                    "ACTIVE",
                    1,
                    now_iso,
                    now_iso,
                    next_run,
                    None,
                    "IDLE",
                    0,
                    0,
                    fp,
                    idempotency_key or f"idem_{task_id}",
                    created_by,
                    json.dumps(meta),
                )
            )

            row_new = db.safe_query("SELECT * FROM scheduled_tasks WHERE id = ?", (task_id,))
            logger.info("[SCHEDULER][TASK_CREATED] Successfully created task %s (%s)", task_id, name)
            return {"created": True, "task": self._row_to_task_dict(row_new[0]), "message": "Task created successfully."}

    def get_tasks(self) -> List[Dict[str, Any]]:
        """Returns all scheduled tasks, keeping next_run_at fresh."""
        with self._lock:
            rows = db.safe_query("SELECT * FROM scheduled_tasks ORDER BY created_at ASC") or []
            tasks = []
            for r in rows:
                t = self._row_to_task_dict(r)
                if t["enabled"] and t["status"] == "ACTIVE":
                    t["nextRunAt"] = self._compute_next_run(t["schedule"])
                tasks.append(t)
            return tasks

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            rows = db.safe_query("SELECT * FROM scheduled_tasks WHERE id = ?", (task_id,))
            if not rows:
                return None
            t = self._row_to_task_dict(rows[0])
            if t["enabled"] and t["status"] == "ACTIVE":
                t["nextRunAt"] = self._compute_next_run(t["schedule"])
            return t

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            existing = self.get_task(task_id)
            if not existing:
                return None

            name = updates.get("name", existing["name"]).strip()
            schedule = updates.get("schedule", existing["schedule"]).strip()
            prompt = updates.get("prompt", existing["prompt"]).strip()
            timezone_str = updates.get("timezone", existing["timezone"]).strip()
            enabled = bool(updates.get("enabled", existing["enabled"]))
            status = updates.get("status", "ACTIVE" if enabled else "PAUSED")
            meta = updates.get("metadata", existing.get("metadata", {}))

            fp = compute_task_fingerprint(
                task_type=existing["type"],
                prompt=prompt,
                schedule=schedule,
                timezone_str=timezone_str,
                target=meta.get("target", ""),
                config_dict=meta,
            )
            next_run = self._compute_next_run(schedule) if enabled else None
            now_iso = datetime.now(timezone.utc).isoformat()

            db.safe_execute(
                """
                UPDATE scheduled_tasks SET
                    name = ?, schedule = ?, prompt = ?, timezone = ?,
                    enabled = ?, status = ?, fingerprint = ?, next_run_at = ?,
                    metadata_json = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    name,
                    schedule,
                    prompt,
                    timezone_str,
                    1 if enabled else 0,
                    status,
                    fp,
                    next_run,
                    json.dumps(meta),
                    now_iso,
                    task_id,
                )
            )

            # If this task is also a checkpoint, update checkpoint table
            if task_id in self._checkpoints:
                self.update_checkpoint_config(
                    checkpoint_id=task_id,
                    scheduled_time=schedule,
                    is_enabled=enabled,
                    tz_name=timezone_str,
                )

            return self.get_task(task_id)

    def delete_task(self, task_id: str) -> bool:
        with self._lock:
            # Checkpoint tasks are system defaults; disable instead of removing entirely if system task
            if task_id in DEFAULT_CHECKPOINTS:
                self.pause_task(task_id)
                return True

            res = db.safe_execute("DELETE FROM scheduled_tasks WHERE id = ?", (task_id,))
            logger.info("[SCHEDULER][TASK_DELETED] Deleted task %s", task_id)
            return bool(res)

    def pause_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.update_task(task_id, {"enabled": False, "status": "PAUSED"})

    def resume_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.update_task(task_id, {"enabled": True, "status": "ACTIVE"})

    def run_task_now(self, task_id: str, execution_mode: str = "PAPER") -> Dict[str, Any]:
        """Executes task immediately with durable run lock and scheduledRunId."""
        task = self.get_task(task_id)
        if not task:
            raise ValueError(f"Task '{task_id}' not found.")

        now_utc = datetime.now(timezone.utc)
        scheduled_run_id = f"{task_id}:{now_utc.strftime('%Y%m%dT%H%M%SZ')}"
        logger.info("[SCHEDULER][RUN_NOW] Initiating execution for taskId=%s scheduledRunId=%s", task_id, scheduled_run_id)

        # Acquire lock to prevent overlapping runs
        lock_id = DurableLockManager.acquire_lock(
            routine_id=f"TASK_{task_id}",
            strategy_id="ALL",
            broker="PAPER",
            account_id="DEFAULT",
            mode=execution_mode,
            timeout_seconds=180,
        )

        if not lock_id:
            logger.warning("[SCHEDULER][RUN_NOW] Execution blocked: Task %s is already locked/running.", task_id)
            return {
                "status": "error",
                "message": f"Task {task_id} is already currently running or locked by another worker.",
                "scheduledRunId": scheduled_run_id,
            }

        try:
            # Update task status to RUNNING
            db.safe_execute("UPDATE scheduled_tasks SET status = 'RUNNING' WHERE id = ?", (task_id,))

            # Execute via authoritative Workflow Engine or Checkpoint Runner
            if task_id in self._checkpoints:
                res = global_workflow_engine.trigger_checkpoint_execution(
                    checkpoint_id=task_id,
                    trigger_type="MANUAL",
                    execution_mode=execution_mode,
                )
            else:
                res = global_workflow_engine.trigger_checkpoint_execution(
                    checkpoint_id="MARKET_OPEN_SCAN",
                    trigger_type="MANUAL",
                    execution_mode=execution_mode,
                )

            # Update run metrics
            now_iso = datetime.now(timezone.utc).isoformat()
            db.safe_execute(
                """
                UPDATE scheduled_tasks SET
                    status = 'ACTIVE',
                    last_run_at = ?,
                    last_run_status = 'SUCCESS',
                    run_count = run_count + 1,
                    updated_at = ?
                WHERE id = ?
                """,
                (now_iso, now_iso, task_id)
            )

            return {
                "status": "success",
                "taskId": task_id,
                "scheduledRunId": scheduled_run_id,
                "result": res,
            }
        except Exception as e:
            now_iso = datetime.now(timezone.utc).isoformat()
            db.safe_execute(
                """
                UPDATE scheduled_tasks SET
                    status = 'FAILED',
                    last_run_at = ?,
                    last_run_status = 'FAILED',
                    failure_count = failure_count + 1,
                    updated_at = ?
                WHERE id = ?
                """,
                (now_iso, now_iso, task_id)
            )
            self._recent_errors.append(f"Task {task_id} execution failed: {e}")
            logger.error("[SCHEDULER][RUN_FAILED] Task %s execution failed: %s", task_id, e)
            raise e
        finally:
            DurableLockManager.release_lock(lock_id)

    def get_scheduler_state(self) -> Dict[str, Any]:
        """Returns single authoritative SchedulerState for frontend and API."""
        with self._lock:
            tasks = self.get_tasks()
            recent_runs = db.safe_query("SELECT * FROM orchestrator_workflow_runs ORDER BY started_at DESC LIMIT 20") or []
            jobs_list = [dict(r) for r in recent_runs]

            running_jobs_count = len([j for j in jobs_list if j.get("status") == "RUNNING"])
            failed_jobs_count = len([j for j in jobs_list if j.get("status") == "FAILED"])
            paused_tasks_count = len([t for t in tasks if t.get("status") == "PAUSED" or not t.get("enabled")])

            active_next_runs = [t["nextRunAt"] for t in tasks if t.get("nextRunAt")]
            earliest_next_run = min(active_next_runs) if active_next_runs else None

            last_runs = [t["lastRunAt"] for t in tasks if t.get("lastRunAt")]
            latest_last_run = max(last_runs) if last_runs else None

            worker_healthy = self._is_running and (self._thread is not None and self._thread.is_alive())

            return {
                "schedulerStatus": "ACTIVE" if self._is_running else "STOPPED",
                "tasks": tasks,
                "jobs": jobs_list,
                "nextRun": earliest_next_run,
                "lastRun": latest_last_run,
                "runningJobs": running_jobs_count,
                "failedJobs": failed_jobs_count,
                "pausedJobs": paused_tasks_count,
                "timezone": self.tz_name,
                "health": "HEALTHY" if worker_healthy else ("DEGRADED" if self._is_running else "OFFLINE"),
                "worker": "HEALTHY" if worker_healthy else "OFFLINE",
                "errors": self._recent_errors[-10:],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def _row_to_task_dict(self, row: Any) -> Dict[str, Any]:
        r = dict(row)
        meta = {}
        try:
            if r.get("metadata_json"):
                meta = json.loads(r["metadata_json"])
        except Exception:
            pass

        return {
            "id": r["id"],
            "name": r["name"],
            "description": r.get("description", ""),
            "type": r.get("type", "AI_WORKFLOW"),
            "prompt": r.get("prompt", ""),
            "schedule": r["schedule"],
            "timezone": r.get("timezone", self.tz_name),
            "status": r.get("status", "ACTIVE"),
            "enabled": bool(r.get("enabled", 1)),
            "createdAt": r.get("created_at", ""),
            "updatedAt": r.get("updated_at", ""),
            "nextRunAt": r.get("next_run_at"),
            "lastRunAt": r.get("last_run_at"),
            "lastRunStatus": r.get("last_run_status", "IDLE"),
            "runCount": int(r.get("run_count", 0)),
            "failureCount": int(r.get("failure_count", 0)),
            "fingerprint": r.get("fingerprint", ""),
            "idempotencyKey": r.get("idempotency_key"),
            "createdBy": r.get("created_by", "SYSTEM"),
            "metadata": meta,
        }

    # =========================================================================
    # LIFECYCLE & EXECUTION LOOP
    # =========================================================================

    def trigger_checkpoint_manually(self, checkpoint_id: str, execution_mode: str = "PAPER") -> Dict[str, Any]:
        """Manually runs a checkpoint out-of-schedule."""
        return self.run_task_now(task_id=checkpoint_id, execution_mode=execution_mode)

    def start(self) -> None:
        with self._lock:
            if self._is_running and self._thread is not None and self._thread.is_alive():
                return
            self._is_running = True
            self._thread = threading.Thread(target=self._scheduler_loop, name="TradingSchedulerLoop", daemon=True)
            self._thread.start()
            logger.info("[SCHEDULER] Trading Scheduler started in timezone %s", self.tz_name)

    def stop(self) -> None:
        with self._lock:
            self._is_running = False
            logger.info("[SCHEDULER] Trading Scheduler stopped.")

    def _scheduler_loop(self) -> None:
        while self._is_running:
            try:
                now_local = datetime.now(self.tz)
                current_time_str = now_local.strftime("%H:%M")
                minute_key = now_local.strftime("%Y-%m-%d %H:%M")

                if self._last_checked_minute != minute_key:
                    self._last_checked_minute = minute_key

                    # Check both checkpoints and any active custom tasks
                    with self._lock:
                        tasks_to_check = self.get_tasks()

                    for task in tasks_to_check:
                        if task["enabled"] and task["status"] == "ACTIVE" and task["schedule"] == current_time_str:
                            logger.info("[SCHEDULER] Scheduled minute match: firing task %s at %s", task["id"], current_time_str)
                            threading.Thread(
                                target=self.run_task_now,
                                args=(task["id"], "PAPER"),
                                daemon=True,
                            ).start()

            except Exception as e:
                logger.error("[SCHEDULER_LOOP_ERROR] Error in scheduler loop: %s", e)
                self._recent_errors.append(f"Scheduler loop error: {e}")

            time.sleep(1.0)


global_trading_scheduler = TradingScheduler()
