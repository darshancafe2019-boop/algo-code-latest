import sqlite3
import shutil
import os
from pathlib import Path

def salvage():
    data_dir = Path("data")
    src_db = data_dir / "trading_bot.db"
    clean_db = data_dir / "trading_bot_recovered.db"
    
    if clean_db.exists():
        clean_db.unlink()
        
    print("Reading schema from src/db.py schema initialization...")
    import sys
    sys.path.insert(0, os.getcwd())
    from src import config
    
    # Temporarily point config.DB_PATH to clean_db
    original_db_path = config.DB_PATH
    config.DB_PATH = clean_db
    
    from src import db
    db._db_initialized = False
    db.init_db(force=True)
    print("Clean database tables initialized at:", clean_db)
    
    # Now copy salvageable data from src_db
    src_conn = sqlite3.connect(str(src_db))
    src_cursor = src_conn.cursor()
    
    clean_conn = sqlite3.connect(str(clean_db))
    clean_cursor = clean_conn.cursor()
    
    clean_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in clean_cursor.fetchall()]
    
    salvaged_counts = {}
    for table in tables:
        try:
            src_cursor.execute(f"SELECT * FROM {table};")
            rows = src_cursor.fetchall()
            if rows:
                col_names = [d[0] for d in src_cursor.description]
                placeholders = ",".join(["?"] * len(col_names))
                cols = ",".join([f'"{c}"' for c in col_names])
                clean_cursor.executemany(f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({placeholders})", rows)
                clean_conn.commit()
                salvaged_counts[table] = len(rows)
            else:
                salvaged_counts[table] = 0
        except Exception as e:
            salvaged_counts[table] = f"Error: {e}"
            
    print("Salvaged record counts:", salvaged_counts)
    
    # Run integrity check on clean_db
    clean_cursor.execute("PRAGMA integrity_check;")
    res = clean_cursor.fetchall()
    print("Clean DB integrity check:", res)
    
    src_conn.close()
    clean_conn.close()
    
    if res == [("ok",)]:
        # Back up corrupted db and swap in clean db
        corrupt_backup = data_dir / "trading_bot_malformed.bak"
        if not corrupt_backup.exists():
            shutil.copy2(str(src_db), str(corrupt_backup))
        for ext in ["-shm", "-wal"]:
            wal_f = data_dir / f"trading_bot.db{ext}"
            if wal_f.exists():
                try: wal_f.unlink()
                except Exception: pass
        shutil.copy2(str(clean_db), str(src_db))
        print("SUCCESSFULLY SWAPPED CLEAN RECOVERED DATABASE INTO data/trading_bot.db!")

if __name__ == "__main__":
    salvage()
