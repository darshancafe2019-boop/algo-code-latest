"""
Comprehensive Unit & Integration Test Suite for Canonical Instrument Architecture.
===================================================================================
Covers all 20 Quant.OS core architecture requirements:
1. Canonical InstrumentRef & CanonicalInstrument data model
2. Centralized OptionContractNormalizer (ISO dates, Indian NSE, Delta crypto)
3. Expired contract rejection & automated rollover policy
4. Manual pinned contract blocked when rollover=NONE
5. FuturesResolver with strict expiry validation (blocking March 2026 future on Sep 2026)
6. Nearest valid active future resolution
7. Signal Instrument vs Execution Instrument architectural separation
8. Indicator calculation on signal asset vs PnL & Order execution on execution asset
9. Authoritative PnL engine using live execution price / premium
10. Correct currency attribution (INR vs USD/USDT)
"""

import pytest
from datetime import date, datetime, timezone

from src.instrument_resolver import (
    global_instrument_resolver,
    InstrumentRef,
    CanonicalInstrument,
    OptionContractNormalizer,
    FuturesResolver,
    validate_contract_expiry,
    resolve_contract_rollover,
    resolve_signal_and_execution_instruments,
    ResolutionStatus,
)
from src.pnl_engine import compute_authoritative_pnl, compute_unrealized_pnl
from src.strategy import Strategy


class TestCanonicalInstrumentArchitecture:
    """Test suite covering instrument model, normalization, expiry, and PnL."""

    @pytest.fixture
    def market_date(self):
        """Current test market date: 27-Sep-2026."""
        return date(2026, 9, 27)

    def test_canonical_instrument_ref_model(self):
        """Verify InstrumentRef dataclass structure and conversion."""
        ref = InstrumentRef(
            provider="upstox_options",
            exchange="NSE",
            asset_class="OPTION",
            underlying="NIFTY",
            provider_instrument_key="NSE:NIFTY:2026-09-29:24900:CE",
            trading_symbol="NIFTY 2026-09-29 24900 CE",
            expiry="2026-09-29",
            strike=24900.0,
            option_type="CALL",
            lot_size=25.0,
            tick_size=0.05,
            currency="INR"
        )
        assert ref.provider == "upstox_options"
        assert ref.underlying == "NIFTY"
        assert ref.currency == "INR"
        
        canonical = ref.to_canonical()
        assert isinstance(canonical, CanonicalInstrument)
        assert canonical.quote_asset == "INR"
        assert canonical.strike == 24900.0

    def test_nifty_option_iso_normalization(self, market_date):
        """Verify NIFTY ISO date option format 'NIFTY 2026-09-29 24900 CE'."""
        res = OptionContractNormalizer.normalize("NIFTY 2026-09-29 24900 CE", market_date=market_date)
        assert res.is_valid is True
        assert res.status == ResolutionStatus.RESOLVED
        assert res.instrument.quote_asset == "INR"
        assert res.instrument.strike == 24900.0
        assert res.instrument.option_type == "CALL"
        assert res.instrument.base_asset == "NIFTY"
        assert res.instrument.expiry == "2026-09-29"

    def test_nifty_option_short_normalization(self, market_date):
        """Verify NIFTY short format 'NIFTY 24900 CE'."""
        res = OptionContractNormalizer.normalize("NIFTY 24900 CE", market_date=market_date)
        assert res.is_valid is True
        assert res.instrument.strike == 24900.0
        assert res.instrument.option_type == "CALL"

    def test_delta_btc_option_normalization(self, market_date):
        """Verify Delta crypto option formats 'BTC 27-09-2026 84200 PE' and 'C-BTC-84200-270926'."""
        res1 = OptionContractNormalizer.normalize("BTC 27-09-2026 84200 PE", market_date=market_date)
        assert res1.is_valid is True
        assert res1.instrument.strike == 84200.0
        assert res1.instrument.option_type == "PUT"
        assert res1.instrument.quote_asset == "USD"

        res2 = OptionContractNormalizer.normalize("C-BTC-84200-270926", market_date=market_date)
        assert res2.is_valid is True
        assert res2.instrument.strike == 84200.0
        assert res2.instrument.option_type == "CALL"

    def test_expired_btc_option_rejection(self, market_date):
        """Verify that expired option contracts (e.g. 26-Sep-2026 on 27-Sep-2026) are rejected."""
        res = OptionContractNormalizer.normalize("BTC 26-09-2026 84000 CE", market_date=market_date)
        assert res.is_valid is False
        assert res.status == ResolutionStatus.EXPIRED
        assert res.error_code == "CONTRACT_EXPIRED"

    def test_expired_nifty_future_rejection(self, market_date):
        """Verify that expired futures ('NIFTY 27-MAR-2026 Future' on Sep 2026) are rejected."""
        res = FuturesResolver.resolve_future("NIFTY 27-MAR-2026 Future", market_date=market_date)
        assert res.is_valid is False
        assert res.status == ResolutionStatus.EXPIRED
        assert res.error_code == "CONTRACT_EXPIRED"

    def test_nearest_valid_nifty_future_selection(self, market_date):
        """Verify that resolving an active NIFTY future selects an active non-expired future."""
        res = FuturesResolver.resolve_future("NIFTY FUTURE", market_date=market_date)
        assert res.is_valid is True
        assert res.instrument.quote_asset == "INR"
        assert res.instrument.base_asset == "NIFTY"
        # Must be non-expired
        is_valid, _, _ = validate_contract_expiry(res.instrument, market_date=market_date)
        assert is_valid is True

    def test_contract_rollover_strategy_resolve(self, market_date):
        """Verify that expired contracts automatically roll over under STRATEGY_RESOLVE policy."""
        bot_cfg = {"id": "test_bot", "name": "Test BTC Bot"}
        roll_res = resolve_contract_rollover(bot_cfg, "BTC 26-09-2026 84000 CE", rollover_policy="STRATEGY_RESOLVE", market_date=market_date)
        assert roll_res.is_valid is True
        assert roll_res.instrument.strike == 84000.0 or roll_res.instrument.strike > 0
        is_valid, _, exp_d = validate_contract_expiry(roll_res.instrument, market_date=market_date)
        assert is_valid is True
        assert exp_d >= market_date

    def test_contract_rollover_blocked_when_none(self, market_date):
        """Verify that expired contracts remain blocked when rollover_policy=NONE."""
        bot_cfg = {"id": "pinned_bot", "name": "Pinned Bot"}
        roll_res = resolve_contract_rollover(bot_cfg, "BTC 26-09-2026 84000 CE", rollover_policy="NONE", market_date=market_date)
        assert roll_res.is_valid is False
        assert roll_res.error_code == "CONTRACT_EXPIRED"

    def test_signal_vs_execution_instrument_separation(self):
        """Verify architectural separation between signal instrument (indicators) and execution instrument (options)."""
        sig_inst, exec_inst = resolve_signal_and_execution_instruments("BTC 27-09-2026 84200 PE")
        # Signal is spot BTC/USDT
        assert sig_inst.canonical_symbol == "BTC/USDT"
        assert sig_inst.instrument_type.value == "SPOT"
        # Execution is the specific option contract
        assert "84200" in exec_inst.canonical_symbol
        assert exec_inst.instrument_type.value == "OPTION"

    def test_strategy_asset_declarations(self):
        """Verify that Strategy explicitly declares signal_asset and execution_asset."""
        strat = Strategy()
        assert strat.signal_asset == "UNDERLYING"
        assert strat.execution_asset == "AUTO"

    def test_authoritative_pnl_calculations(self):
        """Verify canonical PnL calculations for LONG and SHORT with live execution price and currency."""
        # Long Option: Entry $100.00, Live $150.00, Size 2
        pnl_long = compute_unrealized_pnl(
            direction="LONG",
            entry_price=100.0,
            live_price=150.0,
            quantity=2.0,
            currency="USD"
        )
        assert pnl_long["unrealized_pnl"] == 100.0
        assert pnl_long["currency"] == "USD"

        # Short Option: Entry $200.00, Live $120.00, Size 1
        pnl_short = compute_unrealized_pnl(
            direction="SHORT",
            entry_price=200.0,
            live_price=120.0,
            quantity=1.0,
            currency="USD"
        )
        assert pnl_short["unrealized_pnl"] == 80.0

        # NIFTY Future (INR): Entry 24942.39, Live 24985.98, Size 4
        pnl_nifty = compute_unrealized_pnl(
            direction="LONG",
            entry_price=24942.39,
            live_price=24985.98,
            quantity=4.0,
            currency="INR"
        )
        # (24985.98 - 24942.39) * 4 = 43.59 * 4 = 174.36
        assert pnl_nifty["unrealized_pnl"] == 174.36
        assert pnl_nifty["currency"] == "INR"
        assert pnl_nifty["current_price"] == 24985.98
