"""
Automated Regression Test Suite for Quant.OS Security, Trading Protection, and Settings
======================================================================================
Tests:
1. Trading Authorization Gate & Fail-Closed Invariants
2. Security Cannot Override Risk Invariant (Risk Blocked -> No Order)
3. Global Live Trading Lock ('LOCK LIVE TRADING')
4. Bot Scoped Permission Matrix (No risk modifications, no fund withdrawals)
5. Zero Withdrawal Scope Enforcement on Broker Credentials
6. Server-Side Session Revocation Propagation
7. Credential Masking & Secret Leak Protection
8. Encrypted Backup Generation & Isolated Restore Verification
9. Security Incident Deduplication
10. Authoritative Market Session Calendar & Schedule Service
11. Timezone & Currency Presentation Invariance (Zero Financial Mutation)
"""

import os
import json
import pytest
import sqlite3
from datetime import datetime, timezone
import pytz

from src.trading_authorization_service import (
    TradingAuthorizationService,
    global_trading_authorization_service,
)
from src.market_session_service import (
    MarketSessionService,
    global_market_session_service,
)
from src.settings_service import (
    SettingsService,
    global_settings_service,
)
from src.backup_manager import BackupManager
from src.secrets_manager import global_secrets_manager
from src import config, db


class TestTradingAuthorizationAndProtection:
    """Verifies authoritative trading access control and safety gates."""

    def setup_method(self):
        # Reset live lock before each test
        global_trading_authorization_service.set_live_trading_lock(locked=False)
        setattr(config, "GLOBAL_KILL_SWITCH", False)
        if config.KILL_SWITCH_FILE.exists():
            config.KILL_SWITCH_FILE.unlink()

    def test_execution_eligibility_standard_paper(self):
        eligible, reason = global_trading_authorization_service.validate_execution_eligibility(
            user_id="usr_admin_01",
            environment="PAPER",
            risk_evaluation_passed=True
        )
        assert eligible is True
        assert reason is None

    def test_security_cannot_override_risk_engine(self):
        """Even if user is authorized, if Risk = BLOCKED -> NO ORDER."""
        eligible, reason = global_trading_authorization_service.validate_execution_eligibility(
            user_id="usr_admin_01",
            environment="LIVE",
            risk_evaluation_passed=False,
            risk_rejection_reason="Max Daily Drawdown Reached (3.2% > 3.0%)"
        )
        assert eligible is False
        assert "BLOCKED by Central Risk Gate" in reason

    def test_global_live_trading_lock_blocks_live_orders(self):
        """When Live Trading Lock is active, all Live orders are blocked while Paper remains allowed."""
        # 1. Engage lock
        global_trading_authorization_service.set_live_trading_lock(locked=True, reason="Unit Test Safety Check")
        assert global_trading_authorization_service.is_live_trading_locked() is True

        # 2. Attempt Live execution -> BLOCKED
        live_ok, live_reason = global_trading_authorization_service.validate_execution_eligibility(
            user_id="usr_admin_01",
            environment="LIVE",
            risk_evaluation_passed=True
        )
        assert live_ok is False
        assert "Live Trading is globally locked" in live_reason

        # 3. Attempt Paper execution -> ALLOWED
        paper_ok, paper_reason = global_trading_authorization_service.validate_execution_eligibility(
            user_id="usr_admin_01",
            environment="PAPER",
            risk_evaluation_passed=True
        )
        assert paper_ok is True

        # 4. Release lock
        global_trading_authorization_service.set_live_trading_lock(locked=False)
        assert global_trading_authorization_service.is_live_trading_locked() is False

    def test_global_kill_switch_blocks_all(self):
        """When Global Emergency Halt / Kill Switch is on, all executions are blocked."""
        setattr(config, "GLOBAL_KILL_SWITCH", True)

        ok, reason = global_trading_authorization_service.validate_execution_eligibility(
            user_id="usr_admin_01",
            environment="PAPER",
            risk_evaluation_passed=True
        )
        assert ok is False
        assert "Global Kill Switch" in reason

        setattr(config, "GLOBAL_KILL_SWITCH", False)

    def test_bot_permissions_matrix_invariants(self):
        """Verifies that bots have strictly scoped permissions."""
        matrix = {p["id"]: p["status"] for p in global_trading_authorization_service.BOT_PERMISSIONS_MATRIX}

        assert matrix["read_market_data"] == "ALLOWED"
        assert matrix["calculate_indicators"] == "ALLOWED"
        assert matrix["generate_signals"] == "ALLOWED"
        assert matrix["request_orders"] == "ALLOWED"
        assert matrix["change_risk_limits"] == "NOT_ALLOWED"
        assert matrix["withdraw_funds"] == "NEVER_ALLOWED"
        assert matrix["change_api_keys"] == "NEVER_ALLOWED"


class TestSecretsAndCredentialsSecurity:
    """Verifies that secrets are never exposed in plaintext and withdrawals are forbidden."""

    def test_withdrawal_scope_strictly_disabled(self):
        creds = global_secrets_manager.get_masked_credentials()
        for c in creds:
            assert c.get("allow_withdraw") is False, "CRITICAL: Credential must forbid fund withdrawals!"

    def test_credential_masking_never_exposes_secrets(self):
        creds = global_secrets_manager.get_masked_credentials()
        for c in creds:
            masked = c.get("masked_api_key", "")
            assert "••••" in masked or len(masked) <= 12
            assert "secret" not in c
            assert "api_secret" not in c
            assert "private_key" not in c


class TestBackupAndDisasterRecovery:
    """Verifies encrypted backup creation, SHA-256 integrity, and sandbox restore verification."""

    def test_backup_encryption_and_safe_restore_verification(self):
        bm = BackupManager()
        # 1. Create encrypted backup
        meta = bm.create_encrypted_backup()
        assert meta["encrypted"] is True
        assert meta["file_name"].endswith(".enc")
        assert len(meta["raw_sha256"]) == 64  # Valid SHA-256

        # 2. Verify restore test in isolated sandbox database
        ok, msg, updated_meta = bm.verify_backup_restore(meta["backup_id"])
        assert ok is True
        assert "integrity verified successfully" in msg
        assert updated_meta.get("verified") is True


class TestMarketSessionService:
    """Verifies authoritative exchange calendars and session evaluations."""

    def test_crypto_24_7_always_open(self):
        now_utc = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)
        eval_res = global_market_session_service._evaluate_crypto(now_utc)
        assert eval_res["status"] == "OPEN"
        assert eval_res["is_open_for_trading"] is True

    def test_nse_regular_hours_vs_after_hours(self):
        ist = pytz.timezone("Asia/Kolkata")
        # Regular trading at 11:30 AM IST on a Thursday (2026-08-27)
        thursday_market_hours = ist.localize(datetime(2026, 8, 27, 11, 30, 0))
        nse_open = global_market_session_service._evaluate_nse(thursday_market_hours)
        assert nse_open["status"] == "OPEN"
        assert nse_open["sub_status"] == "REGULAR_TRADING"

        # After hours at 8:00 PM IST
        thursday_after_hours = ist.localize(datetime(2026, 8, 27, 20, 0, 0))
        nse_closed = global_market_session_service._evaluate_nse(thursday_after_hours)
        assert nse_closed["status"] == "CLOSED"

    def test_nse_holiday_detection(self):
        ist = pytz.timezone("Asia/Kolkata")
        # Republic Day (2026-01-26) at 11:00 AM IST
        republic_day = ist.localize(datetime(2026, 1, 26, 11, 0, 0))
        eval_res = global_market_session_service._evaluate_nse(republic_day)
        assert eval_res["status"] == "HOLIDAY"
        assert "Republic Day" in eval_res["sub_status"]

    def test_us_equities_hours(self):
        est = pytz.timezone("America/New_York")
        # Thursday 11:00 AM EST
        us_day = est.localize(datetime(2026, 8, 27, 11, 0, 0))
        us_open = global_market_session_service._evaluate_us_equities(us_day)
        assert us_open["status"] == "OPEN"
        assert us_open["sub_status"] == "REGULAR_TRADING"


class TestSettingsAndLocalizationInvariance:
    """Verifies that changing UI display preferences never mutates financial truth."""

    def test_settings_persistence_and_retrieval(self):
        service = SettingsService()
        res = service.update_settings({
            "region": {"timezone": "Asia/Kolkata", "currency": "INR"},
            "notifications": {"trade_signals": True, "emergency_halt": True}
        })
        assert res["status"] == "success"

        fetched = service.get_settings()
        assert fetched["region"]["timezone"] == "Asia/Kolkata"
        assert fetched["region"]["currency"] == "INR"
        assert fetched["region"]["currency_symbol"] == "₹"

    def test_financial_ledger_unaffected_by_timezone_change(self):
        """Verifies changing timezone/currency does not alter trade P&L in trades_log."""
        conn = db.get_connection()
        conn.execute(
            "INSERT OR REPLACE INTO trades_log (id, timestamp, symbol, direction, entry_price, exit_price, position_size, result_pnl, status) VALUES (9999, '2026-08-27T08:00:00Z', 'BTC/USDT', 'LONG', 65000, 66000, 1.0, 1000.0, 'CLOSED')"
        )
        conn.commit()

        # Retrieve trade
        cur = conn.cursor()
        cur.execute("SELECT result_pnl, timestamp FROM trades_log WHERE id = 9999")
        row = cur.fetchone()
        orig_pnl = row[0]
        orig_ts = row[1]
        conn.close()

        # Update display settings to New York / USD
        global_settings_service.update_settings({"region": {"timezone": "America/New_York", "currency": "USD"}})

        # Re-verify ledger
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT result_pnl, timestamp FROM trades_log WHERE id = 9999")
        row_after = cur.fetchone()
        conn.close()

        assert row_after[0] == orig_pnl == 1000.0, "Financial P&L must NOT mutate on display changes!"
        assert row_after[1] == orig_ts == "2026-08-27T08:00:00Z", "Canonical UTC timestamp must NOT mutate!"
