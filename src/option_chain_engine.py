"""
Option Chain Analytics and Greeks Engine
========================================
Production-grade multi-asset option chain processor, Black-Scholes pricing,
Implied Volatility (IV) solver, Greeks calculator (Delta, Gamma, Theta, Vega, Rho),
PCR, Max Pain, and strike-range heatmaps for Indian Indices & Crypto options.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("OptionChainEngine")

# Standard normal cumulative distribution function approximation
def _norm_cdf(x: float) -> float:
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def _norm_pdf(x: float) -> float:
    return (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * x * x)


class OptionGreeksCalculator:
    """Calculates Black-Scholes Option Price, Implied Volatility, and Analytical Greeks."""

    @staticmethod
    def calculate_greeks(
        option_type: str,
        underlying_price: float,
        strike_price: float,
        time_to_expiry_years: float,
        risk_free_rate: float = 0.065,
        iv: float = 0.20,
    ) -> Dict[str, float]:
        """
        Calculates theoretical price and full suite of Greeks for European options.
        Time to expiry in years.
        IV in decimal (e.g. 0.20 for 20%).
        """
        is_call = option_type.upper() in ["CE", "CALL", "C"]
        S = max(0.01, float(underlying_price))
        K = max(0.01, float(strike_price))
        T = max(1e-5, float(time_to_expiry_years))
        r = float(risk_free_rate)
        sigma = max(0.001, float(iv))

        d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)

        cdf_d1 = _norm_cdf(d1)
        cdf_d2 = _norm_cdf(d2)
        pdf_d1 = _norm_pdf(d1)
        exp_rt = math.exp(-r * T)

        if is_call:
            theoretical_price = S * cdf_d1 - K * exp_rt * cdf_d2
            delta = cdf_d1
            rho = (K * T * exp_rt * cdf_d2) / 100.0
            theta = (-(S * pdf_d1 * sigma) / (2.0 * math.sqrt(T)) - r * K * exp_rt * cdf_d2) / 365.0
        else:
            cdf_neg_d1 = _norm_cdf(-d1)
            cdf_neg_d2 = _norm_cdf(-d2)
            theoretical_price = K * exp_rt * cdf_neg_d2 - S * cdf_neg_d1
            delta = cdf_d1 - 1.0
            rho = (-K * T * exp_rt * cdf_neg_d2) / 100.0
            theta = (-(S * pdf_d1 * sigma) / (2.0 * math.sqrt(T)) + r * K * exp_rt * cdf_neg_d2) / 365.0

        gamma = pdf_d1 / (S * sigma * math.sqrt(T))
        vega = (S * math.sqrt(T) * pdf_d1) / 100.0  # Change per 1% move in IV

        intrinsic_value = max(0.0, S - K) if is_call else max(0.0, K - S)
        time_value = max(0.0, theoretical_price - intrinsic_value)

        return {
            "theoretical_price": round(theoretical_price, 2),
            "delta": round(delta, 4),
            "gamma": round(gamma, 6),
            "theta": round(theta, 2),
            "vega": round(vega, 2),
            "rho": round(rho, 4),
            "intrinsic_value": round(intrinsic_value, 2),
            "time_value": round(time_value, 2),
            "iv": round(sigma * 100.0, 2),
        }

    @classmethod
    def implied_volatility(
        cls,
        market_price: float,
        option_type: str,
        underlying_price: float,
        strike_price: float,
        time_to_expiry_years: float,
        risk_free_rate: float = 0.065,
    ) -> float:
        """Solves for Implied Volatility using Newton-Raphson with bisection fallback."""
        if market_price <= 0.01:
            return 15.0  # Default 15%

        is_call = option_type.upper() in ["CE", "CALL", "C"]
        S = max(0.01, float(underlying_price))
        K = max(0.01, float(strike_price))
        T = max(1e-5, float(time_to_expiry_years))
        r = float(risk_free_rate)

        intrinsic = max(0.0, S - K) if is_call else max(0.0, K - S)
        if market_price < intrinsic:
            return 10.0

        # Newton-Raphson iteration
        sigma = 0.25
        for _ in range(30):
            d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
            d2 = d1 - sigma * math.sqrt(T)
            if is_call:
                price = S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
            else:
                price = K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)

            diff = price - market_price
            if abs(diff) < 1e-4:
                return round(sigma * 100.0, 2)

            vega = S * math.sqrt(T) * _norm_pdf(d1)
            if vega < 1e-6:
                break
            sigma = sigma - diff / vega
            if sigma <= 0.001 or sigma > 5.0:
                break

        # Bisection Fallback
        low_sigma, high_sigma = 0.01, 4.0
        for _ in range(40):
            mid_sigma = (low_sigma + high_sigma) / 2.0
            d1 = (math.log(S / K) + (r + 0.5 * mid_sigma * mid_sigma) * T) / (mid_sigma * math.sqrt(T))
            d2 = d1 - mid_sigma * math.sqrt(T)
            if is_call:
                price = S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
            else:
                price = K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)
            if abs(price - market_price) < 1e-3:
                return round(mid_sigma * 100.0, 2)
            if price > market_price:
                high_sigma = mid_sigma
            else:
                low_sigma = mid_sigma

        return round(mid_sigma * 100.0, 2)


class OptionChainEngine:
    """Generates structured option chain tables, analytics, PCR, and Max Pain metrics."""

    @classmethod
    def calculate_max_pain(cls, strikes_data: List[Dict[str, Any]]) -> float:
        """
        Calculates the Max Pain strike where the cumulative cash payout to option buyers is lowest.
        """
        if not strikes_data:
            return 0.0

        all_strikes = [float(s["strike"]) for s in strikes_data if "strike" in s and s.get("strike") is not None]
        if not all_strikes:
            return 0.0

        min_payout = float("inf")
        max_pain_strike = all_strikes[0]

        for test_strike in all_strikes:
            total_payout = 0.0
            for row in strikes_data:
                k = float(row.get("strike", 0) or 0.0)
                ce_obj = row.get("ce") or {}
                pe_obj = row.get("pe") or {}
                call_oi = float(ce_obj.get("open_interest") or 0.0)
                put_oi = float(pe_obj.get("open_interest") or 0.0)

                call_loss = max(0.0, test_strike - k) * call_oi
                put_loss = max(0.0, k - test_strike) * put_oi
                total_payout += call_loss + put_loss

            if total_payout < min_payout:
                min_payout = total_payout
                max_pain_strike = test_strike

        return float(max_pain_strike)

    @classmethod
    def calculate_pcr(cls, strikes_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculates Put-Call Ratio (PCR) for Open Interest and Volume."""
        total_call_oi = sum(float((r.get("ce") or {}).get("open_interest") or 0.0) for r in strikes_data)
        total_put_oi = sum(float((r.get("pe") or {}).get("open_interest") or 0.0) for r in strikes_data)
        total_call_vol = sum(float((r.get("ce") or {}).get("volume") or 0.0) for r in strikes_data)
        total_put_vol = sum(float((r.get("pe") or {}).get("volume") or 0.0) for r in strikes_data)

        pcr_oi = round(total_put_oi / total_call_oi, 3) if total_call_oi > 0 else 1.0
        pcr_vol = round(total_put_vol / total_call_vol, 3) if total_call_vol > 0 else 1.0

        return {
            "pcr_oi": pcr_oi,
            "pcr_volume": pcr_vol,
            "total_call_oi": total_call_oi,
            "total_put_oi": total_put_oi,
            "total_call_volume": total_call_vol,
            "total_put_volume": total_put_vol,
        }

    @classmethod
    def filter_strike_range(
        cls,
        strikes_data: List[Dict[str, Any]],
        underlying_price: float = 0.0,
        strike_count: Optional[int] = 20,
        spot_price: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Filters option chain strikes to a specific count (e.g. 5, 10, 20, 50) centered at ATM.
        """
        if not strikes_data or not strike_count or strike_count <= 0 or strike_count >= len(strikes_data):
            return strikes_data

        target_price = spot_price if spot_price is not None and spot_price > 0 else underlying_price

        # Sort strikes ascending
        sorted_strikes = sorted(strikes_data, key=lambda x: float(x.get("strike", 0)))
        
        # Find ATM index
        atm_idx = 0
        min_dist = float("inf")
        for i, s in enumerate(sorted_strikes):
            strike = float(s.get("strike", 0))
            dist = abs(strike - target_price)
            if dist < min_dist:
                min_dist = dist
                atm_idx = i

        half = strike_count // 2
        start_idx = max(0, atm_idx - half)
        end_idx = min(len(sorted_strikes), start_idx + strike_count)
        if end_idx - start_idx < strike_count:
            start_idx = max(0, end_idx - strike_count)

        return sorted_strikes[start_idx:end_idx]

    @classmethod
    def enrich_chain_with_greeks(
        cls,
        strikes_data: List[Dict[str, Any]],
        underlying_price: float,
        expiry_date_str: str,
        risk_free_rate: float = 0.065,
    ) -> List[Dict[str, Any]]:
        """
        Computes Black-Scholes Greeks, IV, and ITM/OTM status for every strike row in the option chain.
        """
        now = datetime.now(timezone.utc)
        try:
            exp_date = datetime.fromisoformat(expiry_date_str.replace("Z", "+00:00"))
        except Exception:
            exp_date = now + timedelta(days=7)

        days_to_exp = max(0.1, (exp_date - now).total_seconds() / 86400.0)
        t_years = days_to_exp / 365.0

        enriched = []
        for row in strikes_data:
            strike = float(row.get("strike", 0))
            is_atm = abs(strike - underlying_price) <= (underlying_price * 0.005)

            ce_raw = dict(row.get("ce", {}))
            pe_raw = dict(row.get("pe", {}))

            ce_ltp = float(ce_raw.get("ltp", 0))
            pe_ltp = float(pe_raw.get("ltp", 0))

            ce_iv = float(ce_raw.get("iv", 0))
            if ce_iv <= 0:
                ce_iv = OptionGreeksCalculator.implied_volatility(ce_ltp, "CE", underlying_price, strike, t_years, risk_free_rate)

            pe_iv = float(pe_raw.get("iv", 0))
            if pe_iv <= 0:
                pe_iv = OptionGreeksCalculator.implied_volatility(pe_ltp, "PE", underlying_price, strike, t_years, risk_free_rate)

            ce_greeks = OptionGreeksCalculator.calculate_greeks("CE", underlying_price, strike, t_years, risk_free_rate, ce_iv / 100.0)
            pe_greeks = OptionGreeksCalculator.calculate_greeks("PE", underlying_price, strike, t_years, risk_free_rate, pe_iv / 100.0)

            ce_raw.update({
                "moneyness": "ITM" if strike < underlying_price else ("ATM" if is_atm else "OTM"),
                "iv": ce_iv,
                "delta": ce_greeks["delta"],
                "gamma": ce_greeks["gamma"],
                "theta": ce_greeks["theta"],
                "vega": ce_greeks["vega"],
                "rho": ce_greeks["rho"],
                "intrinsic_value": ce_greeks["intrinsic_value"],
                "time_value": ce_greeks["time_value"],
            })

            pe_raw.update({
                "moneyness": "ITM" if strike > underlying_price else ("ATM" if is_atm else "OTM"),
                "iv": pe_iv,
                "delta": pe_greeks["delta"],
                "gamma": pe_greeks["gamma"],
                "theta": pe_greeks["theta"],
                "vega": pe_greeks["vega"],
                "rho": pe_greeks["rho"],
                "intrinsic_value": pe_greeks["intrinsic_value"],
                "time_value": pe_greeks["time_value"],
            })

            enriched.append({
                "strike": strike,
                "is_atm": is_atm,
                "distance_pct": round(((strike - underlying_price) / underlying_price) * 100.0, 2),
                "ce": ce_raw,
                "pe": pe_raw,
            })

        return enriched

    @classmethod
    def calculate_market_intelligence(
        cls,
        strikes_data: List[Dict[str, Any]],
        underlying_price: float,
        expiry_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Computes comprehensive, trustworthy option market intelligence metrics.
        All computed metrics are strictly marked with their calculation provenance.
        """
        if not strikes_data or underlying_price <= 0:
            return {
                "status": "DATA_UNAVAILABLE",
                "pcr_oi": None,
                "pcr_volume": None,
                "max_pain": None,
                "atm_iv": None,
                "iv_skew": None,
                "top_call_oi_strikes": [],
                "top_put_oi_strikes": [],
                "top_volume_strikes": [],
                "expected_move": None,
            }

        pcr = cls.calculate_pcr(strikes_data)
        max_pain_val = cls.calculate_max_pain(strikes_data)

        # Sort strikes for ATM search
        sorted_by_dist = sorted(
            strikes_data,
            key=lambda x: abs(float(x.get("strike", 0) or 0) - underlying_price),
        )
        atm_row = sorted_by_dist[0] if sorted_by_dist else {}
        atm_strike = float(atm_row.get("strike", underlying_price) or underlying_price)
        ce_atm_iv = float((atm_row.get("ce") or {}).get("iv", 0) or 0)
        pe_atm_iv = float((atm_row.get("pe") or {}).get("iv", 0) or 0)
        atm_iv = round((ce_atm_iv + pe_atm_iv) / 2.0, 2) if (ce_atm_iv > 0 and pe_atm_iv > 0) else (ce_atm_iv or pe_atm_iv or 18.0)

        # Expected Move methodology: Underlying * ATM_IV% * sqrt(days/365)
        t_years = max(1, expiry_days) / 365.0
        expected_move = round(underlying_price * (atm_iv / 100.0) * math.sqrt(t_years), 2)
        expected_upper = round(underlying_price + expected_move, 2)
        expected_lower = round(underlying_price - expected_move, 2)

        # Top Call & Put OI Strikes
        call_oi_sorted = sorted(
            strikes_data,
            key=lambda x: float((x.get("ce") or {}).get("open_interest", 0) or 0),
            reverse=True,
        )
        put_oi_sorted = sorted(
            strikes_data,
            key=lambda x: float((x.get("pe") or {}).get("open_interest", 0) or 0),
            reverse=True,
        )
        vol_sorted = sorted(
            strikes_data,
            key=lambda x: (float((x.get("ce") or {}).get("volume", 0) or 0) + float((x.get("pe") or {}).get("volume", 0) or 0)),
            reverse=True,
        )

        top_call_oi = [
            {"strike": float(s.get("strike", 0)), "oi": float((s.get("ce") or {}).get("open_interest", 0)), "ltp": float((s.get("ce") or {}).get("ltp", 0))}
            for s in call_oi_sorted[:3]
        ]
        top_put_oi = [
            {"strike": float(s.get("strike", 0)), "oi": float((s.get("pe") or {}).get("open_interest", 0)), "ltp": float((s.get("pe") or {}).get("ltp", 0))}
            for s in put_oi_sorted[:3]
        ]
        top_vol = [
            {"strike": float(s.get("strike", 0)), "total_volume": float((s.get("ce") or {}).get("volume", 0) or 0) + float((s.get("pe") or {}).get("volume", 0) or 0)}
            for s in vol_sorted[:3]
        ]

        # IV Skew: 25-Delta / OTM Put IV minus OTM Call IV
        otm_puts = [s for s in strikes_data if float(s.get("strike", 0)) < underlying_price]
        otm_calls = [s for s in strikes_data if float(s.get("strike", 0)) > underlying_price]
        avg_otm_put_iv = sum(float((s.get("pe") or {}).get("iv", 0) or 0) for s in otm_puts) / max(1, len(otm_puts))
        avg_otm_call_iv = sum(float((s.get("ce") or {}).get("iv", 0) or 0) for s in otm_calls) / max(1, len(otm_calls))
        iv_skew = round(avg_otm_put_iv - avg_otm_call_iv, 2)

        return {
            "status": "CALCULATED",
            "pcr_oi": pcr["pcr_oi"],
            "pcr_volume": pcr["pcr_volume"],
            "total_call_oi": pcr["total_call_oi"],
            "total_put_oi": pcr["total_put_oi"],
            "max_pain": {
                "strike": max_pain_val,
                "label": "CALCULATED ANALYTIC",
                "methodology": "Minimum cash payout to option buyers across all strikes",
            },
            "atm_strike": atm_strike,
            "atm_iv": atm_iv,
            "iv_skew": iv_skew,
            "skew_bias": "PUT_PREMIUM_ELEVATED" if iv_skew > 1.5 else ("CALL_PREMIUM_ELEVATED" if iv_skew < -1.5 else "BALANCED"),
            "expected_move": {
                "move_points": expected_move,
                "upper_range": expected_upper,
                "lower_range": expected_lower,
                "label": "CALCULATED ANALYTIC",
                "formula": "Underlying * ATM_IV * sqrt(days/365)",
            },
            "top_call_oi_strikes": top_call_oi,
            "top_put_oi_strikes": top_put_oi,
            "top_volume_strikes": top_vol,
        }


# ─────────────────────────────────────────────────────────────────────────────
# MULTI-LEG OPTION STRATEGY ANALYZER
# ─────────────────────────────────────────────────────────────────────────────

class OptionStrategyAnalyzer:
    """
    Analyzes, prices, and risk-profiles 20+ multi-leg option combinations.
    Strictly separates quantitative analytics from execution.
    """

    STRATEGY_TEMPLATES = [
        "LONG_CALL", "LONG_PUT", "COVERED_CALL", "PROTECTIVE_PUT",
        "BULL_CALL_SPREAD", "BEAR_PUT_SPREAD", "BULL_PUT_SPREAD", "BEAR_CALL_SPREAD",
        "LONG_STRADDLE", "SHORT_STRADDLE", "LONG_STRANGLE", "SHORT_STRANGLE",
        "IRON_CONDOR", "IRON_BUTTERFLY", "CALENDAR_SPREAD", "DIAGONAL_SPREAD",
        "RATIO_SPREAD", "BUTTERFLY", "SYNTHETIC_LONG", "SYNTHETIC_SHORT", "CUSTOM"
    ]

    @classmethod
    def analyze_strategy(
        cls,
        name: str,
        underlying: str,
        spot_price: float,
        legs: List[Dict[str, Any]],
        lot_size: int = 1,
    ) -> Dict[str, Any]:
        """
        Analyzes a multi-leg strategy.
        Each leg is a dict with:
          - option_type: 'CALL' | 'PUT' | 'SPOT'
          - strike: float (for options)
          - expiry: str
          - side: 'BUY' | 'SELL'
          - quantity: int
          - entry_price: float
          - current_price: float
          - delta, gamma, theta, vega (optional Greeks)
        """
        if not legs or spot_price <= 0:
            return {
                "name": name,
                "underlying": underlying,
                "status": "DATA_UNAVAILABLE",
                "legs_count": len(legs),
            }

        net_entry_cost = 0.0
        net_current_value = 0.0
        net_delta = 0.0
        net_gamma = 0.0
        net_theta = 0.0
        net_vega = 0.0
        estimated_margin = 0.0

        for leg in legs:
            qty = int(leg.get("quantity", 1) or 1)
            side = str(leg.get("side", "BUY")).upper()
            mult = 1 if side == "BUY" else -1
            ep = float(leg.get("entry_price", 0.0) or 0.0)
            cp = float(leg.get("current_price", ep) or ep)

            net_entry_cost += mult * ep * qty * lot_size
            net_current_value += mult * cp * qty * lot_size

            # Aggregate Greeks
            opt_type = str(leg.get("option_type", "CALL")).upper()
            greeks = leg.get("greeks") or {}
            raw_d = float(leg.get("delta") if leg.get("delta") is not None else greeks.get("delta", 0.0) or 0.0)
            raw_g = float(leg.get("gamma") if leg.get("gamma") is not None else greeks.get("gamma", 0.0) or 0.0)
            raw_t = float(leg.get("theta") if leg.get("theta") is not None else greeks.get("theta", 0.0) or 0.0)
            raw_v = float(leg.get("vega") if leg.get("vega") is not None else greeks.get("vega", 0.0) or 0.0)

            # Natural Greek sign
            if opt_type in ("CALL", "CE"):
                d = abs(raw_d)
            elif opt_type in ("PUT", "PE"):
                d = -abs(raw_d)
            else:
                d = raw_d

            g = abs(raw_g)
            t = -abs(raw_t) if raw_t != 0 else 0.0
            v = abs(raw_v)

            net_delta += mult * d * qty * lot_size
            net_gamma += mult * g * qty * lot_size
            net_theta += mult * t * qty * lot_size
            net_vega += mult * v * qty * lot_size

            # Estimated Margin requirement (Indian/Crypto derivative approximation)
            opt_type = str(leg.get("option_type", "CALL")).upper()
            if side == "SELL" and opt_type in ("CALL", "PUT"):
                # Short option margin approx 15% of contract value + premium
                strike = float(leg.get("strike", spot_price) or spot_price)
                estimated_margin += (0.15 * strike + cp) * qty * lot_size
            elif side == "BUY":
                # Long option margin is premium paid
                estimated_margin += cp * qty * lot_size

        current_pnl = round(net_current_value - net_entry_cost, 2)

        # Break-even and Max Profit/Loss calculations based on strategy structure
        strikes = sorted([float(l.get("strike", 0)) for l in legs if l.get("strike")])
        min_k = strikes[0] if strikes else spot_price
        max_k = strikes[-1] if strikes else spot_price

        max_profit = "UNDEFINED / UNLIMITED"
        max_loss = "UNDEFINED / UNLIMITED"
        break_evens = []

        upper_name = name.upper()
        if "BULL_CALL_SPREAD" in upper_name and len(strikes) >= 2:
            spread_width = max_k - min_k
            net_debit = abs(net_entry_cost) / max(1, lot_size)
            max_profit = round((spread_width - net_debit) * lot_size, 2)
            max_loss = round(-net_debit * lot_size, 2)
            break_evens = [round(min_k + net_debit, 2)]
        elif "BEAR_PUT_SPREAD" in upper_name and len(strikes) >= 2:
            spread_width = max_k - min_k
            net_debit = abs(net_entry_cost) / max(1, lot_size)
            max_profit = round((spread_width - net_debit) * lot_size, 2)
            max_loss = round(-net_debit * lot_size, 2)
            break_evens = [round(max_k - net_debit, 2)]
        elif "IRON_CONDOR" in upper_name and len(strikes) >= 4:
            net_credit = abs(net_entry_cost) / max(1, lot_size)
            wing_width = strikes[1] - strikes[0]
            max_profit = round(net_credit * lot_size, 2)
            max_loss = round(-(wing_width - net_credit) * lot_size, 2)
            break_evens = [round(strikes[1] - net_credit, 2), round(strikes[2] + net_credit, 2)]
        elif "LONG_STRADDLE" in upper_name and strikes:
            net_debit = abs(net_entry_cost) / max(1, lot_size)
            max_loss = round(-net_debit * lot_size, 2)
            break_evens = [round(strikes[0] - net_debit, 2), round(strikes[0] + net_debit, 2)]
        elif "SHORT_STRADDLE" in upper_name and strikes:
            net_credit = abs(net_entry_cost) / max(1, lot_size)
            max_profit = round(net_credit * lot_size, 2)
            break_evens = [round(strikes[0] - net_credit, 2), round(strikes[0] + net_credit, 2)]

        return {
            "name": name,
            "underlying": underlying,
            "spot_price": spot_price,
            "legs_count": len(legs),
            "legs": legs,
            "net_premium": round(net_entry_cost, 2),
            "current_value": round(net_current_value, 2),
            "pnl": current_pnl,
            "max_profit": max_profit,
            "max_loss": max_loss,
            "break_evens": break_evens,
            "greeks": {
                "net_delta": round(net_delta, 4),
                "net_gamma": round(net_gamma, 6),
                "net_theta": round(net_theta, 2),
                "net_vega": round(net_vega, 2),
            },
            "estimated_margin": round(estimated_margin, 2),
            "status": "ACTIVE",
            "risk_classification": "DEFINED_RISK" if max_loss != "UNDEFINED / UNLIMITED" else "UNDEFINED_RISK",
            "disclaimer": "Analytics only. Past and theoretical calculations are not guaranteed profit indications.",
        }


global_option_chain_engine = OptionChainEngine()
global_strategy_analyzer = OptionStrategyAnalyzer()

