"""
Decision History Repository
===========================
Persists and retrieves TradeIntent records, risk evaluation verdicts, and approval lifecycles.
"""

from __future__ import annotations

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from src import db
from trading_orchestrator.decisions.trade_intent import TradeIntent


def record_decision(
    intent: TradeIntent,
    run_id: str,
    risk_status: str = "PENDING",
    risk_score: float = 0.0,
    risk_reasons: Optional[List[str]] = None,
    execution_mode: str = "PAPER",
) -> None:
    """Inserts a new decision record into the database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    db.safe_execute(
        """
        INSERT INTO orchestrator_decisions (
            decision_id, run_id, checkpoint_id, timestamp, symbol, exchange, provider,
            action, strategy, entry_price, quantity, stop_loss, take_profit, time_in_force,
            confidence, reason, market_regime, risk_status, risk_score, risk_reasons_json,
            approval_status, execution_mode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(decision_id) DO UPDATE SET
            risk_status=excluded.risk_status,
            risk_score=excluded.risk_score,
            risk_reasons_json=excluded.risk_reasons_json
        """,
        (
            intent.decisionId,
            run_id,
            intent.checkpointId,
            intent.timestamp,
            intent.symbol,
            intent.exchange,
            intent.provider,
            intent.action,
            intent.strategy,
            intent.entryPrice,
            intent.quantity,
            intent.stopLoss,
            intent.takeProfit,
            intent.timeInForce,
            intent.confidence,
            intent.reason,
            intent.marketRegime,
            risk_status,
            risk_score,
            json.dumps(risk_reasons or []),
            "PENDING" if not intent.paperOnly else "AUTO_PAPER",
            execution_mode,
            now_iso,
        )
    )


def update_decision_approval(
    decision_id: str,
    approved: bool,
    approved_by: str = "Operator",
    execution_status: str = "PENDING"
) -> bool:
    """Updates approval status for a human gate review."""
    now_iso = datetime.now(timezone.utc).isoformat()
    approval_status = "APPROVED" if approved else "REJECTED"
    res = db.safe_execute(
        """
        UPDATE orchestrator_decisions SET
            approval_status = ?,
            approved_by = ?,
            approved_at = ?,
            execution_status = ?
        WHERE decision_id = ?
        """,
        (approval_status, approved_by, now_iso, execution_status, decision_id)
    )
    return res


def update_decision_execution(
    decision_id: str,
    order_id: str,
    broker_order_id: str,
    status: str,
    execution_details: Dict[str, Any]
) -> bool:
    """Updates order fulfillment details."""
    res = db.safe_execute(
        """
        UPDATE orchestrator_decisions SET
            order_id = ?,
            broker_order_id = ?,
            execution_status = ?,
            execution_details_json = ?
        WHERE decision_id = ?
        """,
        (order_id, broker_order_id, status, json.dumps(execution_details), decision_id)
    )
    return res


def list_recent_decisions(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches recent AI trade proposals and decisions."""
    rows = db.safe_query(
        """
        SELECT * FROM orchestrator_decisions 
        ORDER BY created_at DESC LIMIT ?
        """,
        (limit,)
    ) or []

    results = []
    for r in rows:
        d = dict(r)
        try:
            d["risk_reasons"] = json.loads(d.get("risk_reasons_json") or "[]")
            d["execution_details"] = json.loads(d.get("execution_details_json") or "{}")
        except Exception:
            d["risk_reasons"] = []
            d["execution_details"] = {}
        results.append(d)
    return results
