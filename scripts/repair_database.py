"""
Safe SQLite Database Repair & Salvage Script
============================================
Safely recovers tables, rows, schema, and indexes from a corrupted/malformed
trading_bot.db into a fresh, fully valid, uncorrupted database.

Backs up original database to data/trading_bot.db.bak before performing repair.
"""

import sys
import os
import shutil
import sqlite3
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config
from src import db

def repair():
    db_path = Path(config.DB_PATH).resolve()
    backup_path = db_path.with_suffix(".db.bak")
    recovered_path = db_path.with_suffix(".db.recovered")

    print(f"Original DB: {db_path} (Size: {db_path.stat().st_size:,} bytes)")

    # 1. Create a safe backup of the original database file
    print(f"Creating backup -> {backup_path}")
    shutil.copy2(db_path, backup_path)

    # 2. Open source connection in read-only immutable mode if possible
    src_conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=30.0)
    src_conn.row_factory = sqlite3.Row
    src_cursor = src_conn.cursor()

    # Get all tables
    src_cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = src_cursor.fetchall()
    print(f"Discovered {len(tables)} tables to recover.")

    # 3. Create fresh recovered database
    if recovered_path.exists():
        recovered_path.unlink()

    dst_conn = sqlite3.connect(str(recovered_path), timeout=30.0)
    dst_conn.execute("PRAGMA journal_mode=WAL;")
    dst_conn.execute("PRAGMA synchronous=NORMAL;")
    dst_conn.execute("PRAGMA busy_timeout=30000;")
    dst_cursor = dst_conn.cursor()

    # First, initialize the complete authoritative schema
    print("Initializing authoritative schema in recovered DB...")
    # Initialize basic tables first
    for t_name, create_sql in tables:
        if create_sql:
            try:
                dst_cursor.execute(create_sql)
            except Exception as e:
                pass

    dst_conn.commit()

    total_rows_copied = 0
    # Copy data table by table with error-tolerant row cursor
    for t_row in tables:
        t_name = t_row["name"]
        try:
            src_cursor.execute(f"SELECT * FROM \"{t_name}\"")
            rows = src_cursor.fetchall()
            if not rows:
                print(f"  Table '{t_name}': 0 rows")
                continue

            col_names = list(rows[0].keys())
            placeholders = ",".join(["?"] * len(col_names))
            insert_sql = f"INSERT OR REPLACE INTO \"{t_name}\" ({','.join(col_names)}) VALUES ({placeholders})"

            success_cnt = 0
            for r in rows:
                try:
                    dst_cursor.execute(insert_sql, tuple(r))
                    success_cnt += 1
                except Exception as row_err:
                    pass

            dst_conn.commit()
            total_rows_copied += success_cnt
            print(f"  Table '{t_name}': {success_cnt}/{len(rows)} rows copied successfully")

        except Exception as t_err:
            print(f"  Table '{t_name}' copy error: {t_err}")

    # Copy views and indexes
    src_cursor.execute("SELECT name, sql FROM sqlite_master WHERE type IN ('view', 'index') AND name NOT LIKE 'sqlite_%';")
    objects = src_cursor.fetchall()
    for o_name, o_sql in objects:
        if o_sql:
            try:
                dst_cursor.execute(o_sql)
            except Exception:
                pass

    dst_conn.commit()

    # Integrity check on recovered DB
    dst_cursor.execute("PRAGMA integrity_check;")
    check_res = dst_cursor.fetchall()
    print(f"\nRecovered DB Integrity Check: {check_res}")

    src_conn.close()
    dst_conn.close()

    if check_res == [('ok',)]:
        print("\nIntegrity check PASSED 100% OK! Replacing original corrupted database...")
        # Remove WAL and SHM files
        for suffix in ["-wal", "-shm"]:
            wal_f = Path(str(db_path) + suffix)
            if wal_f.exists():
                try:
                    wal_f.unlink()
                except Exception:
                    pass
        # Replace original with recovered
        shutil.move(str(recovered_path), str(db_path))
        print(f"Database successfully repaired! New DB size: {db_path.stat().st_size:,} bytes, Total rows recovered: {total_rows_copied}")
        return True
    else:
        print(f"Integrity check failed: {check_res}")
        return False

if __name__ == "__main__":
    repair()
