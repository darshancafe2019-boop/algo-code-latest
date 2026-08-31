import sqlite3

conn = sqlite3.connect("data/trading_bot.db")
c = conn.cursor()
c.execute("PRAGMA table_info(trades_log)")
cols = c.fetchall()
print("=== trades_log columns ===")
for col in cols:
    print(f"  {col[1]} ({col[2]})")

c.execute("SELECT COUNT(*) FROM trades_log")
print(f"\nTotal trades in trades_log: {c.fetchone()[0]}")

c.execute("SELECT id, symbol, status, execution_mode, result_pnl, net_pnl, pnl, exit_timestamp, timestamp FROM trades_log ORDER BY id DESC LIMIT 5")
rows = c.fetchall()
print("\n=== Recent 5 trades ===")
for r in rows:
    print(r)

conn.close()
