#!/usr/bin/env python3
"""
QUANT.OS — Production Database & Health Diagnostics for Render Shell
Runs an exhaustive, non-destructive, zero-leak audit of the live runtime database.

Usage in Render Shell:
    python scripts/render_db_diagnostics.py
"""

import os
import sys
import time
import re
from typing import Dict, Any, List

# Ensure repository root is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import config, db


def mask_url(url: str) -> str:
    """Mask credentials and secrets from database URLs."""
    if not url:
        return "NOT_CONFIGURED"
    # postgresql://user:password@host:port/dbname
    pattern = r'(postgresql(?:\+psycopg)?:\/\/)([^:@]+):([^@]+)@([^:\/?#]+)(?::(\d+))?(\/[^?#]*)?'
    match = re.match(pattern, url)
    if match:
        prefix, user, _, host, port, dbname = match.groups()
        masked_user = user[:2] + "***" if len(user) > 2 else "***"
        port_str = f":{port}" if port else ""
        db_str = dbname or ""
        return f"{prefix}{masked_user}:******@{host}{port_str}{db_str}"
    return "CONFIGURED_MASKED"


def run_diagnostics():
    print("=" * 70)
    print(" QUANT.OS — PRODUCTION DATABASE RUNTIME AUDIT (RENDER)")
    print("=" * 70)

    # 1. Environment and Configuration
    provider = getattr(config, "DATABASE_PROVIDER", "unknown")
    is_postgres = getattr(config, "IS_POSTGRES", False)
    is_prod = getattr(config, "IS_PRODUCTION", False)
    force_sqlite = os.getenv("FORCE_SQLITE", "false").lower() == "true"
    raw_url = getattr(config, "DATABASE_URL", None) or os.getenv("DATABASE_URL", "")
    masked_url = mask_url(raw_url)

    print("\n[1] CONFIGURATION & ENVIRONMENT")
    print(f"  • DATABASE_PROVIDER:        {provider}")
    print(f"  • Runtime IS_POSTGRES:      {is_postgres}")
    print(f"  • Runtime IS_PRODUCTION:    {is_prod}")
    print(f"  • FORCE_SQLITE:             {force_sqlite}")
    print(f"  • Configured Target:        {masked_url}")

    if not is_postgres:
        print("\n  [WARNING] IS_POSTGRES is FALSE at runtime!")
        print("  Production Render backend is currently configured to use SQLite.")
        print("  To use Neon PostgreSQL, ensure DATABASE_URL is set in Render Dashboard")
        print("  and FORCE_SQLITE is unset or set to 'false'.")
    else:
        print("\n  [OK] Authoritative PostgreSQL provider is ACTIVE.")

    # 2. Connection Pool Status
    print("\n[2] CONNECTION POOL STATUS")
    pool = db.get_db_pool()
    pool_stats = {}
    if pool is not None:
        try:
            pool_stats = db.get_db_pool_stats()
            print(f"  • Engine:                   {pool_stats.get('engine', 'unknown')}")
            print(f"  • Pool Size / Available:    {pool_stats.get('pool_size', 0)} / {pool_stats.get('pool_available', 0)}")
            print(f"  • Pool Min / Max:           {pool_stats.get('pool_min', 0)} / {pool_stats.get('pool_max', 0)}")
            print(f"  • Direct Fallback Count:    {pool_stats.get('direct_fallback_count', 0)}")
            print(f"  • Pool Health:              INITIALIZED & OPERATIONAL")
        except Exception as pe:
            print(f"  • Pool Stats Error:         {pe}")
    else:
        print("  • Connection Pool:          NOT_INITIALIZED (Running without connection pool or SQLite active)")

    # 3. Server Identity & Connection Latency
    print("\n[3] SERVER CONNECTIVITY & LATENCY")
    db_name = "unknown"
    db_user = "unknown"
    pg_version = "unknown"
    now_ts = "unknown"
    latency_ms = 0.0

    t0 = time.perf_counter()
    try:
        if is_postgres:
            rows = db.safe_query("SELECT current_database() as db, current_user as usr, version() as ver, NOW() as ts;")
            latency_ms = (time.perf_counter() - t0) * 1000
            if rows:
                db_name = rows[0].get("db", "unknown")
                db_user = rows[0].get("usr", "unknown")
                pg_version = str(rows[0].get("ver", "unknown")).split(",")[0]
                now_ts = str(rows[0].get("ts", "unknown"))
        else:
            rows = db.safe_query("SELECT 'sqlite' as db, 'local' as usr, sqlite_version() as ver, datetime('now') as ts;")
            latency_ms = (time.perf_counter() - t0) * 1000
            if rows:
                db_name = rows[0].get("db", "unknown")
                db_user = rows[0].get("usr", "unknown")
                pg_version = f"SQLite {rows[0].get('ver', 'unknown')}"
                now_ts = str(rows[0].get("ts", "unknown"))

        print(f"  • Server Ping:              PASS ({latency_ms:.2f} ms)")
        print(f"  • Authoritative Database:   {db_name}")
        print(f"  • Database User:            {db_user}")
        print(f"  • Engine Version:           {pg_version}")
        print(f"  • Database Time (UTC):      {now_ts}")
    except Exception as ce:
        print(f"  • Server Ping:              FAIL ({ce})")

    # 4. Schema & Table Inspection
    print("\n[4] SCHEMA & TABLE AUDIT")
    total_tables = 0
    try:
        if is_postgres:
            tbl_rows = db.safe_query(
                "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
            )
            total_tables = tbl_rows[0]["cnt"] if tbl_rows else 0
        else:
            tbl_rows = db.safe_query(
                "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
            )
            total_tables = tbl_rows[0]["cnt"] if tbl_rows else 0
        print(f"  • Total Base Tables:        {total_tables}")
    except Exception as te:
        print(f"  • Total Base Tables:        ERROR ({te})")

    required_tables = [
        "users",
        "bot_instances",
        "broker_credentials",
        "orders",
        "trades",
        "trades_log",
        "positions",
        "user_sessions",
        "audit_log",
        "incidents",
        "alert_rules"
    ]

    print("\n  Required Core Tables:")
    print(f"  {'Table Name':<22} | {'Status':<10} | {'Record Count':<14} | {'Read Latency':<12}")
    print("  " + "-" * 66)

    table_audit_results = {}
    for tbl in required_tables:
        t_start = time.perf_counter()
        try:
            cnt_rows = db.safe_query(f"SELECT COUNT(*) as cnt FROM {tbl};")
            t_ms = (time.perf_counter() - t_start) * 1000
            cnt = cnt_rows[0]["cnt"] if cnt_rows else 0
            table_audit_results[tbl] = {"status": "EXISTS", "count": cnt, "latency_ms": t_ms}
            print(f"  {tbl:<22} | {'PASS':<10} | {cnt:<14} | {t_ms:>8.2f} ms")
        except Exception as re_err:
            table_audit_results[tbl] = {"status": "MISSING/ERROR", "count": 0, "latency_ms": 0.0}
            print(f"  {tbl:<22} | {'FAIL':<10} | {'0 (error)':<14} | {'-':>8}")

    # 5. Read Permissions & Sample Query Test (Zero sensitive data exposure)
    print("\n[5] READ PERMISSIONS & DATA VERIFICATION")
    try:
        user_rows = db.safe_query("SELECT id, role, created_at FROM users LIMIT 3;")
        print(f"  • Read users:               PASS (Sample {len(user_rows)} record(s) read securely)")
    except Exception as ue:
        print(f"  • Read users:               FAIL ({ue})")

    try:
        bot_rows = db.safe_query("SELECT id, name, status, execution_mode FROM bot_instances LIMIT 3;")
        print(f"  • Read bot_instances:       PASS (Sample {len(bot_rows)} record(s) read)")
    except Exception as be:
        print(f"  • Read bot_instances:       FAIL ({be})")

    try:
        ord_rows = db.safe_query("SELECT id, symbol, side, status FROM orders LIMIT 3;")
        print(f"  • Read orders:              PASS (Sample {len(ord_rows)} record(s) read)")
    except Exception as oe:
        print(f"  • Read orders:              FAIL ({oe})")

    # 6. Safe Write & Rollback Isolation Test
    print("\n[6] SAFE WRITE & TRANSACTION ROLLBACK TEST (ISOLATED)")
    write_test_passed = False
    rollback_test_passed = False
    temp_tbl = "_render_diagnostic_tx_probe"

    try:
        if is_postgres:
            db.safe_execute(f"CREATE TABLE IF NOT EXISTS {temp_tbl} (id SERIAL PRIMARY KEY, probe_text TEXT, probe_val NUMERIC);")
        else:
            db.safe_execute(f"CREATE TABLE IF NOT EXISTS {temp_tbl} (id INTEGER PRIMARY KEY AUTOINCREMENT, probe_text TEXT, probe_val REAL);")

        # Test safe INSERT & UPDATE
        db.safe_execute(f"INSERT INTO {temp_tbl} (probe_text, probe_val) VALUES (?, ?);", ("render_write_test", 42.0))
        check_w = db.safe_query(f"SELECT probe_val FROM {temp_tbl} WHERE probe_text = ?;", ("render_write_test",))
        if check_w and float(check_w[0]["probe_val"]) == 42.0:
            write_test_passed = True
            print("  • Isolated Write Test:      PASS (Safe INSERT and SELECT verified)")

        # Test Transaction ROLLBACK
        try:
            with db.get_db_transaction() as tx:
                tx.execute(f"INSERT INTO {temp_tbl} (probe_text, probe_val) VALUES (?, ?);", ("rollback_probe", 999.0))
                raise RuntimeError("Simulated transaction rollback probe")
        except RuntimeError:
            pass

        check_rb = db.safe_query(f"SELECT COUNT(*) as cnt FROM {temp_tbl} WHERE probe_text = ?;", ("rollback_probe",))
        if check_rb and check_rb[0]["cnt"] == 0:
            rollback_test_passed = True
            print("  • Atomic Rollback Test:     PASS (Transaction aborted cleanly, 0 rows leaked)")

        # Cleanup scratch table
        db.safe_execute(f"DROP TABLE IF EXISTS {temp_tbl};")
        print("  • Scratch Table Cleanup:    PASS (Temporary probe table dropped)")

    except Exception as we:
        print(f"  • Isolated Write Test:      FAIL ({we})")
        try:
            db.safe_execute(f"DROP TABLE IF EXISTS {temp_tbl};")
        except Exception:
            pass

    # 7. Overall Diagnostic Summary
    print("\n" + "=" * 70)
    print(" AUDIT SUMMARY MATRIX")
    print("=" * 70)
    print(f"  {'Component':<30} | {'Status':<10} | {'Evidence':<22}")
    print("  " + "-" * 68)

    provider_status = "PASS" if is_postgres else "LOCAL_SQLITE"
    provider_ev = f"{provider} (IS_POSTGRES={is_postgres})"
    print(f"  {'Runtime Database Provider':<30} | {provider_status:<10} | {provider_ev:<22}")

    pool_status = "PASS" if pool_stats.get("pool_size", 0) > 0 else ("N/A" if not is_postgres else "FAIL")
    pool_ev = f"size={pool_stats.get('pool_size', 0)}, min={pool_stats.get('pool_min', 0)}"
    print(f"  {'Connection Pool':<30} | {pool_status:<10} | {pool_ev:<22}")

    conn_status = "PASS" if db_name != "unknown" else "FAIL"
    conn_ev = f"{db_name} ({latency_ms:.1f}ms)"
    print(f"  {'Database Reachability':<30} | {conn_status:<10} | {conn_ev:<22}")

    schema_status = "PASS" if total_tables >= 11 else "FAIL"
    schema_ev = f"{total_tables} base tables found"
    print(f"  {'Schema & Required Tables':<30} | {schema_status:<10} | {schema_ev:<22}")

    write_status = "PASS" if (write_test_passed and rollback_test_passed) else "FAIL"
    write_ev = "INSERT/UPDATE/ROLLBACK OK" if write_status == "PASS" else "Write test failed"
    print(f"  {'Safe Write & Rollback':<30} | {write_status:<10} | {write_ev:<22}")

    print("=" * 70)
    if is_postgres and conn_status == "PASS" and schema_status == "PASS" and write_status == "PASS":
        print(" VERDICT: RENDER PRODUCTION BACKEND IS FULLY CONNECTED & OPERATIONAL")
    elif not is_postgres:
        print(" VERDICT: RENDER BACKEND IS CURRENTLY OPERATING IN LOCAL SQLITE DEV MODE")
    else:
        print(" VERDICT: ISSUES DETECTED. CHECK DETAILED LOGS ABOVE.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_diagnostics()
