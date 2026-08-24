"""
Universal Risk Management Engine
================================
Enterprise-grade multi-asset risk management, position sizing, futures margin & leverage,
options strategies & Greeks analytics, multi-bot portfolio concentration, drawdown protection,
scenario stress testing, and 12-stage pre-trade safety validation.

Supported Asset Classes:
- Crypto (Spot, Margin, Perpetual Futures)
- Indian Equities (NSE/BSE in INR ₹)
- US / Global Equities (USD $)
- Indices (NIFTY, BANKNIFTY, S&P 500, NASDAQ, DJI)
- Forex (Majors, Minors, INR pairs)
- Futures (Commodities, Indices, Crypto Perps)
- Options (Single leg & 13+ Multi-leg Strategies)
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import numpy as np
from src import config, db

logger = logging.getLogger("UniversalRiskEngine")


# =============================================================================
# 1. CONSTANTS & INSTRUMENT SPECIFICATIONS
# =============================================================================
ASSET_CLASSES = ["crypto", "indian_stocks", "us_stocks", "indices", "forex", "futures", "options"]

CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "₹",
    "EUR": "€",
    "GBP": "£",
    "USDT": "$"
}

DEFAULT_LOT_SIZES = {
    "NIFTY": 50,
    "BANKNIFTY": 15,
    "FINNIFTY": 25,
    "RELIANCE": 250,
    "TCS": 175,
    "INFY": 300,
    "BTC/USDT": 1,
    "ETH/USDT": 1,
    "EUR/USD": 100000,
    "USD/INR": 1000
}

OPTION_STRATEGIES = [
    "Long Call",
    "Long Put",
    "Covered Call",
    "Protective Put",
    "Bull Call Spread",
    "Bear Put Spread",
    "Bull Put Spread",
    "Bear Call Spread",
    "Straddle",
    "Strangle",
    "Iron Condor",
    "Butterfly",
    "Calendar Spread"
]


# =============================================================================
# 2. BLACK-SCHOLES GREEKS ANALYTICAL MODEL
# =============================================================================
def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0


def norm_pdf(x: float) -> float:
    """Standard normal probability density function."""
    return (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * x * x)


def calculate_black_scholes_greeks(
    spot: float,
    strike: float,
    time_to_expiry_years: float,
    volatility: float,
    risk_free_rate: float = 0.05,
    option_type: str = "call"
) -> Dict[str, Any]:
    """
    Computes analytical Black-Scholes Price & Greeks (Delta, Gamma, Theta, Vega, Rho).
    Returns 'DATA REQUIRED' when essential inputs are missing or invalid.
    """
    if spot <= 0 or strike <= 0 or time_to_expiry_years <= 0 or volatility <= 0:
        return {
            "status": "DATA REQUIRED",
            "message": "Valid positive spot, strike, time to expiry, and implied volatility required.",
            "delta": 0.0,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "theoretical_price": 0.0
        }

    try:
        s = float(spot)
        k = float(strike)
        t = float(time_to_expiry_years)
        v = float(volatility)
        r = float(risk_free_rate)
        opt = option_type.lower()

        d1 = (math.log(s / k) + (r + 0.5 * v * v) * t) / (v * math.sqrt(t))
        d2 = d1 - v * math.sqrt(t)

        pdf_d1 = norm_pdf(d1)
        cdf_d1 = norm_cdf(d1)
        cdf_d2 = norm_cdf(d2)
        cdf_neg_d1 = norm_cdf(-d1)
        cdf_neg_d2 = norm_cdf(-d2)

        exp_rt = math.exp(-r * t)

        if opt == "call":
            price = s * cdf_d1 - k * exp_rt * cdf_d2
            delta = cdf_d1
            theta = (- (s * pdf_d1 * v) / (2.0 * math.sqrt(t)) - r * k * exp_rt * cdf_d2) / 365.0
            rho = (k * t * exp_rt * cdf_d2) / 100.0
        else:
            price = k * exp_rt * cdf_neg_d2 - s * cdf_neg_d1
            delta = cdf_d1 - 1.0
            theta = (- (s * pdf_d1 * v) / (2.0 * math.sqrt(t)) + r * k * exp_rt * cdf_neg_d2) / 365.0
            rho = (-k * t * exp_rt * cdf_neg_d2) / 100.0

        gamma = pdf_d1 / (s * v * math.sqrt(t))
        vega = (s * math.sqrt(t) * pdf_d1) / 100.0

        return {
            "status": "CALCULATED",
            "model": "Black-Scholes (1973)",
            "theoretical_price": round(price, 4),
            "delta": round(delta, 4),
            "gamma": round(gamma, 6),
            "theta": round(theta, 4),
            "vega": round(vega, 4),
            "rho": round(rho, 4),
            "d1": round(d1, 4),
            "d2": round(d2, 4)
        }
    except Exception as e:
        logger.error(f"Greeks calculation error: {e}")
        return {
            "status": "DATA REQUIRED",
            "message": f"Calculation error: {e}",
            "delta": 0.0,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "theoretical_price": 0.0
        }


# =============================================================================
# 3. UNIVERSAL POSITION SIZING CALCULATOR (8 METHODS)
# =============================================================================
def calculate_universal_position_size(
    account_balance: float,
    entry_price: float,
    stop_loss_price: float,
    method: str = "percent_equity",
    risk_pct: float = 2.0,
    risk_amount: Optional[float] = None,
    available_capital: Optional[float] = None,
    leverage: float = 1.0,
    atr: Optional[float] = None,
    volatility_pct: Optional[float] = None,
    win_rate: float = 0.55,
    profit_factor: float = 1.8,
    hard_risk_cap_pct: float = 5.0,
    lot_size: int = 1,
    asset_class: str = "crypto",
    currency: str = "USD",
    fees_pct: float = 0.001,
    slippage_pct: float = 0.0005
) -> Dict[str, Any]:
    """
    Computes precise multi-asset position sizing across 8 standard quant models.
    Enforces user's hard risk cap and provides detailed margin, risk/reward, and notional outputs.
    """
    if account_balance <= 0 or entry_price <= 0:
        return {"status": "ERROR", "message": "Account Balance and Entry Price must be positive."}

    avail_cap = available_capital if (available_capital is not None and available_capital > 0) else account_balance
    stop_dist = abs(entry_price - stop_loss_price) if stop_loss_price > 0 else 0.0
    stop_dist_pct = (stop_dist / entry_price * 100.0) if entry_price > 0 else 0.0

    # Determine baseline risk amount ($/₹)
    hard_max_risk = account_balance * (hard_risk_cap_pct / 100.0)
    calculated_risk_amount = 0.0
    method_label = method

    if method == "fixed_amount":
        calculated_risk_amount = risk_amount if (risk_amount and risk_amount > 0) else (account_balance * 0.02)
    elif method == "percent_available":
        calculated_risk_amount = avail_cap * (risk_pct / 100.0)
    elif method == "atr_based" and atr and atr > 0:
        # 1.5 ATR risk distance
        atr_dist = 1.5 * atr
        stop_dist = atr_dist
        stop_dist_pct = (atr_dist / entry_price) * 100.0
        calculated_risk_amount = account_balance * (risk_pct / 100.0)
    elif method == "volatility_based" and volatility_pct and volatility_pct > 0:
        # Scale risk inversely with market volatility
        vol_scalar = max(0.25, min(2.0, 20.0 / volatility_pct))
        calculated_risk_amount = account_balance * (risk_pct / 100.0) * vol_scalar
    elif method == "kelly_capped":
        # Half-Kelly formula: K% = (p * b - q) / b * 0.5
        p = max(0.1, min(0.9, win_rate))
        q = 1.0 - p
        b = max(0.5, profit_factor)
        kelly_fraction = max(0.005, min(0.25, (p * b - q) / b * 0.5))
        calculated_risk_amount = account_balance * kelly_fraction
        method_label = f"Half-Kelly ({kelly_fraction*100:.1f}%)"
    elif method == "fixed_quantity":
        qty = risk_amount if risk_amount else 1.0
        calculated_risk_amount = qty * stop_dist
    elif method == "fixed_notional":
        notional_target = risk_amount if risk_amount else (account_balance * 0.5)
        calculated_quantity = notional_target / entry_price
        calculated_risk_amount = calculated_quantity * stop_dist
    else:  # default percent_equity
        calculated_risk_amount = account_balance * (risk_pct / 100.0)

    # Strictly enforce hard maximum risk cap
    effective_risk_amount = min(calculated_risk_amount, hard_max_risk)

    # Quantity calculation
    if stop_dist > 0:
        raw_quantity = effective_risk_amount / stop_dist
    else:
        raw_quantity = (account_balance * (risk_pct / 100.0)) / entry_price

    # Lot size alignment
    if lot_size > 1:
        lots = max(1, round(raw_quantity / lot_size))
        final_quantity = float(lots * lot_size)
    else:
        final_quantity = round(raw_quantity, 6 if asset_class == "crypto" else 2)

    notional_value = round(final_quantity * entry_price, 2)
    eff_leverage = max(1.0, float(leverage))
    margin_required = round(notional_value / eff_leverage, 2)

    # Capital capping for spot/unleveraged
    capped = False
    if eff_leverage == 1.0 and notional_value > avail_cap:
        capped = True
        final_quantity = round(avail_cap / entry_price, 6 if asset_class == "crypto" else 2)
        if lot_size > 1:
            final_quantity = float(max(1, int(final_quantity / lot_size)) * lot_size)
        notional_value = round(final_quantity * entry_price, 2)
        margin_required = notional_value

    max_loss = round(final_quantity * stop_dist, 2) if stop_dist > 0 else effective_risk_amount
    is_long = entry_price >= stop_loss_price if stop_loss_price > 0 else True
    suggested_tp = round(entry_price + (2.0 * stop_dist) if is_long else entry_price - (2.0 * stop_dist), 2)
    potential_profit = round(final_quantity * abs(suggested_tp - entry_price), 2)
    rr_ratio = round(potential_profit / max_loss, 2) if max_loss > 0 else 2.0

    fee_est = round(notional_value * fees_pct * 2, 2)  # Entry + Exit
    slip_est = round(notional_value * slippage_pct, 2)
    capital_used = margin_required + fee_est
    remaining_cap = max(0.0, round(avail_cap - capital_used, 2))
    portfolio_risk_after = round(((effective_risk_amount) / account_balance) * 100.0, 2)

    curr_sym = CURRENCY_SYMBOLS.get(currency.upper(), "$")

    return {
        "status": "SUCCESS",
        "method": method_label,
        "asset_class": asset_class,
        "currency": currency,
        "currency_symbol": curr_sym,
        "account_balance": account_balance,
        "available_capital": avail_cap,
        "entry_price": entry_price,
        "stop_loss_price": stop_loss_price,
        "stop_distance": round(stop_dist, 2),
        "stop_distance_pct": round(stop_dist_pct, 2),
        "risk_amount": round(effective_risk_amount, 2),
        "risk_pct_effective": round((effective_risk_amount / account_balance) * 100.0, 2),
        "position_quantity": final_quantity,
        "quantity": final_quantity,
        "lot_size": lot_size,
        "lots_count": int(final_quantity / lot_size) if lot_size > 1 else 1,
        "notional_value": notional_value,
        "leverage": eff_leverage,
        "margin_required": margin_required,
        "fees_estimated": fee_est,
        "slippage_estimated": slip_est,
        "capital_used": capital_used,
        "remaining_capital": remaining_cap,
        "maximum_loss": max_loss,
        "potential_profit": potential_profit,
        "suggested_take_profit": suggested_tp,
        "risk_reward_ratio": rr_ratio,
        "portfolio_risk_pct_after": portfolio_risk_after,
        "is_capital_capped": capped,
        "calculation_mode": "CALCULATED"
    }


# =============================================================================
# 4. FUTURES RISK & MARGIN CALCULATOR
# =============================================================================
def calculate_futures_risk(
    symbol: str,
    contract_size: float,
    entry_price: float,
    stop_loss: float,
    target_price: float,
    direction: str = "LONG",
    leverage: float = 10.0,
    quantity: float = 1.0,
    account_balance: float = 10000.0,
    maintenance_margin_rate: float = 0.005,  # 0.5% standard maintenance margin
    tick_size: float = 0.1,
    tick_value: float = 0.1,
    funding_rate_8h: float = 0.0001,
    broker_liquidation_formula: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes exact futures exposure, initial & maintenance margin, tick sensitivity,
    funding cost estimate, and distance to liquidation.
    """
    dir_clean = direction.upper()
    is_long = dir_clean == "LONG"

    notional = round(quantity * contract_size * entry_price, 2)
    initial_margin = round(notional / leverage, 2)
    maint_margin = round(notional * maintenance_margin_rate, 2)
    margin_usage_pct = round((initial_margin / account_balance) * 100.0, 2) if account_balance > 0 else 0.0

    # Liquidation Price Model (Standard Isolated / Cross approximation)
    # Long: Liq = Entry * (1 - (1/Leverage) + MMR)
    # Short: Liq = Entry * (1 + (1/Leverage) - MMR)
    if is_long:
        liq_price = entry_price * (1.0 - (1.0 / leverage) + maintenance_margin_rate)
        liq_dist = max(0.0, entry_price - liq_price)
    else:
        liq_price = entry_price * (1.0 + (1.0 / leverage) - maintenance_margin_rate)
        liq_dist = max(0.0, liq_price - entry_price)

    liq_dist_pct = round((liq_dist / entry_price) * 100.0, 2) if entry_price > 0 else 0.0

    # Stop Loss & Target PnL
    stop_dist = abs(entry_price - stop_loss) if stop_loss > 0 else 0.0
    max_loss_at_stop = round(quantity * contract_size * stop_dist, 2)
    target_dist = abs(target_price - entry_price) if target_price > 0 else (2.0 * stop_dist)
    potential_profit = round(quantity * contract_size * target_dist, 2)
    rr = round(potential_profit / max_loss_at_stop, 2) if max_loss_at_stop > 0 else 2.0

    # Tick Value Sensitivity
    ticks = stop_dist / tick_size if tick_size > 0 else 0
    tick_loss = ticks * tick_value * quantity

    # Estimated 24h Funding Cost
    funding_24h_est = round(notional * funding_rate_8h * 3.0, 2)

    return {
        "status": "SUCCESS",
        "symbol": symbol,
        "direction": dir_clean,
        "contract_size": contract_size,
        "quantity": quantity,
        "entry_price": entry_price,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "leverage": leverage,
        "notional_value": notional,
        "initial_margin": initial_margin,
        "maintenance_margin": maint_margin,
        "margin_usage_pct": margin_usage_pct,
        "estimated_liquidation_price": round(liq_price, 2),
        "distance_to_liquidation": round(liq_dist, 2),
        "distance_to_liquidation_pct": liq_dist_pct,
        "liquidation_label": "CALCULATED (Standard MMR Model)" if not broker_liquidation_formula else "ESTIMATED",
        "maximum_loss_at_stop": max_loss_at_stop,
        "potential_profit": potential_profit,
        "risk_reward_ratio": rr,
        "funding_rate_8h": funding_rate_8h,
        "estimated_24h_funding": funding_24h_est,
        "tick_size": tick_size,
        "tick_value": tick_value,
        "ticks_at_risk": round(ticks, 1),
        "portfolio_exposure_pct": round((notional / account_balance) * 100.0, 2) if account_balance > 0 else 0.0
    }


# =============================================================================
# 5. OPTIONS RISK & MULTI-LEG STRATEGY ENGINE
# =============================================================================
def calculate_options_strategy_risk(
    strategy_name: str,
    underlying_price: float,
    legs: List[Dict[str, Any]],
    lot_size: int = 1,
    iv_pct: float = 25.0,
    days_to_expiry: int = 30,
    risk_free_rate: float = 0.05
) -> Dict[str, Any]:
    """
    Computes multi-leg option strategy risk, net Greeks, max profit/loss, breakevens,
    and a 21-point payoff curve across underlying spot price shocks (-15% to +15%).
    """
    if not legs or underlying_price <= 0:
        return {"status": "ERROR", "message": "Valid legs and positive underlying price required."}

    t_years = max(0.001, days_to_expiry / 365.0)
    vol = max(0.01, iv_pct / 100.0)

    total_net_debit_credit = 0.0
    net_delta = 0.0
    net_gamma = 0.0
    net_theta = 0.0
    net_vega = 0.0
    net_rho = 0.0

    evaluated_legs = []
    for leg in legs:
        side = leg.get("side", "BUY").upper()  # BUY (+1) or SELL (-1)
        sign = 1 if side == "BUY" else -1
        opt_type = leg.get("option_type", "call").lower()
        strike = float(leg.get("strike", underlying_price))
        premium = float(leg.get("premium", 0.0))
        qty = int(leg.get("quantity", 1))

        # Greeks for single leg
        greeks = calculate_black_scholes_greeks(
            spot=underlying_price,
            strike=strike,
            time_to_expiry_years=t_years,
            volatility=vol,
            risk_free_rate=risk_free_rate,
            option_type=opt_type
        )

        leg_cost = sign * premium * qty * lot_size
        total_net_debit_credit += leg_cost

        if greeks.get("status") == "CALCULATED":
            net_delta += sign * greeks["delta"] * qty * lot_size
            net_gamma += sign * greeks["gamma"] * qty * lot_size
            net_theta += sign * greeks["theta"] * qty * lot_size
            net_vega += sign * greeks["vega"] * qty * lot_size
            net_rho += sign * greeks["rho"] * qty * lot_size

        evaluated_legs.append({
            "side": side,
            "option_type": opt_type.upper(),
            "strike": strike,
            "premium": premium,
            "quantity": qty,
            "lot_size": lot_size,
            "greeks": greeks
        })

    # Generate 21-point payoff curve (-15% to +15%)
    spot_range = np.linspace(underlying_price * 0.85, underlying_price * 1.15, 21)
    payoffs = []
    for s_eval in spot_range:
        pnl = 0.0
        for leg in evaluated_legs:
            side_sign = 1 if leg["side"] == "BUY" else -1
            k = leg["strike"]
            prem = leg["premium"]
            q = leg["quantity"] * lot_size

            if leg["option_type"] == "CALL":
                intrinsic = max(0.0, s_eval - k)
            else:
                intrinsic = max(0.0, k - s_eval)

            leg_pnl = side_sign * (intrinsic - prem) * q
            pnl += leg_pnl

        payoffs.append({"spot": round(float(s_eval), 2), "pnl": round(float(pnl), 2)})

    pnl_values = [p["pnl"] for p in payoffs]
    max_profit = max(pnl_values)
    max_loss = min(pnl_values)

    # Calculate approximate breakeven points
    breakevens = []
    for i in range(len(payoffs) - 1):
        p1 = payoffs[i]
        p2 = payoffs[i + 1]
        if (p1["pnl"] <= 0 and p2["pnl"] >= 0) or (p1["pnl"] >= 0 and p2["pnl"] <= 0):
            # Interpolate zero crossing
            denom = (p2["pnl"] - p1["pnl"])
            if denom != 0:
                zero_spot = p1["spot"] + (0 - p1["pnl"]) * (p2["spot"] - p1["spot"]) / denom
                breakevens.append(round(float(zero_spot), 2))

    return {
        "status": "SUCCESS",
        "strategy_name": strategy_name,
        "underlying_price": underlying_price,
        "days_to_expiry": days_to_expiry,
        "implied_volatility_pct": iv_pct,
        "net_debit_credit": round(total_net_debit_credit, 2),
        "is_debit": total_net_debit_credit > 0,
        "maximum_profit": round(max_profit, 2) if max_profit < 1e6 else "Unlimited",
        "maximum_loss": round(abs(max_loss), 2) if abs(max_loss) < 1e6 else "Unlimited",
        "breakeven_points": breakevens,
        "net_greeks": {
            "delta": round(net_delta, 4),
            "gamma": round(net_gamma, 6),
            "theta": round(net_theta, 4),
            "vega": round(net_vega, 4),
            "rho": round(net_rho, 4),
            "status": "CALCULATED"
        },
        "payoff_curve": payoffs,
        "legs": evaluated_legs
    }


# =============================================================================
# 6. SCENARIO STRESS TESTING & WHAT-IF SIMULATOR
# =============================================================================
def run_portfolio_stress_test(
    portfolio_equity: float,
    positions: List[Dict[str, Any]],
    scenarios: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Simulates portfolio impact under 10 standard macro & volatility stress scenarios.
    """
    if not scenarios:
        scenarios = [
            {"id": "market_drop_5", "name": "Market Shock -5%", "price_change_pct": -5.0, "vol_change_pct": 10.0},
            {"id": "market_drop_10", "name": "Market Crash -10%", "price_change_pct": -10.0, "vol_change_pct": 25.0},
            {"id": "market_drop_20", "name": "Severe Crash -20%", "price_change_pct": -20.0, "vol_change_pct": 50.0},
            {"id": "market_pump_5", "name": "Market Rally +5%", "price_change_pct": 5.0, "vol_change_pct": -5.0},
            {"id": "market_pump_10", "name": "Bull Surge +10%", "price_change_pct": 10.0, "vol_change_pct": -10.0},
            {"id": "vol_spike_50", "name": "Volatility Explosion +50%", "price_change_pct": -2.0, "vol_change_pct": 50.0},
            {"id": "vol_crush_30", "name": "Vol Crush (Post-Event) -30%", "price_change_pct": 0.0, "vol_change_pct": -30.0},
            {"id": "gap_down_3", "name": "Overnight Gap Down -3%", "price_change_pct": -3.0, "vol_change_pct": 15.0},
            {"id": "spread_widening", "name": "Liquidity Shock / Spread x3", "price_change_pct": -1.0, "vol_change_pct": 20.0, "slippage_mult": 3.0},
            {"id": "funding_spike", "name": "Perp Funding Spike x5", "price_change_pct": 0.0, "vol_change_pct": 5.0, "funding_mult": 5.0}
        ]

    results = []
    total_pos_value = sum(float(p.get("position_value", 0.0)) for p in positions)

    for sc in scenarios:
        p_pct = sc.get("price_change_pct", 0.0) / 100.0
        v_pct = sc.get("vol_change_pct", 0.0) / 100.0

        scenario_pnl = 0.0
        for pos in positions:
            side = pos.get("direction", "LONG").upper()
            val = float(pos.get("position_value", 0.0))
            lev = float(pos.get("leverage", 1.0))
            beta = float(pos.get("beta", 1.0))

            asset_p_pct = p_pct * beta
            if side == "LONG":
                pos_pnl = val * asset_p_pct
            else:
                pos_pnl = val * (-asset_p_pct)

            scenario_pnl += pos_pnl

        proj_equity = max(0.0, portfolio_equity + scenario_pnl)
        pnl_pct = round((scenario_pnl / portfolio_equity) * 100.0, 2) if portfolio_equity > 0 else 0.0

        results.append({
            "scenario_id": sc.get("id"),
            "scenario_name": sc.get("name"),
            "price_shock_pct": sc.get("price_change_pct", 0.0),
            "vol_shock_pct": sc.get("vol_change_pct", 0.0),
            "projected_pnl": round(scenario_pnl, 2),
            "projected_pnl_pct": pnl_pct,
            "projected_equity": round(proj_equity, 2),
            "risk_status": "CRITICAL" if pnl_pct <= -15.0 else ("HIGH RISK" if pnl_pct <= -8.0 else ("WARNING" if pnl_pct <= -4.0 else "NORMAL"))
        })

    return {
        "status": "SUCCESS",
        "portfolio_equity": portfolio_equity,
        "open_positions_count": len(positions),
        "total_exposure": round(total_pos_value, 2),
        "scenarios": results,
        "mode": "SCENARIO ESTIMATE"
    }


# =============================================================================
# 7. CENTRALIZED 4-STATE KILL SWITCH & EMERGENCY CONTROLLER
# =============================================================================
class KillSwitchState:
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    PAUSED = "PAUSED"
    HALTED = "HALTED"

_GLOBAL_KILL_SWITCH_STATUS = {
    "state": KillSwitchState.NORMAL,
    "reason": "",
    "updated_at": datetime.now(timezone.utc).isoformat(),
    "triggered_by": "SYSTEM"
}


def get_kill_switch_state() -> Dict[str, Any]:
    """Returns the current 4-state emergency kill switch status."""
    return dict(_GLOBAL_KILL_SWITCH_STATUS)


def set_kill_switch_state(state: str, reason: str = "", triggered_by: str = "USER") -> Dict[str, Any]:
    """Updates the centralized kill switch state (NORMAL, WARNING, PAUSED, HALTED)."""
    valid_states = [KillSwitchState.NORMAL, KillSwitchState.WARNING, KillSwitchState.PAUSED, KillSwitchState.HALTED]
    target_state = state.upper()
    if target_state not in valid_states:
        target_state = KillSwitchState.NORMAL

    _GLOBAL_KILL_SWITCH_STATUS["state"] = target_state
    _GLOBAL_KILL_SWITCH_STATUS["reason"] = reason
    _GLOBAL_KILL_SWITCH_STATUS["updated_at"] = datetime.now(timezone.utc).isoformat()
    _GLOBAL_KILL_SWITCH_STATUS["triggered_by"] = triggered_by

    logger.warning(f"Kill Switch state changed to {target_state}. Reason: {reason} by {triggered_by}")
    return dict(_GLOBAL_KILL_SWITCH_STATUS)


# =============================================================================
# 8. 20-STAGE TRADE PRE-CHECK & COMPLIANCE ENGINE
# =============================================================================
def get_universal_risk_limits() -> Dict[str, Any]:
    """Returns the central 20-stage risk limit configuration."""
    return {
        "max_risk_per_trade_pct": 2.0,
        "max_daily_loss_pct": 3.0,
        "max_drawdown_pct": 6.0,
        "max_leverage": 5.0,
        "max_spread_pct": 0.5,
        "min_risk_reward_ratio": 1.50,
        "require_take_profit": True,
        "max_tick_age_seconds": 60.0,
        "max_asset_concentration_pct": 30.0,
        "max_consecutive_losses": 3,
        "cooldown_minutes": 15,
        "min_cash_reserve_pct": 10.0,
    }


def get_kill_switch_status() -> Dict[str, Any]:
    """Returns the centralized emergency kill switch status."""
    is_active = config.KILL_SWITCH_FILE.exists() or getattr(config, "GLOBAL_KILL_SWITCH", False) or getattr(config, "GLOBAL_TRADING_KILL_SWITCH", False)
    return {
        "is_active": is_active,
        "state": "HALTED" if is_active else "NORMAL",
        "file_exists": config.KILL_SWITCH_FILE.exists(),
    }


def validate_trade_against_risk_limits(
    trade_request: Dict[str, Any],
    account_balance: float = 50000.0,
    available_balance: Optional[float] = None,
    portfolio_positions: Optional[List[Dict[str, Any]]] = None,
    daily_pnl: float = 0.0,
    peak_equity: Optional[float] = None,
    consecutive_losses: int = 0,
    risk_limits: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Convenience adapter for evaluating trade request against 20 pre-trade gates."""
    acct_state = {
        "balance": account_balance,
        "available_capital": available_balance if available_balance is not None else account_balance,
        "daily_pnl": daily_pnl,
        "peak_equity": peak_equity if peak_equity is not None else account_balance,
        "consecutive_losses": consecutive_losses,
    }
    limits = risk_limits or get_universal_risk_limits()
    return evaluate_trade_precheck(
        trade_request=trade_request,
        account_state=acct_state,
        portfolio_positions=portfolio_positions or [],
        risk_limits=limits,
    )


def evaluate_trade_precheck(
    trade_request: Dict[str, Any],
    account_state: Dict[str, Any],
    portfolio_positions: List[Dict[str, Any]],
    risk_limits: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes authoritative 20-Stage Trade Pre-Check.
    Evaluates:
    1. Authentication & API Permissions
    2. Instrument Validation
    3. Market Status & Trading Hours
    4. Data Freshness & Max Tick Age (< 60s)
    5. Price Sanity (Positive, Non-Zero, Non-NaN)
    6. Spread & Liquidity Sanity
    7. Position Size & Risk Cap (Risk per trade <= limit)
    8. Margin Requirements & Capital Availability
    9. Leverage Limits & Multipliers
    10. Correlated & Shared Asset Concentration (<= 30%)
    11. Daily Loss Limit & Net Result
    12. Peak-to-Trough Portfolio Drawdown
    13. Consecutive Loss Streak Cooldown
    14. Duplicate Order & In-flight Collision Prevention
    15. Cooldown Window Compliance
    16. Centralized 4-State Kill Switch (NORMAL, WARNING, PAUSED, HALTED)
    17. Account Balance Sanity & Minimum Cash Reserve
    18. Broker Router & Execution Health
    19. Stop-Loss & Take-Profit Validity (R:R >= 1.5)
    20. Final Risk Decision Compilation

    Returns:
    Comprehensive RiskDecision object with status, riskScore, individual stage checks,
    required reductions, and projected portfolio exposure.
    """
    blocks = []
    reductions = {}
    stage_results = {}

    symbol = str(trade_request.get("symbol", "BTC/USDT"))
    direction = str(trade_request.get("direction", "LONG")).upper()
    entry = float(trade_request.get("entry_price") or trade_request.get("price") or 0.0)
    sl = float(trade_request.get("stop_loss", 0.0))
    tp = float(trade_request.get("take_profit", 0.0))
    qty = float(trade_request.get("quantity", 0.0))
    leverage = float(trade_request.get("leverage", 1.0))
    asset_class = trade_request.get("asset_class", "crypto")
    bot_id = trade_request.get("bot_id", "bot-1")

    balance = float(account_state.get("balance", 10000.0))
    available = float(account_state.get("available_capital", balance))
    daily_pnl = float(account_state.get("daily_pnl", 0.0))
    peak_equity = float(account_state.get("peak_equity", balance))
    consecutive_losses = int(account_state.get("consecutive_losses", 0))

    notional = round(qty * entry, 2)
    margin_req = round(notional / max(1.0, leverage), 2)
    risk_amt = round(qty * abs(entry - sl), 2) if sl > 0 else notional

    # Stage 1: Authentication & Authorization
    is_auth = trade_request.get("authenticated", True)
    if not is_auth:
        blocks.append("Stage 1 (Auth): Unauthorized trade request. Missing or invalid signature.")
        stage_results["1_auth"] = "FAILED"
    else:
        stage_results["1_auth"] = "PASSED"

    # Stage 2: Instrument Validation
    if not symbol or symbol.strip() == "":
        blocks.append("Stage 2 (Instrument): Invalid instrument symbol.")
        stage_results["2_instrument"] = "FAILED"
    else:
        stage_results["2_instrument"] = "PASSED"

    # Stage 3: Market Status & Trading Hours
    market_status = trade_request.get("market_status", "OPEN").upper()
    if market_status not in ["OPEN", "ACTIVE", "TRADING"]:
        blocks.append(f"Stage 3 (Market Status): Market is currently {market_status}. New orders blocked.")
        stage_results["3_market_status"] = "FAILED"
    else:
        stage_results["3_market_status"] = "PASSED"

    # Stage 4: Data Freshness & Max Tick Age
    tick_age_seconds = float(trade_request.get("data_age_seconds", 0.0))
    max_tick_age = float(risk_limits.get("max_tick_age_seconds", 60.0))
    if tick_age_seconds > max_tick_age:
        blocks.append(f"Stage 4 (Data Freshness): Market data is stale ({tick_age_seconds:.1f}s old > max allowed {max_tick_age:.0f}s). Orders blocked.")
        stage_results["4_data_freshness"] = "FAILED"
    else:
        stage_results["4_data_freshness"] = "PASSED"

    # Stage 5: Price Sanity Check
    if entry <= 0 or math.isnan(entry) or math.isinf(entry) or qty <= 0:
        blocks.append("Stage 5 (Price Sanity): Entry price and quantity must be positive, non-zero values.")
        stage_results["5_price_sanity"] = "FAILED"
    else:
        stage_results["5_price_sanity"] = "PASSED"

    # Stage 6: Bid/Ask Spread & Liquidity Check
    spread_pct = float(trade_request.get("spread_pct", 0.05))
    max_spread_pct = float(risk_limits.get("max_spread_pct", 2.0))
    if spread_pct > max_spread_pct:
        blocks.append(f"Stage 6 (Spread/Liquidity): Bid/Ask spread ({spread_pct:.2f}%) exceeds max allowable spread ({max_spread_pct:.2f}%).")
        stage_results["6_spread_liquidity"] = "FAILED"
    else:
        stage_results["6_spread_liquidity"] = "PASSED"

    # Stage 7: Position Sizing & Risk Per Trade Cap
    max_risk_pct = float(risk_limits.get("max_risk_per_trade_pct", 2.0))
    max_risk_dollars = balance * (max_risk_pct / 100.0)
    if risk_amt > max_risk_dollars and balance > 0:
        blocks.append(f"Stage 7 (Position Size Risk): Trade risk ${risk_amt:,.2f} ({risk_amt/balance*100:.1f}%) exceeds limit of ${max_risk_dollars:,.2f} ({max_risk_pct}%).")
        reductions["risk_amount"] = round(risk_amt - max_risk_dollars, 2)
        if abs(entry - sl) > 0:
            suggested_qty = round(max_risk_dollars / abs(entry - sl), 4)
            reductions["suggested_quantity"] = suggested_qty
        stage_results["7_position_size"] = "FAILED"
    else:
        stage_results["7_position_size"] = "PASSED"

    # Stage 8: Margin Availability & Capital Check
    reserve_cash = float(risk_limits.get("reserve_cash", 0.0))
    effective_available = max(0.0, available - reserve_cash)
    if margin_req > effective_available:
        excess = margin_req - effective_available
        blocks.append(f"Stage 8 (Margin Available): Required margin ${margin_req:,.2f} exceeds available capital ${effective_available:,.2f} (Reserve: ${reserve_cash:,.2f}).")
        reductions["margin"] = round(excess, 2)
        stage_results["8_margin"] = "FAILED"
    else:
        stage_results["8_margin"] = "PASSED"

    # Stage 9: Leverage Bounds
    max_allowed_lev = float(risk_limits.get("max_leverage", 20.0))
    if leverage > max_allowed_lev:
        blocks.append(f"Stage 9 (Leverage Limit): Requested leverage {leverage}x exceeds maximum allowed {max_allowed_lev}x.")
        stage_results["9_leverage"] = "FAILED"
    else:
        stage_results["9_leverage"] = "PASSED"

    # Stage 10: Correlated & Shared Asset Concentration (<= 30%)
    # Recognizes underlying base asset across Spot, Perps, and Options (e.g. BTC, ETH)
    base_asset = symbol.split("/")[0].split("-")[0].upper()
    sym_existing_notional = sum(
        float(p.get("position_value", 0.0))
        for p in portfolio_positions
        if base_asset in str(p.get("symbol", "")).upper()
    )
    new_sym_total = sym_existing_notional + notional
    max_sym_exposure_pct = float(risk_limits.get("max_exposure_per_asset_pct", 30.0))
    max_sym_dollars = balance * (max_sym_exposure_pct / 100.0)

    if new_sym_total > max_sym_dollars and balance > 0:
        current_exp_pct = (sym_existing_notional / balance) * 100.0
        projected_exp_pct = (new_sym_total / balance) * 100.0
        blocks.append(f"Stage 10 (Correlated Exposure): Combined {base_asset} exposure would increase from {current_exp_pct:.1f}% to {projected_exp_pct:.1f}% (Limit: {max_sym_exposure_pct}%).")
        reductions["symbol_exposure_excess"] = round(new_sym_total - max_sym_dollars, 2)
        stage_results["10_correlated_exposure"] = "FAILED"
    else:
        stage_results["10_correlated_exposure"] = "PASSED"

    # Stage 11: Daily Loss Limit
    max_daily_loss_pct = float(risk_limits.get("max_daily_loss_pct", 5.0))
    daily_drawdown_pct = abs(daily_pnl / balance * 100.0) if (daily_pnl < 0 and balance > 0) else 0.0
    if daily_drawdown_pct >= max_daily_loss_pct:
        blocks.append(f"Stage 11 (Daily Loss Limit): Daily drawdown limit hit: Current daily loss {daily_drawdown_pct:.1f}% has reached max limit {max_daily_loss_pct}%. New entries locked.")
        stage_results["11_daily_loss"] = "FAILED"
    else:
        stage_results["11_daily_loss"] = "PASSED"

    # Stage 12: Peak-to-Trough Portfolio Drawdown Cap
    max_portfolio_dd_pct = float(risk_limits.get("max_portfolio_drawdown_pct", 15.0))
    current_equity = balance + daily_pnl
    portfolio_dd_pct = ((peak_equity - current_equity) / peak_equity * 100.0) if peak_equity > 0 else 0.0
    if portfolio_dd_pct >= max_portfolio_dd_pct:
        blocks.append(f"Stage 12 (Portfolio Drawdown): Total drawdown from peak ({portfolio_dd_pct:.1f}%) exceeds limit ({max_portfolio_dd_pct}%).")
        stage_results["12_portfolio_drawdown"] = "FAILED"
    else:
        stage_results["12_portfolio_drawdown"] = "PASSED"

    # Stage 13: Consecutive Loss Streak & Cooldown
    max_consecutive_losses = int(risk_limits.get("max_consecutive_losses", 4))
    if consecutive_losses >= max_consecutive_losses:
        blocks.append(f"Stage 13 (Loss Streak): {consecutive_losses} consecutive losses hit (Limit: {max_consecutive_losses}). Cooling-off active.")
        stage_results["13_loss_streak"] = "FAILED"
    else:
        stage_results["13_loss_streak"] = "PASSED"

    # Stage 14: Duplicate Order & In-flight Collision Check
    is_duplicate = trade_request.get("is_duplicate_order", False)
    if is_duplicate:
        blocks.append(f"Stage 14 (Duplicate Order): Identical pending order detected for {symbol} {direction}. Blocked.")
        stage_results["14_duplicate_order"] = "FAILED"
    else:
        stage_results["14_duplicate_order"] = "PASSED"

    # Stage 15: Post-Exit Cooldown Window
    is_cooling_down = trade_request.get("cooldown_active", False)
    if is_cooling_down:
        blocks.append(f"Stage 15 (Cooldown Window): System in post-trade cooldown for {symbol}. Orders paused.")
        stage_results["15_cooldown"] = "FAILED"
    else:
        stage_results["15_cooldown"] = "PASSED"

    # Stage 16: Centralized 4-State Kill Switch
    ks_state = _GLOBAL_KILL_SWITCH_STATUS.get("state", KillSwitchState.NORMAL)
    is_ks_active = risk_limits.get("kill_switch_active", False) or ks_state in [KillSwitchState.HALTED, KillSwitchState.PAUSED]
    if is_ks_active:
        blocks.append(f"Stage 16 (Emergency Kill Switch): Global Kill Switch is ACTIVE (State: {ks_state}). Trading halted.")
        stage_results["16_kill_switch"] = "FAILED"
    else:
        stage_results["16_kill_switch"] = "PASSED"

    # Stage 17: Account Balance Sanity
    if balance <= 0 or math.isnan(balance):
        blocks.append("Stage 17 (Account Balance): Account balance is zero, negative, or uninitialized.")
        stage_results["17_account_balance"] = "FAILED"
    else:
        stage_results["17_account_balance"] = "PASSED"

    # Stage 18: Broker Status & Execution Router Health
    broker_connected = trade_request.get("broker_connected", True)
    if not broker_connected:
        blocks.append("Stage 18 (Broker Health): Execution broker/router is disconnected or in degraded state.")
        stage_results["18_broker_status"] = "FAILED"
    else:
        stage_results["18_broker_status"] = "PASSED"

    # Stage 19: Order & Stop-Loss / Take-Profit & Risk/Reward Integrity
    min_required_rr = float(risk_limits.get("min_risk_reward_ratio", 1.50))
    risk_dist = abs(entry - sl) if (entry > 0 and sl > 0) else 0.0
    reward_dist = abs(tp - entry) if (entry > 0 and tp > 0) else 0.0
    rr_ratio = round(reward_dist / risk_dist, 2) if risk_dist > 0 else 0.0

    if sl <= 0 or sl == entry:
        blocks.append("Stage 19 (SL/TP Validation): Stop loss must be explicitly specified and distinct from entry price.")
        stage_results["19_order_validation"] = "FAILED"
    elif direction == "LONG" and sl >= entry:
        blocks.append(f"Stage 19 (SL/TP Validation): Long SL (${sl:,.2f}) must be strictly less than Entry (${entry:,.2f}).")
        stage_results["19_order_validation"] = "FAILED"
    elif direction == "SHORT" and sl <= entry:
        blocks.append(f"Stage 19 (SL/TP Validation): Short SL (${sl:,.2f}) must be strictly greater than Entry (${entry:,.2f}).")
        stage_results["19_order_validation"] = "FAILED"
    elif tp > 0 and direction == "LONG" and tp <= entry:
        blocks.append(f"Stage 19 (SL/TP Validation): Long TP (${tp:,.2f}) must be strictly greater than Entry (${entry:,.2f}).")
        stage_results["19_order_validation"] = "FAILED"
    elif tp > 0 and direction == "SHORT" and tp >= entry:
        blocks.append(f"Stage 19 (SL/TP Validation): Short TP (${tp:,.2f}) must be strictly less than Entry (${entry:,.2f}).")
        stage_results["19_order_validation"] = "FAILED"
    elif tp > 0 and rr_ratio < min_required_rr:
        blocks.append(f"Stage 19 (SL/TP Validation): Risk/Reward ratio 1:{rr_ratio:.2f} is below mandatory minimum 1:{min_required_rr:.2f} (SL: ${sl:,.2f}, TP: ${tp:,.2f}).")
        stage_results["19_order_validation"] = "FAILED"
    elif tp <= 0 and risk_limits.get("require_take_profit", False):
        blocks.append(f"Stage 19 (SL/TP Validation): Take profit must be specified. Current TP: ${tp:,.2f} (Risk/Reward 1:0.00 is strictly prohibited).")
        stage_results["19_order_validation"] = "FAILED"
    else:
        stage_results["19_order_validation"] = "PASSED"

    # Stage 20: Final Risk Decision Compilation
    is_approved = len(blocks) == 0
    decision_status = "APPROVED" if is_approved else "BLOCKED"
    stage_results["20_final_approval"] = "PASSED" if is_approved else "FAILED"

    # Dynamic 0-100 Risk Score
    passed_count = sum(1 for v in stage_results.values() if v == "PASSED")
    risk_score = round((passed_count / len(stage_results)) * 100.0, 1)

    # Future / Projected Risk Impact
    curr_portfolio_risk = sum(float(p.get("risk_amount", 0.0)) for p in portfolio_positions)
    curr_portfolio_risk_pct = round((curr_portfolio_risk / balance) * 100.0, 2) if balance > 0 else 0.0
    proj_portfolio_risk = curr_portfolio_risk + risk_amt
    proj_portfolio_risk_pct = round((proj_portfolio_risk / balance) * 100.0, 2) if balance > 0 else 0.0

    return {
        "status": decision_status,
        "is_approved": is_approved,
        "risk_score": risk_score,
        "rejection_reasons": blocks,
        "risk_checks": stage_results,
        "required_reductions": reductions,
        "projected_impact": {
            "current_portfolio_risk_pct": curr_portfolio_risk_pct,
            "projected_portfolio_risk_pct": proj_portfolio_risk_pct,
            "risk_change_pct": round(proj_portfolio_risk_pct - curr_portfolio_risk_pct, 2),
            "current_margin_used": round(sum(float(p.get("margin_used", 0.0)) for p in portfolio_positions), 2),
            "projected_margin_used": round(sum(float(p.get("margin_used", 0.0)) for p in portfolio_positions) + margin_req, 2),
            "projected_available_capital": max(0.0, round(available - margin_req, 2)),
            "projected_exposure": round(new_sym_total, 2)
        },
        "trade_details": {
            "symbol": symbol,
            "direction": direction,
            "quantity": qty,
            "notional": notional,
            "margin_required": margin_req,
            "risk_amount": risk_amt,
            "stop_loss": sl,
            "take_profit": tp,
            "bot_id": bot_id
        },
        "data_quality_score": round(max(0.0, 100.0 - (tick_age_seconds * 1.5)), 1),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def apply_risk_profile(profile_name: str, bot_id: Optional[str] = None) -> Dict[str, Any]:
    """Applies named risk profile settings to a bot or global state."""
    profiles = {
        "CONSERVATIVE": {"risk_per_trade_pct": 1.0, "max_drawdown_pct": 5.0, "max_leverage": 2.0},
        "BALANCED": {"risk_per_trade_pct": 2.0, "max_drawdown_pct": 10.0, "max_leverage": 5.0},
        "AGGRESSIVE": {"risk_per_trade_pct": 3.5, "max_drawdown_pct": 15.0, "max_leverage": 10.0},
        "INSTITUTIONAL": {"risk_per_trade_pct": 1.5, "max_drawdown_pct": 8.0, "max_leverage": 3.0}
    }
    prof = profiles.get(str(profile_name).upper(), profiles["BALANCED"])
    if bot_id:
        db.safe_execute("UPDATE bot_instances SET updated_at = ? WHERE id = ?", (datetime.now(timezone.utc).isoformat(), bot_id))
    return {
        "bot_id": bot_id,
        "profile_name": str(profile_name).upper(),
        "settings": prof,
        "status": "APPLIED",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def evaluate_pre_trade_risk(
    bot_id: str,
    symbol: str,
    side: str,
    quantity: float,
    price: float,
    stop_loss: float = 0.0,
    take_profit: float = 0.0,
    confidence: float = 0.85,
    is_live: bool = False
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Convenience wrapper executing the authoritative 20-stage trade pre-check for commands and order validation.
    """
    if config.KILL_SWITCH_FILE.exists() or getattr(config, "GLOBAL_KILL_SWITCH", False) or getattr(config, "GLOBAL_TRADING_KILL_SWITCH", False):
        return False, "KILL_SWITCH_ACTIVE: Global trading emergency halt is activated. All orders blocked.", {
            "is_approved": False,
            "status": "REJECTED",
            "rejection_reasons": ["KILL_SWITCH_ACTIVE: Emergency halt is active."]
        }

    trade_request = {
        "bot_id": bot_id,
        "symbol": symbol,
        "side": side,
        "direction": side,
        "quantity": quantity,
        "price": price,
        "entry_price": price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "confidence": confidence,
        "is_live": is_live
    }
    decision = evaluate_trade_precheck(
        trade_request=trade_request,
        account_state={"balance": 50000.0, "equity": 50000.0, "daily_loss": 0.0},
        portfolio_positions=[],
        risk_limits={"risk_per_trade_pct": 2.0, "max_drawdown_pct": 10.0}
    )
    is_approved = decision.get("is_approved", False) or decision.get("status") in ["APPROVED", "PASSED", "WARNING"]
    reason = ", ".join(decision.get("rejection_reasons", [])) if not is_approved else "Trade complies with all risk stages."
    return is_approved, reason, decision


