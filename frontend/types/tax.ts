/**
 * Quant.OS Tax Intelligence — TypeScript Type Definitions
 * ========================================================
 * Frontend type definitions matching the backend multi-jurisdiction tax engine.
 */

export type TaxConfidenceLevel =
  | "CONFIRMED INPUTS"
  | "HIGH-CONFIDENCE ESTIMATE"
  | "ESTIMATE"
  | "INFORMATION REQUIRED"
  | "PROFESSIONAL REVIEW RECOMMENDED"
  | "RULE NOT SUPPORTED";

export type TaxpayerEntityType =
  | "INDIVIDUAL"
  | "COMPANY"
  | "PARTNERSHIP"
  | "TRUST"
  | "FUND"
  | "OTHER";

export type TraderClassification = "INVESTOR" | "TRADER" | "BUSINESS";

export type AccountingMethod =
  | "FIFO"
  | "LIFO"
  | "AVERAGE_COST"
  | "SPECIFIC_ID"
  | "HIFO";

export interface TaxpayerProfile {
  id: string;
  user_id: string;
  primary_residence: string;
  secondary_residence: string;
  citizenship: string;
  domicile: string;
  entity_type: TaxpayerEntityType;
  tax_id_masked: string;
  fiscal_year_start_month: number;
  trader_classification: TraderClassification;
  accounting_method: AccountingMethod;
  treaty_benefit_claimed: boolean;
  base_currency: string;
  tax_reserve_rate: number;
  created_at: string;
  updated_at: string;
}

export interface TaxCommandCenterSummary {
  estimated_tax_liability: number;
  realized_taxable_gains: number;
  realized_losses: number;
  net_realized_pl: number;
  unrealized_tax_exposure: number;
  total_unrealized_pl: number;
  taxes_already_withheld: number;
  transaction_taxes_paid: number;
  upcoming_tax_payments: number;
  tax_loss_opportunities: number;
  tax_reserve: number;
  compliance_status: string;
  confidence: TaxConfidenceLevel;
}

export interface GlobalTaxExposureItem {
  country_code: string;
  country_name: string;
  relationship: string;
  tax_type: string;
  estimated_liability: number;
  paid_withheld: number;
  remaining_estimate: number;
  next_deadline: string;
  confidence: TaxConfidenceLevel;
  explanation: string;
  treaty_relevant: boolean;
}

export interface TaxDeadlineItem {
  id: string;
  country_code: string;
  tax_year: string;
  title: string;
  category: string;
  due_date: string;
  estimated_amount: number;
  currency: string;
  status: "UPCOMING" | "APPROACHING" | "OVERDUE" | "PAID";
  confidence: TaxConfidenceLevel;
  statutory_reference: string;
  days_remaining: number;
}

export interface TaxAlertItem {
  id: string;
  alert_type: string;
  symbol: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  confidence: TaxConfidenceLevel;
  potential_tax_saving: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface AnalyzedTaxPosition {
  lot_id: string;
  symbol: string;
  asset_class: string;
  broker: string;
  account_id: string;
  quantity: number;
  cost_basis_per_unit: number;
  total_cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  holding_period_days: number;
  statutory_threshold_days: number;
  days_remaining_to_threshold: number;
  current_classification_if_sold: string;
  future_classification: string;
  estimated_tax_if_sold_now: number;
  estimated_tax_after_threshold: number;
  potential_tax_savings_waiting: number;
  tax_action_priority_score: number;
  anti_avoidance_warning: Record<string, any> | null;
  confidence: TaxConfidenceLevel;
}

export interface TaxLotItem {
  id: string;
  symbol: string;
  asset_class: string;
  broker: string;
  account_id: string;
  acquisition_date: string;
  quantity: number;
  remaining_quantity: number;
  cost_basis: number;
  cost_basis_per_unit: number;
  currency: string;
  jurisdiction: string;
  accounting_method: AccountingMethod;
  status: string;
  holding_period_days: number;
  current_price: number;
  unrealized_pl: number;
  tax_classification: string;
}

export interface TaxTransactionItem {
  transaction_id: string;
  broker: string;
  account_id: string;
  symbol: string;
  asset_class: string;
  transaction_type: string;
  quantity: number;
  price: number;
  gross_value: number;
  currency: string;
  trade_date: string;
  settlement_date: string;
  commission: number;
  exchange_fees: number;
  transaction_taxes: number;
  withholding_tax: number;
  jurisdiction: string;
  income_classification: string;
  holding_period_days: number;
  realized_gain_loss: number;
  estimated_tax: number;
  tax_rule_version: string;
  confidence: TaxConfidenceLevel;
}

export interface CountryCoverageItem {
  country_code: string;
  country_name: string;
  status: "FULLY SUPPORTED" | "PARTIALLY SUPPORTED" | "BETA" | "NOT SUPPORTED" | "PROFESSIONAL REVIEW REQUIRED";
  tax_types_supported: string[];
  tax_years_supported: string[];
  rule_last_verified: string;
  official_source: string;
  statutory_citations: string[];
  notes: string;
}

export interface TaxDocumentChecklistItem {
  id: string;
  title: string;
  country_code: string;
  tax_year: string;
  category: string;
  status: "REQUIRED" | "RECEIVED" | "MISSING" | "VERIFIED" | "NOT_APPLICABLE";
  description: string;
  due_date: string;
  file_path?: string | null;
  uploaded_at?: string | null;
}

export interface TaxRuleSourceItem {
  jurisdiction: string;
  tax_type: string;
  rule_id: string;
  tax_year: string;
  effective_from: string;
  effective_until: string;
  rate_summary: string;
  calculation_method: string;
  source_authority: string;
  source_url: string;
  rule_version: string;
  status: string;
  retrieved_date: string;
  verification_status: string;
}

export interface WhatIfSimulationResult {
  symbol: string;
  quantity: number;
  simulated_price: number;
  simulated_date_offset_days: number;
  gross_value: number;
  cost_basis: number;
  simulated_realized_pl: number;
  transaction_taxes_stt: number;
  holding_period_days: number;
  tax_classification: string;
  statutory_rate: string;
  estimated_tax_effect: number;
  net_after_tax_result: number;
  days_until_ltcg_threshold: number;
  potential_tax_saved_if_held_past_threshold: number;
  confidence: TaxConfidenceLevel;
  statutory_source: string;
}

export interface TaxOverviewPayload {
  profile: TaxpayerProfile;
  liability_summary: {
    calculation_id: string;
    tax_year: string;
    jurisdiction: string;
    currency: string;
    gross_realized_gains: number;
    allowable_losses: number;
    net_capital_gains: number;
    business_derivative_income: number;
    crypto_vda_income: number;
    estimated_tax_liability: number;
    transaction_taxes_paid: number;
    brokerage_fees_paid: number;
    taxes_already_withheld: number;
    remaining_estimated_payable: number;
    suggested_tax_reserve: number;
    confidence: TaxConfidenceLevel;
    reasons: string[];
  };
  command_center: TaxCommandCenterSummary;
  global_tax_exposure: GlobalTaxExposureItem[];
  upcoming_deadlines: TaxDeadlineItem[];
  tax_alerts: TaxAlertItem[];
  analyzed_positions: AnalyzedTaxPosition[];
  legal_disclaimer: string;
}
