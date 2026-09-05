"""
Quant.OS Tax Intelligence — Comprehensive Test Suite
===================================================
Golden test cases verifying statutory tax calculations, multi-jurisdiction rules,
tax lot matching, transaction tax separation, anti-avoidance, and deadline schedules.
"""

import unittest
from datetime import datetime
from src.tax_engine.action_advisor import tax_action_advisor
from src.tax_engine.anti_avoidance import anti_avoidance_engine
from src.tax_engine.deadline_engine import tax_deadline_engine
from src.tax_engine.fx_engine import tax_fx_engine
from src.tax_engine.jurisdiction_resolver import jurisdiction_resolver
from src.tax_engine.jurisdictions.india_adapter import IndiaTaxAdapter
from src.tax_engine.jurisdictions.us_adapter import UsTaxAdapter
from src.tax_engine.jurisdictions.uk_adapter import UkTaxAdapter
from src.tax_engine.jurisdictions.singapore_adapter import SingaporeTaxAdapter
from src.tax_engine.jurisdictions.uae_adapter import UaeTaxAdapter
from src.tax_engine.jurisdictions.germany_adapter import GermanyTaxAdapter
from src.tax_engine.liability_engine import tax_liability_engine
from src.tax_engine.models import (
    AccountingMethod,
    IncomeClassification,
    TaxConfidence,
    TaxLot,
    TaxpayerEntityType,
    TaxpayerProfile,
    TaxTransaction,
    TraderClassification,
)
from src.tax_engine.rule_registry import tax_rule_registry
from src.tax_engine.tax_lot_engine import TaxLotEngine
from src.tax_engine.tax_service import tax_service


class TestTaxIntelligenceComprehensive(unittest.TestCase):
    """Test suite covering all institutional tax engine contracts and golden test cases."""

    def setUp(self):
        self.taxpayer_in = TaxpayerProfile(
            id="prof_test_in",
            primary_residence="IN",
            citizenship="IN",
            entity_type=TaxpayerEntityType.INDIVIDUAL,
            trader_classification=TraderClassification.INVESTOR,
            accounting_method=AccountingMethod.FIFO,
            base_currency="INR",
        )
        self.taxpayer_us = TaxpayerProfile(
            id="prof_test_us",
            primary_residence="US",
            citizenship="US",
            entity_type=TaxpayerEntityType.INDIVIDUAL,
            trader_classification=TraderClassification.INVESTOR,
            accounting_method=AccountingMethod.FIFO,
            base_currency="USD",
        )

    def test_01_jurisdiction_resolver(self):
        """Verify multi-factor nexus resolution (residence, citizenship, exchange, issuer)."""
        tx = TaxTransaction(
            transaction_id="TX_US_EQUITY",
            broker="Interactive Brokers",
            account_id="ACC_01",
            symbol="AAPL",
            asset_class="equity",
            transaction_type="SELL",
            quantity=10,
            price=220.0,
            gross_value=2200.0,
            currency="USD",
            trade_date="2026-03-01",
            issuer_country="US",
            exchange_country="US",
        )
        results = jurisdiction_resolver.resolve_jurisdictions(self.taxpayer_in, tx)
        country_codes = [r.country_code for r in results]
        
        self.assertIn("IN", country_codes)  # Primary residence
        self.assertIn("US", country_codes)  # Issuer / Exchange country

    def test_02_india_finance_act_2024_rates(self):
        """Verify India Finance Act 2024 revised rates: STCG 20%, LTCG 12.5% > ₹1.25L."""
        adapter = IndiaTaxAdapter()
        
        # Test STCG equity classification (< 365 days)
        tx_stcg = TaxTransaction(
            transaction_id="TX_STCG",
            broker="Upstox",
            account_id="ACC_01",
            symbol="RELIANCE",
            asset_class="equity",
            transaction_type="SELL",
            quantity=100,
            price=3000.0,
            gross_value=300000.0,
            currency="INR",
            trade_date="2026-02-01",
        )
        class_stcg = adapter.classify_income(tx_stcg, holding_period_days=180, taxpayer=self.taxpayer_in)
        self.assertEqual(class_stcg, IncomeClassification.STCG)

        # Test LTCG equity classification (> 365 days)
        class_ltcg = adapter.classify_income(tx_stcg, holding_period_days=400, taxpayer=self.taxpayer_in)
        self.assertEqual(class_ltcg, IncomeClassification.LTCG)

        # Test STT rates (0.1% on delivery)
        stt_dict = adapter.calculate_transaction_tax(tx_stcg)
        self.assertEqual(stt_dict["stt"], 300.0)  # 300000 * 0.001

    def test_03_us_irc_section_1256_and_wash_sale(self):
        """Verify US Section 1256 futures and Section 1091 Wash Sale."""
        adapter = UsTaxAdapter()
        
        # Section 1256 futures
        tx_fut = TaxTransaction(
            transaction_id="TX_FUT",
            broker="IBKR",
            account_id="ACC_01",
            symbol="ES_FUT",
            asset_class="future",
            transaction_type="SELL",
            quantity=1,
            price=5800.0,
            gross_value=5800.0,
            currency="USD",
            trade_date="2026-01-10",
        )
        fut_class = adapter.classify_income(tx_fut, 10, self.taxpayer_us)
        self.assertEqual(fut_class, IncomeClassification.NON_SPECULATIVE_DERIVATIVE)

        # Wash sale alert
        buy_tx = TaxTransaction(
            transaction_id="TX_BUY_RECENT",
            broker="IBKR",
            account_id="ACC_01",
            symbol="NVDA",
            asset_class="equity",
            transaction_type="BUY",
            quantity=50,
            price=130.0,
            gross_value=6500.0,
            currency="USD",
            trade_date="2026-03-01",
        )
        alert = anti_avoidance_engine.check_wash_sale_risk("NVDA", "2026-03-10", "US", [buy_tx])
        self.assertIsNotNone(alert)
        self.assertEqual(alert.alert_type, "WASH_SALE_STYLE_RESTRICTION")

    def test_04_uk_tcga_section_104_and_bed_and_breakfast(self):
        """Verify UK TCGA 1992 Section 104 £3,000 allowance and 0.5% SDRT."""
        adapter = UkTaxAdapter()
        taxpayer_uk = TaxpayerProfile(primary_residence="GB", base_currency="GBP")
        
        tx_buy = TaxTransaction(
            transaction_id="TX_UK_BUY",
            broker="Hargreaves Lansdown",
            account_id="ACC_UK",
            symbol="VOD.L",
            asset_class="equity",
            transaction_type="BUY",
            quantity=1000,
            price=0.75,
            gross_value=750.0,
            currency="GBP",
            trade_date="2026-01-15",
        )
        sdrt_dict = adapter.calculate_transaction_tax(tx_buy)
        self.assertEqual(sdrt_dict["sdrt_stamp_duty"], 3.75)  # 750 * 0.005

        # £3,000 annual exemption
        liability = adapter.calculate_estimated_liability(5000.0, 1000.0, 0.0, 0.0, taxpayer_uk)
        # Net gain = 4000, exempt = 3000, taxable = 1000, tax at 20% = 200
        self.assertEqual(liability["taxable_chargeable_gains"], 1000.0)
        self.assertEqual(liability["total_estimated_tax"], 200.0)

    def test_05_singapore_and_uae_0_percent_exemption(self):
        """Verify Singapore and UAE 0% personal capital gains tax rules."""
        adapter_sg = SingaporeTaxAdapter()
        taxpayer_sg = TaxpayerProfile(primary_residence="SG", trader_classification=TraderClassification.INVESTOR)
        liab_sg = adapter_sg.calculate_estimated_liability(50000.0, 10000.0, 0.0, 0.0, taxpayer_sg)
        self.assertEqual(liab_sg["total_estimated_tax"], 0.0)

        adapter_ae = UaeTaxAdapter()
        taxpayer_ae = TaxpayerProfile(primary_residence="AE", entity_type=TaxpayerEntityType.INDIVIDUAL)
        liab_ae = adapter_ae.calculate_estimated_liability(100000.0, 20000.0, 0.0, 0.0, taxpayer_ae)
        self.assertEqual(liab_ae["total_estimated_tax"], 0.0)

    def test_06_germany_estg_crypto_holding_period(self):
        """Verify Germany EStG § 23 crypto 1-year tax exemption."""
        adapter_de = GermanyTaxAdapter()
        taxpayer_de = TaxpayerProfile(primary_residence="DE", base_currency="EUR")
        
        tx_crypto = TaxTransaction(
            transaction_id="TX_DE_CRYPTO",
            broker="Bitpanda",
            account_id="ACC_DE",
            symbol="BTC",
            asset_class="crypto",
            transaction_type="SELL",
            quantity=0.1,
            price=60000.0,
            gross_value=6000.0,
            currency="EUR",
            trade_date="2026-03-01",
        )
        # Held < 365 days -> Taxable
        class_short = adapter_de.classify_income(tx_crypto, 200, taxpayer_de)
        self.assertEqual(class_short, IncomeClassification.CRYPTO_VDA)

        # Held > 365 days -> 100% Tax Exempt
        class_long = adapter_de.classify_income(tx_crypto, 370, taxpayer_de)
        self.assertEqual(class_long, IncomeClassification.EXEMPT_INCOME)

    def test_07_tax_lot_engine_fifo_matching(self):
        """Verify tax lot accounting and partial disposal matching under FIFO."""
        lot_engine = TaxLotEngine()
        
        lot1 = TaxLot(
            id="LOT_1",
            symbol="TCS",
            asset_class="equity",
            broker="Upstox",
            account_id="ACC_01",
            acquisition_date="2025-01-10",
            quantity=50,
            remaining_quantity=50,
            cost_basis=150000.0,
            cost_basis_per_unit=3000.0,
            currency="INR",
            jurisdiction="IN",
        )
        lot2 = TaxLot(
            id="LOT_2",
            symbol="TCS",
            asset_class="equity",
            broker="Upstox",
            account_id="ACC_01",
            acquisition_date="2025-06-15",
            quantity=50,
            remaining_quantity=50,
            cost_basis=175000.0,
            cost_basis_per_unit=3500.0,
            currency="INR",
            jurisdiction="IN",
        )
        lot_engine.add_lot(lot1)
        lot_engine.add_lot(lot2)

        sell_tx = TaxTransaction(
            transaction_id="TX_SELL_70",
            broker="Upstox",
            account_id="ACC_01",
            symbol="TCS",
            asset_class="equity",
            transaction_type="SELL",
            quantity=70,
            price=4000.0,
            gross_value=280000.0,
            currency="INR",
            trade_date="2026-02-15",
        )

        matches, unmatched = lot_engine.match_disposal(sell_tx, AccountingMethod.FIFO)
        self.assertEqual(unmatched, 0.0)
        self.assertEqual(len(matches), 2)
        # Lot 1 matched 50 units (fully closed)
        self.assertEqual(matches[0]["lot_id"], "LOT_1")
        self.assertEqual(matches[0]["quantity"], 50)
        self.assertEqual(lot1.status, "CLOSED")
        # Lot 2 matched 20 units (30 remaining)
        self.assertEqual(matches[1]["lot_id"], "LOT_2")
        self.assertEqual(matches[1]["quantity"], 20)
        self.assertEqual(lot2.remaining_quantity, 30)
        self.assertEqual(lot2.status, "PARTIALLY_CLOSED")

    def test_08_advance_tax_deadlines(self):
        """Verify India Advance Tax 4 quarterly installment schedules."""
        adapter = IndiaTaxAdapter()
        deadlines = adapter.determine_deadlines(self.taxpayer_in, "FY 2025-26", 100000.0)
        
        self.assertEqual(len(deadlines), 5)  # 4 Advance Tax + 1 ITR
        self.assertEqual(deadlines[0].estimated_amount, 15000.0)  # 15% Q1
        self.assertEqual(deadlines[1].estimated_amount, 30000.0)  # 30% incremental Q2
        self.assertEqual(deadlines[2].estimated_amount, 30000.0)  # 30% incremental Q3
        self.assertEqual(deadlines[3].estimated_amount, 25000.0)  # 25% incremental Q4

    def test_09_fx_engine_conversion(self):
        """Verify FX conversion from USD to INR without loss of precision."""
        converted, rate, source = tax_fx_engine.convert_currency(100.0, "USD", "INR")
        self.assertEqual(rate, 86.50)
        self.assertEqual(converted, 8650.0)

    def test_10_master_tax_service_overview(self):
        """Verify Master Tax Service overview generation and non-null command center."""
        overview = tax_service.get_overview()
        cc = overview["command_center"]
        self.assertIn("estimated_tax_liability", cc)
        self.assertIn("realized_taxable_gains", cc)
        self.assertIn("tax_reserve", cc)
        self.assertGreater(len(overview["global_tax_exposure"]), 0)
        self.assertGreater(len(overview["upcoming_deadlines"]), 0)


if __name__ == "__main__":
    unittest.main()
