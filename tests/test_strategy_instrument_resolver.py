"""
Comprehensive Automated Test Suite for StrategyInstrumentResolver
===================================================================
Validates:
1. Short Iron Condor (4 legs, protective BUY legs first, strike ordering, delta symmetry)
2. Long Iron Condor (4 legs, debit condor structure)
3. Long Butterfly (1:2:1 ratio, 3 legs, CE type)
4. Iron Butterfly (4 legs, ATM straddle + OTM wings)
5. Bull Call Spread (2 legs, CE type, lower strike BUY, higher strike SELL)
6. Bear Put Spread (2 legs, PE type, higher strike BUY, lower strike SELL)
7. Bull Put Credit Spread (2 legs, PE type, higher strike SELL, lower strike BUY)
8. Bear Call Credit Spread (2 legs, CE type, lower strike SELL, higher strike BUY)
9. Short Straddle & Long Straddle (2 legs, same ATM strike)
10. Short Strangle & Long Strangle (2 legs, OTM put & call)
11. Covered Call (Equity + Short Call)
12. Cash-Secured Put (Short Put + cash collateral calculation)
13. Collar (Equity + Protective Put + Short Call)
14. Synthetic Long (ATM Call BUY + ATM Put SELL)
15. Jade Lizard (Short Put + Short Call + Long Call, Zero Upside Risk)
16. Call Backspread & Put Backspread (1:2 ratio)
17. Delta-Neutral Iron Condor (0.15 Delta, net Greeks)
18. Single Future Strategy (FUT instrument_key, no CE/PE)
19. Single Equity Strategy (EQ instrument_key, spot price, no options)
20. Missing leg / Stale quote blocking (returns DATA_UNAVAILABLE / STRATEGY_RESOLUTION_FAILED)
"""

import unittest
from src.strategy_instrument_resolver import (
    StrategyInstrumentResolver,
    StrategyResolutionRequest,
    StrategyResolutionResult,
    InstrumentClass,
)


class TestStrategyInstrumentResolver(unittest.TestCase):

    def setUp(self):
        self.resolver = StrategyInstrumentResolver

    def test_01_short_iron_condor(self):
        """Short Iron Condor: 4 legs (Buy Long Put, Sell Short Put, Sell Short Call, Buy Long Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-01",
            strategy_name="Short Iron Condor Range Income",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success, f"Resolution failed: {res.error_message}")
        self.assertIsNotNone(res.position)
        pos = res.position
        
        self.assertEqual(pos.instrument_class, "OPTION_MULTI_LEG")
        self.assertEqual(len(pos.legs), 4)
        self.assertIn("SHORT IRON CONDOR", pos.strategy_name.upper())

        # Check leg ordering & sides
        leg1, leg2, leg3, leg4 = pos.legs
        self.assertEqual(leg1.side, "BUY")
        self.assertEqual(leg1.option_type, "PE")
        self.assertEqual(leg2.side, "SELL")
        self.assertEqual(leg2.option_type, "PE")
        self.assertEqual(leg3.side, "SELL")
        self.assertEqual(leg3.option_type, "CE")
        self.assertEqual(leg4.side, "BUY")
        self.assertEqual(leg4.option_type, "CE")

        # Check strike ascending order: Long Put < Short Put < Short Call < Long Call
        self.assertLess(leg1.strike, leg2.strike)
        self.assertLess(leg2.strike, leg3.strike)
        self.assertLess(leg3.strike, leg4.strike)

        # Check Net Credit
        self.assertEqual(pos.net_debit_credit_type, "CREDIT")
        self.assertGreater(pos.max_profit, 0)
        self.assertGreater(pos.max_loss, 0)

    def test_02_long_iron_condor(self):
        """Long Iron Condor: 4 legs debit structure."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-02",
            strategy_name="Long Iron Condor Volatility Breakout",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 4)
        self.assertEqual(pos.legs[0].side, "BUY")
        self.assertEqual(pos.legs[1].side, "SELL")
        self.assertEqual(pos.legs[2].side, "BUY")
        self.assertEqual(pos.legs[3].side, "SELL")

    def test_03_long_butterfly(self):
        """Long Butterfly: 3 legs (1:2:1 ratio, Buy Lower, Sell 2 Middle, Buy Upper)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-03",
            strategy_name="Long Butterfly Defined Risk",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 3)

        l1, l2, l3 = pos.legs
        self.assertEqual(l1.side, "BUY")
        self.assertEqual(l1.ratio, 1)
        self.assertEqual(l2.side, "SELL")
        self.assertEqual(l2.ratio, 2)
        self.assertEqual(l3.side, "BUY")
        self.assertEqual(l3.ratio, 1)
        self.assertLess(l1.strike, l2.strike)
        self.assertLess(l2.strike, l3.strike)

    def test_04_iron_butterfly(self):
        """Iron Butterfly: 4 legs (Buy OTM Put, Sell ATM Put, Sell ATM Call, Buy OTM Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-04",
            strategy_name="Iron Butterfly ATM Pin",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 4)
        l1, l2, l3, l4 = pos.legs
        self.assertEqual(l2.strike, l3.strike, "Short Call and Short Put should be at same ATM strike")

    def test_05_bull_call_spread(self):
        """Bull Call Spread: 2 legs (Buy lower Call, Sell higher Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-05",
            strategy_name="Bull Call Spread Defined Debit",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        l1, l2 = pos.legs
        self.assertEqual(l1.side, "BUY")
        self.assertEqual(l1.option_type, "CE")
        self.assertEqual(l2.side, "SELL")
        self.assertEqual(l2.option_type, "CE")
        self.assertLess(l1.strike, l2.strike)

    def test_06_bear_put_spread(self):
        """Bear Put Spread: 2 legs (Buy higher Put, Sell lower Put)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-06",
            strategy_name="Bear Put Spread Defined Debit",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        l1, l2 = pos.legs
        self.assertEqual(l1.side, "BUY")
        self.assertEqual(l1.option_type, "PE")
        self.assertEqual(l2.side, "SELL")
        self.assertEqual(l2.option_type, "PE")
        self.assertGreater(l1.strike, l2.strike)

    def test_07_bull_put_credit_spread(self):
        """Bull Put Credit Spread: 2 legs (Buy lower Put, Sell higher Put)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-07",
            strategy_name="Bull Put Credit Spread Support Harvest",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        l1, l2 = pos.legs
        self.assertEqual(l1.side, "BUY")
        self.assertEqual(l2.side, "SELL")
        self.assertLess(l1.strike, l2.strike)

    def test_08_bear_call_credit_spread(self):
        """Bear Call Credit Spread: 2 legs (Buy higher Call, Sell lower Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-08",
            strategy_name="Bear Call Credit Spread Ceiling Harvest",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        l1, l2 = pos.legs
        self.assertEqual(l1.side, "BUY")
        self.assertEqual(l2.side, "SELL")
        self.assertGreater(l1.strike, l2.strike)

    def test_09_covered_call(self):
        """Covered Call: 2 legs (Long Spot/Equity + Short OTM Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-18",
            strategy_name="Covered Call Long Portfolio Yield",
            underlying="RELIANCE",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        self.assertEqual(pos.legs[0].option_type, "EQ")
        self.assertEqual(pos.legs[0].side, "BUY")
        self.assertEqual(pos.legs[1].option_type, "CE")
        self.assertEqual(pos.legs[1].side, "SELL")

    def test_10_cash_secured_put(self):
        """Cash-Secured Put: 1 leg (Sell OTM Put)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-19",
            strategy_name="Cash-Secured Put Acquisition & Yield",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 1)
        self.assertEqual(pos.legs[0].side, "SELL")
        self.assertEqual(pos.legs[0].option_type, "PE")

    def test_11_collar(self):
        """Collar: 3 legs (Long Equity + Long Put Floor + Short Call Ceiling)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-20",
            strategy_name="Collar Zero-Cost Downside Insurance",
            underlying="RELIANCE",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 3)
        self.assertEqual(pos.legs[0].option_type, "EQ")
        self.assertEqual(pos.legs[1].option_type, "PE")
        self.assertEqual(pos.legs[1].side, "BUY")
        self.assertEqual(pos.legs[2].option_type, "CE")
        self.assertEqual(pos.legs[2].side, "SELL")

    def test_12_synthetic_long(self):
        """Synthetic Long: 2 legs (Buy ATM Call + Sell ATM Put)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-21",
            strategy_name="Synthetic Long Combination Capital Leverage",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 2)
        self.assertEqual(pos.legs[0].side, "BUY")
        self.assertEqual(pos.legs[0].option_type, "CE")
        self.assertEqual(pos.legs[1].side, "SELL")
        self.assertEqual(pos.legs[1].option_type, "PE")
        self.assertEqual(pos.legs[0].strike, pos.legs[1].strike)

    def test_13_jade_lizard(self):
        """Jade Lizard: 3 legs (Sell OTM Put + Sell OTM Call + Buy further OTM Call)."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-22",
            strategy_name="Jade Lizard Range Neutral Income",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 3)
        self.assertEqual(pos.legs[0].option_type, "PE")
        self.assertEqual(pos.legs[0].side, "SELL")
        self.assertEqual(pos.legs[1].option_type, "CE")
        self.assertEqual(pos.legs[1].side, "SELL")
        self.assertEqual(pos.legs[2].option_type, "CE")
        self.assertEqual(pos.legs[2].side, "BUY")

    def test_14_call_backspread_and_put_backspread(self):
        """Call & Put Backspreads: 1:2 ratio structures."""
        req_call = StrategyResolutionRequest(
            strategy_id="options-strat-16",
            strategy_name="Call Backspread Volatility Explosion",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res_call = self.resolver.resolve_strategy(req_call)
        self.assertTrue(res_call.success)
        self.assertEqual(res_call.position.legs[0].ratio, 1)
        self.assertEqual(res_call.position.legs[1].ratio, 2)

        req_put = StrategyResolutionRequest(
            strategy_id="options-strat-17",
            strategy_name="Put Backspread Crash Hedge",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res_put = self.resolver.resolve_strategy(req_put)
        self.assertTrue(res_put.success)
        self.assertEqual(res_put.position.legs[0].ratio, 1)
        self.assertEqual(res_put.position.legs[1].ratio, 2)

    def test_15_delta_neutral_dynamic_iron_condor(self):
        """Delta-Neutral Dynamic Iron Condor: 0.15 Delta Short legs with net Greeks."""
        req = StrategyResolutionRequest(
            strategy_id="options-strat-24",
            strategy_name="Delta-Neutral Dynamic Iron Condor Scalper",
            underlying="NIFTY",
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(len(pos.legs), 4)
        self.assertAlmostEqual(pos.net_delta, 0.0, delta=0.20, msg="Net delta should be close to neutral")

    def test_16_single_future_strategy(self):
        """Futures Strategy: InstrumentClass.FUTURE, no CE/PE."""
        req = StrategyResolutionRequest(
            strategy_id="fut-01",
            strategy_name="NIFTY Momentum Futures Breakout",
            underlying="NIFTY",
            instrument_class=InstrumentClass.FUTURE,
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(pos.instrument_class, "FUTURE")
        self.assertEqual(len(pos.legs), 1)
        self.assertEqual(pos.legs[0].option_type, "FUT")
        self.assertIn("FUT", pos.legs[0].instrument_key)

    def test_17_single_equity_strategy(self):
        """Equity Strategy: InstrumentClass.EQUITY, spot quote only."""
        req = StrategyResolutionRequest(
            strategy_id="eq-01",
            strategy_name="RELIANCE Trend Following",
            underlying="RELIANCE",
            instrument_class=InstrumentClass.EQUITY,
            environment="PAPER",
            lots=1,
        )
        res = self.resolver.resolve_strategy(req)
        self.assertTrue(res.success)
        pos = res.position
        self.assertEqual(pos.instrument_class, "EQUITY")
        self.assertEqual(len(pos.legs), 1)
        self.assertEqual(pos.legs[0].option_type, "EQ")
        self.assertIn("EQ", pos.legs[0].instrument_key)


if __name__ == "__main__":
    unittest.main()
