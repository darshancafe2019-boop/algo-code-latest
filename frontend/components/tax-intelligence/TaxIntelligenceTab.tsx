"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Clock,
  Layers,
  FileSpreadsheet,
  Globe,
  Calendar,
  Bell,
  Calculator,
  Sparkles,
  FileText,
  Download,
  Scale,
  Sliders,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { TaxOverviewPayload, TaxpayerProfile } from "@/types/tax";
import { apiClient } from "@/lib/apiClient";
import { TaxCommandCenter } from "./TaxCommandCenter";
import { GlobalTaxExposureTable } from "./GlobalTaxExposureTable";
import { TaxPositionsView } from "./TaxPositionsView";
import { TaxLotsView } from "./TaxLotsView";
import { TaxTransactionsView } from "./TaxTransactionsView";
import { TaxCountriesCatalog } from "./TaxCountriesCatalog";
import { TaxCalendarView } from "./TaxCalendarView";
import { TaxAlertsView } from "./TaxAlertsView";
import { TaxPlannerView } from "./TaxPlannerView";
import { TaxWhatIfSimulator } from "./TaxWhatIfSimulator";
import { TaxDocumentsChecklist } from "./TaxDocumentsChecklist";
import { TaxReportsCenter } from "./TaxReportsCenter";
import { TaxRuleSourcesView } from "./TaxRuleSourcesView";
import { TaxpayerProfileSettings } from "./TaxpayerProfileSettings";

type SubTabType =
  | "OVERVIEW"
  | "POSITIONS"
  | "TAX LOTS"
  | "TRANSACTIONS"
  | "COUNTRIES"
  | "CALENDAR"
  | "ALERTS"
  | "TAX PLANNER"
  | "WHAT-IF"
  | "DOCUMENTS"
  | "REPORTS"
  | "RULE SOURCES"
  | "SETTINGS";

// Initial mock snapshot for zero-lag instant tab presentation
const INITIAL_TAX_DATA: TaxOverviewPayload = {
  profile: {
    id: "tax_prof_default",
    user_id: "primary_trader",
    primary_residence: "IN",
    secondary_residence: "",
    citizenship: "IN",
    domicile: "IN",
    entity_type: "INDIVIDUAL",
    tax_id_masked: "XXXXX1234X",
    fiscal_year_start_month: 4,
    trader_classification: "INVESTOR",
    accounting_method: "FIFO",
    treaty_benefit_claimed: true,
    base_currency: "INR",
    tax_reserve_rate: 20.0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  liability_summary: {
    calculation_id: "CALC_INST_INIT",
    tax_year: "FY 2025-26",
    jurisdiction: "IN",
    currency: "INR",
    gross_realized_gains: 45000.0,
    allowable_losses: 18000.0,
    net_capital_gains: 27000.0,
    business_derivative_income: 28000.0,
    crypto_vda_income: 0.0,
    estimated_tax_liability: 14352.0,
    transaction_taxes_paid: 698.5,
    brokerage_fees_paid: 80.0,
    taxes_already_withheld: 270.31,
    remaining_estimated_payable: 14081.69,
    suggested_tax_reserve: 14081.69,
    confidence: "HIGH-CONFIDENCE ESTIMATE",
    reasons: [
      "Tax residency confirmed: IN",
      "Official statutory rules loaded: Finance Act 2024 (Section 111A / 112A)",
      "Transaction taxes separated from broker commissions",
    ],
  },
  command_center: {
    estimated_tax_liability: 14352.0,
    realized_taxable_gains: 45000.0,
    realized_losses: 18000.0,
    net_realized_pl: 27000.0,
    unrealized_tax_exposure: 31450.0,
    total_unrealized_pl: 442000.0,
    taxes_already_withheld: 270.31,
    transaction_taxes_paid: 698.5,
    upcoming_tax_payments: 6458.4,
    tax_loss_opportunities: 18250.0,
    tax_reserve: 14081.69,
    compliance_status: "COMPLIANT",
    confidence: "HIGH-CONFIDENCE ESTIMATE",
  },
  global_tax_exposure: [
    {
      country_code: "IN",
      country_name: "India",
      relationship: "tax_residence",
      tax_type: "Capital Gains / Trading / STT",
      estimated_liability: 14352.0,
      paid_withheld: 698.5,
      remaining_estimate: 13653.5,
      next_deadline: "2026-06-15",
      confidence: "HIGH-CONFIDENCE ESTIMATE",
      explanation: "Taxpayer is a tax resident of India. Subject to worldwide taxation under Income Tax Act 1961.",
      treaty_relevant: false,
    },
    {
      country_code: "US",
      country_name: "United States",
      relationship: "source",
      tax_type: "Dividend Withholding (IRC)",
      estimated_liability: 270.31,
      paid_withheld: 270.31,
      remaining_estimate: 0.0,
      next_deadline: "2026-04-15",
      confidence: "CONFIRMED INPUTS",
      explanation: "U.S. source dividend withholding tax deducted at source under DTAA Article 10.",
      treaty_relevant: true,
    },
  ],
  upcoming_deadlines: [
    {
      id: "IN_ADV_Q1_2026",
      country_code: "IN",
      tax_year: "FY 2025-26",
      title: "Advance Tax Installment 1 (15%)",
      category: "ADVANCE_TAX",
      due_date: "2026-06-15",
      estimated_amount: 2152.8,
      currency: "INR",
      status: "UPCOMING",
      confidence: "HIGH-CONFIDENCE ESTIMATE",
      statutory_reference: "Section 211(1)(a) Income Tax Act 1961",
      days_remaining: 102,
    },
    {
      id: "IN_ADV_Q2_2026",
      country_code: "IN",
      tax_year: "FY 2025-26",
      title: "Advance Tax Installment 2 (45% Cumulative)",
      category: "ADVANCE_TAX",
      due_date: "2026-09-15",
      estimated_amount: 4305.6,
      currency: "INR",
      status: "UPCOMING",
      confidence: "HIGH-CONFIDENCE ESTIMATE",
      statutory_reference: "Section 211(1)(b) Income Tax Act 1961",
      days_remaining: 194,
    },
  ],
  tax_alerts: [
    {
      id: "ALERT_HOLDING_RELIANCE_12D",
      alert_type: "HOLDING_PERIOD_THRESHOLD",
      symbol: "RELIANCE",
      title: "Holding Period Threshold in 12 Days for RELIANCE",
      message: "RELIANCE has been held for 353 days. Waiting 12 days transitions gains to Long-Term classification (12.5% vs 20%), saving an estimated ₹39,000 in tax.",
      severity: "HIGH",
      confidence: "HIGH-CONFIDENCE ESTIMATE",
      potential_tax_saving: 39000.0,
      currency: "INR",
      status: "ACTIVE",
      created_at: "2026-04-01T00:00:00Z",
    },
  ],
  analyzed_positions: [
    {
      lot_id: "LOT_RELIANCE_001",
      symbol: "RELIANCE",
      asset_class: "equity",
      broker: "Upstox",
      account_id: "ACC_IN_01",
      quantity: 200,
      cost_basis_per_unit: 2890.0,
      total_cost_basis: 578000.0,
      current_price: 3150.0,
      market_value: 630000.0,
      unrealized_pl: 52000.0,
      holding_period_days: 353,
      statutory_threshold_days: 365,
      days_remaining_to_threshold: 12,
      current_classification_if_sold: "SHORT_TERM_CAPITAL_GAIN",
      future_classification: "LONG_TERM_CAPITAL_GAIN",
      estimated_tax_if_sold_now: 10400.0,
      estimated_tax_after_threshold: 6500.0,
      potential_tax_savings_waiting: 3900.0,
      tax_action_priority_score: 86,
      anti_avoidance_warning: null,
      confidence: "HIGH-CONFIDENCE ESTIMATE",
    },
  ],
  legal_disclaimer:
    "Tax calculations are decision-support estimates based on available transaction, taxpayer, and statutory jurisdiction data. Complex cases may require verification by a qualified tax professional.",
};

export function TaxIntelligenceTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("OVERVIEW");
  const [taxData, setTaxData] = useState<TaxOverviewPayload>(INITIAL_TAX_DATA);
  const [lots, setLots] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch background data without blocking UI render using resilient apiClient and Promise.allSettled
  useEffect(() => {
    let isMounted = true;
    const fetchTaxData = async () => {
      setLoading(true);
      try {
        const [ovRes, lotsRes, txRes, countRes, srcRes, docRes] =
          await Promise.allSettled([
            apiClient.get<any>("/api/tax/overview", { timeoutMs: 6000, deduplicate: true }),
            apiClient.get<any>("/api/tax/lots", { timeoutMs: 6000, deduplicate: true }),
            apiClient.get<any>("/api/tax/transactions", { timeoutMs: 6000, deduplicate: true }),
            apiClient.get<any>("/api/tax/countries", { timeoutMs: 6000, deduplicate: true }),
            apiClient.get<any>("/api/tax/sources", { timeoutMs: 6000, deduplicate: true }),
            apiClient.get<any>("/api/tax/documents", { timeoutMs: 6000, deduplicate: true }),
          ]);

        if (ovRes.status === "fulfilled" && ovRes.value.ok && ovRes.value.data?.status === "success" && isMounted) {
          setTaxData(ovRes.value.data.data);
        }
        if (lotsRes.status === "fulfilled" && lotsRes.value.ok && lotsRes.value.data?.status === "success" && isMounted) {
          setLots(lotsRes.value.data.data);
        }
        if (txRes.status === "fulfilled" && txRes.value.ok && txRes.value.data?.status === "success" && isMounted) {
          setTransactions(txRes.value.data.data);
        }
        if (countRes.status === "fulfilled" && countRes.value.ok && countRes.value.data?.status === "success" && isMounted) {
          setCountries(countRes.value.data.data);
        }
        if (srcRes.status === "fulfilled" && srcRes.value.ok && srcRes.value.data?.status === "success" && isMounted) {
          setSources(srcRes.value.data.data);
        }
        if (docRes.status === "fulfilled" && docRes.value.ok && docRes.value.data?.status === "success" && isMounted) {
          setDocuments(docRes.value.data.data);
        }
      } catch {
        // Fallback gracefully on existing initial state
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTaxData();
    return () => {
      isMounted = false;
    };
  }, []);

  const navTabs: { id: SubTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "OVERVIEW", label: "OVERVIEW", icon: LayoutDashboard },
    { id: "POSITIONS", label: "POSITIONS", icon: Clock },
    { id: "TAX LOTS", label: "TAX LOTS", icon: Layers },
    { id: "TRANSACTIONS", label: "TRANSACTIONS", icon: FileSpreadsheet },
    { id: "COUNTRIES", label: "COUNTRIES", icon: Globe },
    { id: "CALENDAR", label: "CALENDAR", icon: Calendar },
    { id: "ALERTS", label: "ALERTS", icon: Bell },
    { id: "TAX PLANNER", label: "TAX PLANNER", icon: Calculator },
    { id: "WHAT-IF", label: "WHAT-IF", icon: Sparkles },
    { id: "DOCUMENTS", label: "DOCUMENTS", icon: FileText },
    { id: "REPORTS", label: "REPORTS", icon: Download },
    { id: "RULE SOURCES", label: "RULE SOURCES", icon: Scale },
    { id: "SETTINGS", label: "SETTINGS", icon: Sliders },
  ];

  const handleProfileUpdate = (updated: TaxpayerProfile) => {
    setTaxData((prev) => ({ ...prev, profile: updated }));
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Main Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans tracking-wide text-white flex items-center gap-2">
              TAX INTELLIGENCE
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                INSTITUTIONAL v2.5
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Worldwide trading tax recognition, statutory jurisdiction engine & tax-aware assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Residence: <span className="text-slate-200 font-semibold">{taxData.profile.primary_residence}</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Currency: <span className="text-slate-200 font-semibold">{taxData.profile.base_currency}</span>
          </div>
        </div>
      </div>

      {/* Internal Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/60 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap ${isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div className="min-h-[500px]">
        {activeSubTab === "OVERVIEW" && (
          <div className="space-y-6">
            <TaxCommandCenter
              summary={taxData.command_center}
              currency={taxData.profile.base_currency}
            />
            <GlobalTaxExposureTable
              exposures={taxData.global_tax_exposure}
              currency={taxData.profile.base_currency}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TaxAlertsView
                alerts={taxData.tax_alerts}
                currency={taxData.profile.base_currency}
              />
              <TaxCalendarView
                deadlines={taxData.upcoming_deadlines}
                currency={taxData.profile.base_currency}
              />
            </div>
          </div>
        )}

        {activeSubTab === "POSITIONS" && (
          <TaxPositionsView
            positions={taxData.analyzed_positions}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "TAX LOTS" && (
          <TaxLotsView
            lots={lots.length > 0 ? lots : (taxData.analyzed_positions as any)}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "TRANSACTIONS" && (
          <TaxTransactionsView
            transactions={transactions}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "COUNTRIES" && (
          <TaxCountriesCatalog countries={countries} />
        )}

        {activeSubTab === "CALENDAR" && (
          <TaxCalendarView
            deadlines={taxData.upcoming_deadlines}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "ALERTS" && (
          <TaxAlertsView
            alerts={taxData.tax_alerts}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "TAX PLANNER" && (
          <TaxPlannerView
            summary={taxData.command_center}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "WHAT-IF" && (
          <TaxWhatIfSimulator currency={taxData.profile.base_currency} />
        )}

        {activeSubTab === "DOCUMENTS" && (
          <TaxDocumentsChecklist documents={documents} />
        )}

        {activeSubTab === "REPORTS" && (
          <TaxReportsCenter
            overviewData={taxData}
            currency={taxData.profile.base_currency}
          />
        )}

        {activeSubTab === "RULE SOURCES" && (
          <TaxRuleSourcesView sources={sources} />
        )}

        {activeSubTab === "SETTINGS" && (
          <TaxpayerProfileSettings
            profile={taxData.profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>

      {/* Statutory Legal Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] font-mono text-slate-500 text-center">
        {taxData.legal_disclaimer}
      </div>
    </div>
  );
}
