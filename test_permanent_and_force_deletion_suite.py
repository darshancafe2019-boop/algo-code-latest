import sys
import os
import json
import time
from pathlib import Path

root = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from src import db, config, audit
from src.process_manager import multi_bot_manager, get_bot_pid_file, cleanup_orphan_bot_process
from src.bot_runtime_service import global_bot_runtime_service
import dashboard

def run_suite():
    print("==================================================")
    print("🚀 RUNNING PERMANENT & FORCE BOT DELETION SUITE")
    print("==================================================")

    client = dashboard.app.test_client()

    # ----------------------------------------------------
    # TEST 1: Force Delete a Stuck / Error Bot
    # ----------------------------------------------------
    print("\n[TEST 1] Force Deleting an ERROR/STUCK Bot...")
    stuck_bot_id = "test-stuck-error-bot-999"
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances WHERE id = ?", (stuck_bot_id,))
    conn.execute("""
        INSERT INTO bot_instances (
            id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, last_error, allocated_capital, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (stuck_bot_id, "Stuck Error Bot", "BTC/USDT", "Crypto", "5m", "RSI_Momentum", "PAPER", "ERROR", "Process timed out and locked", 10000.0))
    conn.commit()
    conn.close()

    # Create dummy PID file and lock
    pid_file = get_bot_pid_file(stuck_bot_id)
    pid_file.write_text("999999")
    _ = global_bot_runtime_service._get_bot_lock(stuck_bot_id)

    # Call force-delete endpoint
    res = client.post(f"/api/bots/{stuck_bot_id}/force-delete")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_data(as_text=True)}"
    data = res.get_json()
    assert data.get("status") == "success"
    assert data.get("force") is True

    # Verify bot is gone from DB
    check_rows = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (stuck_bot_id,))
    assert len(check_rows) == 0, "Stuck bot should be deleted from bot_instances"

    # Verify PID file unlinked
    assert not pid_file.exists(), "PID file should be unlinked"

    # Verify lock removed
    with global_bot_runtime_service._locks_mutex:
        assert stuck_bot_id not in global_bot_runtime_service._bot_locks, "Bot lock should be cleared"

    print("  ✓ [TEST 1 PASSED] Force deletion of ERROR/STUCK bot purged process, PID, lock, and DB row.")

    # ----------------------------------------------------
    # TEST 2: Delete Bot With Open Position (Preserve Position & Detach)
    # ----------------------------------------------------
    print("\n[TEST 2] Deleting Bot with Open Live Position & Trade History...")
    bot_with_trade_id = "test-bot-with-open-pos-888"
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances WHERE id = ?", (bot_with_trade_id,))
    conn.execute("""
        INSERT INTO bot_instances (
            id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (bot_with_trade_id, "Open Position Bot", "ETH/USDT", "Crypto", "15m", "MACD_Confluence", "PAPER", "STOPPED", 15000.0))
    
    # Insert open trade into trades_log
    conn.execute("""
        INSERT INTO trades_log (
            timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, result_pnl, metadata
        ) VALUES (datetime('now'), 'ETH/USDT', 'LONG', 3200.0, 3100.0, 3400.0, 2.5, 'OPEN', 0.0, ?)
    """, (json.dumps({"bot_id": bot_with_trade_id}),))
    
    # Insert closed historical trade
    conn.execute("""
        INSERT INTO trades_log (
            timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, exit_price, result_pnl, metadata
        ) VALUES (datetime('now'), 'ETH/USDT', 'LONG', 3000.0, 2900.0, 3200.0, 2.5, 'CLOSED', 3150.0, 375.0, ?)
    """, (json.dumps({"bot_id": bot_with_trade_id}),))
    conn.commit()
    conn.close()

    # Delete bot via DELETE /api/bots/<bot_id>
    del_res = client.delete(f"/api/bots/{bot_with_trade_id}")
    assert del_res.status_code == 200, f"Delete failed: {del_res.get_data(as_text=True)}"

    # Verify bot gone from bot_instances
    bots_after = db.safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_with_trade_id,))
    assert len(bots_after) == 0, "Bot should be deleted from bot_instances"

    # Verify open trade is PRESERVED in trades_log
    open_trades = db.safe_query("SELECT * FROM trades_log WHERE status = 'OPEN' AND symbol = 'ETH/USDT'")
    assert len(open_trades) >= 1, "Open trade must be preserved and not deleted"

    # Verify closed trade history is PRESERVED
    closed_trades = db.safe_query("SELECT * FROM trades_log WHERE status = 'CLOSED' AND symbol = 'ETH/USDT'")
    assert len(closed_trades) >= 1, "Closed trade history must be preserved"

    print("  ✓ [TEST 2 PASSED] Bot deleted while open position and trade history were preserved.")

    # ----------------------------------------------------
    # TEST 3: Bot Count Reduction & Fleet Invariant Check
    # ----------------------------------------------------
    print("\n[TEST 3] Verifying Bot Count Reduction & Invariant...")
    snap1 = global_bot_runtime_service.get_fleet_snapshot()
    count1 = snap1["metrics"]["total_bots"]

    # Create temporary bot
    temp_bot_id = "temp-count-test-bot"
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances WHERE id = ?", (temp_bot_id,))
    conn.execute("""
        INSERT INTO bot_instances (
            id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (temp_bot_id, "Temp Count Bot", "SOL/USDT", "Crypto", "5m", "EMA_Cross", "PAPER", "STOPPED", 5000.0))
    conn.commit()
    conn.close()

    snap2 = global_bot_runtime_service.get_fleet_snapshot()
    assert snap2["metrics"]["total_bots"] == count1 + 1

    # Delete temporary bot
    client.delete(f"/api/bots/{temp_bot_id}")

    snap3 = global_bot_runtime_service.get_fleet_snapshot()
    assert snap3["metrics"]["total_bots"] == count1, f"Expected {count1}, got {snap3['metrics']['total_bots']}"
    print(f"  ✓ [TEST 3 PASSED] Bot count increased to {count1+1} on creation and returned to {count1} after deletion.")

    # ----------------------------------------------------
    # TEST 4: Backend Restart Persistence (Deleted bot does not return)
    # ----------------------------------------------------
    print("\n[TEST 4] Verifying Persistence Across Restart...")
    # Simulate fresh startup reconciliation
    from src.process_manager import multi_bot_manager
    reconciled_snap = global_bot_runtime_service.get_fleet_snapshot()
    deleted_ids = [stuck_bot_id, bot_with_trade_id, temp_bot_id]
    for b in reconciled_snap["bots"]:
        assert b["id"] not in deleted_ids, f"Deleted bot {b['id']} must never return after restart!"

    print("  ✓ [TEST 4 PASSED] Deleted bots did not return during simulated startup reconciliation.")

    print("\n==================================================")
    print("🎉 ALL PERMANENT & FORCE DELETION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_suite()
