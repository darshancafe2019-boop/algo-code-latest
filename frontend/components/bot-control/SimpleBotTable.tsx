"use client";

import { formatMoney, formatNumber, formatPrice, formatQuantity, formatVolume } from "@/lib/formatters";
import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  Plus,
  Activity,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  Minus,
  Bot,
  Zap,
  ChevronDown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { BotRowItem, ExecutionBrokerId, BrokerStatusItem } from "@/types/bot-control";
export type { BotRowItem };

const BROKER_OPTIONS: { id: ExecutionBrokerId; label: string; defaultAccount: string }[] = [
  { id: "paper_simulator", label: "Paper Simulator", defaultAccount: "Paper-Simulator-01" },
  { id: "ccxt_binance", label: "Binance", defaultAccount: "Paper-Binance-01" },
  { id: "upstox", label: "Upstox", defaultAccount: "Upstox-Paper-01" },
  { id: "dhan_india", label: "Dhan", defaultAccount: "ba_dhan_primary" },
  { id: "delta_india", label: "Delta Exchange India", defaultAccount: "Delta-Paper-01" },
];

interface SimpleBotTableProps {
  bots: BotRowItem[];
  isLoading: boolean;
  onSelectBot: (bot: BotRowItem) => void;
  onBotAction: (botId: string, action: string) => Promise<void> | void;
  onToggleMode?: (botId: string, targetMode?: "LIVE" | "PAPER") => void;
  onSetBroker?: (botId: string, brokerId: string, accountId?: string) => Promise<void> | void;
  onOpenOrderDestination?: (bot: BotRowItem, side: "BUY" | "SELL") => void;
  onDeleteBot: (bot: BotRowItem) => void;
  onCreateBot: () => void;
  selectedMarket: string;
  selectedBotIds: string[];
  onToggleSelectBot: (botId: string) => void;
  onToggleSelectAll: () => void;
}

export function SimpleBotTable({
  bots,
  isLoading,
  onSelectBot,
  onBotAction,
  onToggleMode,
  onSetBroker,
  onOpenOrderDestination,
  onDeleteBot,
  onCreateBot,
  selectedMarket,
  selectedBotIds,
  onToggleSelectBot,
  onToggleSelectAll,
}: SimpleBotTableProps) {
  const [loadingActionBotId, setLoadingActionBotId] = useState<string | null>(null);
  const [togglingModeBotId, setTogglingModeBotId] = useState<string | null>(null);
  const [activeMenuBotId, setActiveMenuBotId] = useState<string | null>(null);
  const [activeBrokerDropdownBotId, setActiveBrokerDropdownBotId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const brokerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuBotId(null);
      }
      if (brokerDropdownRef.current && !brokerDropdownRef.current.contains(event.target as Node)) {
        setActiveBrokerDropdownBotId(null);
      }
    }
    if (activeMenuBotId || activeBrokerDropdownBotId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuBotId, activeBrokerDropdownBotId]);

  const handleAction = async (e: React.MouseEvent, botId: string, action: string) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    setLoadingActionBotId(botId);
    try {
      await onBotAction(botId, action);
    } finally {
      setLoadingActionBotId(null);
    }
  };

  const handleToggleModeClick = async (e: React.MouseEvent, botId: string, currentMode: string) => {
    e.stopPropagation();
    if (!onToggleMode) return;
    const targetMode = (currentMode || "").toUpperCase() === "LIVE" ? "PAPER" : "LIVE";
    setTogglingModeBotId(botId);
    try {
      await onToggleMode(botId, targetMode);
    } finally {
      setTogglingModeBotId(null);
    }
  };

  const handleBrokerSelect = async (e: React.MouseEvent, botId: string, brokerId: string, defAccount: string) => {
    e.stopPropagation();
    setActiveBrokerDropdownBotId(null);
    if (onSetBroker) {
      await onSetBroker(botId, brokerId, defAccount);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, bot: BotRowItem) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    onDeleteBot(bot);
  };

  const handleDetailsClick = (e: React.MouseEvent, bot: BotRowItem) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    onSelectBot(bot);
  };

  const handleQuickTradeClick = (e: React.MouseEvent, bot: BotRowItem, side: "BUY" | "SELL") => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    if (onOpenOrderDestination) {
      onOpenOrderDestination(bot, side);
    }
  };

  const allFilteredSelected =
    bots.length > 0 && bots.every((b) => selectedBotIds.includes(b.id));
  const someFilteredSelected =
    bots.some((b) => selectedBotIds.includes(b.id)) && !allFilteredSelected;

  if (isLoading && bots.length === 0) {
    return (
      <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-12 text-center text-[#7D8EA5] font-mono text-xs space-y-3">
        <div className="w-7 h-7 rounded-full border-2 border-[#168BFF] border-t-transparent animate-spin mx-auto" />
        <p>Synchronizing fleet engine telemetry...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-12 text-center font-mono text-xs space-y-3">
        <div className="p-3 rounded-lg bg-[#05101A] border border-[#12304A] w-fit mx-auto text-[#7D8EA5]">
          <Bot className="w-6 h-6" />
        </div>
        <p className="text-[#7D8EA5] font-sans text-xs max-w-md mx-auto">
          No {marketLabel}bots match your current filter. Create an automated trading bot to deploy strategies.
        </p>
        <button
          onClick={onCreateBot}
          className="px-3.5 py-1.5 rounded-lg bg-[#168BFF] hover:bg-[#168BFF]/85 text-[#F8FAFC] font-semibold text-[11px] transition inline-flex items-center gap-1.5 shadow-xs font-sans cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create a Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] overflow-hidden font-sans select-none text-[11px]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#08101A] text-[#7D8EA5] border-b border-[#10263A] text-[10px] font-medium uppercase h-[32px] select-none">
            <tr>
              {/* Checkbox Column */}
              <th className="py-2 px-3 w-8 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition mx-auto cursor-pointer ${
                    allFilteredSelected
                      ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                      : someFilteredSelected
                      ? "bg-[#168BFF]/20 border-[#168BFF] text-[#22D3EE]"
                      : "border-[#12304A] bg-[#05101A] hover:border-[#168BFF]/40 text-transparent"
                  }`}
                  title={allFilteredSelected ? "Deselect All" : "Select All"}
                >
                  {allFilteredSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  {someFilteredSelected && <Minus className="w-2.5 h-2.5 stroke-[3]" />}
                </button>
              </th>
              <th className="py-2 px-3 font-semibold">BOT INSTANCE</th>
              <th className="py-2 px-3 font-semibold">MARKET & TF</th>
              <th className="py-2 px-3 font-semibold">MARKET DATA SOURCE</th>
              <th className="py-2 px-3 font-semibold">EXECUTION BROKER</th>
              <th className="py-2 px-3 font-semibold">ACCOUNT & ENV</th>
              <th className="py-2 px-3 font-semibold">LIFECYCLE STATUS</th>
              <th className="py-2 px-3 font-semibold">ACTIVE POSITION</th>
              <th className="py-2 px-3 font-semibold text-right">TODAY P&L</th>
              <th className="py-2 px-3 font-semibold text-center">HEALTH</th>
              <th className="py-2 px-3 font-semibold text-right w-24">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A] font-sans">
            {bots.map((bot) => {
              const state = (bot.status || bot.state || "STOPPED").toUpperCase();
              const isRunning = state === "RUNNING";
              const isPaused = state === "PAUSED";
              const isStopped = state === "STOPPED" || state === "DRAFT";
              const isError = state === "ERROR";
              const isRecovering = state === "RECOVERING";
              const isLive = (bot.execution_mode || "").toUpperCase() === "LIVE";
              const isTogglingMode = togglingModeBotId === bot.id;

              const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
              const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
              const isPnlPositive = pnl >= 0;

              const isActionLoading = loadingActionBotId === bot.id;
              const isSelected = selectedBotIds.includes(bot.id);
              const isMenuOpen = activeMenuBotId === bot.id;
              const isBrokerDropdownOpen = activeBrokerDropdownBotId === bot.id;

              const mktSource = bot.market_data_source || "Binance Official API";
              const execBroker = bot.execution_broker || "Paper Simulator";
              const brokerAcc = bot.broker_account_id || bot.broker_account_alias || "Paper-Account-01";
              const feedStatus = bot.feed_status || "LIVE";
              const isFeedLive = feedStatus === "LIVE";
              const isFeedUnconfigured = feedStatus === "NOT CONFIGURED";
              const latencyDisplay = bot.latency_ms ? `${bot.latency_ms.toFixed(0)}ms` : "14ms";

              return (
                <tr
                  key={bot.bot_uid || bot.id}
                  onClick={() => onSelectBot(bot)}
                  className={`transition-colors h-[54px] cursor-pointer group ${
                    isSelected
                      ? "bg-[#168BFF]/10 hover:bg-[#168BFF]/15"
                      : "hover:bg-[#0F1C2F]"
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-2 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectBot(bot.id);
                    }}
                  >
                    <button
                      type="button"
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition mx-auto cursor-pointer ${
                        isSelected
                          ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                          : "border-[#12304A] bg-[#05101A] group-hover:border-[#168BFF]/40 text-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                  </td>

                  {/* 1. BOT INSTANCE */}
                  <td className="py-2 px-3 font-sans">
                    <div className="font-bold text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors text-[11px] flex items-center gap-1.5">
                      <span>{bot.name}</span>
                    </div>
                    <div className="text-[10px] text-[#7D8EA5] font-mono truncate max-w-xs mt-0.5">
                      ID: {bot.id} • {bot.strategy}
                    </div>
                  </td>

                  {/* 2. MARKET & TF */}
                  <td className="py-2 px-3 font-mono">
                    <div className="font-bold text-[#F8FAFC] text-[11px]">{bot.symbol}</div>
                    <div className="text-[10px] text-[#7D8EA5] font-sans">
                      {bot.timeframe} • {bot.asset_class || "CRYPTO"}
                    </div>
                  </td>

                  {/* 3. MARKET DATA SOURCE */}
                  <td className="py-2 px-3 font-sans">
                    <div className="text-[11px] font-medium text-[#F8FAFC] flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-[#22D3EE]" />
                      <span>{mktSource}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-semibold font-mono border ${
                          isFeedLive
                            ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                            : isFeedUnconfigured
                            ? "bg-[#05101A] text-[#7D8EA5] border-[#12304A]"
                            : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                        }`}
                      >
                        {isFeedLive ? `LIVE ${latencyDisplay}` : feedStatus}
                      </span>
                      <span className="text-[9px] text-[#7D8EA5]">
                        {bot.exchange || "BINANCE"}
                      </span>
                    </div>
                  </td>

                  {/* 4. EXECUTION BROKER (Interactive Dropdown Selector) */}
                  <td className="py-2 px-3 font-sans relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBrokerDropdownBotId(isBrokerDropdownOpen ? null : bot.id);
                        setActiveMenuBotId(null);
                      }}
                      className="px-2 py-1 rounded-md bg-[#05101A] hover:bg-[#0F1C2F] border border-[#12304A] hover:border-[#168BFF]/40 text-[#F8FAFC] font-medium text-[10px] transition-colors flex items-center justify-between gap-1.5 shadow-xs max-w-[150px] cursor-pointer"
                    >
                      <span className="truncate">{execBroker}</span>
                      <ChevronDown className="w-3 h-3 shrink-0 text-[#7D8EA5]" />
                    </button>

                    {/* Broker Selector Dropdown Popup */}
                    {isBrokerDropdownOpen && (
                      <div
                        ref={brokerDropdownRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-3 top-full mt-1 z-40 w-48 bg-[#0A1422] border border-[#12304A] rounded-lg shadow-2xl overflow-hidden py-1 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono font-bold text-[#7D8EA5] uppercase border-b border-[#10263A]">
                          Select Execution Broker
                        </div>
                        {BROKER_OPTIONS.map((opt) => {
                          const isCurrent = (bot.execution_broker_id || "").toLowerCase() === opt.id || execBroker.toLowerCase().includes(opt.label.toLowerCase());
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => handleBrokerSelect(e, bot.id, opt.id, opt.defaultAccount)}
                              className={`w-full px-3 py-1.5 text-left font-sans text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                                isCurrent
                                  ? "bg-[#168BFF]/15 text-[#22D3EE] font-semibold"
                                  : "hover:bg-[#0F1C2F] text-[#F8FAFC]"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isCurrent && <Check className="w-3 h-3 text-[#22D3EE]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* 5. ACCOUNT & ENV */}
                  <td className="py-2 px-3 font-mono">
                    <div className="font-semibold text-[#F8FAFC] text-[10px] truncate max-w-[120px]">
                      {brokerAcc}
                    </div>
                    <div className="mt-0.5">
                      <button
                        onClick={(e) => handleToggleModeClick(e, bot.id, bot.execution_mode)}
                        disabled={isTogglingMode}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border cursor-pointer transition-colors ${
                          isLive
                            ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/40 hover:bg-[#FF3B5C]/25"
                            : "bg-[#168BFF]/15 text-[#22D3EE] border-[#168BFF]/30 hover:bg-[#168BFF]/25"
                        }`}
                        title={isLive ? "LIVE mode active. Click to switch to PAPER." : "PAPER simulation. Click to toggle."}
                      >
                        <span className={`w-1 h-1 rounded-full ${isLive ? "bg-[#FF3B5C] animate-pulse" : "bg-[#22D3EE]"}`} />
                        <span>{isTogglingMode ? "..." : isLive ? "LIVE" : "PAPER"}</span>
                      </button>
                    </div>
                  </td>

                  {/* 6. STATUS */}
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                        isRunning
                          ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                          : isPaused
                          ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                          : isError
                          ? "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20"
                          : isRecovering
                          ? "bg-[#168BFF]/10 text-[#22D3EE] border-[#168BFF]/20"
                          : "bg-[#05101A] text-[#7D8EA5] border-[#12304A]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isRunning
                            ? "bg-[#00E89A] animate-pulse"
                            : isPaused
                            ? "bg-[#F59E0B]"
                            : isError
                            ? "bg-[#FF3B5C]"
                            : "bg-[#7D8EA5]"
                        }`}
                      />
                      <span>{state}</span>
                    </span>
                  </td>

                  {/* 7. POSITION */}
                  <td className="py-2 px-3 font-mono">
                    {pos.has_position ? (
                      <div>
                        <span
                          className={`font-bold text-[11px] ${
                            pos.direction === "LONG" ? "text-[#00E89A]" : "text-[#FF3B5C]"
                          }`}
                        >
                          {pos.direction} {pos.size}
                        </span>
                        <div className="text-[10px] text-[#7D8EA5]">
                          @ {formatMoney(pos.entry_price, "$")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#7D8EA5] font-sans text-[11px]">FLAT</span>
                    )}
                  </td>

                  {/* 8. TODAY P&L */}
                  <td className="py-2 px-3 text-right font-mono">
                    <div
                      className={`font-bold text-[11px] tabular-nums ${
                        isPnlPositive ? "text-[#00E89A]" : "text-[#FF3B5C]"
                      }`}
                    >
                      {isPnlPositive ? "+" : ""}{formatMoney(Math.abs(pnl), "$")}
                    </div>
                    <div className="text-[10px] text-[#7D8EA5] font-sans">
                      Cap: ${(bot.allocated_capital / 1000).toFixed(1)}K
                    </div>
                  </td>

                  {/* 9. HEALTH */}
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                        bot.health === "HEALTHY"
                          ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                          : bot.health === "ERROR"
                          ? "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20"
                          : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                      }`}
                    >
                      {bot.health || "HEALTHY"}
                    </span>
                  </td>

                  {/* 10. ACTIONS (Quick Trade Destination Button + Consolidated Menu) */}
                  <td className="py-2 px-3 text-right relative">
                    <div className="inline-flex items-center justify-end gap-1.5 relative">
                      {/* Order Destination Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickTradeClick(e, bot, "BUY")}
                        className="px-2 py-1 rounded-md bg-[#00E89A]/15 hover:bg-[#00E89A]/25 text-[#00E89A] border border-[#00E89A]/30 font-semibold text-[10px] transition-colors font-mono flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Open Order Destination & Send Trade"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Trade</span>
                      </button>

                      {/* Kebab Menu Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuBotId(isMenuOpen ? null : bot.id);
                          setActiveBrokerDropdownBotId(null);
                        }}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-md border transition-colors flex items-center justify-center cursor-pointer ${
                          isMenuOpen
                            ? "bg-[#168BFF]/20 border-[#168BFF] text-[#22D3EE] shadow-xs"
                            : "bg-[#05101A] border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] hover:border-[#168BFF]/40"
                        } disabled:opacity-50`}
                        title="Bot Actions"
                      >
                        {isActionLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#168BFF] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Dropdown Menu Popup */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-40 w-40 bg-[#0A1422] border border-[#12304A] rounded-lg shadow-2xl overflow-hidden py-1 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                        >
                          {/* Contextual Execution Controls */}
                          {isStopped && (
                            <button
                              type="button"
                              onClick={(e) => handleAction(e, bot.id, "START")}
                              className="w-full px-3 py-1.5 text-[#00E89A] hover:bg-[#00E89A]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Bot</span>
                            </button>
                          )}

                          {isRunning && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                                className="w-full px-3 py-1.5 text-[#F59E0B] hover:bg-[#F59E0B]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3 py-1.5 text-[#FF3B5C] hover:bg-[#FF3B5C]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Bot</span>
                              </button>
                            </>
                          )}

                          {isPaused && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "RESUME")}
                                className="w-full px-3 py-1.5 text-[#22D3EE] hover:bg-[#168BFF]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Resume Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3 py-1.5 text-[#FF3B5C] hover:bg-[#FF3B5C]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Bot</span>
                              </button>
                            </>
                          )}

                          {isError && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleDetailsClick(e, bot)}
                                className="w-full px-3 py-1.5 text-[#FF3B5C] hover:bg-[#FF3B5C]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Review Incident</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "START")}
                                className="w-full px-3 py-1.5 text-[#22D3EE] hover:bg-[#168BFF]/15 flex items-center gap-2 font-semibold transition-colors font-mono cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Retry / Start</span>
                              </button>
                            </>
                          )}

                          {/* View Details Option */}
                          <button
                            type="button"
                            onClick={(e) => handleDetailsClick(e, bot)}
                            className="w-full px-3 py-1.5 text-[#7D8EA5] hover:bg-[#0F1C2F] hover:text-[#F8FAFC] flex items-center gap-2 font-medium transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#7D8EA5]" />
                            <span>View Details</span>
                          </button>

                          {/* Divider */}
                          <div className="h-px bg-[#10263A] my-1" />

                          {/* Delete / Force Delete Option */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, bot)}
                            className="w-full px-3 py-1.5 flex items-center gap-2 font-semibold transition-colors text-[#FF3B5C] hover:bg-[#FF3B5C]/20 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#FF3B5C]" />
                            <span>{isError || isRecovering ? "Force Delete" : "Delete Bot"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
