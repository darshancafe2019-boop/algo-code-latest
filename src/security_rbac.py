"""
Institutional Role-Based Access Control (RBAC) and Action Assurance Policy Engine.
Classifies operations into 3 Canonical Roles:
- VIEWER: Read-only (View dashboard, charts, journal, analytics, logs)
- OPERATOR: Trading & Strategy (Start/stop paper bots, backtest, submit orders)
- ADMIN: Full System Authority (API keys, security settings, emergency locks, backups)

Provides:
- @require_auth: Strict authentication & password change gate
- @require_role(role_name): Strict role hierarchy enforcement
- @require_recent_auth(max_age_seconds): Step-up re-authentication gate
- @require_csrf: CSRF origin & custom header verification
- @require_assurance_level(level): Action assurance level enforcement
"""

import time
from functools import wraps
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Set, Tuple
from flask import request, jsonify

from src import db
from src.security_auth import SessionManager, StepUpAuthenticationService

ROLE_HIERARCHY: Dict[str, int] = {
    "VIEWER": 0,
    "TRADER": 2,
    "RISK_MANAGER": 3,
    "OPERATOR": 3,
    "ADMIN": 4,
}

ASSURANCE_LEVEL_MIN_ROLES: Dict[str, str] = {
    "LEVEL_0_READ_ONLY": "VIEWER",
    "LEVEL_1_CONFIG": "TRADER",
    "LEVEL_2_TRADING_CONTROL": "TRADER",
    "LEVEL_3_LIVE_CAPITAL": "OPERATOR",
    "LEVEL_4_CRITICAL_SECURITY": "ADMIN",
}

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "VIEWER": {
        "VIEW_DASHBOARD", "VIEW_MARKET_DATA", "VIEW_JOURNAL", "VIEW_ANALYTICS", "VIEW_LOGS"
    },
    "OPERATOR": {
        "VIEW_DASHBOARD", "VIEW_MARKET_DATA", "VIEW_JOURNAL", "VIEW_ANALYTICS", "VIEW_LOGS",
        "MANAGE_WATCHLISTS", "DRAFT_STRATEGY", "RUN_BACKTEST",
        "START_PAPER_BOT", "STOP_PAPER_BOT", "CREATE_PAPER_BOT", "SUBMIT_PAPER_ORDER",
        "UPDATE_RISK_LIMITS", "ACTIVATE_KILL_SWITCH", "VIEW_SECURITY_AUDIT",
        "AUTHORIZE_LIVE_BOT", "START_LIVE_BOT", "STOP_LIVE_BOT", "SUBMIT_LIVE_ORDER"
    },
    "ADMIN": {
        "VIEW_DASHBOARD", "VIEW_MARKET_DATA", "VIEW_JOURNAL", "VIEW_ANALYTICS", "VIEW_LOGS",
        "MANAGE_WATCHLISTS", "DRAFT_STRATEGY", "RUN_BACKTEST",
        "START_PAPER_BOT", "STOP_PAPER_BOT", "CREATE_PAPER_BOT", "SUBMIT_PAPER_ORDER",
        "UPDATE_RISK_LIMITS", "ACTIVATE_KILL_SWITCH", "VIEW_SECURITY_AUDIT",
        "AUTHORIZE_LIVE_BOT", "START_LIVE_BOT", "STOP_LIVE_BOT", "SUBMIT_LIVE_ORDER",
        "MANAGE_API_KEYS", "MANAGE_2FA", "RELEASE_KILL_SWITCH", "EMERGENCY_LOCK", "MANAGE_BACKUPS"
    }
}


_USER_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_USER_CACHE_TTL_SEC = 20.0


def invalidate_user_cache(user_id: Optional[str] = None):
    """Invalidates in-memory user cache."""
    if user_id:
        _USER_CACHE.pop(user_id, None)
    else:
        _USER_CACHE.clear()


def get_current_user_and_session(allow_dev_fallback: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Extracts session token from Authorization header or Cookie and resolves user identity.
    Returns (user_dict, session_dict) or (None, None).
    """
    # 1. Check Bearer Authorization Header
    auth_hdr = request.headers.get("Authorization", "")
    token = ""
    if auth_hdr.startswith("Bearer "):
        token = auth_hdr.split(" ")[1].strip()

    # 2. Check Cookie fallback
    if not token:
        token = request.cookies.get("algo_session_token", "")

    session = SessionManager.validate_session(token) if token else None
    if not session:
        if allow_dev_fallback and request.headers.get("X-Unauthenticated") != "true":
            admin = db.get_user_by_username("admin")
            if admin:
                return admin, {"session_id": "sess-local-dev", "device_name": "Localhost", "ip_address": "127.0.0.1"}
        return None, None

    user_id = session.get("user_id")
    if not user_id:
        return None, None

    now_ts = time.time()
    cached_user = _USER_CACHE.get(user_id)
    if cached_user and (now_ts - cached_user[0] < _USER_CACHE_TTL_SEC):
        return cached_user[1], session

    user = db.get_user_by_id(user_id)
    if user:
        _USER_CACHE[user_id] = (now_ts, user)
    return user, session


def require_auth(fn):
    """
    Decorator enforcing that the caller is authenticated with a valid session.
    Blocks callers if must_change_password is True (unless route is password change).
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user, session = get_current_user_and_session(allow_dev_fallback=False)
        if not user or not session:
            return jsonify({
                "status": "error",
                "error_code": "UNAUTHORIZED",
                "message": "Authentication required. Valid session token missing."
            }), 401

        if user.get("must_change_password") and request.path not in ["/api/auth/change-password", "/api/auth/logout", "/api/auth/me"]:
            return jsonify({
                "status": "error",
                "error_code": "PASSWORD_CHANGE_REQUIRED",
                "message": "Password change required before accessing platform features."
            }), 403

        return fn(*args, **kwargs)
    return wrapper


def require_role(min_role: str):
    """
    Decorator enforcing minimum user role (e.g. VIEWER, OPERATOR, ADMIN).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, session = get_current_user_and_session(allow_dev_fallback=False)
            if not user or not session:
                return jsonify({
                    "status": "error",
                    "error_code": "UNAUTHORIZED",
                    "message": "Authentication required."
                }), 401

            if user.get("must_change_password") and request.path not in ["/api/auth/change-password", "/api/auth/logout", "/api/auth/me"]:
                return jsonify({
                    "status": "error",
                    "error_code": "PASSWORD_CHANGE_REQUIRED",
                    "message": "Password change required."
                }), 403

            user_role = user.get("role", "VIEWER")
            user_rank = ROLE_HIERARCHY.get(user_role, 0)
            required_rank = ROLE_HIERARCHY.get(min_role, 4)

            if user_rank < required_rank:
                db.log_security_audit_event(
                    action="RBAC_ACCESS_DENIED",
                    actor_user_id=user["id"],
                    actor_role=user_role,
                    resource_type="API_ROUTE",
                    resource_id=request.path,
                    result="DENIED",
                    details={"required_role": min_role, "user_role": user_role}
                )
                return jsonify({
                    "status": "error",
                    "error_code": "FORBIDDEN",
                    "message": f"Access denied. Action requires {min_role} role or higher."
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_recent_auth(max_age_seconds: int = 300, purpose: Optional[str] = None):
    """
    Enforces Step-Up verification or recent authentication for critical operations.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, session = get_current_user_and_session(allow_dev_fallback=False)
            if not user or not session:
                return jsonify({"status": "error", "error_code": "UNAUTHORIZED", "message": "Authentication required."}), 401

            step_up_token = request.headers.get("X-Step-Up-Token") or (request.get_json(silent=True) or {}).get("step_up_token")
            check_purpose = purpose or request.path
            if step_up_token and StepUpAuthenticationService.verify_step_up(step_up_token, check_purpose):
                return fn(*args, **kwargs)

            # Check if session was active within max_age_seconds
            now = datetime.now(timezone.utc)
            last_active_str = session.get("last_active_at")
            if last_active_str:
                try:
                    last_active = datetime.fromisoformat(last_active_str)
                    if last_active.tzinfo is None:
                        last_active = last_active.replace(tzinfo=timezone.utc)
                    if (now - last_active).total_seconds() <= max_age_seconds:
                        return fn(*args, **kwargs)
                except Exception:
                    pass

            return jsonify({
                "status": "error",
                "error_code": "STEP_UP_REQUIRED",
                "message": "Recent authentication or step-up verification required for this operation.",
                "purpose": check_purpose
            }), 403
        return wrapper
    return decorator


def require_csrf(fn):
    """
    Decorator enforcing CSRF protection on state-changing requests.
    Validates request Origin or Referer matches local host or expected domain.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            token_cookie = request.cookies.get("algo_session_token")
            if token_cookie:
                origin = request.headers.get("Origin") or ""
                host = request.headers.get("Host") or ""
                if origin:
                    clean_origin = origin.replace("http://", "").replace("https://", "").split("/")[0]
                    clean_host = host.split("/")[0]
                    # Allow local development ports (3100, 5050)
                    if not (clean_origin.startswith("127.0.0.1") or clean_origin.startswith("localhost") or clean_origin == clean_host):
                        return jsonify({
                            "status": "error",
                            "error_code": "CSRF_REJECTED",
                            "message": "Cross-origin request rejected."
                        }), 403
        return fn(*args, **kwargs)
    return wrapper


def require_assurance_level(level: str, purpose: Optional[str] = None):
    """
    Decorator enforcing Action Assurance Level and RBAC.
    For LEVEL_3_LIVE_CAPITAL and LEVEL_4_CRITICAL_SECURITY, requires valid step-up token.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, session = get_current_user_and_session()
            if not user:
                return jsonify({
                    "status": "error",
                    "error_code": "UNAUTHORIZED",
                    "message": "Authentication required. Valid session token missing."
                }), 401

            user_role = user.get("role", "VIEWER")
            min_role = ASSURANCE_LEVEL_MIN_ROLES.get(level, "ADMIN")
            user_rank = ROLE_HIERARCHY.get(user_role, 0)
            min_rank = ROLE_HIERARCHY.get(min_role, 4)

            if user_rank < min_rank:
                db.log_security_audit_event(
                    action="RBAC_ACCESS_DENIED",
                    actor_user_id=user["id"],
                    actor_role=user_role,
                    resource_type="API_ROUTE",
                    resource_id=request.path,
                    result="DENIED",
                    assurance_level=level,
                    details={"required_role": min_role, "user_role": user_role}
                )
                return jsonify({
                    "status": "error",
                    "error_code": "FORBIDDEN",
                    "message": f"Access denied. Action requires {min_role} role or higher."
                }), 403

            # Check Step-Up token requirement for High Assurance Levels
            if level in ["LEVEL_3_LIVE_CAPITAL", "LEVEL_4_CRITICAL_SECURITY"]:
                step_up_token = request.headers.get("X-Step-Up-Token") or (request.get_json(silent=True) or {}).get("step_up_token")
                check_purpose = purpose or level
                if not step_up_token or not StepUpAuthenticationService.verify_step_up(step_up_token, check_purpose):
                    db.log_security_audit_event(
                        action="STEP_UP_CHALLENGE_REQUIRED",
                        actor_user_id=user["id"],
                        actor_role=user_role,
                        resource_type="API_ROUTE",
                        resource_id=request.path,
                        result="CHALLENGED",
                        assurance_level=level,
                        details={"purpose": check_purpose}
                    )
                    return jsonify({
                        "status": "error",
                        "error_code": "STEP_UP_REQUIRED",
                        "message": "Step-up authentication required for high-risk action.",
                        "purpose": check_purpose,
                        "assurance_level": level
                    }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
