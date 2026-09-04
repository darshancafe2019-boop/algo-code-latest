"""
Unit and Integration Tests for Real-World Authentication Flow:
- Admin account bound to ashishparadkar1999@gmail.com
- Password verification + mandatory 6-digit Email OTP dispatch (Resend)
- Email OTP challenge verification and HttpOnly session generation
- Rate limiting and cooldown enforcement on Resend OTP
- Full 3-stage Password Reset flow (Request OTP -> Verify OTP -> Set Password)
- Session revocation on password change
- Public unauthenticated GET /api/auth/me contract (No 401 storms)
"""

import hashlib
import json
import pytest
from unittest.mock import patch

from src import db
from src.security_auth import PasswordManager
from dashboard import app

from src.security_auth import PasswordManager, _RATE_LIMIT_STORE

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
        "email": "ashishparadkar1999@gmail.com",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })

def test_admin_user_has_correct_email():
    """Verify admin record in database is bound to ashishparadkar1999@gmail.com."""
    admin = db.get_user_by_username("admin")
    assert admin is not None
    assert admin["email"] == "ashishparadkar1999@gmail.com"
    assert admin["role"] == "ADMIN"
    assert bool(admin["is_active"]) is True

def test_unauthenticated_me_returns_200_not_401(client):
    """GET /api/auth/me without a cookie must return HTTP 200 with authenticated: false to avoid 401 storms."""
    res = client.get("/api/auth/me", headers={"X-Unauthenticated": "true"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["authenticated"] is False
    assert data["user"] is None

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
        assert "ashishparadkar1999@gmail.com" in data["destination"] or "@" in data["destination"]
        challenge_id = data["challenge_id"]

        assert len(captured_otps) == 1
        generated_otp = captured_otps[0]
        assert len(generated_otp) == 6
        assert generated_otp.isdigit()

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

        # 3. Test that the challenge cannot be used again
        reused_res = client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": generated_otp}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert reused_res.status_code in (400, 401)
        assert "already" in reused_res.get_json()["message"].lower() or "expired" in reused_res.get_json()["message"].lower()

def test_resend_email_otp_cooldown(client):
    """POST /api/auth/email-otp/resend respects cooldown and creates fresh challenge."""
    captured_otps = []

    def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
        captured_otps.append(otp_code)
        return True, None, "msg_test_123"

    with patch("dashboard.global_email_service.send_login_otp", side_effect=mock_send_login_otp):
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

def test_forgot_password_and_reset_flow(client):
    """
    Test full 3-step password recovery:
    1. POST /api/auth/password/forgot
    2. POST /api/auth/password/verify-reset-otp -> returns reset_token
    3. POST /api/auth/password/reset -> sets new password
    """
    captured_reset_otps = []

    def mock_send_reset_otp(to_email, otp_code, username=None, user_id=None):
        captured_reset_otps.append(otp_code)
        return True, None, "msg_reset_123"

    with patch("dashboard.global_email_service.send_password_reset_otp", side_effect=mock_send_reset_otp), \
         patch("dashboard.global_email_service.send_login_otp", return_value=(True, None, "login_otp_123")), \
         patch("dashboard.global_email_service.send_password_changed_notification", return_value=(True, None, "notif_123")):

        # Step 1: Request Password Reset
        req_res = client.post(
            "/api/auth/password/forgot",
            data=json.dumps({"email": "admin"}),
            content_type="application/json",
            headers={"X-Unauthenticated": "true"}
        )
        assert req_res.status_code == 200
        req_data = req_res.get_json()
        assert req_data["status"] == "success"
        challenge_id = req_data["challenge_id"]

        assert len(captured_reset_otps) == 1
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
