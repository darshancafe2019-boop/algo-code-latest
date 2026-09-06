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

        all_strikes = [float(s["strike"]) for s in strikes_data if "strike" in s]
        if not all_strikes:
            return 0.0

        min_payout = float("inf")
        max_pain_strike = all_strikes[0]

        for test_strike in all_strikes:
            total_payout = 0.0
            for row in strikes_data:
                k = float(row.get("strike", 0))
                call_oi = float(row.get("ce", {}).get("open_interest", 0))
                put_oi = float(row.get("pe", {}).get("open_interest", 0))

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
        total_call_oi = sum(float(r.get("ce", {}).get("open_interest", 0)) for r in strikes_data)
        total_put_oi = sum(float(r.get("pe", {}).get("open_interest", 0)) for r in strikes_data)
        total_call_vol = sum(float(r.get("ce", {}).get("volume", 0)) for r in strikes_data)
        total_put_vol = sum(float(r.get("pe", {}).get("volume", 0)) for r in strikes_data)

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
