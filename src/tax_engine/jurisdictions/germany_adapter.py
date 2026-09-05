"""
Quant.OS Tax Intelligence — Germany (DE) Tax Jurisdiction Adapter
=================================================================
Statutory tax calculations under German Income Tax Act (EStG § 20 & § 23).
Abgeltungsteuer (25% + Soli), Sparer-Pauschbetrag (€1,000), and 1-year crypto exemption.
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


class GermanyTaxAdapter(BaseTaxJurisdictionAdapter):
    """
    Authoritative German tax adapter under BMF Einkommensteuergesetz (EStG).
    Handles § 20 Abgeltungsteuer (26.375% with Soli), €1,000 Sparer-Pauschbetrag,
    and § 23 1-year holding period exemption for crypto assets.
    """

    @property
    def country_code(self) -> str:
        return "DE"

    @property
    def country_name(self) -> str:
        return "Germany"

    @property
    def default_currency(self) -> str:
        return "EUR"

    def supported_tax_years(self) -> List[str]:
        return ["2024", "2025", "2026"]

    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        """Under § 23 EStG: Crypto held > 365 days (1 year) is 100% tax-free."""
        if asset_class.lower() in ["crypto", "vda", "token"]:
            return 365
        return 0  # Equities subject to flat Abgeltungsteuer regardless of holding period

    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        asset_class = transaction.asset_class.lower()

        if asset_class in ["crypto", "vda"]:
            if holding_period_days > 365:
                return IncomeClassification.EXEMPT_INCOME
            return IncomeClassification.CRYPTO_VDA

        if asset_class in ["dividend", "distribution"]:
            return IncomeClassification.DIVIDEND_INCOME

        if taxpayer.trader_classification.value == "BUSINESS":
            return IncomeClassification.BUSINESS_INCOME

        return IncomeClassification.STCG

    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        return {
            "financial_transaction_tax": 0.0,
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
            
            # Abgeltungsteuer 25% + 5.5% Solidaritätszuschlag = 26.375%
            rate = 0.26375 if classification != IncomeClassification.EXEMPT_INCOME else 0.0
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
                "statutory_rule": "EStG § 23 (1-Year Tax-Free Holding Exemption)" if classification == IncomeClassification.EXEMPT_INCOME else "EStG § 20 (Abgeltungsteuer 26.375%)",
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
        """Calculate German tax liability with €1,000 Sparer-Pauschbetrag."""
        net_cap_gain = max(0.0, realized_gains - realized_losses)
        sparer_pauschbetrag = 1000.0  # €1,000 per individual

        taxable_capital_gains = max(0.0, net_cap_gain - sparer_pauschbetrag)
        abgeltungsteuer = round(taxable_capital_gains * 0.25, 2)
        soli = round(abgeltungsteuer * 0.055, 2)
        total_cap_tax = round(abgeltungsteuer + soli, 2)

        # Taxable crypto (held < 1 year with Freigrenze of €1,000)
        taxable_crypto = crypto_gains if crypto_gains >= 1000.0 else 0.0
        crypto_tax = round(taxable_crypto * 0.30, 2)

        total_tax = round(total_cap_tax + crypto_tax, 2)

        return {
            "jurisdiction": "DE",
            "currency": "EUR",
            "gross_gains": round(realized_gains, 2),
            "allowable_losses": round(realized_losses, 2),
            "net_capital_gains": round(net_cap_gain, 2),
            "sparer_pauschbetrag_applied": min(net_cap_gain, sparer_pauschbetrag),
            "taxable_capital_gains": round(taxable_capital_gains, 2),
            "abgeltungsteuer_25_pct": abgeltungsteuer,
            "solidaritaetszuschlag_5_5_pct": soli,
            "crypto_vda_income": round(crypto_gains, 2),
            "total_estimated_tax": total_tax,
            "statutory_citations": [
                "EStG § 20: Abgeltungsteuer 25% on capital income",
                "EStG § 20 Abs. 9: Sparer-Pauschbetrag (€1,000 allowance)",
                "SolzG 1995: 5.5% Solidaritätszuschlag",
                "EStG § 23: Private Veräußerungsgeschäfte 1-year crypto exemption",
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
                id=f"DE_EST_DECLARATION_{year}",
                country_code="DE",
                tax_year=tax_year,
                title="Einkommensteuererklärung (Anlage KAP) Filing Deadline",
                category="ANNUAL_RETURN",
                due_date=f"{int(year)+1}-07-31",
                estimated_amount=estimated_tax,
                currency="EUR",
                status="UPCOMING",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                statutory_reference="Abgabenordnung (AO) § 149",
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
                id="ALERT_DE_CRYPTO_HOLDING_MONITOR",
                alert_type="HOLDING_PERIOD_THRESHOLD",
                symbol="ALL_DE_CRYPTO",
                title="German § 23 EStG 1-Year Crypto Exemption Monitor",
                message="Crypto assets held longer than 365 days qualify for 100% tax-free disposal under BMF guidelines.",
                severity="INFORMATIONAL",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                potential_tax_saving=0.0,
                currency="EUR",
                status="ACTIVE",
            )
        ]
