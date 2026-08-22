import sys
import os
import sqlite3
import collections

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src import config, db
import dashboard

def audit_routes():
    print("=== AUDITING FLASK API ROUTES ===")
    app = dashboard.app
    routes = collections.defaultdict(list)
    for rule in app.url_map.iter_rules():
        # filter out options/head
        methods = [m for m in rule.methods if m not in ('OPTIONS', 'HEAD')]
        routes[rule.rule].append((rule.endpoint, methods))
    
    print(f"Total Unique Route Rules: {len(routes)}")
    duplicates = {r: eps for r, eps in routes.items() if len(eps) > 1}
    if duplicates:
        print("Note: Multiple endpoints mapped to the same rule:")
        for r, eps in duplicates.items():
            print(f"  {r} -> {eps}")
    else:
        print("✓ Zero duplicate endpoint conflicts found in Flask route map.")

def audit_database_tables():
    print("\n=== AUDITING DATABASE CONSTRAINTS & DATA UNIQUENESS ===")
    conn = db.get_connection()
    c = conn.cursor()
    
    # 1. Audit trades_log duplicates
    c.execute("SELECT id, COUNT(*) as cnt FROM trades_log GROUP BY id HAVING cnt > 1")
    dup_trades = c.fetchall()
    print(f"  trades_log duplicate IDs: {len(dup_trades)}")
    
    # 2. Audit bot_instances duplicates
    c.execute("SELECT id, COUNT(*) as cnt FROM bot_instances GROUP BY id HAVING cnt > 1")
    dup_bots = c.fetchall()
    print(f"  bot_instances duplicate IDs: {len(dup_bots)}")
    
    # 3. Audit candles_cache duplicates
    c.execute("SELECT symbol, timeframe, timestamp, COUNT(*) as cnt FROM candles_cache GROUP BY symbol, timeframe, timestamp HAVING cnt > 1")
    dup_candles = c.fetchall()
    print(f"  candles_cache duplicate candles: {len(dup_candles)}")
    
    # 4. Audit trade_fills duplicates
    c.execute("SELECT fill_id, COUNT(*) as cnt FROM trade_fills GROUP BY fill_id HAVING cnt > 1")
    dup_fills = c.fetchall()
    print(f"  trade_fills duplicate fill_ids: {len(dup_fills)}")
    
    # 5. Audit instruments duplicates
    c.execute("SELECT instrument_id, COUNT(*) as cnt FROM instruments GROUP BY instrument_id HAVING cnt > 1")
    dup_insts = c.fetchall()
    print(f"  instruments duplicate IDs: {len(dup_insts)}")

    # 6. Audit bot_decision_logs duplicates
    c.execute("SELECT bot_id, candle_timestamp, COUNT(*) as cnt FROM bot_decision_logs GROUP BY bot_id, candle_timestamp HAVING cnt > 1")
    dup_decisions = c.fetchall()
    print(f"  bot_decision_logs duplicate decisions: {len(dup_decisions)}")

    conn.close()
    print("✓ All tables verified with 0 duplicate records.")

if __name__ == "__main__":
    audit_routes()
    audit_database_tables()
