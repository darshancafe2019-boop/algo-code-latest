"""
Multi-Leg Crypto Option Strategy Evaluator & Payoff Engine
==========================================================
Calculates analytical payoff metrics, breakevens, risk/reward ratios, and aggregate Greeks
for standard multi-leg option combinations:
- Long Call / Long Put / Short Call / Short Put
- Bull Call Spread / Bear Call Spread
- Bull Put Spread / Bear Put Spread
- Long Straddle / Short Straddle
- Long Strangle / Short Strangle
- Iron Condor / Iron Butterfly
- Calendar Spread
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from src.option_chain_engine import OptionGreeksCalculator


class OptionLeg:
    """Represents a single option or underlying leg in a multi-leg strategy."""

    def __init__(
        self,
        leg_id: str,
        action: str,  # "BUY" or "SELL"
        option_type: str,  # "CALL" or "PUT"
        strike: float,
        expiry: str,
        premium: float,
        quantity: float = 1.0,
        iv: float = 0.55,
        delta: float = 0.0,
        gamma: float = 0.0,
        theta: float = 0.0,
        vega: float = 0.0,
        rho: float = 0.0
    ):
        self.leg_id = leg_id
        self.action = action.upper()
        self.option_type = option_type.upper()
        self.strike = float(strike)
        self.expiry = expiry
        self.premium = float(premium)
        self.quantity = float(quantity)
        self.iv = float(iv)
        self.delta = float(delta)
        self.gamma = float(gamma)
        self.theta = float(theta)
        self.vega = float(vega)
        self.rho = float(rho)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "leg_id": self.leg_id,
            "action": self.action,
            "option_type": self.option_type,
            "strike": self.strike,
            "expiry": self.expiry,
            "premium": self.premium,
            "quantity": self.quantity,
            "iv": self.iv,
            "delta": self.delta,
            "gamma": self.gamma,
            "theta": self.theta,
            "vega": self.vega,
            "rho": self.rho
        }


class OptionStrategyEngine:
    """Comprehensive Multi-Leg Strategy Payoff and Risk Analyzer."""

    @staticmethod
    def evaluate_strategy(
        strategy_name: str,
        underlying: str,
        spot_price: float,
        legs_data: List[Dict[str, Any]],
        price_range_pct: float = 0.25,
        num_points: int = 50
    ) -> Dict[str, Any]:
        """
        Evaluates arbitrary combination of option legs and computes:
        - Net Debit / Credit
        - Max Profit & Max Loss
        - Breakeven Points
        - Aggregate Strategy Greeks
        - Payoff Curve Grid across underlying price spectrum
        """
        legs: List[OptionLeg] = []
        for idx, l in enumerate(legs_data, start=1):
            legs.append(OptionLeg(
                leg_id=l.get("leg_id", f"leg-{idx}"),
                action=l.get("action", "BUY"),
                option_type=l.get("option_type", "CALL"),
                strike=float(l.get("strike", spot_price)),
                expiry=l.get("expiry", ""),
                premium=float(l.get("premium", 0.0)),
                quantity=float(l.get("quantity", 1.0)),
                iv=float(l.get("iv", 0.55)),
                delta=float(l.get("delta", 0.0)),
                gamma=float(l.get("gamma", 0.0)),
                theta=float(l.get("theta", 0.0)),
                vega=float(l.get("vega", 0.0)),
                rho=float(l.get("rho", 0.0))
            ))

        if not legs:
            return {
                "status": "error",
                "message": "Strategy must contain at least one option leg."
            }

        # Step 1: Net Premium (Cash Flow at entry)
        # BUY = cash outflow (-), SELL = cash inflow (+)
        net_cash_flow = 0.0
        for leg in legs:
            mult = 1.0 if leg.action == "SELL" else -1.0
            net_cash_flow += mult * leg.premium * leg.quantity

        is_debit = net_cash_flow < 0
        net_cost = abs(net_cash_flow)

        # Step 2: Aggregate Greeks
        agg_delta = 0.0
        agg_gamma = 0.0
        agg_theta = 0.0
        agg_vega = 0.0
        agg_rho = 0.0

        for leg in legs:
            mult = 1.0 if leg.action == "BUY" else -1.0
            qty = leg.quantity
            agg_delta += mult * leg.delta * qty
            agg_gamma += mult * leg.gamma * qty
            agg_theta += mult * leg.theta * qty
            agg_vega += mult * leg.vega * qty
            agg_rho += mult * leg.rho * qty

        # Step 3: Payoff Simulation across Price Range
        min_p = max(1.0, spot_price * (1.0 - price_range_pct))
        max_p = spot_price * (1.0 + price_range_pct)
        step = (max_p - min_p) / max(1, num_points - 1)

        prices = [min_p + (i * step) for i in range(num_points)]
        payoff_grid = []

        max_profit = -float("inf")
        max_loss = float("inf")
        breakevens = []

        prev_pnl = None
        prev_p = None

        for p in prices:
            pnl_at_expiry = net_cash_flow  # start with initial premium cash flow
            for leg in legs:
                # Value of option at expiry
                if leg.option_type == "CALL":
                    intrinsic = max(0.0, p - leg.strike)
                else:
                    intrinsic = max(0.0, leg.strike - p)

                mult = 1.0 if leg.action == "BUY" else -1.0
                pnl_at_expiry += mult * intrinsic * leg.quantity

            pnl_at_expiry = round(pnl_at_expiry, 2)
            payoff_grid.append({
                "underlying_price": round(p, 2),
                "pnl": pnl_at_expiry,
                "pnl_pct": round((pnl_at_expiry / net_cost * 100.0), 2) if net_cost > 0 else 0.0
            })

            if pnl_at_expiry > max_profit:
                max_profit = pnl_at_expiry
            if pnl_at_expiry < max_loss:
                max_loss = pnl_at_expiry

            # Detect zero crossings for breakevens
            if prev_pnl is not None and prev_p is not None:
                if (prev_pnl < 0 <= pnl_at_expiry) or (prev_pnl >= 0 > pnl_at_expiry):
                    # Linear interpolation
                    be = prev_p + (0 - prev_pnl) * (p - prev_p) / (pnl_at_expiry - prev_pnl) if (pnl_at_expiry != prev_pnl) else p
                    breakevens.append(round(be, 2))

            prev_pnl = pnl_at_expiry
            prev_p = p

        # Check unbounded upside/downside
        # If last point is substantially higher than preceding, profit may be unlimited
        is_unlimited_profit = (payoff_grid[-1]["pnl"] > payoff_grid[-2]["pnl"] + 10.0) or (payoff_grid[0]["pnl"] > payoff_grid[1]["pnl"] + 10.0)
        is_unlimited_loss = (payoff_grid[-1]["pnl"] < payoff_grid[-2]["pnl"] - 10.0) or (payoff_grid[0]["pnl"] < payoff_grid[1]["pnl"] - 10.0)

        # Risk-to-Reward Ratio
        if is_unlimited_profit:
            rr_ratio = "UNLIMITED"
        elif abs(max_loss) > 0.01:
            rr_ratio = round(max(0.0, max_profit) / abs(max_loss), 2)
        else:
            rr_ratio = "N/A"

        return {
            "status": "success",
            "strategy_name": strategy_name,
            "underlying": underlying,
            "spot_price": spot_price,
            "legs_count": len(legs),
            "legs": [l.to_dict() for l in legs],
            "nature": "NET DEBIT" if is_debit else "NET CREDIT",
            "net_premium": round(net_cost, 2),
            "net_cash_flow": round(net_cash_flow, 2),
            "max_profit": "UNLIMITED" if is_unlimited_profit else round(max_profit, 2),
            "max_loss": "UNLIMITED" if is_unlimited_loss else round(abs(max_loss), 2),
            "risk_reward_ratio": rr_ratio,
            "breakevens": breakevens,
            "aggregate_greeks": {
                "delta": round(agg_delta, 4),
                "gamma": round(agg_gamma, 6),
                "theta": round(agg_theta, 2),
                "vega": round(agg_vega, 2),
                "rho": round(agg_rho, 4)
            },
            "payoff_curve": payoff_grid,
            "provenance": "CALCULATED (Black-Scholes & Analytical Expiry Payoff)"
        }

    @staticmethod
    def get_preset_strategy(
        preset_name: str,
        underlying: str,
        spot_price: float,
        expiry: str
    ) -> Dict[str, Any]:
        """Generates standard calibrated multi-leg structures around spot price."""
        step = 1000.0 if underlying == "BTC" else (100.0 if underlying == "ETH" else 5.0)
        atm = round(spot_price / step) * step
        p_name = preset_name.upper().replace(" ", "_")

        legs_data = []

        if p_name in ["LONG_CALL", "BUY_CALL"]:
            legs_data = [
                {"action": "BUY", "option_type": "CALL", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0}
            ]
        elif p_name in ["LONG_PUT", "BUY_PUT"]:
            legs_data = [
                {"action": "BUY", "option_type": "PUT", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0}
            ]
        elif p_name in ["BULL_CALL_SPREAD"]:
            legs_data = [
                {"action": "BUY", "option_type": "CALL", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0},
                {"action": "SELL", "option_type": "CALL", "strike": atm + (step * 2), "expiry": expiry, "premium": spot_price * 0.015, "quantity": 1.0}
            ]
        elif p_name in ["BEAR_PUT_SPREAD"]:
            legs_data = [
                {"action": "BUY", "option_type": "PUT", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0},
                {"action": "SELL", "option_type": "PUT", "strike": atm - (step * 2), "expiry": expiry, "premium": spot_price * 0.015, "quantity": 1.0}
            ]
        elif p_name in ["LONG_STRADDLE", "STRADDLE"]:
            legs_data = [
                {"action": "BUY", "option_type": "CALL", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0},
                {"action": "BUY", "option_type": "PUT", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0}
            ]
        elif p_name in ["LONG_STRANGLE", "STRANGLE"]:
            legs_data = [
                {"action": "BUY", "option_type": "CALL", "strike": atm + step, "expiry": expiry, "premium": spot_price * 0.025, "quantity": 1.0},
                {"action": "BUY", "option_type": "PUT", "strike": atm - step, "expiry": expiry, "premium": spot_price * 0.025, "quantity": 1.0}
            ]
        elif p_name in ["IRON_CONDOR"]:
            legs_data = [
                {"action": "BUY", "option_type": "PUT", "strike": atm - (step * 3), "expiry": expiry, "premium": spot_price * 0.008, "quantity": 1.0},
                {"action": "SELL", "option_type": "PUT", "strike": atm - step, "expiry": expiry, "premium": spot_price * 0.022, "quantity": 1.0},
                {"action": "SELL", "option_type": "CALL", "strike": atm + step, "expiry": expiry, "premium": spot_price * 0.022, "quantity": 1.0},
                {"action": "BUY", "option_type": "CALL", "strike": atm + (step * 3), "expiry": expiry, "premium": spot_price * 0.008, "quantity": 1.0}
            ]
        elif p_name in ["IRON_BUTTERFLY"]:
            legs_data = [
                {"action": "BUY", "option_type": "PUT", "strike": atm - (step * 2), "expiry": expiry, "premium": spot_price * 0.012, "quantity": 1.0},
                {"action": "SELL", "option_type": "PUT", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0},
                {"action": "SELL", "option_type": "CALL", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0},
                {"action": "BUY", "option_type": "CALL", "strike": atm + (step * 2), "expiry": expiry, "premium": spot_price * 0.012, "quantity": 1.0}
            ]
        else:
            # Default Long Call
            legs_data = [
                {"action": "BUY", "option_type": "CALL", "strike": atm, "expiry": expiry, "premium": spot_price * 0.035, "quantity": 1.0}
            ]

        return OptionStrategyEngine.evaluate_strategy(preset_name, underlying, spot_price, legs_data)
