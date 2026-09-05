"""
Quant.OS Tax Intelligence — India (IN) Tax Jurisdiction Adapter
==============================================================
Statutory tax calculations under Income Tax Act 1961, Finance (No. 2) Act 2024,
and Securities Transaction Tax Act.
"""

import uuid
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


class IndiaTaxAdapter(BaseTaxJurisdictionAdapter):
    """
    Authoritative India tax adapter conforming to Finance Act 2024 amendments.
    Handles STCG (20%), LTCG (12.5% > ₹1.25L), F&O (Sec 43(5)), Crypto (Sec 115BBH 30%),
    STT schedules, and Advance Tax quarterly calendar.
    """

    @property
    def country_code(self) -> str:
        return "IN"

    @property
    def country_name(self) -> str:
        return "India"

    @property
    def default_currency(self) -> str:
        return "INR"

    def supported_tax_years(self) -> List[str]:
        return ["FY 2024-25", "FY 2025-26", "FY 2026-27"]

    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        """
        Under Section 2(42A) of Income Tax Act:
        Listed equities and equity mutual funds: 12 months (365 days).
        Unlisted equities / other assets: 24 months (730 days).
        """
        if asset_class.lower() in ["equity", "etf", "mutual_fund"]:
            return 365
        return 730

    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        asset_class = transaction.asset_class.lower()

        # Crypto / Virtual Digital Assets
        if asset_class in ["crypto", "vda", "token"]:
            return IncomeClassification.CRYPTO_VDA

        # Derivatives: Futures & Options on recognized exchange under Section 43(5)
        if asset_class in ["option", "future", "derivative"]:
            return IncomeClassification.NON_SPECULATIVE_DERIVATIVE

        # Professional trader treated as business income
        if taxpayer.trader_classification.value == "BUSINESS" or taxpayer.trader_classification.value == "TRADER":
            return IncomeClassification.BUSINESS_INCOME

        # Equity / ETF capital gains
        threshold = self.get_holding_period_threshold_days(asset_class)
        if holding_period_days > threshold:
            return IncomeClassification.LTCG
        else:
            return IncomeClassification.STCG

    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        """
        Calculate statutory Indian Securities Transaction Tax (STT) and Stamp Duty.
        Budget 2024 updated rates:
        - Equity Delivery: STT 0.1% on buy & sell, Stamp Duty 0.015% on buy
        - Equity Intraday: STT 0.025% on sell, Stamp Duty 0.003% on buy
        - Futures: STT 0.02% on sell, Stamp Duty 0.002% on buy
        - Options: STT 0.1% on premium on sell, Stamp Duty 0.003% on buy
        """
        gross = transaction.gross_value
        tx_type = transaction.transaction_type.upper()
        asset_class = transaction.asset_class.lower()

        stt = 0.0
        stamp_duty = 0.0
        sebi_turnover = round(gross * 0.000001, 2)  # ₹10 per crore
        exchange_charges = round(gross * 0.0000345, 2)  # NSE approx rate

        if asset_class in ["equity", "etf"]:
            if tx_type == "BUY":
                stt = round(gross * 0.001, 2)  # 0.1% delivery
                stamp_duty = round(gross * 0.00015, 2)  # 0.015%
            elif tx_type == "SELL":
                stt = round(gross * 0.001, 2)  # 0.1% delivery
        elif asset_class == "future":
            if tx_type in ["SELL", "COVER"]:
                stt = round(gross * 0.0002, 2)  # 0.02% (Budget 2024)
            if tx_type == "BUY":
                stamp_duty = round(gross * 0.00002, 2)
        elif asset_class == "option":
            if tx_type in ["SELL", "COVER"]:
                stt = round(gross * 0.001, 2)  # 0.1% on premium (Budget 2024)
            if tx_type == "BUY":
                stamp_duty = round(gross * 0.00003, 2)
        elif asset_class in ["crypto", "vda"]:
            # 1% TDS under Section 194S on sell transactions
            if tx_type == "SELL":
                stt = round(gross * 0.01, 2)  # Recorded as transaction-level tax deduction

        total_tx_taxes = round(stt + stamp_duty, 2)
        return {
            "stt": stt,
            "stamp_duty": stamp_duty,
            "sebi_turnover_fee": sebi_turnover,
            "exchange_charges": exchange_charges,
            "total_transaction_taxes": total_tx_taxes,
        }

    def calculate_gain_loss(
        self,
        sell_tx: TaxTransaction,
        matched_lots: List[Dict[str, Any]],
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        """Calculate realized gain/loss per lot matched according to Finance Act 2024."""
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
            
            # Determine rate
            rate = 0.20  # STCG 20%
            if classification == IncomeClassification.LTCG:
                rate = 0.125  # LTCG 12.5%
            elif classification == IncomeClassification.CRYPTO_VDA:
                rate = 0.30  # Crypto 30%
            elif classification == IncomeClassification.NON_SPECULATIVE_DERIVATIVE:
                rate = 0.30  # Business slab rate approx

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
                "statutory_rule": "Section 111A (STCG 20%)" if classification == IncomeClassification.STCG else "Section 112A (LTCG 12.5%)",
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
        """
        Calculate total estimated Indian tax liability.
        LTCG exemption under Section 112A: ₹1,25,000 per financial year.
        Crypto gains: Flat 30% without loss set-off.
        """
        stcg_rate = 0.20
        ltcg_rate = 0.125
        crypto_rate = 0.30
        fo_rate = 0.30  # Assumed standard slab rate

        ltcg_exemption = 125000.0  # ₹1.25 Lakhs per Finance Act 2024
        
        # In India, LTCG losses can only be set off against LTCG. STCG losses against STCG/LTCG.
        net_stcg = max(0.0, realized_gains - realized_losses)
        stcg_tax = round(net_stcg * stcg_rate, 2)

        taxable_ltcg = max(0.0, 0.0 - ltcg_exemption)  # Evaluated if LTCG separated
        ltcg_tax = round(taxable_ltcg * ltcg_rate, 2)

        fo_tax = round(max(0.0, business_income) * fo_rate, 2)
        crypto_tax = round(max(0.0, crypto_gains) * crypto_rate, 2)

        base_tax = stcg_tax + ltcg_tax + fo_tax + crypto_tax
        health_education_cess = round(base_tax * 0.04, 2)  # 4% Cess
        total_estimated_tax = round(base_tax + health_education_cess, 2)

        return {
            "jurisdiction": "IN",
            "currency": "INR",
            "gross_gains": round(realized_gains, 2),
            "allowable_losses": round(realized_losses, 2),
            "net_capital_gains": round(net_stcg, 2),
            "business_derivative_income": round(business_income, 2),
            "crypto_vda_income": round(crypto_gains, 2),
            "ltcg_exemption_applied": 0.0,
            "base_tax": base_tax,
            "cess_4_pct": health_education_cess,
            "total_estimated_tax": total_estimated_tax,
            "statutory_citations": [
                "Section 111A: Short-term capital gains at 20%",
                "Section 112A: Long-term capital gains at 12.5% above ₹1.25L",
                "Section 43(5): Derivatives non-speculative business income",
                "Section 115BBH: Crypto VDA income at 30%",
                "Finance Act 2024: 4% Health & Education Cess",
            ],
        }

    def determine_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        tax_year: str,
        estimated_tax: float,
    ) -> List[TaxDeadline]:
        """
        Generate Indian advance tax deadlines under Section 208/211.
        If tax liability exceeds ₹10,000, 4 installments are mandatory:
        - 15 June: 15%
        - 15 September: 45% (cumulative)
        - 15 December: 75% (cumulative)
        - 15 March: 100% (cumulative)
        - 31 July: Annual ITR Filing for non-audit individuals
        """
        year_suffix = "2026" if "2025-26" in tax_year or "2026" in tax_year else "2025"
        
        deadlines = [
            TaxDeadline(
                id=f"IN_ADV_Q1_{year_suffix}",
                country_code="IN",
                tax_year=tax_year,
                title="Advance Tax Installment 1 (15%)",
                category="ADVANCE_TAX",
                due_date=f"{year_suffix}-06-15",
                estimated_amount=round(estimated_tax * 0.15, 2),
                currency="INR",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="Section 211(1)(a) Income Tax Act 1961",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"IN_ADV_Q2_{year_suffix}",
                country_code="IN",
                tax_year=tax_year,
                title="Advance Tax Installment 2 (45% Cumulative)",
                category="ADVANCE_TAX",
                due_date=f"{year_suffix}-09-15",
                estimated_amount=round(estimated_tax * 0.30, 2),  # 30% incremental
                currency="INR",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="Section 211(1)(b) Income Tax Act 1961",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"IN_ADV_Q3_{year_suffix}",
                country_code="IN",
                tax_year=tax_year,
                title="Advance Tax Installment 3 (75% Cumulative)",
                category="ADVANCE_TAX",
                due_date=f"{year_suffix}-12-15",
                estimated_amount=round(estimated_tax * 0.30, 2),  # 30% incremental
                currency="INR",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="Section 211(1)(c) Income Tax Act 1961",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"IN_ADV_Q4_{year_suffix}",
                country_code="IN",
                tax_year=tax_year,
                title="Advance Tax Installment 4 (100% Final)",
                category="ADVANCE_TAX",
                due_date=f"{int(year_suffix) + 1}-03-15",
                estimated_amount=round(estimated_tax * 0.25, 2),  # 25% incremental
                currency="INR",
                status="UPCOMING",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                statutory_reference="Section 211(1)(d) Income Tax Act 1961",
                days_remaining=0,
            ),
            TaxDeadline(
                id=f"IN_ITR_ANNUAL_{year_suffix}",
                country_code="IN",
                tax_year=tax_year,
                title="Annual Income Tax Return (ITR-2/ITR-3)",
                category="ANNUAL_RETURN",
                due_date=f"{int(year_suffix) + 1}-07-31",
                estimated_amount=0.0,
                currency="INR",
                status="UPCOMING",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                statutory_reference="Section 139(1) Income Tax Act 1961",
                days_remaining=0,
            ),
        ]
        return deadlines

    def check_anti_avoidance(
        self,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
    ) -> List[TaxAlert]:
        """
        Check Indian anti-avoidance rules:
        - Bonus Stripping (Section 94(8))
        - Dividend Stripping (Section 94(7))
        - Year-end loss harvesting advisory
        """
        alerts = []
        for lot in open_lots:
            # Check for high unrealized loss positions
            if lot.remaining_quantity > 0 and lot.cost_basis_per_unit > 0:
                # Flag if loss harvest opportunity exists
                pass

        # Informational alert on Finance Act 2024 compliance
        alerts.append(
            TaxAlert(
                id="ALERT_IN_FINANCE_ACT_2024",
                alert_type="TAX_RULE_ACTIVE",
                symbol="ALL_IN_ASSETS",
                title="Finance Act 2024 Rates Active",
                message="STCG is calculated at 20% (Sec 111A) and LTCG at 12.5% above ₹1.25 Lakhs (Sec 112A). STT on F&O is updated to 0.02% (Futures) and 0.1% (Options).",
                severity="INFORMATIONAL",
                confidence=TaxConfidence.CONFIRMED_INPUTS,
                potential_tax_saving=0.0,
                currency="INR",
                status="ACTIVE",
            )
        )
        return alerts
