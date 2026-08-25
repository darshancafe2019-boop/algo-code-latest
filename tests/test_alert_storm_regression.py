"""
Alert Storm & Safe Self-Healing Automated Regression Test Suite
===============================================================
Permanent automated regression tests verifying:
- Test A: Single routine lifecycle event does NOT create incidents.
- Test B: 1,000 rapid identical failures are deduplicated into exactly 1 parent incident with occurrence_count 1000.
- Test C: Bot commands (START, STOP) are strictly idempotent (return already_running / already_stopped).
- Test D: Self-healing engine enforces bounded recovery (max 3 attempts, cooldown, escalation).
- Test E: Protected invariants gate strictly forbids auto-modification of risk/strategy parameters.
"""

import time
import pytest
from src import config, db
from src.audit import log_notification
from src.alert_engine import global_alert_engine, SEVERITY_ERROR, SEVERITY_INFO
from src.self_healing_manager import global_self_healing_manager, CircuitBreakerState


class TestAlertStormDeduplication:
    """Validates that routine events do not create incidents and storming events are grouped."""

    def test_single_lifecycle_event_does_not_create_incident(self):
        """Test A: Normal bot start/stop/pause INFO notifications must NOT create records in incidents table."""
        # Query count of incidents before
        rows_before = db.safe_query("SELECT COUNT(*) as cnt FROM incidents WHERE COALESCE(is_test, 0) = 0")
        cnt_before = rows_before[0]["cnt"] if rows_before else 0

        # Emit normal lifecycle notifications
        log_notification("INFO", "Bot Control", "Bot bot-test-lifecycle-1 started (PID 12345).", bot_id="bot-test-lifecycle-1")
        log_notification("INFO", "Bot Control", "Bot bot-test-lifecycle-1 execution paused.", bot_id="bot-test-lifecycle-1")
        log_notification("INFO", "Bot Control", "Bot bot-test-lifecycle-1 execution resumed.", bot_id="bot-test-lifecycle-1")
        log_notification("INFO", "Bot Control", "Bot bot-test-lifecycle-1 stopped.", bot_id="bot-test-lifecycle-1")

        rows_after = db.safe_query("SELECT COUNT(*) as cnt FROM incidents WHERE COALESCE(is_test, 0) = 0")
        cnt_after = rows_after[0]["cnt"] if rows_after else 0

        # Incidents table count must remain completely unchanged
        assert cnt_after == cnt_before, f"Lifecycle events incorrectly created {cnt_after - cnt_before} incident(s) in incidents table!"

    def test_1000_rapid_failures_deduplicated_to_single_incident(self):
        """Test B: 1,000 rapid identical failure events must result in exactly 1 incident with occurrence_count 1000."""
        bot_id = f"test-storm-bot-{time.time()}"
        error_code = "ERR_FEED_TIMEOUT_TEST"
        title = "Feed Connection Timeout"
        message = "Market data websocket feed timed out after 5000ms"

        # Unique test fingerprint
        fp = global_alert_engine.generate_fingerprint(
            category="MARKET_DATA",
            source="MarketGateway",
            entity_id=bot_id,
            error_code=error_code,
            event_type=title
        )

        # Ingest 1,000 events rapidly
        first_res = None
        for i in range(1000):
            res = global_alert_engine.ingest_event(
                title=title,
                message=message,
                severity=SEVERITY_ERROR,
                category="MARKET_DATA",
                source="MarketGateway",
                bot_id=bot_id,
                error_code=error_code,
                is_test=True
            )
            if i == 0:
                first_res = res

        # 1. Assert first event opened incident, subsequent were dedup increments
        assert first_res["action"] == "INCIDENT_OPENED"
        inc_id = first_res["incident_id"]

        # 2. Fetch the incident from SQLite database
        inc_rows = db.safe_query("SELECT * FROM incidents WHERE incident_id = ?", (inc_id,))
        assert len(inc_rows) == 1, f"Expected exactly 1 incident record for ID {inc_id}, got {len(inc_rows)}"

        inc = dict(inc_rows[0])
        assert inc["occurrence_count"] == 1000, f"Expected occurrence_count == 1000, got {inc['occurrence_count']}"
        assert inc["severity"] == SEVERITY_ERROR
        assert "[ALERT STORM]" in inc["title"]

        # 3. Assert rate-limiting prevented 1000 child alerts in alerts table
        alert_rows = db.safe_query("SELECT COUNT(*) as cnt FROM alerts WHERE incident_id = ?", (inc_id,))
        child_alert_count = alert_rows[0]["cnt"]
        assert child_alert_count < 100, f"Child alerts were not rate-limited! Found {child_alert_count} rows in alerts table."

        # Clean up test incident
        db.safe_execute("DELETE FROM alerts WHERE incident_id = ?", (inc_id,))
        db.safe_execute("DELETE FROM incidents WHERE incident_id = ?", (inc_id,))


class TestBotCommandIdempotency:
    """Validates that bot start/stop/pause commands return idempotent envelopes without side effects."""

    def test_start_and_stop_bot_idempotency(self):
        """Test C: Repeated START/STOP commands must return already_running / already_stopped without extra processes."""
        from src.process_manager import BotProcessManager

        bot_id = "test-idem-unit-bot"
        now_iso = "2026-08-25T10:00:00+00:00"
        # Ensure test bot exists in DB
        db.safe_execute("""
            INSERT OR REPLACE INTO bot_instances (
                id, name, symbol, strategy, timeframe, allocated_capital, created_at, updated_at, execution_mode, status, is_deleted
            ) VALUES (?, 'Idempotency Test Bot', 'BTC/USDT', 'EMA_MACD_VP', '15m', 1000.0, ?, ?, 'PAPER', 'STOPPED', 0)
        """, (bot_id, now_iso, now_iso))

        mgr = BotProcessManager(bot_id=bot_id)

        # 1. Initial stop on stopped bot should be idempotent
        stop_res_1 = mgr.stop_bot()
        assert stop_res_1.get("status") in ["already_stopped", "success"]

        # 2. Start bot once
        start_res_1 = mgr.start_bot()
        assert start_res_1.get("status") == "success"
        assert mgr.is_running() is True
        pid_1 = start_res_1.get("pid")

        # 3. Start bot second time -> must return already_running and same PID
        start_res_2 = mgr.start_bot()
        assert start_res_2.get("status") == "already_running"
        assert start_res_2.get("pid") == pid_1

        # 4. Stop bot once
        stop_res_2 = mgr.stop_bot()
        assert stop_res_2.get("status") == "success"
        assert mgr.is_running() is False

        # 5. Stop bot second time -> must return already_stopped
        stop_res_3 = mgr.stop_bot()
        assert stop_res_3.get("status") == "already_stopped"

        # Cleanup test bot
        db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))


class TestSafeSelfHealingManager:
    """Validates bounded auto-recovery, circuit breakers, and unmodifiable parameter protection."""

    def test_bounded_recovery_exhaustion_and_escalation(self):
        """Test D: Failing service recovery must halt after max 3 attempts and escalate to operator."""
        entity_id = f"test-worker-{time.time()}"
        call_count = [0]

        def _failing_recovery():
            call_count[0] += 1
            return {"status": "error", "message": f"Failed connection attempt {call_count[0]}"}

        # Attempt 1
        res1 = global_self_healing_manager.execute_safe_recovery(
            entity_id=entity_id,
            entity_type="WORKER",
            failure_reason="Socket connection reset",
            recovery_callback=_failing_recovery
        )
        assert res1["status"] == "failed"
        assert res1["attempt"] == 1

        # Bypass backoff sleep for test speed by updating last_attempt_time
        with global_self_healing_manager._lock:
            global_self_healing_manager._recovery_records[entity_id]["last_attempt_time"] -= 100.0

        # Attempt 2
        res2 = global_self_healing_manager.execute_safe_recovery(
            entity_id=entity_id,
            entity_type="WORKER",
            failure_reason="Socket connection reset",
            recovery_callback=_failing_recovery
        )
        assert res2["status"] == "failed"
        assert res2["attempt"] == 2

        with global_self_healing_manager._lock:
            global_self_healing_manager._recovery_records[entity_id]["last_attempt_time"] -= 100.0

        # Attempt 3
        res3 = global_self_healing_manager.execute_safe_recovery(
            entity_id=entity_id,
            entity_type="WORKER",
            failure_reason="Socket connection reset",
            recovery_callback=_failing_recovery
        )
        assert res3["status"] == "failed"
        assert res3["attempt"] == 3

        with global_self_healing_manager._lock:
            global_self_healing_manager._recovery_records[entity_id]["last_attempt_time"] -= 100.0

        # Attempt 4: Should be EXHAUSTED and reject auto-recovery
        res4 = global_self_healing_manager.execute_safe_recovery(
            entity_id=entity_id,
            entity_type="WORKER",
            failure_reason="Socket connection reset",
            recovery_callback=_failing_recovery
        )
        assert res4["status"] == "exhausted"
        assert res4["action_required"] == "MANUAL_INTERVENTION"
        assert call_count[0] == 3, f"Expected exactly 3 calls before halting, got {call_count[0]}"

    def test_protected_invariants_gate_raises_permission_error(self):
        """Test E: Self-healing engine must strictly reject any auto-modification of risk/trading parameters."""
        forbidden_fields = [
            "strategy_name", "leverage", "lot_size", "position_size",
            "stop_loss", "take_profit", "risk_limit", "broker_credentials",
            "api_key", "order_side", "symbol", "quantity"
        ]

        for field in forbidden_fields:
            with pytest.raises(PermissionError) as exc_info:
                global_self_healing_manager.assert_unmodifiable_invariant(
                    action_name="TEST_AUTO_HEAL",
                    target_field=field
                )
            assert "strictly FORBIDDEN" in str(exc_info.value)
            assert field in str(exc_info.value)

        # Non-forbidden fields should pass without raising
        allowed_fields = ["websocket_connection", "temporary_cache", "stale_heartbeat_lease", "dns_lookup"]
        for field in allowed_fields:
            # Should not raise
            global_self_healing_manager.assert_unmodifiable_invariant(
                action_name="TEST_AUTO_HEAL",
                target_field=field
            )

    def test_circuit_breaker_lifecycle(self):
        """Validates circuit breaker transitions: CLOSED -> OPEN (tripped) -> HALF_OPEN -> CLOSED."""
        cb = global_self_healing_manager.get_circuit_breaker(f"test-cb-{time.time()}")
        assert cb.state == CircuitBreakerState.CLOSED

        # Record 4 failures (below 5 threshold) -> stays CLOSED
        for _ in range(4):
            cb.record_failure("Transient error")
            assert cb.can_execute() is True
        assert cb.state == CircuitBreakerState.CLOSED

        # 5th failure -> trips to OPEN
        cb.record_failure("5th consecutive error")
        assert cb.state == CircuitBreakerState.OPEN
        assert cb.can_execute() is False

        # Simulate timeout passage
        cb.last_state_change -= 35.0  # > 30s timeout
        assert cb.can_execute() is True
        assert cb.state == CircuitBreakerState.HALF_OPEN

        # 2 consecutive successes in HALF_OPEN -> transitions back to CLOSED
        cb.record_success()
        cb.record_success()
        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.can_execute() is True
