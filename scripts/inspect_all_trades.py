import sqlite3
import json

conn = sqlite3.connect("data/trading_bot.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT id, bot_id, symbol, direction, status, execution_mode, net_pnl, realized_pnl, result_pnl, gross_pnl, exit_timestamp, timestamp FROM trades_log ORDER BY id DESC")
rows = [dict(r) for r in c.fetchall()]

print(f"Total rows in trades_log: {len(rows)}")
for r in rows[:15]:
    print(r)

conn.close()
