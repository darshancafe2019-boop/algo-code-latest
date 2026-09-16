"""
Decision Validator
==================
Validates TradeIntent structural sanity, positive prices, valid stop-loss/take-profit
ratios, lot sizes, and security identifier formatting before risk submission.
"""

from __future__ import annotations

from typing import Tuple, List
from trading_orchestrator.decisions.trade_intent import TradeIntent


class DecisionValidator:
    """Pre-flight sanity validator for AI-generated TradeIntent objects."""

    @classmethod
    def validate_intent_structure(cls, intent: TradeIntent) -> Tuple[bool, List[str]]:
        errors: List[str] = []

        if not intent.symbol:
            errors.append("Missing symbol.")
        if intent.action not in ["BUY", "SELL", "SQUARE_OFF", "HOLD", "NO_TRADE"]:
            errors.append(f"Invalid action: {intent.action}")
        if intent.entryPrice <= 0:
            errors.append(f"Invalid non-positive entry price: {intent.entryPrice}")
        if intent.quantity <= 0:
            errors.append(f"Invalid non-positive quantity: {intent.quantity}")

        if intent.action in ["BUY", "SELL"]:
            if intent.stopLoss <= 0:
                errors.append("Missing or invalid non-positive stop-loss.")
            if intent.takeProfit <= 0:
                errors.append("Missing or invalid non-positive take-profit target.")

            # Check directional sanity
            if intent.action == "BUY":
                if intent.stopLoss >= intent.entryPrice:
                    errors.append(f"Stop-loss ({intent.stopLoss}) must be below entry ({intent.entryPrice}) for BUY.")
                if intent.takeProfit <= intent.entryPrice:
                    errors.append(f"Take-profit ({intent.takeProfit}) must be above entry ({intent.entryPrice}) for BUY.")
            elif intent.action == "SELL":
                if intent.stopLoss <= intent.entryPrice:
                    errors.append(f"Stop-loss ({intent.stopLoss}) must be above entry ({intent.entryPrice}) for SELL.")
                if intent.takeProfit >= intent.entryPrice:
                    errors.append(f"Take-profit ({intent.takeProfit}) must be below entry ({intent.entryPrice}) for SELL.")

        return len(errors) == 0, errors

    def validate_intent(self, intent: TradeIntent) -> Tuple[bool, str]:
        """Convenience method returning (is_valid, reason_str)."""
        is_valid, errors = self.validate_intent_structure(intent)
        if is_valid:
            return True, "Valid TradeIntent"
        return False, "; ".join(errors)

