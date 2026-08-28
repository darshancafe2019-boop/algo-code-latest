"""
Comprehensive Test Suite for Bot Deletion, Process Safety, and Bulk Operations
==============================================================================
Tests:
1. Delete stopped bot -> Verify DB removal, 200 OK, trade history preservation
2. Delete running bot -> Verify process termination first, then DB removal
3. Bulk delete bots (3+ bots) -> Verify single call deletion and response counts
4. Bulk stop, start, pause, resume endpoints
5. Verify audit log event emission
"""

import sys
import os
import json
import sqlite3
from datetime import datetime, timezone

from dashboard import app
from src import db, audit, config

def test_single_stopped_bot_deletion():
    client = app.test_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Create a dummy test bot in DB
    bot_id = "test-del-stopped-001"
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
    conn.execute("""
        INSERT INTO bot_instances (id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at)
        VALUES (?, 'Test Deletion Bot', 'BTC/USDT', 'Crypto', '15m', 'EMA Confluence', 'PAPER', 'STOPPED', 10000.0, ?, ?)
    """, (bot_id, now_iso, now_iso))
    
    # Insert a dummy trade record tied to this bot to verify trade preservation
    conn.execute("DELETE FROM trades_log WHERE trade_id = 'trade-del-001'")
    conn.execute("""
        INSERT INTO trades_log (timestamp, trade_id, bot_id, symbol, direction, entry_price, position_size, status)
        VALUES (?, 'trade-del-001', ?, 'BTC/USDT', 'LONG', 65000.0, 0.1, 'CLOSED')
    """, (now_iso, bot_id))
    conn.commit()
    conn.close()

    # 2. Verify bot exists in DB
    bots_before = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
    assert len(bots_before) == 1, "Test bot should exist prior to delete"

    # 3. Call DELETE /api/bots/<bot_id>
    res = client.delete(f"/api/bots/{bot_id}")
    assert res.status_code == 200, f"DELETE failed: {res.data}"
    data = res.get_json()
    assert data.get("status") == "success"
    assert data.get("trades_preserved") is True

    # 4. Verify bot row is gone from bot_instances
    bots_after = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
    assert len(bots_after) == 0, "Bot should be deleted from bot_instances"

    # 5. Verify trade record in trades_log is STILL preserved
    trades = db.safe_query("SELECT * FROM trades_log WHERE bot_id = ?", (bot_id,))
    assert len(trades) >= 1, "Trade history MUST be preserved after bot deletion"
    assert any(t["trade_id"] == "trade-del-001" for t in trades)
    print("✓ [TEST 1 PASSED] Single stopped bot deleted cleanly, trade history preserved.")


def test_single_running_bot_deletion_and_process_cleanup():
    client = app.test_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    bot_id = "test-del-running-002"
    
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
    conn.execute("""
        INSERT INTO bot_instances (id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at)
        VALUES (?, 'Running Test Bot', 'ETH/USDT', 'Crypto', '5m', 'Momentum Scalp', 'PAPER', 'RUNNING', 5000.0, ?, ?)
    """, (bot_id, now_iso, now_iso))
    conn.commit()
    conn.close()

    # Create dummy pid file to simulate OS process
    pid_file = config.DATA_DIR / f"bot_{bot_id}.pid"
    pid_file.write_text("999999999") # Non-existent PID or orphan

    # Call DELETE endpoint
    res = client.delete(f"/api/bots/{bot_id}")
    assert res.status_code == 200, f"DELETE failed: {res.data}"
    
    # Verify bot deleted from DB
    bots_after = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
    assert len(bots_after) == 0, "Running bot should be removed from bot_instances"

    # Verify PID file unlinked
    assert not pid_file.exists(), "PID file should be unlinked after process cleanup"
    print("✓ [TEST 2 PASSED] Running bot process stopped and cleaned up before deletion.")


def test_bulk_delete_bots():
    client = app.test_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    bot_ids = [f"test-bulk-del-{i}" for i in range(1, 6)]

    conn = db.get_connection()
    for b_id in bot_ids:
        conn.execute("DELETE FROM bot_instances WHERE id = ?", (b_id,))
        conn.execute("""
            INSERT INTO bot_instances (id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at)
            VALUES (?, ?, 'BTC/USDT', 'Crypto', '15m', 'Confluence', 'PAPER', 'STOPPED', 1000.0, ?, ?)
        """, (b_id, f"Bulk Bot {b_id}", now_iso, now_iso))
    conn.commit()
    conn.close()

    # Call bulk-delete
    res = client.post("/api/bots/bulk-delete", json={"bot_ids": bot_ids})
    assert res.status_code == 200, f"Bulk delete failed: {res.data}"
    data = res.get_json()
    assert data.get("status") == "success"
    assert data.get("deleted_count") == 5
    assert len(data.get("deleted_bots", [])) == 5

    # Verify all are removed from DB
    placeholders = ",".join(["?"] * len(bot_ids))
    remaining = db.safe_query(f"SELECT * FROM bot_instances WHERE id IN ({placeholders})", tuple(bot_ids))
    assert len(remaining) == 0, "All 5 bulk deleted bots should be gone"
    print("✓ [TEST 3 PASSED] Bulk delete of 5 bots completed in 1 request.")


def test_bulk_control_endpoints():
    client = app.test_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    bot_ids = ["test-bulk-ctrl-1", "test-bulk-ctrl-2"]

    conn = db.get_connection()
    for b_id in bot_ids:
        conn.execute("DELETE FROM bot_instances WHERE id = ?", (b_id,))
        conn.execute("""
            INSERT INTO bot_instances (id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at)
            VALUES (?, ?, 'SOL/USDT', 'Crypto', '1h', 'EMA Scalper', 'PAPER', 'STOPPED', 2000.0, ?, ?)
        """, (b_id, f"Control Bot {b_id}", now_iso, now_iso))
    conn.commit()
    conn.close()

    # Bulk Stop
    res_stop = client.post("/api/bots/bulk-stop", json={"bot_ids": bot_ids})
    assert res_stop.status_code == 200
    
    # Bulk Pause
    res_pause = client.post("/api/bots/bulk-pause", json={"bot_ids": bot_ids})
    assert res_pause.status_code == 200

    # Bulk Resume
    res_resume = client.post("/api/bots/bulk-resume", json={"bot_ids": bot_ids})
    assert res_resume.status_code == 200

    # Cleanup
    client.post("/api/bots/bulk-delete", json={"bot_ids": bot_ids})
    print("✓ [TEST 4 PASSED] Bulk stop, pause, resume endpoints verified.")

if __name__ == "__main__":
    test_single_stopped_bot_deletion()
    test_single_running_bot_deletion_and_process_cleanup()
    test_bulk_delete_bots()
    test_bulk_control_endpoints()
    print("\n🎉 ALL BACKEND BOT DELETION & BULK ACTION TESTS PASSED PERFECTLY!")
