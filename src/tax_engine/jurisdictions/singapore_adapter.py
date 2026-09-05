"""
Quant.OS Tax Intelligence — Singapore (SG) Tax Jurisdiction Adapter
===================================================================
Statutory tax calculations under Singapore Income Tax Act 1947 (IRAS).
0% capital gains tax on investments; business trading income evaluation.
"""

from typing import Any, Dict, List
from src.tax_engine.jurisdictions.base_adapter import BaseTaxJurisdictionAdapter
from src.tax_engine.models import (
    IncomeClassification,
    TaxAlert,
    TaxConfidence,
    TaxDeadline,
    TaxLot,
    TaxpayerProfile,
    TaxTransaction,
)


class SingaporeTaxAdapter(BaseTaxJurisdictionAdapter):
    """
    Authoritative Singapore tax adapter under IRAS Income Tax Act 1947.
    Standard investment capital gains are 0% exempt.
    """

    @property
    def country_code(self) -> str:
        return "SG"

    @property
    def country_name(self) -> str:
        return "Singapore"

    @property
    def default_currency(self) -> str:
        return "SGD"

    def supported_tax_years(self) -> List[str]:
        return ["YA 2025", "YA 2026", "YA 2027"]

    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        return 0

    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        if taxpayer.trader_classification.value == "BUSINESS":
            return IncomeClassification.BUSINESS_INCOME
        return IncomeClassification.EXEMPT_INCOME

    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        """Singapore imposes 0.2% stamp duty on physical share transfers, 0% on scripless exchange trades."""
        return {
            "stamp_duty": 0.0,
            "total_transaction_taxes": 0.0,
        }

    def calculate_gain_loss(
        self,
        sell_tx: TaxTransaction,
        matched_lots: List[Dict[str, Any]],
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        total_cost_basis = 0.0
        total_realized_pl = 0.0
        details = []

        for match in matched_lots:
            qty = match["quantity"]
            unit_cost = match["cost_basis_per_unit"]
            cost = round(qty * unit_cost, 2)
            proceeds = round(qty * sell_tx.price, 2)
            pl = round(proceeds - cost, 2)
            days = match.get("holding_period_days", 0)

            classification = self.classify_income(sell_tx, days, taxpayer)
            rate = 0.17 if classification == IncomeClassification.BUSINESS_INCOME else 0.0
            est_tax = round(max(0.0, pl) * rate, 2)

            total_cost_basis += cost
            total_realized_pl += pl

            details.append({
                "lot_id": match.get("lot_id", ""),
                "quantity": qty,
                "cost_basis": cost,
                "proceeds": proceeds,
                "realized_pl": pl,
                "holding_period_days": days,
                "classification": classification.value,
                "applicable_rate": rate,
                "estimated_tax": est_tax,
                "statutory_rule": "Income Tax Act 1947 Section 10 (0% Capital Gains Exemption)",
            })

        return {
            "total_cost_basis": round(total_cost_basis, 2),
            "total_realized_pl": round(total_realized_pl, 2),
            "lot_details": details,
        }

    def calculate_estimated_liability(
        self,
        realized_gains: float,
        realized_losses: float,
        business_income: float,
        crypto_gains: float,
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        """Gains are 0% exempt for investors; 17% corporate / progressive individual rate for businesses."""
        is_business = taxpayer.trader_classification.value == "BUSINESS"
        tax_rate = 0.17 if is_business else 0.0
        taxable_amt = business_income if is_business else 0.0
        total_tax = round(max(0.0, taxable_amt) * tax_rate, 2)

        return {
            "jurisdiction": "SG",
            "currency": "SGD",
            "gross_gains": round(realized_gains, 2),
            "allowable_losses": round(realized_losses, 2),
            "net_capital_gains": round(realized_gains - realized_losses, 2),
            "exempt_capital_gains": round(realized_gains if not is_business else 0.0, 2),
            "business_trading_income": round(business_income, 2),
            "total_estimated_tax": total_tax,
            "statutory_citations": [
                "Income Tax Act 1947: No capital gains tax on investment assets",
                "IRAS Guidelines: Gains from share disposals treated as capital receipts",
            ],
        }

    def determine_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        tax_year: str,
        estimated_tax: float,
    ) -> List[TaxDeadline]:
        year = "2026" if "2026" in tax_year else "2025"

        return [
            TaxDeadline(
                id=f"SG_IRAS_EFILING_{year}",
                country_code="SG",
                tax_year=tax_year,
                title="IRAS Individual Income Tax e-Filing (myTax Portal)",
                category="ANNUAL_RETURN",
                due_date=f"{int(year)+1}-04-18",
                estimated_amount=estimated_tax,
                currency="SGD",
                status="UPCOMING",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                statutory_reference="IRAS Income Tax Act Section 62",
                days_remaining=0,
            ),
        ]

    def check_anti_avoidance(
        self,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
    ) -> List[TaxAlert]:
        return [
            TaxAlert(
                id="ALERT_SG_ZERO_CGT",
                alert_type="EXEMPT_STATUS_CONFIRMED",
                symbol="ALL_SG_INVESTMENTS",
                title="Singapore 0% Capital Gains Exemption Active",
                message="Under IRAS guidelines, investment capital gains are non-taxable unless classified as carrying on a trade/business.",
                severity="INFORMATIONAL",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                potential_tax_saving=0.0,
                currency="SGD",
                status="ACTIVE",
            )
        ]
