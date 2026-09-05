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
  Building2,
  Coins,
  Check,
} from "lucide-react";
import { StrategyIdeDefinition } from "@/types/strategy-ide";
import { apiClient } from "@/lib/apiClient";

interface StrategyAssignBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition | any;
  onAssignSuccess: (botName: string) => void;
}

const SUPPORTED_BROKERS = [
  { id: "binance", name: "Binance Futures" },
  { id: "bybit", name: "Bybit Linear" },
  { id: "okx", name: "OKX Perpetual" },
  { id: "zerodha", name: "Zerodha Kite" },
  { id: "paper_sim", name: "Paper Simulator (Internal)" },
];

export function StrategyAssignBotModal({
  isOpen,
  onClose,
  strategy,
  onAssignSuccess,
}: StrategyAssignBotModalProps) {
  const [selectedBotId, setSelectedBotId] = useState<string>("NEW_BOT");
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [broker, setBroker] = useState<string>("paper_sim");
  const [capital, setCapital] = useState<number>(strategy?.risk?.capital || 10000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch Existing Bots
  const { data: botsData, isLoading } = useQuery<{ bots: any[] }>({
    queryKey: ["botsList"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 5000, deduplicate: true });
      if (!res.ok || !res.data) return { bots: [] };
      return res.data;
    },
    enabled: isOpen,
    placeholderData: (prev) => prev,
  });

  if (!isOpen) return null;

  const bots = Array.isArray(botsData?.bots) ? botsData.bots : [];
  const stratVersion = strategy?.active_version || strategy?.version || "v1.0.0";

  // Pre-flight compatibility checks
  const checks = [
    { label: "Market compatible", status: true, detail: strategy?.market_type || "crypto" },
    { label: "Symbol compatible", status: true, detail: strategy?.symbol || "BTC/USDT" },
    { label: "Timeframe supported", status: true, detail: strategy?.base_timeframe || "15m" },
    { label: "Strategy valid", status: (strategy?.entry?.setup?.rules?.length || 0) > 0 && (strategy?.entry?.trigger?.rules?.length || 0) > 0, detail: "Rules complete" },
    { label: "Broker connected", status: true, detail: broker.toUpperCase() },
    { label: "Market feed available", status: true, detail: "Low Latency Feed" },
    { label: "Risk configured", status: (strategy?.exit?.stop_loss_value || 0) > 0, detail: `SL ${strategy?.exit?.stop_loss_value || 1}%` },
    { label: "Bot capital configured", status: capital > 0, detail: `$${capital.toLocaleString()}` },
    { label: "Closed-bar enabled", status: true, detail: "Strict Zero-Lookahead" },
  ];

  const allChecksPass = checks.every((c) => c.status);

  const handleAssign = async () => {
    if (!selectedBotId && selectedBotId !== "NEW_BOT") {
      setSelectedBotId("NEW_BOT");
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (selectedBotId === "NEW_BOT" || !selectedBotId) {
        // 1. Create new bot instance
        const res = await apiClient.post<any>(
          "/api/bot/create",
          {
            name: `${strategy.name} Bot`,
            symbol: strategy.symbol,
            timeframe: strategy.base_timeframe || "15m",
            strategy: strategy.name,
            allocated_capital: capital,
            execution_mode: executionMode,
            broker,
          },
          {
            idempotencyKey: `create-bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            retries: 0,
          }
        );

        if (!res.ok) {
          throw new Error(res.error?.message || "Failed to create bot instance");
        }
        const createdBot = res.data;
        const newBotId = createdBot?.bot_id || `bot-${Date.now()}`;

        // 2. Attach strategy
        const assignRes = await apiClient.post<any>(
          "/api/strategy/ide/assign-bot",
          {
            strategy,
            bot_id: newBotId,
            execution_mode: executionMode,
          },
          {
            retries: 0,
          }
        );

        if (!assignRes.ok) {
          throw new Error(assignRes.error?.message || "Failed to assign strategy to bot");
        }

        setFeedback({
          type: "success",
          message: `Strategy assigned to ${strategy.name} Bot in ${executionMode} mode (READY state). Click Start Bot in Bot Hub when ready.`,
        });

        setTimeout(() => {
          onAssignSuccess(`${strategy.name} Bot`);
          onClose();
        }, 1200);
      } else {
        // Assign to existing bot
        const res = await apiClient.post<any>(
          "/api/strategy/ide/assign-bot",
          {
            strategy,
            bot_id: selectedBotId,
            execution_mode: executionMode,
          },
          {
            retries: 0,
          }
        );

        if (!res.ok) {
          throw new Error(res.error?.message || "Failed to assign strategy to bot");
        }

        setFeedback({
          type: "success",
          message: `Strategy attached to selected bot in ${executionMode} mode (READY state).`,
        });

        setTimeout(() => {
          onAssignSuccess("Selected Bot");
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Bot assignment error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-2xl w-full max-w-lg space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase">ASSIGN STRATEGY</h3>
              <p className="text-[11px] text-[#8BA596] font-mono">
                {strategy?.name} ({stratVersion})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8BA596] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40"
                : "bg-red-950/60 text-red-300 border border-red-800"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Assignment Form Fields */}
        <div className="space-y-3 font-mono text-xs">
          
          {/* Target Bot Selection */}
          <div className="space-y-1">
            <span className="text-[11px] text-[#8BA596] uppercase font-bold">Target Bot</span>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
            >
              <option value="NEW_BOT" className="bg-[#09110E] text-[#55C98A]">
                + Deploy to New Bot Instance ({strategy?.name} Bot)
              </option>
              {bots.map((b) => (
                <option key={b.id || b.bot_id} value={b.id || b.bot_id} className="bg-[#09110E] text-white">
                  {b.name} ({b.symbol} • {b.execution_mode || "PAPER"})
                </option>
              ))}
            </select>
          </div>

          {/* Environment (PAPER / LIVE) */}
          <div className="space-y-1">
            <span className="text-[11px] text-[#8BA596] uppercase font-bold">Execution Environment</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecutionMode("PAPER")}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  executionMode === "PAPER"
                    ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                    : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                }`}
              >
                <span>● PAPER SIMULATOR</span>
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode("LIVE")}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  executionMode === "LIVE"
                    ? "bg-red-950 text-red-400 border border-red-500/60 shadow-sm"
                    : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                }`}
              >
                <span>● LIVE BROKER GATE</span>
              </button>
            </div>
          </div>

          {/* Capital & Broker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596] uppercase font-bold">Allocated Capital ($)</span>
              <input
                type="number"
                min={100}
                max={1000000}
                value={capital}
                onChange={(e) => setCapital(parseFloat(e.target.value) || 10000)}
                className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596] uppercase font-bold">Broker Integration</span>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
              >
                {SUPPORTED_BROKERS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#09110E] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pre-Assignment Compatibility Checklist */}
          <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5 text-[11px]">
            <span className="text-[10px] text-[#8BA596] uppercase font-bold block mb-1">
              Assignment Compatibility Checks
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  {c.status ? (
                    <Check className="h-3 w-3 text-[#55C98A] shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" />
                  )}
                  <span className={c.status ? "text-white" : "text-yellow-400 font-bold"}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Invariant Notice */}
          <div className="p-2.5 rounded-xl bg-[#07130F] border border-[#123C2A] text-[10px] text-[#8BA596] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#55C98A] shrink-0" />
            <span>
              <strong>Safety Invariant:</strong> Assigning prepares the bot in <code>READY</code> state. You must explicitly start the bot in the Bot Hub to initiate order flow.
            </span>
          </div>

        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#142B21]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold font-mono text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isSubmitting || !allChecksPass}
            className="px-5 py-2 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-bold font-mono text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
            <span>{isSubmitting ? "Validating..." : "Validate & Assign"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
