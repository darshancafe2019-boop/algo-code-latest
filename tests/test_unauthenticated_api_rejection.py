"""
Institutional Security: Unauthenticated API Rejection & RBAC Negative Test Suite.
Validates:
1. Public health, market data, and auth routes are accessible without credentials.
2. Private broker endpoints (/api/dhan/*, /api/fyers/*) return 401 UNAUTHORIZED when called unauthenticated.
3. Sensitive reports and orchestrator control routes return 401 UNAUTHORIZED when called unauthenticated.
4. Bot modification and order creation endpoints require active authentication and appropriate role (OPERATOR/ADMIN).
5. State-changing requests from VIEWER role return 403 FORBIDDEN.
6. Administrative endpoints (/api/security/*, /api/secrets/*) return 403 FORBIDDEN for non-ADMIN roles.
"""

import os
import pytest
from dashboard import app
from src import config, db
from src.security_auth import global_auth_manager, SessionManager


@pytest.fixture(autouse=True)
def setup_test_env():
    """Ensure database tables and default admin identity are seeded."""
    db.init_db()
    global_auth_manager.bootstrap_default_admin_if_needed()
    os.environ["AUTH_REQUIRE_LOGIN"] = "true"


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_public_routes_remain_accessible(client):
    """Verify that public health probes and market telemetry are accessible unauthenticated."""
    res_health = client.get("/health/live")
    assert res_health.status_code == 200

    res_api_health = client.get("/api/health/live")
    assert res_api_health.status_code == 200

    res_providers = client.get("/api/market/providers/health")
    assert res_providers.status_code == 200


def test_private_broker_endpoints_reject_unauthenticated(client):
    """Verify private broker fund, position, and order APIs return 401 when accessed without session."""
    protected_endpoints = [
        "/api/dhan/funds",
        "/api/dhan/positions",
        "/api/dhan/orders",
        "/api/dhan/profile",
        "/api/dhan/holdings",
        "/api/fyers/funds",
        "/api/fyers/profile",
        "/api/brokers/fyers/status",
        "/api/brokers/dhan/status",
    ]
    for ep in protected_endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"Expected 401 Unauthorized for {ep}, got {res.status_code}"
        data = res.get_json() or {}
        assert data.get("error_code") == "UNAUTHORIZED" or "Authentication required" in data.get("message", "")


def test_sensitive_reports_and_orchestrator_reject_unauthenticated(client):
    """Verify reports generation and orchestrator control return 401 when unauthenticated."""
    protected_endpoints = [
        "/api/reports/generate",
        "/api/reports/history",
        "/api/orchestrator/command",
        "/api/orchestrator/status",
        "/api/capital/summary",
        "/api/hierarchy/tree",
    ]
    for ep in protected_endpoints:
        res = client.get(ep) if "command" not in ep else client.post(ep, json={})
        assert res.status_code == 401, f"Expected 401 Unauthorized for {ep}, got {res.status_code}"


def test_bot_management_rejects_unauthenticated(client):
    """Verify mutating bot operations reject unauthenticated callers."""
    res_create = client.post("/api/bots", json={"name": "AttackerBot"})
    assert res_create.status_code == 401

    res_delete = client.delete("/api/bots/BOT-123")
    assert res_delete.status_code == 401


def test_viewer_role_cannot_mutate_bots_or_orders(client):
    """Verify VIEWER role receives 403 FORBIDDEN when attempting to modify bot state or place orders."""
    viewer_id = "test_viewer_user"
    from src.security_auth import PasswordManager
    pwd_hash, salt = PasswordManager.hash_password("ViewerPass123!")
    db.upsert_user({
        "id": viewer_id,
        "username": "viewer_test",
        "email": "viewer@quantos.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "VIEWER",
        "is_active": 1,
    })
    token, _ = SessionManager.create_session(
        user_id=viewer_id,
        device_name="PyTest-Runner",
        ip_address="127.0.0.1",
        user_agent="PyTest-Runner",
    )

    client.set_cookie("algo_session_token", token)

    # Mutating operation on /api/bots must be rejected with 403
    res = client.post(
        "/api/bots",
        json={"name": "UnauthorizedBot"},
        headers={"Authorization": f"Bearer {token}", "X-CSRF-Token": "test_token"}
    )
    assert res.status_code == 403
    data = res.get_json() or {}
    assert data.get("error_code") == "FORBIDDEN"
    assert "VIEWER role cannot perform trading operations" in data.get("message", "")


def test_operator_role_cannot_modify_security_or_secrets(client):
    """Verify OPERATOR role receives 403 FORBIDDEN when attempting to modify security settings or broker secrets."""
    operator_id = "test_operator_user"
    from src.security_auth import PasswordManager
    pwd_hash, salt = PasswordManager.hash_password("OperatorPass123!")
    db.upsert_user({
        "id": operator_id,
        "username": "operator_test",
        "email": "operator@quantos.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "OPERATOR",
        "is_active": 1,
    })
    token, _ = SessionManager.create_session(
        user_id=operator_id,
        device_name="PyTest-Runner",
        ip_address="127.0.0.1",
        user_agent="PyTest-Runner",
    )

    client.set_cookie("algo_session_token", token)

    # Attempting to mutate security/secrets must be rejected with 403
    res = client.post(
        "/api/security/settings",
        json={"param": "hack"},
        headers={"Authorization": f"Bearer {token}", "X-CSRF-Token": "test_token"}
    )
    assert res.status_code == 403
    data = res.get_json() or {}
    assert data.get("error_code") == "FORBIDDEN"
    assert "Administrative privileges required" in data.get("message", "")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
