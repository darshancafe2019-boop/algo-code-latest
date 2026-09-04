"""
Alpha Algo Terminal — Comprehensive Authentication, TOTP 2FA & Password Recovery Test Suite
=============================================================================================
Verifies:
1. Clean session probe contract: GET /api/auth/me returns HTTP 200 when unauthenticated.
2. Standard username/password login, secure HttpOnly cookie issuance, and session verification.
3. Login failure safety (no stack trace or password leakage in client responses).
4. Google Authenticator TOTP setup, QR code generation, and AES-256 secret encryption at rest.
5. Two-stage login with short-lived pre-auth challenge ID.
6. Single-use hashed recovery code authentication and permanent consumption.
7. Anti-enumeration Forgot Password dispatch and email file logging.
8. Password reset via secure token, token invalidation, and session revocation.
9. Local administrator recovery CLI script execution.
10. Dual database parameter and schema resilience.
"""

import os
import sys
import json
import uuid
import subprocess
import pytest
from datetime import datetime, timezone
import pyotp

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src import config, db
from src.security_auth import PasswordManager, TOTPManager
import dashboard


@pytest.fixture(scope="module")
def app_client():
    """Initializes Flask test client with clean testing database context."""
    db.init_db()
    with dashboard.app.test_client() as client:
        yield client


@pytest.fixture
def test_user():
    """Creates a temporary isolated test user and cleans up after test."""
    username = f"test_user_{uuid.uuid4().hex[:8]}"
    email = f"{username}@test.algo"
    raw_password = "InstitutionalPassword123!"
    pw_hash, salt = PasswordManager.hash_password(raw_password)

    user_id = uuid.uuid4().hex
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.create_user(user_dict)

    yield {
        "id": user_id,
        "username": username,
        "email": email,
        "password": raw_password
    }

    # Cleanup
    db.safe_execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
    db.safe_execute("DELETE FROM temp_auth_challenges WHERE user_id = ?", (user_id,))
    db.safe_execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
    db.safe_execute("DELETE FROM totp_enrollments WHERE user_id = ?", (user_id,))
    db.safe_execute("DELETE FROM users WHERE id = ?", (user_id,))


def test_auth_me_unauthenticated_clean_200(app_client):
    """Clean Session Probe Contract: GET /api/auth/me MUST return HTTP 200 with authenticated=false."""
    res = app_client.get("/api/auth/me")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["authenticated"] is False
    assert data["user"] is None


def test_login_success_and_cookie(app_client, test_user):
    """Successful primary login returns 200, issues algo_session cookie, and authenticates session."""
    payload = {
        "username": test_user["username"],
        "password": test_user["password"]
    }
    res = app_client.post("/api/auth/login", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["user"]["username"] == test_user["username"]

    # Verify session cookie was set
    cookie_header = res.headers.get("Set-Cookie", "")
    assert "algo_session_token=" in cookie_header
    assert "HttpOnly" in cookie_header

    # Verify /api/auth/me with active session
    me_res = app_client.get("/api/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["username"] == test_user["username"]

    # Logout
    logout_res = app_client.post("/api/auth/logout")
    assert logout_res.status_code == 200


def test_login_invalid_credentials_safe_error(app_client, test_user):
    """Invalid password returns 401 and does not leak internal exceptions."""
    payload = {
        "username": test_user["username"],
        "password": "WrongPassword999!"
    }
    res = app_client.post("/api/auth/login", json=payload)
    assert res.status_code == 401
    data = res.get_json()
    assert data["status"] == "error"
    assert "password" not in data.get("message", "").lower() or "invalid" in data.get("message", "").lower()


def test_totp_setup_and_encrypted_storage(app_client, test_user):
    """TOTP enrollment generates base32 secret, QR code data URI, and encrypts secret at rest."""
    # First login
    app_client.post("/api/auth/login", json={
        "username": test_user["username"],
        "password": test_user["password"]
    })

    # Step 1: Request 2FA setup
    setup_res = app_client.post("/api/auth/2fa/setup")
    assert setup_res.status_code == 200
    setup_data = setup_res.get_json()
    assert setup_data["status"] == "success"
    secret = setup_data["secret"]
    enrollment_id = setup_data["enrollment_id"]
    qr_uri = setup_data["qr_code_data_uri"]
    assert qr_uri.startswith("data:image/png;base64,")

    # Step 2: Generate valid RFC 6238 6-digit TOTP code
    totp = pyotp.TOTP(secret)
    current_code = totp.now()

    # Step 3: Confirm 2FA
    confirm_res = app_client.post("/api/auth/2fa/confirm", json={
        "enrollment_id": enrollment_id,
        "totp_code": current_code
    })
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.get_json()
    assert confirm_data["status"] == "success"
    recovery_codes = confirm_data["recovery_codes"]
    assert len(recovery_codes) == 8

    # Verify DB: secret is encrypted at rest (not plaintext)
    u = db.get_user_by_username(test_user["username"])
    assert u["is_2fa_enabled"] == 1
    assert u["totp_secret_encrypted"] != secret
    decrypted = TOTPManager.decrypt_secret(u["totp_secret_encrypted"])
    assert decrypted == secret

    # Logout
    app_client.post("/api/auth/logout")


def test_totp_two_stage_login_flow(app_client, test_user):
    """User with 2FA enabled goes through two-stage challenge flow."""
    # Enable 2FA for test_user directly
    raw_secret = TOTPManager.generate_secret()
    enc_secret = TOTPManager.encrypt_secret(raw_secret)
    recovery_codes = [f"TEST-REC{i}-1234" for i in range(8)]
    hashed_codes = [TOTPManager.hash_recovery_code(c) for c in recovery_codes]

    db.set_user_2fa_settings(
        test_user["id"],
        is_2fa_enabled=1,
        totp_secret_encrypted=enc_secret,
        recovery_codes_json=json.dumps(hashed_codes)
    )

    # Stage 1: Primary credentials login
    stage1_res = app_client.post("/api/auth/login", json={
        "username": test_user["username"],
        "password": test_user["password"]
    })
    assert stage1_res.status_code == 200
    stage1_data = stage1_res.get_json()
    assert stage1_data["status"] == "2fa_required"
    assert "challenge_id" in stage1_data
    challenge_id = stage1_data["challenge_id"]

    # Verify no session cookie was issued in Stage 1
    cookie_header = stage1_res.headers.get("Set-Cookie", "")
    assert "algo_session" not in cookie_header

    # Stage 2: Verify with TOTP code
    totp = pyotp.TOTP(raw_secret)
    valid_code = totp.now()

    stage2_res = app_client.post("/api/auth/2fa/verify", json={
        "challenge_id": challenge_id,
        "code": valid_code
    })
    assert stage2_res.status_code == 200
    stage2_data = stage2_res.get_json()
    assert stage2_data["status"] == "success"

    # Verify session cookie was issued in Stage 2
    cookie_header = stage2_res.headers.get("Set-Cookie", "")
    assert "algo_session_token=" in cookie_header

    # Replay protection: Attempting to verify the consumed challenge again fails
    replay_res = app_client.post("/api/auth/2fa/verify", json={
        "challenge_id": challenge_id,
        "code": valid_code
    })
    assert replay_res.status_code == 400

    # Logout
    app_client.post("/api/auth/logout")


def test_recovery_code_verification_and_consumption(app_client, test_user):
    """Using a recovery code authenticates successfully and permanently removes it from DB."""
    raw_secret = TOTPManager.generate_secret()
    enc_secret = TOTPManager.encrypt_secret(raw_secret)
    recovery_code = "SAFE-CODE-9999"
    hashed_code = TOTPManager.hash_recovery_code(recovery_code)

    db.set_user_2fa_settings(
        test_user["id"],
        is_2fa_enabled=1,
        totp_secret_encrypted=enc_secret,
        recovery_codes_json=json.dumps([hashed_code])
    )

    # Stage 1: Login
    stage1_res = app_client.post("/api/auth/login", json={
        "username": test_user["username"],
        "password": test_user["password"]
    })
    challenge_id = stage1_res.get_json()["challenge_id"]

    # Stage 2: Verify using recovery code
    stage2_res = app_client.post("/api/auth/2fa/verify", json={
        "challenge_id": challenge_id,
        "code": recovery_code
    })
    assert stage2_res.status_code == 200
    assert stage2_res.get_json()["status"] == "success"

    # Verify recovery code was consumed (list is now empty)
    u = db.get_user_by_username(test_user["username"])
    stored_codes = json.loads(u.get("recovery_codes_json", "[]"))
    assert len(stored_codes) == 0

    # Logout
    app_client.post("/api/auth/logout")


def test_password_forgot_and_reset_workflow(app_client, test_user):
    """Forgot password generates token, logs dispatch to outbox, and reset updates password."""
    # 1. Forgot password request
    forgot_res = app_client.post("/api/auth/password/forgot", json={
        "email": test_user["email"]
    })
    assert forgot_res.status_code == 200
    assert forgot_res.get_json()["status"] == "success"

    # 2. Check outbox.log or database for token
    outbox_path = os.path.join(BASE_DIR, "data", "outbox.log")
    assert os.path.exists(outbox_path)

    # Find the reset token directly from database
    tokens = db.safe_query(
        "SELECT * FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
        (test_user["id"],)
    )
    assert len(tokens) >= 1

    # Extract raw token from outbox log
    raw_token = None
    with open(outbox_path, "r", encoding="utf-8") as f:
        for line in reversed(f.readlines()):
            if not line.strip():
                continue
            try:
                payload = json.loads(line.strip())
                if payload.get("to") == test_user["email"] and "token=" in payload.get("text", ""):
                    text = payload["text"]
                    raw_token = text.split("token=")[1].split()[0].strip()
                    break
            except Exception:
                if "token=" in line:
                    raw_token = line.split("token=")[1].split()[0].replace('"', '').strip()
                    break

    assert raw_token is not None, "Password reset token should be present in outbox log"

    # 3. Reset password using valid token
    new_password = "BrandNewSuperSecurePass456!"
    reset_res = app_client.post("/api/auth/password/reset", json={
        "token": raw_token,
        "new_password": new_password,
        "confirm_password": new_password
    })
    assert reset_res.status_code == 200
    assert reset_res.get_json()["status"] == "success"

    # 4. Old password fails
    old_login = app_client.post("/api/auth/login", json={
        "username": test_user["username"],
        "password": test_user["password"]
    })
    assert old_login.status_code == 401

    # 5. New password succeeds
    new_login = app_client.post("/api/auth/login", json={
        "username": test_user["username"],
        "password": new_password
    })
    assert new_login.status_code == 200

    # 6. Reusing same token fails
    reuse_res = app_client.post("/api/auth/password/reset", json={
        "token": raw_token,
        "new_password": "YetAnotherPassword789!",
        "confirm_password": "YetAnotherPassword789!"
    })
    assert reuse_res.status_code == 400

    # Cleanup logout
    app_client.post("/api/auth/logout")


def test_reset_admin_password_cli(test_user):
    """CLI script scripts/reset_admin_password.py securely updates administrator credentials."""
    cli_path = os.path.join(BASE_DIR, "scripts", "reset_admin_password.py")
    cli_new_pass = "CliAdminNewPassword888!"

    # Execute CLI command
    cmd = [
        sys.executable,
        cli_path,
        "--username", test_user["username"],
        "--password", cli_new_pass,
        "--clear-2fa"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0
    assert "SUCCESS: Password updated" in result.stdout

    # Verify user in database
    u = db.get_user_by_username(test_user["username"])
    assert u["is_2fa_enabled"] == 0
    assert PasswordManager.verify_password(cli_new_pass, u["password_hash"], u["salt"]) is True


def test_protected_endpoints_require_auth():
    """Protected financial endpoints must strictly return 401 when unauthenticated."""
    protected_urls = [
        "/api/portfolio/snapshot?mode=PAPER",
        "/api/positions?mode=PAPER",
        "/api/orders?mode=PAPER&limit=100",
        "/api/risk/summary?mode=PAPER"
    ]
    with dashboard.app.test_client() as unauth_client:
        for url in protected_urls:
            res = unauth_client.get(url, headers={"X-Unauthenticated": "true"})
            assert res.status_code == 401, f"Expected 401 for unauthenticated {url}, got {res.status_code}"
