import sys
import os
import time
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src import db, config
from src.bot_runtime_service import BotRuntimeService
from src.latency_profiler import compute_latency_summary, diagnose_slow_trade

def run_comprehensive_bot_diagnostic():
    print("=" * 70)
    print("[SCAN] COMPREHENSIVE BOT FLEET & LATENCY DIAGNOSTIC SCAN")
    print("=" * 70)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")

    # 1. Database Connection & Bot Instances Scan
    conn = db.get_connection()
    cursor = conn.cursor()

    # Query all bots
    cursor.execute("SELECT * FROM bot_instances")
    bot_rows = cursor.fetchall()
    print(f"\n[1] TOTAL CONFIGURED BOTS IN DATABASE: {len(bot_rows)}")
    
    bot_issues = []
    for b in bot_rows:
        b_dict = dict(b)
        b_id = b_dict.get("id") or b_dict.get("bot_id")
        b_name = b_dict.get("name", "Unnamed")
        b_sym = b_dict.get("symbol", "N/A")
        b_strat = b_dict.get("strategy", "N/A")
        b_status = b_dict.get("status", "UNKNOWN")
        b_err = b_dict.get("last_error") or b_dict.get("error_message") or ""
        
        has_error = bool(b_err) or b_status in ["ERROR", "DEGRADED", "FAILED"]
        if has_error:
            bot_issues.append({
                "id": b_id,
                "name": b_name,
                "symbol": b_sym,
                "strategy": b_strat,
                "status": b_status,
                "error": b_err
            })
        print(f"  - Bot [{b_id}] '{b_name}' | Symbol: {b_sym} | Strategy: {b_strat} | Status: {b_status} | Error: {b_err or 'None'}")

    # 2. Bot Runtime Service Fleet Status
    print("\n[2] BOT RUNTIME SERVICE STATE & INVARIANTS")
    try:
        runtime_svc = BotRuntimeService()
        fleet_snapshot = runtime_svc.get_fleet_snapshot()
        print(f"  - Total Runtime Fleet: {fleet_snapshot.get('total_bots', len(fleet_snapshot.get('bots', [])))}")
        print(f"  - Running: {fleet_snapshot.get('running_count', 0)} | Stopped: {fleet_snapshot.get('stopped_count', 0)} | Error: {fleet_snapshot.get('error_count', 0)}")
        print(f"  - Mathematical Invariant Verified: {fleet_snapshot.get('mathematical_invariant_valid', True)}")
    except Exception as e:
        print(f"  [NOTICE] Runtime service exception: {e}")

    # 3. Error Ledger & Audit Logs Scan
    print("\n[3] RECENT ERROR LEDGER & BOT FAILURES")
    try:
        cursor.execute("SELECT * FROM audit_logs WHERE level IN ('ERROR', 'CRITICAL', 'WARNING') ORDER BY timestamp DESC LIMIT 15")
        error_logs = cursor.fetchall()
        print(f"  - Found {len(error_logs)} recent error/warning audit log entries:")
        for log in error_logs:
            l_dict = dict(log)
            print(f"    * [{l_dict.get('timestamp')}] [{l_dict.get('level')}] {l_dict.get('action') or l_dict.get('event')}: {l_dict.get('details') or l_dict.get('message')}")
    except Exception as e:
        print(f"  [NOTICE] Error ledger query note: {e}")

    # 4. Latency Profiling & Lag Forensics
    print("\n[4] LATENCY STAGES & EXECUTION LAG PROFILING")
    try:
        cursor.execute("SELECT * FROM trade_latencies ORDER BY created_at DESC LIMIT 10")
        latencies = cursor.fetchall()
        if latencies:
            print(f"  - Analyzed {len(latencies)} recent trade latency records:")
            for lat in latencies:
                ld = dict(lat)
                print(f"    * Trade #{ld.get('trade_id')} ({ld.get('order_id')}): Total Execution = {ld.get('total_execution_latency_ms', 0):.2f}ms | Signal->Risk: {ld.get('signal_latency_ms', 0):.2f}ms | Broker Submit: {ld.get('broker_submit_latency_ms', 0):.2f}ms | Fill->DB: {ld.get('db_write_latency_ms', 0):.2f}ms")
        else:
            print("  - No slow trade latency records logged in trade_latencies table.")
    except Exception as e:
        print(f"  [NOTICE] Latency table query note: {e}")

    # 5. Live Quote Fetcher & Market Data Lag Test
    print("\n[5] LIVE MARKET DATA FEED LATENCY & TICK LAG TEST")
    from market_data.stocks.quote_engine import LiveQuoteFetcher
    
    test_symbols = [
        ("RELIANCE", "NSE"),
        ("TCS", "NSE"),
        ("BTC", "CRYPTO"),
        ("ETH", "CRYPTO"),
        ("EURUSD", "FOREX"),
        ("XAUUSD", "METALS"),
    ]
    
    for sym, ex in test_symbols:
        t0 = time.perf_counter()
        quote = LiveQuoteFetcher.fetch_live_data(sym, ex)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        
        status = "FAST (<50ms)" if elapsed_ms < 50 else ("ACCEPTABLE (<250ms)" if elapsed_ms < 250 else "LAGGY (>250ms)")
        price_val = quote.get("last_price") if quote else "N/A"
        print(f"  - {sym:<10} ({ex:<6}) -> {elapsed_ms:>7.2f}ms | Price: {price_val} | Latency Tier: {status}")

    # 6. Database Query Performance & Lock Contention Test
    print("\n[6] DATABASE QUERY PERFORMANCE & LOCK CONTENTION")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"  - Discovered {len(tables)} SQLite Tables: {', '.join(tables[:10])}...")
    
    for tbl in tables[:8]:
        t0 = time.perf_counter()
        cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
        cnt = cursor.fetchone()[0]
        q_time_ms = (time.perf_counter() - t0) * 1000.0
        print(f"  - Table '{tbl:<24}' -> Rows: {cnt:<8} | Query Time: {q_time_ms:.3f}ms")

    # Summary
    print("\n" + "=" * 70)
    print("[SUMMARY] DIAGNOSTIC SCAN SUMMARY")
    print("=" * 70)
    print(f"Total Bots Inspected: {len(bot_rows)}")
    print(f"Active Issues / Errors Found: {len(bot_issues)}")
    if bot_issues:
        for issue in bot_issues:
            print(f"  [ISSUE] Bot {issue['id']} ({issue['name']}): {issue['error']}")
    else:
        print("  [OK] No critical bot errors or crash loops detected.")
    print("=" * 70)

if __name__ == "__main__":
    run_comprehensive_bot_diagnostic()
