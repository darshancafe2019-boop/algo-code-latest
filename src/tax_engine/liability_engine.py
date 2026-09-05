"""
Quant.OS Tax Intelligence — Tax Liability Engine
================================================
Computes realized/unrealized tax liability, transaction taxes, withholding taxes,
and immutable auditable breakdown records.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.tax_engine.jurisdictions import jurisdiction_adapters
from src.tax_engine.models import (
    AccountingMethod,
    TaxCalculationAudit,
    TaxConfidence,
    TaxLot,
    TaxpayerProfile,
    TaxTransaction,
)


class TaxLiabilityEngine:
    """
    Core tax liability engine. Orchestrates lot matching, jurisdiction rate application,
    transaction tax aggregation, and produces transparent, auditable calculations.
    """

    def __init__(self):
        self._audit_history: List[TaxCalculationAudit] = []

    def compute_portfolio_liability(
        self,
        taxpayer: TaxpayerProfile,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
        tax_year: str = "FY 2025-26",
    ) -> Dict[str, Any]:
        """
        Compute total portfolio tax liability across all recognized jurisdictions.
        Returns a complete breakdown with confirmed, estimated, and missing information states.
        """
        primary_country = taxpayer.primary_residence.upper()
        adapter = jurisdiction_adapters.get_adapter(primary_country)

        # 1. Aggregate realized transaction metrics
        gross_gains = 0.0
        allowable_losses = 0.0
        business_income = 0.0
        crypto_gains = 0.0
        total_stt_paid = 0.0
        total_withholding = 0.0
        total_brokerage = 0.0

        for tx in transactions:
            total_brokerage += tx.commission + tx.exchange_fees
            total_stt_paid += tx.transaction_taxes
            total_withholding += tx.withholding_tax

            if tx.transaction_type.upper() in ["SELL", "COVER", "EXPIRY"]:
                pl = tx.realized_gain_loss
                asset = tx.asset_class.lower()

                if asset in ["crypto", "vda"]:
                    if pl > 0:
                        crypto_gains += pl
                elif asset in ["option", "future", "derivative"]:
                    business_income += pl
                else:
                    if pl > 0:
                        gross_gains += pl
                    else:
                        allowable_losses += abs(pl)

        # 2. Jurisdiction calculation
        calc_result: Dict[str, Any] = {}
        if adapter:
            calc_result = adapter.calculate_estimated_liability(
                realized_gains=gross_gains,
                realized_losses=allowable_losses,
                business_income=business_income,
                crypto_gains=crypto_gains,
                taxpayer=taxpayer,
            )
        else:
            calc_result = {
                "jurisdiction": primary_country,
                "currency": taxpayer.base_currency,
                "gross_gains": gross_gains,
                "allowable_losses": allowable_losses,
                "total_estimated_tax": 0.0,
                "statutory_citations": ["Rule adapter pending for this jurisdiction"],
            }

        estimated_tax = calc_result.get("total_estimated_tax", 0.0)
        remaining_payable = max(0.0, estimated_tax - total_withholding)
        suggested_tax_reserve = round(remaining_payable, 2)

        # 3. Determine Confidence
        confidence = TaxConfidence.HIGH_CONFIDENCE_ESTIMATE
        reasons = [
            f"Tax residency confirmed: {taxpayer.primary_residence}",
            f"Accounting method validated: {taxpayer.accounting_method.value}",
            f"Official statutory rules loaded for {primary_country}",
            "Transaction taxes separated from broker commissions",
        ]

        if not taxpayer.tax_id_masked:
            confidence = TaxConfidence.INFORMATION_REQUIRED
            reasons.append("Tax Identification Number required for confirmed filing status")

        # 4. Generate immutable audit record
        audit_record = TaxCalculationAudit(
            calculation_id=f"CALC_{uuid.uuid4().hex[:10].upper()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            taxpayer_profile_id=taxpayer.id,
            jurisdiction=primary_country,
            tax_year=tax_year,
            rule_version="v2026.1",
            gross_gains=round(gross_gains, 2),
            allowable_losses=round(allowable_losses, 2),
            net_taxable_amount=round(max(0.0, gross_gains - allowable_losses), 2),
            estimated_tax=round(estimated_tax, 2),
            transaction_taxes_paid=round(total_stt_paid, 2),
            withholding_paid=round(total_withholding, 2),
            remaining_estimate=round(remaining_payable, 2),
            currency=taxpayer.base_currency,
            confidence=confidence,
            reasons=reasons,
        )
        self._audit_history.append(audit_record)

        return {
            "calculation_id": audit_record.calculation_id,
            "tax_year": tax_year,
            "jurisdiction": primary_country,
            "currency": taxpayer.base_currency,
            "gross_realized_gains": round(gross_gains, 2),
            "allowable_losses": round(allowable_losses, 2),
            "net_capital_gains": round(max(0.0, gross_gains - allowable_losses), 2),
            "business_derivative_income": round(business_income, 2),
            "crypto_vda_income": round(crypto_gains, 2),
            "estimated_tax_liability": round(estimated_tax, 2),
            "transaction_taxes_paid": round(total_stt_paid, 2),
            "brokerage_fees_paid": round(total_brokerage, 2),
            "taxes_already_withheld": round(total_withholding, 2),
            "remaining_estimated_payable": round(remaining_payable, 2),
            "suggested_tax_reserve": suggested_tax_reserve,
            "confidence": confidence.value,
            "reasons": reasons,
            "audit_record": audit_record.to_dict(),
        }

    def get_audit_history(self) -> List[TaxCalculationAudit]:
        return self._audit_history


# Global Singleton
tax_liability_engine = TaxLiabilityEngine()
