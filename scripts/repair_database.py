#!/usr/bin/env python3
"""
Robust SQLite Database Recovery for Quant.OS
Extracts all readable rows from each table and rebuilds a pristine database.
"""
import sys
import shutil
import sqlite3
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.db import init_db, get_connection

DB_PATH = Path("data/trading_bot.db")
TEMP_DB = Path("data/trading_bot_pristine.db")

def recover_database():
    print(f"[*] Starting robust database recovery for {DB_PATH}...")
    if not DB_PATH.exists():
        print("[!] No existing DB found, initializing fresh DB...")
        init_db(force=True)
        return

    # Backup corrupted db
    shutil.copy2(DB_PATH, Path("data/trading_bot.corrupted.bak"))
    
    # 1. Initialize fresh schema on TEMP_DB
    if TEMP_DB.exists():
        TEMP_DB.unlink()
        
    old_db_path = DB_PATH
    
    # Temporarily create clean db structure
    conn_new = sqlite3.connect(str(TEMP_DB))
    c_new = conn_new.cursor()
    c_new.execute("PRAGMA journal_mode=WAL;")
    c_new.execute("PRAGMA synchronous=NORMAL;")
    
    # Connect to old db in read-only immutable URI mode
    conn_old = sqlite3.connect(f"file:{DB_PATH.resolve()}?mode=ro", uri=True)
    conn_old.row_factory = sqlite3.Row
    c_old = conn_old.cursor()
    
    # Get all table names
    try:
        c_old.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = c_old.fetchall()
    except Exception as e:
        print(f"[!] Failed to read schema from old DB: {e}")
        tables = []

    for row in tables:
        tname = row["name"]
        tsql = row["sql"]
        if not tsql:
            continue
        try:
            c_new.execute(tsql)
            print(f"[+] Created table: {tname}")
        except Exception as e:
            print(f"[-] Table create err for {tname}: {e}")

    conn_new.commit()

    # Now copy data table by table
    for row in tables:
        tname = row["name"]
        try:
            c_old.execute(f"SELECT * FROM {tname};")
            rows = c_old.fetchall()
            if rows:
                col_names = [d[0] for d in c_old.description]
                placeholders = ", ".join(["?"] * len(col_names))
                cols_str = ", ".join([f'"{c}"' for c in col_names])
                insert_sql = f'INSERT OR IGNORE INTO {tname} ({cols_str}) VALUES ({placeholders})'
                
                c_new.executemany(insert_sql, [tuple(r) for r in rows])
                conn_new.commit()
                print(f"[+] Recovered {len(rows)} rows from '{tname}'")
        except Exception as e:
            print(f"[-] Error recovering table '{tname}': {e}")

    conn_old.close()
    conn_new.close()

    # Verify new DB
    vconn = sqlite3.connect(str(TEMP_DB))
    vc = vconn.cursor()
    vc.execute("PRAGMA integrity_check;")
    chk = vc.fetchall()
    vconn.close()
    print(f"[+] Integrity check on new DB: {chk}")

    if chk == [('ok',)]:
        for ext in ["", "-wal", "-shm"]:
            p = Path(f"data/trading_bot.db{ext}")
            if p.exists():
                p.unlink()
        shutil.move(TEMP_DB, DB_PATH)
        print("[SUCCESS] Pristine database installed successfully!")
    else:
        print("[!] Rebuilt DB failed integrity check.")

if __name__ == "__main__":
    recover_database()
