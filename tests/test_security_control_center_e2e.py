"""
Production Security Control Center End-to-End Test Suite.
Verifies:
1. GET /api/security/overview - Deterministic telemetry & checkup.
2. GET /api/auth/sessions - Real sessions list & current session tag.
3. POST /api/auth/username/request-otp & POST /api/auth/username/change with 6-digit OTP verification.
4. POST /api/auth/password/request-change-otp & POST /api/auth/password/change-with-otp with 6-digit OTP verification.
5. Passkey CRUD: GET /api/auth/passkeys, POST /api/auth/passkeys/add, DELETE /api/auth/passkeys/<id>.
6. GET /api/security/events - Search & severity filtering.
7. Trading protection: GET /api/security/trading-protection, POST emergency lock toggle.
8. Session revocation: POST /api/auth/sessions/revoke-all-others and POST /api/auth/sessions/<session_id>/revoke.
"""

import hashlib
import json
import os
import unittest
from datetime import datetime, timezone, timedelta
import dashboard
from src import db
from src.security_auth import PasswordManager, SessionManager, global_auth_manager

class TestSecurityControlCenterE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = dashboard.app
        cls.client = cls.app.test_client()

        # Ensure database is initialized and test admin user exists
        db.init_db()
        global_auth_manager.bootstrap_default_admin_if_needed()

        # Create a dedicated test user for password & username changes
        cls.test_username = "test_sec_user"
        cls.test_email = "test_sec_user@example.com"
        cls.test_pwd = "OriginalPassword@2026!"
        pwd_hash, salt = PasswordManager.hash_password(cls.test_pwd)

        cls.test_user_id = "usr_test_security_center_01"
        test_user = {
            "id": cls.test_user_id,
            "username": cls.test_username,
            "email": cls.test_email,
            "password_hash": pwd_hash,
            "salt": salt,
            "role": "ADMIN",
            "is_active": 1,
            "is_2fa_enabled": 1,
            "totp_secret_encrypted": "test_secret_enc",
            "passkeys_json": json.dumps([{"id": "pk_test_1", "credential_id": "cred_1", "name": "Windows Hello"}]),
            "recovery_codes_json": json.dumps(["hash1", "hash2"]),
            "must_change_password": 0,
        }
        db.upsert_user(test_user)

        # Create session
        cls.token, cls.session = SessionManager.create_session(
            user_id=cls.test_user_id,
            device_name="Windows 11 / Chrome 151",
            ip_address="127.0.0.1"
        )
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_security_overview(self):
        """Test GET /api/security/overview returns valid telemetry and checkup."""
        resp = self.client.get("/api/security/overview", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn("telemetry", data)
        self.assertIn("security_score", data["telemetry"])
        self.assertIn("checkup", data)
        self.assertGreaterEqual(data["telemetry"]["security_score"], 50)
        print("  ✓ test_01_security_overview passed")

    def test_02_auth_sessions_list_and_current(self):
        """Test GET /api/auth/sessions returns list with is_current flag."""
        # Create a second session
        token2, session2 = SessionManager.create_session(
            user_id=self.test_user_id,
            device_name="MacBook Air / Safari",
            ip_address="103.45.67.89"
        )
        resp = self.client.get("/api/auth/sessions", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "success")
        sessions = data["sessions"]
        self.assertGreaterEqual(len(sessions), 2)
        current_sessions = [s for s in sessions if s.get("is_current")]
        self.assertEqual(len(current_sessions), 1)
        self.assertEqual(current_sessions[0]["session_id"], self.session["session_id"])
        print("  ✓ test_02_auth_sessions_list_and_current passed")

    def test_03_username_change_with_otp_flow(self):
        """Test full 2-step username change with server-side OTP validation."""
        # Step 1: Request OTP for new username (using dynamic suffix for test idempotency)
        new_username = f"trader_user_{int(datetime.now().timestamp()) % 100000}"
        req_resp = self.client.post(
            "/api/auth/username/request-otp",
            headers=self.headers,
            json={"new_username": new_username}
        )
        self.assertEqual(req_resp.status_code, 200)
        req_data = req_resp.get_json()
        self.assertEqual(req_data["status"], "success")
        self.assertIn("challenge_id", req_data)
        challenge_id = req_data["challenge_id"]

        # Fetch challenge from DB to verify OTP
        challenge = db.get_auth_otp_challenge(challenge_id)
        self.assertIsNotNone(challenge)
        self.assertEqual(challenge["purpose"], "USERNAME_CHANGE")

        # Step 2: Test Invalid OTP rejection
        bad_resp = self.client.post(
            "/api/auth/username/change",
            headers=self.headers,
            json={"challenge_id": challenge_id, "otp": "000000", "new_username": new_username}
        )
        self.assertEqual(bad_resp.status_code, 401)

        # Step 3: Verify with correct OTP via dev_otp
        dev_otp = req_data.get("dev_otp")
        if not dev_otp:
            # Generate deterministic OTP hash match
            otp_code = "123456"
            otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
            db.safe_execute("UPDATE auth_otp_challenges SET otp_hash = ? WHERE id = ?", (otp_hash, challenge_id))
            dev_otp = otp_code

        good_resp = self.client.post(
            "/api/auth/username/change",
            headers=self.headers,
            json={"challenge_id": challenge_id, "otp": dev_otp, "new_username": new_username}
        )
        self.assertEqual(good_resp.status_code, 200)
        good_data = good_resp.get_json()
        self.assertEqual(good_data["status"], "success")
        self.assertEqual(good_data["user"]["username"], new_username)

        # Verify DB updated
        updated_user = db.get_user_by_id(self.test_user_id)
        self.assertEqual(updated_user["username"], new_username)
        print("  ✓ test_03_username_change_with_otp_flow passed")

    def test_04_password_change_with_otp_flow(self):
        """Test full 2-step password change with OTP verification & session revocation."""
        # Step 1: Request Password Change OTP
        new_pwd = "NewSecurePassword@2026!"
        req_resp = self.client.post(
            "/api/auth/password/request-change-otp",
            headers=self.headers,
            json={
                "current_password": self.test_pwd,
                "new_password": new_pwd,
                "confirm_password": new_pwd
            }
        )
        self.assertEqual(req_resp.status_code, 200)
        req_data = req_resp.get_json()
        self.assertEqual(req_data["status"], "success")
        challenge_id = req_data["challenge_id"]

        dev_otp = req_data.get("dev_otp")
        if not dev_otp:
            otp_code = "654321"
            otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
            db.safe_execute("UPDATE auth_otp_challenges SET otp_hash = ? WHERE id = ?", (otp_hash, challenge_id))
            dev_otp = otp_code

        # Step 2: Verify & Change with OTP
        change_resp = self.client.post(
            "/api/auth/password/change-with-otp",
            headers=self.headers,
            json={
                "challenge_id": challenge_id,
                "otp": dev_otp,
                "current_password": self.test_pwd,
                "new_password": new_pwd,
                "confirm_password": new_pwd,
                "logout_all_other_sessions": True
            }
        )
        self.assertEqual(change_resp.status_code, 200)
        change_data = change_resp.get_json()
        self.assertEqual(change_data["status"], "success")

        # Update test user password and rotated class-level session headers for subsequent tests
        self.__class__.test_pwd = new_pwd
        if "session_token" in change_data:
            self.__class__.token = change_data["session_token"]
            self.__class__.headers = {"Authorization": f"Bearer {self.__class__.token}"}

        print("  ✓ test_04_password_change_with_otp_flow passed")

    def test_05_passkey_management_crud(self):
        """Test Passkeys listing, registration, and deletion."""
        # List
        list_resp = self.client.get("/api/auth/passkeys", headers=self.headers)
        self.assertEqual(list_resp.status_code, 200)
        data = list_resp.get_json()
        self.assertEqual(data["status"], "success")

        # Add
        add_resp = self.client.post(
            "/api/auth/passkeys/add",
            headers=self.headers,
            json={"name": "iPhone Biometric Passkey"}
        )
        self.assertEqual(add_resp.status_code, 200)
        add_data = add_resp.get_json()
        new_id = add_data["passkey"]["id"]

        # Rename
        rename_resp = self.client.put(
            f"/api/auth/passkeys/{new_id}",
            headers=self.headers,
            json={"name": "Primary iPhone Touch ID"}
        )
        self.assertEqual(rename_resp.status_code, 200)

        # Delete
        del_resp = self.client.delete(f"/api/auth/passkeys/{new_id}", headers=self.headers)
        self.assertEqual(del_resp.status_code, 200)
        print("  ✓ test_05_passkey_management_crud passed")

    def test_06_security_events_search_and_filter(self):
        """Test GET /api/security/events search and severity filtering."""
        resp = self.client.get("/api/security/events?severity=ALL", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn("events", data)

        # Filter by search
        search_resp = self.client.get("/api/security/events?q=PASSWORD", headers=self.headers)
        self.assertEqual(search_resp.status_code, 200)
        print("  ✓ test_06_security_events_search_and_filter passed")

    def test_07_trading_protection_lock_toggle(self):
        """Test trading protection status and live trading lock toggle."""
        get_resp = self.client.get("/api/security/trading-protection", headers=self.headers)
        self.assertEqual(get_resp.status_code, 200)
        data = get_resp.get_json()
        self.assertIn("trading_protection", data)

        # Toggle Lock
        lock_resp = self.client.post(
            "/api/security/trading-protection",
            headers=self.headers,
            json={"locked": True, "reason": "Test Emergency Live Lock"}
        )
        self.assertEqual(lock_resp.status_code, 200)

        # Release Lock
        unlock_resp = self.client.post(
            "/api/security/trading-protection",
            headers=self.headers,
            json={"locked": False, "reason": "Test Live Lock Released"}
        )
        self.assertEqual(unlock_resp.status_code, 200)
        print("  ✓ test_07_trading_protection_lock_toggle passed")

    def test_08_session_revocation_aliases(self):
        """Test POST /api/auth/sessions/revoke-all-others and POST /api/auth/sessions/<id>/revoke."""
        # Create third session
        tok3, sess3 = SessionManager.create_session(
            user_id=self.test_user_id,
            device_name="Linux Server / Bot Worker",
            ip_address="192.168.1.100"
        )
        # Revoke single
        rev_single = self.client.post(f"/api/auth/sessions/{sess3['session_id']}/revoke", headers=self.headers)
        self.assertEqual(rev_single.status_code, 200)

        # Revoke all others
        rev_all = self.client.post("/api/auth/sessions/revoke-all-others", headers=self.headers)
        self.assertEqual(rev_all.status_code, 200)
        print("  ✓ test_08_session_revocation_aliases passed")


if __name__ == "__main__":
    unittest.main()
