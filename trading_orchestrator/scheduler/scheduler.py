"""
Timezone-Aware Trading Checkpoint Scheduler
===========================================
Schedules and triggers automated trading checkpoints using configurable times in Asia/Kolkata timezone.
Supports per-checkpoint enable/disable toggles, next-run computations, and manual triggers.
"""

from __future__ import annotations

import pytz
import time
import logging
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta, time as dtime

from src import db
from trading_orchestrator.scheduler.checkpoints import DEFAULT_CHECKPOINTS, CheckpointConfig, CheckpointType
from trading_orchestrator.workflow.workflow_engine import global_workflow_engine

logger = logging.getLogger("TradingScheduler")


class TradingScheduler:
    """Manages scheduled daily checkpoint runs."""

    def __init__(self, timezone_name: str = "Asia/Kolkata", timezone_str: Optional[str] = None):
        self.tz_name = timezone_str or timezone_name
        self.tz = pytz.timezone(self.tz_name)
        self._lock = threading.RLock()
        self._is_running = False
        self._thread: Optional[threading.Thread] = None
        self._last_checked_minute: Optional[str] = None
        self._checkpoints: Dict[str, CheckpointConfig] = {}
        self._init_checkpoints()

    @property
    def timezone_str(self) -> str:
        return self.tz_name

    @property
    def checkpoints(self) -> Dict[str, CheckpointConfig]:
        return self._checkpoints

    def get_schedule_status(self) -> Dict[str, Any]:
        return {
            "timezone": self.tz_name,
            "checkpoints": self.get_checkpoints_status(),
        }

    def _init_checkpoints(self) -> None:
        """Initializes or loads checkpoint configurations from SQLite."""
        with self._lock:
            # Seed default checkpoints into DB if not present
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

    def _compute_next_run(self, scheduled_time_str: str) -> str:
        """Calculates ISO timestamp of the next occurrence of scheduled_time (HH:MM) in local timezone."""
        now_local = datetime.now(self.tz)
        try:
            hour, minute = map(int, scheduled_time_str.split(":"))
            target_time = dtime(hour, minute)
            target_dt = self.tz.localize(datetime.combine(now_local.date(), target_time))
            if target_dt <= now_local:
                target_dt += timedelta(days=1)
            return target_dt.isoformat()
        except Exception:
            return (now_local + timedelta(hours=1)).isoformat()

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
            cp_key = checkpoint_id.value if hasattr(checkpoint_id, "value") else str(checkpoint_id)
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

            return True


    def trigger_checkpoint_manually(self, checkpoint_id: str, execution_mode: str = "PAPER") -> Dict[str, Any]:
        """Manually runs a checkpoint out-of-schedule."""
        logger.info("[SCHEDULER] Manually triggering checkpoint %s in mode %s", checkpoint_id, execution_mode)
        return global_workflow_engine.trigger_checkpoint_execution(
            checkpoint_id=checkpoint_id,
            trigger_type="MANUAL",
            execution_mode=execution_mode,
        )

    def start(self) -> None:
        with self._lock:
            if self._is_running:
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

                    with self._lock:
                        cps_copy = list(self._checkpoints.values())

                    for cp in cps_copy:
                        if cp.is_enabled and cp.scheduled_time == current_time_str:
                            logger.info("[SCHEDULER] Scheduled minute match: firing checkpoint %s at %s", cp.checkpoint_id, current_time_str)
                            # Execute checkpoint in background thread to keep scheduler loop responsive
                            threading.Thread(
                                target=global_workflow_engine.trigger_checkpoint_execution,
                                args=(cp.checkpoint_id, "SCHEDULED", "PAPER"),
                                daemon=True,
                            ).start()

            except Exception as e:
                logger.error("[SCHEDULER_LOOP_ERROR] Error in scheduler loop: %s", e)

            time.sleep(1.0)


global_trading_scheduler = TradingScheduler()
