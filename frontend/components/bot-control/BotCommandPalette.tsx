"use client";

import React, { useState, useEffect } from "react";
import {
  Command,
  Search,
  Play,
  Pause,
  RotateCcw,
  Square,
  AlertOctagon,
  Plus,
  Bot,
  Activity,
  Layers,
  Shield,
  X,
  ArrowRight,
  Wrench,
  Sparkles,
  Database,
  RefreshCw,
  Cpu,
  Zap,
} from "lucide-react";
import { BotInstanceExtended } from "@/types/bot-control";
import { executeCommand } from "@/lib/commandClient";
import { useQueryClient } from "@tanstack/react-query";

interface BotCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  bots: BotInstanceExtended[];
  onBotAction: (botId: string, action: "START" | "PAUSE" | "RESUME" | "STOP" | "RESTART") => void;
  onOpenCreateWizard: () => void;
  onStartAll: () => void;
  onPauseAll: () => void;
  onStopAll: () => void;
  onKillSwitch: () => void;
  onSelectBot: (bot: BotInstanceExtended) => void;
}

export function BotCommandPalette({
  isOpen,
  onClose,
  bots,
  onBotAction,
  onOpenCreateWizard,
  onStartAll,
  onPauseAll,
  onStopAll,
  onKillSwitch,
  onSelectBot,
}: BotCommandPaletteProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | "FLEET" | "HEAL" | "RISK" | "BOTS">("ALL");

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecuteDirectCommand = async (action: string, payload: any = {}) => {
    try {
      await executeCommand(action, null, payload, queryClient);
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["selfHealingTelemetry"] });
    } catch (err) {
      console.error(`Command ${action} failed:`, err);
    }
  };

  const filteredBots = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.symbol.toLowerCase().includes(query.toLowerCase()) ||
      b.strategy.toLowerCase().includes(query.toLowerCase())
  );

  const allSystemCommands = [
    // Fleet Controls
    { id: "start-all", label: "Start All Eligible Bots", category: "FLEET", icon: Play, action: onStartAll, color: "text-emerald-400" },
    { id: "pause-all", label: "Pause All Active Bots", category: "FLEET", icon: Pause, action: onPauseAll, color: "text-amber-400" },
    { id: "resume-all", label: "Resume All Paused Bots", category: "FLEET", icon: RotateCcw, action: () => handleExecuteDirectCommand("RESUME_ALL_BOTS"), color: "text-cyan-400" },
    { id: "restart-all", label: "Restart All Bot Processes", category: "FLEET", icon: RotateCcw, action: () => handleExecuteDirectCommand("RESTART_ALL_BOTS"), color: "text-indigo-400" },
    { id: "stop-all", label: "Stop All Bots", category: "FLEET", icon: Square, action: onStopAll, color: "text-slate-400" },
    { id: "create-bot", label: "Create New Bot Instance", category: "FLEET", icon: Plus, action: onOpenCreateWizard, color: "text-cyan-400" },
    { id: "reset-sandbox", label: "Reset Paper Trading Sandbox ($10,000 baseline)", category: "FLEET", icon: RefreshCw, action: () => handleExecuteDirectCommand("RESET_PAPER_SANDBOX"), color: "text-amber-400" },
    { id: "kill-switch", label: "Engage Emergency Global Kill Switch (Halt All)", category: "FLEET", icon: AlertOctagon, action: onKillSwitch, color: "text-rose-400" },

    // Self-Healing & Diagnostics
    { id: "self-heal-fleet", label: "Autonomous Self-Heal Fleet & Resolve All Errors", category: "HEAL", icon: Sparkles, action: () => handleExecuteDirectCommand("SELF_HEAL_FLEET"), color: "text-cyan-300" },
    { id: "clear-cache", label: "Purge Corrupted Cache & Resynchronize Market Universe", category: "HEAL", icon: Wrench, action: () => handleExecuteDirectCommand("CLEAR_CACHE"), color: "text-teal-400" },
    { id: "reconcile-account", label: "Reconcile Account Ledger & Orphan Positions", category: "HEAL", icon: Database, action: () => handleExecuteDirectCommand("RECONCILE_ACCOUNT"), color: "text-emerald-400" },
    { id: "refresh-market-data", label: "Force Refresh Market Universe Feeds & Canonical Master", category: "HEAL", icon: RefreshCw, action: () => handleExecuteDirectCommand("REFRESH_MARKET_DATA"), color: "text-blue-400" },
    { id: "run-diagnostics", label: "Run Full System Reliability Diagnostics", category: "HEAL", icon: Activity, action: () => handleExecuteDirectCommand("RUN_DIAGNOSTICS"), color: "text-purple-400" },

    // Risk Controls
    { id: "risk-conservative", label: "Apply Conservative Risk Profile (1% Max Sizing)", category: "RISK", icon: Shield, action: () => handleExecuteDirectCommand("APPLY_RISK_PROFILE", { profile_name: "CONSERVATIVE" }), color: "text-emerald-400" },
    { id: "risk-moderate", label: "Apply Moderate Risk Profile (2.5% Max Sizing)", category: "RISK", icon: Shield, action: () => handleExecuteDirectCommand("APPLY_RISK_PROFILE", { profile_name: "MODERATE" }), color: "text-cyan-400" },
    { id: "risk-aggressive", label: "Apply Aggressive Risk Profile (5% Max Sizing)", category: "RISK", icon: Shield, action: () => handleExecuteDirectCommand("APPLY_RISK_PROFILE", { profile_name: "AGGRESSIVE" }), color: "text-amber-400" },
  ];

  const filteredCommands = allSystemCommands.filter(
    (c) =>
      (activeCategory === "ALL" || c.category === activeCategory) &&
      (c.label.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none font-sans">
      <div className="bg-[#0B131E] border border-cyan-800/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#1E293B] bg-[#070D14] flex items-center gap-3">
          <Command className="h-5 w-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search bot (e.g. 'Self Heal', 'Start All', 'BTC', 'Risk')..."
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="px-3.5 py-2 bg-[#05090F] border-b border-[#1E293B] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          {(["ALL", "FLEET", "HEAL", "RISK", "BOTS"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition font-bold ${
                activeCategory === cat
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-950/50"
                  : "bg-[#0B131E] text-slate-400 hover:text-white border border-[#1E293B]"
              }`}
            >
              {cat === "ALL" ? "All Commands" : cat === "FLEET" ? "Fleet Controls" : cat === "HEAL" ? "Self-Healing" : cat === "RISK" ? "Risk Profiles" : "Bot Fleet"}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
          {/* Global Commands Section */}
          {activeCategory !== "BOTS" && filteredCommands.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block font-mono">
                System Orchestration Commands ({filteredCommands.length})
              </span>
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#070D14] hover:bg-cyan-950/40 border border-[#1E293B] hover:border-cyan-800/60 text-left transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#0B131E] border border-[#1E293B] group-hover:scale-105 transition">
                        <Icon className={`h-4 w-4 ${cmd.color}`} />
                      </div>
                      <span className="font-bold text-slate-200 group-hover:text-white">{cmd.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Bots Search Section */}
          {(activeCategory === "ALL" || activeCategory === "BOTS") && filteredBots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block font-mono">
                Target Bot Instances ({filteredBots.length})
              </span>
              {filteredBots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-2.5 rounded-xl bg-[#070D14] hover:bg-[#0E1726] border border-[#1E293B] transition flex items-center justify-between group"
                >
                  <button
                    onClick={() => {
                      onSelectBot(bot);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                  >
                    <div className="p-1.5 rounded-lg bg-[#0B131E] border border-[#1E293B] text-cyan-400">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-200 group-hover:text-cyan-400">{bot.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {bot.symbol} • {bot.strategy} • Status: {bot.status}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {bot.status !== "RUNNING" ? (
                      <button
                        onClick={() => {
                          onBotAction(bot.id, "START");
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 text-[10px] font-bold font-mono transition"
                      >
                        Start
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onBotAction(bot.id, "PAUSE");
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-800 hover:bg-amber-900 text-[10px] font-bold font-mono transition"
                      >
                        Pause
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onBotAction(bot.id, "RESTART");
                        onClose();
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 text-[10px] font-bold font-mono transition"
                    >
                      Restart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
