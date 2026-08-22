"""
Institutional Role-Based Access Control (RBAC) and Action Assurance Policy Engine.
Classifies operations into 5 Action Assurance Levels:
- LEVEL 0: READ ONLY (View dashboard, charts, journal, analytics)
- LEVEL 1: CONFIGURATION (Watchlists, UI preferences, drafts)
- LEVEL 2: TRADING CONTROL (Paper trading, start/stop paper bots, backtest)
- LEVEL 3: LIVE CAPITAL (Enable live trading, start live bot, submit manual live order, increase capital/risk)
- LEVEL 4: CRITICAL SECURITY (Manage API keys, disable 2FA, release kill switch, emergency lock)
"""

from functools import wraps
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
    "TRADER": {
        "VIEW_DASHBOARD", "VIEW_MARKET_DATA", "VIEW_JOURNAL", "VIEW_ANALYTICS", "VIEW_LOGS",
        "MANAGE_WATCHLISTS", "DRAFT_STRATEGY", "RUN_BACKTEST",
        "START_PAPER_BOT", "STOP_PAPER_BOT", "CREATE_PAPER_BOT", "SUBMIT_PAPER_ORDER"
    },
    "RISK_MANAGER": {
        "VIEW_DASHBOARD", "VIEW_MARKET_DATA", "VIEW_JOURNAL", "VIEW_ANALYTICS", "VIEW_LOGS",
        "MANAGE_WATCHLISTS", "DRAFT_STRATEGY", "RUN_BACKTEST",
        "START_PAPER_BOT", "STOP_PAPER_BOT", "CREATE_PAPER_BOT", "SUBMIT_PAPER_ORDER",
        "UPDATE_RISK_LIMITS", "ACTIVATE_KILL_SWITCH", "VIEW_SECURITY_AUDIT"
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


def get_current_user_and_session() -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
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

    if not token:
        # Default bootstrap user for local testing if no session presented
        admin = db.get_user_by_username("admin")
        if admin:
            return admin, {"session_id": "sess-local-dev", "device_name": "Localhost", "ip_address": "127.0.0.1"}
        return None, None

    session = SessionManager.validate_session(token)
    if not session:
        return None, None

    user = db.get_user_by_id(session["user_id"])
    return user, session


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
