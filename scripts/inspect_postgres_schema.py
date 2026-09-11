import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src import config
import psycopg

def main():
    if not getattr(config, "IS_POSTGRES", False) or not getattr(config, "DATABASE_URL", None):
        print("ERROR: Postgres not configured.")
        return

    conn = psycopg.connect(config.DATABASE_URL, connect_timeout=15)
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [r[0] for r in cur.fetchall()]
            print("=== POSTGRESQL TABLES IN NEON ===")
            for t in tables:
                print(f" - {t}")
            
            check_tables = [
                'schema_migrations',
                'user_sessions',
                'candles_cache',
                'positions',
                'strategies',
                'bot_instances',
                'trades_log',
                'customers',
                'departments',
                'broker_folders',
                'broker_accounts',
                'capital_ledger',
                'brokerage_expenses_ledger'
            ]
            
            print("\n=== DETAILED TABLE & COLUMN INSPECTION ===")
            for check_t in check_tables:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = %s
                    );
                """, (check_t,))
                exists = cur.fetchone()[0]
                print(f"\n--- TABLE: {check_t} (exists: {exists}) ---")
                if exists:
                    cur.execute("""
                        SELECT column_name, data_type, is_nullable, column_default 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = %s 
                        ORDER BY ordinal_position;
                    """, (check_t,))
                    cols = cur.fetchall()
                    for c in cols:
                        col_name, d_type, is_null, default_val = c
                        safe_default = str(default_val).encode('ascii', 'replace').decode('ascii') if default_val else 'None'
                        print(f"     {col_name} ({d_type}, nullable={is_null}, default={safe_default})")
                    
                    # Indexes
                    cur.execute("""
                        SELECT indexname, indexdef 
                        FROM pg_indexes 
                        WHERE schemaname = 'public' AND tablename = %s;
                    """, (check_t,))
                    idxs = cur.fetchall()
                    print(f"   Indexes ({len(idxs)}):")
                    for idx in idxs:
                        print(f"     {idx[0]}: {idx[1]}")

            # Check pg_stat_activity for any blocking locks or long running queries
            print("\n=== ACTIVE TRANSACTIONS & LOCKS ===")
            cur.execute("""
                SELECT pid, usename, state, query_start, wait_event_type, wait_event, query 
                FROM pg_stat_activity 
                WHERE state != 'idle' AND pid != pg_backend_pid();
            """)
            acts = cur.fetchall()
            print(f"Active non-idle queries ({len(acts)}):")
            for a in acts:
                print(f"  PID {a[0]} ({a[2]}): {a[6][:100] if a[6] else ''} [wait: {a[4]}/{a[5]}]")

if __name__ == "__main__":
    main()
