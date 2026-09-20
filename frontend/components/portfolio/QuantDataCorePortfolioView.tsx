"use client";

import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Database,
  Landmark,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  Wallet,
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

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    const symbol =
      currency === "INR"
        ? "₹"
        : currency === "USD"
          ? "$"
          : currency === "USDT"
            ? "USDT "
            : `${currency} `;

    return `${symbol}${safeValue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
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
      className={`inline-block h-2 w-2 rounded-full ${warning
          ? "bg-amber-400"
          : active
            ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
            : "bg-rose-400"
        }`}
    />
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone = "cyan",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
}) {
  const toneClasses = {
    cyan: {
      icon: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
      glow: "from-cyan-500/5",
    },
    emerald: {
      icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      glow: "from-emerald-500/5",
    },
    amber: {
      icon: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      glow: "from-amber-500/5",
    },
    violet: {
      icon: "border-violet-400/20 bg-violet-400/10 text-violet-300",
      glow: "from-violet-500/5",
    },
    rose: {
      icon: "border-rose-400/20 bg-rose-400/10 text-rose-300",
      glow: "from-rose-500/5",
    },
  };

  const style = toneClasses[tone];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        border border-slate-700/60
        bg-[#081522]
        p-4
        shadow-[0_8px_30px_rgba(0,0,0,0.18)]
      `}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.glow} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </div>

          <div className="mt-2 truncate text-xl font-bold text-slate-100">
            {value}
          </div>

          {subtitle && (
            <div className="mt-1 text-[11px] text-slate-400">{subtitle}</div>
          )}
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
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
        className={`text-[11px] font-semibold ${healthy
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
    isLoading,
    refreshAll,
  } = useQuantDataCore();

  /* ------------------------------------------------------------------------ */
  /*                              CALCULATIONS                                */
  /* ------------------------------------------------------------------------ */

  const brokerCards = useMemo(() => {
    return accounts.map((account) => {
      const rawStatus = String((account as any).status ?? "CONNECTED")
        .trim()
        .toUpperCase();

      const connected =
        rawStatus === "CONNECTED" ||
        rawStatus === "ACTIVE" ||
        rawStatus === "HEALTHY" ||
        rawStatus === "OK";

      return {
        id: `${account.provider}-${account.accountId}`,
        broker: account.broker || account.provider,
        provider: account.provider,
        currency: account.currency,
        equity: account.equity,
        availableCash: account.availableCash,
        marginUsed: account.marginUsed,
        connected,
      };
    });
  }, [accounts]);

  const positionCount = Array.isArray(positions) ? positions.length : 0;
  const orderCount = Array.isArray(orders) ? orders.length : 0;

  const connectedProviders =
    providersSummary?.connectedProviders ??
    providers.filter((provider: any) => {
      const status = String(provider?.status ?? "").toUpperCase();

      return (
        status === "CONNECTED" ||
        status === "ACTIVE" ||
        status === "HEALTHY"
      );
    }).length;

  const totalProviders =
    providersSummary?.totalProviders ?? providers.length ?? 0;

  const avgLatency = Number(providersSummary?.averageLatencyMs ?? 0);

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

  const currencyEntries = Object.entries(
    portfolioSummary?.byCurrency ?? {}
  ) as Array<[string, any]>;

  const normalizedUsd = Number(
    portfolioSummary?.normalizedTotalEquityUsd ?? 0
  );

  /* ------------------------------------------------------------------------ */
  /*                                  UI                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* CONTROL BAR                                                        */}
      {/* ------------------------------------------------------------------ */}

      <section className="rounded-xl border border-slate-700/60 bg-[#07131f] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Landmark className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">
                  Portfolio Command Centre
                </h2>

                <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                  QuantDataCore
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                Multi-broker capital, exposure, balances and reconciliation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-700/80 bg-[#050e18] p-1">
              <button
                type="button"
                onClick={() => setEnvironment("PAPER")}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition ${environment === "PAPER"
                    ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25"
                    : "text-slate-500 hover:text-slate-200"
                  }`}
              >
                PAPER
              </button>

              <button
                type="button"
                onClick={() => setEnvironment("LIVE")}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition ${environment === "LIVE"
                    ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25"
                    : "text-slate-500 hover:text-slate-200"
                  }`}
              >
                LIVE
              </button>
            </div>

            <button
              type="button"
              onClick={() => refreshAll()}
              className="
                flex items-center gap-2 rounded-lg
                border border-slate-700/80
                bg-[#0a1826]
                px-3 py-2
                text-[10px] font-semibold text-slate-300
                transition
                hover:border-cyan-400/30
                hover:bg-cyan-400/5
                hover:text-cyan-200
              "
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />

              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BROKER CONNECTION STRIP                                            */}
      {/* ------------------------------------------------------------------ */}

      <section className="rounded-xl border border-slate-700/60 bg-[#07131f] p-3">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-300" />

            <h3 className="text-xs font-bold text-slate-200">
              Broker & Provider Status
            </h3>
          </div>

          <div className="text-[10px] text-slate-500">
            {connectedProviders}/{totalProviders} connected
          </div>
        </div>

        {brokerCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {brokerCards.slice(0, 5).map((broker) => (
              <div
                key={broker.id}
                className="
                  rounded-lg border border-slate-700/70
                  bg-[#091827]
                  px-3 py-2.5
                "
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-bold text-slate-200">
                    {broker.broker}
                  </div>

                  <StatusDot active={broker.connected} />
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <span
                    className={`text-[9px] font-semibold ${broker.connected
                        ? "text-emerald-300"
                        : "text-rose-300"
                      }`}
                  >
                    {broker.connected ? "CONNECTED" : "OFFLINE"}
                  </span>

                  <span className="text-[9px] text-slate-500">
                    {broker.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-[#091522] px-4 py-5 text-center text-xs text-slate-500">
            No broker accounts returned for {environment}.
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HERO + KPI GRID                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.55fr_1fr]">
        {/* Main Portfolio Value */}

        <div
          className="
            relative overflow-hidden rounded-xl
            border border-cyan-500/20
            bg-[#071724]
            p-5
            shadow-[0_15px_50px_rgba(0,0,0,0.22)]
          "
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">
                  Consolidated Portfolio
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Normalized reporting value
                </div>

                <div className="mt-4 text-4xl font-black tracking-tight text-white">
                  {normalizedUsd > 0
                    ? formatCurrency(normalizedUsd, "USD")
                    : "--"}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                    <Activity className="h-3 w-3" />
                    {environment}
                  </span>

                  <span className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-400">
                    {accounts.length} broker account
                    {accounts.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="grid min-w-[240px] grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-700/70 bg-[#08131f]/90 p-3">
                  <div className="text-[9px] uppercase text-slate-500">
                    Providers
                  </div>

                  <div className="mt-1 text-lg font-bold text-slate-100">
                    {connectedProviders}
                    <span className="text-xs font-normal text-slate-500">
                      /{totalProviders}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700/70 bg-[#08131f]/90 p-3">
                  <div className="text-[9px] uppercase text-slate-500">
                    Avg Latency
                  </div>

                  <div className="mt-1 text-lg font-bold text-slate-100">
                    {avgLatency > 0 ? `${avgLatency.toFixed(0)} ms` : "--"}
                  </div>
                </div>
              </div>
            </div>

            {/* Currency segments */}

            <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {currencyEntries.length > 0 ? (
                currencyEntries.map(([currency, segment]) => (
                  <div
                    key={currency}
                    className="rounded-lg border border-slate-700/60 bg-[#06111c]/80 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                        {currency}
                      </span>

                      <span className="text-[9px] text-slate-600">
                        {Number(segment?.accountsCount ?? 0)} ACCTS
                      </span>
                    </div>

                    <div className="mt-1 text-base font-bold text-slate-100">
                      {formatCurrency(
                        Number(segment?.equity ?? 0),
                        currency
                      )}
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-[9px]">
                      <span className="text-slate-500">Available</span>

                      <span className="font-medium text-emerald-300">
                        {formatCurrency(
                          Number(segment?.availableCash ?? 0),
                          currency
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-lg border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">
                  Portfolio summary is currently unavailable.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Open Positions"
            value={positionCount}
            subtitle="Current portfolio exposure"
            icon={<Activity className="h-4 w-4" />}
            tone="emerald"
          />

          <SummaryCard
            title="Orders"
            value={orderCount}
            subtitle="Current OMS records"
            icon={<Zap className="h-4 w-4" />}
            tone="cyan"
          />

          <SummaryCard
            title="Ledger Events"
            value={ledger.length}
            subtitle="Recent capital records"
            icon={<Scale className="h-4 w-4" />}
            tone="violet"
          />

          <SummaryCard
            title="Reconciliation"
            value={
              <span
                className={
                  reconciliationHealthy
                    ? "text-emerald-300"
                    : "text-rose-300"
                }
              >
                {reconciliationHealthy ? "HEALTHY" : "ATTENTION"}
              </span>
            }
            subtitle={`${reconciliationMismatchCount} mismatches detected`}
            icon={
              reconciliationHealthy ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )
            }
            tone={reconciliationHealthy ? "emerald" : "rose"}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CAPITAL & EXPOSURE MATRIX — REPLACES GRAPH                         */}
      {/* ------------------------------------------------------------------ */}

      <section className="rounded-xl border border-slate-700/60 bg-[#07131f] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-300" />

              <h3 className="text-sm font-bold text-slate-100">
                Capital & Exposure Matrix
              </h3>
            </div>

            <p className="mt-1 text-[10px] text-slate-500">
              Currency-separated equity, liquidity and margin utilization
            </p>
          </div>

          <span className="rounded-md border border-slate-700 bg-[#091827] px-2 py-1 text-[9px] font-semibold text-slate-400">
            NO CROSS-CURRENCY SUMMING
          </span>
        </div>

        {currencyEntries.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {currencyEntries.map(([currency, segment]) => {
              const equity = Number(segment?.equity ?? 0);
              const availableCash = Number(segment?.availableCash ?? 0);
              const marginUsed = Number(segment?.marginUsed ?? 0);

              const denominator = marginUsed + availableCash;

              const marginPct =
                denominator > 0 ? (marginUsed / denominator) * 100 : 0;

              const safeMarginPct = clampPercentage(marginPct);

              return (
                <div
                  key={currency}
                  className="
                    rounded-xl
                    border border-slate-700/60
                    bg-[#081522]
                    p-4
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        {currency} Portfolio
                      </div>

                      <div className="mt-2 text-2xl font-black text-white">
                        {formatCurrency(equity, currency)}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        Total Equity
                      </div>
                    </div>

                    <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/10 p-2 text-cyan-300">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-800 bg-[#06111c] p-3">
                      <div className="text-[9px] uppercase text-slate-500">
                        Available
                      </div>

                      <div className="mt-1 truncate text-xs font-bold text-emerald-300">
                        {formatCurrency(availableCash, currency)}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-[#06111c] p-3">
                      <div className="text-[9px] uppercase text-slate-500">
                        Margin Used
                      </div>

                      <div className="mt-1 truncate text-xs font-bold text-amber-300">
                        {formatCurrency(marginUsed, currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[9px]">
                      <span className="text-slate-500">
                        Margin Utilization
                      </span>

                      <span className="font-semibold text-slate-300">
                        {safeMarginPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${safeMarginPct >= 80
                            ? "bg-rose-400"
                            : safeMarginPct >= 60
                              ? "bg-amber-400"
                              : "bg-cyan-400"
                          }`}
                        style={{
                          width: `${safeMarginPct}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center">
            <Database className="mx-auto h-6 w-6 text-slate-600" />

            <p className="mt-2 text-xs text-slate-500">
              No portfolio currency data returned from QuantDataCore.
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BROKER BALANCES + SYSTEM HEALTH                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        {/* Broker accounts */}

        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#07131f]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-300" />

              <h3 className="text-xs font-bold text-slate-200">
                Broker Account Balances
              </h3>
            </div>

            <span className="text-[9px] text-slate-500">
              {accounts.length} ACCOUNT{accounts.length === 1 ? "" : "S"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-[#06101a] text-[9px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Broker</th>
                  <th className="px-3 py-2.5">Currency</th>
                  <th className="px-3 py-2.5 text-right">Equity</th>
                  <th className="px-3 py-2.5 text-right">Available</th>
                  <th className="px-3 py-2.5 text-right">Margin Used</th>
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
                          <div className="font-semibold text-slate-200">
                            {account.broker}
                          </div>

                          <div className="mt-0.5 text-[9px] text-slate-600">
                            {account.provider}
                          </div>
                        </td>

                        <td className="px-3 py-3 font-semibold text-cyan-300">
                          {account.currency}
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-slate-200">
                          {formatCurrency(
                            account.equity,
                            account.currency
                          )}
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

                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold ${connected
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-rose-400/10 text-rose-300"
                                }`}
                            >
                              <StatusDot active={connected} />
                              {connected ? "CONNECTED" : rawStatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-xs text-slate-500"
                    >
                      No accounts returned in {environment} mode.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System health */}

        <div className="rounded-xl border border-slate-700/60 bg-[#07131f]">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />

              <h3 className="text-xs font-bold text-slate-200">
                System Health
              </h3>
            </div>
          </div>

          <div className="px-4 py-2">
            <HealthRow
              label="Provider Layer"
              status={
                totalProviders > 0 &&
                  connectedProviders === totalProviders
                  ? "healthy"
                  : connectedProviders > 0
                    ? "warning"
                    : "down"
              }
              value={`${connectedProviders}/${totalProviders}`}
            />

            <HealthRow
              label="Market Feeds"
              status={
                Number(providersSummary?.liveFeeds ?? 0) > 0
                  ? "healthy"
                  : "warning"
              }
              value={`${Number(
                providersSummary?.liveFeeds ?? 0
              )} LIVE`}
            />

            <HealthRow
              label="Reconciliation"
              status={reconciliationHealthy ? "healthy" : "warning"}
              value={
                reconciliationHealthy
                  ? "HEALTHY"
                  : `${reconciliationMismatchCount} DRIFT`
              }
            />

            <HealthRow
              label="System API"
              status={systemHealth ? "healthy" : "warning"}
              value={systemHealth ? "ONLINE" : "NO DATA"}
            />

            <HealthRow
              label="Environment"
              status={environment === "LIVE" ? "healthy" : "warning"}
              value={environment}
            />
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
              Portfolio State
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Current Environment
            </span>

            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${environment === "LIVE"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300"
                }`}
            >
              {environment}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Connected Accounts
            </span>

            <span className="text-xs font-bold text-slate-200">
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
            <span className="text-[11px] text-slate-500">
              Open Positions
            </span>

            <span className="text-xs font-bold text-slate-200">
              {positionCount}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              OMS Orders
            </span>

            <span className="text-xs font-bold text-slate-200">
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
              Capital Integrity
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Reconciliation
            </span>

            <span
              className={`text-xs font-bold ${reconciliationHealthy
                  ? "text-emerald-300"
                  : "text-rose-300"
                }`}
            >
              {reconciliationHealthy ? "PASS" : "REVIEW"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Ledger Records
            </span>

            <span className="text-xs font-bold text-slate-200">
              {ledger.length}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}