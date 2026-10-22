import sqlite3
import time

def reconcile():
    print("[1/5] Connecting to database...", flush=True)
    con = sqlite3.connect("data/trading_bot.db", timeout=30.0)
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    cur = con.cursor()

    t0 = time.time()
    cur.execute("SELECT count(*) FROM trades_log WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')")
    count_before = cur.fetchone()[0]
    print(f"[2/5] Open trades before: {count_before}", flush=True)

    # 1. Close all SELL trades that were mistakenly marked OPEN
    cur.execute("""
        UPDATE trades_log
        SET status = 'CLOSED', exit_timestamp = timestamp, exit_reason = 'POSITION_CLOSED'
        WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL') AND side = 'SELL'
    """)
    sells = cur.rowcount
    con.commit()
    print(f"[3/5] Closed {sells} SELL trades.", flush=True)

    # 2. Close all trades on expired contracts
    cur.execute("""
        UPDATE trades_log
        SET status = 'CLOSED', exit_timestamp = '2026-10-22T00:00:00Z', exit_reason = 'CONTRACT_EXPIRED'
        WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')
          AND (
            symbol LIKE '%2026-10-13%' OR symbol LIKE '%131026%' OR
            symbol LIKE '%2026-10-14%' OR symbol LIKE '%141026%' OR
            symbol LIKE '%2026-10-15%' OR symbol LIKE '%151026%' OR
            symbol LIKE '%2026-10-16%' OR symbol LIKE '%161026%' OR
            symbol LIKE '%2026-10-17%' OR symbol LIKE '%171026%' OR
            symbol LIKE '%2026-10-18%' OR symbol LIKE '%181026%' OR
            symbol LIKE '%2026-10-19%' OR symbol LIKE '%191026%' OR
            symbol LIKE '%2026-10-20%' OR symbol LIKE '%201026%' OR
            symbol LIKE '%2026-10-21%' OR symbol LIKE '%211026%' OR
            symbol LIKE '%2026-10-22%' OR symbol LIKE '%221026%'
          )
    """)
    expired = cur.rowcount
    con.commit()
    print(f"[4/5] Closed {expired} expired trades.", flush=True)

    # 3. For any remaining open trades, keep only the latest 1 per (bot_id, symbol)
    cur.execute("""
        UPDATE trades_log
        SET status = 'CLOSED', exit_timestamp = CURRENT_TIMESTAMP, exit_reason = 'RECONCILED_HISTORICAL'
        WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')
          AND id NOT IN (
            SELECT MAX(id)
            FROM trades_log
            WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')
            GROUP BY bot_id, symbol
          )
    """)
    dups = cur.rowcount
    con.commit()
    print(f"[5/5] Closed {dups} older duplicate open trades.", flush=True)

    # 4. Check remaining open trades
    cur.execute("SELECT count(*) FROM trades_log WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')")
    count_after = cur.fetchone()[0]
    print(f"[*] Open trades after reconciliation: {count_after} (took {time.time()-t0:.2f}s)", flush=True)

    # 5. Pause runaway bots in bots table
    cur.execute("UPDATE bots SET status = 'PAUSED' WHERE status = 'RUNNING'")
    paused = cur.rowcount
    con.commit()
    print(f"[*] Paused {paused} runaway bots in bots table.", flush=True)

    con.close()
    print("[*] Reconciliation successfully finished!", flush=True)

if __name__ == "__main__":
    reconcile()
