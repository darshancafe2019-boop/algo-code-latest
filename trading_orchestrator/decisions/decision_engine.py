"""
Decision Engine & Universal Risk Validation Bridge
==================================================
Submits AI-generated TradeIntent proposals to the Universal Risk Engine (evaluate_trade_precheck).
Enforces fail-closed blocking: if Risk Engine rejects or encounters errors, the trade is strictly BLOCKED.
Validates all deterministic safety gates (paper mode lock, broker segregation, fresh quotes, no duplicates, kill switch OFF).
Never bypasses Risk Engine.
"""

from __future__ import annotations

import json
import logging
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime, timezone

from src import config, db
from src.universal_risk_engine import validate_trade_against_risk_limits
from trading_orchestrator.decisions.trade_intent import TradeIntent
from trading_orchestrator.decisions.decision_history import record_decision
from trading_orchestrator.db_init import init_orchestrator_tables

logger = logging.getLogger("DecisionEngine")


class DecisionEngine:
    """Evaluates TradeIntent proposals against institutional deterministic safety gates and 20-stage risk rules."""

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
        Runs TradeIntent through deterministic safety gates & 20-stage pre-trade safety check.
        Returns: (is_approved: bool, risk_status: str, reasons: list[str], full_risk_decision: dict)
        """
        init_orchestrator_tables()
        blocking_reasons: List[str] = []

        # Gate 1: Global Emergency Kill Switch
        if getattr(config, "GLOBAL_KILL_SWITCH", False):
            blocking_reasons.append("EMERGENCY_KILL_SWITCH_ACTIVE: Global trading halt active.")

        # Gate 2: Paper Mode Enforcement
        server_trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        live_enabled = getattr(config, "LIVE_TRADING_ENABLED", False)
        if server_trading_mode == "PAPER" or not live_enabled:
            # Strictly reject live execution unless explicit human authorization
            if not intent.paperOnly:
                blocking_reasons.append("LIVE_TRADING_LOCKED: Live broker execution is locked by system safety policy.")

        # Gate 3: Data Freshness Gate
        if intent.dataQualityStatus != "FRESH":
            blocking_reasons.append(f"DATA_NOT_FRESH: Market data quality is {intent.dataQualityStatus}. Fail-closed.")

        # Gate 4: Duplicate signal / order check
        existing_orders = db.safe_query(
            "SELECT order_id, status FROM orchestrator_orders WHERE idempotency_key = ? AND status NOT IN ('FILLED', 'CLOSED', 'REJECTED', 'CANCELLED')",
            (intent.idempotencyKey,)
        )
        if existing_orders:
            blocking_reasons.append(f"DUPLICATE_ORDER_PREVENTED: Order with key {intent.idempotencyKey} already active.")

        # Gate 5: Check existing duplicate positions if not square-off
        if intent.action in ["BUY", "SELL"]:
            pos_match = [
                p for p in (portfolio_positions or [])
                if p.get("symbol") == intent.symbol and p.get("status") == "OPEN"
            ]
            if pos_match and intent.checkpointId not in ["POSITION_REVIEW", "CLOSING_MANAGEMENT", "FLATTEN_OR_EXIT", "POSITION_MANAGEMENT"]:
                blocking_reasons.append(f"EXISTING_POSITION_ACTIVE: Open position already exists for {intent.symbol}.")

        # Gate 6: Explicit Broker & Account Segregation
        if not intent.broker or intent.broker == "UNKNOWN":
            blocking_reasons.append("AMBIGUOUS_BROKER: Broker must be explicitly specified.")
        if not intent.brokerAccountId:
            blocking_reasons.append("AMBIGUOUS_ACCOUNT: Broker account ID must be explicitly specified.")

        # If any deterministic gate failed, immediately block
        if blocking_reasons:
            record_decision(
                intent=intent,
                run_id=run_id,
                risk_status="BLOCKED",
                risk_score=100.0,
                risk_reasons=blocking_reasons,
                execution_mode="PAPER" if intent.paperOnly else "LIVE",
            )
            logger.warning("[SAFETY_GATE_BLOCKED] Decision %s blocked by safety gates: %s", intent.decisionId, "; ".join(blocking_reasons))
            return False, "BLOCKED", blocking_reasons, {"approved": False, "blocking_reasons": blocking_reasons}

        # Determine canonical asset_class for Universal Risk Engine
        if intent.optionType or "Call" in intent.strategy or "Put" in intent.strategy or "Spread" in intent.strategy:
            asset_cls = "options"
        elif intent.symbol.upper() in ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"]:
            asset_cls = "indices"
        elif intent.exchange.upper() in ["DELTA", "BINANCE", "BYBIT"] or intent.symbol.upper() in ["BTC", "ETH", "SOL", "BTC/USDT", "ETH/USDT"]:
            asset_cls = "crypto"
        else:
            asset_cls = "indian_stocks"

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
            "asset_class": asset_cls,
        }

        try:
            risk_verdict = validate_trade_against_risk_limits(
                trade_request=trade_request,
                account_balance=account_balance,
                available_balance=account_balance * 0.85,
                portfolio_positions=portfolio_positions or [],
                daily_pnl=daily_pnl,
            )

            is_approved = bool(risk_verdict.get("is_approved", risk_verdict.get("approved", False)))
            status_str = "APPROVED" if is_approved else "BLOCKED"
            reasons = risk_verdict.get("rejection_reasons", risk_verdict.get("blocking_reasons", []))
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

            # If risk approved, record intent order lifecycle record in DB
            if is_approved:
                now_iso = datetime.now(timezone.utc).isoformat()
                db.safe_execute(
                    """
                    INSERT INTO orchestrator_orders (
                        order_id, decision_id, run_id, idempotency_key, symbol, instrument_id,
                        side, quantity, price, order_type, time_in_force, broker, account_id,
                        mode, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(idempotency_key) DO UPDATE SET
                        status=excluded.status,
                        updated_at=excluded.updated_at
                    """,
                    (
                        f"ORD-{intent.decisionId}",
                        intent.decisionId,
                        run_id,
                        intent.idempotencyKey,
                        intent.symbol,
                        intent.instrumentId,
                        intent.action,
                        intent.quantity,
                        intent.entryPrice,
                        "LIMIT",
                        intent.timeInForce,
                        intent.broker,
                        intent.brokerAccountId,
                        "PAPER" if intent.paperOnly else "LIVE",
                        "RISK_APPROVED",
                        now_iso,
                        now_iso,
                    )
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
