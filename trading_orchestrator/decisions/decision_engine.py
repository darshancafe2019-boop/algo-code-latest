"""
Decision Engine & Universal Risk Validation Bridge
==================================================
Submits AI-generated TradeIntent proposals to the Universal Risk Engine (evaluate_trade_precheck).
Enforces fail-closed blocking: if Risk Engine rejects or encounters errors, the trade is strictly BLOCKED.
Never bypasses Risk Engine.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime, timezone

from src import config, db
from src.universal_risk_engine import validate_trade_against_risk_limits
from trading_orchestrator.decisions.trade_intent import TradeIntent
from trading_orchestrator.decisions.decision_history import record_decision

logger = logging.getLogger("DecisionEngine")


class DecisionEngine:
    """Evaluates TradeIntent proposals against institutional 20-stage risk rules."""

    @classmethod
    def evaluate_intent(
        cls,
        intent: TradeIntent,
        run_id: str,
        account_balance: float = 1000000.0,
        portfolio_positions: Optional[List[Dict[str, Any]]] = None,
        daily_pnl: float = 0.0,
    ) -> Tuple[bool, str, List[str], Dict[str, Any]]:
        """
        Runs TradeIntent through 20-stage pre-trade safety check.
        Returns: (is_approved: bool, risk_status: str, reasons: list[str], full_risk_decision: dict)
        """
        trade_request = {
            "symbol": intent.symbol,
            "direction": "LONG" if intent.action.upper() in ["BUY", "LONG"] else "SHORT",
            "entry_price": intent.entryPrice,
            "price": intent.entryPrice,
            "quantity": intent.quantity,
            "amount": intent.quantity,
            "stop_loss": intent.stopLoss,
            "take_profit": intent.takeProfit,
            "strategy": intent.strategy,
            "exchange": intent.exchange,
            "timeframe": "15m",
            "asset_class": "INDIAN_EQUITIES" if intent.exchange == "NSE" else "CRYPTO",
        }

        try:
            risk_verdict = validate_trade_against_risk_limits(
                trade_request=trade_request,
                account_balance=account_balance,
                available_balance=account_balance * 0.85,
                portfolio_positions=portfolio_positions or [],
                daily_pnl=daily_pnl,
            )

            is_approved = bool(risk_verdict.get("approved", False))
            status_str = "APPROVED" if is_approved else "BLOCKED"
            reasons = risk_verdict.get("blocking_reasons", [])
            if not reasons and not is_approved:
                reasons = [risk_verdict.get("rejection_reason", "Risk limit exceeded")]

            risk_score = float(risk_verdict.get("risk_score", 45.0 if is_approved else 95.0))
            intent.riskScore = risk_score

            # Persist evaluation record
            record_decision(
                intent=intent,
                run_id=run_id,
                risk_status=status_str,
                risk_score=risk_score,
                risk_reasons=reasons,
                execution_mode="PAPER" if intent.paperOnly else "LIVE",
            )

            logger.info(
                "[RISK_CHECK] Decision %s (%s %s) -> Verdict: %s (Reasons: %s)",
                intent.decisionId,
                intent.action,
                intent.symbol,
                status_str,
                ", ".join(reasons) if reasons else "None",
            )
            return is_approved, status_str, reasons, risk_verdict

        except Exception as e:
            logger.error("[RISK_CHECK_ERROR] Failed evaluating trade intent %s: %s", intent.decisionId, e)
            record_decision(
                intent=intent,
                run_id=run_id,
                risk_status="BLOCKED",
                risk_score=100.0,
                risk_reasons=[f"Risk Engine evaluation error: {e}"],
                execution_mode="PAPER" if intent.paperOnly else "LIVE",
            )
            return False, "BLOCKED", [f"Risk Engine evaluation error: {e}"], {"approved": False, "error": str(e)}

    def evaluate_trade_intent(self, intent: TradeIntent, run_id: str = "TEST-RUN"):
        """Helper method returning EvaluationResult object."""
        class EvaluationResult:
            def __init__(self, approved: bool, status: str, reasons: List[str]):
                self.approved = approved
                self.risk_status = status
                self.risk_reasons = reasons

        approved, status, reasons, _ = self.evaluate_intent(intent=intent, run_id=run_id)
        return EvaluationResult(approved, status, reasons)

