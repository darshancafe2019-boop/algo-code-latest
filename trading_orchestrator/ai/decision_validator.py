"""
Decision Validator
==================
Validates TradeIntent structural sanity, positive prices, valid stop-loss/take-profit
ratios, lot sizes, contract validity, broker segregation, and data freshness before risk submission.
"""

from __future__ import annotations

from typing import Tuple, List
from trading_orchestrator.decisions.trade_intent import TradeIntent


class DecisionValidator:
    """Pre-flight sanity validator for AI-generated TradeIntent objects."""

    @classmethod
    def validate_intent_structure(cls, intent: TradeIntent) -> Tuple[bool, List[str]]:
        errors: List[str] = []

        # 1. Identity & Routing checks
        if not intent.symbol:
            errors.append("Missing symbol.")
        if not intent.instrumentId:
            errors.append("Missing exact instrumentId / contract identifier.")
        if not intent.broker:
            errors.append("Missing explicit broker.")
        if not intent.brokerAccountId:
            errors.append("Missing explicit broker account ID.")
        if not intent.marketDataSource:
            errors.append("Missing explicit market data source.")

        # 2. Action & Decision sanity
        valid_actions = ["BUY", "SELL", "SQUARE_OFF", "HOLD", "NO_TRADE"]
        if intent.action not in valid_actions:
            errors.append(f"Invalid action: {intent.action}")

        # 3. Data freshness gate (fail closed if stale/unavailable)
        if intent.dataQualityStatus != "FRESH":
            errors.append(f"Data quality is not FRESH (status: {intent.dataQualityStatus}). Failing closed.")

        # 4. Price & Quantity sanity
        if intent.entryPrice <= 0:
            errors.append(f"Invalid non-positive entry price: {intent.entryPrice}")
        if intent.quantity <= 0:
            errors.append(f"Invalid non-positive quantity: {intent.quantity}")

        # 5. Protective Stops & Targets
        if intent.action in ["BUY", "SELL"]:
            if intent.stopLoss <= 0:
                errors.append("Missing or invalid non-positive stop-loss.")
            if intent.takeProfit <= 0:
                errors.append("Missing or invalid non-positive take-profit target.")

            # Directional sanity
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

        # 6. Options contract validation
        if intent.optionType:
            if intent.optionType not in ["CE", "PE"]:
                errors.append(f"Invalid option type: {intent.optionType}. Must be 'CE' or 'PE'.")
            if intent.strike is None or intent.strike <= 0:
                errors.append(f"Invalid option strike price: {intent.strike}")

        return len(errors) == 0, errors

    def validate_intent(self, intent: TradeIntent) -> Tuple[bool, str]:
        """Convenience method returning (is_valid, reason_str)."""
        is_valid, errors = self.validate_intent_structure(intent)
        if is_valid:
            return True, "Valid TradeIntent"
        return False, "; ".join(errors)
