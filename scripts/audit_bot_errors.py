import sqlite3
import json
import os

DB_PATH = "data/trading_bot.db"

def run_audit():
    print("=== STARTING COMPREHENSIVE BOT AUDIT ===")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} does not exist!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 0. List tables
    print("\n--- 0. DATABASE TABLES ---")
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Total tables: {len(tables)}")
    trade_related = [t for t in tables if any(k in t for k in ['trade', 'order', 'position', 'execution', 'bot', 'error'])]
    print("Trade & Error related tables:", trade_related)

    # 1. Check Trades
    print("\n--- 1. TRADES AUDIT ---")
    for tbl in ['trades', 'paper_trades', 'trade_history', 'bot_trades']:
        if tbl in tables:
            try:
                cur.execute(f"SELECT COUNT(*), status FROM {tbl} GROUP BY status")
                print(f"Table {tbl}:", cur.fetchall())
            except Exception as e:
                print(f"Error querying {tbl}: {e}")

    # 2. Check Positions
    print("\n--- 2. POSITIONS AUDIT ---")
    for tbl in ['positions', 'paper_positions', 'open_positions']:
        if tbl in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                print(f"Table {tbl} row count:", cur.fetchone()[0])
            except Exception as e:
                print(f"Error querying {tbl}: {e}")

    # 3. Check Orders
    print("\n--- 3. ORDERS AUDIT ---")
    for tbl in ['orders', 'paper_orders']:
        if tbl in tables:
            try:
                cur.execute(f"SELECT COUNT(*), status FROM {tbl} GROUP BY status")
                print(f"Table {tbl} status count:", cur.fetchall())
            except Exception as e:
                print(f"Error querying {tbl}: {e}")

    # 4. Check Circuit Breakers & Risk State
    print("\n--- 4. CIRCUIT BREAKERS & RISK STATE ---")
    try:
        cur.execute("SELECT * FROM circuit_breakers WHERE is_tripped=1 OR status='TRIPPED'")
        tripped = cur.fetchall()
        print(f"Tripped circuit breakers: {len(tripped)}")
        for cb in tripped:
            print(f"  CB: {dict(cb)}")
    except Exception as e:
        print(f"  Circuit breakers query: {e}")

    # 5. Check System Errors Table (All Distinct Errors)
    print("\n--- 5. DISTINCT SYSTEM ERRORS IN DB ---")
    cur.execute("""
        SELECT category, error_code, module, error_message, count(*) as cnt, MAX(timestamp) as last_seen 
        FROM system_errors 
        GROUP BY category, error_code, module, error_message 
        ORDER BY last_seen DESC
    """)
    sys_errs = cur.fetchall()
    print(f"Total distinct error signatures: {len(sys_errs)}")
    for e in sys_errs:
        print(f"  [{e['category']} - {e['error_code']}] ({e['module']}) (x{e['cnt']}) Last: {e['last_seen']}\n    Message: {e['error_message'][:120]}")

    # 6. Check Bot Instances with Errors or Desynchronized States
    print("\n--- 6. BOT INSTANCE ANOMALIES ---")
    cur.execute("SELECT id, name, status, desired_state, error_count, last_error FROM bot_instances WHERE error_count > 0 OR status != desired_state")
    bot_anomalies = cur.fetchall()
    print(f"Bots with error_count > 0 or status != desired_state: {len(bot_anomalies)}")
    for b in bot_anomalies:
        print(f"  Bot {b['id']} ({b['name']}): Status={b['status']}, Desired={b['desired_state']}, Errors={b['error_count']}, LastErr={b['last_error']}")

    # 7. Check Bot Activity Logs & Decisions for Warnings/Errors
    print("\n--- 7. BOT ACTIVITY LOGS (WARNINGS & ERRORS) ---")
    try:
        cur.execute("""
            SELECT activity_type, message, count(*) as count, MAX(timestamp) as last_seen
            FROM bot_activity_logs 
            WHERE activity_type LIKE '%ERROR%' OR activity_type LIKE '%FAIL%' OR activity_type LIKE '%WARN%'
            GROUP BY activity_type, message
            ORDER BY last_seen DESC
        """)
        act_logs = cur.fetchall()
        print(f"Total warning/error activity log patterns: {len(act_logs)}")
        for al in act_logs[:10]:
            print(f"  [{al['activity_type']}] (x{al['count']}) Last: {al['last_seen']}\n    {al['message'][:100]}")
    except Exception as e:
        print(f"Activity logs query: {e}")

    # 8. Check Bot Decision Logs for Rejected/Aborted decisions
    print("\n--- 8. BOT DECISION LOGS (REJECTIONS/ABORTS) ---")
    try:
        cur.execute("""
            SELECT decision, reason, count(*) as count, MAX(timestamp) as last_seen
            FROM bot_decision_logs
            WHERE decision IN ('REJECTED', 'ERROR', 'BLOCKED', 'ABORTED')
            GROUP BY decision, reason
            ORDER BY last_seen DESC
        """)
        dec_logs = cur.fetchall()
        print(f"Total rejected/blocked decisions: {len(dec_logs)}")
        for dl in dec_logs[:10]:
            print(f"  [{dl['decision']}] (x{dl['count']}) Last: {dl['last_seen']}\n    Reason: {dl['reason'][:100]}")
    except Exception as e:
        print(f"Decision logs query: {e}")

    conn.close()

if __name__ == "__main__":
    run_audit()
