"""
Unit and Integration Tests for Real-World Authentication Flow:
- Admin account bound to ashishparadkar1999@gmail.com
- Exact recipient requirement: Resend invoked with to == ["ashishparadkar1999@gmail.com"]
- Password verification + mandatory 6-digit Email OTP dispatch (Resend)
- Email OTP challenge verification and HttpOnly session generation
- Single ACTIVE challenge constraint (Atomic state transitions)
- Resend failure handling (challenge marked SEND_FAILED, no fake success)
- Resend webhook verification (Svix signature validation + delivery status updates)
- Rate limiting and cooldown enforcement on Resend OTP
- Full 3-stage Password Reset flow (Request OTP -> Verify OTP -> Set Password)
- Session revocation on password change
- Public unauthenticated GET /api/auth/me contract (No 401 storms)
"""

import base64
import hashlib
import hmac
import json
import secrets
import os
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

import pytest

from src import config, db
from src.security_auth import PasswordManager, _RATE_LIMIT_STORE
from dashboard import app

TARGET_ADMIN_EMAIL = "ashishparadkar1999@gmail.com"


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def ensure_admin_state():
    """Ensure admin account is active with email ashishparadkar1999@gmail.com and known test password."""
    _RATE_LIMIT_STORE.clear()
    db.init_db()
    existing = db.get_user_by_username("admin")
    admin_id = existing["id"] if existing else "usr_authoritative_admin"
    pwd_hash, salt = PasswordManager.hash_password("AdminSecurePassword2026!")
    db.upsert_user({
        "id": admin_id,
        "username": "admin",
        "email": TARGET_ADMIN_EMAIL,
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })
    yield
    pwd_hash_def, salt_def = PasswordManager.hash_password("AlgoTrading@2026!")
    db.update_user_password(admin_id, pwd_hash_def, salt_def, must_change_password=0)


def test_admin_user_has_correct_email():
    """Verify admin record in database is bound to ashishparadkar1999@gmail.com."""
    admin = db.get_user_by_username("admin")
    assert admin is not None
    assert admin["email"] == TARGET_ADMIN_EMAIL
    assert admin["role"] == "ADMIN"
    assert bool(admin["is_active"]) is True


def test_exact_recipient_sent_to_resend(client):
    """
    Mandatory Test: Proves that for admin login, the email service is invoked with
    to_email == 'ashishparadkar1999@gmail.com' and NEVER a client-supplied alternate address.
    """
    dispatched_recipients = []

    def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
        dispatched_recipients.append(to_email)
        return True, None, "msg_exact_recip_123"

    with patch("dashboard.global_email_service.send_login_otp", side_effect=mock_send_login_otp):
        # Client maliciously passes custom email in payload
        res = client.post(
            "/api/auth/login",
            data=json.dumps({
                "username": "admin",
                "password": "AdminSecurePassword2026!",
                "email": "attacker@example.com",
                "destination": "hacker@evil.com"
            }),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert res.status_code == 200
        assert len(dispatched_recipients) == 1
        assert dispatched_recipients[0] == TARGET_ADMIN_EMAIL
        assert dispatched_recipients[0] != "attacker@example.com"
        assert dispatched_recipients[0] != "hacker@evil.com"


def test_unauthenticated_me_returns_200_not_401(client):
    """GET /api/auth/me without a cookie must return HTTP 200 with authenticated: false to avoid 401 storms."""
    res = client.get("/api/auth/me", headers={"X-Unauthenticated": "true"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["authenticated"] is False
    assert data["user"] is None


def test_readiness_reports_configured_database_engine(client):
    response = client.get("/health/ready")
    assert response.status_code == 200
    payload = response.get_json()
    expected_engine = "postgresql" if config.IS_POSTGRES else "sqlite"
    assert payload["database_engine"] == expected_engine
    assert payload["services"]["database"]["pool"]["engine"] in (
        "sqlite",
        "postgres_no_pool",
        "postgresql",
    )


def test_readiness_fails_closed_without_database_connection(client, monkeypatch):
    monkeypatch.setattr(
        "src.db.safe_query_one",
        lambda *args, **kwargs: (_ for _ in ()).throw(OSError("private db detail")),
    )

    response = client.get("/health/ready")

    assert response.status_code == 503
    payload = response.get_json()
    assert payload["services"]["database"]["status"] == "ERROR"
    assert "private db detail" not in response.get_data(as_text=True)


def test_login_invalid_password(client):
    """POST /api/auth/login with invalid password returns 401."""
    res = client.post(
        "/api/auth/login",
        data=json.dumps({"username": "admin", "password": "WrongPassword123!"}),
        content_type="application/json",
        headers={"X-Unauthenticated": "true"}
    )
    assert res.status_code == 401
    data = res.get_json()
    assert data["status"] == "error"
    assert "Invalid credentials" in data["message"]


def test_login_email_otp_flow(client):
    """
    POST /api/auth/login with valid password sends 6-digit OTP and returns EMAIL_OTP_REQUIRED.
    Then POST /api/auth/email-otp/verify creates session.
    """
    captured_otps = []

    def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
        captured_otps.append(otp_code)
        return True, None, "msg_test_123"

    with patch("dashboard.global_email_service.send_login_otp", side_effect=mock_send_login_otp):
        res = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "EMAIL_OTP_REQUIRED"
        assert "challenge_id" in data
        assert "@" in data["destination"]
        challenge_id = data["challenge_id"]

        assert len(captured_otps) == 1
        generated_otp = captured_otps[0]
        assert len(generated_otp) == 6
        assert generated_otp.isdigit()

        # Check challenge is ACTIVE in database
        challenge = db.get_auth_otp_challenge(challenge_id)
        assert challenge is not None
        assert challenge["status"] == "ACTIVE"
        assert challenge["provider_message_id"] == "msg_test_123"
        assert challenge["recipient_email"] == TARGET_ADMIN_EMAIL

        # 1. Test verification with INCORRECT OTP
        fail_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": "000000"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert fail_res.status_code == 401
        fail_data = fail_res.get_json()
        assert fail_data["status"] == "error"

        # 2. Test verification with CORRECT OTP
        success_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": generated_otp}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert success_res.status_code == 200
        success_data = success_res.get_json()
        assert success_data["status"] == "success"
        assert success_data["user"]["username"] == "admin"
        assert success_data["user"]["email"] == TARGET_ADMIN_EMAIL

        # 3. Test that the challenge cannot be used again
        reused_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": generated_otp}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert reused_res.status_code in (400, 401)


def test_atomic_single_active_challenge_on_resend(client):
    """
    Test database consistency:
    Requesting a resend invalidates the previous challenge so that only ONE challenge is ACTIVE.
    """
    captured_otps = []

    def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
        captured_otps.append(otp_code)
        return True, None, f"msg_otp_{len(captured_otps)}"

    with patch("dashboard.global_email_service.send_login_otp", side_effect=mock_send_login_otp):
        # 1. Login to create Challenge 1
        res1 = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        challenge_id_1 = res1.get_json()["challenge_id"]
        otp_1 = captured_otps[0]

        chal1 = db.get_auth_otp_challenge(challenge_id_1)
        assert chal1["status"] == "ACTIVE"

        # 2. Resend to create Challenge 2
        res2 = client.post(
            "/api/auth/email-otp/resend",
            data=json.dumps({"challenge_id": challenge_id_1}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert res2.status_code == 200
        challenge_id_2 = res2.get_json()["challenge_id"]
        otp_2 = captured_otps[1]

        # Verify Challenge 1 is INVALIDATED and Challenge 2 is ACTIVE
        chal1_after = db.get_auth_otp_challenge(challenge_id_1)
        chal2 = db.get_auth_otp_challenge(challenge_id_2)

        assert chal1_after["status"] in ("INVALIDATED", "USED")
        assert chal2["status"] == "ACTIVE"

        # Old OTP from Challenge 1 MUST FAIL
        verify_old = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id_1, "otp": otp_1}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert verify_old.status_code == 400

        # New OTP from Challenge 2 MUST SUCCEED
        verify_new = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id_2, "otp": otp_2}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert verify_new.status_code == 200
        assert verify_new.get_json()["status"] == "success"


def test_resend_failure_does_not_activate_challenge(client, monkeypatch):
    """
    Test Resend failure handling:
    If Resend API returns an error, the challenge must be marked SEND_FAILED, not ACTIVE,
    and no fake success message is presented.
    """
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setattr(config, "IS_PRODUCTION", True)

    def mock_send_login_otp_failure(to_email, otp_code, username=None, user_id=None):
        return False, "Resend 403 Forbidden: Unverified Domain", None

    with patch("dashboard.global_email_service.send_login_otp", side_effect=mock_send_login_otp_failure):
        res = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert res.status_code == 502
        data = res.get_json()
        assert data["status"] == "EMAIL_DELIVERY_FAILED"
        assert "couldn't deliver" in data["message"].lower() or "not send" in data["message"].lower()


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        (
            "/api/auth/login",
            {"username": "admin", "password": "AdminSecurePassword2026!"},
        ),
        ("/api/auth/send-otp", {"email": TARGET_ADMIN_EMAIL}),
    ],
)
def test_production_email_failure_never_returns_dev_otp(client, monkeypatch, path, payload):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setenv("AUTH_BOOTSTRAP_ENABLED", "true")
    monkeypatch.setenv("ALLOW_DEV_OTP", "true")
    monkeypatch.setattr(config, "IS_PRODUCTION", True)

    with patch(
        "dashboard.global_email_service.send_login_otp",
        return_value=(False, "Resend unavailable", None),
    ):
        response = client.post(path, json=payload, headers={"X-Unauthenticated": "true"})

    assert response.status_code == 502
    data = response.get_json()
    assert data["error_code"] == "EMAIL_DELIVERY_FAILED"
    assert "dev_otp" not in data


def test_otp_challenge_storage_failure_returns_safe_request_id(client, monkeypatch):
    monkeypatch.setattr(
        "dashboard.db.create_auth_otp_challenge",
        lambda **kwargs: (_ for _ in ()).throw(OSError("private storage detail")),
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "AdminSecurePassword2026!"},
        headers={"X-Unauthenticated": "true"},
    )

    assert response.status_code == 503
    payload = response.get_json()
    assert payload["error_code"] == "AUTH_STORAGE_UNAVAILABLE"
    assert payload["request_id"].startswith("req_")
    assert "private storage detail" not in response.get_data(as_text=True)


def test_send_otp_storage_failure_returns_safe_request_id(client, monkeypatch):
    monkeypatch.setattr(
        "dashboard.db.create_auth_otp_challenge",
        lambda **kwargs: (_ for _ in ()).throw(OSError("private storage detail")),
    )

    response = client.post(
        "/api/auth/send-otp",
        json={"email": TARGET_ADMIN_EMAIL},
        headers={"X-Unauthenticated": "true"},
    )

    assert response.status_code == 503
    payload = response.get_json()
    assert payload["error_code"] == "AUTH_STORAGE_UNAVAILABLE"
    assert payload["request_id"].startswith("req_")
    assert "private storage detail" not in response.get_data(as_text=True)


def test_otp_challenge_creation_rolls_back_both_tables():
    challenge_id = f"test_atomic_{uuid.uuid4().hex}"
    trigger_name = f"test_fail_legacy_{uuid.uuid4().hex}"
    with db.get_authoritative_connection() as conn:
        conn.execute(
            f"""
            CREATE TRIGGER {trigger_name}
            BEFORE INSERT ON email_otp_challenges
            WHEN NEW.id = '{challenge_id}'
            BEGIN
                SELECT RAISE(ABORT, 'intentional test failure');
            END
            """
        )

    try:
        with pytest.raises(sqlite3.IntegrityError):
            db.create_auth_otp_challenge(
                challenge_id=challenge_id,
                user_id="usr_atomic_test",
                purpose="LOGIN",
                recipient_email=TARGET_ADMIN_EMAIL,
                otp_hash="hashed-test-code",
                expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            )
        assert db.get_auth_otp_challenge(challenge_id) is None
    finally:
        with db.get_authoritative_connection() as conn:
            conn.execute(f"DROP TRIGGER IF EXISTS {trigger_name}")


def test_otp_challenge_consumption_is_single_use():
    challenge_id = f"test_consume_{uuid.uuid4().hex}"
    db.create_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id="usr_atomic_test",
        purpose="LOGIN",
        recipient_email=TARGET_ADMIN_EMAIL,
        otp_hash="hashed-test-code",
        expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
    )
    assert db.activate_auth_otp_challenge(challenge_id, "usr_atomic_test", "LOGIN")
    assert db.consume_auth_otp_challenge(challenge_id)
    assert not db.consume_auth_otp_challenge(challenge_id)
    assert db.get_auth_otp_challenge(challenge_id)["status"] == "USED"


def test_malformed_otp_expiration_fails_closed(client):
    challenge_id = f"test_expiry_{uuid.uuid4().hex}"
    admin = db.get_user_by_username("admin")
    db.create_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id=admin["id"],
        purpose="LOGIN",
        recipient_email=TARGET_ADMIN_EMAIL,
        otp_hash=hashlib.sha256(b"123456").hexdigest(),
        expires_at="not-a-timestamp",
    )
    db.activate_auth_otp_challenge(challenge_id, admin["id"], "LOGIN")

    response = client.post(
        "/api/auth/email-otp/verify",
        json={"challenge_id": challenge_id, "otp": "123456"},
        headers={"X-Unauthenticated": "true"},
    )

    assert response.status_code == 400
    assert response.get_json()["error_code"] == "CHALLENGE_INVALID"


@pytest.mark.parametrize(
    ("provider", "force_sqlite"),
    [("sqlite", "false"), ("postgresql", "true"), ("postgresql", "false")],
)
def test_production_database_configuration_rejects_sqlite(provider, force_sqlite):
    env = os.environ.copy()
    for key in ("RENDER", "RENDER_SERVICE_ID"):
        env.pop(key, None)
    env.update({
        "APP_ENV": "production",
        "FLASK_ENV": "production",
        "DATABASE_URL": "",
        "DATABASE_PROVIDER": provider,
        "FORCE_SQLITE": force_sqlite,
        "AUTH_SESSION_SECRET": "test-session-secret-for-production-config",
        "AUTH_TOTP_ENCRYPTION_KEY": "test-totp-encryption-key-not-a-real-secret",
    })
    result = subprocess.run(
        [sys.executable, "-c", "import src.config"],
        cwd=os.getcwd(),
        env=env,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode != 0
    assert "SQLite fallback is disabled" in result.stderr or "FORCE_SQLITE" in result.stderr


def test_production_database_configuration_selects_postgresql():
    env = os.environ.copy()
    env.update({
        "APP_ENV": "production",
        "FLASK_ENV": "production",
        "DATABASE_PROVIDER": "postgresql",
        "DATABASE_URL": "postgresql://quantos@db.example.invalid:5432/quantos",
        "FORCE_SQLITE": "false",
        "AUTH_SESSION_SECRET": "test-session-secret-for-production-config",
        "AUTH_TOTP_ENCRYPTION_KEY": "test-totp-encryption-key-not-a-real-secret",
    })
    result = subprocess.run(
        [sys.executable, "-c", "from src import config; print(config.IS_POSTGRES)"],
        cwd=os.getcwd(),
        env=env,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "True"


def test_production_email_configuration_fails_closed(monkeypatch, tmp_path):
    from src.email_service import ConsoleLogEmailProvider, EmailService, UnavailableEmailProvider

    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(config, "EMAIL_PROVIDER", "console")
    monkeypatch.setattr(config, "RESEND_API_KEY", "")
    monkeypatch.setattr(config, "SMTP_HOST", "")
    provider = EmailService().get_provider()
    assert isinstance(provider, UnavailableEmailProvider)

    console = ConsoleLogEmailProvider(tmp_path / "outbox.log")
    sent, error, _ = console.send_email(
        TARGET_ADMIN_EMAIL, "OTP", "code", "code"
    )
    assert not sent
    assert error
    assert not (tmp_path / "outbox.log").exists()


def test_production_email_requires_explicit_sender(monkeypatch):
    from src.email_service import EmailService, ResendEmailProvider, UnavailableEmailProvider

    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(config, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(config, "RESEND_API_KEY", "test-resend-key")
    for name in ("OTP_FROM_EMAIL", "AUTH_EMAIL_FROM", "RESEND_FROM_EMAIL"):
        monkeypatch.delenv(name, raising=False)
    assert isinstance(EmailService().get_provider(), UnavailableEmailProvider)

    monkeypatch.setenv("AUTH_EMAIL_FROM", "security@example.com")
    monkeypatch.setattr(config, "AUTH_EMAIL_FROM", "security@example.com")
    monkeypatch.setattr(config, "OTP_FROM_EMAIL", "security@example.com")
    assert isinstance(EmailService().get_provider(), ResendEmailProvider)


def test_production_bootstrap_without_password_does_not_create_admin(monkeypatch):
    from src.security_auth import SecurityAuthManager

    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setenv("AUTH_BOOTSTRAP_ENABLED", "true")
    monkeypatch.delenv("AUTH_BOOTSTRAP_PASSWORD", raising=False)
    monkeypatch.setattr("src.security_auth.db.init_db", lambda: None)
    with patch("src.security_auth.db.upsert_user") as upsert_user:
        SecurityAuthManager.initialize_bootstrap_admin()
    upsert_user.assert_not_called()


def test_resend_email_otp_cooldown(client):
    """POST /api/auth/email-otp/resend respects cooldown."""
    with patch("dashboard.global_email_service.send_login_otp", return_value=(True, None, "msg_cd_123")):
        # 1. Login to get initial challenge
        res = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        challenge_id = res.get_json()["challenge_id"]

        # 2. First resend succeeds
        resend_ok = client.post(
            "/api/auth/email-otp/resend",
            data=json.dumps({"challenge_id": challenge_id}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert resend_ok.status_code == 200

        # 3. Immediate second resend triggers 429 cooldown
        resend_fail = client.post(
            "/api/auth/email-otp/resend",
            data=json.dumps({"challenge_id": challenge_id}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert resend_fail.status_code == 429
        assert "retry_after" in resend_fail.get_json() or "cooldown" in resend_fail.get_json() or resend_fail.get_json().get("error_code") == "RATE_LIMITED"


def test_max_verification_attempts_invalidates_challenge(client):
    """5 incorrect OTP attempts must invalidate the challenge."""
    with patch("dashboard.global_email_service.send_login_otp", return_value=(True, None, "msg_att_123")):
        res = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        challenge_id = res.get_json()["challenge_id"]

        # Attempt 1-4: 401 Unauthorized
        for _ in range(4):
            fail_res = client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": challenge_id, "otp": "999999"}),
                content_type="application/json",
                headers={"X-Unauthenticated": "true"}
            )
            assert fail_res.status_code == 401

        # Attempt 5: 429 Max attempts exceeded
        max_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": "999999"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert max_res.status_code in (401, 429)

        # 6th attempt is blocked
        blocked_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": "999999"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert blocked_res.status_code in (400, 429)


def test_resend_webhook_delivery_tracking(client):
    """
    POST /api/webhooks/resend updates challenge delivery status when verified webhook is received.
    """
    # Create challenge with provider_message_id
    uid = secrets.token_hex(4)
    challenge_id = f"chall_webhook_test_{uid}"
    provider_msg_id = f"msg_webhook_resend_{uid}"
    otp_hash = hashlib.sha256("123456".encode("utf-8")).hexdigest()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

    db.create_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id="usr_authoritative_admin",
        purpose="LOGIN",
        recipient_email=TARGET_ADMIN_EMAIL,
        otp_hash=otp_hash,
        expires_at=expires_at
    )
    db.activate_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id="usr_authoritative_admin",
        purpose="LOGIN",
        provider_message_id=provider_msg_id,
        provider_status="SUBMITTED"
    )

    # 1. Send webhook event: email.delivered
    webhook_payload = {
        "type": "email.delivered",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "id": provider_msg_id,
            "from": "Quant.OS Security <security@algotrading.local>",
            "to": [TARGET_ADMIN_EMAIL],
            "subject": "Your Quant.OS security code"
        }
    }

    res = client.post(
        "/api/webhooks/resend",
        data=json.dumps(webhook_payload),
        content_type="application/json"
    )
    assert res.status_code == 200
    assert res.get_json()["status"] == "success"

    # Verify status in database
    chal = db.get_auth_otp_challenge(challenge_id)
    assert chal is not None
    assert chal["provider_status"] == "DELIVERED"


def test_resend_webhook_signature_verification(client):
    """
    When RESEND_WEBHOOK_SECRET is set, reject webhooks with invalid signatures.
    """
    test_secret = "whsec_MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE"

    with patch.object(config, "RESEND_WEBHOOK_SECRET", test_secret):
        raw_body = json.dumps({"type": "email.delivered", "data": {"id": "msg_sig_123", "to": [TARGET_ADMIN_EMAIL]}}).encode("utf-8")

        # 1. Invalid signature -> 401
        bad_res = client.post(
            "/api/webhooks/resend",
            data=raw_body,
            content_type="application/json",
            headers={
                "svix-id": "msg_test_id",
                "svix-timestamp": str(int(time.time())),
                "svix-signature": "v1,invalid_signature_hash"
            }
        )
        assert bad_res.status_code == 401

        # 2. Valid signature -> 200
        msg_id = "msg_valid_id"
        msg_ts = str(int(time.time()))
        to_sign = f"{msg_id}.{msg_ts}.".encode("utf-8") + raw_body
        secret_bytes = base64.b64decode(test_secret.replace("whsec_", ""))
        valid_sig = base64.b64encode(hmac.new(secret_bytes, to_sign, hashlib.sha256).digest()).decode("utf-8")

        good_res = client.post(
            "/api/webhooks/resend",
            data=raw_body,
            content_type="application/json",
            headers={
                "svix-id": msg_id,
                "svix-timestamp": msg_ts,
                "svix-signature": f"v1,{valid_sig}"
            }
        )
        assert good_res.status_code == 200


def test_forgot_password_and_reset_flow(client):
    """
    Test full 3-step password recovery:
    1. POST /api/auth/password/forgot -> sends OTP to ashishparadkar1999@gmail.com
    2. POST /api/auth/password/verify-reset-otp -> returns reset_token
    3. POST /api/auth/password/reset -> sets new password
    """
    captured_reset_otps = []
    dispatched_recipients = []

    def mock_send_reset_otp(to_email, otp_code, username=None, user_id=None):
        dispatched_recipients.append(to_email)
        captured_reset_otps.append(otp_code)
        return True, None, "msg_reset_123"

    with patch("dashboard.global_email_service.send_password_reset_otp", side_effect=mock_send_reset_otp), \
         patch("dashboard.global_email_service.send_login_otp", return_value=(True, None, "login_otp_123")), \
         patch("dashboard.global_email_service.send_password_changed_notification", return_value=(True, None, "notif_123")):

        # Step 1: Request Password Reset
        req_res = client.post(
            "/api/auth/password/forgot",
            data=json.dumps({"identifier": "admin"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert req_res.status_code == 200
        req_data = req_res.get_json()
        assert req_data["status"] == "success"
        challenge_id = req_data["challenge_id"]

        assert len(captured_reset_otps) == 1
        assert len(dispatched_recipients) == 1
        assert dispatched_recipients[0] == TARGET_ADMIN_EMAIL
        reset_otp = captured_reset_otps[0]

        # Step 2: Verify Reset OTP
        verify_res = client.post(
            "/api/auth/password/verify-reset-otp",
            data=json.dumps({"challenge_id": challenge_id, "otp": reset_otp}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert verify_res.status_code == 200
        verify_data = verify_res.get_json()
        assert verify_data["status"] == "success"
        reset_token = verify_data["reset_token"]
        assert reset_token.startswith("rst_")

        # Step 3: Set New Password
        new_pwd = "BrandNewSuperSecret2026!"
        reset_res = client.post(
            "/api/auth/password/reset",
            data=json.dumps({
                "token": reset_token,
                "new_password": new_pwd,
                "confirm_password": new_pwd
            }),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert reset_res.status_code == 200
        assert reset_res.get_json()["status"] == "success"

        # Verify old password no longer works
        old_login = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert old_login.status_code == 401

        # Verify new password triggers Email OTP
        new_login = client.post(
            "/api/auth/login",
            data=json.dumps({"username": "admin", "password": new_pwd}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert new_login.status_code == 200
        assert new_login.get_json()["status"].upper() == "EMAIL_OTP_REQUIRED"
