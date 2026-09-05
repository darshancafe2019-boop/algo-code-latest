"""
Quant.OS Tax Intelligence — Master Tax Service Orchestrator
===========================================================
High-level singleton providing cached, high-speed access to all Tax Intelligence APIs,
reconciliations, position monitors, and What-If scenario simulations.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from src.tax_engine.action_advisor import tax_action_advisor
from src.tax_engine.anti_avoidance import anti_avoidance_engine
from src.tax_engine.deadline_engine import tax_deadline_engine
from src.tax_engine.jurisdiction_resolver import jurisdiction_resolver
from src.tax_engine.liability_engine import tax_liability_engine
from src.tax_engine.models import (
    AccountingMethod,
    CountryCoverageInfo,
    IncomeClassification,
    TaxAlert,
    TaxConfidence,
    TaxDeadline,
    TaxDocumentItem,
    TaxLot,
    TaxpayerEntityType,
    TaxpayerProfile,
    TaxRule,
    TaxTransaction,
    TraderClassification,
)
from src.tax_engine.reminder_engine import tax_reminder_engine
from src.tax_engine.rule_registry import tax_rule_registry
from src.tax_engine.tax_lot_engine import tax_lot_engine


class TaxService:
    """
    Main Tax Intelligence orchestrator.
    Serves all frontend requests with low-latency cached summaries.
    """

    def __init__(self):
        self._profile: TaxpayerProfile = TaxpayerProfile()
        self._transactions: List[TaxTransaction] = []
        self._open_lots: List[TaxLot] = []
        self._documents: List[TaxDocumentItem] = []
        self._cached_overview: Optional[Dict[str, Any]] = None
        self._last_calculation_time: Optional[datetime] = None
        
        self._seed_initial_institutional_data()

    def _seed_initial_institutional_data(self) -> None:
        """Seed realistic institutional multi-broker, multi-asset portfolio data."""
        # Open Lots
        lots = [
            TaxLot(
                id="LOT_RELIANCE_001",
                symbol="RELIANCE",
                asset_class="equity",
                broker="Upstox",
                account_id="ACC_IN_01",
                acquisition_date="2025-04-10",
                quantity=200,
                remaining_quantity=200,
                cost_basis=578000.0,
                cost_basis_per_unit=2890.0,
                currency="INR",
                jurisdiction="IN",
                accounting_method=AccountingMethod.FIFO,
            ),
            TaxLot(
                id="LOT_TCS_002",
                symbol="TCS",
                asset_class="equity",
                broker="Dhan",
                account_id="ACC_IN_02",
                acquisition_date="2025-09-20",
                quantity=100,
                remaining_quantity=100,
                cost_basis=395000.0,
                cost_basis_per_unit=3950.0,
                currency="INR",
                jurisdiction="IN",
                accounting_method=AccountingMethod.FIFO,
            ),
            TaxLot(
                id="LOT_HDFCBANK_003",
                symbol="HDFCBANK",
                asset_class="equity",
                broker="Upstox",
                account_id="ACC_IN_01",
                acquisition_date="2026-01-15",
                quantity=300,
                remaining_quantity=300,
                cost_basis=504000.0,
                cost_basis_per_unit=1680.0,
                currency="INR",
                jurisdiction="IN",
                accounting_method=AccountingMethod.FIFO,
            ),
            TaxLot(
                id="LOT_BTC_004",
                symbol="BTC/USDT",
                asset_class="crypto",
                broker="Binance",
                account_id="ACC_CRYPTO_01",
                acquisition_date="2025-11-05",
                quantity=0.5,
                remaining_quantity=0.5,
                cost_basis=3892500.0,  # ~ $45,000 in INR
                cost_basis_per_unit=7785000.0,
                currency="INR",
                jurisdiction="IN",
                accounting_method=AccountingMethod.FIFO,
            ),
            TaxLot(
                id="LOT_AAPL_005",
                symbol="AAPL",
                asset_class="equity",
                broker="Interactive Brokers",
                account_id="ACC_US_01",
                acquisition_date="2025-06-15",
                quantity=50,
                remaining_quantity=50,
                cost_basis=994750.0,  # $230 * 86.5 * 50
                cost_basis_per_unit=19895.0,
                currency="INR",
                jurisdiction="US",
                accounting_method=AccountingMethod.FIFO,
            ),
        ]
        self._open_lots = lots
        for lot in lots:
            tax_lot_engine.add_lot(lot)

        # Realized Transactions
        self._transactions = [
            TaxTransaction(
                transaction_id="TX_INFY_SELL_01",
                broker="Upstox",
                account_id="ACC_IN_01",
                symbol="INFY",
                asset_class="equity",
                transaction_type="SELL",
                quantity=150,
                price=1850.0,
                gross_value=277500.0,
                currency="INR",
                trade_date="2026-02-10",
                commission=20.0,
                exchange_fees=9.57,
                transaction_taxes=277.50,  # STT 0.1%
                withholding_tax=0.0,
                jurisdiction="IN",
                income_classification=IncomeClassification.STCG,
                holding_period_days=180,
                realized_gain_loss=45000.0,
                estimated_tax=9000.0,  # 20% STCG
                tax_rule_version="v2024.2",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
            ),
            TaxTransaction(
                transaction_id="TX_NIFTY_FUT_02",
                broker="Dhan",
                account_id="ACC_IN_02",
                symbol="NIFTY26MARFUT",
                asset_class="future",
                transaction_type="SELL",
                quantity=50,
                price=24500.0,
                gross_value=1225000.0,
                currency="INR",
                trade_date="2026-03-01",
                commission=40.0,
                exchange_fees=42.26,
                transaction_taxes=245.0,  # STT 0.02%
                withholding_tax=0.0,
                jurisdiction="IN",
                income_classification=IncomeClassification.NON_SPECULATIVE_DERIVATIVE,
                holding_period_days=14,
                realized_gain_loss=28000.0,
                estimated_tax=8400.0,
                tax_rule_version="v2024.2",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
            ),
            TaxTransaction(
                transaction_id="TX_TATA_LOSS_03",
                broker="Upstox",
                account_id="ACC_IN_01",
                symbol="TATAMOTORS",
                asset_class="equity",
                transaction_type="SELL",
                quantity=200,
                price=880.0,
                gross_value=176000.0,
                currency="INR",
                trade_date="2026-01-20",
                commission=20.0,
                exchange_fees=6.07,
                transaction_taxes=176.0,
                withholding_tax=0.0,
                jurisdiction="IN",
                income_classification=IncomeClassification.STCG,
                holding_period_days=95,
                realized_gain_loss=-18000.0,  # Loss
                estimated_tax=0.0,
                tax_rule_version="v2024.2",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
            ),
            TaxTransaction(
                transaction_id="TX_AAPL_DIV_04",
                broker="Interactive Brokers",
                account_id="ACC_US_01",
                symbol="AAPL",
                asset_class="dividend",
                transaction_type="DIVIDEND",
                quantity=50,
                price=0.25,
                gross_value=1081.25,  # $12.50 * 86.5
                currency="INR",
                trade_date="2026-02-15",
                commission=0.0,
                exchange_fees=0.0,
                transaction_taxes=0.0,
                withholding_tax=270.31,  # 25% US Withholding under DTAA
                jurisdiction="US",
                income_classification=IncomeClassification.DIVIDEND_INCOME,
                holding_period_days=0,
                realized_gain_loss=1081.25,
                estimated_tax=270.31,
                tax_rule_version="v2025.1",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
            ),
        ]

        # Compliance Documents Checklist
        self._documents = [
            TaxDocumentItem(
                id="DOC_UPSTOX_ANNUAL_STMT",
                title="Upstox Annual Global Capital Gains Statement FY 2025-26",
                country_code="IN",
                tax_year="FY 2025-26",
                category="BROKER_TAX_STATEMENT",
                status="RECEIVED",
                description="Consolidated transaction ledger, realized P&L, STT, and turnover audit sheet.",
                due_date="2026-05-31",
            ),
            TaxDocumentItem(
                id="DOC_DHAN_CONTRACT_NOTES",
                title="Dhan Derivatives Contract Notes & Ledger (F&O Sec 43(5))",
                country_code="IN",
                tax_year="FY 2025-26",
                category="DERIVATIVE_LEDGER",
                status="VERIFIED",
                description="Verified digital contract notes with transaction tax and stamp duty breakdown.",
                due_date="2026-05-31",
            ),
            TaxDocumentItem(
                id="DOC_IBKR_FORM_1042S",
                title="Interactive Brokers Form 1042-S / Foreign Tax Credit Certificate",
                country_code="US",
                tax_year="TY 2025",
                category="FOREIGN_TAX_CREDIT",
                status="REQUIRED",
                description="IRS Form 1042-S reporting Foreign Person's U.S. Source Income Subject to Withholding.",
                due_date="2026-04-15",
            ),
            TaxDocumentItem(
                id="DOC_CRYPTO_VDA_194S",
                title="Form 16A TDS Certificate (Section 194S Crypto)",
                country_code="IN",
                tax_year="FY 2025-26",
                category="WITHHOLDING_CERTIFICATE",
                status="MISSING",
                description="1% TDS deduction certificate on VDA crypto transfers under Section 194S.",
                due_date="2026-06-15",
            ),
            TaxDocumentItem(
                id="DOC_TAX_RESIDENCY_CERT",
                title="Tax Residency Certificate (TRC Form 10F)",
                country_code="IN",
                tax_year="FY 2025-26",
                category="TREATY_DOCUMENT",
                status="VERIFIED",
                description="Certificate of Indian tax residence for DTAA relief with US/UK/Singapore.",
                due_date="2026-03-31",
            ),
        ]

    # --- API Service Methods ---

    def get_profile(self) -> Dict[str, Any]:
        return self._profile.to_dict()

    def update_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        if "primary_residence" in profile_data:
            self._profile.primary_residence = profile_data["primary_residence"]
        if "secondary_residence" in profile_data:
            self._profile.secondary_residence = profile_data["secondary_residence"]
        if "citizenship" in profile_data:
            self._profile.citizenship = profile_data["citizenship"]
        if "entity_type" in profile_data:
            self._profile.entity_type = TaxpayerEntityType(profile_data["entity_type"])
        if "trader_classification" in profile_data:
            self._profile.trader_classification = TraderClassification(profile_data["trader_classification"])
        if "accounting_method" in profile_data:
            self._profile.accounting_method = AccountingMethod(profile_data["accounting_method"])
        if "tax_id_masked" in profile_data:
            self._profile.tax_id_masked = profile_data["tax_id_masked"]
        if "base_currency" in profile_data:
            self._profile.base_currency = profile_data["base_currency"]
        if "tax_reserve_rate" in profile_data:
            self._profile.tax_reserve_rate = float(profile_data["tax_reserve_rate"])

        self._profile.updated_at = datetime.now(timezone.utc).isoformat()
        self._cached_overview = None  # Invalidate cache
        return self._profile.to_dict()

    def get_overview(self) -> Dict[str, Any]:
        """Return the master Tax Command Center dashboard payload."""
        # 1. Compute liability
        liability = tax_liability_engine.compute_portfolio_liability(
            taxpayer=self._profile,
            transactions=self._transactions,
            open_lots=self._open_lots,
            tax_year="FY 2025-26",
        )

        # 2. Deadlines and Reminders
        deadlines = tax_deadline_engine.get_upcoming_deadlines(
            taxpayer=self._profile,
            estimated_tax=liability["estimated_tax_liability"],
            tax_year="FY 2025-26",
        )
        reminders = tax_reminder_engine.generate_reminders_for_deadlines(deadlines, self._profile)

        # 3. Position monitor and advisory alerts
        current_prices = {
            "RELIANCE": 3150.0,
            "TCS": 4200.0,
            "HDFCBANK": 1580.0,
            "BTC/USDT": 7250000.0,
            "AAPL": 21500.0,
        }
        analyzed_positions = tax_action_advisor.analyze_open_positions(
            open_lots=self._open_lots,
            current_prices=current_prices,
            taxpayer=self._profile,
            all_transactions=self._transactions,
        )
        advisory_alerts = tax_action_advisor.generate_advisory_alerts(analyzed_positions, self._profile)

        all_alerts = reminders + advisory_alerts

        # 4. Global Jurisdiction Exposures Table
        jurisdictions = jurisdiction_resolver.resolve_jurisdictions(self._profile)
        exposure_table = []
        for j in jurisdictions:
            est_liab = liability["estimated_tax_liability"] if j.country_code == self._profile.primary_residence else (liability["taxes_already_withheld"] if j.country_code == "US" else 0.0)
            paid = liability["transaction_taxes_paid"] if j.country_code == self._profile.primary_residence else (liability["taxes_already_withheld"] if j.country_code == "US" else 0.0)
            rem = max(0.0, est_liab - paid)
            next_dl = deadlines[0].due_date if (deadlines and j.country_code == self._profile.primary_residence) else "N/A"

            exposure_table.append({
                "country_code": j.country_code,
                "country_name": j.jurisdiction_name,
                "relationship": j.relationship.value if hasattr(j.relationship, "value") else j.relationship,
                "tax_type": "Capital Gains / Trading / STT" if j.country_code == "IN" else ("Dividend Withholding (IRC)" if j.country_code == "US" else "Portfolio Exposure"),
                "estimated_liability": round(est_liab, 2),
                "paid_withheld": round(paid, 2),
                "remaining_estimate": round(rem, 2),
                "next_deadline": next_dl,
                "confidence": j.confidence.value if hasattr(j.confidence, "value") else j.confidence,
                "explanation": j.explanation,
                "treaty_relevant": j.treaty_relevant,
            })

        # Calculate unrealized tax exposure
        unrealized_pl_total = sum(p["unrealized_pl"] for p in analyzed_positions)
        unrealized_tax_total = sum(p["estimated_tax_if_sold_now"] for p in analyzed_positions)
        tax_loss_opportunities = sum(p["potential_tax_savings_waiting"] for p in analyzed_positions if p["unrealized_pl"] > 0)

        return {
            "profile": self._profile.to_dict(),
            "liability_summary": liability,
            "command_center": {
                "estimated_tax_liability": liability["estimated_tax_liability"],
                "realized_taxable_gains": liability["gross_realized_gains"],
                "realized_losses": liability["allowable_losses"],
                "net_realized_pl": liability["net_capital_gains"],
                "unrealized_tax_exposure": round(unrealized_tax_total, 2),
                "total_unrealized_pl": round(unrealized_pl_total, 2),
                "taxes_already_withheld": liability["taxes_already_withheld"],
                "transaction_taxes_paid": liability["transaction_taxes_paid"],
                "upcoming_tax_payments": round(sum(d.estimated_amount for d in deadlines[:2]), 2),
                "tax_loss_opportunities": round(tax_loss_opportunities, 2),
                "tax_reserve": liability["suggested_tax_reserve"],
                "compliance_status": "COMPLIANT" if not any(d.status == "OVERDUE" for d in deadlines) else "ACTION_REQUIRED",
                "confidence": liability["confidence"],
            },
            "global_tax_exposure": exposure_table,
            "upcoming_deadlines": [d.to_dict() for d in deadlines],
            "tax_alerts": [a.to_dict() for a in all_alerts],
            "analyzed_positions": analyzed_positions,
            "legal_disclaimer": "Tax calculations are decision-support estimates based on available transaction, taxpayer, and statutory jurisdiction data. Complex cases may require verification by a qualified tax professional.",
        }

    def get_positions(self) -> List[Dict[str, Any]]:
        current_prices = {
            "RELIANCE": 3150.0,
            "TCS": 4200.0,
            "HDFCBANK": 1580.0,
            "BTC/USDT": 7250000.0,
            "AAPL": 21500.0,
        }
        return tax_action_advisor.analyze_open_positions(
            open_lots=self._open_lots,
            current_prices=current_prices,
            taxpayer=self._profile,
            all_transactions=self._transactions,
        )

    def get_tax_lots(self) -> List[Dict[str, Any]]:
        lots = tax_lot_engine.get_open_lots()
        result = []
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for lot in lots:
            acq = tax_lot_engine._parse_date(lot.acquisition_date)
            days = (now - acq).days if acq else 0
            cur_price = 3150.0 if lot.symbol == "RELIANCE" else (4200.0 if lot.symbol == "TCS" else 1580.0)
            if "BTC" in lot.symbol:
                cur_price = 7250000.0
            elif "AAPL" in lot.symbol:
                cur_price = 21500.0

            pl = round((cur_price - lot.cost_basis_per_unit) * lot.remaining_quantity, 2)
            classification = "LONG_TERM_CAPITAL_GAIN" if days > 365 else "SHORT_TERM_CAPITAL_GAIN"
            if lot.asset_class == "crypto":
                classification = "CRYPTO_VDA_INCOME"

            lot_dict = lot.to_dict()
            lot_dict.update({
                "holding_period_days": days,
                "current_price": cur_price,
                "unrealized_pl": pl,
                "tax_classification": classification,
            })
            result.append(lot_dict)
        return result

    def get_transactions(self) -> List[Dict[str, Any]]:
        return [t.to_dict() for t in self._transactions]

    def get_countries(self) -> List[Dict[str, Any]]:
        coverage = tax_rule_registry.get_country_coverage()
        return [c.to_dict() for c in coverage]

    def get_calendar(self) -> List[Dict[str, Any]]:
        liability = tax_liability_engine.compute_portfolio_liability(
            taxpayer=self._profile,
            transactions=self._transactions,
            open_lots=self._open_lots,
        )
        deadlines = tax_deadline_engine.get_upcoming_deadlines(
            taxpayer=self._profile,
            estimated_tax=liability["estimated_tax_liability"],
        )
        return [d.to_dict() for d in deadlines]

    def get_alerts(self) -> List[Dict[str, Any]]:
        overview = self.get_overview()
        return overview["tax_alerts"]

    def get_documents(self) -> List[Dict[str, Any]]:
        return [d.to_dict() for d in self._documents]

    def get_rule_sources(self) -> List[Dict[str, Any]]:
        rules = tax_rule_registry.get_all_rules()
        return [r.to_dict() for r in rules]

    def simulate_what_if(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate tax impact of proposed trade actions:
        - Closing position today vs X days later
        - Price changes
        - Partial closes (25%, 50%, 100%)
        - Option exercise
        DOES NOT execute live trades.
        """
        symbol = params.get("symbol", "RELIANCE")
        quantity = float(params.get("quantity", 100))
        simulated_price = float(params.get("price", 3200.0))
        days_in_future = int(params.get("days_in_future", 0))

        # Find matching lot
        matching_lot = next((l for l in self._open_lots if l.symbol == symbol), None)
        cost_unit = matching_lot.cost_basis_per_unit if matching_lot else 2890.0

        gross_value = round(quantity * simulated_price, 2)
        cost_basis = round(quantity * cost_unit, 2)
        realized_pl = round(gross_value - cost_basis, 2)

        # STT Calculation
        stt = round(gross_value * 0.001, 2)  # 0.1%

        # Holding period evaluation
        base_days = 200
        total_days = base_days + days_in_future
        is_ltcg = total_days > 365

        tax_rate = 0.125 if is_ltcg else 0.20
        est_tax = round(max(0.0, realized_pl) * tax_rate, 2)
        net_after_tax = round(realized_pl - est_tax - stt, 2)

        # Alternative scenario: Waiting past 365 days
        days_to_ltcg = max(0, 366 - base_days)
        est_tax_if_ltcg = round(max(0.0, realized_pl) * 0.125, 2)
        tax_saved_waiting = round(max(0.0, (realized_pl * 0.20) - est_tax_if_ltcg), 2) if not is_ltcg else 0.0

        return {
            "symbol": symbol,
            "quantity": quantity,
            "simulated_price": simulated_price,
            "simulated_date_offset_days": days_in_future,
            "gross_value": gross_value,
            "cost_basis": cost_basis,
            "simulated_realized_pl": realized_pl,
            "transaction_taxes_stt": stt,
            "holding_period_days": total_days,
            "tax_classification": "LONG_TERM_CAPITAL_GAIN" if is_ltcg else "SHORT_TERM_CAPITAL_GAIN",
            "statutory_rate": f"{tax_rate * 100:.1f}%",
            "estimated_tax_effect": est_tax,
            "net_after_tax_result": net_after_tax,
            "days_until_ltcg_threshold": days_to_ltcg,
            "potential_tax_saved_if_held_past_threshold": tax_saved_waiting,
            "confidence": TaxConfidence.HIGH_CONFIDENCE_ESTIMATE.value,
            "statutory_source": "Finance Act 2024 (Section 111A / 112A)",
        }


# Global Singleton
tax_service = TaxService()
