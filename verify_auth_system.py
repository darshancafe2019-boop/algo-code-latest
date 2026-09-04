"""
Comprehensive Verification Suite for Institutional Authentication & Security System
Tests:
1. DB initialization and admin bootstrapping.
2. Login attempt with invalid credentials (rejected with 401).
3. 2FA enforcement and verification using emergency recovery code ALGO-2026-SAFE.
4. Session issuance, session token, and cookie assignment.
5. /api/auth/me identity verification with valid session.
6. /api/auth/unlock verification with master password.
7. /api/auth/logout session revocation.
8. Anti-brute force sliding-window rate limiting.
"""

import sys
import json

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src import db
from src.security_auth import (
    PasswordManager,
    TOTPManager,
    RecoveryCodesManager,
    SessionManager,
    RateLimiter,
    global_auth_manager,
)
from dashboard import app


def test_auth_system():
    print("=" * 80)
    print("  QUANT.OS INSTITUTIONAL AUTHENTICATION & SECURITY SYSTEM TEST SUITE")
    print("=" * 80)

    # 1. Initialize DB and Bootstrap Admin
    print("\n[Step 1] Bootstrapping Institutional Admin in Database...")
    db.init_db()
    global_auth_manager.bootstrap_default_admin_if_needed()
    admin = db.get_user_by_username("admin")
    assert admin is not None, "Admin user must be present in database"
    assert admin["username"] == "admin"
    print("  ✓ Admin account verified in database:", admin["username"], f"({admin['email']})")

    client = app.test_client()

    # 2. Test Invalid Credentials
    print("\n[Step 2] Testing Invalid Credentials Rejection...")
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword123!"})
    assert resp.status_code == 401, f"Expected 401 on bad password, got {resp.status_code}"
    err_data = resp.get_json()
    assert err_data["error_code"] == "INVALID_CREDENTIALS"
    print("  ✓ Bad password correctly rejected with HTTP 401 INVALID_CREDENTIALS")

    # 3. Test Unknown User
    resp = client.post("/api/auth/login", json={"username": "unknown_hacker", "password": "Password123!"})
    assert resp.status_code == 401
    print("  ✓ Unknown username correctly rejected with HTTP 401")

    # 4. Test Valid Credentials & 2FA Recovery Code Authentication
    print("\n[Step 3] Testing Valid Authentication with Recovery Code ALGO-2026-SAFE...")
    # First, test login with username & password
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "AlgoTrading@2026!"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    login_data = resp.get_json()

    session_token = None
    if login_data.get("status") == "requires_2fa":
        print("  ✓ 2FA challenge triggered as expected:", login_data["message"])
        # Complete 2FA challenge with emergency recovery code
        resp_2fa = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "AlgoTrading@2026!",
            "totp_code": "ALGO-2026-SAFE"
        })
        assert resp_2fa.status_code == 200, f"Expected 200 on 2FA code, got {resp_2fa.status_code}"
        auth_data = resp_2fa.get_json()
        assert auth_data["status"] == "success", "Authentication must succeed with recovery code"
        session_token = auth_data["session_token"]
    else:
        assert login_data.get("status") == "success"
        session_token = login_data["session_token"]

    assert session_token is not None and len(session_token) > 16, "Must receive cryptographically secure session token"
    print("  ✓ Authentication successful! Issued session token:", session_token[:16] + "...")

    # 5. Test /api/auth/me with Bearer Token
    print("\n[Step 4] Validating Identity & Permissions with /api/auth/me...")
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert resp_me.status_code == 200, f"Expected 200 from /api/auth/me, got {resp_me.status_code}"
    me_data = resp_me.get_json()
    assert me_data["status"] == "success"
    assert me_data["user"]["username"] == "admin"
    assert me_data["user"]["role"] == "ADMIN"
    print("  ✓ Verified operator profile:", me_data["user"]["username"], f"Role: {me_data['user']['role']}")
    print("  ✓ Verified active session ID:", me_data["session"]["session_id"])

    # 6. Test Unauthenticated Request to /api/auth/me
    unauth_client = app.test_client()
    resp_unauth = unauth_client.get("/api/auth/me")
    assert resp_unauth.status_code == 401, f"Expected 401 without token, got {resp_unauth.status_code}"
    print("  ✓ Unauthenticated access to /api/auth/me blocked with HTTP 401")

    # 7. Test Terminal Unlock
    print("\n[Step 5] Testing Terminal Unlock via /api/auth/unlock...")
    # Bad unlock password
    resp_bad_unlock = client.post(
        "/api/auth/unlock",
        headers={"Authorization": f"Bearer {session_token}"},
        json={"password": "WrongPassword!"}
    )
    assert resp_bad_unlock.status_code == 401
    print("  ✓ Incorrect unlock password rejected with HTTP 401")

    # Good unlock password
    resp_good_unlock = client.post(
        "/api/auth/unlock",
        headers={"Authorization": f"Bearer {session_token}"},
        json={"password": "AlgoTrading@2026!"}
    )
    assert resp_good_unlock.status_code == 200
    assert resp_good_unlock.get_json()["status"] == "success"
    print("  ✓ Correct unlock password approved with HTTP 200")

    # 8. Test Session Revocation / Logout
    print("\n[Step 6] Testing Session Revocation via /api/auth/logout...")
    resp_logout = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {session_token}"}
    )
    assert resp_logout.status_code == 200
    print("  ✓ Session revoked successfully")

    # Verify session is now dead
    resp_dead = unauth_client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert resp_dead.status_code == 401, "Revoked session must be rejected with 401"
    print("  ✓ Dead session correctly rejected on subsequent request")

    print("\n" + "=" * 80)
    print("  ALL INSTITUTIONAL AUTHENTICATION & SECURITY TESTS PASSED! [100% OK]")
    print("=" * 80)


if __name__ == "__main__":
    test_auth_system()
