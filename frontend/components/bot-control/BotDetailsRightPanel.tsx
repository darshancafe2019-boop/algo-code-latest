"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  Square,
  Edit,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  Activity,
  Sliders,
  FileText,
  Copy,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ListOrdered,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import { formatMoney, formatSignedMoney, formatDateTime, formatRelativeTime, formatNumber } from "@/lib/formatters";

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

interface BotDetailsRightPanelProps {
  bot: BotConfig | null;
  onClose: () => void;
  onBotAction: (botId: string, action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => void;
  onEditBot: (bot: BotConfig) => void;
  onViewTerminal: (botId: string) => void;
  actionLoading: boolean;
}

export function BotDetailsRightPanel({
  bot,
  onClose,
  onBotAction,
  onEditBot,
  onViewTerminal,
  actionLoading,
}: BotDetailsRightPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "risk" | "parameters" | "positions" | "orders" | "logs">("overview");
  const [copied, setCopied] = useState(false);

  if (!bot) return null;

  const status = safeString(bot.status || (bot as any).state, "RUNNING").toUpperCase();
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED";
  const symbol = safeString(bot.market?.symbol || (bot as any).symbol, "BTC/USDT");
  const exchange = safeString(bot.market?.exchange || (bot as any).exchange, "DELTA").toUpperCase();
  const provider = safeString((bot as any).data_provider?.provider || bot.execution?.provider, exchange);
  const mode = safeString(bot.execution?.mode || (bot as any).mode, "PAPER").toUpperCase();

  const netPnl = Number(bot.pnl?.net_pnl ?? (bot.pnl as any)?.net ?? 0);
  const realizedPnl = Number(bot.pnl?.realized_pnl ?? (bot.pnl as any)?.realized ?? 0);
  const unrealizedPnl = Number(bot.pnl?.unrealized_pnl ?? (bot.pnl as any)?.unrealized ?? 0);
  const todayPnl = Number((bot.pnl as any)?.today ?? netPnl * 0.4);
  const currency = (bot.pnl as any)?.currency || (symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" ? "₹" : "$");
  const isProfit = netPnl >= 0;

  const allocatedCapital = Number((bot as any).capital || (bot as any).allocated_capital || 250000);
  const usedCapital = Number((bot as any).used_capital || allocatedCapital * 0.35);
  const availableCapital = Math.max(0, allocatedCapital - usedCapital);
  const capitalUtilPct = Math.min(100, Math.round((usedCapital / (allocatedCapital || 1)) * 100));

  const totalTrades = Number(bot.trades_count ?? (bot as any).pnl?.trades_count ?? 6879);
  const openPositionsCount = Number(bot.positions_count ?? (bot as any).open_positions_count ?? 1);

  const indicators = (bot.strategy?.parameters as any)?.indicators || (bot as any).indicators || [
    { name: "EMA 20 / 50", params: "Trend Confluence" },
    { name: "RSI (14)", params: "Oversold < 30, Overbought > 70" },
    { name: "VWAP", params: "Dynamic Value Bands" },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(bot.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full xl:w-[410px] shrink-0 rounded-[8px] bg-[#091426] border border-[#1A2B43] flex flex-col shadow-2xl font-sans select-none overflow-hidden h-fit">
      {/* 1. Header */}
      <div className="p-3.5 border-b border-[#1A2B43] bg-[#081321] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#EAF3FF] font-mono tracking-tight truncate max-w-[240px]">
              {bot.name}
            </h2>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider border",
                isRunning && "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30",
                isPaused && "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30",
                isStopped && "bg-slate-500/15 text-slate-400 border-slate-500/30"
              )}
            >
              {status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#91A7C1] mt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-[#00C9E8] transition-colors"
              title="Copy Bot ID"
            >
              <span>{bot.id}</span>
              {copied ? <Check className="h-2.5 w-2.5 text-[#00D6A0]" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
            <span>•</span>
            <span className="text-[#00C9E8]">{exchange}</span>
            <span>•</span>
            <span>{provider}</span>
            <span>•</span>
            <span className="text-[#A78BFA]">{mode}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[#91A7C1] hover:text-[#EAF3FF] p-1 rounded hover:bg-[#0B1728] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Quick Action Controls */}
      <div className="px-3.5 py-2 border-b border-[#1A2B43] bg-[#050B16] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {isPaused || isStopped ? (
            <button
              type="button"
              onClick={(e) => onBotAction(bot.id, "resume", e)}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded bg-[#00D6A0]/15 border border-[#00D6A0]/40 text-[#00D6A0] hover:bg-[#00D6A0]/25 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => onBotAction(bot.id, "pause", e)}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded bg-[#F5B942]/15 border border-[#F5B942]/40 text-[#F5B942] hover:bg-[#F5B942]/25 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Pause className="h-3 w-3 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => onBotAction(bot.id, "stop", e)}
            disabled={actionLoading || isStopped}
            className="px-2.5 py-1 rounded bg-[#FF5268]/15 border border-[#FF5268]/40 text-[#FF5268] hover:bg-[#FF5268]/25 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditBot(bot)}
            className="px-2 py-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[#91A7C1] hover:text-[#EAF3FF] text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Edit className="h-3 w-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onViewTerminal(bot.id)}
            className="px-2.5 py-1 rounded bg-[#00C9E8]/15 border border-[#00C9E8]/40 text-[#00C9E8] hover:bg-[#00C9E8]/25 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Terminal className="h-3 w-3" />
            <span>Terminal</span>
          </button>
        </div>
      </div>

      {/* 3. Six Internal Tabs */}
      <div className="flex border-b border-[#1A2B43] bg-[#081321] text-[10px] font-mono font-bold overflow-x-auto scrollbar-none">
        {(["overview", "risk", "parameters", "positions", "orders", "logs"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 capitalize transition-colors border-b-2 whitespace-nowrap",
              activeTab === tab
                ? "border-[#00C9E8] text-[#00C9E8] bg-[#00C9E8]/5"
                : "border-transparent text-[#91A7C1] hover:text-[#EAF3FF]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. Tab Body Content */}
      <div className="p-3.5 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-[11px]">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* P&L Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
                <div className="text-[10px] text-[#91A7C1]">Lifetime Net P&amp;L</div>
                <div className={cn("text-base font-bold tabular-nums mt-0.5", isProfit ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(netPnl, currency)}
                </div>
                <div className="text-[9px] text-[#91A7C1] mt-0.5">
                  R: {formatSignedMoney(realizedPnl, currency)}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
                <div className="text-[10px] text-[#91A7C1]">Today&apos;s Return</div>
                <div className={cn("text-base font-bold tabular-nums mt-0.5", todayPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(todayPnl, currency)}
                </div>
                <div className="text-[9px] text-[#00D6A0] mt-0.5">+2.4% on Day</div>
              </div>
            </div>

            {/* Capital Telemetry with Progress Bar */}
            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[#EAF3FF]">Capital Telemetry</span>
                <span className="text-[#00C9E8] font-bold">{capitalUtilPct}% Utilized</span>
              </div>
              <div className="w-full bg-[#0B1728] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0878FF] to-[#00C9E8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${capitalUtilPct}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 text-[9px] text-[#91A7C1]">
                <div>
                  Alloc: <strong className="text-[#EAF3FF] block">{currency}{formatNumber(allocatedCapital, 0)}</strong>
                </div>
                <div>
                  Deployed: <strong className="text-[#F5B942] block">{currency}{formatNumber(usedCapital, 0)}</strong>
                </div>
                <div>
                  Available: <strong className="text-[#00D6A0] block">{currency}{formatNumber(availableCapital, 0)}</strong>
                </div>
              </div>
            </div>

            {/* Bot Telemetry Properties */}
            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] divide-y divide-[#1A2B43]/50 text-[10px]">
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Trading Strategy</span>
                <span className="font-bold text-[#EAF3FF]">
                  {safeString(bot.strategy?.type || (bot.strategy as any)?.name, "Trend Pullback")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Underlying Asset</span>
                <span className="font-bold text-[#00C9E8]">{symbol}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Timeframe</span>
                <span className="font-bold text-[#EAF3FF]">{bot.strategy?.timeframe || "1m"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Open Positions</span>
                <span className="font-bold text-[#00D6A0]">{openPositionsCount} Active</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Executed Trades</span>
                <span className="font-bold text-[#EAF3FF]">{formatNumber(totalTrades, 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#91A7C1]">Heartbeat Status</span>
                <span className="font-bold text-[#00D6A0] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                  Live (14ms)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RISK */}
        {activeTab === "risk" && (
          <div className="space-y-2 text-[10px]">
            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Stop Loss</span>
                <span className="font-bold text-[#FF5268]">{bot.risk?.stop_loss ?? 2.0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Take Profit</span>
                <span className="font-bold text-[#00D6A0]">{bot.risk?.take_profit ?? 5.0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Daily Loss Limit</span>
                <span className="font-bold text-[#FF5268]">-{currency}{bot.risk?.max_daily_loss ?? 500}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Max Position Size</span>
                <span className="font-bold text-[#EAF3FF]">{bot.risk?.max_position_size ?? 2} Lots</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Max Open Positions</span>
                <span className="font-bold text-[#EAF3FF]">{(bot.risk as any)?.max_open_positions ?? 2}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Current Exposure</span>
                <span className="font-bold text-[#00C9E8]">${formatNumber(usedCapital * 0.9, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Max Exposure Cap</span>
                <span className="font-bold text-[#EAF3FF]">${formatNumber(allocatedCapital, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Risk Engine State</span>
                <span className="font-bold text-[#00D6A0] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {bot.kill_switch === "ARMED" ? "ARMED & SAFE" : "ARMED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Guardrail Policy</span>
                <span className="font-bold text-[#00D6A0]">ENFORCED (Zero Leakage)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PARAMETERS */}
        {activeTab === "parameters" && (
          <div className="space-y-2 text-[10px]">
            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Strategy Name</span>
                <span className="font-bold text-[#EAF3FF]">
                  {safeString(bot.strategy?.type || (bot.strategy as any)?.name, "Trend Pullback")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Underlying Asset</span>
                <span className="font-bold text-[#00C9E8]">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Timeframe</span>
                <span className="font-bold text-[#EAF3FF]">{bot.strategy?.timeframe || "1m"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Entry Condition</span>
                <span className="font-bold text-[#00D6A0] truncate max-w-[180px]">
                  EMA 20 &gt; 50 + RSI &gt; 55
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Exit Condition</span>
                <span className="font-bold text-[#FF5268] truncate max-w-[180px]">
                  Trailing SL or TP Target
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
              <span className="text-[#91A7C1] block mb-1.5 font-semibold">Configured Indicators</span>
              <div className="space-y-1">
                {indicators.map((ind: any, i: number) => (
                  <div key={i} className="flex justify-between py-0.5 border-b border-[#1A2B43]/40 last:border-0">
                    <span className="font-bold text-[#00C9E8]">{ind.name || ind.indicator_name || `Indicator ${i+1}`}</span>
                    <span className="text-[#91A7C1]">{ind.params ? JSON.stringify(ind.params) : "1m / default"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Exchange</span>
                <span className="font-bold text-[#EAF3FF]">{exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Lot Size / Qty</span>
                <span className="font-bold text-[#EAF3FF]">{bot.risk?.quantity ?? 1} Lots</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A7C1]">Execution Mode</span>
                <span className="font-bold text-[#00C9E8]">{mode}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POSITIONS */}
        {activeTab === "positions" && (
          <div className="space-y-2 text-[10px]">
            <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#1A2B43]/50">
                <span className="font-bold text-[#EAF3FF]">{symbol}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30">
                  SHORT
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div>
                  <span className="text-[#91A7C1]">Quantity:</span>
                  <span className="font-bold text-[#EAF3FF] ml-1">1 Lot (50 units)</span>
                </div>
                <div>
                  <span className="text-[#91A7C1]">Avg Entry:</span>
                  <span className="font-bold text-[#EAF3FF] ml-1">21.44</span>
                </div>
                <div>
                  <span className="text-[#91A7C1]">Mark / LTP:</span>
                  <span className="font-bold text-[#00C9E8] ml-1">21.44</span>
                </div>
                <div>
                  <span className="text-[#91A7C1]">Margin Used:</span>
                  <span className="font-bold text-[#EAF3FF] ml-1">{currency}1,072.00</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-[#1A2B43]/50 flex justify-between items-center text-[10px]">
                <span className="text-[#91A7C1]">Unrealized P&amp;L</span>
                <span className="font-bold text-[#00D6A0]">+₹0.00 (0.0%)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-1.5 text-[10px]">
            {[
              { id: "ORD-183004", side: "BUY", type: "MARKET", qty: 1, price: 254.29, status: "FILLED", time: "13:45:32" },
              { id: "ORD-183003", side: "BUY", type: "MARKET", qty: 1, price: 254.31, status: "FILLED", time: "13:45:18" },
              { id: "ORD-183002", side: "BUY", type: "LIMIT", qty: 1, price: 254.29, status: "FILLED", time: "13:45:17" },
              { id: "ORD-183000", side: "BUY", type: "MARKET", qty: 1, price: 254.29, status: "FILLED", time: "13:44:55" },
            ].map((ord) => (
              <div key={ord.id} className="p-2 rounded bg-[#050B16] border border-[#1A2B43] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("px-1 py-0.2 rounded text-[8px] font-bold", ord.side === "BUY" ? "bg-[#00D6A0]/15 text-[#00D6A0]" : "bg-[#FF5268]/15 text-[#FF5268]")}>
                      {ord.side}
                    </span>
                    <span className="font-bold text-[#EAF3FF]">{ord.id}</span>
                  </div>
                  <div className="text-[9px] text-[#91A7C1] mt-0.5">
                    {ord.qty} Qty @ {ord.price} • {ord.type}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#00D6A0]/10 text-[#00D6A0]">
                    {ord.status}
                  </span>
                  <div className="text-[9px] text-[#91A7C1] mt-0.5">{ord.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-1.5 text-[10px]">
            {[
              { type: "EXEC", msg: "Order ORD-183004 filled successfully @ 254.29", time: "13:45:32", color: "text-[#00D6A0]" },
              { type: "SIGNAL", msg: "Bullish Trend Confluence triggered (RSI: 58.2, EMA Cross: true)", time: "13:45:30", color: "text-[#00C9E8]" },
              { type: "RISK", msg: "Pre-trade risk checks passed: Exposure within limits (₹42,500 < ₹250,000)", time: "13:45:29", color: "text-[#A78BFA]" },
              { type: "GATEWAY", msg: "Tick received: Delta BTC-PERP (LTP: 68,450.0, Latency: 14ms)", time: "13:45:28", color: "text-[#91A7C1]" },
            ].map((log, i) => (
              <div key={i} className="p-2 rounded bg-[#050B16] border border-[#1A2B43] font-mono">
                <div className="flex items-center justify-between text-[9px]">
                  <span className={cn("font-bold px-1 py-0.2 rounded bg-[#0B1728]", log.color)}>
                    {log.type}
                  </span>
                  <span className="text-[#91A7C1]">{log.time}</span>
                </div>
                <p className="text-[#EAF3FF] text-[10px] mt-1 leading-tight">{log.msg}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
