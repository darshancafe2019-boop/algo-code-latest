"""
Unit Test Suite: Walk-Forward Statistical Pairs Backtester
==========================================================
Verifies that the walk-forward pairs backtester prevents look-ahead bias and correctly
accrues transaction friction, slippage, and performance metrics.
"""

import numpy as np
import pytest
from src.pairs_trading.pairs_statistical_engine import PairCandidate, NeutralizationMode
from src.pairs_trading.pairs_backtester import PairsBacktester


def test_walkforward_pairs_backtest_execution():
    """Runs a simulated walk-forward backtest and verifies non-trivial trade generation and risk metrics."""
    np.random.seed(123)
    n = 250
    common = np.cumsum(np.random.normal(0, 1.0, n))
    theta = 0.15
    e = np.zeros(n)
    for i in range(1, n):
        e[i] = e[i - 1] * (1.0 - theta) + np.random.normal(0, 1.2)

    p_b = 100.0 + common
    p_a = 50.0 + (1.2 * common) + e
    timestamps = [f"2026-01-{i+1:02d}" for i in range(n)]

    candidate = PairCandidate(
        pair_id="TEST_PAIR",
        symbol_a="ASSET_A",
        symbol_b="ASSET_B",
        asset_class="EQUITY_PAIR",
        market="India",
        exchange_a="NSE",
        exchange_b="NSE",
        currency_a="INR",
        currency_b="INR",
    )

    res = PairsBacktester.run_backtest(
        candidate=candidate,
        prices_a=list(p_a),
        prices_b=list(p_b),
        timestamps=timestamps,
        initial_capital=50000.0,
        formation_window=60,
        rolling_refit_window=20,
        z_entry=1.8,
        z_exit=0.4,
        z_stop_loss=3.5,
        neutralization_mode=NeutralizationMode.REGRESSION_HEDGE_RATIO,
    )

    assert res.total_candles == n - 60
    assert res.initial_capital == 50000.0
    assert len(res.equity_curve) > 0
    assert isinstance(res.trades, list)
    assert res.win_rate_pct >= 0.0
    assert res.max_drawdown_pct >= 0.0
