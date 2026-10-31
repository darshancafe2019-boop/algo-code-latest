"""
Unit & Integration Tests for:
1. PostgreSQL view creation when view does not exist.
2. PostgreSQL view creation when view already exists.
3. SQLite initialization and view creation.
4. Repeated init_db() idempotency.
5. Bootstrap/admin initialization.
6. SQL translation layer for CREATE VIEW IF NOT EXISTS and reserved keywords.
"""

import os
import sys
import pytest

# Ensure repository root is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import config, db
from src.security_auth import global_auth_manager


def test_sql_translation_layer_create_view():
    """Verify translate_sqlite_sql_to_postgres converts CREATE VIEW IF NOT EXISTS to CREATE OR REPLACE VIEW."""
    sql_input = "CREATE VIEW IF NOT EXISTS trade_history AS SELECT * FROM trades_log"
    translated = db.translate_sqlite_sql_to_postgres(sql_input)
    assert "CREATE OR REPLACE VIEW trade_history AS SELECT * FROM trades_log" in translated
    assert "IF NOT EXISTS" not in translated


def test_sql_translation_layer_reserved_keywords():
    """Verify translate_sqlite_sql_to_postgres quotes PostgreSQL reserved keywords like 'user' in DDL."""
    sql_input = "CREATE TABLE assistant_commands (command_id TEXT, user TEXT NOT NULL DEFAULT 'Operator')"
    translated = db.translate_sqlite_sql_to_postgres(sql_input)
    assert '"user" TEXT' in translated


def test_sqlite_initialization_and_view():
    """Verify SQLite view creation and init_db behavior."""
    # Ensure SQLite mode
    config.IS_POSTGRES = False
    os.environ["FORCE_SQLITE"] = "true"

    conn = db.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DROP VIEW IF EXISTS test_trade_history_view")
        cursor.execute("CREATE VIEW IF NOT EXISTS test_trade_history_view AS SELECT * FROM trades_log")
        conn.commit()

        cursor.execute("SELECT COUNT(*) as cnt FROM test_trade_history_view")
        row = cursor.fetchone()
        assert row is not None
        assert row["cnt"] >= 0

        # Cleanup
        cursor.execute("DROP VIEW IF EXISTS test_trade_history_view")
        conn.commit()
    finally:
        conn.close()


def test_repeated_init_db_idempotency_sqlite():
    """Verify repeated init_db calls are idempotent and non-destructive on SQLite."""
    config.IS_POSTGRES = False
    os.environ["FORCE_SQLITE"] = "true"

    # Call init_db multiple times
    db.init_db(force=False)
    db.init_db(force=True)
    db.init_db(force=False)

    # Verify database remains healthy and accessible
    users = db.safe_query("SELECT COUNT(*) as cnt FROM users")
    assert users and users[0]["cnt"] > 0


def test_bootstrap_admin_initialization():
    """Verify bootstrap_default_admin_if_needed creates or verifies admin user without error."""
    admin_user = global_auth_manager.bootstrap_default_admin_if_needed()
    # Should either return the bootstrapped admin or None if already exists
    verified = db.get_user_by_username("admin")
    assert verified is not None
    assert verified["role"] == "ADMIN"


@pytest.mark.skipif(
    not getattr(config, "_CANONICAL_NEON_PG", None),
    reason="Canonical Neon PostgreSQL URL not configured"
)
def test_postgres_view_creation_when_not_exists():
    """Verify PostgreSQL view creation when view does not exist."""
    orig_is_pg = getattr(config, "IS_POSTGRES", False)
    orig_url = getattr(config, "DATABASE_URL", None)
    orig_force = os.environ.get("FORCE_SQLITE")

    try:
        config.IS_POSTGRES = True
        os.environ["FORCE_SQLITE"] = "false"
        config.DATABASE_URL = config._CANONICAL_NEON_PG

        with db.get_authoritative_connection() as conn:
            # 1. Drop test view if exists
            conn.execute("DROP VIEW IF EXISTS _test_audit_view;")

            # 2. Create view when it does not exist using translation layer
            conn.execute("CREATE VIEW IF NOT EXISTS _test_audit_view AS SELECT id, symbol, side FROM orders;")

            # 3. Query view
            cur = conn.execute("SELECT COUNT(*) as cnt FROM _test_audit_view;")
            row = cur.fetchone()
            assert row is not None
            assert row["cnt"] > 0

            # 4. Clean up
            conn.execute("DROP VIEW IF EXISTS _test_audit_view;")
    finally:
        config.IS_POSTGRES = orig_is_pg
        config.DATABASE_URL = orig_url
        if orig_force is not None:
            os.environ["FORCE_SQLITE"] = orig_force


@pytest.mark.skipif(
    not getattr(config, "_CANONICAL_NEON_PG", None),
    reason="Canonical Neon PostgreSQL URL not configured"
)
def test_postgres_view_creation_when_already_exists():
    """Verify PostgreSQL view creation/replacement when view already exists (CREATE OR REPLACE VIEW)."""
    orig_is_pg = getattr(config, "IS_POSTGRES", False)
    orig_url = getattr(config, "DATABASE_URL", None)
    orig_force = os.environ.get("FORCE_SQLITE")

    try:
        config.IS_POSTGRES = True
        os.environ["FORCE_SQLITE"] = "false"
        config.DATABASE_URL = config._CANONICAL_NEON_PG

        with db.get_authoritative_connection() as conn:
            # 1. First creation
            conn.execute("CREATE OR REPLACE VIEW trade_history AS SELECT * FROM trades_log;")

            # 2. Second creation (idempotent replace)
            conn.execute("CREATE OR REPLACE VIEW trade_history AS SELECT * FROM trades_log;")

            # 3. Query authoritative view
            cur = conn.execute("SELECT COUNT(*) as cnt FROM trade_history;")
            row = cur.fetchone()
            assert row is not None
            assert row["cnt"] >= 0
    finally:
        config.IS_POSTGRES = orig_is_pg
        config.DATABASE_URL = orig_url
        if orig_force is not None:
            os.environ["FORCE_SQLITE"] = orig_force


@pytest.mark.skipif(
    not getattr(config, "_CANONICAL_NEON_PG", None),
    reason="Canonical Neon PostgreSQL URL not configured"
)
def test_postgres_repeated_init_db_idempotency():
    """Verify repeated init_db calls are idempotent on PostgreSQL."""
    orig_is_pg = getattr(config, "IS_POSTGRES", False)
    orig_url = getattr(config, "DATABASE_URL", None)
    orig_force = os.environ.get("FORCE_SQLITE")

    try:
        config.IS_POSTGRES = True
        os.environ["FORCE_SQLITE"] = "false"
        config.DATABASE_URL = config._CANONICAL_NEON_PG

        # Execute init_db twice
        db.init_db(force=True)
        db.init_db(force=False)

        # Verify trade_history view is functional
        with db.get_authoritative_connection() as conn:
            cur = conn.execute("SELECT COUNT(*) as cnt FROM trade_history;")
            row = cur.fetchone()
            assert row is not None
    finally:
        config.IS_POSTGRES = orig_is_pg
        config.DATABASE_URL = orig_url
        if orig_force is not None:
            os.environ["FORCE_SQLITE"] = orig_force
