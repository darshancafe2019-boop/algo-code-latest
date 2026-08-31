import sqlite3
from datetime import datetime, timezone

conn = sqlite3.connect("data/trading_bot.db")
c = conn.cursor()

now_iso = datetime.now(timezone.utc).isoformat()

# 1. Fix 'test-bad-symbol-bot' (BTC-OPTIONS -> BTC/USDT)
c.execute("""
    UPDATE bot_instances 
    SET symbol = 'BTC/USDT', 
        asset_class = 'CRYPTO',
        status = 'STOPPED', 
        last_error = NULL,
        updated_at = ?
    WHERE id = 'test-bad-symbol-bot' OR symbol = 'BTC-OPTIONS'
""", (now_iso,))

# 2. Fix 'bot-1787984886518-0178' (BTC-260828-70000-C -> BTC-260925-70000-C)
c.execute("""
    UPDATE bot_instances 
    SET symbol = 'BTC-260925-70000-C', 
        status = 'STOPPED', 
        last_error = NULL,
        updated_at = ?
    WHERE id = 'bot-1787984886518-0178' OR symbol = 'BTC-260828-70000-C'
""", (now_iso,))

conn.commit()

c.execute("SELECT id, name, symbol, asset_class, status, last_error FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
bots = c.fetchall()
print(f"Repaired fleet state ({len(bots)} bots):")
for b in bots:
    print(f"  [{b[0]}] '{b[1]}' -> Symbol: {b[2]}, Status: {b[4]}, Error: {b[5]}")

conn.close()
