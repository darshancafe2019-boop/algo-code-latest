"""
Pytest configuration for algo-code-main test suite.
Provides authenticated test client sessions for functional trading tests,
while preserving clean unauthenticated state for security and auth tests.
"""

import inspect
import hashlib
from datetime import datetime, timezone, timedelta
import pytest
from flask.testing import FlaskClient

from src import db
from src.security_auth import PasswordManager
from dashboard import app

TEST_ADMIN_TOKEN = "test_pytest_admin_session_token_12345678"
TEST_ADMIN_TOKEN_HASH = hashlib.sha256(TEST_ADMIN_TOKEN.encode("utf-8")).hexdigest()
TEST_ADMIN_ID = "usr_test_admin_pytest"


@pytest.fixture(scope="session", autouse=True)
def setup_pytest_environment():
    """Ensure database and authenticated test operator session exist."""
    db.init_db()
    pwd_hash, salt = PasswordManager.hash_password("AlgoTrading@2026!")
    db.upsert_user({
        "id": TEST_ADMIN_ID,
        "username": "pytest_admin",
        "email": "pytest_admin@algotrading.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })

    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.safe_execute(
        """
        INSERT OR REPLACE INTO user_sessions (
            session_id, user_id, token_hash, device_name, ip_address,
            user_agent, approximate_location, last_active_at, expires_at,
            is_revoked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            "sess-pytest-admin",
            TEST_ADMIN_ID,
            TEST_ADMIN_TOKEN_HASH,
            "Pytest Runner",
            "127.0.0.1",
            "Pytest",
            "Localhost",
            now_iso,
            expires_iso,
            now_iso,
        )
    )


class AuthenticatedPytestClient(FlaskClient):
    """
    Test client subclass that provides authenticated session cookies to functional trading tests,
    while leaving security penetration and auth tests unauthenticated.
    """

    def open(self, *args, **kwargs):
        headers = kwargs.get("headers")
        if headers is None:
            headers = {}
            kwargs["headers"] = headers

        # 1. Check for explicit unauthenticated header
        if isinstance(headers, dict) and headers.get("X-Unauthenticated") == "true":
            return super().open(*args, **kwargs)

        # 2. Check if caller is specifically testing security authentication / penetration
        stack = inspect.stack()
        is_security_test = any(
            "test_institutional_security_system" in getattr(frame, "filename", "")
            or "verify_production_security_hardening" in getattr(frame, "filename", "")
            or "verify_auth_gate_penetration" in getattr(frame, "filename", "")
            or "test_auth_totp_and_recovery" in getattr(frame, "filename", "")
            or "test_email_otp_and_auth_flow" in getattr(frame, "filename", "")
            for frame in stack
        )

        if not is_security_test:
            # Seed session cookie or Bearer header if not already provided
            if isinstance(headers, dict) and "Authorization" not in headers:
                try:
                    cookie = self.get_cookie("algo_session_token")
                    if not cookie:
                        self.set_cookie("algo_session_token", TEST_ADMIN_TOKEN, domain="localhost", path="/")
                except Exception:
                    headers["Authorization"] = f"Bearer {TEST_ADMIN_TOKEN}"

        return super().open(*args, **kwargs)


# Register test client class with Flask app for pytest execution
app.test_client_class = AuthenticatedPytestClient
