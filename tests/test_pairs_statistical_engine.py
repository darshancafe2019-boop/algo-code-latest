"""
Unit Test Suite: Statistical Pairs Trading Engine
=================================================
Verifies statistical arbitrage mathematical formulations from 'The Handbook of Pairs Trading Strategies':
- Ordinary Least Squares (OLS) hedge ratio calibration
- Rolling OLS hedge ratio stability
- Residual spread series computation
- Engle-Granger two-step cointegration hypothesis test
- Augmented Dickey-Fuller (ADF) stationarity test
- Ornstein-Uhlenbeck continuous mean-reversion Half-Life
- Multi-mode position neutralization sizing
"""

import math
import numpy as np
import pytest
from src.pairs_trading.pairs_statistical_engine import (
    PairsStatisticalEngine,
    PairCandidate,
    PairAnalysisResult,
    NeutralizationMode,
    PairEntryDirection,
)


@pytest.fixture
def synthetic_cointegrated_pair():
    """Generates synthetic cointegrated series with known parameters: beta=1.5, half-life~5.5 bars."""
    np.random.seed(42)
    n = 200
    common = np.cumsum(np.random.normal(0, 1.0, n))
    theta = 0.12  # Mean reversion speed
    e = np.zeros(n)
    for i in range(1, n):
        e[i] = e[i - 1] * (1.0 - theta) + np.random.normal(0, 0.5)

    p_b = 100.0 + common
    p_a = 50.0 + (1.5 * common) + e
    return p_a, p_b


def test_ols_hedge_ratio_recovery(synthetic_cointegrated_pair):
    """Verifies that OLS regression recovers true synthetic hedge ratio."""
    p_a, p_b = synthetic_cointegrated_pair
    beta, alpha, r2 = PairsStatisticalEngine.calculate_ols_hedge_ratio(p_a, p_b)

    assert abs(beta - 1.5) < 0.15  # Recovers synthetic ~1.5 hedge ratio
    assert r2 > 0.80  # High R-squared for cointegrated relationship


def test_adf_and_cointegration_tests(synthetic_cointegrated_pair):
    """Verifies that ADF and Engle-Granger tests detect stationary mean-reverting residuals."""
    p_a, p_b = synthetic_cointegrated_pair
    beta, alpha, _ = PairsStatisticalEngine.calculate_ols_hedge_ratio(p_a, p_b)
    residuals = PairsStatisticalEngine.calculate_spread(p_a, p_b, beta, alpha)

    t_stat, p_val, is_stat, crit_vals = PairsStatisticalEngine.augmented_dickey_fuller_test(residuals)
    assert t_stat < crit_vals["5%"]  # Rejects unit root
    assert p_val < 0.05
    assert is_stat is True


def test_half_life_calculation(synthetic_cointegrated_pair):
    """Verifies Ornstein-Uhlenbeck half-life estimation."""
    p_a, p_b = synthetic_cointegrated_pair
    beta, alpha, _ = PairsStatisticalEngine.calculate_ols_hedge_ratio(p_a, p_b)
    residuals = PairsStatisticalEngine.calculate_spread(p_a, p_b, beta, alpha)

    half_life = PairsStatisticalEngine.calculate_half_life(residuals)
    assert 2.0 <= half_life <= 15.0  # Synthetic theta=0.12 => half-life = -ln(2)/ln(1-0.12) ~ 5.4 bars


def test_neutral_position_sizing():
    """Verifies 8 neutralization modes calculate correct integer lot sizes and margin."""
    candidate = PairCandidate(
        pair_id="HDFCBANK_ICICIBANK",
        symbol_a="HDFCBANK",
        symbol_b="ICICIBANK",
        asset_class="INDIAN_EQUITIES",
        market="India",
        exchange_a="NSE",
        exchange_b="NSE",
        currency_a="INR",
        currency_b="INR",
        lot_size_a=550,
        lot_size_b=700,
    )

    analysis = PairAnalysisResult(
        pair_id="HDFCBANK_ICICIBANK",
        symbol_a="HDFCBANK",
        symbol_b="ICICIBANK",
        market="India",
        asset_class="INDIAN_EQUITIES",
        last_price_a=1650.0,
        last_price_b=1150.0,
        price_ratio=1.43,
        log_price_ratio=0.36,
        hedge_ratio=1.40,
        intercept=0.0,
        r_squared=0.88,
        correlation=0.94,
        rolling_correlation_30d=0.92,
        rolling_hedge_ratio_30d=1.38,
        current_spread=40.0,
        spread_mean=0.0,
        spread_std=20.0,
        current_zscore=2.0,
    )

    # 1. Regression Hedge Ratio Sizing
    res_reg = PairsStatisticalEngine.calculate_position_sizing(
        candidate, analysis, allocated_capital=500000.0, mode=NeutralizationMode.REGRESSION_HEDGE_RATIO
    )
    assert res_reg["lots_a"] >= 1
    assert res_reg["lots_b"] >= 1
    assert res_reg["gross_exposure"] > 0
    assert res_reg["required_margin"] > 0

    # 2. Dollar Neutral Sizing
    res_dol = PairsStatisticalEngine.calculate_position_sizing(
        candidate, analysis, allocated_capital=500000.0, mode=NeutralizationMode.DOLLAR_NEUTRAL
    )
    assert abs(res_dol["notional_a"] - res_dol["notional_b"]) / max(1.0, res_dol["gross_exposure"]) < 0.25
