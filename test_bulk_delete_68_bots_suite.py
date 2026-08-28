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

def run_bulk_delete_68_suite():
    print("==================================================")
    print("🚀 RUNNING COMPREHENSIVE BULK DELETE 68 BOTS TEST")
    print("==================================================")

    client = dashboard.app.test_client()

    # 1. Clean state and seed exactly 68 bots for test
    conn = db.get_connection()
    conn.execute("DELETE FROM bot_instances")
    
    bot_tuples = []
    now_str = "2026-08-28T18:00:00+00:00"
    for i in range(1, 69):
        bid = f"fleet-bot-{i:03d}"
        bname = f"Fleet Alpha Bot #{i}"
        sym = "BTC/USDT" if i % 2 == 0 else "ETH/USDT"
        strat = "EMA_Scalper" if i % 3 == 0 else "RSI_Momentum"
        status = "RUNNING" if i <= 3 else "STOPPED"
        bot_tuples.append((
            bid, bname, sym, "Crypto", "5m", strat, "PAPER", status, 10000.0, now_str, now_str
        ))
    
    conn.executemany("""
        INSERT INTO bot_instances (
            id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, bot_tuples)

    # Insert open and historical trades
    conn.execute("""
        INSERT INTO trades_log (
            timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, result_pnl, metadata
        ) VALUES (datetime('now'), 'BTC/USDT', 'LONG', 64000.0, 63000.0, 66000.0, 1.0, 'OPEN', 0.0, '{"bot_id": "fleet-bot-001"}')
    """)
    conn.execute("""
        INSERT INTO trades_log (
            timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, exit_price, result_pnl, metadata
        ) VALUES (datetime('now'), 'ETH/USDT', 'LONG', 3200.0, 3100.0, 3400.0, 2.0, 'CLOSED', 3350.0, 300.0, '{"bot_id": "fleet-bot-002"}')
    """)
    conn.commit()

    c = conn.cursor()
    c.execute("SELECT count(*) FROM trades_log")
    trades_before_count = c.fetchone()[0]
    conn.close()

    # 2. Check snapshot before deletion
    snap_initial = global_bot_runtime_service.get_fleet_snapshot()
    initial_count = snap_initial["metrics"]["total_bots"]
    print(f"\n[STEP 1] Initial Fleet Count Created: {initial_count} bots (Expected 68)")
    assert initial_count == 68, f"Expected 68 bots, got {initial_count}"
    
    # 3. Select all 68 bot IDs
    all_68_ids = [b["id"] for b in snap_initial["bots"]]
    print(f"[STEP 2] Executing bulk delete for all {len(all_68_ids)} bots in ONE database transaction...")

    # 4. Call POST /api/bots/bulk-delete
    res = client.post("/api/bots/bulk-delete", json={"bot_ids": all_68_ids, "force": True})
    assert res.status_code == 200, f"Bulk delete failed with {res.status_code}: {res.get_data(as_text=True)}"
    data = res.get_json()
    print(f"  Bulk delete API response: deleted_count={data.get('deleted_count')}, failed={len(data.get('failed_bot_ids', []))}")
    assert data.get("status") == "success"
    assert data.get("deleted_count") == 68
    assert len(data.get("deleted_bot_ids", [])) == 68
    assert len(data.get("failed_bot_ids", [])) == 0

    # 5. Check database directly - ensure 0 active or zombie records remain in bot_instances
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT count(*) FROM bot_instances")
    db_bots_remaining = c.fetchone()[0]
    print(f"\n[STEP 3] Database Check: Total rows remaining in bot_instances = {db_bots_remaining}")
    assert db_bots_remaining == 0, f"Expected 0 bots in DB, found {db_bots_remaining}"

    # 6. Verify historical trades and open positions in trades_log were NOT deleted
    c.execute("SELECT count(*) FROM trades_log")
    trades_after_count = c.fetchone()[0]
    print(f"  Historical trades after bulk delete: {trades_after_count} (Before: {trades_before_count})")
    assert trades_after_count == trades_before_count, "Trades must be preserved!"
    conn.close()

    # 7. Check Fleet Snapshot invariants
    snap_after = global_bot_runtime_service.get_fleet_snapshot()
    assert snap_after["metrics"]["total_bots"] == 0, f"Expected total_bots 0, got {snap_after['metrics']['total_bots']}"
    assert snap_after["metrics"]["running"] == 0
    assert snap_after["metrics"]["stopped"] == 0
    assert len(snap_after["bots"]) == 0
    print(f"  Fleet Snapshot after: total_bots={snap_after['metrics']['total_bots']}, bots list length={len(snap_after['bots'])}")

    # 8. Check worker processes & locks
    with global_bot_runtime_service._locks_mutex:
        assert len(global_bot_runtime_service._bot_locks) == 0, "All locks should be cleared"

    # 9. Verify Restart Simulation - Deleted bots DO NOT return or re-seed
    print("\n[STEP 4] Simulating Backend Restart & Seeding Check...")
    db.seed_demo_data_if_needed()
    db.reconcile_startup_bot_states()

    snap_restarted = global_bot_runtime_service.get_fleet_snapshot()
    print(f"  Fleet Count after Restart: {snap_restarted['metrics']['total_bots']} bots")
    assert snap_restarted["metrics"]["total_bots"] == 0, "Deleted bots must NEVER return after restart!"

    print("\n==================================================")
    print("🎉 ALL 68 BOT BULK DELETION TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_bulk_delete_68_suite()
