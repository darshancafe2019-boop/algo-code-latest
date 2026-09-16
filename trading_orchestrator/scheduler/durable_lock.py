"""
Durable Distributed Lock for Trading Orchestrator
================================================
Prevents overlapping runs for the same (routine, strategy, broker, account, mode).
Database-backed with expiration timeout and PID tracking.
"""

from __future__ import annotations

import os
import hashlib
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

from src import db
from trading_orchestrator.db_init import init_orchestrator_tables

logger = logging.getLogger("DurableLock")


class DurableLockManager:
    """Provides atomic acquisition and release of durable orchestrator locks."""

    @staticmethod
    def compute_lock_id(
        routine_id: str,
        strategy_id: str,
        broker: str,
        account_id: str,
        mode: str,
    ) -> str:
        raw = f"{routine_id}:{strategy_id}:{broker}:{account_id}:{mode}".upper()
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    @classmethod
    def acquire_lock(
        cls,
        routine_id: str,
        strategy_id: str = "ALL",
        broker: str = "PAPER",
        account_id: str = "DEFAULT",
        mode: str = "PAPER",
        timeout_seconds: int = 120,
    ) -> Optional[str]:
        """
        Attempts to acquire a durable lock.
        Returns lock_id if acquired successfully, None if already locked.
        """
        init_orchestrator_tables()
        lock_id = cls.compute_lock_id(routine_id, strategy_id, broker, account_id, mode)
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        expires_iso = (now + timedelta(seconds=timeout_seconds)).isoformat()
        pid = os.getpid()

        # Clean expired locks first
        try:
            db.safe_execute(
                "DELETE FROM orchestrator_locks WHERE expires_at < ?",
                (now_iso,)
            )
        except Exception:
            pass

        # Check if already locked
        existing = db.safe_query(
            "SELECT lock_id FROM orchestrator_locks WHERE lock_id = ? AND expires_at >= ?",
            (lock_id, now_iso)
        )
        if existing:
            logger.warning("[LOCK_BLOCKED] Lock %s already active for %s. Overlapping run prevented.", lock_id, routine_id)
            return None

        # Attempt insert
        try:
            res = db.safe_execute(
                """
                INSERT INTO orchestrator_locks (
                    lock_id, routine_id, strategy_id, broker, account_id, mode,
                    acquired_at, expires_at, holder_pid
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lock_id, routine_id, strategy_id, broker, account_id, mode,
                    now_iso, expires_iso, pid
                )
            )
            if res:
                logger.info("[LOCK_ACQUIRED] Lock %s acquired for %s (%s/%s/%s)", lock_id, routine_id, broker, account_id, mode)
                return lock_id
        except Exception as e:
            logger.warning("[LOCK_CONFLICT] Lock %s conflict for %s: %s", lock_id, routine_id, e)

        return None

    @classmethod
    def release_lock(cls, lock_id: str) -> bool:
        """Releases the specified lock."""
        if not lock_id:
            return False
        res = db.safe_execute(
            "DELETE FROM orchestrator_locks WHERE lock_id = ?",
            (lock_id,)
        )
        logger.info("[LOCK_RELEASED] Lock %s released.", lock_id)
        return bool(res)

    @classmethod
    def is_locked(
        cls,
        routine_id: str,
        strategy_id: str = "ALL",
        broker: str = "PAPER",
        account_id: str = "DEFAULT",
        mode: str = "PAPER",
    ) -> bool:
        lock_id = cls.compute_lock_id(routine_id, strategy_id, broker, account_id, mode)
        now_iso = datetime.now(timezone.utc).isoformat()
        rows = db.safe_query(
            "SELECT lock_id FROM orchestrator_locks WHERE lock_id = ? AND expires_at >= ?",
            (lock_id, now_iso)
        )
        return bool(rows)
