"""
Production Test Suite: Upstox NSE Options Discovery, Expiry Engine & Option Chain
==================================================================================
Validates that:
1. Upstox is the single source of truth (no hardcoded Thursdays/Tuesdays, no 8-limit cap).
2. All real expiries for NIFTY, BANKNIFTY, FINNIFTY, RELIANCE, HDFCBANK are discovered.
3. Contracts are categorized accurately (WEEKLY vs MONTHLY vs OTHER/LONG-DATED).
4. Option Chain loads with real strikes, CE/PE instruments, Greeks, and Market Intelligence.
5. Exact contract persistence retains canonical instrument_key (e.g. NSE_FO|...).
"""

import pytest
import datetime
from src.upstox_service import UpstoxService, global_upstox_service
from src.option_chain_engine import OptionChainEngine, OptionGreeksCalculator


class TestUpstoxOptionsMaster:
    """Test suite for Upstox Option Contracts and Master Discovery."""

    def test_nifty_options_discovery_and_counts(self):
        """Validates that NIFTY option contracts are discovered from Upstox master."""
        service = UpstoxService()
        contracts = service.get_option_contracts("NIFTY")
        assert len(contracts) > 500, f"Expected > 500 NIFTY contracts, got {len(contracts)}"

        sample = contracts[0]
        assert "instrument_key" in sample
        assert "strike_price" in sample
        assert sample["segment"] == "NSE_FO"
        assert sample["instrument_type"] in ["OPTIDX", "CE", "PE"]

    def test_nifty_real_expiries_extraction_and_sorting(self):
        """Validates that all real expiries are extracted, deduplicated, and sorted."""
        service = UpstoxService()
        res = service.get_option_expiries("NIFTY")
        assert res["status"] == "success"
        assert res["provider"] == "UPSTOX"
        assert res["underlying"] == "NIFTY"
        assert res["totalExpiries"] >= 10, f"Expected >= 10 expiries for NIFTY, got {res['totalExpiries']}"

        expiries = res["expiries"]
        assert len(expiries) == res["totalExpiries"]

        # Verify ascending date ordering
        iso_dates = [e["isoDate"] for e in expiries]
        assert iso_dates == sorted(iso_dates), "Expiries must be sorted in ascending order"

        # Verify nearest active expiry
        first_exp = expiries[0]
        assert first_exp["daysToExpiry"] >= 0
        assert first_exp["callCount"] > 0
        assert first_exp["putCount"] > 0
        assert first_exp["productCount"] == first_exp["callCount"] + first_exp["putCount"]

    def test_weekly_monthly_classification(self):
        """Validates that weekly and monthly contracts are correctly categorized."""
        service = UpstoxService()
        res = service.get_option_expiries("NIFTY")
        expiries = res["expiries"]

        weekly_count = sum(1 for e in expiries if e["category"] == "WEEKLY")
        monthly_count = sum(1 for e in expiries if e["category"] == "MONTHLY")
        other_count = sum(1 for e in expiries if e["category"] == "OTHER")

        assert weekly_count >= 1, "Expected at least 1 weekly expiry"
        assert monthly_count >= 1, "Expected at least 1 monthly expiry"
        assert other_count >= 1, "Expected at least 1 long-dated / other expiry"

    def test_multi_underlying_support(self):
        """Validates that BANKNIFTY, FINNIFTY, RELIANCE, and HDFCBANK options work seamlessly."""
        service = UpstoxService()
        for sym in ["BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "RELIANCE", "HDFCBANK"]:
            res = service.get_option_expiries(sym)
            assert res["status"] == "success"
            assert res["totalExpiries"] >= 1, f"Expected expiries for {sym}"
            assert res["underlying"] == sym
            assert len(res["expiries"]) == res["totalExpiries"]
            for exp in res["expiries"]:
                assert exp["productCount"] > 0
                assert exp["firstStrike"] is not None
                assert exp["lastStrike"] is not None
                assert exp["firstStrike"] <= exp["lastStrike"]

    def test_option_chain_enrichment_and_greeks(self):
        """Validates that Option Chain returns complete strikes with Black-Scholes Greeks and Market Intelligence."""
        service = UpstoxService()
        chain = service.get_option_chain("NIFTY")
        assert chain["status"] == "success"
        assert chain["provider"] == "UPSTOX"
        assert chain["underlying"] == "NIFTY"
        assert chain["total_strikes"] > 0
        assert len(chain["strikes"]) == chain["total_strikes"]

        # Check strike row structure
        sample_strike = chain["strikes"][len(chain["strikes"]) // 2]
        assert "strike" in sample_strike
        assert "ce" in sample_strike
        assert "pe" in sample_strike
        assert "delta" in sample_strike["ce"]
        assert "gamma" in sample_strike["ce"]
        assert "theta" in sample_strike["ce"]
        assert "vega" in sample_strike["ce"]

        # Check market intelligence
        intel = chain.get("market_intelligence", {})
        assert "pcr_oi" in intel or "status" in intel

    def test_canonical_identity_persistence(self):
        """Validates that canonical instrument keys are retained without mutation."""
        service = UpstoxService()
        contracts = service.get_option_contracts("NIFTY")
        for c in contracts[:10]:
            ikey = c.get("instrument_key")
            assert ikey is not None
            assert ikey.startswith("NSE_FO|"), f"Invalid Upstox instrument key: {ikey}"
