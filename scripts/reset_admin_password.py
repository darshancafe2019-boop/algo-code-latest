#!/usr/bin/env python3
"""
Alpha Algo Terminal — Local Administrator Password Recovery & 2FA Reset CLI
Usage:
    python scripts/reset_admin_password.py [--username admin] [--password NEW_PASSWORD] [--clear-2fa] [--email email@example.com]
"""

import sys
import os
import argparse
import getpass
import uuid
from datetime import datetime, timezone

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import db
from src.security_auth import PasswordManager
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("admin_reset")


def parse_args():
    parser = argparse.ArgumentParser(description="Alpha Algo Terminal Admin Recovery Utility")
    parser.add_argument("--username", default="admin", help="Username of the administrator (default: admin)")
    parser.add_argument("--password", help="New password (will securely prompt if omitted)")
    parser.add_argument("--email", default="", help="Email address if creating new user (default: admin@algo.terminal)")
    parser.add_argument("--clear-2fa", action="store_true", help="Clear TOTP 2FA secret and recovery codes to unlock account")
    parser.add_argument("--activate", action="store_true", default=True, help="Ensure account is active (default: True)")
    return parser.parse_args()


def main():
    args = parse_args()
    username = args.username.strip()

    # Initialize DB tables if not already initialized
    try:
        db.init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        sys.exit(1)

    # Prompt for password if not passed as CLI argument
    password = args.password
    if not password:
        print(f"=== Administrator Recovery for: {username} ===")
        password = getpass.getpass("Enter new administrator password: ")
        confirm = getpass.getpass("Confirm new administrator password: ")
        if password != confirm:
            print("ERROR: Passwords do not match.")
            sys.exit(1)

    if len(password) < 8:
        print("WARNING: Password is shorter than 8 characters. Minimum 8 characters recommended.")

    pw_hash, salt = PasswordManager.hash_password(password)

    user = db.get_user_by_username(username)
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user:
        # Check if user exists by email or if we need to create
        email = args.email.strip() or f"{username}@algo.terminal"
        user_id = uuid.uuid4().hex
        print(f"User '{username}' does not exist. Creating new institutional administrator...")
        user_dict = {
            "id": user_id,
            "username": username,
            "email": email,
            "password_hash": pw_hash,
            "salt": salt,
            "role": "ADMIN",
            "is_active": 1,
            "is_2fa_enabled": 0,
            "totp_secret_encrypted": "",
            "passkeys_json": "[]",
            "recovery_codes_json": "[]",
            "must_change_password": 0,
            "created_at": now_iso
        }
        success = db.create_user(user_dict)
        if not success:
            print(f"ERROR: Failed to create user '{username}'.")
            sys.exit(1)
        print(f"SUCCESS: Created new administrator '{username}' ({email}) with specified password.")
        return

    user_id = user["id"]

    # Update password
    success = db.update_user_password(user_id, pw_hash, salt, must_change_password=0)
    if not success:
        print("ERROR: Failed to update administrator password in database.")
        sys.exit(1)

    # Ensure user is active if requested
    if args.activate and user.get("is_active") != 1:
        db.safe_execute("UPDATE users SET is_active = 1 WHERE id = ?", (user_id,))

    # Clear 2FA if requested
    if args.clear_2fa:
        db.set_user_2fa_settings(user_id, is_2fa_enabled=0, totp_secret_encrypted="", recovery_codes_json="[]")
        print("NOTICE: 2FA TOTP secret and recovery codes have been reset to disabled.")

    # Revoke all existing sessions for security
    db.revoke_all_user_sessions(user_id)

    # Record audit log
    try:
        db.safe_execute(
            """
            INSERT INTO bot_event_audit (id, event_type, severity, message, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                uuid.uuid4().hex,
                "ADMIN_PASSWORD_RESET",
                "HIGH",
                f"Local administrator password reset executed for username='{username}'",
                now_iso,
                f'{{"username": "{username}", "2fa_cleared": {str(args.clear_2fa).lower()}}}'
            )
        )
    except Exception as e:
        logger.debug(f"Audit log insertion skipped: {e}")

    print("=====================================================")
    print(f"SUCCESS: Password updated for administrator '{username}'.")
    print("All existing active sessions have been revoked.")
    if args.clear_2fa:
        print("2FA has been disabled. You can log in directly with username and password.")
    print("=====================================================")


if __name__ == "__main__":
    main()
