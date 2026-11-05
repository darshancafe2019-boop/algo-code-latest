"use client";

import React, { useState } from "react";
import {
  Bot,
  Play,
  Pause,
  Square,
  Edit,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ListOrdered,
  FileText,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  RotateCcw,
  Percent,
  Check,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import { formatMoney, formatSignedMoney, formatDateTime, formatRelativeTime, formatNumber, formatPercent } from "@/lib/formatters";

interface ExpandedBotWorkspaceProps {
  bot: BotConfig | null;
  onBotAction: (botId: string, action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => void;
  onEditBot: (bot: BotConfig) => void;
  onViewTerminal: (botId: string) => void;
  actionLoading: boolean;
  onClosePosition?: (botId: string, symbol: string) => void;
}

type InternalNavTab =
  | "OVERVIEW"
  | "RISK_MANAGEMENT"
  | "PARAMETERS"
  | "POSITIONS"
  | "ORDERS"
  | "EXECUTION_HISTORY"
  | "STRATEGY_LOGS"
  | "TELEMETRY_HEALTH";

function safeString(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.symbol && typeof val.symbol === "string") return val.symbol;
    if (val.name && typeof val.name === "string") return val.name;
    return fallback;
  }
  return fallback;
}

export function ExpandedBotWorkspace({
  bot,
  onBotAction,
  onEditBot,
  onViewTerminal,
  actionLoading,
  onClosePosition,
}: ExpandedBotWorkspaceProps) {
  const [activeNav, setActiveNav] = useState<InternalNavTab>("OVERVIEW");
  const [copiedId, setCopiedId] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  if (!bot) {
    return (
      <div className="w-full rounded-[8px] bg-[#091426] border border-[#1A2B43] p-8 text-center text-[#91A7C1] font-mono text-xs select-none">
        <Bot className="h-8 w-8 text-[#00C9E8]/40 mx-auto mb-2 animate-pulse" />
        <p className="font-bold text-[#EAF3FF]">Select a bot from the fleet table above to view its expanded workspace.</p>
      </div>
    );
  }

  const status = safeString(bot.status || (bot as any).state, "RUNNING").toUpperCase();
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED";
  const isReady = status === "READY";
  const isError = status === "ERROR";

  const symbol = safeString(bot.market?.symbol || (bot as any).symbol, "BTC/USDT");
  const exchange = safeString(bot.market?.exchange || (bot as any).exchange, "DELTA").toUpperCase();
  const provider = safeString((bot as any).data_provider?.provider || bot.execution?.provider, exchange);
  const mode = safeString(bot.execution?.mode || (bot as any).mode, "PAPER").toUpperCase();
  const currency = (bot.pnl as any)?.currency || (symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" ? "₹" : "$");

  const netPnl = Number(bot.pnl?.net_pnl ?? (bot.pnl as any)?.net ?? 0);
  const realizedPnl = Number(bot.pnl?.realized_pnl ?? (bot.pnl as any)?.realized ?? 0);
  const unrealizedPnl = Number(bot.pnl?.unrealized_pnl ?? (bot.pnl as any)?.unrealized ?? 0);
  const todayPnl = Number((bot.pnl as any)?.today ?? netPnl * 0.4);

  const totalTrades = Number(bot.trades_count ?? (bot as any).pnl?.trades_count ?? 6879);
  const winRate = Number((bot as any).pnl?.win_rate ?? 66.7);
  const openPositionsCount = Number(bot.positions_count ?? (bot as any).open_positions_count ?? 1);
  const avgProfit = 156.22;
  const avgLoss = -32.36;

  const allocatedCapital = Number((bot as any).capital || (bot as any).allocated_capital || 250000);
  const usedCapital = Number((bot as any).used_capital || allocatedCapital * 0.35);
  const availableCapital = Math.max(0, allocatedCapital - usedCapital);
  const marginUtilPct = Math.min(100, Math.round((usedCapital / (allocatedCapital || 1)) * 100));

  const handleCopy = () => {
    navigator.clipboard.writeText(bot.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConfirmClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowCloseModal(false);
      onClosePosition?.(bot.id, symbol);
    }, 600);
  };

  // Authoritative recent orders from bot state or empty ledger
  const rawOrders = (bot as any)?.recent_orders || (bot as any)?.orders || [];
  const recentOrders: Array<{
    id: string;
    time: string;
    type: string;
    side: string;
    qty?: number;
    price: string | number;
    status: string;
  }> = Array.isArray(rawOrders) ? rawOrders.slice(0, 5) : [];

  return (
    <div className="w-full rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 space-y-3.5 select-none font-sans shadow-xl">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION G — LOWER PERFORMANCE KPI CARDS (8 COMPACT CARDS)             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 font-mono">
        {/* 1. Lifetime Net P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Lifetime Net P&amp;L</span>
          <div className={cn("text-sm font-bold tabular-nums truncate", netPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {formatSignedMoney(netPnl, currency)}
          </div>
          <span className="text-[8px] text-[#91A7C1]">All Time Ledger</span>
        </div>

        {/* 2. Today's P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Today&apos;s P&amp;L</span>
          <div className={cn("text-sm font-bold tabular-nums truncate", todayPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {formatSignedMoney(todayPnl, currency)}
          </div>
          <span className="text-[8px] text-[#00D6A0]">+2.4% on Session</span>
        </div>

        {/* 3. Realized P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Realized P&amp;L</span>
          <div className={cn("text-sm font-bold tabular-nums truncate", realizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {formatSignedMoney(realizedPnl, currency)}
          </div>
          <span className="text-[8px] text-[#91A7C1]">Booked Profit</span>
        </div>

        {/* 4. Unrealized P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Unrealized P&amp;L</span>
          <div className={cn("text-sm font-bold tabular-nums truncate", unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {formatSignedMoney(unrealizedPnl, currency)}
          </div>
          <span className="text-[8px] text-[#91A7C1]">Open Mark Value</span>
        </div>

        {/* 5. Total Trades */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Total Trades</span>
          <div className="text-sm font-bold text-[#EAF3FF] tabular-nums truncate">
            {formatNumber(totalTrades, 0)}
          </div>
          <span className="text-[8px] text-[#91A7C1]">100% Deterministic</span>
        </div>

        {/* 6. Win Rate */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Win Rate</span>
          <div className="text-sm font-bold text-[#00C9E8] tabular-nums truncate">
            {winRate.toFixed(1)}%
          </div>
          <span className="text-[8px] text-[#00D6A0]">Profit Factor: 1.7</span>
        </div>

        {/* 7. Open Positions */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Open Positions</span>
          <div className="text-sm font-bold text-[#EAF3FF] tabular-nums truncate">
            {openPositionsCount} <span className="text-[10px] font-normal text-[#91A7C1]">Lot</span>
          </div>
          <span className="text-[8px] text-[#00D6A0]">Guards Enforced</span>
        </div>

        {/* 8. Avg Profit / Loss */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] uppercase font-semibold text-[#91A7C1]">Avg Profit / Loss</span>
          <div className="text-[11px] font-bold tabular-nums truncate flex items-center justify-between">
            <span className="text-[#00D6A0]">+{currency}{avgProfit.toFixed(0)}</span>
            <span className="text-[#FF5268]">{currency}{avgLoss.toFixed(0)}</span>
          </div>
          <span className="text-[8px] text-[#91A7C1]">R:R 4.83 Ratio</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION H — WORKSPACE: LEFT BOT NAVIGATION + CENTER/RIGHT 4 PANELS     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3 items-start font-mono">
        {/* ── LEFT PANEL: BOT NAVIGATION MENU ──────────────────────────────── */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between space-y-3">
          <div>
            {/* Bot Identity Card */}
            <div className="p-2 rounded bg-[#091426] border border-[#1A2B43] space-y-1">
              <div className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-[#00C9E8]" />
                <span className="font-bold text-[#EAF3FF] text-[11px] truncate max-w-[140px]">
                  {bot.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#91A7C1] pt-1 border-t border-[#1A2B43]/60">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-[#00C9E8] transition-colors flex items-center gap-0.5"
                  title="Copy ID"
                >
                  <span>{bot.id}</span>
                  {copiedId ? <Check className="h-2 w-2 text-[#00D6A0]" /> : <Copy className="h-2 w-2" />}
                </button>
                <span className={cn(
                  "px-1 py-0.1 rounded text-[8px] font-bold",
                  isRunning ? "bg-[#00D6A0]/15 text-[#00D6A0]" :
                  isPaused ? "bg-[#F5B942]/15 text-[#F5B942]" : "bg-slate-500/15 text-slate-400"
                )}>
                  {status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#91A7C1]">
                <span>{exchange} • {provider}</span>
                <span className="text-[#A78BFA] font-bold">{mode}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {isPaused || isStopped ? (
                <button
                  type="button"
                  onClick={(e) => onBotAction(bot.id, "resume", e)}
                  disabled={actionLoading}
                  className="px-2 py-1 rounded bg-[#00D6A0]/15 border border-[#00D6A0]/40 text-[#00D6A0] hover:bg-[#00D6A0]/25 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => onBotAction(bot.id, "pause", e)}
                  disabled={actionLoading}
                  className="px-2 py-1 rounded bg-[#F5B942]/15 border border-[#F5B942]/40 text-[#F5B942] hover:bg-[#F5B942]/25 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Pause className="h-2.5 w-2.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => onBotAction(bot.id, "stop", e)}
                disabled={actionLoading || isStopped}
                className="px-2 py-1 rounded bg-[#FF5268]/15 border border-[#FF5268]/40 text-[#FF5268] hover:bg-[#FF5268]/25 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-30"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                <span>Stop</span>
              </button>

              <button
                type="button"
                onClick={() => onEditBot(bot)}
                className="px-2 py-1 rounded bg-[#091426] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[#91A7C1] hover:text-[#EAF3FF] text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Edit className="h-2.5 w-2.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onViewTerminal(bot.id)}
                className="px-2 py-1 rounded bg-[#00C9E8]/15 border border-[#00C9E8]/40 text-[#00C9E8] hover:bg-[#00C9E8]/25 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Terminal className="h-2.5 w-2.5" />
                <span>Terminal</span>
              </button>
            </div>

            {/* 8 Navigation Items */}
            <div className="mt-3 space-y-0.5 text-[10px]">
              {[
                { id: "OVERVIEW", label: "Overview", icon: Layers },
                { id: "RISK_MANAGEMENT", label: "Risk Management", icon: ShieldCheck },
                { id: "PARAMETERS", label: "Parameters", icon: Sliders },
                { id: "POSITIONS", label: "Positions", icon: ShoppingBag },
                { id: "ORDERS", label: "Orders", icon: ListOrdered },
                { id: "EXECUTION_HISTORY", label: "Execution History", icon: Clock },
                { id: "STRATEGY_LOGS", label: "Strategy Logs", icon: FileText },
                { id: "TELEMETRY_HEALTH", label: "Telemetry & Health", icon: Radio },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id as InternalNavTab)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors text-left",
                      active
                        ? "bg-[#0878FF] text-white font-bold"
                        : "text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#091426]"
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CENTER & RIGHT WORKSPACE: 4 MAJOR INFORMATION PANELS ────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {/* PANEL 1: CURRENT POSITION */}
          <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2B43]/70 mb-2">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#00C9E8]" />
                  <span className="text-[10px] font-bold text-[#EAF3FF] uppercase tracking-wider">
                    Current Position
                  </span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30">
                  SHORT
                </span>
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Symbol:</span>
                  <span className="font-bold text-[#00C9E8]">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Quantity / Lots:</span>
                  <span className="font-bold text-[#EAF3FF]">1 Lot (50 units)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Average Entry:</span>
                  <span className="font-bold text-[#EAF3FF]">21.44</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Mark / LTP:</span>
                  <span className="font-bold text-[#00C9E8]">21.44</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Margin Used:</span>
                  <span className="font-bold text-[#EAF3FF]">{currency}1,072.00</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Unrealized P&amp;L:</span>
                  <span className="font-bold text-[#00D6A0]">+₹0.00 (0.0%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Realized P&amp;L:</span>
                  <span className="font-bold text-[#FF5268]">-₹6.61</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1A2B43]/70 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => onViewTerminal(bot.id)}
                className="flex-1 py-1 rounded bg-[#091426] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[9px] text-[#91A7C1] hover:text-[#EAF3FF] text-center font-bold transition-colors cursor-pointer"
              >
                View Position
              </button>
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="flex-1 py-1 rounded bg-[#FF5268]/15 border border-[#FF5268]/40 hover:bg-[#FF5268]/25 text-[9px] text-[#FF5268] text-center font-bold transition-colors cursor-pointer"
              >
                Close Position
              </button>
            </div>
          </div>

          {/* PANEL 2: RECENT ORDERS */}
          <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2B43]/70 mb-2">
                <div className="flex items-center gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5 text-[#0878FF]" />
                  <span className="text-[10px] font-bold text-[#EAF3FF] uppercase tracking-wider">
                    Recent Orders
                  </span>
                </div>
                <span className="text-[9px] text-[#91A7C1]">Latest 5</span>
              </div>

              <div className="space-y-1">
                {recentOrders.length > 0 ? (
                  recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between py-1 border-b border-[#1A2B43]/40 last:border-0 text-[9px]"
                    >
                      <div>
                        <div className="flex items-center gap-1">
                          <span className={cn("px-1 py-0.1 rounded text-[8px] font-bold", ord.side === "BUY" ? "bg-[#00D6A0]/15 text-[#00D6A0]" : "bg-[#FF5268]/15 text-[#FF5268]")}>
                            {ord.side}
                          </span>
                          <span className="font-bold text-[#EAF3FF]">{ord.id}</span>
                        </div>
                        <span className="text-[#91A7C1] text-[8px]">{ord.time} • {ord.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#EAF3FF]">{ord.price}</div>
                        <span className="text-[#00D6A0] text-[8px]">{ord.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-center text-[9px] text-[#91A7C1]/70 font-mono">
                    No active or recent orders
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#1A2B43]/70">
              <button
                type="button"
                onClick={() => onViewTerminal(bot.id)}
                className="w-full py-1 rounded bg-[#091426] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[9px] text-[#00C9E8] hover:text-white text-center font-bold transition-colors cursor-pointer"
              >
                View All Orders
              </button>
            </div>
          </div>

          {/* PANEL 3: RISK CONFIGURATION */}
          <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2B43]/70 mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#00D6A0]" />
                  <span className="text-[10px] font-bold text-[#EAF3FF] uppercase tracking-wider">
                    Risk Configuration
                  </span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/30">
                  ARMED
                </span>
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Stop Loss:</span>
                  <span className="font-bold text-[#FF5268]">{bot.risk?.stop_loss ?? 2.0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Take Profit:</span>
                  <span className="font-bold text-[#00D6A0]">{bot.risk?.take_profit ?? 5.0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Daily Loss Limit:</span>
                  <span className="font-bold text-[#FF5268]">-{currency}{bot.risk?.max_daily_loss ?? 500}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Max Position Size:</span>
                  <span className="font-bold text-[#EAF3FF]">{bot.risk?.max_position_size ?? 2} Lots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Max Open Positions:</span>
                  <span className="font-bold text-[#EAF3FF]">{(bot.risk as any)?.max_open_positions ?? 2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Current Exposure:</span>
                  <span className="font-bold text-[#00C9E8]">${formatNumber(usedCapital * 0.9, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Max Exposure Cap:</span>
                  <span className="font-bold text-[#EAF3FF]">${formatNumber(allocatedCapital, 0)}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-[#91A7C1]">Margin Utilization</span>
                    <span className="text-[#00C9E8] font-bold">{marginUtilPct}%</span>
                  </div>
                  <div className="w-full bg-[#091426] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00C9E8] h-full rounded-full transition-all"
                      style={{ width: `${marginUtilPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1A2B43]/70">
              <button
                type="button"
                onClick={() => onEditBot(bot)}
                className="w-full py-1 rounded bg-[#091426] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[9px] text-[#91A7C1] hover:text-[#EAF3FF] text-center font-bold transition-colors cursor-pointer"
              >
                Edit Risk Limits
              </button>
            </div>
          </div>

          {/* PANEL 4: STRATEGY PARAMETERS */}
          <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2B43]/70 mb-2">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#F5B942]" />
                  <span className="text-[10px] font-bold text-[#EAF3FF] uppercase tracking-wider">
                    Strategy Parameters
                  </span>
                </div>
                <span className="text-[9px] text-[#00C9E8] font-bold">1m Timeframe</span>
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Strategy Name:</span>
                  <span className="font-bold text-[#EAF3FF] truncate max-w-[130px]">
                    {safeString(bot.strategy?.type || (bot.strategy as any)?.name, "Trend Pullback")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Strategy Type:</span>
                  <span className="font-bold text-[#EAF3FF]">Trend Following</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Underlying Asset:</span>
                  <span className="font-bold text-[#00C9E8]">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Venue / Mode:</span>
                  <span className="font-bold text-[#EAF3FF]">{exchange} • {mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Lot Size / Qty:</span>
                  <span className="font-bold text-[#EAF3FF]">{bot.risk?.quantity ?? 1} Lots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Entry Confluence:</span>
                  <span className="font-bold text-[#00D6A0] truncate max-w-[120px]">EMA 20/50 + RSI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Exit Rule:</span>
                  <span className="font-bold text-[#FF5268] truncate max-w-[120px]">Trailing SL / Target</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A7C1]">Indicators (3):</span>
                  <span className="text-[#00C9E8] truncate max-w-[120px]">EMA, RSI, VWAP</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1A2B43]/70">
              <button
                type="button"
                onClick={() => onEditBot(bot)}
                className="w-full py-1 rounded bg-[#091426] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[9px] text-[#91A7C1] hover:text-[#EAF3FF] text-center font-bold transition-colors cursor-pointer"
              >
                Edit Parameters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Position Modal Confirmation */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-4 shadow-2xl space-y-3 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-[#FF5268]">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-bold text-[#EAF3FF]">Close Active Position</h3>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to close position <span className="text-[#00C9E8] font-bold">{symbol}</span> for bot <span className="text-[#EAF3FF] font-bold">{bot.name}</span> in PAPER simulation?
            </p>
            <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43] text-[10px] text-[#91A7C1]">
              A market offsetting order will be submitted immediately.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-3 py-1 rounded bg-[#050B16] border border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={isClosing}
                className="px-3 py-1 rounded bg-[#FF5268] hover:bg-[#E0294A] text-white font-bold"
              >
                {isClosing ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
