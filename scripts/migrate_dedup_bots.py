import sqlite3
from pathlib import Path

db_path = Path("data/trading_bot.db")
if db_path.exists():
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    
    # 1. Fetch active bot instances
    c.execute("SELECT id, name, created_at FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0 ORDER BY created_at ASC")
    rows = c.fetchall()
    
    seen_names = {}
    for r in rows:
        bot_id, name, created_at = r[0], r[1], r[2]
        if name in seen_names:
            seen_names[name].append(bot_id)
        else:
            seen_names[name] = [bot_id]
            
    # Keep the latest active instance for each duplicate name, and soft-delete older duplicates
    for name, ids in seen_names.items():
        if len(ids) > 1:
            # Keep the primary one, mark the duplicates as is_deleted=1
            keep_id = ids[0]
            to_delete = ids[1:]
            print(f"Deduplicating bot '{name}': Keeping {keep_id}, soft-deleting {to_delete}")
            for del_id in to_delete:
                c.execute("UPDATE bot_instances SET is_deleted = 1, status = 'STOPPED' WHERE id = ?", (del_id,))
                
    conn.commit()
    conn.close()
    print("Bot instances deduplication migration complete.")
