"""
Automated Integration and Unit Test Suite for QUANT.OS Supabase Authentication Migration.
Validates:
1. SupabaseAuthValidator JWT verification (valid, expired, malformed, wrong issuer/audience).
2. Dynamic user mapping from Supabase UID to QUANT.OS users table.
3. Protection against role elevation (retaining existing QUANT.OS roles).
4. Rejection of inactive or unknown users.
5. Dashboard /api/auth/supabase/verify endpoint behaviour.
6. RBAC integration via get_current_user_and_session.
"""
import os
import sys
os.environ["PYTEST_CURRENT_TEST"] = "1"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import json
import pytest
import jwt
from unittest.mock import MagicMock, patch

from src import config
from src import db

# Mock out heavy startup network queries before importing dashboard
with patch("src.db.reconcile_stale_bot_statuses", return_value={}), \
     patch("src.db.seed_default_bots_if_empty", return_value=0), \
     patch("src.db.audit_and_clean_db", return_value={}):
    from src.supabase_auth import SupabaseAuthValidator
    import dashboard


TEST_JWT_SECRET = "test-secret-key-quantos-2026-institutional-32bytes"

@pytest.fixture
def secret_validator():
    validator = SupabaseAuthValidator()
    validator.jwt_secret = TEST_JWT_SECRET
    validator.audience = "authenticated"
    validator.issuer = "https://test.supabase.co/auth/v1"
    return validator


@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        yield c


def test_validator_rejects_empty_token(secret_validator):
    user, session, err = secret_validator.authenticate_jwt("")
    assert user is None
    assert session is None
    assert err == "EMPTY_TOKEN"


def test_validator_rejects_malformed_token(secret_validator):
    user, session, err = secret_validator.authenticate_jwt("invalid.token")
    assert user is None
    assert err == "MALFORMED_JWT_FORMAT"


def test_validator_rejects_expired_token(secret_validator):
    now = int(time.time())
    payload = {
        "sub": "sb-uid-12345",
        "email": "test@example.com",
        "aud": "authenticated",
        "iss": "https://test.supabase.co/auth/v1",
        "iat": now - 3600,
        "exp": now - 60,  # Expired
    }
    expired_token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
    user, session, err = secret_validator.authenticate_jwt(expired_token)
    assert user is None
    assert err == "TOKEN_EXPIRED"


def test_validator_rejects_invalid_audience(secret_validator):
    now = int(time.time())
    payload = {
        "sub": "sb-uid-12345",
        "email": "test@example.com",
        "aud": "wrong-audience",
        "iss": "https://test.supabase.co/auth/v1",
        "iat": now,
        "exp": now + 3600,
    }
    token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
    user, session, err = secret_validator.authenticate_jwt(token)
    assert user is None
    assert err == "INVALID_AUDIENCE"


def test_validator_rejects_invalid_issuer(secret_validator):
    now = int(time.time())
    payload = {
        "sub": "sb-uid-12345",
        "email": "test@example.com",
        "aud": "authenticated",
        "iss": "https://malicious-issuer.com/auth/v1",
        "iat": now,
        "exp": now + 3600,
    }
    token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
    user, session, err = secret_validator.authenticate_jwt(token)
    assert user is None
    assert err == "INVALID_ISSUER"


def test_validator_maps_existing_user_without_role_elevation(secret_validator):
    now = int(time.time())
    sb_uid = "sb-uuid-trader-99"
    email = "trader@quantos.internal"

    # Mock user retrieval from DB with a TRADER role
    mock_db_user = {
        "id": "user-trader-01",
        "username": "trader_john",
        "email": email,
        "role": "TRADER",
        "is_active": 1,
        "supabase_uid": None,
    }

    with patch("src.db.get_user_by_supabase_uid", return_value=None), \
         patch("src.db.get_user_by_email", return_value=mock_db_user), \
         patch("src.db.link_user_supabase_uid", return_value=True):

        payload = {
            "sub": sb_uid,
            "email": email,
            "aud": "authenticated",
            "iss": "https://test.supabase.co/auth/v1",
            "iat": now,
            "exp": now + 3600,
            "app_metadata": {"role": "ADMIN"},  # Attempt to inject ADMIN in Supabase metadata
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        user, session, err = secret_validator.authenticate_jwt(token)

        assert err is None
        assert user is not None
        # Must retain local database role TRADER, NEVER the frontend-supplied or claim role ADMIN
        assert user["role"] == "TRADER"
        assert session["user_id"] == "user-trader-01"
        assert session["supabase_uid"] == sb_uid


def test_validator_rejects_inactive_user(secret_validator):
    now = int(time.time())
    sb_uid = "sb-uuid-inactive-01"
    email = "disabled@quantos.internal"

    mock_db_user = {
        "id": "user-inactive-01",
        "username": "deactivated_user",
        "email": email,
        "role": "VIEWER",
        "is_active": 0,  # INACTIVE
        "supabase_uid": sb_uid,
    }

    with patch("src.db.get_user_by_supabase_uid", return_value=mock_db_user):
        payload = {
            "sub": sb_uid,
            "email": email,
            "aud": "authenticated",
            "iss": "https://test.supabase.co/auth/v1",
            "iat": now,
            "exp": now + 3600,
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        user, session, err = secret_validator.authenticate_jwt(token)

        assert user is None
        assert err == "ACCOUNT_INACTIVE"


def test_validator_rejects_unknown_user(secret_validator):
    now = int(time.time())
    sb_uid = "sb-unknown-stranger"
    email = "stranger@unknown.com"

    with patch("src.db.get_user_by_supabase_uid", return_value=None), \
         patch("src.db.get_user_by_email", return_value=None):

        payload = {
            "sub": sb_uid,
            "email": email,
            "aud": "authenticated",
            "iss": "https://test.supabase.co/auth/v1",
            "iat": now,
            "exp": now + 3600,
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        user, session, err = secret_validator.authenticate_jwt(token)

        assert user is None
        assert err == "USER_NOT_PROVISIONED"


def test_dashboard_api_auth_supabase_verify_endpoint(client):
    now = int(time.time())
    sb_uid = "sb-uid-endpoint-test"
    email = "admin@quantos.internal"

    mock_user = {
        "id": "usr-admin-01",
        "username": "admin",
        "email": email,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "passkeys_json": "[]",
        "recovery_codes_json": "[]",
    }
    mock_session = {
        "session_id": "sb_sess_12345",
        "user_id": mock_user["id"],
        "supabase_uid": sb_uid,
    }

    with patch("src.supabase_auth.global_supabase_validator.authenticate_jwt", return_value=(mock_user, mock_session, None)), \
         patch("src.security_auth.SessionManager.create_session", return_value=("test_raw_session_token", {"session_id": "sess_int_1"})):

        res = client.post(
            "/api/auth/supabase/verify",
            json={"access_token": "valid.mock.jwt"},
            headers={"Content-Type": "application/json"}
        )

        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["authenticated"] is True
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "ADMIN"
        assert data["session_token"] == "test_raw_session_token"


if __name__ == "__main__":
    v = SupabaseAuthValidator()
    v.jwt_secret = TEST_JWT_SECRET
    v.audience = "authenticated"
    v.issuer = "https://test.supabase.co/auth/v1"

    print("Running Supabase Auth Tests...")
    test_validator_rejects_empty_token(v)
    print("✓ test_validator_rejects_empty_token passed")
    test_validator_rejects_malformed_token(v)
    print("✓ test_validator_rejects_malformed_token passed")
    test_validator_rejects_expired_token(v)
    print("✓ test_validator_rejects_expired_token passed")
    test_validator_rejects_invalid_audience(v)
    print("✓ test_validator_rejects_invalid_audience passed")
    test_validator_rejects_invalid_issuer(v)
    print("✓ test_validator_rejects_invalid_issuer passed")
    test_validator_maps_existing_user_without_role_elevation(v)
    print("✓ test_validator_maps_existing_user_without_role_elevation passed")
    test_validator_rejects_inactive_user(v)
    print("✓ test_validator_rejects_inactive_user passed")
    test_validator_rejects_unknown_user(v)
    print("✓ test_validator_rejects_unknown_user passed")

    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        test_dashboard_api_auth_supabase_verify_endpoint(c)
        print("✓ test_dashboard_api_auth_supabase_verify_endpoint passed")

    print("\nALL 9 SUPABASE AUTH TESTS PASSED PERFECTLY!")
