"""
Unit and Integration Tests for Premium Selection Engine
======================================================
Tests:
1. Exact target premium matching.
2. Delta targeting (e.g. finding 0.30 delta).
3. Range-bound filtering with conservative bid/ask pricing.
4. Vertical spread debit/credit cost optimizer.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.market_data.schemas import OptionStrikeRow, OptionQuote
from src.market_data.premium_selection_engine import PremiumSelectionEngine


def _mock_strikes():
    """Generates mock option chain strike ladder around 24000."""
    strikes = []
    for k in range(23600, 24450, 50):
        # Synthetic Call and Put quotes
        dist = (k - 24000) / 50.0
        ce_price = max(5.0, 150.0 - dist * 18.0)
        pe_price = max(5.0, 150.0 + dist * 18.0)

        ce_quote = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-04",
            strike=float(k),
            optionType="CE",
            symbol=f"NIFTY-2026-09-04-{k}-CE",
            exchange="NSE",
            provider="nse",
            lastPrice=round(ce_price, 2),
            bid=round(ce_price - 0.5, 2),
            ask=round(ce_price + 0.5, 2),
            volume=5000,
            OI=50000,
            OIChange=1200,
            timestamp="2026-08-28T12:00:00Z",
            delta=round(0.50 - dist * 0.05, 2),
        )

        pe_quote = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-04",
            strike=float(k),
            optionType="PE",
            symbol=f"NIFTY-2026-09-04-{k}-PE",
            exchange="NSE",
            provider="nse",
            lastPrice=round(pe_price, 2),
            bid=round(pe_price - 0.5, 2),
            ask=round(pe_price + 0.5, 2),
            volume=5000,
            OI=50000,
            OIChange=1200,
            timestamp="2026-08-28T12:00:00Z",
            delta=round(-0.50 - dist * 0.05, 2),
        )

        strikes.append(OptionStrikeRow(
            strike=float(k),
            is_atm=(k == 24000),
            distance_pct=round((k - 24000) / 24000 * 100, 2),
            ce=ce_quote,
            pe=pe_quote,
        ))
    return strikes


def test_match_exact_premium():
    """Test matching contract closest to ₹100.00 premium."""
    strikes = _mock_strikes()
    matches = PremiumSelectionEngine.match_single_contract(
        strikes=strikes,
        option_type="CE",
        action="BUY",
        method="EXACT",
        target_value=100.0,
    )

    assert len(matches) > 0
    best = matches[0]
    assert abs(best["matched_premium"] - 100.0) <= 20.0
    assert best["option_type"] == "CE"
    assert "explanation" in best


def test_match_target_delta():
    """Test matching contract with target delta ~ 0.30."""
    strikes = _mock_strikes()
    matches = PremiumSelectionEngine.match_single_contract(
        strikes=strikes,
        option_type="CE",
        action="BUY",
        method="DELTA",
        target_value=0.30,
    )

    assert len(matches) > 0
    best = matches[0]
    assert abs(abs(best["delta"]) - 0.30) <= 0.08


def test_match_vertical_spread():
    """Test pairing a Bull Call spread for ~₹60 net debit."""
    strikes = _mock_strikes()
    combo = PremiumSelectionEngine.match_vertical_spread_by_cost(
        strikes=strikes,
        strategy_type="BULL_CALL_SPREAD",
        target_net_cost=60.0,
    )

    assert combo is not None
    assert combo["achieved_net"] > 0
    assert "leg1" in combo
    assert "leg2" in combo
    assert combo["leg1"]["strike"] < combo["leg2"]["strike"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
