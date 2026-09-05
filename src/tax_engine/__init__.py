"""
Quant.OS Tax Intelligence Engine
================================
Institutional-grade worldwide tax intelligence, transaction tax recognition,
and tax-aware portfolio analytics.
"""

from src.tax_engine.action_advisor import tax_action_advisor
from src.tax_engine.anti_avoidance import anti_avoidance_engine
from src.tax_engine.deadline_engine import tax_deadline_engine
from src.tax_engine.fx_engine import tax_fx_engine
from src.tax_engine.jurisdiction_resolver import jurisdiction_resolver
from src.tax_engine.liability_engine import tax_liability_engine
from src.tax_engine.models import (
    AccountingMethod,
    CountryCoverageInfo,
    IncomeClassification,
    JurisdictionResult,
    TaxAlert,
    TaxCalculationAudit,
    TaxConfidence,
    TaxDeadline,
    TaxDocumentItem,
    TaxJurisdictionRelationship,
    TaxLot,
    TaxpayerEntityType,
    TaxpayerProfile,
    TaxRule,
    TaxTransaction,
    TraderClassification,
)
from src.tax_engine.reconciliation_engine import tax_reconciliation_engine
from src.tax_engine.reminder_engine import tax_reminder_engine
from src.tax_engine.rule_registry import tax_rule_registry
from src.tax_engine.tax_lot_engine import tax_lot_engine
from src.tax_engine.tax_service import tax_service

__all__ = [
    "TaxConfidence",
    "TaxpayerEntityType",
    "TraderClassification",
    "AccountingMethod",
    "IncomeClassification",
    "TaxJurisdictionRelationship",
    "TaxpayerProfile",
    "TaxTransaction",
    "TaxLot",
    "JurisdictionResult",
    "TaxRule",
    "TaxDeadline",
    "TaxAlert",
    "TaxDocumentItem",
    "CountryCoverageInfo",
    "TaxCalculationAudit",
    "tax_rule_registry",
    "jurisdiction_resolver",
    "tax_lot_engine",
    "tax_liability_engine",
    "tax_action_advisor",
    "tax_deadline_engine",
    "tax_reminder_engine",
    "tax_fx_engine",
    "tax_reconciliation_engine",
    "anti_avoidance_engine",
    "tax_service",
]
