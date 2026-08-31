import sqlite3
import shutil
import os
from pathlib import Path

def repair():
    data_dir = Path("data")
    db_file = data_dir / "trading_bot.db"
    corrupt_backup = data_dir / "trading_bot_corrupt_saved.bak"
    
    import sys
    sys.path.insert(0, os.getcwd())
    
    print("1. Initializing fresh schema...")
    from src import db
    db._db_initialized = False
    db.init_db(force=True)
    print("Schema initialized successfully!")
    
    # 2. Try to copy salvageable tables from corrupt_backup
    print("2. Salvaging data from backup...")
    if corrupt_backup.exists():
        try:
            src_conn = sqlite3.connect(str(corrupt_backup))
            src_cur = src_conn.cursor()
            
            dst_conn = sqlite3.connect(str(db_file))
            dst_cur = dst_conn.cursor()
            
            dst_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [r[0] for r in dst_cur.fetchall()]
            
            salvaged = {}
            for tbl in tables:
                try:
                    src_cur.execute(f"SELECT * FROM {tbl};")
                    rows = src_cur.fetchall()
                    if rows:
                        col_names = [d[0] for d in src_cur.description]
                        placeholders = ",".join(["?"] * len(col_names))
                        cols = ",".join([f'"{c}"' for c in col_names])
                        dst_cur.executemany(f"INSERT OR IGNORE INTO {tbl} ({cols}) VALUES ({placeholders})", rows)
                        dst_conn.commit()
                        salvaged[tbl] = len(rows)
                except Exception as te:
                    salvaged[tbl] = f"Corrupt/Skipped: {te}"
                    
            print("Salvaged summary:", salvaged)
            
            # Verify integrity
            dst_cur.execute("PRAGMA integrity_check;")
            res = dst_cur.fetchall()
            print("3. PRAGMA integrity_check on new database:", res)
            
            src_conn.close()
            dst_conn.close()
        except Exception as e:
            print("Salvage error:", e)

if __name__ == "__main__":
    repair()
