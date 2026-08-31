import sqlite3
import shutil
import os
from pathlib import Path

data_dir = Path("data")
db_path = data_dir / "trading_bot.db"
bak_path = data_dir / "trading_bot.db.bak"

print("Checking backup database...")
try:
    conn_bak = sqlite3.connect(str(bak_path))
    c = conn_bak.cursor()
    c.execute("PRAGMA integrity_check")
    res = c.fetchall()
    print("Backup integrity:", res)
    conn_bak.close()
    
    if res == [("ok",)]:
        # Clean wal / shm files
        for f in [data_dir / "trading_bot.db-shm", data_dir / "trading_bot.db-wal"]:
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass
        shutil.copy2(str(bak_path), str(db_path))
        print("Restored clean database from backup!")
except Exception as e:
    print("Error during restore:", e)
