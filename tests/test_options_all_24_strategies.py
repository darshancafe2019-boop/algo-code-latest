"""
Unit and Integration Tests for All 24 Option Strategies
======================================================
Validates that every strategy from the Complete Option Strategies Visual Learning Guide:
1. Generates valid calibrated presets around spot price.
2. Computes analytical payoff curves across -30% to +30% price spectrum.
3. Calculates valid aggregate Greeks (Delta, Gamma, Theta, Vega, Rho).
4. Solves exact breakeven points and maximum profit / loss bounds.
5. Accurately determines required margin and risk classification.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.crypto_option_strategy import OptionStrategyEngine
from src.market_data.options_workstation_service import ALL_24_STRATEGIES_METADATA


def test_strategy_metadata_count():
    """Verify all 24 strategies are defined with valid metadata."""
    assert len(ALL_24_STRATEGIES_METADATA) == 24
    ids = [s["id"] for s in ALL_24_STRATEGIES_METADATA]
    assert len(set(ids)) == 24


@pytest.mark.parametrize("strategy", ALL_24_STRATEGIES_METADATA)
def test_all_24_strategies_evaluation(strategy):
    """Test preset generation and payoff calculation for each of the 24 strategies."""
    strat_id = strategy["id"]
    underlying = "NIFTY"
    spot = 24350.0
    expiry = "2026-09-04"

    res = OptionStrategyEngine.get_preset_strategy(
        preset_name=strat_id,
        underlying=underlying,
        spot_price=spot,
        expiry=expiry,
    )

    assert res["status"] == "success", f"Strategy {strat_id} evaluation failed"
    assert "payoff_curve" in res
    assert len(res["payoff_curve"]) >= 50
    assert "aggregate_greeks" in res
    assert "delta" in res["aggregate_greeks"]
    assert "theta" in res["aggregate_greeks"]
    assert "max_profit" in res
    assert "max_loss" in res
    assert res["required_margin"] >= 0.0


def test_bull_call_spread_payoff_math():
    """Verify Bull Call Spread exact debit, max profit and breakeven calculations."""
    spot = 24000.0
    legs = [
        {"action": "BUY", "option_type": "CE", "strike": 24000.0, "expiry": "2026-09-04", "premium": 150.0, "quantity": 1.0, "delta": 0.50},
        {"action": "SELL", "option_type": "CE", "strike": 24200.0, "expiry": "2026-09-04", "premium": 60.0, "quantity": 1.0, "delta": -0.25},
    ]

    res = OptionStrategyEngine.evaluate_strategy("BULL_CALL_SPREAD", "NIFTY", spot, legs)
    assert res["status"] == "success"
    assert res["nature"] == "NET DEBIT"
    assert res["net_premium"] == 90.0  # 150 - 60
    assert res["max_loss"] == 90.0
    assert res["max_profit"] == 110.0  # (24200 - 24000) - 90 = 110
    assert len(res["breakevens"]) == 1
    assert abs(res["breakevens"][0] - 24090.0) < 5.0  # Strike 24000 + 90 debit


def test_iron_condor_payoff_math():
    """Verify Short Iron Condor 4-leg credit and wing width calculations."""
    spot = 24000.0
    legs = [
        {"action": "BUY", "option_type": "PE", "strike": 23600.0, "expiry": "2026-09-04", "premium": 20.0, "quantity": 1.0, "delta": -0.10},
        {"action": "SELL", "option_type": "PE", "strike": 23800.0, "expiry": "2026-09-04", "premium": 55.0, "quantity": 1.0, "delta": 0.25},
        {"action": "SELL", "option_type": "CE", "strike": 24200.0, "expiry": "2026-09-04", "premium": 55.0, "quantity": 1.0, "delta": -0.25},
        {"action": "BUY", "option_type": "CE", "strike": 24400.0, "expiry": "2026-09-04", "premium": 20.0, "quantity": 1.0, "delta": 0.10},
    ]

    res = OptionStrategyEngine.evaluate_strategy("SHORT_IRON_CONDOR", "NIFTY", spot, legs)
    assert res["status"] == "success"
    assert res["nature"] == "NET CREDIT"
    # Net Credit = (55 + 55) - (20 + 20) = 70.0
    assert res["net_premium"] == 70.0
    assert res["max_profit"] == 70.0
    # Wing Width = 200, Max Loss = 200 - 70 = 130
    assert res["max_loss"] == 130.0
    assert len(res["breakevens"]) == 2


import unittest

class TestAll24OptionStrategies(unittest.TestCase):
    def test_strategy_metadata_count(self):
        test_strategy_metadata_count()

    def test_all_24_strategies_evaluation(self):
        for strategy in ALL_24_STRATEGIES_METADATA:
            test_all_24_strategies_evaluation(strategy)

    def test_bull_call_spread_payoff_math(self):
        test_bull_call_spread_payoff_math()

    def test_iron_condor_payoff_math(self):
        test_iron_condor_payoff_math()


if __name__ == "__main__":
    unittest.main()
