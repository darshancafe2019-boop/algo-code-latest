#!/usr/bin/env python3
"""
Quant.OS — Email OTP & Auth Tables Migration Script
Creates email_otp_challenges, email_delivery_events, and ensures admin email is synchronized.
"""

import sys
import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src import config, db

def migrate():
    print("=== Running Auth Schema & Admin Sync Migration ===")

    # 1. SQLite Migration
    print(f"[SQLite] Checking {config.DB_PATH}...")
    sq_conn = sqlite3.connect(str(config.DB_PATH))
    sq_cur = sq_conn.cursor()

    sq_cur.execute("""
    CREATE TABLE IF NOT EXISTS email_otp_challenges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        attempt_count INTEGER DEFAULT 0,
        requested_ip TEXT,
        request_id TEXT
    );
    """)
    sq_cur.execute("CREATE INDEX IF NOT EXISTS idx_email_otp_user_purp ON email_otp_challenges(user_id, purpose);")
    sq_cur.execute("CREATE INDEX IF NOT EXISTS idx_email_otp_exp ON email_otp_challenges(expires_at);")
    sq_cur.execute("CREATE INDEX IF NOT EXISTS idx_email_otp_hash ON email_otp_challenges(otp_hash);")

    sq_cur.execute("""
    CREATE TABLE IF NOT EXISTS email_delivery_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        recipient_email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'resend',
        provider_message_id TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'QUEUED',
        error_details TEXT DEFAULT '',
        created_at TEXT NOT NULL
    );
    """)
    sq_cur.execute("CREATE INDEX IF NOT EXISTS idx_email_deliv_rec ON email_delivery_events(recipient_email, created_at DESC);")
    sq_cur.execute("CREATE INDEX IF NOT EXISTS idx_email_deliv_status ON email_delivery_events(status);")

    # Sync admin in SQLite
    sq_cur.execute("SELECT id, username, email FROM users WHERE username = 'admin'")
    admin_row = sq_cur.fetchone()
    if admin_row:
        sq_cur.execute("UPDATE users SET email = 'ashishparadkar1999@gmail.com' WHERE username = 'admin'")
        print(f"[SQLite] Admin email updated from '{admin_row[2]}' to 'ashishparadkar1999@gmail.com'")
    sq_conn.commit()
    sq_conn.close()
    print("[SQLite] Migration complete.")

    # 2. PostgreSQL Migration (if configured)
    if getattr(config, "IS_POSTGRES", False):
        print("[PostgreSQL] Connecting to Neon database...")
        import psycopg
        pg_conn = psycopg.connect(config.DATABASE_MIGRATION_URL or config.DATABASE_URL)
        with pg_conn.cursor() as pg_cur:
            pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS "email_otp_challenges" (
                "id" TEXT PRIMARY KEY,
                "user_id" TEXT NOT NULL,
                "purpose" TEXT NOT NULL,
                "otp_hash" TEXT NOT NULL,
                "created_at" TEXT NOT NULL,
                "expires_at" TEXT NOT NULL,
                "used_at" TEXT,
                "attempt_count" INTEGER DEFAULT 0,
                "requested_ip" TEXT,
                "request_id" TEXT
            );
            """)
            pg_cur.execute('CREATE INDEX IF NOT EXISTS "idx_email_otp_user_purp" ON "email_otp_challenges"("user_id", "purpose");')
            pg_cur.execute('CREATE INDEX IF NOT EXISTS "idx_email_otp_exp" ON "email_otp_challenges"("expires_at");')
            pg_cur.execute('CREATE INDEX IF NOT EXISTS "idx_email_otp_hash" ON "email_otp_challenges"("otp_hash");')

            pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS "email_delivery_events" (
                "id" TEXT PRIMARY KEY,
                "user_id" TEXT,
                "recipient_email" TEXT NOT NULL,
                "purpose" TEXT NOT NULL,
                "provider" TEXT NOT NULL DEFAULT 'resend',
                "provider_message_id" TEXT DEFAULT '',
                "status" TEXT NOT NULL DEFAULT 'QUEUED',
                "error_details" TEXT DEFAULT '',
                "created_at" TEXT NOT NULL
            );
            """)
            pg_cur.execute('CREATE INDEX IF NOT EXISTS "idx_email_deliv_rec" ON "email_delivery_events"("recipient_email", "created_at" DESC);')
            pg_cur.execute('CREATE INDEX IF NOT EXISTS "idx_email_deliv_status" ON "email_delivery_events"("status");')

            # Grant permissions to app role
            try:
                pg_cur.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO quantos_app;")
            except Exception as e:
                print(f"[PostgreSQL] Role grant note: {e}")

            # Sync admin in PostgreSQL
            pg_cur.execute("SELECT id, username, email FROM users WHERE username = 'admin'")
            pg_admin = pg_cur.fetchone()
            if pg_admin:
                pg_cur.execute("UPDATE users SET email = 'ashishparadkar1999@gmail.com' WHERE username = 'admin'")
                print(f"[PostgreSQL] Admin email updated from '{pg_admin[2]}' to 'ashishparadkar1999@gmail.com'")
            pg_conn.commit()
        pg_conn.close()
        print("[PostgreSQL] Migration complete.")

    print("=== Migration Finished Successfully ===")

if __name__ == "__main__":
    migrate()
