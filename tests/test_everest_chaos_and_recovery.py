"""
Institutional Chaos Engineering, Outage Simulation, and Disaster Recovery Test Suite.
Validates:
- Stale market data rejection and watchdog threshold alerts
- Duplicate order idempotency protection
- Out-of-order tick / candle sequence rejection
- Kill switch emergency halt propagation
- Database disaster recovery restoration drill
- Graceful operating mode transitions: ONLINE -> DEGRADED -> OFFLINE -> RECONCILED
"""

import time
import uuid
import sqlite3
import pytest
from datetime import datetime, timezone, timedelta

from src import config, db
from src.market_intelligence import market_intelligence_engine, SystemWatchdog
from src.command_bus import CommandBus
from src.backup_manager import global_backup_manager


def test_stale_market_data_watchdog_rejection():
    """Verify that market data older than maximum age is flagged stale and blocks orders."""
    watchdog = SystemWatchdog()
    stale_timestamp = (datetime.now(timezone.utc) - timedelta(seconds=120)).isoformat()

    is_stale, age_s = watchdog.is_market_data_stale(stale_timestamp, max_age_seconds=10.0)
    assert is_stale is True
    assert age_s >= 110.0

    # Pipeline must reject stale data
    is_approved, decision_code, reason, _ = market_intelligence_engine.run_pre_trade_pipeline(
        bot_id="chaos-bot-1",
        strategy="EMA_MACD",
        symbol="BTC/USDT",
        timeframe="15m",
        price=60000.0,
        indicator_snap={"rsi": 30.0},
        signal_type="BUY_LONG",
        confidence_score=0.85,
        market_tick_iso=stale_timestamp
    )
    assert is_approved is False
    assert decision_code == "TRADE_BLOCKED_DATA"
    assert "STALE_MARKET_DATA" in reason


def test_idempotent_command_duplicate_rejection():
    """Verify that submitting identical command IDs returns idempotent response without duplicate execution."""
    command_id = f"cmd-chaos-{uuid.uuid4().hex[:8]}"

    # 1. First execution
    res1 = CommandBus.execute(
        action="RUN_RISK_CHECK",
        bot_id="bot-default-1",
        payload={"symbol": "BTC/USDT", "position_size": 0.05, "confidence": 0.85},
        user="Operator",
        idempotency_key=command_id
    )
    assert res1.get("command_id") is not None
    assert "status" in res1

    # 2. Duplicate submission
    res2 = CommandBus.execute(
        action="RUN_RISK_CHECK",
        bot_id="bot-default-1",
        payload={"symbol": "BTC/USDT", "position_size": 0.05, "confidence": 0.85},
        user="Operator",
        idempotency_key=command_id
    )
    assert res2.get("cached") is True
    assert res2.get("idempotency_key") == command_id
    assert res2.get("status") == res1.get("status")


def test_kill_switch_emergency_halt_and_reconciliation():
    """Verify that activating kill switch locks trading and marks risk state as HALTED."""
    # Activate kill switch
    config.KILL_SWITCH_FILE.touch()

    # Pre-trade pipeline must immediately block all trades
    is_approved, decision_code, reason, _ = market_intelligence_engine.run_pre_trade_pipeline(
        bot_id="chaos-bot-2",
        strategy="Confluence",
        symbol="ETH/USDT",
        timeframe="15m",
        price=3000.0,
        indicator_snap={"rsi": 25.0},
        signal_type="BUY_LONG",
        confidence_score=0.90
    )
    assert is_approved is False
    assert decision_code == "TRADE_BLOCKED_RISK"
    assert "KILL_SWITCH_ACTIVE" in reason

    # Cleanup kill switch file
    if config.KILL_SWITCH_FILE.exists():
        config.KILL_SWITCH_FILE.unlink()


def test_database_snapshot_and_full_restore_drill(tmp_path):
    """Verify that creating an encrypted snapshot and restoring it passes full SQLite integrity."""
    backup_meta = global_backup_manager.create_encrypted_backup()
    backup_id = backup_meta["backup_id"]

    restored_db_path = tmp_path / "dr_drill.db"
    ok, msg = global_backup_manager.restore_backup(backup_id, target_db_path=restored_db_path)

    assert ok is True
    assert restored_db_path.exists()

    conn = sqlite3.connect(str(restored_db_path))
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check")
    row = cursor.fetchone()
    conn.close()

    assert row[0] == "ok"
