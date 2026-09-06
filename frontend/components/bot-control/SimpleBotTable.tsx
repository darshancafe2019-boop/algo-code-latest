"use client";

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
      <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-12 text-center text-[var(--theme-text-muted)] font-mono text-xs shadow-xl space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--theme-accent)] border-t-transparent animate-spin mx-auto" />
        <p>Synchronizing fleet engine telemetry...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-12 text-center font-mono text-xs shadow-xl space-y-4">
        <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)] w-fit mx-auto text-[var(--theme-text-muted)]">
          <Bot className="w-8 h-8" />
        </div>
        <p className="text-[var(--theme-text-secondary)] font-sans text-sm max-w-md mx-auto">
          No {marketLabel}bots match your current filter. Create a new automated trading bot to deploy strategies.
        </p>
        <button
          onClick={onCreateBot}
          className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-extrabold text-xs transition inline-flex items-center gap-1.5 shadow-lg shadow-[var(--theme-accent)]/20 font-mono"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Create a Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl overflow-visible backdrop-blur-md shadow-xl font-sans select-none text-xs">
      <div className="overflow-x-auto rounded-3xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] border-b border-[var(--theme-border-subtle)] text-[11px] font-mono select-none">
            <tr>
              {/* Checkbox Column */}
              <th className="py-3.5 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition mx-auto ${
                    allFilteredSelected
                      ? "bg-[var(--theme-accent)] border-[var(--theme-accent)] text-[var(--theme-bg)]"
                      : someFilteredSelected
                      ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)]"
                      : "border-[var(--theme-border-subtle)] bg-[var(--theme-surface)] hover:border-[var(--theme-border)] text-transparent"
                  }`}
                  title={allFilteredSelected ? "Deselect All" : "Select All"}
                >
                  {allFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {someFilteredSelected && <Minus className="w-3 h-3 stroke-[3]" />}
                </button>
              </th>
              <th className="py-3.5 px-3 font-bold">BOT INSTANCE</th>
              <th className="py-3.5 px-3 font-bold">MARKET & TF</th>
              <th className="py-3.5 px-3 font-bold">MARKET DATA SOURCE</th>
              <th className="py-3.5 px-3 font-bold">EXECUTION BROKER</th>
              <th className="py-3.5 px-3 font-bold">ACCOUNT & ENV</th>
              <th className="py-3.5 px-3 font-bold">LIFECYCLE STATUS</th>
              <th className="py-3.5 px-3 font-bold">ACTIVE POSITION</th>
              <th className="py-3.5 px-3 font-bold text-right">TODAY P&L</th>
              <th className="py-3.5 px-3 font-bold text-center">HEALTH</th>
              <th className="py-3.5 px-3 font-bold text-right w-24">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]/60 font-mono">
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
                  className={`transition cursor-pointer group ${
                    isSelected
                      ? "bg-[var(--theme-accent)]/10 hover:bg-[var(--theme-accent)]/15"
                      : "hover:bg-[var(--theme-elevated)]/50"
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectBot(bot.id);
                    }}
                  >
                    <button
                      type="button"
                      className={`w-4 h-4 rounded border flex items-center justify-center transition mx-auto ${
                        isSelected
                          ? "bg-[var(--theme-accent)] border-[var(--theme-accent)] text-[var(--theme-bg)]"
                          : "border-[var(--theme-border-subtle)] bg-[var(--theme-surface)] group-hover:border-[var(--theme-border)] text-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>

                  {/* 1. BOT INSTANCE */}
                  <td className="py-3 px-3 font-sans">
                    <div className="font-extrabold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition text-xs flex items-center gap-1.5">
                      <span>{bot.name}</span>
                    </div>
                    <div className="text-[10px] text-[var(--theme-text-muted)] font-mono truncate max-w-xs mt-0.5">
                      ID: {bot.id} • {bot.strategy}
                    </div>
                  </td>

                  {/* 2. MARKET & TF */}
                  <td className="py-3 px-3 font-mono">
                    <div className="font-bold text-[var(--theme-text-primary)] text-xs">{bot.symbol}</div>
                    <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                      {bot.timeframe} • {bot.asset_class || "CRYPTO"}
                    </div>
                  </td>

                  {/* 3. MARKET DATA SOURCE */}
                  <td className="py-3 px-3 font-mono">
                    <div className="text-[11px] font-bold text-[var(--theme-text-primary)] flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-[var(--theme-accent)]" />
                      <span>{mktSource}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold font-mono border ${
                          isFeedLive
                            ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                            : isFeedUnconfigured
                            ? "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                            : "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/30"
                        }`}
                      >
                        {isFeedLive ? `LIVE ${latencyDisplay}` : feedStatus}
                      </span>
                      <span className="text-[9px] text-[var(--theme-text-muted)]">
                        {bot.exchange || "BINANCE"}
                      </span>
                    </div>
                  </td>

                  {/* 4. EXECUTION BROKER (Interactive Dropdown Selector) */}
                  <td className="py-3 px-3 font-mono relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBrokerDropdownBotId(isBrokerDropdownOpen ? null : bot.id);
                        setActiveMenuBotId(null);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)] text-[var(--theme-text-primary)] font-bold text-[11px] transition flex items-center justify-between gap-1.5 shadow-sm max-w-[155px]"
                    >
                      <span className="truncate">{execBroker}</span>
                      <ChevronDown className="w-3 h-3 shrink-0 text-[var(--theme-text-muted)]" />
                    </button>

                    {/* Broker Selector Dropdown Popup */}
                    {isBrokerDropdownOpen && (
                      <div
                        ref={brokerDropdownRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-3 top-full mt-1 z-40 w-52 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden py-1 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono font-bold text-[var(--theme-text-muted)] uppercase border-b border-[var(--theme-border-subtle)]">
                          Select Execution Broker
                        </div>
                        {BROKER_OPTIONS.map((opt) => {
                          const isCurrent = (bot.execution_broker_id || "").toLowerCase() === opt.id || execBroker.toLowerCase().includes(opt.label.toLowerCase());
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => handleBrokerSelect(e, bot.id, opt.id, opt.defaultAccount)}
                              className={`w-full px-3 py-2 text-left font-mono text-[11px] flex items-center justify-between transition ${
                                isCurrent
                                  ? "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] font-bold"
                                  : "hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)]"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isCurrent && <Check className="w-3 h-3 text-[var(--theme-accent)]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* 5. ACCOUNT & ENV */}
                  <td className="py-3 px-3 font-mono">
                    <div className="font-bold text-[var(--theme-text-primary)] text-[11px] truncate max-w-[130px]">
                      {brokerAcc}
                    </div>
                    <div className="mt-0.5">
                      <button
                        onClick={(e) => handleToggleModeClick(e, bot.id, bot.execution_mode)}
                        disabled={isTogglingMode}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono border ${
                          isLive
                            ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 hover:bg-[var(--theme-loss)]/25"
                            : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/40 hover:bg-[var(--theme-accent)]/25"
                        }`}
                        title={isLive ? "LIVE mode active. Click to switch to PAPER." : "PAPER simulation. Click to toggle."}
                      >
                        <span className={`w-1 h-1 rounded-full ${isLive ? "bg-[var(--theme-loss)] animate-pulse" : "bg-[var(--theme-accent)]"}`} />
                        <span>{isTogglingMode ? "..." : isLive ? "LIVE" : "PAPER"}</span>
                      </button>
                    </div>
                  </td>

                  {/* 6. STATUS */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono border ${
                        isRunning
                          ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40 animate-pulse"
                          : isPaused
                          ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/40"
                          : isError
                          ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                          : isRecovering
                          ? "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/40"
                          : "bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                      }`}
                    >
                      {state}
                    </span>
                  </td>

                  {/* 7. POSITION */}
                  <td className="py-3 px-3">
                    {pos.has_position ? (
                      <div>
                        <span
                          className={`font-black text-xs ${
                            pos.direction === "LONG" ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                          }`}
                        >
                          {pos.direction} {pos.size}
                        </span>
                        <div className="text-[10px] text-[var(--theme-text-muted)] font-mono">
                          @ ${pos.entry_price ? pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--theme-text-muted)] font-sans text-xs">FLAT</span>
                    )}
                  </td>

                  {/* 8. TODAY P&L */}
                  <td className="py-3 px-3 text-right">
                    <div
                      className={`font-black text-xs ${
                        isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                      }`}
                    >
                      {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                      Cap: ${(bot.allocated_capital / 1000).toFixed(1)}K
                    </div>
                  </td>

                  {/* 9. HEALTH */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bot.health === "HEALTHY"
                          ? "bg-[var(--theme-profit)]/10 text-[var(--theme-profit)]"
                          : bot.health === "ERROR"
                          ? "bg-[var(--theme-loss)]/10 text-[var(--theme-loss)]"
                          : "bg-[var(--theme-warning)]/10 text-[var(--theme-warning)]"
                      }`}
                    >
                      {bot.health || "HEALTHY"}
                    </span>
                  </td>

                  {/* 10. ACTIONS (Quick Trade Destination Button + Consolidated Menu) */}
                  <td className="py-3 px-3 text-right relative">
                    <div className="inline-flex items-center justify-end gap-1.5 relative">
                      {/* Order Destination Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickTradeClick(e, bot, "BUY")}
                        className="px-2 py-1 rounded-lg bg-[var(--theme-profit)]/15 hover:bg-[var(--theme-profit)]/25 text-[var(--theme-profit)] border border-[var(--theme-profit)]/40 font-extrabold text-[10px] transition font-mono flex items-center gap-1 shadow-sm"
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
                        className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                          isMenuOpen
                            ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-md"
                            : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:border-[var(--theme-border)]"
                        } disabled:opacity-50`}
                        title="Bot Actions"
                      >
                        {isActionLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Dropdown Menu Popup */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-40 w-44 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden py-1.5 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                        >
                          {/* Contextual Execution Controls */}
                          {isStopped && (
                            <button
                              type="button"
                              onClick={(e) => handleAction(e, bot.id, "START")}
                              className="w-full px-3.5 py-2 text-[var(--theme-profit)] hover:bg-[var(--theme-profit)]/15 flex items-center gap-2 font-bold transition font-mono"
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
                                className="w-full px-3.5 py-2 text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/15 flex items-center gap-2 font-bold transition font-mono"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3.5 py-2 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/15 flex items-center gap-2 font-bold transition font-mono"
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
                                className="w-full px-3.5 py-2 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/15 flex items-center gap-2 font-bold transition font-mono"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Resume Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3.5 py-2 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/15 flex items-center gap-2 font-bold transition font-mono"
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
                                className="w-full px-3.5 py-2 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/15 flex items-center gap-2 font-bold transition font-mono"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Review Incident</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "START")}
                                className="w-full px-3.5 py-2 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/15 flex items-center gap-2 font-bold transition font-mono"
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
                            className="w-full px-3.5 py-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)] flex items-center gap-2 font-medium transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                            <span>View Details</span>
                          </button>

                          {/* Divider */}
                          <div className="h-px bg-[var(--theme-border-subtle)] my-1" />

                          {/* Delete / Force Delete Option */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, bot)}
                            className="w-full px-3.5 py-2 flex items-center gap-2 font-bold transition text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/20"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[var(--theme-loss)]" />
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
