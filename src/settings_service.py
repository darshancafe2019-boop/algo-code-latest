"""
Authoritative Settings and Preference Persistence Service
=========================================================
Single source of truth for:
- User UI Settings (Theme, Theme Mode, Compact Mode)
- Timezone & Presentation Currency Configurations
- Notification Preferences (Telegram Alert Channels)
- Clear Architecture Separation from Security & Trading Authorization Policies
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from src import config, db

logger = logging.getLogger("SettingsService")


class SettingsService:
    """Authoritative service for managing and persisting global application preferences."""

    SETTINGS_FILE = Path(getattr(config, "DATA_DIR", "data")) / "user_settings.json"

    DEFAULT_SETTINGS = {
        "appearance": {
            "theme_id": "obsidian-blue",
            "theme_mode": "dark",
            "compact_density": True,
            "theme_name": "Obsidian Blue",
        },
        "region": {
            "timezone": "Asia/Kolkata",
            "utc_offset": "+05:30",
            "currency": "INR",
            "currency_symbol": "₹",
            "locale": "en-IN",
        },
        "notifications": {
            "telegram_enabled": True,
            "trade_signals": True,
            "order_filled": True,
            "order_rejected": True,
            "stop_loss": True,
            "take_profit": True,
            "bot_status": True,
            "risk_alerts": True,
            "system_errors": True,
            "emergency_halt": True,
            "normal_bot_heartbeats": False,
        }
    }

    def __init__(self):
        self._ensure_dir()

    def _ensure_dir(self):
        self.SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

    def get_settings(self) -> Dict[str, Any]:
        """
        Fetches current consolidated settings.
        """
        if self.SETTINGS_FILE.exists():
            try:
                with open(self.SETTINGS_FILE, "r", encoding="utf-8") as f:
                    stored = json.load(f)
                    # Merge with defaults to ensure all keys present
                    merged = {
                        "appearance": {**self.DEFAULT_SETTINGS["appearance"], **stored.get("appearance", {})},
                        "region": {**self.DEFAULT_SETTINGS["region"], **stored.get("region", {})},
                        "notifications": {**self.DEFAULT_SETTINGS["notifications"], **stored.get("notifications", {})},
                        "updated_at": stored.get("updated_at", datetime.now(timezone.utc).isoformat())
                    }
                    return merged
            except Exception as e:
                logger.error(f"Error reading settings file: {e}")

        return {**self.DEFAULT_SETTINGS, "updated_at": datetime.now(timezone.utc).isoformat()}

    def update_settings(self, updates: Dict[str, Any], updated_by: str = "usr_admin") -> Dict[str, Any]:
        """
        Updates settings fields with schema validation and audit trail.
        """
        current = self.get_settings()

        if "appearance" in updates and isinstance(updates["appearance"], dict):
            current["appearance"].update(updates["appearance"])

        if "region" in updates and isinstance(updates["region"], dict):
            reg = updates["region"]
            if "timezone" in reg:
                current["region"]["timezone"] = str(reg["timezone"])
            if "currency" in reg:
                curr = str(reg["currency"]).upper()
                current["region"]["currency"] = curr
                current["region"]["currency_symbol"] = "₹" if curr == "INR" else ("$" if curr == "USD" else curr)

        if "notifications" in updates and isinstance(updates["notifications"], dict):
            current["notifications"].update(updates["notifications"])

        current["updated_at"] = datetime.now(timezone.utc).isoformat()

        try:
            with open(self.SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(current, f, indent=2)

            db.log_security_audit_event(
                action="USER_SETTINGS_UPDATED",
                actor_user_id=updated_by,
                resource_type="USER_SETTINGS",
                resource_id="GLOBAL_PREFERENCES",
                result="SUCCESS",
                assurance_level="LEVEL_2_AUTHENTICATED",
                details={"updated_fields": list(updates.keys())}
            )

            return {"status": "success", "settings": current}
        except Exception as e:
            logger.error(f"Failed to write settings file: {e}")
            return {"status": "error", "message": str(e), "settings": current}


# Global Singleton Instance
global_settings_service = SettingsService()
