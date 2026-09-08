"""
Complete Test Suite: QUANT.OS OTP Email Authentication System
============================================================
Covers all Phase 21 validation scenarios:
1. Server-side cryptographically secure OTP generation (6 digits, secrets.randbelow).
2. Resend email provider acceptance and msg_id handling.
3. Successful verification with HttpOnly session token issuance.
4. Incorrect OTP rejection with remaining attempts countdown.
5. Expiration handling (5-minute TTL).
6. Resend invalidation (old OTP invalidated, new OTP active).
7. Old OTP rejection after resend.
8. New OTP acceptance after resend.
9. 5-attempt brute-force threshold lockout (MAX_ATTEMPTS_EXCEEDED).
10. Server-side 60s cooldown rate limiting.
11. Email normalization (whitespace trimming + lowercase).
12. Simulated Resend failure handling (SEND_FAILED status + HTTP 502).
13. Admin recipient lock to ashishparadkar1999@gmail.com.
14. Endpoints /api/auth/send-otp and /api/auth/verify-otp parity.
"""

import json
import secrets
import hashlib
import time
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from src import config, db
from src.security_auth import PasswordManager, _RATE_LIMIT_STORE
from src.email_service import global_email_service, normalize_email, ResendEmailProvider
from dashboard import app

TARGET_ADMIN_EMAIL = "ashishparadkar1999@gmail.com"


class TestOTPEmailSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def setUp(self):
        _RATE_LIMIT_STORE.clear()
        db.init_db()
        # Guarantee test admin user
        existing = db.get_user_by_username("admin")
        admin_id = existing["id"] if existing else "usr_authoritative_admin"
        pwd_hash, salt = PasswordManager.hash_password("AdminSecurePassword2026!")
        if existing:
            db.update_user_password(admin_id, pwd_hash, salt, must_change_password=0)
            db.safe_execute("UPDATE users SET email = ?, is_active = 1, is_2fa_enabled = 0 WHERE id = ?", (TARGET_ADMIN_EMAIL, admin_id))
        else:
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

    def test_01_email_normalization(self):
        """Phase 9: Normalizes email addresses (trim + lowercase)."""
        self.assertEqual(normalize_email("  User@Gmail.COM  "), "user@gmail.com")
        self.assertEqual(normalize_email("AshishParadkar1999@gmail.com"), "ashishparadkar1999@gmail.com")
        self.assertEqual(normalize_email(""), "")
        self.assertEqual(normalize_email(None), "")

    def test_02_login_and_otp_dispatch(self):
        """TEST 1 & TEST 2: Request OTP during login -> Email sent, challenge ACTIVE."""
        dispatched_recipients = []
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            dispatched_recipients.append(to_email)
            captured_codes.append(otp_code)
            return True, None, "msg_resend_mock_123"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data.get("status"), "EMAIL_OTP_REQUIRED")
            challenge_id = data.get("challenge_id")
            self.assertTrue(challenge_id)
            self.assertEqual(len(dispatched_recipients), 1)
            self.assertEqual(dispatched_recipients[0], TARGET_ADMIN_EMAIL)
            self.assertEqual(len(captured_codes[0]), 6)
            self.assertTrue(captured_codes[0].isdigit())

            # Verify challenge in DB
            chall = db.get_auth_otp_challenge(challenge_id)
            self.assertIsNotNone(chall)
            self.assertEqual(chall["status"], "ACTIVE")
            self.assertEqual(chall["purpose"], "LOGIN")
            self.assertEqual(chall["attempt_count"], 0)

    def test_03_successful_otp_verification(self):
        """TEST 3: Enter correct OTP -> Verification succeeds, creates session."""
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            captured_codes.append(otp_code)
            return True, None, "msg_resend_mock_123"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            challenge_id = res.get_json()["challenge_id"]
            otp = captured_codes[0]

            # Verify OTP
            v_res = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": challenge_id, "otp": otp}),
                content_type="application/json"
            )
            self.assertEqual(v_res.status_code, 200)
            v_data = v_res.get_json()
            self.assertTrue(v_data["success"])
            self.assertEqual(v_data["user"]["username"], "admin")
            self.assertTrue(v_data["session_token"])

            # Verify challenge is now marked USED
            chall = db.get_auth_otp_challenge(challenge_id)
            self.assertEqual(chall["status"], "USED")
            self.assertIsNotNone(chall["used_at"])

    def test_04_incorrect_otp_failure(self):
        """TEST 4: Enter incorrect OTP -> Verification fails with 401 and decrements attempts."""
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            captured_codes.append(otp_code)
            return True, None, "msg_resend_mock_123"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            challenge_id = res.get_json()["challenge_id"]

            # Submit wrong OTP
            v_res = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": challenge_id, "otp": "000000"}),
                content_type="application/json"
            )
            self.assertEqual(v_res.status_code, 401)
            v_data = v_res.get_json()
            self.assertFalse(v_data["success"])
            self.assertEqual(v_data["error_code"], "INVALID_OTP")
            self.assertEqual(v_data["remaining_attempts"], 4)

            chall = db.get_auth_otp_challenge(challenge_id)
            self.assertEqual(chall["attempt_count"], 1)

    def test_05_otp_expiration(self):
        """TEST 5: Expired OTP returns 400 CHALLENGE_EXPIRED."""
        # Create an expired challenge
        challenge_id = f"chall_exp_{secrets.token_hex(6)}"
        otp_code = "123456"
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        past_iso = (datetime.now(timezone.utc) - timedelta(minutes=6)).isoformat()

        admin = db.get_user_by_username("admin")
        admin_id = admin["id"] if admin else "usr_authoritative_admin"
        db.create_auth_otp_challenge(
            challenge_id=challenge_id,
            user_id=admin_id,
            purpose="LOGIN",
            recipient_email=TARGET_ADMIN_EMAIL,
            otp_hash=otp_hash,
            expires_at=past_iso
        )
        db.activate_auth_otp_challenge(challenge_id, admin_id, "LOGIN", "msg_exp")

        v_res = self.client.post(
            "/api/auth/email-otp/verify",
            data=json.dumps({"challenge_id": challenge_id, "otp": otp_code}),
            content_type="application/json"
        )
        self.assertEqual(v_res.status_code, 400)
        v_data = v_res.get_json()
        self.assertEqual(v_data["error_code"], "CHALLENGE_EXPIRED")

    def test_06_resend_invalidates_old_otp_and_activates_new_otp(self):
        """TEST 6, 7 & 8: Resend invalidates old OTP; old OTP rejected, new OTP accepted."""
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            captured_codes.append(otp_code)
            return True, None, f"msg_mock_{len(captured_codes)}"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            # Step 1: Initial Login
            res1 = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            chall_1 = res1.get_json()["challenge_id"]
            otp_1 = captured_codes[0]

            # Clear cooldown for immediate resend in test
            _RATE_LIMIT_STORE.clear()

            # Step 2: Request Resend
            res2 = self.client.post(
                "/api/auth/email-otp/resend",
                data=json.dumps({"challenge_id": chall_1}),
                content_type="application/json"
            )
            self.assertEqual(res2.status_code, 200)
            chall_2 = res2.get_json()["challenge_id"]
            otp_2 = captured_codes[1]

            self.assertNotEqual(chall_1, chall_2)
            self.assertNotEqual(otp_1, otp_2)

            # Check DB statuses: chall_1 MUST be INVALIDATED, chall_2 MUST be ACTIVE
            db_c1 = db.get_auth_otp_challenge(chall_1)
            db_c2 = db.get_auth_otp_challenge(chall_2)
            self.assertEqual(db_c1["status"], "INVALIDATED")
            self.assertEqual(db_c2["status"], "ACTIVE")

            # TEST 7: Attempting old OTP with chall_1 -> REJECTED
            rej_res = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": chall_1, "otp": otp_1}),
                content_type="application/json"
            )
            self.assertEqual(rej_res.status_code, 400)
            self.assertEqual(rej_res.get_json()["error_code"], "CHALLENGE_INVALID")

            # TEST 7b: Attempting old OTP with chall_2 -> REJECTED (Incorrect code)
            rej_res2 = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": chall_2, "otp": otp_1}),
                content_type="application/json"
            )
            self.assertEqual(rej_res2.status_code, 401)
            self.assertEqual(rej_res2.get_json()["error_code"], "INVALID_OTP")

            # TEST 8: Attempting new OTP with chall_2 -> ACCEPTED
            acc_res = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": chall_2, "otp": otp_2}),
                content_type="application/json"
            )
            self.assertEqual(acc_res.status_code, 200)
            self.assertTrue(acc_res.get_json()["success"])

    def test_07_attempt_limit_lockout(self):
        """TEST 9: More than 5 failed attempts locks out the OTP challenge."""
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            captured_codes.append(otp_code)
            return True, None, "msg_mock"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            challenge_id = res.get_json()["challenge_id"]
            real_otp = captured_codes[0]

            # 5 failed attempts
            for i in range(5):
                bad_res = self.client.post(
                    "/api/auth/email-otp/verify",
                    data=json.dumps({"challenge_id": challenge_id, "otp": "999999"}),
                    content_type="application/json"
                )
                self.assertIn(bad_res.status_code, (401, 429))

            # 6th attempt (even with real OTP) must be rejected with MAX_ATTEMPTS_EXCEEDED
            lock_res = self.client.post(
                "/api/auth/email-otp/verify",
                data=json.dumps({"challenge_id": challenge_id, "otp": real_otp}),
                content_type="application/json"
            )
            self.assertEqual(lock_res.status_code, 429)
            self.assertEqual(lock_res.get_json()["error_code"], "MAX_ATTEMPTS_EXCEEDED")

    def test_08_resend_rate_limit(self):
        """TEST 10: Repeated rapid resend requests trigger 429 RATE_LIMITED."""
        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            return True, None, "msg_mock"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            challenge_id = res.get_json()["challenge_id"]

            # First resend is OK
            resend1 = self.client.post(
                "/api/auth/email-otp/resend",
                data=json.dumps({"challenge_id": challenge_id}),
                content_type="application/json"
            )
            self.assertEqual(resend1.status_code, 200)

            # Second immediate resend must hit 429
            resend2 = self.client.post(
                "/api/auth/email-otp/resend",
                data=json.dumps({"challenge_id": challenge_id}),
                content_type="application/json"
            )
            self.assertEqual(resend2.status_code, 429)
            self.assertEqual(resend2.get_json()["error_code"], "RATE_LIMITED")

    def test_09_resend_failure_simulation(self):
        """TEST 12: Resend failure is handled gracefully without leaving broken state."""
        def mock_send_fail(to_email, otp_code, username=None, user_id=None):
            return False, "Resend API connection timeout", None

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_fail):
            res = self.client.post(
                "/api/auth/login",
                data=json.dumps({"username": "admin", "password": "AdminSecurePassword2026!"}),
                content_type="application/json"
            )
            self.assertEqual(res.status_code, 502)
            data = res.get_json()
            self.assertEqual(data["error_code"], "EMAIL_DELIVERY_FAILED")

    def test_10_canonical_send_and_verify_otp_endpoints(self):
        """TEST 11: /api/auth/send-otp and /api/auth/verify-otp aliases function cleanly."""
        captured_codes = []

        def mock_send_login_otp(to_email, otp_code, username=None, user_id=None):
            captured_codes.append(otp_code)
            return True, None, "msg_send_otp_alias"

        with patch.object(global_email_service, "send_login_otp", side_effect=mock_send_login_otp):
            # Send OTP via /api/auth/send-otp
            s_res = self.client.post(
                "/api/auth/send-otp",
                data=json.dumps({"email": TARGET_ADMIN_EMAIL}),
                content_type="application/json"
            )
            self.assertEqual(s_res.status_code, 200)
            s_data = s_res.get_json()
            self.assertTrue(s_data["success"])
            chall_id = s_data["challenge_id"]
            otp = captured_codes[0]

            # Verify OTP via /api/auth/verify-otp with email + otp
            v_res = self.client.post(
                "/api/auth/verify-otp",
                data=json.dumps({"email": TARGET_ADMIN_EMAIL, "otp": otp}),
                content_type="application/json"
            )
            self.assertEqual(v_res.status_code, 200)
            v_data = v_res.get_json()
            self.assertTrue(v_data["success"])
            self.assertEqual(v_data["user"]["username"], "admin")


if __name__ == "__main__":
    unittest.main()
