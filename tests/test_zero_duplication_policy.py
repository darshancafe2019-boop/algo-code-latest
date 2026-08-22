import pytest
import time
import uuid
from datetime import datetime, timezone

from src import config, db
from src.command_bus import CommandBus, CommandStatus
from src.telegram_service import global_telegram_service
from src.execution_service import OrderExecutionService
from src.trade_ledger import init_trade_ledger_schema, get_db_connection


def test_command_bus_idempotency():
    """Verify that repeating a command with the same idempotency_key returns cached result without duplicate execution."""
    idem_key = f"TEST_IDEM_{uuid.uuid4().hex[:12]}"
    
    # 1. First execution
    res1 = CommandBus.execute(
        action="REFRESH_MARKET_DATA",
        user="Tester",
        idempotency_key=idem_key
    )
    assert res1["status"] in [CommandStatus.SUCCEEDED, CommandStatus.ACCEPTED]
    assert res1.get("cached") is not True

    # 2. Second execution with identical idempotency key
    res2 = CommandBus.execute(
        action="REFRESH_MARKET_DATA",
        user="Tester",
        idempotency_key=idem_key
    )
    assert res2.get("cached") is True
    assert res2["command_id"] == res1["command_id"]


def test_bot_worker_uniqueness():
    """Verify starting an already running bot returns already_running status and prevents duplicate processes."""
    from src.process_manager import multi_bot_manager
    from datetime import datetime, timezone
    
    bot_id = "test-dup-bot-1"
    now_iso = datetime.now(timezone.utc).isoformat()
    db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
    db.safe_execute(
        """
        INSERT INTO bot_instances (id, name, symbol, strategy, timeframe, allocated_capital, status, execution_mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 10000.0, 'STOPPED', 'PAPER', ?, ?)
        """,
        (bot_id, "Dup Test Bot", "BTC/USDT", "EMA_MACD_VP", "1h", now_iso, now_iso),
    )
    
    # Ensure stopped
    multi_bot_manager.stop_bot(bot_id)
    
    # Start bot
    r1 = multi_bot_manager.start_bot(bot_id)
    assert r1.get("status") in ["success", "already_running"]
    
    # Attempt to start again
    r2 = multi_bot_manager.start_bot(bot_id)
    assert r2.get("status") == "already_running"
    
    # Clean up
    multi_bot_manager.stop_bot(bot_id)


def test_telegram_alert_deduplication():
    """Verify that rapid identical alerts within sliding deduplication window are safely dropped."""
    event_key = f"EVT-ALERT-{uuid.uuid4().hex[:8]}"
    
    # 1. Enqueue first alert
    deduped_before = global_telegram_service._total_deduped
    evt_id1 = global_telegram_service.enqueue(
        alert_type="SIGNAL_TRIGGERED",
        category="trading",
        text="Test Alert: BTC Breakout Detected",
        idempotency_key=event_key
    )
    assert evt_id1 is not None

    # 2. Immediate second alert with identical idempotency key
    evt_id2 = global_telegram_service.enqueue(
        alert_type="SIGNAL_TRIGGERED",
        category="trading",
        text="Test Alert: BTC Breakout Detected",
        idempotency_key=event_key
    )
    
    # 3. Verify deduplication counter incremented
    deduped_after = global_telegram_service._total_deduped
    assert deduped_after == deduped_before + 1


def test_candle_cache_composite_uniqueness():
    """Verify candles_cache UNIQUE(symbol, timeframe, timestamp) updates rather than duplicates."""
    conn = db.get_connection()
    c = conn.cursor()
    
    sym = "TEST/USDT"
    tf = "1m"
    ts = 1700000000
    
    # Clean prior
    c.execute("DELETE FROM candles_cache WHERE symbol = ? AND timeframe = ? AND timestamp = ?", (sym, tf, ts))
    conn.commit()
    
    # First insert
    c.execute(
        """
        INSERT INTO candles_cache (symbol, timeframe, timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, 100.0, 105.0, 99.0, 104.0, 50.0)
        """,
        (sym, tf, ts)
    )
    conn.commit()
    
    # Upsert with new close
    c.execute(
        """
        INSERT INTO candles_cache (symbol, timeframe, timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, 100.0, 106.0, 99.0, 105.5, 60.0)
        ON CONFLICT(symbol, timeframe, timestamp) DO UPDATE SET
            high = excluded.high,
            close = excluded.close,
            volume = excluded.volume
        """,
        (sym, tf, ts)
    )
    conn.commit()
    
    # Verify exactly 1 row exists with updated close
    c.execute("SELECT COUNT(*) as cnt, close, high FROM candles_cache WHERE symbol = ? AND timeframe = ? AND timestamp = ?", (sym, tf, ts))
    row = c.fetchone()
    assert row["cnt"] == 1
    assert row["close"] == 105.5
    assert row["high"] == 106.0
    
    # Cleanup
    c.execute("DELETE FROM candles_cache WHERE symbol = ? AND timeframe = ? AND timestamp = ?", (sym, tf, ts))
    conn.commit()
    conn.close()


def test_trade_fill_primary_key_uniqueness():
    """Verify trade_fills enforces unique fill_id."""
    init_trade_ledger_schema()
    conn = get_db_connection()
    c = conn.cursor()
    
    fill_id = f"FILL_TEST_{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()
    
    # Insert first fill
    c.execute(
        """
        INSERT OR IGNORE INTO trade_fills (
            fill_id, trade_id, order_id, fill_timestamp, fill_price, fill_quantity, fill_side, created_at
        ) VALUES (?, 9999, 'ORD_9999', ?, 65000.0, 0.1, 'BUY', ?)
        """,
        (fill_id, now_str, now_str)
    )
    conn.commit()
    
    # Attempt duplicate insert with same fill_id
    c.execute(
        """
        INSERT OR IGNORE INTO trade_fills (
            fill_id, trade_id, order_id, fill_timestamp, fill_price, fill_quantity, fill_side, created_at
        ) VALUES (?, 9999, 'ORD_9999', ?, 65000.0, 0.1, 'BUY', ?)
        """,
        (fill_id, now_str, now_str)
    )
    conn.commit()
    
    # Verify exactly 1 fill exists
    c.execute("SELECT COUNT(*) as cnt FROM trade_fills WHERE fill_id = ?", (fill_id,))
    row = c.fetchone()
    assert row["cnt"] == 1
    
    # Cleanup
    c.execute("DELETE FROM trade_fills WHERE fill_id = ?", (fill_id,))
    conn.commit()
    conn.close()
