"""
Quant.OS Tax Intelligence — Domain Models & Type Definitions
============================================================
Authoritative types, enums, and data classes for multi-jurisdiction tax accounting.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional



class TaxConfidence(str, Enum):
    CONFIRMED_INPUTS = "CONFIRMED INPUTS"
    HIGH_CONFIDENCE_ESTIMATE = "HIGH-CONFIDENCE ESTIMATE"
    ESTIMATE = "ESTIMATE"
    INFORMATION_REQUIRED = "INFORMATION REQUIRED"
    PROFESSIONAL_REVIEW_RECOMMENDED = "PROFESSIONAL REVIEW RECOMMENDED"
    RULE_NOT_SUPPORTED = "RULE NOT SUPPORTED"


class TaxpayerEntityType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    COMPANY = "COMPANY"
    PARTNERSHIP = "PARTNERSHIP"
    TRUST = "TRUST"
    FUND = "FUND"
    OTHER = "OTHER"


class TraderClassification(str, Enum):
    INVESTOR = "INVESTOR"
    TRADER = "TRADER"
    BUSINESS = "BUSINESS"


class AccountingMethod(str, Enum):
    FIFO = "FIFO"
    LIFO = "LIFO"
    AVERAGE_COST = "AVERAGE_COST"
    SPECIFIC_ID = "SPECIFIC_ID"
    HIFO = "HIFO"


class IncomeClassification(str, Enum):
    STCG = "SHORT_TERM_CAPITAL_GAIN"
    LTCG = "LONG_TERM_CAPITAL_GAIN"
    BUSINESS_INCOME = "BUSINESS_INCOME"
    SPECULATIVE_INCOME = "SPECULATIVE_INCOME"
    NON_SPECULATIVE_DERIVATIVE = "NON_SPECULATIVE_DERIVATIVE"
    DIVIDEND_INCOME = "DIVIDEND_INCOME"
    INTEREST_INCOME = "INTEREST_INCOME"
    CRYPTO_VDA = "CRYPTO_VDA_INCOME"
    EXEMPT_INCOME = "EXEMPT_INCOME"
    UNKNOWN = "UNKNOWN"


class TaxJurisdictionRelationship(str, Enum):
    TAX_RESIDENCE = "tax_residence"
    SOURCE = "source"
    CITIZENSHIP = "citizenship"
    ISSUER = "issuer"
    EXCHANGE = "exchange"
    PERMANENT_ESTABLISHMENT = "permanent_establishment"
    WITHHOLDING = "withholding"
    OTHER = "other"


class TaxingRightStatus(str, Enum):
    LIKELY = "likely"
    POSSIBLE = "possible"
    NOT_APPLICABLE = "not_applicable"
    NEEDS_REVIEW = "needs_review"


class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


@dataclass
class TaxpayerProfile:
    id: str = "tax_prof_default"
    user_id: str = "primary_trader"
    primary_residence: str = "IN"  # ISO 3166-1 alpha-2
    secondary_residence: str = ""
    citizenship: str = "IN"
    domicile: str = "IN"
    entity_type: TaxpayerEntityType = TaxpayerEntityType.INDIVIDUAL
    tax_id_masked: str = "XXXXX1234X"
    fiscal_year_start_month: int = 4  # April for IN, Jan for US/SG
    trader_classification: TraderClassification = TraderClassification.INVESTOR
    accounting_method: AccountingMethod = AccountingMethod.FIFO
    treaty_benefit_claimed: bool = True
    base_currency: str = "INR"
    tax_reserve_rate: float = 20.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "primary_residence": self.primary_residence,
            "secondary_residence": self.secondary_residence,
            "citizenship": self.citizenship,
            "domicile": self.domicile,
            "entity_type": self.entity_type.value if isinstance(self.entity_type, TaxpayerEntityType) else self.entity_type,
            "tax_id_masked": self.tax_id_masked,
            "fiscal_year_start_month": self.fiscal_year_start_month,
            "trader_classification": self.trader_classification.value if isinstance(self.trader_classification, TraderClassification) else self.trader_classification,
            "accounting_method": self.accounting_method.value if isinstance(self.accounting_method, AccountingMethod) else self.accounting_method,
            "treaty_benefit_claimed": self.treaty_benefit_claimed,
            "base_currency": self.base_currency,
            "tax_reserve_rate": self.tax_reserve_rate,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class TaxTransaction:
    transaction_id: str
    broker: str
    account_id: str
    symbol: str
    asset_class: str  # equity, option, future, crypto, forex, commodity, bond, dividend
    transaction_type: str  # BUY, SELL, SHORT, COVER, DIVIDEND, INTEREST, EXERCISE, EXPIRY, FEE
    quantity: float
    price: float
    gross_value: float
    currency: str
    trade_date: str
    settlement_date: str = ""
    commission: float = 0.0
    exchange_fees: float = 0.0
    transaction_taxes: float = 0.0  # STT, SDRT, Stamp Duty, SEC
    withholding_tax: float = 0.0
    jurisdiction: str = "IN"
    isin: Optional[str] = None
    issuer_country: Optional[str] = None
    exchange: Optional[str] = None
    exchange_country: Optional[str] = None
    income_classification: IncomeClassification = IncomeClassification.STCG
    holding_period_days: int = 0
    realized_gain_loss: float = 0.0
    estimated_tax: float = 0.0
    tax_rule_version: str = "v2026.1"
    confidence: TaxConfidence = TaxConfidence.HIGH_CONFIDENCE_ESTIMATE
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "transaction_id": self.transaction_id,
            "broker": self.broker,
            "account_id": self.account_id,
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "transaction_type": self.transaction_type,
            "quantity": self.quantity,
            "price": self.price,
            "gross_value": self.gross_value,
            "currency": self.currency,
            "trade_date": self.trade_date,
            "settlement_date": self.settlement_date,
            "commission": self.commission,
            "exchange_fees": self.exchange_fees,
            "transaction_taxes": self.transaction_taxes,
            "withholding_tax": self.withholding_tax,
            "jurisdiction": self.jurisdiction,
            "isin": self.isin,
            "issuer_country": self.issuer_country,
            "exchange": self.exchange,
            "exchange_country": self.exchange_country,
            "income_classification": self.income_classification.value if isinstance(self.income_classification, IncomeClassification) else self.income_classification,
            "holding_period_days": self.holding_period_days,
            "realized_gain_loss": self.realized_gain_loss,
            "estimated_tax": self.estimated_tax,
            "tax_rule_version": self.tax_rule_version,
            "confidence": self.confidence.value if isinstance(self.confidence, TaxConfidence) else self.confidence,
            "created_at": self.created_at,
        }


@dataclass
class TaxLot:
    id: str
    symbol: str
    asset_class: str
    broker: str
    account_id: str
    acquisition_date: str
    quantity: float
    remaining_quantity: float
    cost_basis: float
    cost_basis_per_unit: float
    currency: str
    jurisdiction: str
    accounting_method: AccountingMethod = AccountingMethod.FIFO
    status: str = "OPEN"  # OPEN, PARTIALLY_CLOSED, CLOSED
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "broker": self.broker,
            "account_id": self.account_id,
            "acquisition_date": self.acquisition_date,
            "quantity": self.quantity,
            "remaining_quantity": self.remaining_quantity,
            "cost_basis": self.cost_basis,
            "cost_basis_per_unit": self.cost_basis_per_unit,
            "currency": self.currency,
            "jurisdiction": self.jurisdiction,
            "accounting_method": self.accounting_method.value if isinstance(self.accounting_method, AccountingMethod) else self.accounting_method,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class JurisdictionResult:
    country_code: str
    jurisdiction_name: str
    relationship: TaxJurisdictionRelationship
    taxing_right_status: TaxingRightStatus
    explanation: str
    treaty_relevant: bool
    confidence: TaxConfidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "country_code": self.country_code,
            "jurisdiction_name": self.jurisdiction_name,
            "relationship": self.relationship.value if isinstance(self.relationship, TaxJurisdictionRelationship) else self.relationship,
            "taxing_right_status": self.taxing_right_status.value if isinstance(self.taxing_right_status, TaxingRightStatus) else self.taxing_right_status,
            "explanation": self.explanation,
            "treaty_relevant": self.treaty_relevant,
            "confidence": self.confidence.value if isinstance(self.confidence, TaxConfidence) else self.confidence,
        }


@dataclass
class TaxRule:
    jurisdiction: str
    tax_type: str
    rule_id: str
    tax_year: str
    effective_from: str
    effective_until: str
    rate_summary: str
    calculation_method: str
    source_authority: str
    source_url: str
    rule_version: str
    status: str = "ACTIVE"
    retrieved_date: str = "2026-04-01"
    verification_status: str = "VERIFIED"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "jurisdiction": self.jurisdiction,
            "tax_type": self.tax_type,
            "rule_id": self.rule_id,
            "tax_year": self.tax_year,
            "effective_from": self.effective_from,
            "effective_until": self.effective_until,
            "rate_summary": self.rate_summary,
            "calculation_method": self.calculation_method,
            "source_authority": self.source_authority,
            "source_url": self.source_url,
            "rule_version": self.rule_version,
            "status": self.status,
            "retrieved_date": self.retrieved_date,
            "verification_status": self.verification_status,
        }


@dataclass
class TaxDeadline:
    id: str
    country_code: str
    tax_year: str
    title: str
    category: str
    due_date: str
    estimated_amount: float
    currency: str
    status: str = "UPCOMING"
    confidence: TaxConfidence = TaxConfidence.CONFIRMED_INPUTS
    statutory_reference: str = ""
    days_remaining: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "country_code": self.country_code,
            "tax_year": self.tax_year,
            "title": self.title,
            "category": self.category,
            "due_date": self.due_date,
            "estimated_amount": self.estimated_amount,
            "currency": self.currency,
            "status": self.status,
            "confidence": self.confidence.value if isinstance(self.confidence, TaxConfidence) else self.confidence,
            "statutory_reference": self.statutory_reference,
            "days_remaining": self.days_remaining,
        }


@dataclass
class TaxAlert:
    id: str
    alert_type: str
    title: str
    message: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    symbol: str = ""
    confidence: TaxConfidence = TaxConfidence.HIGH_CONFIDENCE_ESTIMATE
    potential_tax_saving: float = 0.0
    currency: str = "INR"
    status: str = "ACTIVE"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "symbol": self.symbol,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "confidence": self.confidence.value if isinstance(self.confidence, TaxConfidence) else self.confidence,
            "potential_tax_saving": self.potential_tax_saving,
            "currency": self.currency,
            "status": self.status,
            "created_at": self.created_at,
        }


@dataclass
class TaxDocumentItem:
    id: str
    title: str
    country_code: str
    tax_year: str
    category: str
    status: str  # REQUIRED, RECEIVED, MISSING, VERIFIED, NOT_APPLICABLE
    description: str
    due_date: str = ""
    file_path: Optional[str] = None
    uploaded_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "country_code": self.country_code,
            "tax_year": self.tax_year,
            "category": self.category,
            "status": self.status,
            "description": self.description,
            "due_date": self.due_date,
            "file_path": self.file_path,
            "uploaded_at": self.uploaded_at,
        }


@dataclass
class CountryCoverageInfo:
    country_code: str
    country_name: str
    status: str  # FULLY SUPPORTED, PARTIALLY SUPPORTED, BETA, NOT SUPPORTED, PROFESSIONAL REVIEW REQUIRED
    tax_types_supported: List[str]
    tax_years_supported: List[str]
    rule_last_verified: str
    official_source: str
    statutory_citations: List[str]
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "country_code": self.country_code,
            "country_name": self.country_name,
            "status": self.status,
            "tax_types_supported": self.tax_types_supported,
            "tax_years_supported": self.tax_years_supported,
            "rule_last_verified": self.rule_last_verified,
            "official_source": self.official_source,
            "statutory_citations": self.statutory_citations,
            "notes": self.notes,
        }


@dataclass
class TaxCalculationAudit:
    calculation_id: str
    timestamp: str
    taxpayer_profile_id: str
    jurisdiction: str
    tax_year: str
    rule_version: str
    gross_gains: float
    allowable_losses: float
    net_taxable_amount: float
    estimated_tax: float
    transaction_taxes_paid: float
    withholding_paid: float
    remaining_estimate: float
    currency: str
    confidence: TaxConfidence
    reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "calculation_id": self.calculation_id,
            "timestamp": self.timestamp,
            "taxpayer_profile_id": self.taxpayer_profile_id,
            "jurisdiction": self.jurisdiction,
            "tax_year": self.tax_year,
            "rule_version": self.rule_version,
            "gross_gains": self.gross_gains,
            "allowable_losses": self.allowable_losses,
            "net_taxable_amount": self.net_taxable_amount,
            "estimated_tax": self.estimated_tax,
            "transaction_taxes_paid": self.transaction_taxes_paid,
            "withholding_paid": self.withholding_paid,
            "remaining_estimate": self.remaining_estimate,
            "currency": self.currency,
            "confidence": self.confidence.value if isinstance(self.confidence, TaxConfidence) else self.confidence,
            "reasons": self.reasons,
        }
