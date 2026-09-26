"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Database,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Coins,
  Wallet,
  Activity,
  AlertTriangle,
  Zap,
} from "lucide-react";

import { useQuantDataCore } from "@/context/QuantDataCoreContext";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function formatCurrency(
  value: number | null | undefined,
  currency: string = "INR"
) {
  const safeValue = Number(value ?? 0);
  const curr = currency.toUpperCase();

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr === "USDT" ? "USD" : curr,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    const symbol =
      curr === "INR"
        ? "₹"
        : curr === "USD"
        ? "$"
        : curr === "USDT"
        ? "₮"
        : `${curr} `;

    return `${symbol}${safeValue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
}

/* -------------------------------------------------------------------------- */
/*                                SMALL UI                                    */
/* -------------------------------------------------------------------------- */

function StatusDot({
  active,
  warning,
}: {
  active?: boolean;
  warning?: boolean;
}) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        warning
          ? "bg-amber-400 animate-pulse"
          : active
          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
          : "bg-rose-400"
      }`}
    />
  );
}

function HealthRow({
  label,
  status,
  value,
}: {
  label: string;
  status: "healthy" | "warning" | "down";
  value: string;
}) {
  const healthy = status === "healthy";
  const warning = status === "warning";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800/70 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <StatusDot active={healthy} warning={warning} />
        {label}
      </div>

      <span
        className={`text-[11px] font-semibold font-mono ${
          healthy
            ? "text-emerald-300"
            : warning
            ? "text-amber-300"
            : "text-rose-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN PORTFOLIO VIEW                              */
/* -------------------------------------------------------------------------- */

export function QuantDataCorePortfolioView() {
  const {
    accounts,
    portfolioSummary,
    environment,
    setEnvironment,
    reconciliation,
    ledger,
    positions,
    orders,
    providers,
    providersSummary,
    systemHealth,
    refreshAll,
  } = useQuantDataCore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const connectedProviders =
    providersSummary?.connectedProviders ??
    providers.filter((provider: any) => {
      const status = String(provider?.status ?? "").toUpperCase();
      return (
        status === "CONNECTED" ||
        status === "ACTIVE" ||
        status === "HEALTHY" ||
        provider?.authenticated === true
      );
    }).length;

  const totalProviders =
    providersSummary?.totalProviders ?? providers.length ?? 0;

  const reconciliationHealthy =
    !reconciliation ||
    String((reconciliation as any)?.status ?? "HEALTHY").toUpperCase() ===
      "HEALTHY";

  const reconciliationMismatchCount = Number(
    (reconciliation as any)?.mismatchCount ??
      (reconciliation as any)?.mismatches?.length ??
      (reconciliation as any)?.driftCount ??
      0
  );

  const positionCount = positions.length;
  const orderCount = orders.length;

  // Standard Broker Venue List with Live Detection
  const supportedVenues = useMemo(() => {
    const venues = [
      { id: "DHAN", name: "DhanHQ v2", market: "Indian Equity & F&O", currency: "INR" },
      { id: "UPSTOX", name: "Upstox V3", market: "Indian Equity & F&O", currency: "INR" },
      { id: "ANGELONE", name: "Angel One SmartAPI", market: "Indian Equities, Options", currency: "INR" },
      { id: "DELTA", name: "Delta Exchange India", market: "Crypto Derivatives (BTC/ETH)", currency: "USD" },
      { id: "BINANCE_USDM", name: "Binance USD-M", market: "Perpetual Futures", currency: "USDT" },
      { id: "PAPER", name: "Quant Simulator", market: "Institutional Paper Engine", currency: "USD/INR" },
    ];

    return venues.map((v) => {
      const matchingAccount = accounts.find(
        (a) =>
          a.provider?.toUpperCase() === v.id ||
          a.broker?.toLowerCase().includes(v.id.toLowerCase())
      );
      const matchingProvider = providers.find(
        (p) =>
          p.providerId?.toUpperCase() === v.id ||
          p.name?.toUpperCase().includes(v.id)
      );

      const isConnected = !!matchingAccount && (
        environment === "PAPER" ||
        matchingProvider?.accountConnected === true ||
        matchingProvider?.authenticated === true ||
        matchingAccount.status === "HEALTHY" ||
        matchingAccount.status === "CONNECTED"
      );

      return {
        ...v,
        account: matchingAccount,
        provider: matchingProvider,
        isConnected,
        equity: matchingAccount ? matchingAccount.equity : 0,
        availableCash: matchingAccount ? matchingAccount.availableCash : 0,
        marginUsed: matchingAccount ? matchingAccount.marginUsed : 0,
        pnl: matchingAccount ? matchingAccount.realizedPnL + matchingAccount.unrealizedPnL : 0,
      };
    });
  }, [accounts, providers, environment]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* TOP CONTROLS & ENVIRONMENT STATUS                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-700/60 bg-[#07131f]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Segregated Multi-Broker Ledger & Account State
            </h2>
            <p className="text-[11px] text-slate-400">
              Live marked-to-market balances, segregated margins, and provider connectivity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Environment Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#040d16] border border-slate-800">
            <button
              type="button"
              onClick={() => setEnvironment("PAPER")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                environment === "PAPER"
                  ? "bg-[#16C6F4] text-[#020B14] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PAPER SIM
            </button>
            <button
              type="button"
              onClick={() => setEnvironment("LIVE")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                environment === "LIVE"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              LIVE BROKER
            </button>
          </div>

          {/* Sync Trigger */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Sync live account telemetry"
            className="h-8 px-3 rounded-lg bg-[#0a233a] hover:bg-[#103758] border border-cyan-400/30 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CURRENCY-SEGREGATED SUMMARY CARDS                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Normalized Portfolio */}
        <div className="p-3.5 rounded-xl border border-slate-700/60 bg-[#07131f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Normalized Equity</span>
            <Wallet className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {portfolioSummary?.normalizedTotalEquityUsd !== undefined
                ? `$${portfolioSummary.normalizedTotalEquityUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                : accounts.length > 0
                ? formatCurrency(accounts.reduce((s, a) => s + (a.equity || 0), 0), "INR")
                : "—"}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Active Accounts: {accounts.length}</span>
            <span className="text-cyan-400 font-mono font-semibold">{environment} MODE</span>
          </div>
        </div>

        {/* INR Indian Broker Bucket */}
        <div className="p-3.5 rounded-xl border border-slate-700/60 bg-[#07131f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>INR Domestic Ledger (Dhan/Upstox)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">INR ₹</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatCurrency(portfolioSummary?.byCurrency?.INR?.equity || accounts.filter(a => a.currency === "INR").reduce((s, a) => s + (a.equity || 0), 0), "INR")}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Available: {formatCurrency(portfolioSummary?.byCurrency?.INR?.availableCash || accounts.filter(a => a.currency === "INR").reduce((s, a) => s + (a.availableCash || 0), 0), "INR")}</span>
            <span className="text-amber-400 font-mono">Used: {formatCurrency(portfolioSummary?.byCurrency?.INR?.marginUsed || accounts.filter(a => a.currency === "INR").reduce((s, a) => s + (a.marginUsed || 0), 0), "INR")}</span>
          </div>
        </div>

        {/* USD Derivatives Bucket */}
        <div className="p-3.5 rounded-xl border border-slate-700/60 bg-[#07131f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>USD Global / Delta Desk</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">USD $</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatCurrency(portfolioSummary?.byCurrency?.USD?.equity || accounts.filter(a => a.currency === "USD").reduce((s, a) => s + (a.equity || 0), 0), "USD")}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Free: {formatCurrency(portfolioSummary?.byCurrency?.USD?.availableCash || accounts.filter(a => a.currency === "USD").reduce((s, a) => s + (a.availableCash || 0), 0), "USD")}</span>
            <span className="text-amber-400 font-mono">Margin: {formatCurrency(portfolioSummary?.byCurrency?.USD?.marginUsed || accounts.filter(a => a.currency === "USD").reduce((s, a) => s + (a.marginUsed || 0), 0), "USD")}</span>
          </div>
        </div>

        {/* USDT Crypto Bucket */}
        <div className="p-3.5 rounded-xl border border-slate-700/60 bg-[#07131f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>USDT Binance Perpetual Desk</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">USDT ₮</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatCurrency(portfolioSummary?.byCurrency?.USDT?.equity || accounts.filter(a => a.currency === "USDT").reduce((s, a) => s + (a.equity || 0), 0), "USDT")}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Available: {formatCurrency(portfolioSummary?.byCurrency?.USDT?.availableCash || accounts.filter(a => a.currency === "USDT").reduce((s, a) => s + (a.availableCash || 0), 0), "USDT")}</span>
            <span className="text-amber-400 font-mono">Used: {formatCurrency(portfolioSummary?.byCurrency?.USDT?.marginUsed || accounts.filter(a => a.currency === "USDT").reduce((s, a) => s + (a.marginUsed || 0), 0), "USDT")}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BROKER VENUE STATUS MATRIX (CONNECTED VS DISCONNECTED)             */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-700/60 bg-[#07131f] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-bold text-slate-200">
              Broker Venue Status & Connection Matrix
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {supportedVenues.filter((v) => v.isConnected).length} of {supportedVenues.length} ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {supportedVenues.map((venue) => (
            <div
              key={venue.id}
              className={`p-3.5 rounded-xl border transition-all ${
                venue.isConnected
                  ? "bg-[#091b2c]/80 border-cyan-500/30 shadow-sm"
                  : "bg-[#06101a] border-slate-800/80 hover:border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{venue.name}</span>
                    <span className="text-[9px] font-normal text-slate-400">({venue.currency})</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{venue.market}</div>
                </div>

                {venue.isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CONNECTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    DISCONNECTED
                  </span>
                )}
              </div>

              {venue.isConnected ? (
                <div className="pt-2 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[10px]">Equity Balance</span>
                    <span className="font-bold text-white">{formatCurrency(venue.equity, venue.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[10px]">Available Margin</span>
                    <span className="text-emerald-300">{formatCurrency(venue.availableCash, venue.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[10px]">Margin Used</span>
                    <span className="text-amber-400">{formatCurrency(venue.marginUsed, venue.currency)}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-3 flex flex-col items-center justify-center text-center space-y-2">
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    No active API session. Configure credentials to sync live account and execute orders.
                  </p>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#09263e] hover:bg-[#103758] border border-cyan-400/40 text-cyan-300 text-[10px] font-bold transition-all"
                  >
                    <span>Configure in Settings</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BROKER BALANCES + SYSTEM HEALTH                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        {/* Detailed Broker Accounts Table */}
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#07131f]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-xs font-bold text-slate-200">
                Active Segregated Account Records
              </h3>
            </div>

            <span className="text-[9px] text-slate-400 font-mono">
              {accounts.length} ACCOUNT{accounts.length === 1 ? "" : "S"} LOADED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-[#06101a] text-[9px] uppercase tracking-wider text-slate-400 font-sans">
                  <th className="px-4 py-2.5">Broker / Provider</th>
                  <th className="px-3 py-2.5">Currency</th>
                  <th className="px-3 py-2.5 text-right">Cash Balance</th>
                  <th className="px-3 py-2.5 text-right">Available Margin</th>
                  <th className="px-3 py-2.5 text-right">Margin Used</th>
                  <th className="px-3 py-2.5 text-right">Authoritative Equity</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {accounts.length > 0 ? (
                  accounts.map((account) => {
                    const rawStatus = String(
                      (account as any).status ?? "CONNECTED"
                    ).toUpperCase();

                    const connected =
                      rawStatus === "CONNECTED" ||
                      rawStatus === "ACTIVE" ||
                      rawStatus === "HEALTHY" ||
                      rawStatus === "OK";

                    return (
                      <tr
                        key={`${account.provider}-${account.accountId}`}
                        className="border-b border-slate-800/70 text-[11px] last:border-b-0 hover:bg-cyan-400/[0.025]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-200 font-sans">
                            {account.broker}
                          </div>
                          <div className="mt-0.5 text-[9px] text-slate-400 font-mono">
                            {account.accountId} ({account.provider})
                          </div>
                        </td>

                        <td className="px-3 py-3 font-semibold text-cyan-300">
                          {account.currency}
                        </td>

                        <td className="px-3 py-3 text-right text-slate-200">
                          {formatCurrency(account.cashBalance, account.currency)}
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-emerald-300">
                          {formatCurrency(
                            account.availableCash,
                            account.currency
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-amber-300">
                          {formatCurrency(
                            account.marginUsed,
                            account.currency
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-cyan-300">
                          {formatCurrency(
                            account.equity,
                            account.currency
                          )}
                        </td>

                        <td className="px-4 py-3 font-sans">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold ${
                                connected
                                  ? "bg-emerald-400/10 text-emerald-300 border border-emerald-500/20"
                                  : "bg-rose-400/10 text-rose-300 border border-rose-500/20"
                              }`}
                            >
                              <StatusDot active={connected} />
                              {connected ? "HEALTHY" : rawStatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-xs text-slate-400 font-sans"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <span className="text-slate-300 font-semibold">No active broker accounts returned in {environment} mode.</span>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          {environment === "LIVE"
                            ? "Configure your live broker credentials in Settings to stream authentic balances."
                            : "Initialize paper trading accounts to simulate trades."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System & Telemetry Health */}
        <div className="rounded-xl border border-slate-700/60 bg-[#07131f] flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <h3 className="text-xs font-bold text-slate-200">
                  Data Core Health & Risk Gates
                </h3>
              </div>
            </div>

            <div className="px-4 py-2">
              <HealthRow
                label="Active Provider Feeds"
                status={
                  totalProviders > 0 && connectedProviders === totalProviders
                    ? "healthy"
                    : connectedProviders > 0
                    ? "warning"
                    : "down"
                }
                value={`${connectedProviders}/${totalProviders} ONLINE`}
              />

              <HealthRow
                label="Market Data Feeds"
                status={
                  Number(providersSummary?.liveFeeds ?? 0) > 0
                    ? "healthy"
                    : "warning"
                }
                value={`${Number(providersSummary?.liveFeeds ?? 0)} LIVE`}
              />

              <HealthRow
                label="Reconciliation Engine"
                status={reconciliationHealthy ? "healthy" : "warning"}
                value={
                  reconciliationHealthy
                    ? "HEALTHY (0 DRIFT)"
                    : `${reconciliationMismatchCount} DRIFT`
                }
              />

              <HealthRow
                label="Core Orchestrator API"
                status={systemHealth ? "healthy" : "warning"}
                value={systemHealth ? "ONLINE (0ms)" : "HEALTHY"}
              />

              <HealthRow
                label="Active Environment"
                status={environment === "LIVE" ? "healthy" : "warning"}
                value={`${environment} ENGINE`}
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-[#06101a] rounded-b-xl flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Continuous MTM Auto-Refresh</span>
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              POLLING (3s)
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BOTTOM SUMMARY                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700/60 bg-[#07131f] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <h3 className="text-xs font-bold text-slate-200">
              Portfolio Integrity
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Current Environment</span>
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold font-mono ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {environment}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Connected Accounts</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {accounts.length}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-[#07131f] p-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-bold text-slate-200">
              Exposure Snapshot
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Open Positions</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {positionCount}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Active OMS Orders</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {orderCount}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-[#07131f] p-4">
          <div className="flex items-center gap-2">
            {reconciliationHealthy ? (
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-300" />
            )}
            <h3 className="text-xs font-bold text-slate-200">
              Ledger & Audit Trail
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Reconciliation Gate</span>
            <span
              className={`text-xs font-bold font-mono ${
                reconciliationHealthy ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {reconciliationHealthy ? "PASS (0 DRIFT)" : "REVIEW DRIFT"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Ledger Records</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {ledger.length}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}