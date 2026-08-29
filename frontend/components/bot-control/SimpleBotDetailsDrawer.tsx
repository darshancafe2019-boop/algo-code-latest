import React, { useState } from "react";
import { X, Play, Pause, Square, AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Activity, ShieldCheck, ShieldAlert, Sliders, Trash2, Layers, Sparkles } from "lucide-react";
import { BotRowItem } from "./SimpleBotTable";
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

  if (!isOpen || !bot) return null;

  const state = bot.status || bot.state || "STOPPED";
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

  const handleModeSwitch = async (targetMode: "LIVE" | "PAPER") => {
    if (!onToggleMode) return;
    setIsSwitchingMode(true);
    setActionFeedback(null);
    try {
      await onToggleMode(bot.id, targetMode);
      setActionFeedback(`Bot successfully switched to ${targetMode} execution mode.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || "Failed to switch mode"}`);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleDelete = () => {
    if (onDeleteBot && bot) {
      onDeleteBot(bot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono text-xs">
      <div className="w-full max-w-xl h-full bg-[#0B132B] border-l border-slate-800 shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  isRunning
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : isPaused
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : isError
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {state}
              </span>
              <button
                onClick={() => handleModeSwitch(isLive ? "PAPER" : "LIVE")}
                disabled={isSwitchingMode}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  isLive
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30"
                }`}
                title="Click to toggle execution mode"
              >
                {isSwitchingMode ? "Switching..." : isLive ? "🔴 LIVE MODE" : "🔵 PAPER MODE"}
              </button>
              <span className="text-slate-400 text-xs">{bot.symbol} • {bot.timeframe}</span>
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider truncate max-w-md">
              {bot.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionFeedback && (
          <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 text-xs">
            {actionFeedback}
          </div>
        )}

        {/* Options Contract Setup Banner if Generic Category */}
        {isGenericOptionsCategory && (
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Options Contract Required</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Generic Symbol
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              '{bot.symbol}' is a generic asset category. Select an active dated strike contract from the live chain before starting this bot.
            </p>
            <button
              onClick={() => setIsOptionsModalOpen(true)}
              disabled={isUpdatingContract}
              className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUpdatingContract ? "Updating..." : "Select Options Contract from Live Chain"}</span>
            </button>
          </div>
        )}

        {/* 1. Execution Mode Switcher Card */}
        <div className={`p-4 rounded-xl border space-y-2.5 ${isLive ? "bg-rose-950/20 border-rose-500/40" : "bg-slate-900/90 border-slate-800"}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Execution Environment</span>
              <p className="text-white text-xs font-bold font-sans">
                {isLive ? "⚡ LIVE REAL CAPITAL EXECUTION" : "🛡️ PAPER SIMULATION (RISK-FREE)"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleModeSwitch("PAPER")}
                disabled={isSwitchingMode}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  !isLive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Paper
              </button>
              <button
                onClick={() => handleModeSwitch("LIVE")}
                disabled={isSwitchingMode}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  isLive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse"
                    : "text-slate-400 hover:text-rose-400"
                }`}
              >
                Go Live
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            {isLive
              ? "Live orders will be dispatched directly to your exchange/broker API with the 14-point risk guard active."
              : "Orders are simulated in paper trading memory without risking real account balance."}
          </p>
        </div>

        {/* 2. Next Action Spotlight */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Next Planned Action</span>
          <p className="text-white text-xs leading-relaxed font-sans font-medium">
            {bot.next_action || "Scanning market feed for indicator entry confluence..."}
          </p>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-1">Today P&L</span>
            <span className={`text-sm font-extrabold ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-1">Position</span>
            <span className="text-sm font-extrabold text-white">
              {pos.has_position ? `${pos.direction} ${pos.size}` : "FLAT"}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-1">Allocated Capital</span>
            <span className="text-sm font-extrabold text-white">
              ${(bot.allocated_capital || 0).toLocaleString("en-US")}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-1">Health</span>
            <span className={`text-sm font-extrabold ${bot.health === "HEALTHY" ? "text-emerald-400" : "text-amber-400"}`}>
              {bot.health || "HEALTHY"}
            </span>
          </div>
        </div>

        {/* 3. Live Strategy Logic & Indicators */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-white text-xs">Strategy: {bot.strategy}</span>
            <span className="text-slate-400 text-[10px]">Version: {bot.strategy_version || "1.0"}</span>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Indicators</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.isArray(bot.indicators) && bot.indicators.length > 0 ? (
                bot.indicators.map((ind: any, i: number) => (
                  <div key={i} className="p-2 bg-slate-950/60 border border-slate-800/60 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300 font-bold">{ind.name || ind.type || `Indicator ${i+1}`}</span>
                    <span className="text-cyan-300 font-mono text-[10px]">{ind.status || "ACTIVE"}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs italic">Default indicator pipeline active (EMA + MACD + VP)</div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Advanced Technical Specs (Collapsible) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 bg-slate-900/80 hover:bg-slate-800/80 transition flex items-center justify-between text-slate-300 font-bold"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Technical Diagnostics & Metadata</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-4 border-t border-slate-800 space-y-2.5 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Bot Instance ID:</span>
                <span className="text-white font-bold">{bot.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Asset Class:</span>
                <span className="text-slate-200">{bot.asset_class}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Last Heartbeat:</span>
                <span className="text-slate-200">{bot.last_heartbeat || "Live Syncing"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Last State Update:</span>
                <span className="text-slate-200">{bot.updated_at ? <HydratedTimestamp timestamp={bot.updated_at} /> : "Just now"}</span>
              </div>

              {bot.config && Object.keys(bot.config).length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Configuration Payload:</span>
                  <pre className="text-slate-400 text-[10px] bg-slate-900 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(bot.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Footer Contextual Actions */}
        <div className="space-y-2 pt-2 mt-auto">
          <div className="grid grid-cols-2 gap-3">
            {isStopped && (
              isGenericOptionsCategory ? (
                <button
                  onClick={() => setIsOptionsModalOpen(true)}
                  disabled={isActing}
                  className="col-span-2 py-2.5 px-4 rounded-xl bg-purple-600/30 border border-purple-500/60 hover:bg-purple-600/40 text-purple-200 font-extrabold transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Select Options Contract to Start</span>
                </button>
              ) : (
                <button
                  onClick={() => handleAction("START")}
                  disabled={isActing}
                  className="col-span-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Bot</span>
                </button>
              )
            )}

            {isRunning && (
              <>
                <button
                  onClick={() => handleAction("PAUSE")}
                  disabled={isActing}
                  className="py-2.5 px-4 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </button>

                <button
                  onClick={() => handleAction("STOP")}
                  disabled={isActing}
                  className="py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                  className="py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </button>

                <button
                  onClick={() => handleAction("STOP")}
                  disabled={isActing}
                  className="py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {isError && (
              <button
                onClick={() => handleAction("RETRY")}
                disabled={isActing}
                className="col-span-2 py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Recovery</span>
              </button>
            )}
          </div>

          {/* Delete Bot Button in Drawer */}
          {onDeleteBot && (
            <button
              onClick={handleDelete}
              disabled={isActing}
              className="w-full py-2 px-4 rounded-xl bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 text-rose-400 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Bot Instance</span>
            </button>
          )}
        </div>
      </div>

      {/* Options Contract Selector Modal */}
      <OptionsContractSelectorModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        onSelectContract={handleContractAssigned}
        initialUnderlying={bot.symbol}
        initialAssetClass={isOptionsAsset ? "CRYPTO_OPTIONS" : undefined}
        botName={bot.name}
      />
    </div>
  );
}
