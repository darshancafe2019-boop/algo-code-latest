"use client";

import React, { useState } from "react";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatMoney } from "@/lib/formatters";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Landmark,
  RefreshCw,
  Scale,
  Shield,
  Zap,
} from "lucide-react";

export function QuantDataCorePortfolioView() {
  const {
    accounts,
    portfolioSummary,
    environment,
    setEnvironment,
    reconciliation,
    ledger,
    refreshAll,
  } = useQuantDataCore();

  const [activeSubTab, setActiveSubTab] = useState<"accounts" | "ledger" | "reconciliation">("accounts");

  return (
    <div className="space-y-6">
      {/* Scope and Environment Bar */}
      <div className="p-4 rounded-xl border border-border bg-card/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Authoritative Multi-Broker Balances & Equity</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold">
                QuantDataCore
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Strict broker segregation across Dhan (₹), Upstox (₹), Delta ($), Binance ($), and Paper simulator
            </p>
          </div>
        </div>

        {/* Environment Selector and Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-background border border-border text-xs font-medium">
            <button
              onClick={() => setEnvironment("PAPER")}
              className={`px-3 py-1 rounded-md transition-colors ${
                environment === "PAPER"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PAPER (Simulated)
            </button>
            <button
              onClick={() => setEnvironment("LIVE")}
              className={`px-3 py-1 rounded-md transition-colors ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LIVE (Broker Accounts)
            </button>
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh authoritative balances"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Currency-Segregated Portfolio Summary Cards */}
      {portfolioSummary?.byCurrency && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(portfolioSummary.byCurrency).map(([currency, data]: [string, any]) => {
            const sym = currency === "INR" ? "₹" : "$";
            return (
              <div key={currency} className="p-4 rounded-xl border border-border bg-card/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
                    {currency} Portfolio Segment
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-background border border-border text-foreground font-mono">
                    {data.accountsCount} Account{data.accountsCount > 1 ? "s" : ""}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground">Total Equity</div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {sym}{data.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Available Cash</span>
                    <div className="font-semibold text-foreground">
                      {sym}{data.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Margin Used</span>
                    <div className="font-semibold text-foreground">
                      {sym}{data.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Normalized Reporting Total Card */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                Normalized Global Total (USD)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
                FX Fixed Ref
              </span>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground">Consolidated Net Worth</div>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-0.5">
                ${portfolioSummary.normalizedTotalEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
              Conversion Benchmark: 1 USD = 87.50 INR
            </div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab("accounts")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === "accounts"
              ? "bg-card text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          Broker Accounts ({accounts.length})
        </button>

        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === "ledger"
              ? "bg-card text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Append-Only Capital Ledger ({ledger.length})
        </button>

        <button
          onClick={() => setActiveSubTab("reconciliation")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === "reconciliation"
              ? "bg-card text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Continuous Reconciliation
        </button>
      </div>

      {/* 1. Accounts Table */}
      {activeSubTab === "accounts" && (
        <div className="border border-border rounded-xl bg-card/30 overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#0b0f17] border-b border-border text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3">Provider / Broker</th>
                <th className="px-4 py-3">Account ID</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Cash Balance</th>
                <th className="px-4 py-3 text-right">Available Cash</th>
                <th className="px-4 py-3 text-right">Margin Used</th>
                <th className="px-4 py-3 text-right">Available Margin</th>
                <th className="px-4 py-3 text-right">Buying Power</th>
                <th className="px-4 py-3 text-right">Net Equity</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No connected accounts in {environment} environment.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const sym = acc.currency === "INR" ? "₹" : "$";
                  return (
                    <tr key={`${acc.provider}_${acc.accountId}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground font-sans text-xs">{acc.broker}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{acc.provider}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{acc.accountId}</td>
                      <td className="px-4 py-3 font-semibold text-sky-400">{acc.currency}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {sym}{acc.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-400">
                        {sym}{acc.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-amber-400">
                        {sym}{acc.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {sym}{acc.availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {sym}{acc.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {sym}{acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                          {acc.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Capital Ledger Table */}
      {activeSubTab === "ledger" && (
        <div className="border border-border rounded-xl bg-card/30 overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#0b0f17] border-b border-border text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions recorded in the ledger yet.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => {
                  const sym = entry.currency === "INR" ? "₹" : "$";
                  const isCredit = entry.direction === "CREDIT";
                  return (
                    <tr key={entry.ledgerEntryId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{entry.provider}</td>
                      <td className="px-4 py-3 text-sky-400 font-medium">{entry.entryType}</td>
                      <td className="px-4 py-3 text-foreground font-sans">{entry.reason}</td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {sym}{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {sym}{entry.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Reconciliation View */}
      {activeSubTab === "reconciliation" && (
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-foreground text-sm">Continuous Multi-Broker Reconciliation Audit</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Last Verified: {reconciliation?.timestamp ? new Date(reconciliation.timestamp).toLocaleTimeString() : "--"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Accounts Audited</div>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {reconciliation?.accountsAudited || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Positions Audited</div>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {reconciliation?.positionsAudited || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Orders Audited</div>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {reconciliation?.ordersAudited || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Drifts Detected</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {reconciliation?.driftsFound || 0}
              </div>
            </div>
          </div>

          {reconciliation?.driftsFound === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                All broker balances, positions, and order states match authoritative QuantDataCore state with 100% integrity.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{reconciliation?.driftsFound} drift(s) detected during continuous reconciliation pass.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
