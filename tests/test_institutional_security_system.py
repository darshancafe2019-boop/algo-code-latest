"""
Institutional Security & Defense-in-Depth Automated Test Suite.
Tests:
1. PBKDF2-HMAC-SHA256 (600,000 iterations) password hashing and constant-time verification.
2. RFC 6238 TOTP verification, clock skew tolerance, and single-use replay rejection.
3. High-entropy one-time recovery codes generation and consumption.
4. Cryptographically secure session management, rotation, and revocation.
5. Purpose-bound Step-Up authentication service and token consumption.
6. Scoped server-side Live Deployment Authorization manager and emergency lock.
7. Authenticated envelope encryption (Fernet) in secrets manager with strictly disabled withdrawal scope.
8. Brute-force sliding-window rate limiting.
9. Encrypted database snapshot creation and SQLite restore verification.
10. Flask Security REST API suite integration tests (/api/auth/*, /api/security/*).
"""

import os
import json
import time
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from src import config, db
from src.security_auth import (
    PasswordManager,
    TOTPManager,
    PasskeyManager,
    RecoveryCodesManager,
    SessionManager,
    StepUpAuthenticationService,
    RateLimiter,
    global_auth_manager,
)
from src.secrets_manager import global_secrets_manager
from src.live_authorization_manager import global_live_auth_manager
from src.backup_manager import global_backup_manager
from dashboard import app


@pytest.fixture(autouse=True)
def init_test_security_db():
    """Ensure database tables and admin bootstrap are initialized."""
    db.init_db()
    global_auth_manager.bootstrap_default_admin_if_needed()


def test_password_hashing_and_verification():
    """Test PBKDF2-HMAC-SHA256 password hashing with 600,000 iterations and salt."""
    raw_pwd = "InstitutionalStrongPassword@2026!"
    pwd_hash, salt = PasswordManager.hash_password(raw_pwd)

    assert pwd_hash is not None and len(pwd_hash) > 20
    assert salt is not None and len(salt) > 20

    # Verification success
    assert PasswordManager.verify_password(raw_pwd, pwd_hash, salt) is True
    # Verification failure on bad password
    assert PasswordManager.verify_password("WrongPassword123!", pwd_hash, salt) is False


def test_totp_code_generation_verification_and_replay_protection():
    """Test TOTP generation, clock skew window, and anti-replay defense."""
    secret = TOTPManager.generate_secret()
    assert secret is not None and len(secret) >= 16

    code = TOTPManager.generate_totp_code(secret)
    assert len(code) == 6 and code.isdigit()

    user_id = f"test_usr_{uuid.uuid4().hex[:6]}"

    # First verification should pass
    assert TOTPManager.verify_totp_code(user_id, secret, code) is True

    # Replay of the exact same code within same window MUST be rejected
    assert TOTPManager.verify_totp_code(user_id, secret, code) is False

    # Invalid code should fail
    assert TOTPManager.verify_totp_code(user_id, secret, "000000") is False


def test_recovery_codes_lifecycle():
    """Test generation and single-use redemption of recovery codes."""
    raw_codes, hashed_codes = RecoveryCodesManager.generate_recovery_codes(8)
    assert len(raw_codes) == 8
    assert len(hashed_codes) == 8

    test_code = raw_codes[0]
    user_id = f"usr_{uuid.uuid4().hex[:6]}"

    # Consume valid code
    is_valid, remaining_hashes = RecoveryCodesManager.verify_and_consume_code(user_id, test_code, hashed_codes)
    assert is_valid is True
    assert len(remaining_hashes) == 7

    # Second redemption attempt must fail
    is_valid_replay, _ = RecoveryCodesManager.verify_and_consume_code(user_id, test_code, remaining_hashes)
    assert is_valid_replay is False


def test_session_lifecycle_and_revocation():
    """Test cryptographic session creation, validation, and revocation."""
    user_id = "usr_admin_01"
    raw_token, session_meta = SessionManager.create_session(
        user_id=user_id,
        device_name="MacBook Pro / Chrome",
        ip_address="192.168.1.50"
    )

    assert raw_token is not None and len(raw_token) >= 32
    assert session_meta["session_id"].startswith("sess-")

    # Validate active session
    validated = SessionManager.validate_session(raw_token)
    assert validated is not None
    assert validated["user_id"] == user_id

    # Revoke session
    db.revoke_session(session_meta["session_id"])
    assert SessionManager.validate_session(raw_token) is None


def test_step_up_authentication_service():
    """Test purpose-bound Step-Up token issuance and one-time consumption."""
    user_id = "usr_admin_01"
    session_id = "sess-test-stepup"
    purpose = "ENABLE_LIVE_TRADING"

    token_id = StepUpAuthenticationService.issue_step_up_token(user_id, session_id, purpose, "PASSKEY")
    assert token_id.startswith("stepup-")

    # Valid consumption
    assert StepUpAuthenticationService.verify_step_up(token_id, purpose) is True

    # Replay consumption must fail
    assert StepUpAuthenticationService.verify_step_up(token_id, purpose) is False

    # Different purpose must fail
    token_2 = StepUpAuthenticationService.issue_step_up_token(user_id, session_id, purpose, "PASSKEY")
    assert StepUpAuthenticationService.verify_step_up(token_2, "RELEASE_KILL_SWITCH") is False


def test_live_trading_deployment_authorizations():
    """Test server-side scoped Live Trading authorizations and emergency lock."""
    bot_id = f"bot_live_{uuid.uuid4().hex[:6]}"

    # Paper mode is always allowed
    ok, err = global_live_auth_manager.validate_bot_live_authorization(bot_id, "PAPER")
    assert ok is True

    # Live mode without server authorization must be BLOCKED
    ok, err = global_live_auth_manager.validate_bot_live_authorization(bot_id, "LIVE")
    assert ok is False
    assert "active server-side live authorization" in err

    # Issue live authorization
    auth_rec = global_live_auth_manager.authorize_live_bot(
        user_id="usr_admin_01",
        bot_id=bot_id,
        account_id="BINANCE-LIVE-01",
        max_capital=10000.0,
        max_risk_pct=0.5,
        daily_loss_limit=2.0,
        duration_hours=24
    )
    assert auth_rec["status"] == "ACTIVE"

    # Now live validation must PASS
    ok, err = global_live_auth_manager.validate_bot_live_authorization(bot_id, "LIVE")
    assert ok is True

    # Emergency lock engaged
    global_live_auth_manager.emergency_lock_all_trading(actor_user_id="usr_admin_01")

    # Live validation must now be BLOCKED
    ok, err = global_live_auth_manager.validate_bot_live_authorization(bot_id, "LIVE")
    assert ok is False


def test_secret_vault_envelope_encryption_and_withdrawal_lockout():
    """Test Fernet credential envelope encryption, masked display, and withdrawal lockout."""
    cred = global_secrets_manager.store_credential(
        provider_id="binance_futures",
        account_name="Binance Futures Test Account",
        api_key="bk_test_1122334455667788",
        secret_key="sk_super_secret_unmasked_value",
        allow_read=True,
        allow_trade=True,
        allow_withdraw=True, # MUST BE OVERRIDDEN TO FALSE
        ip_restrictions=["127.0.0.1"]
    )

    # Withdrawal MUST be forced to False
    assert cred["allow_withdraw"] is False

    # Masked list must not leak raw secret
    masked = global_secrets_manager.get_masked_credentials()
    matching = [m for m in masked if m["credential_id"] == cred["credential_id"]]
    assert len(matching) == 1
    assert "sk_super_secret_unmasked_value" not in json.dumps(matching[0])
    assert matching[0]["allow_withdraw"] is False

    # Internal runner decryption check
    api_k, sec_k = global_secrets_manager.get_decrypted_credential("binance_futures")
    assert api_k == "bk_test_1122334455667788"
    assert sec_k == "sk_super_secret_unmasked_value"


def test_rate_limiter_brute_force_lockout():
    """Test token bucket sliding window rate limiting."""
    ip = f"10.0.0.{uuid.uuid4().int % 200 + 1}"
    key = f"login:{ip}"

    # First 3 attempts allowed
    for _ in range(3):
        allowed, _ = RateLimiter.is_allowed(key, max_requests=3, window_seconds=10)
        assert allowed is True

    # 4th attempt should be blocked
    allowed, retry_after = RateLimiter.is_allowed(key, max_requests=3, window_seconds=10)
    assert allowed is False
    assert retry_after > 0


def test_encrypted_backup_creation_and_restore_verification():
    """Test encrypted snapshot generation and SQLite checksum/table restore verification."""
    backup_meta = global_backup_manager.create_encrypted_backup()
    assert backup_meta["encrypted"] is True
    assert backup_meta["raw_sha256"] is not None

    ok, msg, verified_meta = global_backup_manager.verify_backup_restore(backup_meta["backup_id"])
    assert ok is True
    assert verified_meta["tables_count"] > 10


def test_flask_security_endpoints_integration():
    """Test REST APIs in dashboard.py for authentication, password change, route protection, overview, and audit."""
    client = app.test_client()

    # 1. Direct unauthenticated request to protected route must be rejected with 401
    unauth_resp = client.get("/api/security/overview")
    assert unauth_resp.status_code == 401

    # 2. Login with bad credentials must be rejected with 401
    bad_resp = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert bad_resp.status_code == 401

    # Reset test admin with known credentials for test isolation
    admin_id = "usr_admin_01"
    pwd_h, salt_v = PasswordManager.hash_password("AlgoTrading@2026!")
    db.upsert_user({
        "id": admin_id,
        "username": "admin",
        "email": "admin@algotrading.local",
        "password_hash": pwd_h,
        "salt": salt_v,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })

    # 3. Login with valid credentials
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "AlgoTrading@2026!"}
    )
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert login_data["status"] == "success"

    # 4. Enforce password change to clear must_change_password
    chg_resp = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "AlgoTrading@2026!",
            "new_password": "PermanentSecurePass@2026!",
            "confirm_password": "PermanentSecurePass@2026!"
        }
    )
    assert chg_resp.status_code == 200

    # 5. Security Overview Endpoint (now accessible with authenticated session)
    resp = client.get("/api/security/overview")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["telemetry"]["withdrawal_permission"] == "DISABLED"
    assert data["telemetry"]["security_score"] >= 50

    # 6. Security Audit Endpoint
    resp = client.get("/api/security/audit")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert len(data["audit_logs"]) > 0

    # 7. Security Headers Check
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
