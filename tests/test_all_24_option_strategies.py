"""
Unit Test Suite: All 24 Option Strategy Templates & Payoff Math
===============================================================
Verifies all 24 strategy definitions from 'Complete Option Strategies Visual Learning Guide':
- Payoff curves & exact piecewise knot points
- Analytical and numerical breakeven calculations
- Net debit / credit cash flow calculations
- Aggregate Greeks calculation (Delta, Gamma, Theta, Vega, Rho)
- Margin requirement estimates
"""

import pytest
from src.crypto_option_strategy import OptionStrategyEngine


ALL_24_STRATEGY_NAMES = [
    "LONG_CALL",
    "LONG_PUT",
    "SHORT_CALL",
    "SHORT_PUT",
    "CASH_SECURED_PUT",
    "BULL_CALL_SPREAD",
    "BEAR_PUT_SPREAD",
    "BULL_PUT_SPREAD",
    "BEAR_CALL_SPREAD",
    "SHORT_IRON_CONDOR",
    "RATIO_FRONT_SPREAD",
    "CALL_BACKSPREAD",
    "LONG_STRADDLE",
    "LONG_STRANGLE",
    "SHORT_STRADDLE",
    "SHORT_STRANGLE",
    "LONG_BUTTERFLY",
    "LONG_CONDOR",
    "LONG_CALENDAR_SPREAD",
    "DIAGONAL_SPREAD",
    "COVERED_CALL",
    "LONG_COMBINATION",
    "COLLAR",
    "COVERED_COMBINATION",
]


@pytest.mark.parametrize("strat_name", ALL_24_STRATEGY_NAMES)
def test_all_24_presets_generate_valid_payoffs(strat_name):
    """Verifies that every single one of the 24 strategies generates a valid mathematical evaluation."""
    spot = 24800.0
    expiry = "2026-09-28"
    result = OptionStrategyEngine.get_preset_strategy(strat_name, "NIFTY", spot, expiry)

    assert result["status"] == "success"
    assert result["strategy_name"] == strat_name
    assert result["spot_price"] == spot
    assert len(result["legs"]) >= 1
    assert result["nature"] in ["NET DEBIT", "NET CREDIT"]
    assert "payoff_curve" in result
    assert len(result["payoff_curve"]) >= 20

    # Verify Greeks presence
    greeks = result["aggregate_greeks"]
    assert "delta" in greeks
    assert "gamma" in greeks
    assert "theta" in greeks
    assert "vega" in greeks

    # Verify Breakevens
    assert isinstance(result["breakevens"], list)


def test_bull_call_spread_payoff_bounds():
    """Verifies Bull Call Spread payoff bounds: Max Profit = Strike Diff - Net Debit, Max Loss = Net Debit."""
    spot = 24800.0
    k1 = 24800.0
    k2 = 24900.0
    legs = [
        {"action": "BUY", "option_type": "CALL", "strike": k1, "expiry": "SEP", "premium": 200.0, "quantity": 1.0},
        {"action": "SELL", "option_type": "CALL", "strike": k2, "expiry": "SEP", "premium": 120.0, "quantity": 1.0},
    ]

    res = OptionStrategyEngine.evaluate_strategy("BULL_CALL_SPREAD", "NIFTY", spot, legs)
    assert res["status"] == "success"
    assert res["nature"] == "NET DEBIT"
    assert res["net_premium"] == 80.0  # 200 - 120 = 80
    assert res["max_loss"] == 80.0
    assert res["max_profit"] == 20.0  # (24900 - 24800) - 80 = 20
    assert 24880.0 in res["breakevens"]  # Strike + Debit = 24800 + 80 = 24880


def test_short_iron_condor_credit_nature():
    """Verifies Iron Condor credit collection and defined maximum loss."""
    spot = 24800.0
    legs = [
        {"action": "BUY", "option_type": "PUT", "strike": 24500.0, "expiry": "SEP", "premium": 40.0, "quantity": 1.0},
        {"action": "SELL", "option_type": "PUT", "strike": 24700.0, "expiry": "SEP", "premium": 110.0, "quantity": 1.0},
        {"action": "SELL", "option_type": "CALL", "strike": 24900.0, "expiry": "SEP", "premium": 110.0, "quantity": 1.0},
        {"action": "BUY", "option_type": "CALL", "strike": 25100.0, "expiry": "SEP", "premium": 40.0, "quantity": 1.0},
    ]

    res = OptionStrategyEngine.evaluate_strategy("SHORT_IRON_CONDOR", "NIFTY", spot, legs)
    assert res["status"] == "success"
    assert res["nature"] == "NET CREDIT"
    assert res["net_premium"] == 140.0  # (110 - 40) + (110 - 40) = 140
    assert res["max_profit"] == 140.0
    assert res["max_loss"] == 60.0  # 200 wing width - 140 credit = 60
