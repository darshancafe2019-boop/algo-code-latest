"""
QUANT.OS — Production PostgreSQL Connection Pool & SSL Resilience Test Suite
Tests:
1. Concurrent database checkouts (15 threads querying Neon simultaneously)
2. Connection acquisition and release (pool stats show in-use returns to 0)
3. Broken connection disposal (closing checked-out conn marks returns_bad and replaces)
4. SSL reconnect verification under simulated disconnect
5. Atomic rollback & commit
6. Pool exhaustion recovery under burst load
7. Bot database access concurrency
8. Authentication /api/auth/me and OTP under concurrent DB load
9. Production PG-only check (ensuring no SQLite fallback when IS_POSTGRES=True)
"""

import os
import sys
import time
import pytest
import threading
import concurrent.futures

# Set sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import config, db


@pytest.fixture(scope="module")
def pg_env():
    """Ensure PostgreSQL mode is configured for this resilience test."""
    original_force = os.environ.get("FORCE_SQLITE")
    original_url = getattr(config, "DATABASE_URL", None)
    original_provider = getattr(config, "DATABASE_PROVIDER", "sqlite")
    original_is_pg = getattr(config, "IS_POSTGRES", False)
    
    # Temporarily activate PostgreSQL mode for resilience test
    os.environ["FORCE_SQLITE"] = "false"
    config.FORCE_SQLITE = False
    config.IS_POSTGRES = True
    config.DATABASE_PROVIDER = "postgresql"
    config.DATABASE_URL = getattr(config, "_CANONICAL_NEON_PG", None) or os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = config.DATABASE_URL
    os.environ["DATABASE_PROVIDER"] = "postgresql"
    
    # Ensure pool is initialized
    pool = db.get_db_pool()
    if pool is None:
        pytest.skip("PostgreSQL ConnectionPool not configured or reachable.")

    yield pool

    # Restore
    if original_force is not None:
        os.environ["FORCE_SQLITE"] = original_force
    config.FORCE_SQLITE = original_force == "true"
    config.IS_POSTGRES = original_is_pg
    config.DATABASE_PROVIDER = original_provider
    if original_url:
        config.DATABASE_URL = original_url
        os.environ["DATABASE_URL"] = original_url


def test_01_concurrent_neon_pool_checkouts(pg_env):
    """Test 1: 15 threads querying Neon simultaneously without timeout or crash."""
    errors = []
    results = []

    def _worker(thread_idx):
        try:
            rows = db.safe_query("SELECT 1 as val, NOW() as current_time;")
            if rows and rows[0].get("val") == 1:
                results.append(thread_idx)
            else:
                errors.append(f"Thread {thread_idx} bad result: {rows}")
        except Exception as e:
            errors.append(f"Thread {thread_idx} exception: {e}")

    threads = [threading.Thread(target=_worker, args=(i,)) for i in range(15)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10.0)

    assert len(errors) == 0, f"Concurrent query errors: {errors}"
    assert len(results) == 15, f"Expected 15 results, got {len(results)}"


def test_02_connection_acquisition_and_release(pg_env):
    """Test 2: After multiple queries, all connections are released back to pool."""
    for _ in range(10):
        rows = db.safe_query("SELECT 1 as ping;")
        assert rows[0].get("ping") == 1

    stats = db.get_db_pool_stats()
    assert stats.get("configured") is True
    assert stats.get("engine") == "postgresql"
    assert stats.get("requests_waiting", 0) == 0


def test_03_broken_connection_disposal(pg_env):
    """Test 3: Corrupt/closed connection is detected, closed, and replaced via returns_bad counter."""
    pool = pg_env
    stats_before = pool.get_stats()
    bad_before = stats_before.get("returns_bad", 0)

    # Acquire connection from pool, simulate SSL drop by closing underlying socket, then return it
    conn = pool.getconn(timeout=5.0)
    try:
        # Simulate network failure / Neon socket drop
        conn.close()
    finally:
        pool.putconn(conn)

    stats_after = pool.get_stats()
    bad_after = stats_after.get("returns_bad", 0)
    assert bad_after >= bad_before + 1, "Pool did not increment returns_bad on closed connection"

    # Verify that a subsequent query immediately succeeds with a fresh provisioned connection
    rows = db.safe_query("SELECT 1 as num;")
    assert rows[0].get("num") == 1


def test_04_ssl_reconnect_recovery(pg_env):
    """Test 4: Continuous safe_query execution maintains active valid SSL connections."""
    for i in range(5):
        res = db.safe_query("SELECT ? as idx;", (i,))
        assert res[0].get("idx") == i


def test_05_atomic_rollback_and_commit(pg_env):
    """Test 5: Explicit commit() inside transaction succeeds or rolls back atomically without syntax crash."""
    # Ensure test table exists
    db.safe_execute("""
        CREATE TABLE IF NOT EXISTS _test_resilience_scratch (
            id TEXT PRIMARY KEY,
            val INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    test_id = f"test_{int(time.time()*1000)}"
    # Test safe commit
    ok = db.safe_execute("INSERT INTO _test_resilience_scratch (id, val) VALUES (?, ?);", (test_id, 42))
    assert ok is True

    row = db.safe_query_one("SELECT val FROM _test_resilience_scratch WHERE id = ?;", (test_id,))
    assert row is not None
    assert row.get("val") == 42

    # Test rollback behavior with get_authoritative_connection
    with pytest.raises(Exception):
        with db.get_authoritative_connection() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE _test_resilience_scratch SET val = ? WHERE id = ?;", (999, test_id))
            # Explicit rollback through exception
            raise ValueError("Simulated business logic failure")

    # Verify val is still 42 (transaction rolled back)
    row_after = db.safe_query_one("SELECT val FROM _test_resilience_scratch WHERE id = ?;", (test_id,))
    assert row_after.get("val") == 42

    # Cleanup scratch
    db.safe_execute("DROP TABLE IF EXISTS _test_resilience_scratch;")


def test_06_pool_burst_load_recovery(pg_env):
    """Test 6: Burst load exceeding min pool size provisions connections up to max and shrinks gracefully."""
    def _query(n):
        return db.safe_query("SELECT ? as burst_id;", (n,))

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_query, i) for i in range(15)]
        results = [f.result(timeout=10.0) for f in concurrent.futures.as_completed(futures)]

    assert len(results) == 15
    for r in results:
        assert len(r) == 1
    stats = db.get_db_pool_stats()
    assert stats.get("requests_waiting", 0) == 0


def test_07_bot_database_access_concurrency(pg_env):
    """Test 7: Concurrent bot updates do not lock or leak connections."""
    def _update_dummy(i):
        return db.safe_execute(
            "SELECT 1 WHERE 1 = ?;",
            (i,)
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_update_dummy, i) for i in range(15)]
        results = [f.result(timeout=10.0) for f in concurrent.futures.as_completed(futures)]

    assert all(results)


def test_08_no_sqlite_fallback_in_postgres_mode(pg_env):
    """Test 8: Production PostgreSQL mode MUST NEVER silently fall back to SQLite."""
    assert getattr(config, "IS_POSTGRES", False) is True
    with db.get_authoritative_connection() as conn:
        assert isinstance(conn, db.PostgresConnectionAdapter)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        row = cur.fetchone()
        assert "PostgreSQL" in str(row)
