"""
Authoritative Server-Side Live Deployment Authorization Manager.
Implements:
- Scoped server-side deployment authorization records (bot_id, account_id, capital limit, risk limit, strategy version, expiry).
- Runner validation gate: Live bot workers verify active authorization on every execution loop.
- Automatic expiration enforcement (24h default) & revocation.
- Emergency account/trading lock (revokes all live authorizations immediately).
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple

from src import db


class LiveAuthorizationManager:
    """Manages authoritative server-side live trading authorizations."""

    DEFAULT_DURATION_HOURS = 24

    @staticmethod
    def authorize_live_bot(
        user_id: str,
        bot_id: str,
        account_id: str = "BINANCE-LIVE-01",
        strategy_version: str = "v1.0.0",
        max_capital: float = 5000.0,
        max_risk_pct: float = 0.5,
        daily_loss_limit: float = 2.0,
        duration_hours: int = DEFAULT_DURATION_HOURS,
        auth_strength: str = "PASSKEY"
    ) -> Dict[str, Any]:
        """
        Issues an authoritative server-side live deployment authorization.
        """
        auth_id = f"live-auth-{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(hours=duration_hours)).isoformat()

        auth_payload = {
            "authorization_id": auth_id,
            "user_id": user_id,
            "bot_id": bot_id,
            "account_id": account_id,
            "strategy_version": strategy_version,
            "max_capital": max_capital,
            "max_risk_pct": max_risk_pct,
            "daily_loss_limit": daily_loss_limit,
            "auth_strength": auth_strength,
            "issued_at": now.isoformat(),
            "expires_at": expires_at,
            "status": "ACTIVE"
        }

        db.create_live_deployment_authorization(auth_payload)
        db.log_security_audit_event(
            action="LIVE_TRADING_AUTHORIZED",
            actor_user_id=user_id,
            resource_type="BOT",
            resource_id=bot_id,
            result="SUCCESS",
            assurance_level="LEVEL_3_LIVE_CAPITAL",
            details={
                "authorization_id": auth_id,
                "account_id": account_id,
                "max_capital": max_capital,
                "max_risk_pct": max_risk_pct,
                "expires_at": expires_at
            }
        )

        return auth_payload

    @staticmethod
    def validate_bot_live_authorization(bot_id: str, execution_mode: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if bot is authorized to execute live trades.
        For PAPER mode, returns True immediately.
        For LIVE mode, verifies server-side authorization record.
        """
        if (execution_mode or "").upper() == "PAPER":
            return True, None

        auth = db.get_active_live_authorization(bot_id)
        if not auth:
            return False, f"Live execution blocked: Bot '{bot_id}' does not have an active server-side live authorization."

        now_iso = datetime.now(timezone.utc).isoformat()
        if auth["expires_at"] <= now_iso:
            return False, f"Live execution blocked: Authorization '{auth['authorization_id']}' expired at {auth['expires_at']}."

        return True, None

    @staticmethod
    def revoke_authorization(bot_id: str, actor_user_id: str = "usr_admin") -> bool:
        """Revokes live authorization for a specific bot."""
        ok = db.revoke_live_authorizations_for_bot(bot_id)
        if ok:
            db.log_security_audit_event(
                action="LIVE_AUTHORIZATION_REVOKED",
                actor_user_id=actor_user_id,
                resource_type="BOT",
                resource_id=bot_id,
                result="SUCCESS",
                assurance_level="LEVEL_3_LIVE_CAPITAL"
            )
        return ok

    @staticmethod
    def emergency_lock_all_trading(actor_user_id: str = "usr_admin") -> bool:
        """Emergency lock: revokes all active live trading authorizations."""
        ok = db.revoke_all_live_authorizations()
        db.create_security_alert(
            severity="CRITICAL",
            category="EMERGENCY_LOCK",
            title="Emergency Trading Access Lock Engaged",
            description=f"All active live trading authorizations have been revoked by {actor_user_id}."
        )
        db.log_security_audit_event(
            action="EMERGENCY_TRADING_LOCK_ENGAGED",
            actor_user_id=actor_user_id,
            resource_type="SYSTEM",
            resource_id="ALL_BOTS",
            result="SUCCESS",
            assurance_level="LEVEL_4_CRITICAL_SECURITY"
        )
        return ok


from typing import Tuple
global_live_auth_manager = LiveAuthorizationManager()
