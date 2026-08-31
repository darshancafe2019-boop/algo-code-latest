import sqlite3

conn = sqlite3.connect("data/trading_bot.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT id, name, symbol, asset_class, status, execution_mode, timeframe, strategy, last_error FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
bots = [dict(r) for r in c.fetchall()]
print(f"Total active bots in database: {len(bots)}")
for b in bots:
    print(f"[{b['id']}] '{b['name']}' | Symbol: {b['symbol']} | Status: {b['status']} | Mode: {b['execution_mode']} | Error: {b['last_error']}")
conn.close()
