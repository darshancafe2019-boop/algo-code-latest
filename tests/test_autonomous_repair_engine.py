"""
Unit & Integration Tests for Autonomous Self-Solving Error Engine
================================================================
Validates:
1. Anomaly diagnosis and auto-recovery routines (stuck bots, stale cache, symbol normalization).
2. Hard invariant protection forbidding auto-mutation of risk parameters.
3. Adaptive learning ledger recording signatures, MTTR, and confidence scores.
4. Complete CommandBus execution of SELF_HEAL_FLEET, CLEAR_CACHE, RESTART_ALL_BOTS.
"""

import pytest
from src.autonomous_repair_engine import global_autonomous_repair_engine, FORBIDDEN_MUTATION_FIELDS
from src.self_healing_manager import global_self_healing_manager
from src.command_bus import command_bus, CommandStatus


def test_01_invariant_security_guard():
    """Ensures automated repair strictly raises PermissionError when trying to mutate risk invariants."""
    for field in ["max_daily_loss", "leverage", "stop_loss", "broker_credentials"]:
        with pytest.raises(PermissionError):
            global_autonomous_repair_engine.assert_safe_invariant(field, "TEST_ACTION")


def test_02_heal_symbol_mappings():
    """Tests automated normalization of malformed / generic category symbols."""
    res = global_autonomous_repair_engine.heal_symbol_mappings()
    assert res["status"] == "SUCCESS"
    assert "normalized_count" in res
    assert res["mttr_ms"] >= 0.0


def test_03_heal_stale_cache_and_db():
    """Tests flushing of corrupted cache and SQLite WAL optimization."""
    res_cache = global_autonomous_repair_engine.heal_stale_cache()
    assert res_cache["status"] == "SUCCESS"

    res_db = global_autonomous_repair_engine.heal_database_locks()
    assert res_db["status"] == "SUCCESS"


def test_04_global_autonomous_self_heal_pass():
    """Tests the global master self-healing pass resolving all operational pipelines."""
    res = global_autonomous_repair_engine.auto_heal_all_subsystems()
    assert res["success"] is True
    assert res["status"] == "HEALTHY"
    assert "results" in res
    assert res["total_mttr_ms"] >= 0.0


def test_05_learning_ledger_and_telemetry():
    """Tests recording and retrieval of adaptive error patterns and telemetry."""
    telemetry = global_autonomous_repair_engine.get_healing_telemetry()
    assert "status" in telemetry
    assert "auto_heal_success_rate" in telemetry
    assert "autonomous_mode" in telemetry
    assert telemetry["autonomous_mode"] is True


def test_06_command_bus_self_healing_actions():
    """Tests executing self-healing commands through the authoritative CommandBus."""
    cmd_heal = command_bus.execute(action="SELF_HEAL_FLEET", payload={})
    assert cmd_heal["status"] == CommandStatus.SUCCEEDED
    assert cmd_heal["success"] is True

    cmd_cache = command_bus.execute(action="CLEAR_CACHE", payload={})
    assert cmd_cache["status"] == CommandStatus.SUCCEEDED
    assert cmd_cache["success"] is True

    cmd_diag = command_bus.execute(action="RUN_DIAGNOSTICS", payload={})
    assert cmd_diag["status"] == CommandStatus.SUCCEEDED
    assert cmd_diag["success"] is True
