"""
Trading Journal Repository
==========================
Records comprehensive checkpoint execution logs, market context snapshots,
AI reasoning notes, trade decisions, risk verdicts, and final execution outcomes.
"""

from __future__ import annotations

import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from src import db


def record_journal_entry(
    checkpoint_id: str,
    market_regime: str,
    market_context: Dict[str, Any],
    analysis_summary: str,
    candidate_setups: List[Dict[str, Any]],
    decisions: List[Dict[str, Any]],
    risk_summary: Dict[str, Any],
    execution_summary: Dict[str, Any],
    positions_snapshot: List[Dict[str, Any]],
    outcome_summary: str,
    ai_observations: str = "",
) -> str:
    """Creates a persistent checkpoint journal entry."""
    now_iso = datetime.now(timezone.utc).isoformat()
    journal_id = f"JRN-{uuid.uuid4().hex[:8].upper()}"

    db.safe_execute(
        """
        INSERT INTO orchestrator_journal (
            journal_id, timestamp, checkpoint_id, market_regime, market_context_json,
            analysis_summary, candidate_setups_json, decisions_json, risk_summary_json,
            execution_summary_json, positions_snapshot_json, outcome_summary,
            ai_observations, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            journal_id,
            now_iso,
            checkpoint_id,
            market_regime,
            json.dumps(market_context),
            analysis_summary,
            json.dumps(candidate_setups),
            json.dumps(decisions),
            json.dumps(risk_summary),
            json.dumps(execution_summary),
            json.dumps(positions_snapshot),
            outcome_summary,
            ai_observations,
            now_iso,
        )
    )
    return journal_id


def get_recent_journal_entries(limit: int = 30) -> List[Dict[str, Any]]:
    """Retrieves chronological journal entries."""
    rows = db.safe_query(
        """
        SELECT * FROM orchestrator_journal 
        ORDER BY created_at DESC LIMIT ?
        """,
        (limit,)
    ) or []

    entries = []
    for r in rows:
        d = dict(r)
        for json_col in [
            "market_context_json",
            "candidate_setups_json",
            "decisions_json",
            "risk_summary_json",
            "execution_summary_json",
            "positions_snapshot_json",
        ]:
            try:
                d[json_col.replace("_json", "")] = json.loads(d.get(json_col) or "{}")
            except Exception:
                d[json_col.replace("_json", "")] = {}
        entries.append(d)
    return entries


class TradingJournal:
    """Object interface for recording and retrieving checkpoint journal entries."""

    @staticmethod
    def log_entry(
        checkpoint_type: str,
        market_regime: str = "NORMAL",
        market_context: Optional[Dict[str, Any]] = None,
        ai_analysis: Optional[Dict[str, Any]] = None,
        candidate_setups: Optional[List[Any]] = None,
        trade_decisions: Optional[List[Any]] = None,
        risk_result: Optional[Dict[str, Any]] = None,
        execution_result: Optional[Dict[str, Any]] = None,
        position_result: Optional[Dict[str, Any]] = None,
        final_outcome: str = "",
        ai_observations: str = "",
    ) -> str:
        return record_journal_entry(
            checkpoint_id=checkpoint_type,
            market_regime=market_regime,
            market_context=market_context or {},
            analysis_summary=json.dumps(ai_analysis or {}),
            candidate_setups=candidate_setups or [],
            decisions=trade_decisions or [],
            risk_summary=risk_result or {},
            execution_summary=execution_result or {},
            positions_snapshot=[position_result] if position_result else [],
            outcome_summary=final_outcome,
            ai_observations=ai_observations,
        )

    @staticmethod
    def get_recent_entries(limit: int = 30) -> List[Dict[str, Any]]:
        entries = get_recent_journal_entries(limit=limit)
        # Add checkpoint_type alias for compatibility
        for e in entries:
            e["checkpoint_type"] = e.get("checkpoint_id", "")
        return entries

