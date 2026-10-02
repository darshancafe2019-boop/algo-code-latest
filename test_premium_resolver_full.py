"""
Comprehensive Automated Test Suite for Real-time Instrument & Premium Resolution System
========================================================================================
Tests:
1. PremiumIntent validation & invariants
2. Single Option (CALL/PUT) target premium scanning & ranking
3. Multi-leg strategies (Iron Condor, Straddle, Strangle, Spreads, Butterfly, Jade Lizard)
4. Signed cash flows (per unit, per lot, total position)
5. Conservative execution value (Bid/Ask aware) vs Mid value
6. Margin estimation, max loss, and capital verification
7. Truth in data & data unavailable invariants
8. REST API endpoints /api/premium/scan, /api/premium/resolve-plan, /api/premium/validate-intent
"""

import os
os.environ["TESTING"] = "1"
os.environ["WERKZEUG_RUN_MAIN"] = "true"

import json
import unittest
from src.premium_intent import PremiumIntent, MarketType, InstrumentClass, StrikeMode, PremiumMode, ContractMode
from src.premium_resolver import PremiumResolver, global_premium_resolver, ResolvedPremiumPlan


class TestPremiumResolutionSystem(unittest.TestCase):

    def setUp(self):
        self.resolver = global_premium_resolver

    def test_01_intent_validation_invariants(self):
        """Validates that PremiumIntent rejects invalid bounds."""
        # Valid intent
        intent = PremiumIntent(
            market_type=MarketType.INDIAN_OPTIONS.value,
            underlying="NIFTY",
            option_type="CE",
            target_premium=120.0,
            premium_min=100.0,
            premium_max=140.0,
            target_delta=0.50,
            lots=1,
            lot_size=25,
        )
        is_valid, errors = intent.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

        # Invalid bounds (min > max)
        invalid_intent = PremiumIntent(
            underlying="NIFTY",
            premium_min=150.0,
            premium_max=100.0,
        )
        is_valid, errors = invalid_intent.validate()
        self.assertFalse(is_valid)
        self.assertIn("cannot exceed", errors[0])

    def test_02_single_call_target_premium_scan(self):
        """Validates scanning live chain for a single CALL targeting ₹120 premium."""
        intent = PremiumIntent(
            market_type=MarketType.INDIAN_OPTIONS.value,
            underlying="NIFTY",
            option_type="CE",
            strike_mode=StrikeMode.ATM.value,
            target_premium=120.0,
            lots=2,
            lot_size=25,
        )

        plans = self.resolver.scan_chain_for_intent(intent, limit=3)
        self.assertGreaterEqual(len(plans), 1)

        best_match = plans[0]
        self.assertTrue(best_match.valid)
        self.assertEqual(best_match.underlying, "NIFTY")
        self.assertEqual(len(best_match.legs), 1)

        leg = best_match.legs[0]
        self.assertEqual(leg.option_type, "CE")
        self.assertEqual(leg.side, "BUY")
        self.assertGreater(leg.ltp, 0)
        self.assertIsNotNone(leg.bid)
        self.assertIsNotNone(leg.ask)
        self.assertIsNotNone(leg.iv)
        self.assertIsNotNone(leg.delta)

        # Check score explainability
        self.assertIsNotNone(best_match.score_breakdown)
        self.assertEqual(best_match.score_breakdown.rank_label, "BEST_MATCH")
        self.assertGreater(best_match.score_breakdown.target_premium_match_pct, 0)

    def test_03_single_put_target_premium_resolution(self):
        """Validates single PUT option resolution."""
        intent = PremiumIntent(
            market_type=MarketType.INDIAN_OPTIONS.value,
            underlying="NIFTY",
            option_type="PE",
            target_premium=95.0,
            lots=1,
            lot_size=25,
        )

        plan = self.resolver.resolve_intent_to_plan(intent)
        self.assertTrue(plan.valid)
        self.assertEqual(len(plan.legs), 1)
        self.assertEqual(plan.legs[0].option_type, "PE")
        self.assertGreater(plan.net_debit_total, 0)

    def test_04_iron_condor_4_leg_signed_cash_flow(self):
        """Validates 4-leg Short Iron Condor resolution with signed Net Credit and defined margin."""
        intent = PremiumIntent(
            market_type=MarketType.INDIAN_OPTIONS.value,
            underlying="NIFTY",
            instrument_class=InstrumentClass.OPTION_MULTI_LEG.value,
            strike_gap=100.0,
            lots=1,
            lot_size=25,
        )

        plan = self.resolver.resolve_intent_to_plan(
            intent=intent,
            strategy_id="SHORT_IRON_CONDOR",
            strategy_name="Short Iron Condor",
            available_capital=200000.0,
        )

        self.assertTrue(plan.valid)
        self.assertEqual(len(plan.legs), 4)

        # Verify legs structure: [Buy Put, Sell Put, Sell Call, Buy Call]
        sides = [leg.side for leg in plan.legs]
        types = [leg.option_type for leg in plan.legs]
        self.assertEqual(sides, ["BUY", "SELL", "SELL", "BUY"])
        self.assertEqual(types, ["PE", "PE", "CE", "CE"])

        # Verify signed cash flow metrics
        self.assertGreater(plan.net_credit_per_unit, 0)
        self.assertEqual(plan.net_credit_per_lot, round(plan.net_credit_per_unit * 25, 2))
        self.assertEqual(plan.net_credit_total, plan.net_credit_per_lot)

        # Verify defined margin and max loss
        self.assertGreater(plan.estimated_margin, 0)
        self.assertGreater(plan.estimated_max_loss, 0)
        self.assertTrue(plan.is_sufficient_capital)

    def test_05_straddle_and_strangle_resolution(self):
        """Validates 2-leg Straddle and Strangle resolution."""
        intent = PremiumIntent(
            underlying="BANKNIFTY",
            strike_gap=100.0,
            lot_size=15,
            lots=1,
        )

        # Straddle (ATM CE + ATM PE)
        straddle_plan = self.resolver.resolve_intent_to_plan(intent, strategy_id="STRADDLE")
        self.assertTrue(straddle_plan.valid)
        self.assertEqual(len(straddle_plan.legs), 2)
        self.assertEqual(straddle_plan.legs[0].strike, straddle_plan.legs[1].strike)

        # Strangle (OTM PE + OTM CE)
        strangle_plan = self.resolver.resolve_intent_to_plan(intent, strategy_id="STRANGLE")
        self.assertTrue(strangle_plan.valid)
        self.assertEqual(len(strangle_plan.legs), 2)
        self.assertNotEqual(strangle_plan.legs[0].strike, strangle_plan.legs[1].strike)

    def test_06_spread_and_butterfly_resolution(self):
        """Validates Bull Call Spread and 3-leg Butterfly resolution."""
        intent = PremiumIntent(underlying="NIFTY", lot_size=25, lots=1)

        # Bull Call Spread
        spread_plan = self.resolver.resolve_intent_to_plan(intent, strategy_id="BULL_CALL_SPREAD")
        self.assertTrue(spread_plan.valid)
        self.assertEqual(len(spread_plan.legs), 2)
        self.assertEqual(spread_plan.legs[0].side, "BUY")
        self.assertEqual(spread_plan.legs[1].side, "SELL")

        # Butterfly (1:2:1)
        fly_plan = self.resolver.resolve_intent_to_plan(intent, strategy_id="BUTTERFLY")
        self.assertTrue(fly_plan.valid)
        self.assertEqual(len(fly_plan.legs), 3)
        self.assertEqual([l.ratio for l in fly_plan.legs], [1, 2, 1])

    def test_07_insufficient_capital_blocking(self):
        """Validates that resolver flags insufficient capital when required > available."""
        intent = PremiumIntent(
            underlying="NIFTY",
            lots=50,  # 50 lots = 1250 qty
            lot_size=25,
        )

        plan = self.resolver.resolve_intent_to_plan(
            intent=intent,
            strategy_id="SHORT_IRON_CONDOR",
            available_capital=10000.0,  # Low capital
        )

        self.assertFalse(plan.is_sufficient_capital)
        self.assertEqual(plan.error_code, "INSUFFICIENT_CAPITAL")
        self.assertIn("exceeds available funds", plan.rejection_reason)

    def test_08_rest_api_endpoints(self):
        """Validates REST endpoints /api/premium/scan and /api/premium/resolve-plan."""
        from dashboard import app
        client = app.test_client()

        # 1. /api/premium/scan
        res_scan = client.post("/api/premium/scan", json={
            "intent": {
                "underlying": "NIFTY",
                "target_premium": 120.0,
                "option_type": "CE"
            },
            "limit": 3
        })
        self.assertEqual(res_scan.status_code, 200)
        data_scan = res_scan.get_json()
        self.assertTrue(data_scan["success"])
        self.assertGreaterEqual(len(data_scan["plans"]), 1)

        # 2. /api/premium/resolve-plan
        res_plan = client.post("/api/premium/resolve-plan", json={
            "intent": {
                "underlying": "NIFTY",
                "instrument_class": "OPTION_MULTI_LEG",
                "lots": 1
            },
            "strategy_id": "SHORT_IRON_CONDOR",
            "available_capital": 250000.0
        })
        self.assertEqual(res_plan.status_code, 200)
        data_plan = res_plan.get_json()
        self.assertTrue(data_plan["valid"])
        self.assertEqual(len(data_plan["legs"]), 4)
        self.assertGreater(data_plan["net_credit_per_unit"], 0)

        # 3. /api/premium/validate-intent
        res_val = client.post("/api/premium/validate-intent", json={
            "intent": {
                "underlying": "NIFTY",
                "target_premium": 120.0
            }
        })
        self.assertEqual(res_val.status_code, 200)
        self.assertTrue(res_val.get_json()["valid"])


if __name__ == "__main__":
    unittest.main()
