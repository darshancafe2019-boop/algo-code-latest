"""
Intelligent Options Premium Selection Engine
============================================
Searches, filters, and ranks options contracts and multi-leg combinations
based on:
- Exact target premium or nearest available premium
- Min/Max premium range, Max premium to pay, Min premium to receive
- Total strategy net debit / net credit targets
- Moneyness (ATM, ITM, OTM) & Target Delta (e.g. 0.30 Delta)
- Liquidity metrics (Volume, Open Interest, Bid-Ask spread tolerance)
- Conservative execution pricing (Ask for Buy orders, Bid for Sell orders)
"""

import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from src.market_data.schemas import OptionStrikeRow, OptionQuote
from src.market_data.instrument_master import global_instrument_master


class PremiumMatchResult:
    """Detailed result of a single option contract or multi-leg premium match."""
    def __init__(
        self,
        strike: float,
        option_type: str,
        target_criteria: str,
        matched_premium: float,
        target_value: float,
        difference: float,
        delta: float,
        bid: float,
        ask: float,
        spread: float,
        volume: float,
        oi: float,
        score: float,
        explanation: str,
    ):
        self.strike = strike
        self.option_type = option_type
        self.target_criteria = target_criteria
        self.matched_premium = matched_premium
        self.target_value = target_value
        self.difference = difference
        self.delta = delta
        self.bid = bid
        self.ask = ask
        self.spread = spread
        self.volume = volume
        self.oi = oi
        self.score = score
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strike": self.strike,
            "option_type": self.option_type,
            "target_criteria": self.target_criteria,
            "matched_premium": round(self.matched_premium, 2),
            "target_value": round(self.target_value, 2),
            "difference": round(self.difference, 2),
            "delta": round(self.delta, 4),
            "bid": round(self.bid, 2),
            "ask": round(self.ask, 2),
            "spread": round(self.spread, 2),
            "volume": self.volume,
            "oi": self.oi,
            "score": round(self.score, 2),
            "explanation": self.explanation,
        }


class PremiumSelectionEngine:
    """
    Core Algorithm for strike and contract selection based on quantitative premium criteria.
    """

    @staticmethod
    def match_single_contract(
        strikes: List[OptionStrikeRow],
        option_type: str,  # "CE" or "PE"
        action: str,       # "BUY" or "SELL"
        method: str,       # "EXACT", "NEAREST", "RANGE", "DELTA", "MONEYNESS"
        target_value: float,
        min_range: Optional[float] = None,
        max_range: Optional[float] = None,
        min_volume: float = 0.0,
        min_oi: float = 0.0,
        max_spread_pct: float = 0.15,
    ) -> List[Dict[str, Any]]:
        """
        Ranks candidate strikes against selection criteria.
        Returns sorted list of matches with best match at index 0.
        """
        is_ce = option_type.upper() in ["CE", "CALL", "C"]
        is_buy = action.upper() == "BUY"

        candidates: List[PremiumMatchResult] = []

        for row in strikes:
            quote: OptionQuote = row.ce if is_ce else row.pe

            # Conservative pricing: BUY uses Ask, SELL uses Bid
            exec_price = quote.ask if (is_buy and quote.ask > 0) else (quote.bid if (not is_buy and quote.bid > 0) else quote.lastPrice)
            if exec_price <= 0.01:
                continue

            bid = quote.bid if quote.bid > 0 else exec_price * 0.98
            ask = quote.ask if quote.ask > 0 else exec_price * 1.02
            spread = max(0.01, ask - bid)
            spread_pct = spread / max(0.01, exec_price)

            # Liquidity filters
            if quote.volume < min_volume or quote.OI < min_oi:
                continue
            if spread_pct > max_spread_pct:
                continue

            score = 100.0
            diff = 0.0

            if method.upper() == "EXACT" or method.upper() == "NEAREST":
                diff = abs(exec_price - target_value)
                score -= diff * 2.0

            elif method.upper() == "RANGE":
                min_v = min_range if min_range is not None else 0.0
                max_v = max_range if max_range is not None else float("inf")
                if exec_price < min_v or exec_price > max_v:
                    continue
                # Center of range preferred
                mid_target = (min_v + max_v) / 2.0
                diff = abs(exec_price - mid_target)
                score -= diff

            elif method.upper() == "DELTA":
                target_delta = abs(target_value)
                actual_delta = abs(quote.delta)
                diff = abs(actual_delta - target_delta)
                score -= diff * 300.0

            elif method.upper() == "MONEYNESS":
                diff = abs(row.distance_pct - target_value)
                score -= diff * 10.0

            # Penalize wide spreads and low OI
            score -= (spread_pct * 50.0)
            if quote.OI > 1000:
                score += 5.0
            if quote.volume > 500:
                score += 5.0

            explanation = (
                f"Strike {row.strike} {option_type.upper()} @ {exec_price:.2f} "
                f"({action.upper()} exec via {'Ask' if is_buy else 'Bid'}), "
                f"Delta: {quote.delta:.2f}, Spread: {spread:.2f} ({spread_pct*100:.1f}%), "
                f"OI: {quote.OI:,.0f}"
            )

            candidates.append(PremiumMatchResult(
                strike=row.strike,
                option_type=option_type.upper(),
                target_criteria=method.upper(),
                matched_premium=exec_price,
                target_value=target_value,
                difference=diff,
                delta=quote.delta,
                bid=bid,
                ask=ask,
                spread=spread,
                volume=quote.volume,
                oi=quote.OI,
                score=score,
                explanation=explanation,
            ))

        # Sort highest score first
        candidates.sort(key=lambda x: x.score, reverse=True)
        return [c.to_dict() for c in candidates]

    @staticmethod
    def match_vertical_spread_by_cost(
        strikes: List[OptionStrikeRow],
        strategy_type: str,  # "BULL_CALL", "BEAR_PUT", "BULL_PUT", "BEAR_CALL"
        target_net_cost: float,
        is_credit_target: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Finds a 2-leg spread pairing that closely matches a target debit or credit.
        """
        is_call = "CALL" in strategy_type.upper()
        is_debit = "BULL_CALL" in strategy_type.upper() or "BEAR_PUT" in strategy_type.upper()

        best_combo = None
        min_diff = float("inf")

        for i, long_row in enumerate(strikes):
            for short_row in strikes[i+1:]:
                # Pair lower and higher strike
                l_quote = long_row.ce if is_call else short_row.pe
                s_quote = short_row.ce if is_call else long_row.pe

                l_price = l_quote.ask if l_quote.ask > 0 else l_quote.lastPrice
                s_price = s_quote.bid if s_quote.bid > 0 else s_quote.lastPrice

                if is_debit:
                    net = l_price - s_price
                else:
                    net = s_price - l_price

                if net <= 0:
                    continue

                diff = abs(net - target_net_cost)
                if diff < min_diff:
                    min_diff = diff
                    best_combo = {
                        "strategy": strategy_type,
                        "leg1": {
                            "strike": long_row.strike if is_call else short_row.strike,
                            "action": "BUY" if is_debit else "SELL",
                            "option_type": "CE" if is_call else "PE",
                            "premium": l_price,
                        },
                        "leg2": {
                            "strike": short_row.strike if is_call else long_row.strike,
                            "action": "SELL" if is_debit else "BUY",
                            "option_type": "CE" if is_call else "PE",
                            "premium": s_price,
                        },
                        "target_net": target_net_cost,
                        "achieved_net": round(net, 2),
                        "difference": round(diff, 2),
                        "is_credit": not is_debit,
                    }

        return best_combo


# Singleton
global_premium_engine = PremiumSelectionEngine()
