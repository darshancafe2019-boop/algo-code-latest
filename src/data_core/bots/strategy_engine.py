"""
Quant.OS Bot Strategy Engine
Deterministic strategy evaluator with explicit BUY/SELL direction preservation
and named strategy dispatcher for wizard-created bots with strategy_id only.
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

# Named strategy type → evaluation config map
_NAMED_STRATEGY_CONFIG: Dict[str, Dict[str, Any]] = {
    "EMA_SUPERTREND_CONFLUENCE": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.6, "momentum_weight": 0.4},
    "MOMENTUM_CONFLUENCE": {"ema_fast": 12, "ema_slow": 26, "trend_weight": 0.5, "momentum_weight": 0.5},
    "OPTIONS_TREND": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.7, "momentum_weight": 0.3},
    "BREAKOUT_MOMENTUM": {"ema_fast": 5, "ema_slow": 20, "trend_weight": 0.4, "momentum_weight": 0.6},
    "MEAN_REVERSION": {"ema_fast": 20, "ema_slow": 50, "trend_weight": 0.3, "momentum_weight": 0.7},
    "SCALPING_CONFLUENCE": {"ema_fast": 5, "ema_slow": 13, "trend_weight": 0.5, "momentum_weight": 0.5},
    "NIFTY_MOMENTUM": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.6, "momentum_weight": 0.4},
    "BTC_TREND": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.65, "momentum_weight": 0.35},
    "CRYPTO_BREAKOUT": {"ema_fast": 7, "ema_slow": 25, "trend_weight": 0.45, "momentum_weight": 0.55},
    "DIRECTIONAL_SWING": {"ema_fast": 10, "ema_slow": 30, "trend_weight": 0.55, "momentum_weight": 0.45},
    "IRON_CONDOR": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.5, "momentum_weight": 0.5},
    "BULL_CALL_SPREAD": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.65, "momentum_weight": 0.35},
    "BEAR_PUT_SPREAD": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.65, "momentum_weight": 0.35},
    "STRADDLE": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.5, "momentum_weight": 0.5},
    "STRANGLE": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.5, "momentum_weight": 0.5},
    "CUSTOM_RULES": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.55, "momentum_weight": 0.45},
    "DELTA_NEUTRAL": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.4, "momentum_weight": 0.6},
    "GAMMA_SCALP": {"ema_fast": 5, "ema_slow": 13, "trend_weight": 0.45, "momentum_weight": 0.55},
    "VEGA_TRADE": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.5, "momentum_weight": 0.5},
    "THETA_DECAY": {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.4, "momentum_weight": 0.6},
}
_DEFAULT_NAMED_CONFIG: Dict[str, Any] = {"ema_fast": 9, "ema_slow": 21, "trend_weight": 0.55, "momentum_weight": 0.45}
_STALE_THRESHOLD_MS = 5000.0


class BotStrategyEngine:
    """Deterministic strategy evaluation engine."""

    def __init__(self):
        self._indicator_cache: Dict[str, float] = {}
        self._price_history: Dict[str, List[float]] = {}  # instrument_id -> recent LTPs

    def set_cached_indicator(self, instrument: str, timeframe: str, indicator_name: str, value: float):
        key = f"{instrument.upper()}:{timeframe.lower()}:{indicator_name.upper()}"
        self._indicator_cache[key] = value

    def get_cached_indicator(self, instrument: str, timeframe: str, indicator_name: str) -> Optional[float]:
        key = f"{instrument.upper()}:{timeframe.lower()}:{indicator_name.upper()}"
        return self._indicator_cache.get(key)

    def _update_price_history(self, instrument_id: str, ltp: float) -> List[float]:
        """Maintains a rolling window of recent prices for EMA calculation."""
        hist = self._price_history.setdefault(instrument_id, [])
        hist.append(ltp)
        if len(hist) > 100:
            hist.pop(0)
        return hist

    def _calc_ema(self, prices: List[float], period: int) -> float:
        """Calculates Exponential Moving Average."""
        if not prices or len(prices) < 2:
            return prices[-1] if prices else 0.0
        k = 2.0 / (period + 1)
        ema = prices[0]
        for p in prices[1:]:
            ema = p * k + ema * (1 - k)
        return ema

    def evaluate_named_strategy(
        self,
        bot_id: str,
        strategy_id: str,
        entry_side: str,
        market_data: Dict[str, Any],
        provider: str = "",
        bot_name: str = "",
    ) -> Tuple[ExplainableDecision, Optional[SignalItem]]:
        """
        Evaluates a named strategy (EMA_SUPERTREND_CONFLUENCE, MOMENTUM_CONFLUENCE etc.)
        directly from live tick data when bot.rules is empty. Uses EMA crossover +
        momentum scoring to produce HOLD/BUY/SELL decisions with structured explainability.
        """
        ltp = float(market_data.get("ltp", 0.0))
        instrument_id = str(market_data.get("instrumentId") or "UNKNOWN")
        canonical_id = str(market_data.get("canonicalInstrumentId") or instrument_id)
        side = "SELL" if str(entry_side).upper() == "SELL" else "BUY"
        feed_age_ms = float(market_data.get("feedAgeMs", 0.0))
        cfg = _NAMED_STRATEGY_CONFIG.get(strategy_id.upper(), _DEFAULT_NAMED_CONFIG)

        # Stale data protection
        if feed_age_ms > _STALE_THRESHOLD_MS:
            decision = ExplainableDecision(
                bot_id=bot_id,
                bot_name=bot_name,
                market_snapshot_id=f"snap_{instrument_id}_{int(datetime.now(timezone.utc).timestamp())}",
                risk_gates_passed=False,
                final_decision="NO_TRADE",
                summary=f"Stale data ({feed_age_ms:.0f}ms). Signal evaluation blocked.",
                confidence_score=0.0,
                regime="UNKNOWN",
                provider=provider,
                decision_reason=f"Feed age {feed_age_ms:.0f}ms exceeds {_STALE_THRESHOLD_MS:.0f}ms threshold",
            )
            return decision, None

        # Update price history for EMA computation
        history = self._update_price_history(instrument_id, ltp)

        # EMA crossover
        fast_period = int(cfg["ema_fast"])
        slow_period = int(cfg["ema_slow"])
        ema_fast = self._calc_ema(history, fast_period)
        ema_slow = self._calc_ema(history, slow_period)

        # Momentum: bid/ask pressure
        bid = float(market_data.get("bid", ltp * 0.9995))
        ask = float(market_data.get("ask", ltp * 1.0005))
        spread = max(ask - bid, 0.0001)

        trend_bullish = ema_fast > ema_slow and ltp >= ema_fast * 0.998
        trend_bearish = ema_fast < ema_slow and ltp <= ema_fast * 1.002
        momentum_bullish = (ltp - bid) < spread * 0.4
        momentum_bearish = (ask - ltp) < spread * 0.4

        trend_weight = float(cfg["trend_weight"])
        mom_weight = float(cfg["momentum_weight"])

        bull_score = (trend_weight if trend_bullish else 0.0) + (mom_weight if momentum_bullish else 0.0)
        bear_score = (trend_weight if trend_bearish else 0.0) + (mom_weight if momentum_bearish else 0.0)

        # Dampen signals when history is too short for reliable EMA
        if len(history) < 3:
            bull_score *= 0.3
            bear_score *= 0.3

        # Regime detection
        ema_gap_pct = abs(ema_fast - ema_slow) / max(abs(ema_slow), 1.0) * 100.0
        if ema_gap_pct > 1.0:
            regime = "TRENDING"
        elif ema_gap_pct > 0.3:
            regime = "RANGING"
        else:
            regime = "FLAT"

        THRESHOLD = 0.55
        rules_evaluated = [
            ExplainableDecisionRule(
                rule_id="EMA_CROSSOVER",
                description=f"EMA{fast_period} ({ema_fast:.4f}) vs EMA{slow_period} ({ema_slow:.4f})",
                input_value=round(ema_fast, 4),
                expected_value=f"> EMA{slow_period}" if side == "BUY" else f"< EMA{slow_period}",
                passed=trend_bullish if side == "BUY" else trend_bearish,
            ),
            ExplainableDecisionRule(
                rule_id="LTP_VS_EMA_FAST",
                description=f"LTP ({ltp:.4f}) vs EMA{fast_period} ({ema_fast:.4f})",
                input_value=round(ltp, 4),
                expected_value=f">= {ema_fast * 0.998:.4f}" if side == "BUY" else f"<= {ema_fast * 1.002:.4f}",
                passed=trend_bullish if side == "BUY" else trend_bearish,
            ),
            ExplainableDecisionRule(
                rule_id="MOMENTUM_PRESSURE",
                description=f"Bid/Ask momentum (spread={spread:.4f})",
                input_value=round(bid if side == "BUY" else ask, 4),
                expected_value="bid-side pressure" if side == "BUY" else "ask-side pressure",
                passed=momentum_bullish if side == "BUY" else momentum_bearish,
            ),
        ]

        if side == "BUY":
            final_score = bull_score
            is_signal = bull_score >= THRESHOLD and trend_bullish
            final_decision = "BUY" if is_signal else "NO_TRADE"
            confidence = round(bull_score * 100, 1)
            reason = f"Bull: EMA cross={'✓' if trend_bullish else '✗'}, momentum={'✓' if momentum_bullish else '✗'}"
        else:
            final_score = bear_score
            is_signal = bear_score >= THRESHOLD and trend_bearish
            final_decision = "SELL" if is_signal else "NO_TRADE"
            confidence = round(bear_score * 100, 1)
            reason = f"Bear: EMA cross={'✓' if trend_bearish else '✗'}, momentum={'✓' if momentum_bearish else '✗'}"

        summary = f"{strategy_id}: {reason} ({confidence:.0f}% confluence, regime={regime})"

        decision = ExplainableDecision(
            bot_id=bot_id,
            bot_name=bot_name,
            market_snapshot_id=f"snap_{instrument_id}_{int(datetime.now(timezone.utc).timestamp())}",
            rules_evaluated=rules_evaluated,
            risk_gates_passed=True,
            final_decision=final_decision,
            summary=summary,
            confidence_score=confidence,
            regime=regime,
            provider=provider,
            decision_reason=reason,
        )

        signal: Optional[SignalItem] = None
        if is_signal:
            signal = SignalItem(
                bot_id=bot_id,
                instrument_id=instrument_id,
                canonical_instrument_id=canonical_id,
                side=side,
                state=SignalLifecycleState.CONFIRMED,
                confidence=final_score,
                market_snapshot_id=decision.market_snapshot_id,
                conditions_passed=[r.description for r in rules_evaluated if r.passed],
                conditions_failed=[r.description for r in rules_evaluated if not r.passed],
            )

        return decision, signal

    def evaluate_rules(
        self,
        bot_id: str,
        rules: List[StrategyRuleNode],
        market_data: Dict[str, Any],
        order_flow: Optional[Dict[str, Any]] = None,
        positions_count: int = 0,
        max_positions: int = 1,
        entry_side: str = "BUY",
        strategy_id: str = "",
        provider: str = "",
        bot_name: str = "",
    ) -> Tuple[ExplainableDecision, Optional[SignalItem]]:
        """
        Evaluates strategy rules against market data.
        When rules=[] and strategy_id is a known named strategy, delegates to
        evaluate_named_strategy() for EMA/momentum-based evaluation.
        """
        instrument_id = str(market_data.get("instrumentId") or "UNKNOWN")
        canonical_id = str(market_data.get("canonicalInstrumentId") or instrument_id)
        side = "SELL" if str(entry_side).upper() == "SELL" else "BUY"
        feed_age_ms = float(market_data.get("feedAgeMs", 0.0))

        # Stale data protection
        if feed_age_ms > _STALE_THRESHOLD_MS:
            decision = ExplainableDecision(
                bot_id=bot_id,
                bot_name=bot_name,
                final_decision="NO_TRADE",
                summary=f"Stale data ({feed_age_ms:.0f}ms > {_STALE_THRESHOLD_MS:.0f}ms). Entry blocked.",
                confidence_score=0.0,
                provider=provider,
                decision_reason=f"Feed too stale ({feed_age_ms:.0f}ms)",
            )
            return decision, None

        # Delegate to named strategy evaluator when no explicit rule nodes configured
        if not rules and strategy_id:
            return self.evaluate_named_strategy(
                bot_id=bot_id,
                strategy_id=strategy_id,
                entry_side=entry_side,
                market_data=market_data,
                provider=provider,
                bot_name=bot_name,
            )

        # Safety: never trade an undefined strategy.
        if not rules:
            decision = ExplainableDecision(
                bot_id=bot_id,
                bot_name=bot_name,
                market_snapshot_id=f"snap_{instrument_id}_{int(datetime.now(timezone.utc).timestamp())}",
                rules_evaluated=[],
                risk_gates_passed=False,
                final_decision="NO_TRADE",
                summary="No executable strategy rules configured",
                provider=provider,
            )
            return decision, None

        all_passed = True
        decision_rules: List[ExplainableDecisionRule] = []
        for rule in rules:
            left_val = self._resolve_operand(rule.left_operand, rule.timeframe, market_data, order_flow)
            right_val = rule.right_value
            if rule.right_type in ("INDICATOR", "PRICE") and rule.right_operand:
                right_val = self._resolve_operand(rule.right_operand, rule.timeframe, market_data, order_flow)
            if right_val is None:
                right_val = 0.0

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

        if positions_count >= max_positions:
            all_passed = False
            decision_rules.append(ExplainableDecisionRule(
                rule_id="MAX_POSITIONS_LIMIT",
                description=f"Active positions ({positions_count}) reached maximum limit ({max_positions})",
                input_value=positions_count,
                expected_value=f"< {max_positions}",
                passed=False,
            ))

        final_decision = side if all_passed else "NO_TRADE"
        passed_count = sum(1 for r in decision_rules if r.passed)
        total_count = max(len(decision_rules), 1)
        confidence = round(passed_count / total_count * 100, 1)
        summary = f"All strategy criteria satisfied for {side}" if all_passed else "Strategy entry conditions not satisfied"
        reason = f"{passed_count}/{total_count} rules passed"

        decision = ExplainableDecision(
            bot_id=bot_id,
            bot_name=bot_name,
            market_snapshot_id=f"snap_{instrument_id}_{int(datetime.now(timezone.utc).timestamp())}",
            rules_evaluated=decision_rules,
            risk_gates_passed=True,
            final_decision=final_decision,
            summary=summary,
            confidence_score=confidence,
            provider=provider,
            decision_reason=reason,
        )

        signal: Optional[SignalItem] = None
        if all_passed:
            signal = SignalItem(
                bot_id=bot_id,
                instrument_id=instrument_id,
                canonical_instrument_id=canonical_id,
                side=side,
                state=SignalLifecycleState.CONFIRMED,
                confidence=confidence / 100.0,
                market_snapshot_id=decision.market_snapshot_id,
                conditions_passed=[r.description for r in decision_rules if r.passed],
                conditions_failed=[r.description for r in decision_rules if not r.passed],
            )
        return decision, signal

    def _resolve_operand(self, operand: str, timeframe: str, market_data: Dict[str, Any], order_flow: Optional[Dict[str, Any]]) -> float:
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
        if order_flow:
            if op in ("SPREAD", "SPREAD_BPS"):
                return float(order_flow.get("spreadBps", 0.0))
            if op in ("IMBALANCE", "DEPTH_IMBALANCE"):
                return float(order_flow.get("depthImbalancePct", 0.0))
            if op in ("CUMULATIVE_BID", "BID_DEPTH"):
                return float(order_flow.get("cumulativeBidDepth", 0.0))
            if op in ("CUMULATIVE_ASK", "ASK_DEPTH"):
                return float(order_flow.get("cumulativeAskDepth", 0.0))
        inst = str(market_data.get("instrumentId", ""))
        cached = self.get_cached_indicator(inst, timeframe, operand)
        if cached is not None:
            return cached
        # Compatibility fallback until the indicator pipeline populates the cache.
        if "EMA" in op or "SMA" in op:
            return float(market_data.get("ltp", 0.0)) * 0.998
        return 0.0

    @staticmethod
    def _evaluate_operator(left: Any, operator: str, right: Any) -> bool:
        try:
            l = float(left)
            r = float(right)
            if operator == ">": return l > r
            if operator == "<": return l < r
            if operator == ">=": return l >= r
            if operator == "<=": return l <= r
            if operator == "==": return math.isclose(l, r, rel_tol=1e-5)
            if operator == "!=": return not math.isclose(l, r, rel_tol=1e-5)
            if operator in ("CROSS_ABOVE", "CROSSES_ABOVE"): return l > r
            if operator in ("CROSS_BELOW", "CROSSES_BELOW"): return l < r
            return False
        except (ValueError, TypeError):
            return False
