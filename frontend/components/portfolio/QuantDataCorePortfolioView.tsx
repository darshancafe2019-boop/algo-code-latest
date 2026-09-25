"use client";

import React, { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Database,
  ShieldCheck,
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
    reconciliation,
    ledger,
    positions,
    orders,
    providers,
    providersSummary,
    systemHealth,
  } = useQuantDataCore();

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

  /* ------------------------------------------------------------------------ */
  /*                                  UI                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-4">
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