"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Bot,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Plus,
} from "lucide-react";
import { StrategyIdeDefinition } from "@/types/strategy-ide";

interface StrategyAssignBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition | any;
  onAssignSuccess: (botName: string) => void;
}

export function StrategyAssignBotModal({
  isOpen,
  onClose,
  strategy,
  onAssignSuccess,
}: StrategyAssignBotModalProps) {
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [liveConfirmed, setLiveConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch Existing Bots
  const { data: botsData, isLoading } = useQuery<{ bots: any[] }>({
    queryKey: ["botsList"],
    queryFn: async () => {
      const res = await fetch("/api/bots");
      if (!res.ok) return { bots: [] };
      return res.json();
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const bots = Array.isArray(botsData?.bots) ? botsData.bots : [];
  const stratVersion = strategy.active_version || strategy.version || "v1.0.0";

  const handleAssign = async () => {
    if (!selectedBotId && selectedBotId !== "NEW_BOT") return;
    if (executionMode === "LIVE" && !liveConfirmed) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (selectedBotId === "NEW_BOT") {
        // 1. Create new bot instance
        const res = await fetch("/api/bot/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${strategy.name} Bot`,
            symbol: strategy.symbol,
            timeframe: strategy.base_timeframe || strategy.timeframe || "15m",
            strategy: strategy.name,
            allocated_capital: strategy.risk?.capital || 10000,
            execution_mode: executionMode,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || err.message || "Failed to create bot");
        }
        const createdBot = await res.json();
        const newBotId = createdBot.bot_id || `bot-${Date.now()}`;

        // 2. Assign immutable strategy deployment
        await fetch("/api/strategy/ide/assign-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategy,
            bot_id: newBotId,
            execution_mode: executionMode,
          }),
        });

        setFeedback({
          type: "success",
          message: `Strategy attached to new Bot (${strategy.name} Bot) in ${executionMode} mode! (Does not start automatically)`,
        });
        setTimeout(() => {
          onAssignSuccess(`${strategy.name} Bot`);
          onClose();
        }, 1500);
      } else {
        // Assign to existing bot
        const res = await fetch("/api/strategy/ide/assign-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategy,
            bot_id: selectedBotId,
            execution_mode: executionMode,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to assign strategy to bot");
        }

        setFeedback({
          type: "success",
          message: `Strategy (${stratVersion}) attached to Bot ${selectedBotId} in ${executionMode} mode.`,
        });
        setTimeout(() => {
          onAssignSuccess(`Bot ${selectedBotId}`);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Assignment failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans select-none">
      <div className="w-full max-w-lg bg-[#0B131E] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#070D14] border-b border-[#172234]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Assign Strategy Snapshot to Bot
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  {stratVersion}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Attaches frozen snapshot without unprompted live execution.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#111C2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Target Bot Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Select Target Bot Instance
            </label>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="w-full bg-[#070D14] border border-[#1E293B] rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value="">-- Choose Bot Target --</option>
              <option value="NEW_BOT">+ Create New Bot Instance for this Strategy</option>
              {bots.map((b) => (
                <option key={b.bot_id || b.id} value={b.bot_id || b.id}>
                  {b.name || b.bot_id} ({b.symbol} • {b.strategy || "No Strategy"})
                </option>
              ))}
            </select>
          </div>

          {/* Execution Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Execution Sandbox Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExecutionMode("PAPER")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  executionMode === "PAPER"
                    ? "bg-blue-950/60 border-blue-600 text-white"
                    : "bg-[#070D14] border-[#172234] text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="font-bold text-xs">Paper Trading</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Simulated order execution sandbox</div>
              </button>

              <button
                type="button"
                onClick={() => setExecutionMode("LIVE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  executionMode === "LIVE"
                    ? "bg-rose-950/60 border-rose-600 text-white"
                    : "bg-[#070D14] border-[#172234] text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="font-bold text-xs text-rose-400">Live Execution</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Requires confirmation before activation</div>
              </button>
            </div>
          </div>

          {/* Live Confirmation Gate */}
          {executionMode === "LIVE" && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>Live Market Pre-Flight Gate</span>
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Assigning this strategy to a live bot will freeze the configuration snapshot. The bot will remain in PAUSED state until manually started in Command Centre.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={liveConfirmed}
                  onChange={(e) => setLiveConfirmed(e.target.checked)}
                  className="rounded bg-rose-950 border-rose-700 text-rose-600 focus:ring-0"
                />
                <span className="text-[11px] text-rose-200 font-semibold">
                  I understand live execution risks and accept parameter snapshot.
                </span>
              </label>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/60 border-rose-800 text-rose-300"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#070D14] border-t border-[#172234] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#111C2E] hover:bg-[#18263E] text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={
              isSubmitting ||
              !selectedBotId ||
              (executionMode === "LIVE" && !liveConfirmed)
            }
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>{isSubmitting ? "Assigning..." : "Confirm Assignment"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
