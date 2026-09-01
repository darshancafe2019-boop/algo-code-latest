"""
Unit Tests for Modular Futures & Derivatives Engine
===================================================
Tests Models, Quote Engine, Funding Rate Engine, Basis Engine,
Liquidation Calculator, and Service Caching.
"""

import unittest
from market_data.futures.models import (
    CanonicalFuturesContract,
    FuturesContractType,
    MarketVenue,
    MarginMode,
)
from market_data.futures.funding_engine import FundingRateEngine
from market_data.futures.basis_engine import BasisEngine
from market_data.futures.liquidation_engine import LiquidationEngine
from market_data.futures.quote_engine import FuturesQuoteEngine
from market_data.futures.service import FuturesMarketService


class TestFuturesModularEngine(unittest.TestCase):

    def setUp(self):
        self.funding_engine = FundingRateEngine()
        self.basis_engine = BasisEngine()
        self.liquidation_engine = LiquidationEngine()
        self.quote_engine = FuturesQuoteEngine()
        self.service = FuturesMarketService.get_instance()

    def test_funding_rate_apr_calculation(self):
        # 0.01% (0.0001) 8h rate -> 10.95% APR
        apr = self.funding_engine.calculate_annualized_apr(0.0001)
        self.assertEqual(apr, 10.95)

        data = self.funding_engine.get_funding_data("BTC/USDT:USDT", MarketVenue.BINANCE, 0.0001)
        self.assertEqual(data.funding_rate_annualized, 10.95)
        self.assertGreater(data.countdown_seconds, 0)
        self.assertIsNotNone(data.next_funding_time)

    def test_basis_engine(self):
        # Spot 78000, Futures 78500 -> Contango +0.641%
        basis = self.basis_engine.calculate_basis("BTC/USDT:USDT", "BTC/USDT", 78000.0, 78500.0, days_to_expiry=30)
        self.assertEqual(basis.basis_absolute, 500.0)
        self.assertEqual(basis.basis_percentage, 0.641)
        self.assertEqual(basis.regime, "CONTANGO")
        self.assertGreater(basis.annualized_basis, 0.0)

    def test_liquidation_engine(self):
        # Long Entry 70,000 at 10x leverage (MMR 0.5%)
        # Liq Price = 70,000 * (1 - 0.10 + 0.005) = 70,000 * 0.905 = 63,350
        liq_long = self.liquidation_engine.calculate_liquidation_price("LONG", 70000.0, 10)
        self.assertEqual(liq_long, 63350.0)

        # Short Entry 70,000 at 10x leverage
        # Liq Price = 70,000 * (1 + 0.10 - 0.005) = 70,000 * 1.095 = 76,650
        liq_short = self.liquidation_engine.calculate_liquidation_price("SHORT", 70000.0, 10)
        self.assertEqual(liq_short, 76650.0)

    def test_quote_engine_universe(self):
        contracts = self.quote_engine.get_all_universe_contracts()
        self.assertGreaterEqual(len(contracts), 10)

        # Verify BTC perpetual exists
        btc = next((c for c in contracts if c.symbol == "BTC/USDT:USDT"), None)
        self.assertIsNotNone(btc)
        self.assertEqual(btc.contract_type, FuturesContractType.PERPETUAL)
        self.assertIsNotNone(btc.funding_rate)
        self.assertIsNotNone(btc.basis)

        # Verify NIFTY index futures exists
        nifty = next((c for c in contracts if c.underlying == "NIFTY"), None)
        self.assertIsNotNone(nifty)
        self.assertEqual(nifty.venue, MarketVenue.UPSTOX_NSE)

    def test_service_caching_and_liquidation(self):
        contracts = self.service.get_all_contracts(force_refresh=True)
        self.assertIsInstance(contracts, list)

        heatmap = self.service.get_funding_heatmap()
        self.assertIsInstance(heatmap, list)
        self.assertGreater(len(heatmap), 0)

        liq_res = self.service.calculate_liquidation("BUY", 78000.0, 20)
        self.assertEqual(liq_res["side"], "BUY")
        self.assertEqual(liq_res["leverage"], 20)
        self.assertIn("liquidationPrice", liq_res)


if __name__ == "__main__":
    unittest.main()
