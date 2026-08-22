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
} from "lucide-react";
import { BotInstanceExtended } from "@/types/bot-control";

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
  const [query, setQuery] = useState("");

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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

  const filteredBots = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.symbol.toLowerCase().includes(query.toLowerCase()) ||
      b.strategy.toLowerCase().includes(query.toLowerCase())
  );

  const globalCommands = [
    { id: "create-bot", label: "Create New Bot Instance", icon: Plus, action: onOpenCreateWizard, color: "text-cyan-400" },
    { id: "start-all", label: "Start All Eligible Bots", icon: Play, action: onStartAll, color: "text-emerald-400" },
    { id: "pause-all", label: "Pause All Active Bots", icon: Pause, action: onPauseAll, color: "text-amber-400" },
    { id: "stop-all", label: "Stop All Bots", icon: Square, action: onStopAll, color: "text-slate-400" },
    { id: "kill-switch", label: "Trigger Global Emergency Kill Switch", icon: AlertOctagon, action: onKillSwitch, color: "text-red-400" },
  ].filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="bg-[#0D1914] border border-[#294238] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#1B3328] bg-[#0A130F] flex items-center gap-3">
          <Command className="h-5 w-5 text-[#55C98A]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search bot, symbol, strategy (e.g. 'Start BTC', 'Create Bot')..."
            className="w-full bg-transparent text-sm text-[#E8F3EC] placeholder-[#70877A] focus:outline-none font-sans"
          />
          <button onClick={onClose} className="text-[#70877A] hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
          {/* Global Commands Section */}
          {globalCommands.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#70877A] px-2 block">
                System Commands
              </span>
              {globalCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] text-left transition-colors flex items-center justify-between group border border-[#1B3328]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${cmd.color}`} />
                      <span className="font-bold text-[#E8F3EC] group-hover:text-white">{cmd.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#70877A] group-hover:text-[#55C98A]" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Bots Search Section */}
          {filteredBots.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#70877A] px-2 block">
                Matching Bot Instances ({filteredBots.length})
              </span>
              {filteredBots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-2.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] border border-[#1B3328] transition-colors flex items-center justify-between group"
                >
                  <button
                    onClick={() => {
                      onSelectBot(bot);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 text-left flex-1"
                  >
                    <Bot className="h-4 w-4 text-[#55C98A]" />
                    <div>
                      <span className="font-bold text-[#E8F3EC] group-hover:text-[#55C98A]">{bot.name}</span>
                      <span className="text-[10px] text-[#70877A] font-mono block">
                        {bot.symbol} • {bot.strategy} • Status: {bot.status}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {bot.status !== "RUNNING" ? (
                      <button
                        onClick={() => {
                          onBotAction(bot.id, "START");
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono"
                      >
                        Start
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onBotAction(bot.id, "PAUSE");
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold font-mono"
                      >
                        Pause
                      </button>
                    )}
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
