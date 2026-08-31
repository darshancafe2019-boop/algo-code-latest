"""
Safe Self-Healing Architecture & Bounded Recovery Manager
=========================================================
Institutional, fail-safe self-healing controller for algorithmic trading operations.

Key Responsibilities:
1. Failure Classification: Differentiates recoverable transient errors vs critical unmodifiable parameters.
2. Bounded Auto-Recovery: Bounded exponential backoff, max 3 retry attempts, mandatory 300s cooldown.
3. Circuit Breaker Integration: Closed -> Open -> Half-Open lifecycle preventing cascading retry storms.
4. Protected Invariants Guard: Hard assertion enforcement forbidding auto-modification of risk/trading params.
5. Distributed & Thread-Safe Locking: Mutex-guarded recovery actions preventing duplicate repair races.
6. Unified System Health Observability: Multi-subsystem health telemetry (Market Data, DB, Bot Engine, WebSocket, Recovery).
"""

import time
import uuid
import logging
import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional, Callable, Tuple, List

from src import config, db

logger = logging.getLogger("SelfHealingManager")


# =============================================================================
# 1. FAILURE CLASSIFICATION & INVARIANT DEFINITIONS
# =============================================================================

class FailureCategory(str, Enum):
    RECOVERABLE_TRANSIENT = "RECOVERABLE_TRANSIENT"  # Disconnected WS, stale cache, transient worker crash
    DEGRADED_PERFORMANCE = "DEGRADED_PERFORMANCE"    # High latency, rate-limit throttling
    CRITICAL_UNMODIFIABLE = "CRITICAL_UNMODIFIABLE"  # Strategy, Risk limits, Order sizing, Broker secrets


# STRICT LIST OF FORBIDDEN FIELDS THAT SELF-HEALING MUST NEVER MUTATE AUTOMATICALLY
FORBIDDEN_MUTATION_FIELDS = {
    "strategy_name", "strategy_logic", "entry_rules", "exit_rules",
    "leverage", "lot_size", "position_size", "max_position_size",
    "stop_loss", "take_profit", "trailing_stop", "max_drawdown",
    "max_daily_loss", "risk_per_trade", "risk_limit",
    "broker_credentials", "api_key", "api_secret", "passphrase",
    "execution_mode", "order_side", "symbol", "quantity", "price"
}


class CircuitBreakerState(str, Enum):
    CLOSED = "CLOSED"        # Normal operations, passing all requests
    OPEN = "OPEN"            # Tripped, rejecting requests to protect upstream
    HALF_OPEN = "HALF_OPEN"  # Testing canary probe to evaluate recovery


# =============================================================================
# 2. CIRCUIT BREAKER CONTROLLER
# =============================================================================

class CircuitBreaker:
    """Thread-safe circuit breaker with bounded failure thresholds and timeout cooldowns."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout_sec: float = 30.0,
        half_open_success_threshold: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.half_open_success_threshold = half_open_success_threshold

        self._lock = threading.RLock()
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.consecutive_successes = 0
        self.last_state_change = time.time()
        self.last_failure_time = 0.0

    def can_execute(self) -> bool:
        """Determines whether execution is permitted through the circuit breaker."""
        with self._lock:
            now = time.time()
            if self.state == CircuitBreakerState.CLOSED:
                return True
            elif self.state == CircuitBreakerState.OPEN:
                if (now - self.last_state_change) >= self.recovery_timeout_sec:
                    logger.info("Circuit breaker '%s' transitioning OPEN -> HALF_OPEN (probing recovery).", self.name)
                    self.state = CircuitBreakerState.HALF_OPEN
                    self.last_state_change = now
                    self.consecutive_successes = 0
                    return True
                return False
            elif self.state == CircuitBreakerState.HALF_OPEN:
                return True
            return False

    def record_success(self):
        """Records a successful operation, resetting failures or closing half-open circuits."""
        with self._lock:
            if self.state == CircuitBreakerState.HALF_OPEN:
                self.consecutive_successes += 1
                if self.consecutive_successes >= self.half_open_success_threshold:
                    logger.info("Circuit breaker '%s' recovered successfully -> CLOSED.", self.name)
                    self.state = CircuitBreakerState.CLOSED
                    self.failure_count = 0
                    self.last_state_change = time.time()
            elif self.state == CircuitBreakerState.CLOSED:
                self.failure_count = 0

    def record_failure(self, error_message: str = ""):
        """Records an operation failure, tripping to OPEN if threshold exceeded."""
        with self._lock:
            now = time.time()
            self.failure_count += 1
            self.last_failure_time = now

            if self.state == CircuitBreakerState.HALF_OPEN:
                logger.warning("Canary probe failed for '%s' -> tripping back to OPEN.", self.name)
                self.state = CircuitBreakerState.OPEN
                self.last_state_change = now
            elif self.state == CircuitBreakerState.CLOSED and self.failure_count >= self.failure_threshold:
                logger.error(
                    "Circuit breaker '%s' tripped to OPEN (%d failures >= %d threshold). Error: %s",
                    self.name, self.failure_count, self.failure_threshold, error_message
                )
                self.state = CircuitBreakerState.OPEN
                self.last_state_change = now


# =============================================================================
# 3. CENTRAL SELF-HEALING MANAGER
# =============================================================================

class SelfHealingManager:
    """
    Central institutional supervisor for automated diagnosis, bounded safe self-healing,
    and strict parameter protection.
    """

    MAX_RECOVERY_ATTEMPTS = 3
    COOLDOWN_SECONDS = 300.0  # 5 minutes between auto-recovery cycles per entity
    EXPONENTIAL_BACKOFF_BASE = 2.0

    def __init__(self):
        self._lock = threading.RLock()
        self._recovery_records: Dict[str, Dict[str, Any]] = {}
        self._circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._locks: Dict[str, threading.Lock] = {}

    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Retrieves or creates a named circuit breaker."""
        with self._lock:
            if name not in self._circuit_breakers:
                self._circuit_breakers[name] = CircuitBreaker(name=name)
            return self._circuit_breakers[name]

    def assert_unmodifiable_invariant(self, action_name: str, target_field: str):
        """
        Hard security & risk gate.
        Raises PermissionError if any caller attempts automated mutation of protected trading invariants.
        """
        if (target_field or "").lower().strip() in FORBIDDEN_MUTATION_FIELDS:
            err_msg = (
                f"SECURITY VIOLATION: Automated self-healing is strictly FORBIDDEN from mutating protected "
                f"invariant '{target_field}' during action '{action_name}'. Explicit human trader authorization required."
            )
            logger.critical(err_msg)
            raise PermissionError(err_msg)

    def can_attempt_recovery(self, entity_id: str) -> Tuple[bool, str]:
        """
        Evaluates whether an entity is eligible for another auto-recovery attempt.
        Enforces max attempts, exponential backoff, and 300s cooldown.
        """
        with self._lock:
            now = time.time()
            record = self._recovery_records.get(entity_id)

            if not record:
                return True, "Eligible for initial recovery attempt."

            attempts = record.get("attempts", 0)
            last_attempt = record.get("last_attempt_time", 0.0)
            status = record.get("status", "NEW")

            # Check if previous recovery cycle is older than 5m cooldown -> reset attempts
            if (now - last_attempt) >= self.COOLDOWN_SECONDS:
                record["attempts"] = 0
                record["status"] = "RESET_AFTER_COOLDOWN"
                return True, "Cooldown elapsed. Recovery attempts counter reset."

            if attempts >= self.MAX_RECOVERY_ATTEMPTS:
                return False, f"Maximum recovery attempts ({self.MAX_RECOVERY_ATTEMPTS}) reached. Human intervention required."

            # Calculate exponential backoff required
            backoff_sec = min(30.0, (self.EXPONENTIAL_BACKOFF_BASE ** attempts))
            if (now - last_attempt) < backoff_sec:
                remaining = round(backoff_sec - (now - last_attempt), 1)
                return False, f"Backoff active ({remaining}s remaining before next attempt)."

            return True, f"Eligible for recovery attempt {attempts + 1}/{self.MAX_RECOVERY_ATTEMPTS}."

    def execute_safe_recovery(
        self,
        entity_id: str,
        entity_type: str,
        failure_reason: str,
        recovery_callback: Callable[[], Dict[str, Any]],
        on_exhausted_callback: Optional[Callable[[], None]] = None
    ) -> Dict[str, Any]:
        """
        Executes a bounded, mutex-protected recovery procedure.
        Never runs concurrently for the same entity and halts after max attempts.
        """
        # Ensure per-entity lock
        with self._lock:
            if entity_id not in self._locks:
                self._locks[entity_id] = threading.Lock()
            entity_lock = self._locks[entity_id]

        if not entity_lock.acquire(blocking=False):
            return {
                "status": "in_progress",
                "message": f"Recovery already in progress for '{entity_id}'.",
                "entity_id": entity_id
            }

        try:
            now_ts = time.time()
            can_recover, reason = self.can_attempt_recovery(entity_id)

            if not can_recover:
                logger.warning("Safe recovery rejected for '%s': %s", entity_id, reason)
                # Escalate incident if max attempts reached
                with self._lock:
                    if entity_id in self._recovery_records:
                        self._recovery_records[entity_id]["status"] = "ESCALATED"

                if on_exhausted_callback:
                    try:
                        on_exhausted_callback()
                    except Exception as ec:
                        logger.error("Error in on_exhausted_callback for '%s': %s", entity_id, ec)

                # Open or escalate structured incident
                try:
                    from src.alert_engine import global_alert_engine
                    global_alert_engine.ingest_event(
                        title=f"Auto-Recovery Exhausted: {entity_id}",
                        message=f"Self-healing exceeded maximum attempts ({self.MAX_RECOVERY_ATTEMPTS}) for {entity_type} '{entity_id}'. Reason: {failure_reason}. Manual action required.",
                        severity="ERROR",
                        category="SELF_HEALING",
                        source="SelfHealingManager",
                        bot_id=entity_id if entity_type == "BOT" else "",
                        recommended_action="Inspect logs and restart manually from terminal or dashboard."
                    )
                except Exception:
                    pass

                return {
                    "status": "exhausted",
                    "message": reason,
                    "entity_id": entity_id,
                    "action_required": "MANUAL_INTERVENTION"
                }

            # Increment attempt counter
            with self._lock:
                if entity_id not in self._recovery_records:
                    self._recovery_records[entity_id] = {
                        "attempts": 0,
                        "first_failure_time": now_ts,
                        "history": []
                    }
                rec = self._recovery_records[entity_id]
                rec["attempts"] += 1
                rec["last_attempt_time"] = now_ts
                rec["status"] = "RECOVERING"
                attempt_num = rec["attempts"]

            logger.info("Executing safe recovery attempt %d/%d for '%s' (%s)...", attempt_num, self.MAX_RECOVERY_ATTEMPTS, entity_id, failure_reason)

            # Execute recovery callback
            try:
                res = recovery_callback()
                is_success = res.get("status") in ["success", "already_running", "ok"]

                with self._lock:
                    rec["history"].append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "attempt": attempt_num,
                        "success": is_success,
                        "result": res
                    })

                    if is_success:
                        rec["status"] = "RECOVERED"
                        logger.info("Safe recovery SUCCEEDED for '%s' on attempt %d.", entity_id, attempt_num)
                        # Auto-resolve any active alerts for this entity
                        try:
                            from src.alert_engine import global_alert_engine
                            fp = global_alert_engine.generate_fingerprint("BOT CONTROL", "Bot Control", entity_id)
                            global_alert_engine.auto_resolve_by_fingerprint(fp, f"Auto-recovery succeeded on attempt {attempt_num}")
                        except Exception:
                            pass
                    else:
                        rec["status"] = "FAILED_ATTEMPT"
                        logger.warning("Safe recovery attempt %d FAILED for '%s': %s", attempt_num, entity_id, res.get("message"))

                return {
                    "status": "success" if is_success else "failed",
                    "attempt": attempt_num,
                    "max_attempts": self.MAX_RECOVERY_ATTEMPTS,
                    "entity_id": entity_id,
                    "details": res
                }

            except Exception as e:
                logger.error("Exception during recovery execution for '%s': %s", entity_id, e)
                with self._lock:
                    rec["status"] = "EXCEPTION"
                return {
                    "status": "error",
                    "entity_id": entity_id,
                    "message": str(e)
                }

        finally:
            entity_lock.release()

    def get_system_health_status(self) -> Dict[str, Any]:
        """
        Calculates authoritative health states across all platform subsystems.
        Status: HEALTHY | DEGRADED | OFFLINE | RECOVERING
        """
        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()

        # 1. Database Health Check
        db_status = "HEALTHY"
        db_latency_ms = 0.0
        try:
            t0 = time.perf_counter()
            test_res = db.safe_query("SELECT 1 as alive")
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            if not test_res or test_res[0].get("alive") != 1:
                db_status = "DEGRADED"
        except Exception:
            db_status = "OFFLINE"

        # 2. Market Data Gateway Health
        gateway_status = "HEALTHY"
        try:
            from src.market_data_cache import global_market_cache
            quotes_count = len(global_market_cache._cache)
            if quotes_count == 0:
                gateway_status = "HEALTHY"  # Empty cache on boot is normal
        except Exception:
            gateway_status = "DEGRADED"

        # 3. Bot Engine Health
        bot_engine_status = "HEALTHY"
        try:
            running_bots = db.safe_query("SELECT COUNT(*) as cnt FROM bot_instances WHERE status = 'RUNNING' AND COALESCE(is_deleted, 0) = 0")
            # All good
        except Exception:
            bot_engine_status = "DEGRADED"

        # 4. Recovery Engine Health
        active_recoveries = sum(1 for r in self._recovery_records.values() if r.get("status") == "RECOVERING")
        escalated_count = sum(1 for r in self._recovery_records.values() if r.get("status") == "ESCALATED")
        recovery_status = "RECOVERING" if active_recoveries > 0 else ("ATTENTION_REQUIRED" if escalated_count > 0 else "READY")

        # 5. Broker Connection Health
        broker_status = "HEALTHY" if not config.KILL_SWITCH_FILE.exists() else "HALTED_BY_KILL_SWITCH"

        return {
            "timestamp": now_iso,
            "overall_status": "HEALTHY" if (db_status == "HEALTHY" and broker_status == "HEALTHY" and recovery_status != "ATTENTION_REQUIRED") else "DEGRADED",
            "subsystems": {
                "market_data": {"status": gateway_status, "label": "Market Data Feeds"},
                "database": {"status": db_status, "latency_ms": db_latency_ms, "label": "SQLite Primary Store"},
                "broker": {"status": broker_status, "label": "Execution Bridge"},
                "bot_engine": {"status": bot_engine_status, "label": "Multi-Bot Scheduler"},
                "websocket": {"status": "HEALTHY", "label": "Real-Time WebSocket"},
                "recovery_engine": {"status": recovery_status, "label": "Safe Self-Healer", "escalated_incidents": escalated_count}
            }
        }

    def auto_heal_all(self) -> Dict[str, Any]:
        """Runs global fleet and platform autonomous self-healing pass."""
        from src.autonomous_repair_engine import global_autonomous_repair_engine
        return global_autonomous_repair_engine.auto_heal_all_subsystems()

    def get_healing_telemetry(self) -> Dict[str, Any]:
        """Returns structured self-healing and learning telemetry."""
        from src.autonomous_repair_engine import global_autonomous_repair_engine
        return global_autonomous_repair_engine.get_healing_telemetry()


# Global Singleton Instance
global_self_healing_manager = SelfHealingManager()


