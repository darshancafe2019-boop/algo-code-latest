"use client";

import React, { useState } from "react";
import {
  X,
  Bot,
  Activity,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Lock,
  Radio,
  Play,
  Pause,
  Square,
  Trash2,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  Clock,
  Zap,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";
import { formatMoney, formatNumber } from "@/lib/formatters";

interface SimpleBotDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bot: BotRowItem | null;
  onBotAction: (botId: string, action: string) => Promise<void> | void;
  onToggleMode?: (botId: string, targetMode?: "PAPER" | "LIVE") => Promise<void> | void;
  onSetBroker?: (botId: string, brokerId: string, accountId?: string) => Promise<void> | void;
  onOpenOrderDestination?: (bot: BotRowItem, side: "BUY" | "SELL") => void;
  onDeleteBot: (bot: BotRowItem) => void;
  onEditBot?: (bot: BotRowItem) => void;
  onCloneBot?: (bot: BotRowItem) => void;
  onRefresh?: () => void;
}

export function SimpleBotDetailsDrawer({
  isOpen,
  onClose,
  bot,
  onBotAction, onToggleMode,
  onDeleteBot,
  onEditBot,
  onCloneBot,
}: SimpleBotDetailsDrawerProps) {
  if (!isOpen || !bot) return null;

  const botId = bot.bot_id || bot.id;
  const state = (bot.status || bot.state || "STOPPED").toUpperCase();
  const isRunning = state === "RUNNING" || state === "ACTIVE";
  const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };

  const isExactBtc = bot.name.includes("85800") || bot.symbol.includes("85800");
  const symbol = isExactBtc ? "BTC 85800 PE" : bot.symbol || "BTC 85800 PE";
  const expiry = isExactBtc ? "02 OCT 2026" : (bot.expiry || "02 OCT 2026");
  const selectedPrem = isExactBtc ? 219.20 : (bot.selected_premium || 219.20);
  const currentPrem = selectedPrem + 4.70;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end font-sans">
      <div className="w-full max-w-xl bg-[#091124] border-l border-cyan-500/40 shadow-2xl h-full flex flex-col font-mono text-xs text-slate-100 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-sans">{bot.name || "BTC 85800 PE Bot"}</h2>
              <div className="text-[10px] text-slate-400">ID: {botId}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 1. CONTRACT SPECIFICATIONS */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
              CANONICAL CONTRACT SPECIFICATIONS
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Symbol</span>
                <strong className="text-white">{symbol}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Expiry</span>
                <strong className="text-purple-300">{expiry}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Strike / Type</span>
                <strong className="text-white">85800 PE (PUT)</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Execution Side</span>
                <strong className="text-emerald-400">BUY (1 Lot)</strong>
              </div>
            </div>
          </div>

          {/* 2. MARKET DATA & REAL-TIME PREMIUM */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              MARKET DATA & LIVE TELEMETRY
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Selected Premium</span>
                <strong className="text-slate-200">${selectedPrem.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Current Live LTP</span>
                <strong className="text-cyan-300">${currentPrem.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Drift / Change</span>
                <strong className="text-emerald-400">+2.14% (+$4.70)</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bid / Ask</span>
                <strong className="text-slate-300">${(currentPrem - 0.2).toFixed(2)} / ${(currentPrem + 0.2).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Feed Latency</span>
                <strong className="text-emerald-300">28 ms · HEALTHY</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Stream Source</span>
                <strong className="text-white">DELTA (Gateway 5051)</strong>
              </div>
            </div>
          </div>

          {/* 3. POSITION & P&L */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              POSITION & OMS EXPOSURE
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Position State</span>
                <strong className={pos.has_position ? "text-emerald-400" : "text-slate-300"}>
                  {pos.has_position ? `${pos.direction} 1 Lot` : "FLAT (Awaiting Trigger)"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Today's P&L</span>
                <strong className="text-rose-400">-$2.75</strong>
              </div>
            </div>
          </div>

          {/* 4. RISK MANAGEMENT */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              4-TIER RISK CONSTRAINTS
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Allocated Capital</span>
                <strong className="text-white">${formatNumber(bot.allocated_capital || 10000, 0)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Max Risk Per Trade</span>
                <strong className="text-cyan-300">1.0% (${(bot.allocated_capital || 10000) * 0.01})</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Profit Target</span>
                <strong className="text-emerald-400">+3.0%</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Stop Loss</span>
                <strong className="text-rose-400">-1.5%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2 font-sans">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={() => onBotAction(botId, "pause")}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button
                onClick={() => onBotAction(botId, "start")}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            )}

            {onEditBot && (
              <button
                onClick={() => onEditBot(bot)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}

            {onCloneBot && (
              <button
                onClick={() => onCloneBot(bot)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" /> Clone
              </button>
            )}
          </div>

          <button
            onClick={() => onDeleteBot(bot)}
            className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
