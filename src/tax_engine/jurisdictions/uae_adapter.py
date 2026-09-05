"""
Quant.OS Tax Intelligence — United Arab Emirates (AE) Tax Jurisdiction Adapter
==============================================================================
Statutory tax calculations under UAE Federal Decree-Law No. 47 of 2022.
0% personal capital gains on investments and crypto; corporate tax rules.
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


class UaeTaxAdapter(BaseTaxJurisdictionAdapter):
    """
    Authoritative UAE tax adapter under Federal Tax Authority (FTA).
    0% personal income tax on investment capital gains, dividends, and crypto.
    """

    @property
    def country_code(self) -> str:
        return "AE"

    @property
    def country_name(self) -> str:
        return "United Arab Emirates"

    @property
    def default_currency(self) -> str:
        return "AED"

    def supported_tax_years(self) -> List[str]:
        return ["TY 2024", "TY 2025", "TY 2026"]

    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        return 0

    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        if taxpayer.entity_type.value == "COMPANY":
            return IncomeClassification.BUSINESS_INCOME
        return IncomeClassification.EXEMPT_INCOME

    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        return {
            "transaction_tax": 0.0,
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

        is_corp = taxpayer.entity_type.value == "COMPANY"

        for match in matched_lots:
            qty = match["quantity"]
            unit_cost = match["cost_basis_per_unit"]
            cost = round(qty * unit_cost, 2)
            proceeds = round(qty * sell_tx.price, 2)
            pl = round(proceeds - cost, 2)
            days = match.get("holding_period_days", 0)

            classification = self.classify_income(sell_tx, days, taxpayer)
            rate = 0.09 if is_corp else 0.0
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
                "statutory_rule": "Federal Decree-Law No. 47 of 2022 (0% Personal Investment Gains)",
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
        """0% for natural person investors; 9% corporate tax on taxable profits > AED 375,000."""
        is_corp = taxpayer.entity_type.value == "COMPANY"
        taxable_profit = max(0.0, (business_income + realized_gains) - 375000.0) if is_corp else 0.0
        est_tax = round(taxable_profit * 0.09, 2)

        return {
            "jurisdiction": "AE",
            "currency": "AED",
            "gross_gains": round(realized_gains, 2),
            "allowable_losses": round(realized_losses, 2),
            "net_capital_gains": round(realized_gains - realized_losses, 2),
            "corporate_taxable_profit": round(taxable_profit, 2),
            "total_estimated_tax": est_tax,
            "statutory_citations": [
                "Federal Decree-Law No. 47 of 2022 on Corporate Taxation",
                "Cabinet Decision No. 49 of 2023: Natural Persons Personal Investment Exemption",
            ],
        }

    def determine_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        tax_year: str,
        estimated_tax: float,
    ) -> List[TaxDeadline]:
        year = "2026" if "2026" in tax_year else "2025"

        if taxpayer.entity_type.value == "COMPANY":
            return [
                TaxDeadline(
                    id=f"AE_FTA_CORP_TAX_{year}",
                    country_code="AE",
                    tax_year=tax_year,
                    title="UAE FTA Corporate Tax Return Filing",
                    category="ANNUAL_RETURN",
                    due_date=f"{int(year)+1}-09-30",
                    estimated_amount=estimated_tax,
                    currency="AED",
                    status="UPCOMING",
                    confidence=TaxConfidence.CONFIRMED_INPUTS,
                    statutory_reference="Federal Decree-Law No. 47 of 2022 Article 53",
                    days_remaining=0,
                ),
            ]
        return []

    def check_anti_avoidance(
        self,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
    ) -> List[TaxAlert]:
        return [
            TaxAlert(
                id="ALERT_AE_PERSONAL_EXEMPT",
                alert_type="EXEMPT_STATUS_CONFIRMED",
                symbol="ALL_AE_ASSETS",
                title="UAE 0% Personal Capital Gains Exemption Active",
                message="Natural persons managing personal trading portfolios enjoy 0% income/capital gains tax under Cabinet Decision No. 49 of 2023.",
                severity="INFORMATIONAL",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                potential_tax_saving=0.0,
                currency="AED",
                status="ACTIVE",
            )
        ]
