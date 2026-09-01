"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Trash2,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  CheckCircle2,
  Radio,
  Clock,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";
import { OptionsContractSelectorModal, SelectedOptionsContract } from "@/components/options/OptionsContractSelectorModal";

interface SimpleBotDetailsDrawerProps {
  isOpen: boolean;
  bot: BotRowItem | null;
  onClose: () => void;
  onBotAction: (botId: string, action: string) => Promise<void>;
  onToggleMode?: (botId: string, targetMode?: "LIVE" | "PAPER") => Promise<void> | void;
  onDeleteBot?: (bot: BotRowItem) => void;
  onRefresh: () => void;
}

export function SimpleBotDetailsDrawer({
  isOpen,
  bot,
  onClose,
  onBotAction,
  onToggleMode,
  onDeleteBot,
  onRefresh,
}: SimpleBotDetailsDrawerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isUpdatingContract, setIsUpdatingContract] = useState(false);
  const [isForcingTrade, setIsForcingTrade] = useState(false);

  if (!isOpen || !bot) return null;

  const state = (bot.status || bot.state || "STOPPED").toUpperCase();
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED" || state === "DRAFT";
  const isError = state === "ERROR";
  const isLive = (bot.execution_mode || "").toUpperCase() === "LIVE";

  const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
  const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
  const isPnlPositive = pnl >= 0;

  const isGenericOptionsCategory =
    ["BTC-OPTIONS", "ETH-OPTIONS", "SOL-OPTIONS", "NIFTY-OPTIONS", "BANKNIFTY-OPTIONS", "FINNIFTY-OPTIONS", "OPTIONS", "CRYPTO-OPTIONS"].includes((bot.symbol || "").toUpperCase()) ||
    (((bot.asset_class || "").toUpperCase() === "CRYPTO_OPTIONS" || (bot.asset_class || "").toUpperCase() === "OPTIONS") &&
      !bot.symbol.includes("-C") && !bot.symbol.includes("-P") && !bot.symbol.includes("CE") && !bot.symbol.includes("PE"));

  const isOptionsAsset = (bot.asset_class || "").toUpperCase() === "CRYPTO_OPTIONS" || (bot.asset_class || "").toUpperCase() === "OPTIONS" || isGenericOptionsCategory;

  const handleContractAssigned = async (contract: SelectedOptionsContract) => {
    setIsUpdatingContract(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/bot/${bot.id}/update-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: contract.symbol,
          display_symbol: contract.display_symbol,
          contract_id: contract.contract_id,
          underlying: contract.underlying,
          provider: contract.provider,
          expiry: contract.expiry,
          strike: contract.strike,
          option_type: contract.option_type,
          asset_class: contract.asset_class,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setActionFeedback(`Options contract updated to ${contract.symbol} (${contract.contract_id}) successfully!`);
        onRefresh();
      } else {
        setActionFeedback(`Failed to assign contract: ${data.message || data.error_code}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error updating contract: ${err.message}`);
    } finally {
      setIsUpdatingContract(false);
    }
  };

  const handleAction = async (action: string) => {
    setIsActing(true);
    setActionFeedback(null);
    try {
      await onBotAction(bot.id, action);
      setActionFeedback(`Action ${action} dispatched successfully.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || "Failed action"}`);
    } finally {
      setIsActing(false);
    }
  };

  const handleForceTestTrade = async (type?: "LONG_ENTRY" | "WIN_TP" | "LOSS_SL") => {
    setIsForcingTrade(true);
    setActionFeedback(null);
    const targetType = type || (pos.has_position ? "WIN_TP" : "LONG_ENTRY");
    try {
      const res = await fetch(`/api/bots/${bot.id}/force_test_trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_type: targetType }),
      });
      const data = await res.json();
      if (res.ok && (data.status === "success" || data.success)) {
        if (targetType === "WIN_TP") {
          setActionFeedback(`🎯 Position Closed with Take-Profit (+$${(Number(data.pnl || data.realized_pnl) || 30.0).toFixed(2)}). Today's Profit updated!`);
        } else if (targetType === "LOSS_SL") {
          setActionFeedback(`🛑 Position Closed with Stop-Loss (-$${Math.abs(Number(data.pnl || 15.0)).toFixed(2)}).`);
        } else {
          setActionFeedback(`⚡ Test Trade Executed! ${data.direction || "LONG"} order placed at $${(Number(data.price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}.`);
        }
        onRefresh();
      } else {
        setActionFeedback(`Failed to execute trade: ${data.message || "Unknown error"}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsForcingTrade(false);
    }
  };

  const handleModeSwitch = async (targetMode: "LIVE" | "PAPER") => {
    if (!onToggleMode) return;
    setIsSwitchingMode(true);
    setActionFeedback(null);
    try {
      await onToggleMode(bot.id, targetMode);
      setActionFeedback(`Execution mode switched to ${targetMode}.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Failed to switch mode: ${err.message}`);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-[var(--theme-surface)] border-l border-[var(--theme-border)] h-full overflow-y-auto p-6 flex flex-col justify-between font-sans select-none space-y-6 shadow-2xl">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)]">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[var(--theme-text-primary)]">
                    {bot.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--theme-text-muted)] mt-0.5">
                    <span>{bot.symbol}</span>
                    <span>•</span>
                    <span>{bot.timeframe}</span>
                    <span>•</span>
                    <span>ID: {bot.id}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Feedback Banner */}
            {actionFeedback && (
              <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-text-primary)] text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in">
                <span>{actionFeedback}</span>
                <button onClick={() => setActionFeedback(null)} className="text-[var(--theme-text-muted)] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Status & Mode Control Strip */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Lifecycle State:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isRunning
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40 animate-pulse"
                      : isPaused
                      ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/40"
                      : isError
                      ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                  }`}
                >
                  {state}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Execution Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleModeSwitch("PAPER")}
                    disabled={isSwitchingMode || !isLive}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      !isLive
                        ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]"
                        : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    PAPER
                  </button>
                  <button
                    onClick={() => handleModeSwitch("LIVE")}
                    disabled={isSwitchingMode || isLive}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      isLive
                        ? "bg-[var(--theme-loss)]/20 text-[var(--theme-loss)] border border-[var(--theme-loss)]"
                        : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    LIVE
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Next Action:</span>
                <span className="text-[var(--theme-text-primary)] font-sans text-right max-w-xs truncate">
                  {bot.next_action || "Scanning market..."}
                </span>
              </div>
            </div>

            {/* Performance & Position Matrix */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-sans">Today Net P&L</span>
                <div className={`text-base font-extrabold ${isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                  {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                  Realized: ${bot.pnl?.realized ? bot.pnl.realized.toFixed(2) : "0.00"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-sans">Active Position</span>
                <div className="text-base font-extrabold text-[var(--theme-text-primary)]">
                  {pos.has_position ? (
                    <span className={pos.direction === "LONG" ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                      {pos.direction} {pos.size}
                    </span>
                  ) : (
                    "FLAT"
                  )}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                  {pos.has_position ? `@ $${pos.entry_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "No open risk"}
                </div>
              </div>
            </div>

            {/* Simulation Test Order Trigger */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--theme-text-primary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                  <span>Interactive Test Trade Triggers</span>
                </div>
                <span className="text-[10px] text-[var(--theme-text-muted)] font-mono">Paper Simulation</span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <button
                  onClick={() => handleForceTestTrade("LONG_ENTRY")}
                  disabled={isForcingTrade}
                  className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-profit)] text-[var(--theme-profit)] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Entry Trade</span>
                </button>

                <button
                  onClick={() => handleForceTestTrade("WIN_TP")}
                  disabled={isForcingTrade}
                  className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-profit)] text-[var(--theme-profit)] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Win (+TP)</span>
                </button>

                <button
                  onClick={() => handleForceTestTrade("LOSS_SL")}
                  disabled={isForcingTrade}
                  className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-loss)] text-[var(--theme-loss)] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Loss (-SL)</span>
                </button>
              </div>
            </div>

            {/* Options Contract Selector (if applicable) */}
            {isOptionsAsset && (
              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-[var(--theme-text-primary)]">Options Contract Assignment</div>
                  <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
                    Assigned: <strong className="text-[var(--theme-text-primary)] font-mono">{bot.symbol}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setIsOptionsModalOpen(true)}
                  disabled={isUpdatingContract}
                  className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs transition font-mono"
                >
                  Change Contract
                </button>
              </div>
            )}

            {/* Advanced Configuration Accordion */}
            <div className="border-t border-[var(--theme-border-subtle)] pt-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              >
                <span>Configuration & Diagnostic Parameters</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] text-xs font-mono space-y-2 text-[var(--theme-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Strategy:</span>
                    <strong className="text-[var(--theme-text-primary)]">{bot.strategy}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Allocated Capital:</span>
                    <strong className="text-[var(--theme-text-primary)]">${bot.allocated_capital.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Heartbeat:</span>
                    <span>{bot.last_heartbeat ? <HydratedTimestamp timestamp={bot.last_heartbeat} /> : "Active"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls: Lifecycle & Delete */}
          <div className="space-y-3 pt-4 border-t border-[var(--theme-border-subtle)] font-mono">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {isStopped && (
                <button
                  onClick={() => handleAction("START")}
                  disabled={isActing}
                  className="col-span-2 py-2.5 rounded-2xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)] text-[var(--theme-profit)] hover:bg-[var(--theme-profit)]/25 font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Bot Instance</span>
                </button>
              )}

              {isRunning && (
                <>
                  <button
                    onClick={() => handleAction("PAUSE")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-warning)]/15 border border-[var(--theme-warning)] text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={() => handleAction("STOP")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)] text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    onClick={() => handleAction("RESUME")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)] text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => handleAction("STOP")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)] text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>

            {/* Permanent Delete with History Protection */}
            {onDeleteBot && (
              <button
                onClick={() => onDeleteBot(bot)}
                className="w-full py-2 rounded-2xl bg-[var(--theme-loss)]/10 hover:bg-[var(--theme-loss)]/20 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Bot (Preserve Trade History)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Options Contract Selector Modal */}
      {isOptionsModalOpen && (
        <OptionsContractSelectorModal
          isOpen={isOptionsModalOpen}
          onClose={() => setIsOptionsModalOpen(false)}
          onSelectContract={handleContractAssigned}
          initialUnderlying={bot.symbol}
          initialAssetClass={(bot.asset_class as any) || "OPTIONS"}
          botName={bot.name}
        />
      )}
    </>
  );
}
