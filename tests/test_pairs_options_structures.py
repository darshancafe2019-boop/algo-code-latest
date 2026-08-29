"""
Unit Test Suite: Pair Options Overlays, Substitutions & Comparative Analysis
===========================================================================
Verifies options enhancements to pairs trading from 'The Handbook of Pairs Trading Strategies':
- Protective Put & Call Overlays
- Deep-ITM Option Proxies (Delta >= 0.80)
- Bull Call Spread & Bear Put Spread Substitutions
- Comparative capital requirement & scenario matrix
"""

import pytest
from src.pairs_trading.pairs_statistical_engine import (
    PairCandidate,
    PairAnalysisResult,
    PairEntryDirection,
)
from src.pairs_trading.pair_options_engine import (
    PairOptionsEngine,
    OptionOverlayType,
    OptionSubstitutionType,
)


@pytest.fixture
def sample_pair_data():
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
        current_zscore=-2.2,  # Abnormally LOW => LONG A, SHORT B
        suggested_direction=PairEntryDirection.LONG_A_SHORT_B.value,
    )

    sizing = {
        "quantity_a": 550.0,
        "quantity_b": 700.0,
        "gross_exposure": 550.0 * 1650.0 + 700.0 * 1150.0,
    }

    return candidate, analysis, sizing


def test_protective_put_overlay(sample_pair_data):
    """Verifies protective put overlay caps maximum downside tail risk."""
    candidate, analysis, sizing = sample_pair_data
    res = PairOptionsEngine.build_option_overlay(
        candidate, analysis, sizing, OptionOverlayType.PROTECTIVE_PUT_LONG_LEG, otm_pct=0.03, dte_days=30
    )

    assert res.structure_type == "PROTECTIVE_PUT_LONG_LEG"
    assert len(res.legs) == 3  # Underlying A, Underlying B, Protective Put on A
    assert res.risk_profile == "DEFINED_RISK"
    assert len(res.scenario_table) > 0


def test_deep_itm_call_proxy_substitution(sample_pair_data):
    """Verifies deep ITM call proxy replaces long equity leg with significant capital savings."""
    candidate, analysis, sizing = sample_pair_data
    res = PairOptionsEngine.build_option_substitution(
        candidate, analysis, sizing, OptionSubstitutionType.DEEP_ITM_CALL_PROXY, dte_days=45
    )

    assert res.structure_type == "DEEP_ITM_CALL_PROXY"
    assert res.capital_savings_pct > 50.0  # Significant capital reduction
    assert res.risk_profile == "DEFINED_RISK"
    assert len(res.scenario_table) > 0
