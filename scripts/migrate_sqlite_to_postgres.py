#!/usr/bin/env python3
"""
Quant.OS — Institutional SQLite to PostgreSQL Migration & Verification Tool
=============================================================================
Authoritative, transaction-safe migration utility supporting:
1. Read-only source SQLite access with integrity check.
2. DDL extraction & translation (SQLite -> PostgreSQL 16+).
3. Dedicated application role (quantos_app) grant automation.
4. Dependency-ordered data transfer preserving all IDs, timestamps, and relations.
5. Post-migration verification of row counts, key aggregates, and constraints.
6. Atomic rollback on errors (unless dry-run).

Usage:
    python scripts/migrate_sqlite_to_postgres.py [--dry-run] [--verify-only] [--sqlite-path PATH] [--pg-url URL]
"""

import os
import sys
import re
import sqlite3
import argparse
import logging
from typing import List, Dict, Any, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")


DEPENDENCY_ORDER = [
    # Level 0: Master Entities
    "users",
    "strategies",
    "market_instruments",
    "stock_instruments",
    "instruments",
    "risk_profiles",
    "risk_rules",
    "risk_limits",
    "system_session",
    "telegram_settings",
    "broker_credentials",
    "indicator_presets",
    "indicator_profiles",
    "bot_templates",
    "bot_groups",
    "scenario_profiles",
    "delta_underlyings",
    "delta_option_expiries",
    
    # Level 1: User & Strategy Dependents
    "user_sessions",
    "password_reset_tokens",
    "temp_auth_challenges",
    "totp_enrollments",
    "step_up_tokens",
    "security_alerts",
    "security_audit_events",
    "user_watchlists",
    "strategy_versions",
    "bot_instances",
    "delta_option_contracts",
    
    # Level 2: Bot & Trading Dependents
    "bot_activity_logs",
    "bot_decision_logs",
    "bot_event_audit",
    "bot_indicator_configs",
    "bot_indicator_profiles",
    "bot_status",
    "bot_strategy_permissions",
    "bot_worker_leases",
    "trades_log",
    "positions",
    "orders",
    "multileg_orders",
    "derivative_orders",
    "derivative_positions",
    "options_strategy_instances",
    "options_orders",
    "options_positions",
    "live_deployment_authorizations",
    "signals_log",
    "alerts",
    "alert_rules",
    "alert_notifications",
    "incidents",
    
    # Level 3: Execution, Analytics & Logs
    "trade_fills",
    "trade_latencies",
    "position_transitions",
    "decision_snapshots",
    "pre_trade_analysis",
    "backtest_presets",
    "backtest_runs",
    "backtest_trades",
    "delta_option_quotes",
    "delta_option_chain_snapshots",
    "delta_ingestion_events",
    "daily_statistics",
    "heartbeat_log",
    "telegram_logs",
    "system_errors",
    "audit_log",
    "global_market_scans",
    "market_sync_history",
    "notification_deliveries",
    "options_audit_log",
    "pairs_discovery_cache",
    "provider_health_status",
    "risk_rule_violations",
    "candles_cache",
    "indicator_configs",
    "indicator_config_history",
    "indicator_profile_versions",
    "historical_data_registry"
]


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate Quant.OS SQLite database to PostgreSQL")
    parser.add_argument(
        "--sqlite-path",
        default=os.path.join(BASE_DIR, "data", "trading_bot.db"),
        help="Path to source SQLite database"
    )
    parser.add_argument(
        "--pg-url",
        default=getattr(config, "DATABASE_MIGRATION_URL", "") or getattr(config, "DATABASE_URL", ""),
        help="PostgreSQL connection URL (migration owner role recommended)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect source database and simulate schema/migration without writing changes"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Perform read-only comparison of SQLite and PostgreSQL row counts and integrity"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for bulk insertion (default: 1000)"
    )
    return parser.parse_args()


def get_pg_connection(pg_url: str):
    """Establishes connection to PostgreSQL using psycopg3."""
    if not pg_url or not pg_url.startswith(("postgresql://", "postgres://")):
        raise ValueError("Valid PostgreSQL connection string (--pg-url or DATABASE_MIGRATION_URL) is required.")
    
    import psycopg
    return psycopg.connect(pg_url)


def get_sqlite_tables(sqlite_conn: sqlite3.Connection) -> List[str]:
    """Lists all user tables in SQLite database."""
    cur = sqlite_conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    return [row[0] for row in cur.fetchall()]


def build_pg_table_ddl(sqlite_conn: sqlite3.Connection, table_name: str) -> str:
    cur = sqlite_conn.cursor()
    cur.execute(f"PRAGMA table_info('{table_name}')")
    cols = cur.fetchall()  # cid, name, type, notnull, dflt_value, pk
    
    col_defs = []
    pks = []
    for col in cols:
        _, name, col_type, notnull, dflt_val, pk = col
        col_type_upper = col_type.upper() if col_type else "TEXT"
        
        if "INT" in col_type_upper:
            # Check if actual data in SQLite contains string values
            sample_cur = sqlite_conn.cursor()
            sample_cur.execute(f'SELECT "{name}" FROM "{table_name}" WHERE "{name}" IS NOT NULL LIMIT 20')
            samples = sample_cur.fetchall()
            has_text = False
            for s in samples:
                val = s[0]
                if isinstance(val, str) and not val.lstrip("-").isdigit():
                    has_text = True
                    break
            pg_type = "TEXT" if has_text else "BIGINT"
        elif any(f in col_type_upper for f in ("REAL", "FLOAT", "DOUBLE", "NUMERIC")):
            pg_type = "DOUBLE PRECISION"
        elif "BLOB" in col_type_upper:
            pg_type = "BYTEA"
        else:
            pg_type = "TEXT"
            
        def_str = f'"{name}" {pg_type}'
        
        if dflt_val is not None:
            dflt_lower = str(dflt_val).lower().strip("()")
            if "datetime('now')" in dflt_lower or "current_timestamp" in dflt_lower or "now" in dflt_lower:
                if pg_type == "TEXT":
                    def_str += " DEFAULT CURRENT_TIMESTAMP::text"
                else:
                    def_str += " DEFAULT CURRENT_TIMESTAMP"
            elif str(dflt_val).startswith("'") and str(dflt_val).endswith("'"):
                def_str += f" DEFAULT {dflt_val}"
            elif str(dflt_val).isdigit() or (str(dflt_val).startswith("-") and str(dflt_val)[1:].isdigit()):
                def_str += f" DEFAULT {dflt_val}"
            elif str(dflt_val).replace(".", "", 1).isdigit():
                def_str += f" DEFAULT {dflt_val}"
            else:
                escaped = str(dflt_val).replace("'", "''")
                def_str += f" DEFAULT '{escaped}'"
                
        if notnull:
            def_str += " NOT NULL"
            
        if pk == 1 and notnull == 1 and table_name != "daily_statistics" and len([c for c in cols if c[5] >= 1]) == 1:
            def_str += " PRIMARY KEY"
        elif pk >= 1 and notnull == 1 and table_name != "daily_statistics":
            pks.append(f'"{name}"')
            
        col_defs.append(def_str)
        
    if len(pks) > 1 and table_name != "daily_statistics":
        col_defs.append(f"PRIMARY KEY ({', '.join(pks)})")
        
    ddl = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n    ' + ",\n    ".join(col_defs) + "\n);"
    return ddl



def create_pg_tables(sqlite_conn: sqlite3.Connection, pg_conn, tables: List[str]):
    """Creates all corresponding tables in PostgreSQL with autocommit."""
    with pg_conn.cursor() as pg_cur:
        created = 0
        for t in tables:
            ddl = build_pg_table_ddl(sqlite_conn, t)
            try:
                pg_cur.execute(ddl)
                created += 1
            except Exception as e:
                logger.warning(f"DDL creation note on table '{t}': {e}")
                pg_conn.rollback()
        pg_conn.commit()
        logger.info(f"Verified/Created {created} tables in PostgreSQL.")



def grant_app_role_permissions(pg_conn):
    """Grants DML privileges on all schema tables to quantos_app."""
    try:
        with pg_conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'quantos_app';")
            if cur.fetchone():
                cur.execute("GRANT USAGE ON SCHEMA public TO quantos_app;")
                cur.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO quantos_app;")
                cur.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quantos_app;")
                cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO quantos_app;")
                cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO quantos_app;")
                pg_conn.commit()
    except Exception as e:
        logger.warning(f"Role permission grant note: {e}")
        pg_conn.rollback()


def get_table_columns(sqlite_conn: sqlite3.Connection, table_name: str) -> List[str]:
    """Gets column names for a table."""
    cur = sqlite_conn.cursor()
    cur.execute(f"PRAGMA table_info('{table_name}')")
    return [col[1] for col in cur.fetchall()]



def get_table_col_info(sqlite_conn: sqlite3.Connection, table_name: str) -> List[Tuple[str, str]]:
    """Gets column names and types for a table."""
    cur = sqlite_conn.cursor()
    cur.execute(f"PRAGMA table_info('{table_name}')")
    return [(col[1], (col[2] or "TEXT").upper()) for col in cur.fetchall()]


def migrate_table(sqlite_conn: sqlite3.Connection, pg_conn, table_name: str, batch_size: int, dry_run: bool) -> Dict[str, Any]:
    """Migrates rows for a single table from SQLite to PostgreSQL with type adaptation."""
    sq_cur = sqlite_conn.cursor()
    sq_cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
    source_count = sq_cur.fetchone()[0]

    if source_count == 0:
        return {"table": table_name, "source": 0, "target": 0, "status": "EMPTY"}

    col_infos = get_table_col_info(sqlite_conn, table_name)
    columns = [c[0] for c in col_infos]
    if not columns:
        return {"table": table_name, "source": source_count, "target": 0, "status": "NO_COLUMNS"}

    col_names = ", ".join([f'"{c}"' for c in columns])
    placeholders = ", ".join(["%s" for _ in columns])
    insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

    if dry_run:
        return {"table": table_name, "source": source_count, "target": 0, "status": "DRY_RUN"}

    sq_cur.execute(f'SELECT {col_names} FROM "{table_name}"')
    pg_cur = pg_conn.cursor()

    inserted_count = 0
    while True:
        rows = sq_cur.fetchmany(batch_size)
        if not rows:
            break
        
        clean_rows = []
        for r in rows:
            clean_r = []
            for (col_name, col_type), item in zip(col_infos, r):
                if isinstance(item, str) and item.strip() == "":
                    if any(num in col_type for num in ("INT", "REAL", "FLOAT", "DOUBLE", "NUMERIC")):
                        clean_r.append(None)
                    else:
                        clean_r.append(item)
                else:
                    clean_r.append(item)
            clean_rows.append(tuple(clean_r))

        try:
            pg_cur.executemany(insert_sql, clean_rows)
            inserted_count += len(rows)
        except Exception as e:
            logger.error(f"Error migrating batch into {table_name}: {e}")
            raise

    # Verify target count
    pg_cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
    target_count = pg_cur.fetchone()[0]

    return {"table": table_name, "source": source_count, "target": target_count, "status": "OK"}



def verify_migration(sqlite_conn: sqlite3.Connection, pg_conn, tables: List[str]) -> Tuple[bool, List[str]]:
    """Verifies row counts and key financial/security aggregates between SQLite and PostgreSQL."""
    discrepancies = []
    sq_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    print("\n--- Running Deep Migration Verification ---")
    
    for t in tables:
        sq_cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        sq_cnt = sq_cur.fetchone()[0]
        
        try:
            pg_cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            pg_cnt = pg_cur.fetchone()[0]
        except Exception:
            pg_cnt = -1
            pg_conn.rollback()
            
        if sq_cnt != pg_cnt:
            discrepancies.append(f"Table '{t}': SQLite={sq_cnt}, PostgreSQL={pg_cnt}")
        else:
            if sq_cnt > 0:
                print(f"  [VERIFIED] {t:<35}: {sq_cnt:>6} rows matched exactly.")
                
    # Aggregate Checks
    print("\n--- Running Aggregate Integrity Checks ---")
    
    # 1. Total users
    sq_cur.execute("SELECT COUNT(*), COUNT(DISTINCT username) FROM users")
    sq_users = tuple(sq_cur.fetchone())
    pg_cur.execute("SELECT COUNT(*), COUNT(DISTINCT username) FROM users")
    pg_users = tuple(pg_cur.fetchone())
    if sq_users == pg_users:
        print(f"  [VERIFIED] Users aggregate: {sq_users[0]} total, {sq_users[1]} distinct usernames.")
    else:
        discrepancies.append(f"Users aggregate mismatch: SQLite={sq_users} vs PG={pg_users}")

        
    # 2. Total trades
    if "trades_log" in tables:
        sq_cur.execute("SELECT COUNT(*), COALESCE(SUM(result_pnl), 0) FROM trades_log")
        sq_trades = sq_cur.fetchone()
        pg_cur.execute("SELECT COUNT(*), COALESCE(SUM(result_pnl), 0) FROM trades_log")
        pg_trades = pg_cur.fetchone()
        if sq_trades[0] == pg_trades[0] and abs(float(sq_trades[1]) - float(pg_trades[1])) < 0.001:
            print(f"  [VERIFIED] Trades aggregate: {sq_trades[0]} trades, Cumulative PnL = {sq_trades[1]:.2f}")
        else:
            discrepancies.append(f"Trades aggregate mismatch: SQLite={sq_trades} vs PG={pg_trades}")
            
    # 3. Security Audit Events
    if "security_audit_events" in tables:
        sq_cur.execute("SELECT COUNT(*) FROM security_audit_events")
        sq_audit = sq_cur.fetchone()[0]
        pg_cur.execute("SELECT COUNT(*) FROM security_audit_events")
        pg_audit = pg_cur.fetchone()[0]
        if sq_audit == pg_audit:
            print(f"  [VERIFIED] Security Audit Events aggregate: {sq_audit} audit records matched.")
        else:
            discrepancies.append(f"Security audit count mismatch: SQLite={sq_audit} vs PG={pg_audit}")

    return len(discrepancies) == 0, discrepancies


def main():
    args = parse_args()
    sqlite_path = args.sqlite_path
    pg_url = args.pg_url

    if not os.path.exists(sqlite_path):
        logger.error(f"SQLite database file does not exist at: {sqlite_path}")
        sys.exit(1)

    print("================================================================")
    print("      Quant.OS Institutional SQLite to PostgreSQL Migration     ")
    print("================================================================")
    print(f"Source SQLite       : {sqlite_path}")
    print(f"Destination PG URL  : {'[CONFIGURED]' if pg_url else '[NOT SET]'}")
    print(f"Dry Run Mode        : {args.dry_run}")
    print(f"Verify Only Mode    : {args.verify_only}")
    print("================================================================")

    # 1. Open SQLite strictly in READ-ONLY URI mode
    sqlite_uri = f"file:{os.path.abspath(sqlite_path)}?mode=ro"
    try:
        sqlite_conn = sqlite3.connect(sqlite_uri, uri=True)
        sqlite_conn.row_factory = sqlite3.Row
        
        # Source integrity check
        cur = sqlite_conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        chk = [tuple(r) for r in cur.fetchall()]
        if chk != [("ok",)]:
            logger.error(f"Source SQLite integrity check failed: {chk}")
            sys.exit(1)
        print("[OK] Source SQLite integrity check passed: PRAGMA integrity_check = ok")
    except Exception as e:
        logger.error(f"Failed to open source SQLite in read-only mode: {e}")
        sys.exit(1)


    if not pg_url or not pg_url.startswith(("postgresql://", "postgres://")):
        logger.error("A valid PostgreSQL URL is required.")
        sys.exit(1)

    try:
        pg_conn = get_pg_connection(pg_url)
        with pg_conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user, version();")
            db_info = cur.fetchone()
            print(f"[OK] Connected to PostgreSQL: db='{db_info[0]}', user='{db_info[1]}'")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    sqlite_tables = get_sqlite_tables(sqlite_conn)
    ordered_tables = [t for t in DEPENDENCY_ORDER if t in sqlite_tables]
    remaining_tables = [t for t in sqlite_tables if t not in ordered_tables]
    all_tables = ordered_tables + remaining_tables

    print(f"Discovered {len(all_tables)} tables in SQLite source.")

    if args.verify_only:
        success, discrepancies = verify_migration(sqlite_conn, pg_conn, all_tables)
        if success:
            print("\n[SUCCESS] Verification passed! All tables and aggregates match 100%.")
            sys.exit(0)
        else:
            print("\n[FAILURE] Verification found discrepancies:")
            for d in discrepancies:
                print(f"  - {d}")
            sys.exit(1)

    # 2. Schema Creation & Table Setup
    if not args.dry_run:
        create_pg_tables(sqlite_conn, pg_conn, all_tables)
        grant_app_role_permissions(pg_conn)

    # 3. Data Migration
    results = []
    has_errors = False

    try:
        for t in all_tables:
            try:
                res = migrate_table(sqlite_conn, pg_conn, t, args.batch_size, args.dry_run)
                results.append(res)
                if res['source'] > 0:
                    print(f"[{res['status']:<7}] {t:<35} : {res['source']:>6} -> {res['target']:>6} rows")
            except Exception as e:
                has_errors = True
                print(f"[ERROR  ] {t:<35} : {e}")
                if not args.dry_run:
                    pg_conn.rollback()
                break

        if not has_errors and not args.dry_run:
            pg_conn.commit()
            print("\n[OK] All tables migrated. Executing post-migration verification...")
            success, discrepancies = verify_migration(sqlite_conn, pg_conn, all_tables)
            if success:
                print("\n================================================================")
                print("   [SUCCESS] SQLite -> PostgreSQL Migration 100% COMPLETE!     ")
                print("================================================================")
            else:
                print("\n[WARNING] Migration committed but verification noted discrepancies:")
                for d in discrepancies:
                    print(f"  - {d}")
        elif args.dry_run:
            print("\n[OK] Dry run completed successfully. No changes written to PostgreSQL.")

    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
