"""
Checkpoint Job Implementations
==============================
Executes specialized tasks for each of the 6 daily automated trading checkpoints.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from src import db
from trading_orchestrator.scheduler.checkpoints import CheckpointType
from trading_orchestrator.context.market_context import build_comprehensive_market_context
from trading_orchestrator.ai.strategy_agent import StrategyAgent
from trading_orchestrator.decisions.decision_engine import DecisionEngine
from trading_orchestrator.decisions.trade_intent import TradeIntent
from trading_orchestrator.reports.trading_journal import record_journal_entry
from trading_orchestrator.reports.daily_report import generate_daily_report
from src.execution_service import PaperExecutionAdapter

logger = logging.getLogger("CheckpointJobs")


class CheckpointJobRunner:
    """Executes checkpoint-specific routines."""

    @classmethod
    def execute_checkpoint(
        cls,
        checkpoint_id: str,
        run_id: str,
        execution_mode: str = "PAPER",
        symbols: List[str] = None
    ) -> Dict[str, Any]:
        target_symbols = symbols or ["NIFTY", "BANKNIFTY", "RELIANCE", "BTC"]
        logger.info("[CHECKPOINT_RUNNER] Starting execution for %s [Run ID: %s, Mode: %s]", checkpoint_id, run_id, execution_mode)

        # 1. Gather Market Context
        mkt_ctx = build_comprehensive_market_context(symbols=target_symbols, execution_mode=execution_mode)
        regime_type = mkt_ctx.regime.regime_type

        # 2. Run AI Strategy Agent
        intents = StrategyAgent.evaluate_market_and_formulate_intents(
            symbols=target_symbols,
            checkpoint_name=checkpoint_id,
            execution_mode=execution_mode,
        )

        decisions_summary = []
        approved_intents = []
        blocked_intents = []

        # 3. Evaluate each TradeIntent against Universal Risk Engine
        for intent in intents:
            is_approved, status_str, reasons, full_verdict = DecisionEngine.evaluate_intent(
                intent=intent,
                run_id=run_id,
                account_balance=1000000.0,
                portfolio_positions=mkt_ctx.open_positions,
            )
            decisions_summary.append({
                "decisionId": intent.decisionId,
                "symbol": intent.symbol,
                "action": intent.action,
                "strategy": intent.strategy,
                "entryPrice": intent.entryPrice,
                "confidence": intent.confidence,
                "risk_status": status_str,
                "risk_reasons": reasons,
            })

            if is_approved:
                approved_intents.append(intent)
            else:
                blocked_intents.append(intent)

        # 4. Handle Execution
        execution_results = []
        if execution_mode.upper() == "PAPER":
            paper_adapter = PaperExecutionAdapter()
            for intent in approved_intents:
                if intent.action in ["BUY", "SELL"]:
                    fill = paper_adapter.submit_order(
                        symbol=intent.symbol,
                        side=intent.action,
                        amount=intent.quantity,
                        price=intent.entryPrice,
                    )
                    execution_results.append({
                        "decisionId": intent.decisionId,
                        "symbol": intent.symbol,
                        "order_id": fill.get("order_id"),
                        "status": "FILLED",
                        "price": fill.get("average_price", intent.entryPrice),
                    })
        else:
            # LIVE MODE: Held for Human Approval Gate
            for intent in approved_intents:
                execution_results.append({
                    "decisionId": intent.decisionId,
                    "symbol": intent.symbol,
                    "status": "AWAITING_HUMAN_APPROVAL",
                })

        # 5. Checkpoint-specific post-processing
        if checkpoint_id == CheckpointType.END_OF_DAY_REPORT.value:
            generate_daily_report()

        # 6. Record in Journal
        analysis_note = f"Checkpoint {checkpoint_id} executed. Processed {len(target_symbols)} instruments. Regime: {regime_type}. Formulated {len(intents)} setups."
        outcome_note = f"Approved {len(approved_intents)} setups, Blocked {len(blocked_intents)}. Executed/Queued {len(execution_results)} orders."

        journal_id = record_journal_entry(
            checkpoint_id=checkpoint_id,
            market_regime=regime_type,
            market_context=mkt_ctx.to_dict(),
            analysis_summary=analysis_note,
            candidate_setups=[i.to_dict() for i in intents],
            decisions=decisions_summary,
            risk_summary={"approved": len(approved_intents), "blocked": len(blocked_intents)},
            execution_summary={"executed_count": len(execution_results), "results": execution_results},
            positions_snapshot=mkt_ctx.open_positions,
            outcome_summary=outcome_note,
            ai_observations=f"AI observed normal spread liquidity across {len(target_symbols)} assets at checkpoint {checkpoint_id}.",
        )

        return {
            "checkpoint_id": checkpoint_id,
            "run_id": run_id,
            "journal_id": journal_id,
            "status": "SUCCESS",
            "regime": regime_type,
            "intents_count": len(intents),
            "approved_count": len(approved_intents),
            "blocked_count": len(blocked_intents),
            "executed_count": len(execution_results),
            "decisions": decisions_summary,
            "summary": outcome_note,
        }
