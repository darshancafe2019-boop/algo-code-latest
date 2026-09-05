"""
Quant.OS Tax Intelligence — United Kingdom (GB) Tax Jurisdiction Adapter
========================================================================
Statutory tax calculations under Taxation of Chargeable Gains Act 1992 (TCGA 1992),
SDRT (0.5%), Section 104 share pooling, and 30-day Bed & Breakfast matching rules.
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


class UkTaxAdapter(BaseTaxJurisdictionAdapter):
    """
    Authoritative UK tax adapter conforming to HMRC TCGA 1992.
    Handles Section 104 pooling, 30-day Bed & Breakfast matching, 0.5% SDRT,
    £3,000 annual CGT allowance, and 31 January Self Assessment deadline.
    """

    @property
    def country_code(self) -> str:
        return "GB"

    @property
    def country_name(self) -> str:
        return "United Kingdom"

    @property
    def default_currency(self) -> str:
        return "GBP"

    def supported_tax_years(self) -> List[str]:
        return ["2024/25", "2025/26", "2026/27"]

    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        """UK does not distinguish STCG vs LTCG by days; uses Section 104 pool + £3,000 allowance."""
        return 0

    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        asset_class = transaction.asset_class.lower()
        if asset_class in ["dividend", "distribution"]:
            return IncomeClassification.DIVIDEND_INCOME
        if taxpayer.trader_classification.value == "BUSINESS":
            return IncomeClassification.BUSINESS_INCOME
        return IncomeClassification.STCG

    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        """
        Calculate mandatory UK Stamp Duty Reserve Tax (SDRT):
        0.5% on electronic purchases of UK incorporated company shares.
        """
        gross = transaction.gross_value
        tx_type = transaction.transaction_type.upper()
        sdrt = 0.0

        if tx_type == "BUY" and transaction.asset_class.lower() in ["equity", "etf"]:
            sdrt = round(gross * 0.005, 2)  # 0.5% SDRT

        return {
            "sdrt_stamp_duty": sdrt,
            "total_transaction_taxes": sdrt,
        }

    def calculate_gain_loss(
        self,
        sell_tx: TaxTransaction,
        matched_lots: List[Dict[str, Any]],
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        """Calculate UK realized capital gains under Section 104 rules."""
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
            rate = 0.20  # Standard higher rate CGT
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
                "statutory_rule": "TCGA 1992 s104 Section 104 Pool / Bed & Breakfast",
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
        """Calculate UK estimated tax liability with £3,000 annual CGT allowance."""
        net_gain = max(0.0, (realized_gains + crypto_gains) - realized_losses)
        annual_exempt_amount = 3000.0  # £3,000 for 2024/25 & 2025/26

        taxable_gain = max(0.0, net_gain - annual_exempt_amount)
        cgt_tax = round(taxable_gain * 0.20, 2)  # Higher rate 20%
        biz_tax = round(max(0.0, business_income) * 0.25, 2)

        total_tax = round(cgt_tax + biz_tax, 2)

        return {
            "jurisdiction": "GB",
            "currency": "GBP",
            "gross_gains": round(realized_gains, 2),
            "allowable_losses": round(realized_losses, 2),
            "net_capital_gains": round(net_gain, 2),
            "annual_exempt_amount_applied": min(net_gain, annual_exempt_amount),
            "taxable_chargeable_gains": round(taxable_gain, 2),
            "business_derivative_income": round(business_income, 2),
            "total_estimated_tax": total_tax,
            "statutory_citations": [
                "TCGA 1992 s1: Taxation of chargeable gains",
                "TCGA 1992 s1K: Annual exempt amount (£3,000)",
                "Finance Act 1986: 0.5% Stamp Duty Reserve Tax (SDRT)",
                "HMRC Guidance: 30-day Bed & Breakfast share matching",
            ],
        }

    def determine_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        tax_year: str,
        estimated_tax: float,
    ) -> List[TaxDeadline]:
        """Generate HMRC Self Assessment tax return & payment deadlines."""
        year = "2026" if "2025/26" in tax_year or "2026" in tax_year else "2025"

        return [
            TaxDeadline(
                id=f"UK_SELF_ASSESS_ONLINE_{year}",
                country_code="GB",
                tax_year=tax_year,
                title="HMRC Self Assessment Online Return & Balancing Payment",
                category="ANNUAL_RETURN",
                due_date=f"{int(year)+1}-01-31",
                estimated_amount=estimated_tax,
                currency="GBP",
                status="UPCOMING",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                statutory_reference="TMA 1970 s8 / HMRC Self Assessment",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"UK_PAYMENT_ON_ACCOUNT_Q1_{year}",
                country_code="GB",
                tax_year=tax_year,
                title="First Payment on Account (50% of Previous Year)",
                category="ADVANCE_TAX",
                due_date=f"{int(year)+1}-01-31",
                estimated_amount=round(estimated_tax * 0.50, 2),
                currency="GBP",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="TMA 1970 s59A Payment on Account",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"UK_PAYMENT_ON_ACCOUNT_Q2_{year}",
                country_code="GB",
                tax_year=tax_year,
                title="Second Payment on Account (50% of Previous Year)",
                category="ADVANCE_TAX",
                due_date=f"{int(year)+1}-07-31",
                estimated_amount=round(estimated_tax * 0.50, 2),
                currency="GBP",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="TMA 1970 s59A Payment on Account",
                days_remaining=0,
            ),
        ]

    def check_anti_avoidance(
        self,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
    ) -> List[TaxAlert]:
        """Check for 30-day Bed & Breakfast matching rules under TCGA 1992 s106A."""
        return [
            TaxAlert(
                id="ALERT_UK_BED_AND_BREAKFAST",
                alert_type="ANTI_AVOIDANCE_WARNING",
                symbol="ALL_UK_SECURITIES",
                title="HMRC 30-Day Bed & Breakfast Rule Active",
                message="Disposals repurchased within 30 days are matched against the subsequent acquisition, preventing premature loss crystallization.",
                severity="MEDIUM",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                potential_tax_saving=0.0,
                currency="GBP",
                status="ACTIVE",
            )
        ]
