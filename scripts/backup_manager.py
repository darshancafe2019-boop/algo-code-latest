#!/usr/bin/env python3
"""
Quant.OS Disaster Recovery & Backup CLI.
Usage:
  python scripts/backup_manager.py create
  python scripts/backup_manager.py list
  python scripts/backup_manager.py verify <backup_id|latest>
  python scripts/backup_manager.py restore <backup_id|latest>
"""

import sys
import json
from pathlib import Path

# Set up path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.backup_manager import global_backup_manager
from src import config


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/backup_manager.py [create|list|verify|restore] [backup_id]")
        sys.exit(1)

    cmd = sys.argv[1].lower()

    if cmd == "create":
        print("[*] Creating encrypted disaster recovery backup snapshot...")
        meta = global_backup_manager.create_encrypted_backup()
        print(f"[+] Backup created successfully: {meta['backup_id']}")
        print(f"    Encrypted Size: {meta['file_size_bytes']} bytes")
        print(f"    Raw SHA-256: {meta['raw_sha256']}")
        print(f"    Timestamp UTC: {meta['timestamp_utc']}")

    elif cmd == "list":
        print("[*] Retrieving encrypted backup snapshots...")
        backups = global_backup_manager.list_backups()
        if not backups:
            print("[-] No backup snapshots found.")
            return
        print(f"[+] Found {len(backups)} snapshots:")
        print(f"{'BACKUP ID':<26} {'TIMESTAMP UTC':<24} {'ENCRYPTED BYTES':<16} {'VERIFIED'}")
        print("-" * 75)
        for b in backups:
            print(f"{b.get('backup_id', 'N/A'):<26} {b.get('timestamp_utc', 'N/A')[:19]:<24} {b.get('file_size_bytes', 0):<16} {b.get('verified', False)}")

    elif cmd in ("verify", "restore"):
        if len(sys.argv) < 3:
            print(f"Usage: python scripts/backup_manager.py {cmd} <backup_id|latest>")
            sys.exit(1)

        target_id = sys.argv[2]
        if target_id == "latest":
            backups = global_backup_manager.list_backups()
            if not backups:
                print("[-] No backups found.")
                sys.exit(1)
            target_id = backups[0]["backup_id"]

        if cmd == "verify":
            print(f"[*] Verifying decryption and SQLite integrity for '{target_id}'...")
            ok, msg, meta = global_backup_manager.verify_backup_restore(target_id)
            if ok:
                print(f"[+] Integrity Check PASSED for {target_id}")
                print(f"    Tables verified: {meta.get('tables_count')}")
                print(f"    Message: {msg}")
            else:
                print(f"[-] Integrity Check FAILED: {msg}")
                sys.exit(1)

        elif cmd == "restore":
            print(f"[!] Restoring primary database from snapshot '{target_id}'...")
            ok, msg = global_backup_manager.restore_backup(target_id)
            if ok:
                print(f"[+] Database restore COMPLETED: {msg}")
            else:
                print(f"[-] Database restore FAILED: {msg}")
                sys.exit(1)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
