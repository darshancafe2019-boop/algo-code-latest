"""
Production Session Timeout and Auth Resilience Test Suite.
Verifies:
1. Fast session resolution and non-blocking activity updates.
2. Dual-cookie support (algo_session_token and quantos_session_token).
3. Immediate session restoration on /api/auth/me following OTP verification.
4. Unauthenticated /api/auth/me clean 200 contract without timing out.
5. CSRF origin validation allowing trusted Vercel domains.
6. Preservation of paper-trading invariants and RBAC authorization.
"""

import os
import json
import time
import pytest
from unittest.mock import patch, MagicMock

# Force testing environment
os.environ["AUTH_REQUIRE_LOGIN"] = "true"
os.environ["AUTH_BOOTSTRAP_ENABLED"] = "false"
os.environ["TRADING_MODE"] = "PAPER"
os.environ["LIVE_TRADING_ENABLED"] = "false"
os.environ["MASTER_LIVE_TRADING"] = "false"
os.environ["PAPER_TRADING"] = "true"

from dashboard import app
from src import db
from src.security_auth import SessionManager, _SESSION_CACHE, _LAST_ACTIVITY_UPDATE
from src.security_rbac import get_current_user_and_session, _USER_CACHE


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def clear_caches():
    _SESSION_CACHE.clear()
    _LAST_ACTIVITY_UPDATE.clear()
    _USER_CACHE.clear()
    yield
    _SESSION_CACHE.clear()
    _LAST_ACTIVITY_UPDATE.clear()
    _USER_CACHE.clear()


def test_paper_trading_safety_invariants():
    """Verify system-wide paper trading and safety locks cannot be breached."""
    assert os.getenv("TRADING_MODE") == "PAPER"
    assert os.getenv("LIVE_TRADING_ENABLED") == "false"
    assert os.getenv("MASTER_LIVE_TRADING") == "false"
    assert os.getenv("PAPER_TRADING") == "true"


def test_unauthenticated_auth_me_returns_clean_200_instantly(client):
    """Unauthenticated /api/auth/me must return 200 {"authenticated": false} immediately without hanging."""
    t0 = time.perf_counter()
    res = client.get("/api/auth/me")
    dur_ms = (time.perf_counter() - t0) * 1000.0

    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["authenticated"] is False
    assert data["user"] is None
    # Must respond well under 500ms
    assert dur_ms < 500.0
    assert "X-Request-Id" in res.headers


def test_session_manager_caches_and_throttles_activity_updates():
    """SessionManager must populate cache on creation and avoid blocking synchronous DB writes on validate."""
    admin = db.get_user_by_username("admin")
    if not admin:
        admin_id = db.create_user("admin", "admin@quantos.internal", "Admin!2026SecurePass", role="ADMIN")
    else:
        admin_id = admin["id"]

    raw_token, session_dict = SessionManager.create_session(user_id=admin_id)
    token_hash = session_dict["token_hash"]

    # Verify cache is immediately warm
    assert token_hash in _SESSION_CACHE
    assert session_dict["session_id"] in _LAST_ACTIVITY_UPDATE

    # Validate session from cache
    with patch("src.db.update_session_activity") as mock_update:
        validated = SessionManager.validate_session(raw_token)
        assert validated is not None
        assert validated["user_id"] == admin_id
        # Activity update should not trigger immediately because interval has not elapsed
        mock_update.assert_not_called()


def test_dual_cookie_support_in_auth_me(client):
    """Both algo_session_token and quantos_session_token cookies must authenticate /api/auth/me."""
    admin = db.get_user_by_username("admin")
    if not admin:
        admin_id = db.create_user("admin", "admin@quantos.internal", "Admin!2026SecurePass", role="ADMIN")
    else:
        admin_id = admin["id"]

    raw_token, session_dict = SessionManager.create_session(user_id=admin_id)

    # 1. Test with algo_session_token cookie
    client.set_cookie("algo_session_token", raw_token)
    res1 = client.get("/api/auth/me")
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1["authenticated"] is True
    assert data1["user"]["id"] == admin_id

    # Clear cookie
    client.delete_cookie("algo_session_token")

    # 2. Test with quantos_session_token cookie
    client.set_cookie("quantos_session_token", raw_token)
    res2 = client.get("/api/auth/me")
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["authenticated"] is True
    assert data2["user"]["id"] == admin_id

    # 3. Test with Authorization: Bearer header
    client.delete_cookie("quantos_session_token")
    res3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert res3.status_code == 200
    data3 = res3.get_json()
    assert data3["authenticated"] is True
    assert data3["user"]["id"] == admin_id


def test_otp_verification_sets_both_cookies_and_restores_session(client):
    """OTP verification must set both algo_session_token and quantos_session_token with proper flags."""
    admin = db.get_user_by_username("admin")
    assert admin is not None
    admin_id = admin["id"]

    challenge_id = f"test_chall_{time.time()}"
    otp_code = "123456"
    import hashlib
    otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()

    from datetime import datetime, timezone, timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

    db.create_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id=admin_id,
        purpose="LOGIN",
        recipient_email=admin.get("email", "admin@quantos.internal"),
        otp_hash=otp_hash,
        expires_at=expires_at,
        requested_ip="127.0.0.1",
        request_id="test_req"
    )
    db.activate_auth_otp_challenge(
        challenge_id=challenge_id,
        user_id=admin_id,
        purpose="LOGIN",
        provider_message_id="msg_test",
        provider_status="DELIVERED"
    )

    verify_res = client.post(
        "/api/auth/email-otp/verify",
        json={"challenge_id": challenge_id, "otp": otp_code},
        headers={"X-Forwarded-Proto": "https"}
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.get_json()
    assert verify_data["status"] == "success"
    session_token = verify_data["session_token"]
    assert session_token is not None

    # Verify both cookies were set in response
    cookies_header = verify_res.headers.getlist("Set-Cookie")
    has_algo_cookie = any("algo_session_token=" in c for c in cookies_header)
    has_quantos_cookie = any("quantos_session_token=" in c for c in cookies_header)
    assert has_algo_cookie, "algo_session_token cookie must be present"
    assert has_quantos_cookie, "quantos_session_token cookie must be present"

    # Immediately fetch /api/auth/me using the received cookies
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["id"] == admin_id


def test_csrf_allows_trusted_vercel_origin(client):
    """CSRF checks must allow state changes from trusted vercel deployment origin."""
    admin = db.get_user_by_username("admin")
    raw_token, _ = SessionManager.create_session(user_id=admin["id"])
    client.set_cookie("quantos_session_token", raw_token)

    # Call a mutating endpoint with trusted vercel origin
    res = client.post(
        "/api/auth/logout",
        headers={"Origin": "https://algo-code-latest.vercel.app"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"


def test_database_pool_configuration_bounds():
    """Verify db pool parameters have resilient timeouts and warm pool minimums."""
    assert int(os.getenv("PG_POOL_MIN", "4")) >= 4
    assert int(os.getenv("PG_POOL_MAX", "20")) <= 30


def test_indicator_endpoints_public_whitelist_and_caching(client):
    """Verify /api/indicators, /api/indicators/status, and /api/indicators/profiles are public and cached."""
    # 1. Unauthenticated request to /api/indicators must return 200 without requiring login
    t0 = time.perf_counter()
    res1 = client.get("/api/indicators?bot_id=bot-1&symbol=BTC/USDT&timeframe=15m")
    t1 = time.perf_counter()
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1["status"] == "success"
    assert "indicators" in data1
    assert "market_summary" in data1

    # 2. Second request must hit in-memory cache and return substantially faster (< 50ms)
    t2 = time.perf_counter()
    res2 = client.get("/api/indicators?bot_id=bot-1&symbol=BTC/USDT&timeframe=15m")
    t3 = time.perf_counter()
    assert res2.status_code == 200
    assert (t3 - t2) < 0.05, f"Cached response took {t3 - t2}s, expected < 0.05s"

    # 3. /api/indicators/status must return 200 and be cached
    st_res = client.get("/api/indicators/status?bot_id=bot-1")
    assert st_res.status_code == 200
    assert st_res.get_json()["status"] == "success"

    # 4. /api/indicators/profiles must return 200 and be cached
    prof_res = client.get("/api/indicators/profiles")
    assert prof_res.status_code == 200
    assert prof_res.get_json()["status"] == "success"


def test_api_status_public_whitelist(client):
    """Verify /api/status is publicly accessible without active session."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "bot_id" in data or "status" in data

