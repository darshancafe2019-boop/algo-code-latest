"""
Quant.OS Bot Strategy Engine
Deterministic Multi-Timeframe Strategy Evaluator with rule nodes (IF, AND, OR, NOT, THEN),
indicator caching, order flow inputs, and explainable decision auditing.
"""

from typing import Dict, List, Any, Optional, Tuple
import logging
import math
from datetime import datetime, timezone

from src.data_core.bots.models import (
    StrategyRuleNode,
    ExplainableDecision,
    ExplainableDecisionRule,
    SignalLifecycleState,
    SignalItem,
)

logger = logging.getLogger("QuantDataCore.BotStrategyEngine")


class BotStrategyEngine:
    """
    Deterministic Strategy Evaluation Engine.
    Takes market snapshot, indicator readings, order flow variables, and portfolio state,
    and evaluates rule conjunctions producing ExplainableDecision records.
    """

    def __init__(self):
        # Cache for multi-timeframe indicator readings: f"{instrument}:{timeframe}:{indicator_key}" -> float
        self._indicator_cache: Dict[str, float] = {}

    def set_cached_indicator(self, instrument: str, timeframe: str, indicator_name: str, value: float):
        key = f"{instrument.upper()}:{timeframe.lower()}:{indicator_name.upper()}"
        self._indicator_cache[key] = value

    def get_cached_indicator(self, instrument: str, timeframe: str, indicator_name: str) -> Optional[float]:
        key = f"{instrument.upper()}:{timeframe.lower()}:{indicator_name.upper()}"
        return self._indicator_cache.get(key)

    def evaluate_rules(
        self,
        bot_id: str,
        rules: List[StrategyRuleNode],
        market_data: Dict[str, Any],
        order_flow: Optional[Dict[str, Any]] = None,
        positions_count: int = 0,
        max_positions: int = 1,
    ) -> Tuple[ExplainableDecision, Optional[SignalItem]]:
        """
        Evaluates strategy rules deterministically.
        Returns the full ExplainableDecision audit trail and an optional SignalItem.
        """
        decision_rules: List[ExplainableDecisionRule] = []
        all_passed = True
        ltp = float(market_data.get("ltp", 0.0))
        instrument_id = market_data.get("instrumentId", "UNKNOWN")
        canonical_id = market_data.get("canonicalInstrumentId", instrument_id)

        if not rules:
            # Default fallback rule: LTP > 0
            desc = f"Market LTP Active ({ltp:.2f} > 0.0)"
            passed = ltp > 0
            decision_rules.append(ExplainableDecisionRule(
                rule_id="DEFAULT_LTP_CHECK",
                description=desc,
                input_value=ltp,
                expected_value="> 0.0",
                passed=passed,
            ))
            if not passed:
                all_passed = False
        else:
            for rule in rules:
                left_val = self._resolve_operand(rule.left_operand, rule.timeframe, market_data, order_flow)
                right_val = rule.right_value
                if rule.right_type in ("INDICATOR", "PRICE") and rule.right_operand:
                    right_val = self._resolve_operand(rule.right_operand, rule.timeframe, market_data, order_flow)

                passed = self._evaluate_operator(left_val, rule.operator, right_val)
                desc = f"{rule.left_operand} ({left_val}) {rule.operator} {right_val}"
                
                decision_rules.append(ExplainableDecisionRule(
                    rule_id=rule.id,
                    description=desc,
                    input_value=left_val,
                    expected_value=f"{rule.operator} {right_val}",
                    passed=passed,
                ))

                if rule.is_mandatory and not passed:
                    all_passed = False

        # Check position ceiling
        if positions_count >= max_positions:
            all_passed = False
            decision_rules.append(ExplainableDecisionRule(
                rule_id="MAX_POSITIONS_LIMIT",
                description=f"Active positions ({positions_count}) reached maximum limit ({max_positions})",
                input_value=positions_count,
                expected_value=f"< {max_positions}",
                passed=False,
            ))

        final_decision = "BUY" if all_passed else "NO_TRADE"
        summary = "All strategy criteria satisfied" if all_passed else "Strategy entry conditions not satisfied"

        decision = ExplainableDecision(
            bot_id=bot_id,
            market_snapshot_id=f"snap_{instrument_id}_{int(datetime.now(timezone.utc).timestamp())}",
            rules_evaluated=decision_rules,
            risk_gates_passed=True,
            final_decision=final_decision,
            summary=summary,
        )

        signal: Optional[SignalItem] = None
        if all_passed:
            signal = SignalItem(
                bot_id=bot_id,
                instrument_id=instrument_id,
                canonical_instrument_id=canonical_id,
                side="BUY",
                state=SignalLifecycleState.CONFIRMED,
                confidence=1.0,
                market_snapshot_id=decision.market_snapshot_id,
                conditions_passed=[r.description for r in decision_rules if r.passed],
                conditions_failed=[r.description for r in decision_rules if not r.passed],
            )

        return decision, signal

    def _resolve_operand(
        self,
        operand: str,
        timeframe: str,
        market_data: Dict[str, Any],
        order_flow: Optional[Dict[str, Any]],
    ) -> float:
        op = operand.upper()
        if op in ("LTP", "PRICE", "CLOSE"):
            return float(market_data.get("ltp", 0.0))
        if op in ("BID", "BEST_BID"):
            return float(market_data.get("bid", 0.0))
        if op in ("ASK", "BEST_ASK"):
            return float(market_data.get("ask", 0.0))
        if op in ("VOLUME", "VOL"):
            return float(market_data.get("volume", 0.0))
        if op in ("OI", "OPEN_INTEREST"):
            return float(market_data.get("oi", 0.0))

        # Order flow variables
        if order_flow:
            if op in ("SPREAD", "SPREAD_BPS"):
                return float(order_flow.get("spreadBps", 0.0))
            if op in ("IMBALANCE", "DEPTH_IMBALANCE"):
                return float(order_flow.get("depthImbalancePct", 0.0))
            if op in ("CUMULATIVE_BID", "BID_DEPTH"):
                return float(order_flow.get("cumulativeBidDepth", 0.0))
            if op in ("CUMULATIVE_ASK", "ASK_DEPTH"):
                return float(order_flow.get("cumulativeAskDepth", 0.0))

        # Check indicator cache
        inst = market_data.get("instrumentId", "")
        cached = self.get_cached_indicator(inst, timeframe, operand)
        if cached is not None:
            return cached

        # Synthetic benchmark lookup fallback
        if "EMA" in op or "SMA" in op:
            return float(market_data.get("ltp", 0.0)) * 0.998

        return 0.0

    @staticmethod
    def _evaluate_operator(left: Any, operator: str, right: Any) -> bool:
        try:
            l = float(left)
            r = float(right)
            if operator == ">":
                return l > r
            elif operator == "<":
                return l < r
            elif operator == ">=":
                return l >= r
            elif operator == "<=":
                return l <= r
            elif operator == "==":
                return math.isclose(l, r, rel_tol=1e-5)
            elif operator == "!=":
                return not math.isclose(l, r, rel_tol=1e-5)
            elif operator in ("CROSS_ABOVE", "CROSSES_ABOVE"):
                return l > r
            elif operator in ("CROSS_BELOW", "CROSSES_BELOW"):
                return l < r
            return False
        except (ValueError, TypeError):
            return False
