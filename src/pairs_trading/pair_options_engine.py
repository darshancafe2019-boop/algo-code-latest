"""
Pairs Trading with Options Engine
=================================
Analytical modeling and strategy construction for option applications in pairs trading
from 'The Handbook of Pairs Trading Strategies':

1. Option Overlays:
   - Protective Put on Long Pair Leg (Full / Partial / Delta-Adjusted Hedge)
   - Protective Call on Short Pair Leg (Upside Squeeze Guard)
2. Option Substitutions:
   - Deep-ITM Long Call as Long-Equity/Future Proxy (Delta >= 0.80)
   - Deep-ITM Long Put as Short-Equity/Future Proxy (Delta <= -0.80)
   - Delta-Adjusted Contract Sizing
3. Vertical Spread Substitutions:
   - Bull Call Spread for Long Leg
   - Bear Put Spread for Short Leg
4. Backspread Substitutions:
   - Ratio Call Backspread (1 Short ATM + 2 Long OTM Calls)
   - Ratio Put Backspread (1 Short ATM + 2 Long OTM Puts)
5. Comparative Analytics Matrix (Direct Underlying vs Option Structures):
   - Capital Savings, Aggregate Greeks, Theta Decay Burn, Max Loss/Profit, Assignment Risk.
"""

import math
import logging
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import numpy as np

from src.option_chain_engine import OptionGreeksCalculator
from src.pairs_trading.pairs_statistical_engine import PairCandidate, PairAnalysisResult, PairEntryDirection

logger = logging.getLogger("PairOptionsEngine")


class OptionOverlayType(str, Enum):
    PROTECTIVE_PUT_LONG_LEG = "PROTECTIVE_PUT_LONG_LEG"
    PROTECTIVE_CALL_SHORT_LEG = "PROTECTIVE_CALL_SHORT_LEG"
    DUAL_COLLAR_OVERLAY = "DUAL_COLLAR_OVERLAY"
    DELTA_ADJUSTED_DYNAMIC_HEDGE = "DELTA_ADJUSTED_DYNAMIC_HEDGE"
    EVENT_VOLATILITY_GUARD = "EVENT_VOLATILITY_GUARD"


class OptionSubstitutionType(str, Enum):
    DEEP_ITM_CALL_PROXY = "DEEP_ITM_CALL_PROXY"
    DEEP_ITM_PUT_PROXY = "DEEP_ITM_PUT_PROXY"
    BULL_CALL_SPREAD_PROXY = "BULL_CALL_SPREAD_PROXY"
    BEAR_PUT_SPREAD_PROXY = "BEAR_PUT_SPREAD_PROXY"
    CALL_BACKSPREAD_PROXY = "CALL_BACKSPREAD_PROXY"
    PUT_BACKSPREAD_PROXY = "PUT_BACKSPREAD_PROXY"
    DUAL_SPREAD_PROXIES = "DUAL_SPREAD_PROXIES"
    DIRECT_UNDERLYING_BASELINE = "DIRECT_UNDERLYING_BASELINE"


@dataclass
class PairOptionLegDetail:
    """Detailed option leg in a pair strategy structure."""
    leg_id: str
    target_pair_leg: str  # "LEG_A" or "LEG_B"
    instrument_symbol: str
    underlying_symbol: str
    action: str  # "BUY" or "SELL"
    option_type: str  # "CE", "PE", or "STOCK"
    strike: float
    expiry: str
    premium: float
    quantity: float
    multiplier: float = 1.0
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    iv: float = 0.25

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PairOptionStructureResult:
    """Comprehensive comparative evaluation of an option-enhanced pair strategy."""
    structure_id: str
    structure_type: str
    pair_id: str
    symbol_a: str
    symbol_b: str
    direction: str
    legs: List[Dict[str, Any]] = field(default_factory=list)
    capital_required_direct: float = 0.0
    capital_required_options: float = 0.0
    capital_savings_pct: float = 0.0
    max_profit: Union[float, str] = "UNLIMITED"
    max_loss: Union[float, str] = "UNDEFINED"
    risk_profile: str = "DEFINED_RISK"
    net_delta: float = 0.0
    net_gamma: float = 0.0
    net_theta_daily: float = 0.0
    net_vega: float = 0.0
    assignment_risk: str = "LOW"
    settlement_type: str = "CASH"
    scenario_table: List[Dict[str, Any]] = field(default_factory=list)
    recommendation_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PairOptionsEngine:
    """Quantitative evaluation and synthesis of options overlay and proxy pairs structures."""

    @classmethod
    def build_option_overlay(
        cls,
        candidate: PairCandidate,
        analysis: PairAnalysisResult,
        sizing: Dict[str, Any],
        overlay_type: OptionOverlayType = OptionOverlayType.PROTECTIVE_PUT_LONG_LEG,
        otm_pct: float = 0.03,
        dte_days: int = 30,
        iv_a: float = 0.25,
        iv_b: float = 0.25,
    ) -> PairOptionStructureResult:
        """
        Synthesizes protective option overlays on underlying pair legs to eliminate
        tail divergence / black-swan gap risk.
        """
        p_a = analysis.last_price_a
        p_b = analysis.last_price_b
        qty_a = sizing.get("quantity_a", 100.0)
        qty_b = sizing.get("quantity_b", 100.0)
        mult_a = candidate.multiplier_a
        mult_b = candidate.multiplier_b
        direct_cap = sizing.get("gross_exposure", 10000.0)

        t_years = max(1 / 365.0, dte_days / 365.0)
        legs: List[PairOptionLegDetail] = []
        notes: List[str] = []

        # Determine which leg is long and which is short based on direction
        is_long_a = analysis.suggested_direction == PairEntryDirection.LONG_A_SHORT_B.value

        # 1. Base underlying positions
        legs.append(PairOptionLegDetail(
            leg_id="base-leg-a",
            target_pair_leg="LEG_A",
            instrument_symbol=candidate.symbol_a,
            underlying_symbol=candidate.symbol_a,
            action="BUY" if is_long_a else "SELL",
            option_type="STOCK",
            strike=p_a,
            expiry="SPOT",
            premium=p_a,
            quantity=qty_a,
            multiplier=mult_a,
            delta=1.0 if is_long_a else -1.0,
            iv=0.0
        ))

        legs.append(PairOptionLegDetail(
            leg_id="base-leg-b",
            target_pair_leg="LEG_B",
            instrument_symbol=candidate.symbol_b,
            underlying_symbol=candidate.symbol_b,
            action="SELL" if is_long_a else "BUY",
            option_type="STOCK",
            strike=p_b,
            expiry="SPOT",
            premium=p_b,
            quantity=qty_b,
            multiplier=mult_b,
            delta=-1.0 if is_long_a else 1.0,
            iv=0.0
        ))

        overlay_cost = 0.0

        if overlay_type in [OptionOverlayType.PROTECTIVE_PUT_LONG_LEG, OptionOverlayType.DUAL_COLLAR_OVERLAY]:
            # Protect long leg
            long_sym = candidate.symbol_a if is_long_a else candidate.symbol_b
            long_price = p_a if is_long_a else p_b
            long_qty = qty_a if is_long_a else qty_b
            long_mult = mult_a if is_long_a else mult_b
            long_iv = iv_a if is_long_a else iv_b

            put_strike = round(long_price * (1.0 - otm_pct), 2)
            greeks = OptionGreeksCalculator.calculate_greeks("PE", long_price, put_strike, t_years, iv=long_iv)
            put_prem = max(0.5, greeks["theoretical_price"])
            put_contracts = max(1.0, math.ceil(long_qty / max(1.0, candidate.lot_size_a if is_long_a else candidate.lot_size_b)))

            legs.append(PairOptionLegDetail(
                leg_id="overlay-prot-put",
                target_pair_leg="LEG_A" if is_long_a else "LEG_B",
                instrument_symbol=f"{long_sym}-{put_strike}-PE",
                underlying_symbol=long_sym,
                action="BUY",
                option_type="PE",
                strike=put_strike,
                expiry=f"{dte_days}D",
                premium=put_prem,
                quantity=put_contracts * (candidate.lot_size_a if is_long_a else candidate.lot_size_b),
                multiplier=long_mult,
                delta=greeks["delta"],
                gamma=greeks["gamma"],
                theta=greeks["theta"],
                vega=greeks["vega"],
                iv=long_iv
            ))
            overlay_cost += put_prem * put_contracts * (candidate.lot_size_a if is_long_a else candidate.lot_size_b) * long_mult
            notes.append(f"Protective Put @ {put_strike} caps maximum downside loss on long {long_sym} leg.")

        if overlay_type in [OptionOverlayType.PROTECTIVE_CALL_SHORT_LEG, OptionOverlayType.DUAL_COLLAR_OVERLAY]:
            # Protect short leg against infinite upside breakout / squeeze
            short_sym = candidate.symbol_b if is_long_a else candidate.symbol_a
            short_price = p_b if is_long_a else p_a
            short_qty = qty_b if is_long_a else qty_a
            short_mult = mult_b if is_long_a else mult_a
            short_iv = iv_b if is_long_a else iv_a

            call_strike = round(short_price * (1.0 + otm_pct), 2)
            greeks = OptionGreeksCalculator.calculate_greeks("CE", short_price, call_strike, t_years, iv=short_iv)
            call_prem = max(0.5, greeks["theoretical_price"])
            call_contracts = max(1.0, math.ceil(short_qty / max(1.0, candidate.lot_size_b if is_long_a else candidate.lot_size_a)))

            legs.append(PairOptionLegDetail(
                leg_id="overlay-prot-call",
                target_pair_leg="LEG_B" if is_long_a else "LEG_A",
                instrument_symbol=f"{short_sym}-{call_strike}-CE",
                underlying_symbol=short_sym,
                action="BUY",
                option_type="CE",
                strike=call_strike,
                expiry=f"{dte_days}D",
                premium=call_prem,
                quantity=call_contracts * (candidate.lot_size_b if is_long_a else candidate.lot_size_a),
                multiplier=short_mult,
                delta=greeks["delta"],
                gamma=greeks["gamma"],
                theta=greeks["theta"],
                vega=greeks["vega"],
                iv=short_iv
            ))
            overlay_cost += call_prem * call_contracts * (candidate.lot_size_b if is_long_a else candidate.lot_size_a) * short_mult
            notes.append(f"Protective Call @ {call_strike} eliminates unlimited short squeeze risk on {short_sym}.")

        # Aggregate strategy Greeks
        net_delta = sum(l.delta * (l.quantity / max(1.0, qty_a)) * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_gamma = sum(l.gamma * (l.quantity / max(1.0, qty_a)) * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_theta = sum(l.theta * l.quantity * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_vega = sum(l.vega * l.quantity * (1.0 if l.action == "BUY" else -1.0) for l in legs)

        # Build Scenario Table for Divergence Simulation
        scenarios = cls._generate_scenario_table(analysis, legs, qty_a, qty_b, p_a, p_b)

        return PairOptionStructureResult(
            structure_id=f"overlay-{candidate.pair_id}-{overlay_type.value.lower()}",
            structure_type=overlay_type.value,
            pair_id=candidate.pair_id,
            symbol_a=candidate.symbol_a,
            symbol_b=candidate.symbol_b,
            direction=analysis.suggested_direction,
            legs=[l.to_dict() for l in legs],
            capital_required_direct=round(direct_cap, 2),
            capital_required_options=round(direct_cap + overlay_cost, 2),
            capital_savings_pct=round(-1.0 * (overlay_cost / max(1.0, direct_cap)) * 100.0, 1),
            max_profit="UNLIMITED",
            max_loss=round(overlay_cost + (direct_cap * otm_pct), 2),
            risk_profile="DEFINED_RISK",
            net_delta=round(net_delta, 4),
            net_gamma=round(net_gamma, 6),
            net_theta_daily=round(net_theta, 2),
            net_vega=round(net_vega, 2),
            assignment_risk="LOW",
            settlement_type="CASH" if candidate.market == "Crypto" else "PHYSICAL",
            scenario_table=scenarios,
            recommendation_notes=notes,
        )

    @classmethod
    def build_option_substitution(
        cls,
        candidate: PairCandidate,
        analysis: PairAnalysisResult,
        sizing: Dict[str, Any],
        substitution_type: OptionSubstitutionType = OptionSubstitutionType.DEEP_ITM_CALL_PROXY,
        dte_days: int = 45,
        iv_a: float = 0.25,
        iv_b: float = 0.25,
    ) -> PairOptionStructureResult:
        """
        Synthesizes complete option substitution proxies (Deep-ITM Calls/Puts, Vertical Spreads,
        Backspreads) replacing high-capital / short-restricted cash underlying legs.
        """
        p_a = analysis.last_price_a
        p_b = analysis.last_price_b
        qty_a = sizing.get("quantity_a", 100.0)
        qty_b = sizing.get("quantity_b", 100.0)
        mult_a = candidate.multiplier_a
        mult_b = candidate.multiplier_b
        direct_cap = sizing.get("gross_exposure", 10000.0)

        t_years = max(1 / 365.0, dte_days / 365.0)
        legs: List[PairOptionLegDetail] = []
        notes: List[str] = []
        total_options_capital = 0.0

        is_long_a = analysis.suggested_direction == PairEntryDirection.LONG_A_SHORT_B.value

        if substitution_type in [OptionSubstitutionType.DEEP_ITM_CALL_PROXY, OptionSubstitutionType.DUAL_SPREAD_PROXIES]:
            # Replace Long Leg with Deep ITM Call (Delta ~ 0.85)
            long_sym = candidate.symbol_a if is_long_a else candidate.symbol_b
            long_price = p_a if is_long_a else p_b
            long_qty = qty_a if is_long_a else qty_b
            long_mult = mult_a if is_long_a else mult_b
            long_iv = iv_a if is_long_a else iv_b

            call_strike = round(long_price * 0.90, 2)  # 10% ITM
            greeks = OptionGreeksCalculator.calculate_greeks("CE", long_price, call_strike, t_years, iv=long_iv)
            prem = max(long_price * 0.11, greeks["theoretical_price"])
            delta_adj_qty = round(long_qty / max(0.1, abs(greeks["delta"])))
            contracts = max(1.0, math.ceil(delta_adj_qty / max(1.0, candidate.lot_size_a if is_long_a else candidate.lot_size_b)))

            legs.append(PairOptionLegDetail(
                leg_id="proxy-long-call",
                target_pair_leg="LEG_A" if is_long_a else "LEG_B",
                instrument_symbol=f"{long_sym}-{call_strike}-CE",
                underlying_symbol=long_sym,
                action="BUY",
                option_type="CE",
                strike=call_strike,
                expiry=f"{dte_days}D",
                premium=prem,
                quantity=contracts * (candidate.lot_size_a if is_long_a else candidate.lot_size_b),
                multiplier=long_mult,
                delta=greeks["delta"],
                gamma=greeks["gamma"],
                theta=greeks["theta"],
                vega=greeks["vega"],
                iv=long_iv
            ))
            total_options_capital += prem * contracts * (candidate.lot_size_a if is_long_a else candidate.lot_size_b) * long_mult
            notes.append(f"Deep ITM Call @ {call_strike} (Delta={greeks['delta']}) replaces Long {long_sym} with {round((1 - prem/long_price)*100, 1)}% capital reduction.")

        if substitution_type in [OptionSubstitutionType.DEEP_ITM_PUT_PROXY, OptionSubstitutionType.DUAL_SPREAD_PROXIES]:
            # Replace Short Leg with Deep ITM Put (Delta ~ -0.85)
            short_sym = candidate.symbol_b if is_long_a else candidate.symbol_a
            short_price = p_b if is_long_a else p_a
            short_qty = qty_b if is_long_a else qty_a
            short_mult = mult_b if is_long_a else mult_a
            short_iv = iv_b if is_long_a else iv_a

            put_strike = round(short_price * 1.10, 2)  # 10% ITM Put
            greeks = OptionGreeksCalculator.calculate_greeks("PE", short_price, put_strike, t_years, iv=short_iv)
            prem = max(short_price * 0.11, greeks["theoretical_price"])
            delta_adj_qty = round(short_qty / max(0.1, abs(greeks["delta"])))
            contracts = max(1.0, math.ceil(delta_adj_qty / max(1.0, candidate.lot_size_b if is_long_a else candidate.lot_size_a)))

            legs.append(PairOptionLegDetail(
                leg_id="proxy-short-put",
                target_pair_leg="LEG_B" if is_long_a else "LEG_A",
                instrument_symbol=f"{short_sym}-{put_strike}-PE",
                underlying_symbol=short_sym,
                action="BUY",
                option_type="PE",
                strike=put_strike,
                expiry=f"{dte_days}D",
                premium=prem,
                quantity=contracts * (candidate.lot_size_b if is_long_a else candidate.lot_size_a),
                multiplier=short_mult,
                delta=greeks["delta"],
                gamma=greeks["gamma"],
                theta=greeks["theta"],
                vega=greeks["vega"],
                iv=short_iv
            ))
            total_options_capital += prem * contracts * (candidate.lot_size_b if is_long_a else candidate.lot_size_a) * short_mult
            notes.append(f"Deep ITM Put @ {put_strike} (Delta={greeks['delta']}) replaces Short {short_sym}, avoiding borrow fees & short selling restrictions.")

        if substitution_type == OptionSubstitutionType.BULL_CALL_SPREAD_PROXY:
            # Bull Call Spread (Buy lower call, sell higher call)
            long_sym = candidate.symbol_a if is_long_a else candidate.symbol_b
            p = p_a if is_long_a else p_b
            k1 = round(p * 0.98, 2)
            k2 = round(p * 1.04, 2)
            g1 = OptionGreeksCalculator.calculate_greeks("CE", p, k1, t_years, iv=iv_a)
            g2 = OptionGreeksCalculator.calculate_greeks("CE", p, k2, t_years, iv=iv_a)
            net_prem = max(1.0, g1["theoretical_price"] - g2["theoretical_price"])
            contracts = max(1.0, math.ceil(qty_a / max(1.0, candidate.lot_size_a)))

            legs.append(PairOptionLegDetail("bcs-buy", "LEG_A", f"{long_sym}-{k1}-CE", long_sym, "BUY", "CE", k1, f"{dte_days}D", g1["theoretical_price"], contracts * candidate.lot_size_a, mult_a, g1["delta"], g1["gamma"], g1["theta"], g1["vega"], iv_a))
            legs.append(PairOptionLegDetail("bcs-sell", "LEG_A", f"{long_sym}-{k2}-CE", long_sym, "SELL", "CE", k2, f"{dte_days}D", g2["theoretical_price"], contracts * candidate.lot_size_a, mult_a, g2["delta"], g2["gamma"], g2["theta"], g2["vega"], iv_a))
            total_options_capital += net_prem * contracts * candidate.lot_size_a * mult_a
            notes.append(f"Bull Call Spread ({k1}/{k2}) eliminates theta decay drag while capturing pair convergence.")

        capital_savings_pct = round(((direct_cap - total_options_capital) / max(1.0, direct_cap)) * 100.0, 1)

        net_delta = sum(l.delta * (l.quantity / max(1.0, qty_a)) * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_gamma = sum(l.gamma * (l.quantity / max(1.0, qty_a)) * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_theta = sum(l.theta * l.quantity * (1.0 if l.action == "BUY" else -1.0) for l in legs)
        net_vega = sum(l.vega * l.quantity * (1.0 if l.action == "BUY" else -1.0) for l in legs)

        scenarios = cls._generate_scenario_table(analysis, legs, qty_a, qty_b, p_a, p_b)

        return PairOptionStructureResult(
            structure_id=f"proxy-{candidate.pair_id}-{substitution_type.value.lower()}",
            structure_type=substitution_type.value,
            pair_id=candidate.pair_id,
            symbol_a=candidate.symbol_a,
            symbol_b=candidate.symbol_b,
            direction=analysis.suggested_direction,
            legs=[l.to_dict() for l in legs],
            capital_required_direct=round(direct_cap, 2),
            capital_required_options=round(total_options_capital, 2),
            capital_savings_pct=capital_savings_pct,
            max_profit="UNLIMITED" if substitution_type in [OptionSubstitutionType.DEEP_ITM_CALL_PROXY, OptionSubstitutionType.DUAL_SPREAD_PROXIES] else round(total_options_capital * 1.5, 2),
            max_loss=round(total_options_capital, 2),
            risk_profile="DEFINED_RISK",
            net_delta=round(net_delta, 4),
            net_gamma=round(net_gamma, 6),
            net_theta_daily=round(net_theta, 2),
            net_vega=round(net_vega, 2),
            assignment_risk="LOW",
            settlement_type="CASH" if candidate.market == "Crypto" else "PHYSICAL",
            scenario_table=scenarios,
            recommendation_notes=notes,
        )

    @staticmethod
    def _generate_scenario_table(
        analysis: PairAnalysisResult,
        legs: List[PairOptionLegDetail],
        qty_a: float,
        qty_b: float,
        p_a: float,
        p_b: float,
    ) -> List[Dict[str, Any]]:
        """Generates profit/loss simulation grid across pair convergence and divergence scenarios."""
        scenarios = []
        shifts = [-0.10, -0.05, -0.02, 0.0, 0.02, 0.05, 0.10]

        for s in shifts:
            sim_p_a = p_a * (1.0 + s)
            sim_p_b = p_b * (1.0 - s * analysis.hedge_ratio)  # Divergent pair move

            # Direct P&L
            is_long_a = analysis.suggested_direction == PairEntryDirection.LONG_A_SHORT_B.value
            pnl_a_direct = (sim_p_a - p_a) * qty_a * (1.0 if is_long_a else -1.0)
            pnl_b_direct = (sim_p_b - p_b) * qty_b * (-1.0 if is_long_a else 1.0)
            pnl_direct_total = pnl_a_direct + pnl_b_direct

            # Option Structure P&L approximation
            pnl_opt_total = 0.0
            for l in legs:
                if l.option_type == "STOCK":
                    underlying_p = sim_p_a if l.target_pair_leg == "LEG_A" else sim_p_b
                    base_p = p_a if l.target_pair_leg == "LEG_A" else p_b
                    pnl_opt_total += (underlying_p - base_p) * l.quantity * (1.0 if l.action == "BUY" else -1.0) * l.multiplier
                elif l.option_type == "CE":
                    underlying_p = sim_p_a if l.target_pair_leg == "LEG_A" else sim_p_b
                    intrinsic = max(0.0, underlying_p - l.strike)
                    payoff = intrinsic - l.premium
                    pnl_opt_total += payoff * l.quantity * (1.0 if l.action == "BUY" else -1.0) * l.multiplier
                elif l.option_type == "PE":
                    underlying_p = sim_p_a if l.target_pair_leg == "LEG_A" else sim_p_b
                    intrinsic = max(0.0, l.strike - underlying_p)
                    payoff = intrinsic - l.premium
                    pnl_opt_total += payoff * l.quantity * (1.0 if l.action == "BUY" else -1.0) * l.multiplier

            scenarios.append({
                "underlying_shift_pct": round(s * 100, 1),
                "simulated_price_a": round(sim_p_a, 2),
                "simulated_price_b": round(sim_p_b, 2),
                "pnl_direct_underlying": round(pnl_direct_total, 2),
                "pnl_option_structure": round(pnl_opt_total, 2),
                "relative_benefit": round(pnl_opt_total - pnl_direct_total, 2),
            })

        return scenarios
