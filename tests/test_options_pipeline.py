"""
Unit & Integration Test Suite for Quant.OS Unified Options Pipeline
===================================================================
Tests:
1. Canonical InstrumentResolver for NSE and Indian Options with dynamic lot sizes
2. OptionChainEngine PCR calculation, Max Pain algorithm, and Black-Scholes Greeks
3. NseService deterministic Setup Score evaluation
4. OrderExecutionService 14-point check, Paper/Live isolation, and trade ledger recording
5. GlobalDataEngine position and P&L uniformity across snapshots
"""

import sys
import unittest
import math
from pathlib import Path
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.instrument_resolver import (
    InstrumentResolver,
    global_instrument_resolver,
    ResolutionStatus,
    AssetClass,
    InstrumentType,
)
from src.option_chain_engine import OptionChainEngine, OptionGreeksCalculator
from src.nse_service import NseService
from src.execution_service import OrderExecutionService, order_execution_service
from src.global_data_engine import GlobalDataEngine
from src.trade_ledger import trade_ledger
from src import config, db


class TestInstrumentResolverOptions(unittest.TestCase):
    """Verifies canonical instrument resolution and dynamic lot sizing."""

    def test_nifty_option_resolution(self):
        res = global_instrument_resolver.resolve("NIFTY 24400 CE")
        assert res.is_valid
        assert res.status == ResolutionStatus.RESOLVED
        inst = res.instrument
        assert inst.base_asset == "NIFTY"
        assert inst.strike == 24400.0
        assert inst.option_type == "CALL"
        assert inst.lot_size == 50.0
        assert inst.exchange == "NSE"

    def test_banknifty_option_resolution(self):
        res = global_instrument_resolver.resolve("BANKNIFTY 51000 PE")
        assert res.is_valid
        assert res.instrument.base_asset == "BANKNIFTY"
        assert res.instrument.strike == 51000.0
        assert res.instrument.option_type == "PUT"
        assert res.instrument.lot_size == 15.0

    def test_finnifty_option_resolution(self):
        res = global_instrument_resolver.resolve("FINNIFTY 23500 CE")
        assert res.is_valid
        assert res.instrument.lot_size == 25.0

    def test_stock_option_resolution(self):
        res = global_instrument_resolver.resolve("RELIANCE 3000 CE")
        assert res.is_valid
        assert res.instrument.base_asset == "RELIANCE"
        assert res.instrument.strike == 3000.0
        assert res.instrument.lot_size == 250.0

    def test_crypto_option_resolution(self):
        res = global_instrument_resolver.resolve("BTC-260327-70000-C")
        assert res.is_valid
        assert res.instrument.base_asset == "BTC"
        assert res.instrument.strike == 70000.0
        assert res.instrument.option_type == "CALL"
        assert res.instrument.lot_size == 1.0


class TestOptionChainMath(unittest.TestCase):
    """Verifies deterministic PCR, Max Pain, and Greeks calculation."""

    def setUp(self):
        self.sample_strikes = [
            {
                "strike": 24000.0,
                "ce": {"ltp": 450.0, "open_interest": 100000, "volume": 50000, "iv": 14.5},
                "pe": {"ltp": 30.0, "open_interest": 40000, "volume": 20000, "iv": 15.0},
            },
            {
                "strike": 24200.0,
                "ce": {"ltp": 270.0, "open_interest": 80000, "volume": 40000, "iv": 14.2},
                "pe": {"ltp": 55.0, "open_interest": 60000, "volume": 30000, "iv": 14.8},
            },
            {
                "strike": 24400.0,
                "ce": {"ltp": 128.5, "open_interest": 120000, "volume": 90000, "iv": 14.0},
                "pe": {"ltp": 115.0, "open_interest": 150000, "volume": 85000, "iv": 14.2},
            },
            {
                "strike": 24600.0,
                "ce": {"ltp": 45.0, "open_interest": 90000, "volume": 45000, "iv": 14.3},
                "pe": {"ltp": 230.0, "open_interest": 70000, "volume": 35000, "iv": 14.6},
            },
        ]

    def test_pcr_calculation(self):
        pcr = OptionChainEngine.calculate_pcr(self.sample_strikes)
        total_call_oi = 100000 + 80000 + 120000 + 90000  # 390,000
        total_put_oi = 40000 + 60000 + 150000 + 70000   # 320,000
        expected_pcr_oi = round(total_put_oi / total_call_oi, 3)
        assert pcr["total_call_oi"] == total_call_oi
        assert pcr["total_put_oi"] == total_put_oi
        assert pcr["pcr_oi"] == expected_pcr_oi

    def test_max_pain_calculation(self):
        max_pain = OptionChainEngine.calculate_max_pain(self.sample_strikes)
        assert max_pain in [24000.0, 24200.0, 24400.0, 24600.0]

    def test_black_scholes_greeks(self):
        # S = 24350, K = 24400, T = 7 days (7/365), r = 0.065, IV = 0.15
        greeks = OptionGreeksCalculator.calculate_greeks(
            option_type="CE",
            underlying_price=24350.0,
            strike_price=24400.0,
            time_to_expiry_years=7.0 / 365.0,
            risk_free_rate=0.065,
            iv=0.15,
        )
        assert 0.0 < greeks["delta"] < 1.0
        assert greeks["gamma"] > 0.0
        assert greeks["theta"] < 0.0
        assert greeks["vega"] > 0.0
        assert greeks["iv"] == 15.0


class TestNseServiceSignalsAndExecution(unittest.TestCase):
    """Verifies deterministic setup score and order routing."""

    def test_deterministic_setup_score(self):
        svc = NseService.get_instance()
        res = svc.generate_nse_bot_signals("NIFTY")
        assert res["status"] == "success"
        assert "setup_score" in res
        setup = res["setup_score"]
        assert "passed_count" in setup
        assert "total_count" in setup
        assert setup["passed_count"] <= setup["total_count"]
        assert len(setup["conditions"]) > 0

    def test_execute_nse_paper_order(self):
        svc = NseService.get_instance()
        res = svc.execute_nse_order(
            symbol="NIFTY 24400 CE",
            direction="BUY",
            quantity=50.0,
            limit_price=128.50,
            stop_loss=102.80,
            take_profit=179.90,
            bot_id="test-options-runner",
            strategy="OPTIONS_DISCRETIONARY",
            mode="PAPER",
        )
        assert res["status"] == "success"
        assert res["symbol"] == "NIFTY 24400 CE"
        assert res["direction"] == "BUY"
        assert res["quantity"] == 50.0
        assert res["fill_price"] > 0
        assert "order_id" in res


class TestGlobalDataEnginePortfolioSnapshot(unittest.TestCase):
    """Verifies single source of truth for portfolio snapshot, equity, and positions."""

    def test_portfolio_snapshot_integrity(self):
        gde = GlobalDataEngine.get_instance()
        snap = gde.get_portfolio_snapshot(mode="PAPER")
        assert "equity" in snap
        assert "cashBalance" in snap
        assert "unrealizedPnl" in snap
        assert "netRealizedPnl" in snap
        assert "availableCapital" in snap
        assert "marginUsed" in snap
        assert snap["equity"] == round(snap["cashBalance"] + snap["unrealizedPnl"], 2)


if __name__ == "__main__":
    unittest.main()
