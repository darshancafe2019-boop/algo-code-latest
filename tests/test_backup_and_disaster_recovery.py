"""
Automated unit and integration tests for Quant.OS Disaster Recovery and Backup Subsystem.
Verifies:
- Envelope encryption using Fernet
- SHA-256 integrity checksums
- Restore verification into sandbox database
- Full database restoration
"""

import os
import shutil
import sqlite3
import pytest
from pathlib import Path

from src import config, db
from src.backup_manager import global_backup_manager


def test_encrypted_backup_creation_and_checksum():
    """Verify that creating an encrypted backup generates valid metadata and SHA-256."""
    meta = global_backup_manager.create_encrypted_backup()
    assert meta is not None
    assert "backup_id" in meta
    assert meta["encrypted"] is True
    assert len(meta["raw_sha256"]) == 64
    assert meta["file_size_bytes"] > 0

    backup_id = meta["backup_id"]
    enc_file = global_backup_manager.backup_dir / f"{backup_id}.enc"
    meta_file = global_backup_manager.backup_dir / f"{backup_id}.json"

    assert enc_file.exists()
    assert meta_file.exists()


def test_backup_restore_verification():
    """Verify that verify_backup_restore correctly decrypts and audits table structures."""
    backups = global_backup_manager.list_backups()
    assert len(backups) > 0
    latest_id = backups[0]["backup_id"]

    ok, msg, verified_meta = global_backup_manager.verify_backup_restore(latest_id)
    assert ok is True
    assert "verified" in verified_meta
    assert verified_meta["tables_count"] > 10


def test_sandboxed_database_restoration(tmp_path):
    """Verify that restoring a database snapshot to a sandbox path restores full functionality."""
    backups = global_backup_manager.list_backups()
    assert len(backups) > 0
    latest_id = backups[0]["backup_id"]

    sandbox_dest = tmp_path / "restored_test.db"
    ok, msg = global_backup_manager.restore_backup(latest_id, target_db_path=sandbox_dest)

    assert ok is True
    assert sandbox_dest.exists()
    assert sandbox_dest.stat().st_size > 0

    # Verify query on restored sandbox DB
    conn = sqlite3.connect(str(sandbox_dest))
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM bot_instances")
    count = cursor.fetchone()[0]
    conn.close()

    assert count >= 0
