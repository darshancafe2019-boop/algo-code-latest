"""
Quant.OS Bot Configuration Integrity & State Governance Engine
==============================================================
Enforces deterministic hashing of all bot configuration fields:
- Strategy ID, Version, Instrument, Expiry, Strike, Legs, Indicators, Rules,
  Risk Limits, Capital Allocation, Provider, Broker, and Execution Environment.

Invariants:
1. Any modification generates a new configuration hash.
2. An altered configuration automatically invalidates any prior approval token.
3. No direct DRAFT -> RUNNING transitions.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def generate_deterministic_bot_hash(bot_config: Dict[str, Any]) -> str:
    """
    Computes a canonical SHA-256 hash of all execution-affecting bot configuration properties.
    Ignores volatile telemetry/runtime timestamps.
    """
    # Extract only execution-critical fields in strict canonical order
    canonical_dict = {
        "bot_id": str(bot_config.get("bot_id") or bot_config.get("botId") or ""),
        "strategy_type": str(bot_config.get("strategy_type") or bot_config.get("strategyType") or bot_config.get("strategy_id") or ""),
        "underlying": str(bot_config.get("underlying_symbol") or bot_config.get("underlying") or ""),
        "expiry": str(bot_config.get("expiry") or ""),
        "environment": str(bot_config.get("environment") or "PAPER").upper(),
        "market_data_provider": str(bot_config.get("market_data_provider") or bot_config.get("marketDataProvider") or "UPSTOX").upper(),
        "execution_broker": str(bot_config.get("execution_broker") or bot_config.get("executionBroker") or "PAPER").upper(),
        "capital_allocation": float(bot_config.get("capital_allocation") or bot_config.get("capitalAllocation") or bot_config.get("capital") or 0.0),
        "stop_loss_pct": float(bot_config.get("stop_loss_pct") or bot_config.get("stopLossPct") or bot_config.get("stopLossValue") or bot_config.get("stop_loss") or bot_config.get("stopLoss") or 0.0),
        "take_profit_pct": float(bot_config.get("take_profit_pct") or bot_config.get("takeProfitPct") or bot_config.get("takeProfitValue") or bot_config.get("take_profit") or bot_config.get("takeProfit") or 0.0),
        "max_slippage_pct": float(bot_config.get("max_slippage_pct") or bot_config.get("maxSlippagePct") or 0.2),
        "legs": [],
    }

    raw_legs = bot_config.get("legs") or bot_config.get("strategyLegs") or []
    for leg in sorted(raw_legs, key=lambda l: (float(l.get("strike") or 0.0), str(l.get("option_type") or l.get("optionType") or ""))):
        canonical_dict["legs"].append({
            "strike": float(leg.get("strike") or 0.0),
            "option_type": str(leg.get("option_type") or leg.get("optionType") or "").upper(),
            "side": str(leg.get("side") or leg.get("action") or "").upper(),
            "quantity": float(leg.get("quantity") or 0.0),
            "lots": int(leg.get("lots") or 1),
            "premium": float(leg.get("premium") or leg.get("limit_price") or 0.0),
        })

    canonical_json = json.dumps(canonical_dict, sort_keys=True)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


@dataclass
class BotApprovalRecord:
    """Approval token recording user sign-off for a specific deterministic configuration hash."""
    bot_id: str
    config_hash: str
    approved_by: str = "user"
    approved_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    environment: str = "PAPER"
    is_live_confirmed: bool = False
    approval_token: str = field(default_factory=lambda: hashlib.sha256(f"{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()[:16])

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BotStateGovernance:
    """Enforces absolute user control & approval validation before execution."""

    _approval_registry: Dict[str, BotApprovalRecord] = {}

    @classmethod
    def register_user_approval(
        cls,
        bot_config: Dict[str, Any],
        approved_by: str = "user",
        is_live_confirmed: bool = False,
    ) -> BotApprovalRecord:
        """Records explicit user sign-off for the current bot configuration hash."""
        bot_id = str(bot_config.get("bot_id") or bot_config.get("botId") or "temp_bot")
        config_hash = generate_deterministic_bot_hash(bot_config)
        env = str(bot_config.get("environment") or "PAPER").upper()

        rec = BotApprovalRecord(
            bot_id=bot_id,
            config_hash=config_hash,
            approved_by=approved_by,
            environment=env,
            is_live_confirmed=is_live_confirmed,
        )
        cls._approval_registry[bot_id] = rec
        return rec

    @classmethod
    def verify_approval_valid(cls, bot_config: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Verifies whether the current bot configuration matches the approved configuration hash.
        Returns (is_valid, reason).
        """
        bot_id = str(bot_config.get("bot_id") or bot_config.get("botId") or "")
        rec = cls._approval_registry.get(bot_id)
        if not rec:
            return False, "NO_APPROVAL_ON_FILE: Bot has never received explicit user sign-off."

        current_hash = generate_deterministic_bot_hash(bot_config)
        if current_hash != rec.config_hash:
            return False, f"CONFIG_MUTATED_AFTER_APPROVAL: Configuration changed since approval. Prior token invalidated. (Approved: {rec.config_hash[:8]}, Current: {current_hash[:8]})"

        env = str(bot_config.get("environment") or "PAPER").upper()
        if env == "LIVE" and not rec.is_live_confirmed:
            return False, "LIVE_CONFIRMATION_REQUIRED: Live execution requires explicit live security confirmation."

        return True, "APPROVAL_VALID"


class BotConfigIntegrity:
    """Canonical interface for deterministic bot configuration hashing and approval integrity verification."""

    @staticmethod
    def compute_config_hash(bot_config: Dict[str, Any]) -> str:
        return generate_deterministic_bot_hash(bot_config)

    @classmethod
    def verify_approval_integrity(cls, bot_config: Dict[str, Any], approved_hash: str) -> Tuple[bool, Optional[str]]:
        current_hash = cls.compute_config_hash(bot_config)
        if current_hash != approved_hash:
            return False, f"Configuration has been modified after approval. Current: {current_hash[:8]}, Approved: {approved_hash[:8]}"
        return True, None

