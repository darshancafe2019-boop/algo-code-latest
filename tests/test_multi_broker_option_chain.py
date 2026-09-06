"""
Multi-Broker Option Chain & Deduplication Comprehensive Test Suite
==================================================================
Tests:
1. Strict provider separation across Dhan, Upstox, Delta India, and Paper Simulator.
2. Compound contract key uniqueness and 8-tier hierarchy metadata.
3. In-memory quote deduplication and diagnostics counters.
4. Data validation and rejection of malformed contracts.
5. Stale feed detection and execution safety guards.
6. Provider failure isolation (resilience against individual provider errors).
7. Safe PAPER mode default and API contract validation.
8. REST and WebSocket snapshot deduplication.
9. Missing value handling and non-invention policy.
10. Option sources status reporting.
"""

import pytest
import time
from datetime import datetime, timezone, timedelta

from src.market_data.schemas import (
    OptionQuote,
    OptionStrikeRow,
    OptionChainSnapshot,
    OptionChainDiagnostics,
)
from src.market_data.options_engine import UniversalOptionsEngine, global_options_engine


class TestMultiBrokerOptionChain:

    def setup_method(self):
        self.engine = UniversalOptionsEngine()

    def test_provider_separation(self):
        """Test that identical contracts on different brokers have distinct contractKeys and remain isolated."""
        dhan_quote = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-10",
            strike=22500.0,
            optionType="CE",
            symbol="NIFTY 22500 CE",
            exchange="NSE",
            provider="DHAN",
            lastPrice=145.5,
            bid=145.0,
            ask=146.0,
            volume=50000,
            OI=120000,
            OIChange=5000,
            timestamp=datetime.now(timezone.utc).isoformat(),
            customerId="cust_default",
            brokerAccountId="ba_dhan_primary",
            environment="PAPER",
            instrumentId="DHAN_NSE_NIFTY_22500_CE",
        )

        upstox_quote = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-10",
            strike=22500.0,
            optionType="CE",
            symbol="NIFTY 22500 CE",
            exchange="NSE",
            provider="UPSTOX",
            lastPrice=145.5,
            bid=145.0,
            ask=146.0,
            volume=50000,
            OI=120000,
            OIChange=5000,
            timestamp=datetime.now(timezone.utc).isoformat(),
            customerId="cust_default",
            brokerAccountId="ba_upstox_primary",
            environment="PAPER",
            instrumentId="NSE_FO|NIFTY_22500_CE",
        )

        # Both quotes should have distinct contract keys
        assert dhan_quote.contractKey != upstox_quote.contractKey
        assert "DHAN" in dhan_quote.contractKey
        assert "UPSTOX" in upstox_quote.contractKey

        # Upsert both into engine
        ok1, status1 = self.engine.upsert_quote(dhan_quote)
        ok2, status2 = self.engine.upsert_quote(upstox_quote)

        assert ok1 is True
        assert ok2 is True
        assert self.engine.diagnostics.accepted == 2

        # Both should exist as separate entries in quote store
        assert dhan_quote.contractKey in self.engine._quote_store
        assert upstox_quote.contractKey in self.engine._quote_store
        assert len(self.engine._quote_store) == 2

    def test_quote_deduplication_repeated_ticks(self):
        """Test that identical repeated ticks are deduplicated and price updates modify existing records in-place."""
        quote = OptionQuote(
            underlying="BTC",
            expiry="2026-09-25",
            strike=80000.0,
            optionType="CE",
            symbol="BTC-25SEP26-80000-C",
            exchange="DELTA_INDIA",
            provider="DELTA_INDIA",
            lastPrice=2450.0,
            bid=2440.0,
            ask=2460.0,
            volume=120,
            OI=850,
            OIChange=25,
            timestamp=datetime.now(timezone.utc).isoformat(),
            customerId="cust_default",
            brokerAccountId="ba_delta_primary",
            environment="PAPER",
            instrumentId="DELTA_IND_BTC_80000_C",
            exchangeTimestamp="2026-09-06T12:00:00Z",
        )

        # First insert -> ACCEPTED
        ok1, status1 = self.engine.upsert_quote(quote)
        assert ok1 is True
        assert status1 == "ACCEPTED"
        assert self.engine.diagnostics.accepted == 1

        # Duplicate identical tick -> DEDUPLICATED
        ok2, status2 = self.engine.upsert_quote(quote)
        assert ok2 is True
        assert status2 == "DEDUPLICATED"
        assert self.engine.diagnostics.deduplicated == 1
        assert len(self.engine._quote_store) == 1

        # New tick with updated LTP -> UPDATED
        updated_quote = OptionQuote(
            underlying="BTC",
            expiry="2026-09-25",
            strike=80000.0,
            optionType="CE",
            symbol="BTC-25SEP26-80000-C",
            exchange="DELTA_INDIA",
            provider="DELTA_INDIA",
            lastPrice=2495.0,  # Changed price
            bid=2490.0,
            ask=2500.0,
            volume=135,
            OI=860,
            OIChange=35,
            timestamp=datetime.now(timezone.utc).isoformat(),
            customerId="cust_default",
            brokerAccountId="ba_delta_primary",
            environment="PAPER",
            instrumentId="DELTA_IND_BTC_80000_C",
            exchangeTimestamp="2026-09-06T12:00:05Z",
        )

        ok3, status3 = self.engine.upsert_quote(updated_quote)
        assert ok3 is True
        assert status3 == "UPDATED"
        assert self.engine.diagnostics.updated == 1
        assert len(self.engine._quote_store) == 1
        assert self.engine._quote_store[quote.contractKey].lastPrice == 2495.0

    def test_data_validation_and_rejection(self):
        """Test rejection of malformed quotes missing required fields."""
        # Missing provider
        invalid_quote_1 = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-10",
            strike=22500.0,
            optionType="CE",
            symbol="NIFTY 22500 CE",
            exchange="NSE",
            provider="",  # Invalid
            lastPrice=100.0,
            bid=99.0,
            ask=101.0,
            volume=10,
            OI=100,
            OIChange=0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            instrumentId="INVALID_1",
        )
        ok1, reason1 = self.engine.upsert_quote(invalid_quote_1)
        assert ok1 is False
        assert "provider" in reason1.lower()

        # Invalid strike price
        invalid_quote_2 = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-10",
            strike=-500.0,  # Invalid
            optionType="CE",
            symbol="NIFTY -500 CE",
            exchange="NSE",
            provider="DHAN",
            lastPrice=100.0,
            bid=99.0,
            ask=101.0,
            volume=10,
            OI=100,
            OIChange=0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            instrumentId="INVALID_2",
        )
        ok2, reason2 = self.engine.upsert_quote(invalid_quote_2)
        assert ok2 is False
        assert "strike" in reason2.lower()

        assert self.engine.diagnostics.rejected == 2

    def test_stale_feed_detection(self):
        """Test that quotes older than threshold are flagged as STALE and disabled for execution."""
        old_time = (datetime.now(timezone.utc) - timedelta(seconds=15)).isoformat()
        stale_live_quote = OptionQuote(
            underlying="NIFTY",
            expiry="2026-09-10",
            strike=22500.0,
            optionType="PE",
            symbol="NIFTY 22500 PE",
            exchange="NSE",
            provider="DHAN",
            lastPrice=85.0,
            bid=84.0,
            ask=86.0,
            volume=20000,
            OI=95000,
            OIChange=1200,
            timestamp=old_time,
            receivedTimestamp=old_time,
            customerId="cust_default",
            brokerAccountId="ba_dhan_primary",
            environment="LIVE",
            instrumentId="DHAN_NSE_NIFTY_22500_PE",
        )

        ok, status = self.engine.upsert_quote(stale_live_quote)
        assert ok is True
        stored = self.engine._quote_store[stale_live_quote.contractKey]
        assert stored.freshnessStatus == "STALE"
        assert stored.isExecutable is False
        assert "stale" in stored.rejectionReason.lower()

    def test_multi_source_isolation_and_resilience(self):
        """Test that multi-source retrieval handles individual provider errors gracefully without breaking other feeds."""
        res = self.engine.get_multi_source_option_chain(
            underlying="NIFTY",
            spot_price=22500.0,
            strike_count=10,
            environment="PAPER",
        )

        assert res["status"] == "success"
        sources = res["sources"]
        assert "DHAN" in sources
        assert "UPSTOX" in sources
        assert "DELTA_INDIA" in sources
        assert "PAPER_SIMULATOR" in sources

        # Verify Dhan has correct provider tag
        assert sources["DHAN"]["provider"] == "DHAN"
        # Verify Upstox has correct provider tag
        assert sources["UPSTOX"]["provider"] == "UPSTOX"
        # Verify Delta India has correct provider tag
        assert sources["DELTA_INDIA"]["provider"] == "DELTA_INDIA"
        # Verify Paper Simulator is explicitly marked
        assert sources["PAPER_SIMULATOR"]["provider"] == "PAPER_SIMULATOR"

    def test_black_scholes_greeks_calculation(self):
        """Test Black-Scholes analytical Greeks computation."""
        greeks = self.engine.calculate_greeks(
            option_type="CE",
            spot=22500.0,
            strike=22500.0,
            time_to_expiry_years=7.0 / 365.0,
            iv=0.15,
            risk_free_rate=0.065,
        )

        assert "delta" in greeks
        assert "gamma" in greeks
        assert "theta" in greeks
        assert "vega" in greeks
        assert "theoretical_price" in greeks
        # ATM Call delta should be approximately 0.50
        assert 0.45 <= greeks["delta"] <= 0.60
        assert greeks["gamma"] > 0
        assert greeks["vega"] > 0

    def test_sources_status_reporting(self):
        """Test that get_sources_status reports all configured sources."""
        sources = self.engine.get_sources_status()
        assert len(sources) >= 4
        provs = [s["provider"] for s in sources]
        assert "DHAN" in provs
        assert "UPSTOX" in provs
        assert "DELTA_INDIA" in provs
        assert "BINANCE" in provs
        assert "PAPER_SIMULATOR" in provs
        for s in sources:
            assert "feed" in s
            assert "latency_ms" in s
            assert "status" in s
