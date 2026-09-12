"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
} from "lucide-react";
import { TaxOverviewPayload, TaxpayerProfile } from "@/types/tax";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  calculateLiveTaxIntelligence,
  JURISDICTION_RULES,
  CalculatedTaxMetrics,
} from "@/lib/taxEngineService";
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

export function TaxIntelligenceTab() {
  const { positions, orders, portfolioSnapshot, refreshAll } = useGlobalData();

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("OVERVIEW");
  const [selectedBroker, setSelectedBroker] = useState<string>("ALL");
  const [serverTaxData, setServerTaxData] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [serverTransactions, setServerTransactions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Authoritative Taxpayer Profile
  const [profile, setProfile] = useState<TaxpayerProfile>({
    id: "tax_prof_active",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 1. Fetch Backend Tax Intelligence Data with Promise.allSettled
  const fetchAllTaxData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const [ovRes, lotsRes, txRes, countRes, srcRes, docRes, profRes] =
        await Promise.allSettled([
          apiClient.get<any>("/api/tax/overview", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/lots", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/transactions", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/countries", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/sources", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/documents", { timeoutMs: 5000, deduplicate: true }),
          apiClient.get<any>("/api/tax/profile", { timeoutMs: 5000, deduplicate: true }),
        ]);

      if (ovRes.status === "fulfilled" && ovRes.value.ok && ovRes.value.data?.status === "success") {
        setServerTaxData(ovRes.value.data.data);
      }
      if (lotsRes.status === "fulfilled" && lotsRes.value.ok && lotsRes.value.data?.status === "success") {
        setLots(lotsRes.value.data.data || []);
      }
      if (txRes.status === "fulfilled" && txRes.value.ok && txRes.value.data?.status === "success") {
        setServerTransactions(txRes.value.data.data || []);
      }
      if (countRes.status === "fulfilled" && countRes.value.ok && countRes.value.data?.status === "success") {
        setCountries(countRes.value.data.data || []);
      }
      if (srcRes.status === "fulfilled" && srcRes.value.ok && srcRes.value.data?.status === "success") {
        setSources(srcRes.value.data.data || []);
      }
      if (docRes.status === "fulfilled" && docRes.value.ok && docRes.value.data?.status === "success") {
        setDocuments(docRes.value.data.data || []);
      }
      if (profRes.status === "fulfilled" && profRes.value.ok && profRes.value.data?.status === "success") {
        setProfile(profRes.value.data.data);
      }
    } catch (err: any) {
      setFetchError(err?.message || "Partial tax service sync issue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTaxData();
  }, [fetchAllTaxData]);

  // Handle Manual Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (refreshAll) {
      try {
        await refreshAll();
      } catch {}
    }
    await fetchAllTaxData();
    setIsRefreshing(false);
  };

  // 2. Compute Master Live Tax Calculations
  const calculatedMetrics: CalculatedTaxMetrics = useMemo(() => {
    return calculateLiveTaxIntelligence(
      profile,
      portfolioSnapshot,
      positions,
      orders,
      serverTaxData
    );
  }, [profile, portfolioSnapshot, positions, orders, serverTaxData]);

  // Merge transactions from live orders & server
  const allMergedTransactions = useMemo(() => {
    const txMap = new Map<string, any>();
    for (const tx of calculatedMetrics.transactions) {
      txMap.set(tx.id, tx);
    }
    for (const stx of serverTransactions) {
      const key = stx.id || stx.transaction_id;
      if (!txMap.has(key)) {
        txMap.set(key, stx);
      }
    }
    return Array.from(txMap.values());
  }, [calculatedMetrics.transactions, serverTransactions]);

  const navTabs: { id: SubTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "OVERVIEW", label: "OVERVIEW", icon: LayoutDashboard },
    { id: "POSITIONS", label: "POSITIONS", icon: Clock },
    { id: "TAX LOTS", label: "TAX LOTS", icon: Layers },
    { id: "TRANSACTIONS", label: "TRANSACTIONS", icon: FileSpreadsheet },
    { id: "COUNTRIES", label: "COUNTRIES & DTAA", icon: Globe },
    { id: "CALENDAR", label: "TAX CALENDAR", icon: Calendar },
    { id: "ALERTS", label: "ALERTS", icon: Bell },
    { id: "TAX PLANNER", label: "TAX PLANNER", icon: Calculator },
    { id: "WHAT-IF", label: "WHAT-IF SIMULATOR", icon: Sparkles },
    { id: "DOCUMENTS", label: "DOCUMENTS", icon: FileText },
    { id: "REPORTS", label: "REPORTS", icon: Download },
    { id: "RULE SOURCES", label: "RULE SOURCES", icon: Scale },
    { id: "SETTINGS", label: "SETTINGS", icon: Sliders },
  ];

  const handleProfileUpdate = (updated: TaxpayerProfile) => {
    setProfile(updated);
  };

  const getStatusBadge = () => {
    const status = calculatedMetrics.data_freshness;
    if (status === "LIVE") {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE STREAM
        </span>
      );
    }
    if (status === "STALE") {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          STALE DATA
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-mono font-bold">
        DISCONNECTED
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full text-slate-100 font-sans pb-12">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-sans tracking-wide text-white">
                TAX INTELLIGENCE
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                INSTITUTIONAL v2.5
              </span>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Multi-jurisdiction trade recognition, broker segregation & statutory tax liability engine
            </p>
          </div>
        </div>

        {/* Top Controls: Residency, Currency, Last Update, Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Jurisdiction: <span className="text-slate-200 font-bold">{profile.primary_residence}</span> ({calculatedMetrics.current_tax_year})
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Base Currency: <span className="text-slate-200 font-bold">{profile.base_currency}</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hidden md:block">
            Updated: <span className="text-slate-200 font-semibold">{calculatedMetrics.last_updated}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-all disabled:opacity-50"
            title="Refresh live tax computations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
            <span>Sync</span>
          </button>
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap ${
                isActive
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
      <div className="min-h-[480px]">
        {activeSubTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* 1. Main Command Center Cards */}
            <TaxCommandCenter
              metrics={calculatedMetrics}
              selectedBroker={selectedBroker}
              onSelectBroker={setSelectedBroker}
            />

            {/* 2. Broker Segregation Matrix */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm p-4 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-sans">
                    BROKER & SOURCE SEGREGATION
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Strict isolation per execution gateway
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(calculatedMetrics.broker_segregations).map((seg) => {
                  const isSelected = selectedBroker === seg.broker;
                  return (
                    <div
                      key={seg.broker}
                      onClick={() => setSelectedBroker(seg.broker)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/20"
                          : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-200 font-sans">
                          {seg.broker}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {seg.transaction_count} events
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Realized P&L:</span>
                          <span className={seg.realized_pnl !== null ? (seg.realized_pnl >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold") : "text-slate-500"}>
                            {seg.realized_pnl !== null ? `₹${Math.round(seg.realized_pnl).toLocaleString()}` : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Est. Tax:</span>
                          <span className="text-amber-400 font-semibold">
                            {seg.estimated_tax !== null ? `₹${Math.round(seg.estimated_tax).toLocaleString()}` : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fees / STT:</span>
                          <span className="text-slate-300">
                            ₹{(seg.fees + seg.taxes_paid).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 truncate">
                        {seg.source_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Asset Class Tax Breakdown & Global Exposure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Asset Class Distribution */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-100 font-sans">
                      ASSET CLASS TAX CLASSIFICATION
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Statutory Rule Mapping
                  </span>
                </div>

                <div className="space-y-2">
                  {calculatedMetrics.asset_breakdown.map((item) => (
                    <div
                      key={item.asset_class}
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-slate-200 font-sans">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.trade_count} trades | Statutory Rate: {item.effective_rate_pct}%
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-slate-200 font-semibold">
                          Taxable: ₹{item.taxable_amount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-amber-400 font-bold">
                          Est. Tax: ₹{item.estimated_tax.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Tax Exposure Table */}
              <GlobalTaxExposureTable
                exposures={serverTaxData?.global_tax_exposure || [
                  {
                    country_code: profile.primary_residence,
                    country_name: profile.primary_residence === "IN" ? "India" : profile.primary_residence,
                    relationship: "tax_residence",
                    tax_type: "Capital Gains / Derivatives / STT",
                    estimated_liability: calculatedMetrics.estimated_tax_liability || 0,
                    paid_withheld: calculatedMetrics.total_taxes_paid_or_withheld || 0,
                    remaining_estimate: calculatedMetrics.remaining_estimated_payable || 0,
                    next_deadline: "2026-06-15",
                    confidence: calculatedMetrics.confidence,
                    explanation: `Taxpayer is a tax resident of ${profile.primary_residence}. Subject to statutory income tax on worldwide trading profits.`,
                    treaty_relevant: false,
                  },
                ]}
                currency={profile.base_currency}
              />
            </div>

            {/* 4. Active Tax Alerts & Statutory Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TaxAlertsView
                alerts={serverTaxData?.tax_alerts || []}
                currency={profile.base_currency}
              />
              <TaxCalendarView
                deadlines={serverTaxData?.upcoming_deadlines || []}
                currency={profile.base_currency}
              />
            </div>

            {/* 5. Transaction Ledger Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-sans">
                    TAX-NORMALIZED TRANSACTIONS
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSubTab("TRANSACTIONS")}
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View All ({allMergedTransactions.length})</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <TaxTransactionsView
                transactions={allMergedTransactions.slice(0, 15)}
                currency={profile.base_currency}
                selectedBroker={selectedBroker}
              />
            </div>
          </div>
        )}

        {activeSubTab === "POSITIONS" && (
          <TaxPositionsView
            positions={serverTaxData?.analyzed_positions || []}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "TAX LOTS" && (
          <TaxLotsView
            lots={lots.length > 0 ? lots : (serverTaxData?.analyzed_positions as any) || []}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "TRANSACTIONS" && (
          <TaxTransactionsView
            transactions={allMergedTransactions}
            currency={profile.base_currency}
            selectedBroker={selectedBroker}
          />
        )}

        {activeSubTab === "COUNTRIES" && (
          <TaxCountriesCatalog countries={countries} />
        )}

        {activeSubTab === "CALENDAR" && (
          <TaxCalendarView
            deadlines={serverTaxData?.upcoming_deadlines || []}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "ALERTS" && (
          <TaxAlertsView
            alerts={serverTaxData?.tax_alerts || []}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "TAX PLANNER" && (
          <TaxPlannerView
            summary={serverTaxData?.command_center || {
              estimated_tax_liability: calculatedMetrics.estimated_tax_liability || 0,
              realized_taxable_gains: calculatedMetrics.taxable_realized_pnl || 0,
              realized_losses: 0,
              net_realized_pl: calculatedMetrics.total_realized_pnl || 0,
              unrealized_tax_exposure: calculatedMetrics.total_unrealized_pnl || 0,
              total_unrealized_pl: calculatedMetrics.total_unrealized_pnl || 0,
              taxes_already_withheld: calculatedMetrics.total_taxes_paid_or_withheld || 0,
              transaction_taxes_paid: 0,
              upcoming_tax_payments: 0,
              tax_loss_opportunities: 0,
              tax_reserve: calculatedMetrics.remaining_estimated_payable || 0,
              compliance_status: "COMPLIANT",
              confidence: calculatedMetrics.confidence,
            }}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "WHAT-IF" && (
          <TaxWhatIfSimulator currency={profile.base_currency} />
        )}

        {activeSubTab === "DOCUMENTS" && (
          <TaxDocumentsChecklist documents={documents} />
        )}

        {activeSubTab === "REPORTS" && (
          <TaxReportsCenter
            overviewData={serverTaxData || {
              profile: profile,
              liability_summary: {
                calculation_id: "CALC_LIVE",
                tax_year: calculatedMetrics.current_tax_year,
                jurisdiction: profile.primary_residence,
                currency: profile.base_currency,
                gross_realized_gains: calculatedMetrics.taxable_realized_pnl || 0,
                allowable_losses: 0,
                net_capital_gains: calculatedMetrics.total_realized_pnl || 0,
                business_derivative_income: 0,
                crypto_vda_income: 0,
                estimated_tax_liability: calculatedMetrics.estimated_tax_liability || 0,
                transaction_taxes_paid: calculatedMetrics.total_taxes_paid_or_withheld || 0,
                brokerage_fees_paid: calculatedMetrics.total_fees_and_charges || 0,
                taxes_already_withheld: 0,
                remaining_estimated_payable: calculatedMetrics.remaining_estimated_payable || 0,
                suggested_tax_reserve: calculatedMetrics.remaining_estimated_payable || 0,
                confidence: calculatedMetrics.confidence,
                reasons: [`Tax residency confirmed: ${profile.primary_residence}`],
              },
              command_center: {
                estimated_tax_liability: calculatedMetrics.estimated_tax_liability || 0,
                realized_taxable_gains: calculatedMetrics.taxable_realized_pnl || 0,
                realized_losses: 0,
                net_realized_pl: calculatedMetrics.total_realized_pnl || 0,
                unrealized_tax_exposure: calculatedMetrics.total_unrealized_pnl || 0,
                total_unrealized_pl: calculatedMetrics.total_unrealized_pnl || 0,
                taxes_already_withheld: calculatedMetrics.total_taxes_paid_or_withheld || 0,
                transaction_taxes_paid: 0,
                upcoming_tax_payments: 0,
                tax_loss_opportunities: 0,
                tax_reserve: calculatedMetrics.remaining_estimated_payable || 0,
                compliance_status: "COMPLIANT",
                confidence: calculatedMetrics.confidence,
              },
              global_tax_exposure: [],
              upcoming_deadlines: [],
              tax_alerts: [],
              analyzed_positions: [],
              legal_disclaimer: "Tax calculations are decision-support estimates based on available transaction, taxpayer, and statutory jurisdiction data.",
            }}
            currency={profile.base_currency}
          />
        )}

        {activeSubTab === "RULE SOURCES" && (
          <TaxRuleSourcesView sources={sources} />
        )}

        {activeSubTab === "SETTINGS" && (
          <TaxpayerProfileSettings
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>

      {/* Statutory Legal Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] font-mono text-slate-500 text-center">
        Tax calculations are decision-support estimates based on available transaction, taxpayer, and statutory jurisdiction data. Complex cases may require verification by a qualified tax professional.
      </div>
    </div>
  );
}
