#!/usr/bin/env python3
"""
Quant.OS Automated Expiry Purge Engine
=====================================
Deletes all expired contracts, option chain snapshots, quotes, instruments,
stale auth tokens, expired OTP challenges, expired worker leases, and expired sessions.
Also provides a recurring cleanup hook for automated maintenance on expiry.
"""

import sys
import os
import shutil
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "data" / "trading_bot.db"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ExpiryPurgeEngine")


def create_backup():
    """Creates a timestamped backup before deletion."""
    if not DB_PATH.exists():
        return None
    backup_path = DB_PATH.with_name(f"trading_bot_backup_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.db")
    shutil.copy2(DB_PATH, backup_path)
    logger.info(f"Database backup created at: {backup_path}")
    return backup_path


def purge_all_expired_data(db_path=DB_PATH):
    """
    Purges all expired records across all domain tables in Quant.OS.
    Returns a dictionary of counts of deleted items per category.
    """
    if not db_path.exists():
        logger.warning(f"Database not found at {db_path}")
        return {}

    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    today_str = now_utc.strftime("%Y-%m-%d")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    results = {}

    try:
        # 1. Delta Option Contracts
        cursor.execute(
            "DELETE FROM delta_option_contracts WHERE settlement_time < ? OR (expiry_date < ? AND expiry_date != '')",
            (now_iso, today_str)
        )
        results["delta_option_contracts"] = cursor.rowcount

        # 2. Delta Option Expiries
        cursor.execute(
            "DELETE FROM delta_option_expiries WHERE settlement_time < ? OR (expiry_date < ? AND expiry_date != '')",
            (now_iso, today_str)
        )
        results["delta_option_expiries"] = cursor.rowcount

        # 3. Delta Option Quotes (expired settlement or orphaned)
        cursor.execute(
            "DELETE FROM delta_option_quotes WHERE settlement_time < ? OR product_id NOT IN (SELECT product_id FROM delta_option_contracts)",
            (now_iso,)
        )
        results["delta_option_quotes"] = cursor.rowcount

        # 4. Delta Option Chain Snapshots (expired settlement)
        cursor.execute(
            "DELETE FROM delta_option_chain_snapshots WHERE settlement_time < ? OR (expiry_date < ? AND expiry_date != '')",
            (now_iso, today_str)
        )
        results["delta_option_chain_snapshots"] = cursor.rowcount

        # 5. General Instruments Table (expired Indian & crypto option/future contracts)
        cursor.execute(
            "DELETE FROM instruments WHERE expiry IS NOT NULL AND expiry != '' AND expiry != 'PERPETUAL' AND expiry < ?",
            (today_str,)
        )
        results["instruments"] = cursor.rowcount

        # 6. Expired User Sessions
        cursor.execute(
            "DELETE FROM user_sessions WHERE expires_at < ?",
            (now_iso,)
        )
        results["user_sessions"] = cursor.rowcount

        # 7. Expired Email OTP Challenges
        cursor.execute(
            "DELETE FROM email_otp_challenges WHERE expires_at < ?",
            (now_iso,)
        )
        results["email_otp_challenges"] = cursor.rowcount

        # 8. Expired Auth OTP Challenges
        cursor.execute(
            "DELETE FROM auth_otp_challenges WHERE expires_at < ?",
            (now_iso,)
        )
        results["auth_otp_challenges"] = cursor.rowcount

        # 9. Expired Step-Up Tokens
        cursor.execute(
            "DELETE FROM step_up_tokens WHERE expires_at < ?",
            (now_iso,)
        )
        results["step_up_tokens"] = cursor.rowcount

        # 10. Expired Password Reset Tokens
        cursor.execute(
            "DELETE FROM password_reset_tokens WHERE expires_at < ?",
            (now_iso,)
        )
        results["password_reset_tokens"] = cursor.rowcount

        # 11. Expired Live Deployment Authorizations
        cursor.execute(
            "DELETE FROM live_deployment_authorizations WHERE expires_at < ?",
            (now_iso,)
        )
        results["live_deployment_authorizations"] = cursor.rowcount

        # 12. Expired Bot Worker Leases
        cursor.execute(
            "DELETE FROM bot_worker_leases WHERE lease_expires_at < ?",
            (now_iso,)
        )
        results["bot_worker_leases"] = cursor.rowcount

        # 13. Expired Pending Signal Approvals
        cursor.execute(
            "DELETE FROM pending_signal_approvals WHERE expires_at < ?",
            (now_iso,)
        )
        results["pending_signal_approvals"] = cursor.rowcount

        # 14. Migrate / Reconcile Bots referencing expired contracts to AUTO
        # Find bots with expired symbols and clear out expired error state
        cursor.execute(
            """
            UPDATE bot_instances 
            SET last_error = '' 
            WHERE status = 'STOPPED' AND last_error LIKE '%has already expired%'
            """
        )
        results["reconciled_bot_errors"] = cursor.rowcount

        conn.commit()

        # Run VACUUM to reclaim storage and rebuild indexes
        cursor.execute("VACUUM")
        conn.commit()

        logger.info("Expiry purge completed successfully.")
        for table, count in results.items():
            if count > 0:
                logger.info(f"  * Purged {count} expired records from '{table}'")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error purging expired data: {e}", exc_info=True)
        raise
    finally:
        conn.close()

    return results


if __name__ == "__main__":
    create_backup()
    summary = purge_all_expired_data()
    total_deleted = sum(v for k, v in summary.items() if k != "reconciled_bot_errors")
    print(f"\n==========================================")
    print(f"Total Expired Records Deleted: {total_deleted}")
    print(f"==========================================")
    for k, v in summary.items():
        print(f"  - {k}: {v}")
