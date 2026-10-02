"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  FileSpreadsheet,
  Scale,
  RefreshCw,
} from "lucide-react";
import { TaxpayerProfile } from "@/types/tax";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  calculateLiveTaxIntelligence,
  CalculatedTaxMetrics,
} from "@/lib/taxEngineService";
import { TaxCommandCenter } from "./TaxCommandCenter";
import { GlobalTaxExposureTable } from "./GlobalTaxExposureTable";
import { TaxTransactionsView } from "./TaxTransactionsView";
import { TaxCalendarView } from "./TaxCalendarView";
import { TaxAlertsView } from "./TaxAlertsView";

export function TaxIntelligenceTab() {
  const { positions, orders, portfolioSnapshot, refreshAll } = useGlobalData();

  const [selectedBroker, setSelectedBroker] = useState<string>("ALL");
  const [serverTaxData, setServerTaxData] = useState<any>(null);
  const [serverTransactions, setServerTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [, setFetchError] = useState<string | null>(null);

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
      const [ovRes, txRes, profRes] = await Promise.allSettled([
        apiClient.get<any>("/api/tax/overview", { timeoutMs: 5000, deduplicate: true }),
        apiClient.get<any>("/api/tax/transactions", { timeoutMs: 5000, deduplicate: true }),
        apiClient.get<any>("/api/tax/profile", { timeoutMs: 5000, deduplicate: true }),
      ]);

      if (ovRes.status === "fulfilled" && ovRes.value.ok && ovRes.value.data?.status === "success") {
        setServerTaxData(ovRes.value.data.data);
      }
      if (txRes.status === "fulfilled" && txRes.value.ok && txRes.value.data?.status === "success") {
        setServerTransactions(txRes.value.data.data || []);
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

  // 2. Compute Master Live Tax Calculations directly from live positions, orders & portfolioSnapshot
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
      {/* ── Top Header Strip ──────────────────────────────────────────────────────── */}
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
          {/* Quick Jurisdiction Selector */}
          <select
            value={profile.primary_residence}
            onChange={(e) => setProfile((prev) => ({ ...prev, primary_residence: e.target.value }))}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="IN">India (FY 25-26)</option>
            <option value="US">USA (TY 2025)</option>
            <option value="UK">UK (2025/26)</option>
            <option value="SG">Singapore (YA 26)</option>
            <option value="AE">UAE (TY 2025)</option>
          </select>

          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Base Currency: <span className="text-slate-200 font-bold">{profile.base_currency}</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hidden md:block">
            Updated: <span className="text-slate-200 font-semibold">{calculatedMetrics.last_updated}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh live tax computations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── Main Unified Dashboard ─────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* 1. Main Command Center Cards & Visual Charts */}
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
                        {seg.realized_pnl !== null ? formatMoney(Math.round(seg.realized_pnl), "₹") : "₹0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Tax:</span>
                      <span className="text-amber-400 font-semibold">
                        {seg.estimated_tax !== null ? formatMoney(Math.round(seg.estimated_tax), "₹") : "₹0.00"}
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

        {/* 3. Global Exposure Table */}
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

        {/* 4. Active Tax Alerts & Statutory Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TaxAlertsView
            alerts={calculatedMetrics.alerts}
            currency={profile.base_currency}
          />
          <TaxCalendarView
            deadlines={serverTaxData?.upcoming_deadlines || [
              {
                id: "dl_1",
                country_code: profile.primary_residence,
                tax_year: calculatedMetrics.current_tax_year,
                title: "Advance Tax Q1 Installment (15%)",
                category: "ADVANCE_TAX",
                due_date: "2025-06-15",
                estimated_amount: calculatedMetrics.advance_tax_installments[0]?.quarter_payable_amount || 0,
                currency: profile.base_currency,
                status: calculatedMetrics.advance_tax_installments[0]?.status || "UPCOMING",
                confidence: "CONFIRMED INPUTS",
                statutory_reference: "Sec 208-211 Income Tax Act",
                days_remaining: calculatedMetrics.advance_tax_installments[0]?.days_remaining || 0,
              },
              {
                id: "dl_2",
                country_code: profile.primary_residence,
                tax_year: calculatedMetrics.current_tax_year,
                title: "Advance Tax Q2 Installment (45%)",
                category: "ADVANCE_TAX",
                due_date: "2025-09-15",
                estimated_amount: calculatedMetrics.advance_tax_installments[1]?.quarter_payable_amount || 0,
                currency: profile.base_currency,
                status: calculatedMetrics.advance_tax_installments[1]?.status || "UPCOMING",
                confidence: "CONFIRMED INPUTS",
                statutory_reference: "Sec 208-211 Income Tax Act",
                days_remaining: calculatedMetrics.advance_tax_installments[1]?.days_remaining || 0,
              },
            ]}
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
            <span className="text-xs font-mono text-slate-400">
              {allMergedTransactions.length} records
            </span>
          </div>

          <TaxTransactionsView
            transactions={allMergedTransactions}
            currency={profile.base_currency}
            selectedBroker={selectedBroker}
          />
        </div>
      </div>

      {/* ── Statutory Legal Disclaimer ────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] font-mono text-slate-500 text-center">
        Tax calculations are decision-support estimates based on available transaction, taxpayer, and statutory jurisdiction data. Complex cases may require verification by a qualified tax professional.
      </div>
    </div>
  );
}
