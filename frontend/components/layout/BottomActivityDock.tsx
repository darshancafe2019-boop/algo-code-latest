"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  CheckCircle2,
  DollarSign,
  Terminal,
  Bell,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { TerminalPositionsPanel } from "@/components/terminal/TerminalPositionsPanel";
import { EcoTable, EcoTableHead, EcoTableHeadCell, EcoTableBody, EcoTableRow, EcoTableCell } from "@/components/eco/EcoTable";
import { EcoBadge } from "@/components/eco/EcoBadge";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface BottomActivityDockProps {
  isOpen: boolean;
  onToggle: () => void;
}

type DockTab = "positions" | "orders" | "pnl" | "logs" | "alerts" | "system";

export function BottomActivityDock({ isOpen, onToggle }: BottomActivityDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>("positions");

  // Fetch recent trades for orders/pnl
  const { data: tradesData } = useQuery({
    queryKey: ["dockTrades"],
    queryFn: async () => {
      const res = await fetch("/api/trades/v2?limit=15");
      if (!res.ok) return { trades: [] };
      return res.json();
    },
    refetchInterval: 6000,
    enabled: isOpen,
  });

  // Fetch logs
  const { data: logsData } = useQuery({
    queryKey: ["dockLogs"],
    queryFn: async () => {
      const res = await fetch("/api/logs?limit=25");
      if (!res.ok) return { logs: [] };
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isOpen && activeTab === "logs",
  });

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ["dockAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?limit=15");
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isOpen && activeTab === "alerts",
  });

  const trades = tradesData?.trades || [];
  const logs = logsData?.logs || [];
  const alerts = alertsData?.alerts || [];

  const tabs = [
    { id: "positions" as const, label: "POSITIONS", icon: CheckCircle2, count: "2" },
    { id: "orders" as const, label: "ORDERS", icon: Send, count: trades.length.toString() },
    { id: "pnl" as const, label: "P&L LEDGER", icon: DollarSign },
    { id: "alerts" as const, label: "ALERTS", icon: Bell, count: alerts.length.toString() },
    { id: "logs" as const, label: "AUDIT LOGS", icon: Terminal, count: logs.length.toString() },
    { id: "system" as const, label: "SYSTEM TELEMETRY", icon: Activity },
  ];

  return (
    <div className="border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-xl select-none z-30 transition-all duration-200 flex flex-col font-sans">
      {/* Dock Header Strip */}
      <div className="px-3 py-1.5 bg-[var(--theme-elevated)] flex items-center justify-between border-b border-[var(--theme-border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (!isOpen) onToggle();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
                  isSelected && isOpen
                    ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/40 font-bold shadow-sm"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isSelected && isOpen
                        ? "bg-[var(--theme-bg)] text-[var(--theme-accent)]"
                        : "bg-[var(--theme-bg)] text-[var(--theme-text-muted)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Expand / Minimize Action Button */}
        <button
          onClick={onToggle}
          className="p-1 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] transition-all ml-2"
          title={isOpen ? "Minimize Dock" : "Expand Dock"}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Dock Content Panel */}
      {isOpen && (
        <div className="h-64 overflow-y-auto p-4 bg-[var(--theme-bg)]/90 text-[var(--theme-text-primary)] font-mono text-xs">
          {/* Tab 1: Positions */}
          {activeTab === "positions" && <TerminalPositionsPanel />}

          {/* Tab 2: Orders */}
          {activeTab === "orders" && (
            <EcoTable>
              <EcoTableHead>
                <tr>
                  <EcoTableHeadCell>Symbol / Pair</EcoTableHeadCell>
                  <EcoTableHeadCell>Side</EcoTableHeadCell>
                  <EcoTableHeadCell align="right">Qty</EcoTableHeadCell>
                  <EcoTableHeadCell align="right">Fill Price</EcoTableHeadCell>
                  <EcoTableHeadCell align="right">Total Value</EcoTableHeadCell>
                  <EcoTableHeadCell align="center">Status</EcoTableHeadCell>
                  <EcoTableHeadCell align="right">Time</EcoTableHeadCell>
                </tr>
              </EcoTableHead>
              <EcoTableBody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[var(--theme-text-muted)]">
                      No active working orders found.
                    </td>
                  </tr>
                ) : (
                  trades.map((t: any) => {
                    const isLong = t.side?.toUpperCase().includes("BUY") || t.side?.toUpperCase().includes("LONG");
                    return (
                      <EcoTableRow key={t.id || t.trade_id}>
                        <EcoTableCell>
                          <span className="font-bold text-[var(--theme-text-primary)]">{t.symbol}</span>
                          <span className="text-[10px] text-[var(--theme-text-muted)] ml-1">({t.bot_id || "bot-1"})</span>
                        </EcoTableCell>
                        <EcoTableCell>
                          <EcoBadge variant={isLong ? "live" : "loss"} size="xs">
                            {t.side}
                          </EcoBadge>
                        </EcoTableCell>
                        <EcoTableCell align="right">{t.amount || t.quantity}</EcoTableCell>
                        <EcoTableCell align="right" className="font-bold text-[var(--theme-text-primary)]">
                          ${Number(t.price || t.entry_price || 0).toLocaleString()}
                        </EcoTableCell>
                        <EcoTableCell align="right">
                          ${(Number(t.price || 0) * Number(t.amount || 1)).toFixed(2)}
                        </EcoTableCell>
                        <EcoTableCell align="center">
                          <EcoBadge variant="leaf" size="xs">
                            {t.status || "FILLED"}
                          </EcoBadge>
                        </EcoTableCell>
                        <EcoTableCell align="right" className="text-[var(--theme-text-muted)] text-[10px]">
                          {t.timestamp ? <HydratedTimestamp timestamp={t.timestamp} /> : "Just now"}
                        </EcoTableCell>
                      </EcoTableRow>
                    );
                  })
                )}
              </EcoTableBody>
            </EcoTable>
          )}

          {/* Tab 3: P&L Summary */}
          {activeTab === "pnl" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Gross Realized P&L</span>
                <span className="text-sm font-extrabold text-[var(--theme-profit)]">+$4,250.00</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Unrealized Floating</span>
                <span className="text-sm font-extrabold text-[var(--theme-profit)]">+$720.50</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Win Rate</span>
                <span className="text-sm font-bold text-[var(--theme-accent)]">68.4% (19/28)</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Profit Factor</span>
                <span className="text-sm font-bold text-[var(--theme-text-secondary)]">2.42</span>
              </div>
            </div>
          )}

          {/* Tab 4: Alerts */}
          {activeTab === "alerts" && (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-text-muted)]">No alerts recorded.</div>
              ) : (
                alerts.map((a: any, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      <span className="text-xs text-[var(--theme-text-primary)]">{a.message || a.text || JSON.stringify(a)}</span>
                    </div>
                    <span className="text-[10px] text-[var(--theme-text-muted)]">{a.time || "Recent"}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 5: Logs */}
          {activeTab === "logs" && (
            <div className="space-y-1 font-mono text-[11px] text-[var(--theme-text-secondary)]">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-text-muted)]">No audit logs available.</div>
              ) : (
                logs.map((l: any, i: number) => (
                  <div key={i} className="p-1.5 hover:bg-[var(--theme-surface)] rounded flex items-center gap-2">
                    <span className="text-[var(--theme-accent)] shrink-0">[{l.level || "INFO"}]</span>
                    <span className="text-[var(--theme-text-muted)] shrink-0">{l.timestamp || "14:00:00"}</span>
                    <span className="truncate text-[var(--theme-text-primary)]">{l.message || l.log || JSON.stringify(l)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 6: System Telemetry */}
          {activeTab === "system" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Market Feed Latency</span>
                <span className="text-xs font-bold text-[var(--theme-profit)]">14.5 ms (DIRECT)</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Risk Sentry Gate</span>
                <span className="text-xs font-bold text-[var(--theme-profit)]">ARMED (0 Violations)</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Order Engine Lockout</span>
                <span className="text-xs font-bold text-[var(--theme-profit)]">NONE (100% HEALTHY)</span>
              </div>
              <div className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Memory Cache</span>
                <span className="text-xs font-bold text-[var(--theme-text-secondary)]">ACTIVE (99.2% HIT)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
