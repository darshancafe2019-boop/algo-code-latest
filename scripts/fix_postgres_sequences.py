import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import psycopg
from src import config

def fix_sequences():
    url = config.DATABASE_MIGRATION_URL or config._CANONICAL_NEON_PG
    print(f"Connecting to: {url[:45]}...")
    conn = psycopg.connect(url, autocommit=True)
    with conn.cursor() as cur:
        # Find all tables in public schema with an id column of type integer/bigint that has NO default
        cur.execute("""
            SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
            FROM information_schema.columns c
            JOIN information_schema.tables t ON c.table_name = t.table_name
            WHERE c.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
              AND c.column_name = 'id'
              AND c.column_default IS NULL
              AND c.data_type IN ('bigint', 'integer', 'smallint');
        """)
        tables = cur.fetchall()
        print(f"Found {len(tables)} tables with missing sequence default on 'id':")
        for table_name, col, dtype, is_null in tables:
            print(f" - {table_name} ({dtype})")
            
        print("\nFixing sequences for these tables...")
        for table_name, col, dtype, is_null in tables:
            seq_name = f"{table_name}_id_seq"
            # Check if sequence already exists
            cur.execute("""
                SELECT 1 FROM information_schema.sequences
                WHERE sequence_schema = 'public' AND sequence_name = %s;
            """, (seq_name,))
            exists = cur.fetchone()
            
            # Find max id
            cur.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table_name};")
            max_id = cur.fetchone()[0]
            start_val = max(1, max_id + 1)
            
            if not exists:
                print(f"Creating sequence {seq_name} starting at {start_val} for {table_name}...")
                cur.execute(f"CREATE SEQUENCE {seq_name} START WITH {start_val};")
            else:
                print(f"Sequence {seq_name} exists, restarting at {start_val}...")
                cur.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH {start_val};")
                
            print(f"Attaching sequence {seq_name} to {table_name}.id...")
            cur.execute(f"ALTER TABLE {table_name} ALTER COLUMN id SET DEFAULT nextval('{seq_name}');")
            try:
                cur.execute(f"ALTER SEQUENCE {seq_name} OWNED BY {table_name}.id;")
            except Exception as e:
                print(f"Warning setting sequence ownership: {e}")
                
        print("\nAll sequences attached successfully!")
        
        # Test inserting into bot_event_audit without specifying id
        print("\nTesting test insert into bot_event_audit...")
        cur.execute("""
            INSERT INTO bot_event_audit (bot_id, event_type, details, severity)
            VALUES ('test-seq-bot', 'SEQUENCE_TEST', '{"test": true}', 'INFO')
            RETURNING id, timestamp;
        """)
        new_row = cur.fetchone()
        print(f"Successfully inserted test row into bot_event_audit! ID: {new_row[0]}, Timestamp: {new_row[1]}")
        
        # Clean up test row
        cur.execute("DELETE FROM bot_event_audit WHERE id = %s;", (new_row[0],))
        print("Cleaned up test row.")

if __name__ == "__main__":
    fix_sequences()
