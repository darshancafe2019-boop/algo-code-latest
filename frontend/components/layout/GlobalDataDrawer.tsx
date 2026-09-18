"use client";

import React from "react";
import Link from "next/link";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  RefreshCw,
  Server,
  Shield,
  X,
  Zap,
} from "lucide-react";

export function GlobalDataDrawer() {
  const {
    isDataDrawerOpen,
    closeDataDrawer,
    providers,
    providersSummary,
    environment,
    setEnvironment,
    reconciliation,
    systemHealth,
    refreshAll,
  } = useQuantDataCore();

  if (!isDataDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={closeDataDrawer} />

      {/* Drawer Panel */}
      <div className="w-full max-w-xl h-full bg-[#0d1117] border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Quant.OS Data Core</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                  Authoritative
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Unified multi-provider financial & market data telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshAll()}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh Data Core"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={closeDataDrawer}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Environment Toggle Bar */}
        <div className="px-6 py-3 border-b border-border/50 bg-background/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Active Ledger Scope</span>
          <div className="flex items-center p-0.5 rounded-lg bg-card border border-border">
            <button
              onClick={() => setEnvironment("PAPER")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                environment === "PAPER"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PAPER (Simulated)
            </button>
            <button
              onClick={() => setEnvironment("LIVE")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LIVE (Broker Ledger)
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card/30">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Providers</div>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {providersSummary.connectedProviders} / {providersSummary.totalProviders}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {providersSummary.liveFeeds} Live Feeds
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card/30">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Avg Latency</div>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {providersSummary.averageLatencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Direct WebSocket</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card/30">
              <div className="text-[11px] text-muted-foreground uppercase font-mono">Reconciliation</div>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {reconciliation?.status || "HEALTHY"}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">
                {reconciliation?.driftsFound || 0} Drifts Found
              </div>
            </div>
          </div>

          {/* Providers Catalog */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" /> Connected Providers & Venues
              </h3>
              <span className="text-[11px] text-muted-foreground">{providers.length} registered</span>
            </div>
            <div className="space-y-2">
              {providers.map((p) => {
                const isLive = p.status === "LIVE";
                const isConnected = p.status === "CONNECTED" || p.status === "RECEIVING";
                return (
                  <div
                    key={p.providerId}
                    className="p-3 rounded-lg border border-border bg-card/40 flex items-center justify-between hover:border-border/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{p.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border ${
                            isLive
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : isConnected
                              ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          Market: {p.capabilities.marketData ? "✓" : "✗"}
                        </span>
                        <span className="flex items-center gap-1">
                          Exec: {p.capabilities.execution ? "✓" : "✗"}
                        </span>
                        <span className="flex items-center gap-1">
                          Account: {p.capabilities.account ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-foreground">
                        {p.latencyMs > 0 ? `${p.latencyMs} ms` : "--"}
                      </div>
                      <div className="text-[10px] text-muted-foreground max-w-[150px] truncate">
                        {p.statusMessage}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reconciliation Audit Box */}
          <div className="p-4 rounded-lg border border-border bg-card/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Continuous Reconciliation Engine
                </h4>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                Audited: {reconciliation?.timestamp ? new Date(reconciliation.timestamp).toLocaleTimeString() : "--"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-background border border-border">
                <div className="text-muted-foreground text-[10px]">Accounts</div>
                <div className="font-bold text-foreground mt-0.5">{reconciliation?.accountsAudited || 0}</div>
              </div>
              <div className="p-2 rounded bg-background border border-border">
                <div className="text-muted-foreground text-[10px]">Positions</div>
                <div className="font-bold text-foreground mt-0.5">{reconciliation?.positionsAudited || 0}</div>
              </div>
              <div className="p-2 rounded bg-background border border-border">
                <div className="text-muted-foreground text-[10px]">Orders</div>
                <div className="font-bold text-foreground mt-0.5">{reconciliation?.ordersAudited || 0}</div>
              </div>
            </div>
            {reconciliation?.driftsFound === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero balance, position, or execution drifts detected across all accounts.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{reconciliation?.driftsFound} reconciliation drift(s) detected.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="p-4 border-t border-border bg-card/30 flex items-center justify-between">
          <Link
            href="/data-stream"
            onClick={closeDataDrawer}
            className="flex items-center gap-2 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Open Global Live Stream Observatory
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={closeDataDrawer}
            className="px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
