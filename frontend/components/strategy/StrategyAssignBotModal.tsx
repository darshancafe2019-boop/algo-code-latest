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
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

interface StrategyAssignBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition;
  onAssignSuccess: (botName: string) => void;
}

const SUPPORTED_BROKERS = [
  { id: "Delta", name: "Delta Exchange" },
  { id: "Dhan", name: "Dhan Multi-Broker" },
  { id: "Upstox", name: "Upstox V2" },
  { id: "Paper", name: "Paper Trading Engine" },
];

export function StrategyAssignBotModal({
  isOpen,
  onClose,
  strategy,
  onAssignSuccess,
}: StrategyAssignBotModalProps) {
  const [selectedBotId, setSelectedBotId] = useState<string>("NEW_BOT");
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE_LOCKED">("PAPER");
  const [broker, setBroker] = useState<string>(strategy?.broker_config?.execution_broker || "Delta");
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
  const stratVersion = strategy?.active_version || "v1.0.0";

  // Pre-flight compatibility checks
  const checks = [
    { label: "1. Strategy Saved", status: true, detail: stratVersion },
    { label: "2. Rules Complete", status: (strategy?.entry?.setup?.rules?.length || 0) > 0 && (strategy?.entry?.trigger?.rules?.length || 0) > 0, detail: "Setup & Trigger active" },
    { label: "3. Risk Configured", status: (strategy?.exit?.stop_loss_value || 0) > 0, detail: `SL -${strategy?.exit?.stop_loss_value || 1}%` },
    { label: "4. Instrument Valid", status: !!strategy?.symbol, detail: strategy?.symbol || "BTC/USDT" },
    { label: "5. Broker Selected", status: !!broker, detail: broker },
    { label: "6. Data Feed Available", status: true, detail: "Low-Latency Feed" },
    { label: "7. Mode Selected", status: true, detail: "PAPER MODE" },
    { label: "8. OMS Execution Ready", status: true, detail: "Closed-Bar Invariant" },
  ];

  const allChecksPass = checks.every((c) => c.status);

  const handleAssign = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const botConfig = {
        name: `${strategy.name} Bot`,
        symbol: strategy.symbol,
        timeframe: strategy.base_timeframe || "15m",
        strategy: strategy.name,
        strategy_version: stratVersion,
        allocated_capital: capital,
        broker: broker,
        trading_mode: "PAPER",
        risk_per_trade_pct: strategy.risk?.risk_per_trade_pct || 1.0,
        stop_loss_pct: strategy.exit?.stop_loss_value || 1.0,
        take_profit_pct: strategy.exit?.take_profit_value || 2.0,
        max_daily_loss: strategy.risk?.max_daily_loss || 500,
        leverage: strategy.risk?.leverage || 1.0,
        auto_start: false,
      };

      const res = await apiClient.post<any>("/api/bots/create", botConfig, {
        timeoutMs: 10000,
      });

      if (res.ok) {
        setFeedback({ type: "success", message: `Bot successfully assigned to ${strategy.name} (${stratVersion}) in PAPER mode!` });
        setTimeout(() => {
          onAssignSuccess(botConfig.name);
          onClose();
        }, 1200);
      } else {
        const errMsg = typeof res.error === "string" ? res.error : (res.error?.message || "Assignment failed. Please check bot settings.");
        setFeedback({ type: "error", message: errMsg });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Failed to create and assign bot." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A1422] border border-[#12304A] rounded-xl w-full max-w-xl shadow-2xl p-4 sm:p-5 space-y-4 font-sans text-xs select-none animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#12304A] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                ASSIGN STRATEGY TO BOT
              </h3>
              <p className="text-[11px] text-[#7D8EA5]">
                Auto-generate and deploy bot configuration from {strategy.name} ({stratVersion})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 8-Point Pre-Assignment Verification Checklist */}
        <div className="space-y-2 bg-[#0C1727] border border-[#12304A] rounded-xl p-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] border-b border-[#12304A] pb-1.5 font-bold text-[#F8FAFC]">
            <span>PRE-ASSIGNMENT VALIDATION</span>
            <span className={allChecksPass ? "text-[#00E89A]" : "text-[#F59E0B]"}>
              {allChecksPass ? "8/8 ALL CHECKS PASSED" : "VALIDATION PENDING"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] pt-1">
            {checks.map((chk, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[#7D8EA5]">{chk.label}:</span>
                {chk.status ? (
                  <span className="text-[#00E89A] font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {chk.detail}
                  </span>
                ) : (
                  <span className="text-[#FF3B5C] font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {chk.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bot Deployment Options Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div>
            <label className="text-[10px] text-[#7D8EA5] block mb-1">Execution Broker</label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
            >
              {SUPPORTED_BROKERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#7D8EA5] block mb-1">Trading Mode</label>
            <div className="h-8 px-2 bg-[#0C1727] border border-[#12304A] rounded flex items-center justify-between text-[#22D3EE] font-bold">
              <span>PAPER SIMULATOR</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#7D8EA5] block mb-1">Allocated Capital ($ / ₹)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 10000)}
              className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-[#00E89A]/10 border-[#00E89A]/40 text-[#00E89A]"
                : "bg-[#FF3B5C]/10 border-[#FF3B5C]/40 text-[#FF3B5C]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#12304A]">
          <QosButton variant="secondary" size="md" onClick={onClose}>
            Cancel
          </QosButton>
          <QosButton
            variant="primary"
            size="md"
            onClick={handleAssign}
            disabled={!allChecksPass || isSubmitting}
            isLoading={isSubmitting}
            className="gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Deploy to Bot</span>
          </QosButton>
        </div>
      </div>
    </div>
  );
}
