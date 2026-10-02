"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { TradeDecisionProposal, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface TradeDecisionCardProps {
  decision: TradeDecisionProposal | null;
  onApprove: (decisionId: string) => void;
  onReject: (decisionId: string) => void;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
  isLoading: boolean;
}

export const TradeDecisionCard: React.FC<TradeDecisionCardProps> = ({
  decision,
  onApprove,
  onReject,
  onOpenDrawer,
  isLoading,
}) => {
  if (!decision) {
    return (
      <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-5 shadow-lg flex flex-col items-center justify-center text-center select-none backdrop-blur min-h-[260px]">
        <div className="h-10 w-10 rounded-full bg-[#092547] border border-[#154677] flex items-center justify-center mb-3">
          <Sparkles className="h-5 w-5 text-[#00D4FF] animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-200">NO ACTIVE TRADE CANDIDATE</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          The AI Strategy Agent scans intraday setups and evaluates market regime at each scheduled checkpoint.
        </p>
        <button
          onClick={() => onOpenDrawer("workflow_schedule", "Scheduled Automation Checkpoints")}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#00D4FF] hover:bg-[#33ddff] text-slate-950 font-bold text-xs transition-all shadow-md shadow-[#00D4FF]/20 cursor-pointer"
        >
          TRIGGER SCAN CHECKPOINT
        </button>
      </div>
    );
  }

  const isBuy = decision.action === "BUY";
  const isApproved = decision.riskStatus === "APPROVED";

  return (
    <div className="w-full bg-[#050e1d]/95 border border-[#143e69] rounded-xl p-4 sm:p-5 shadow-xl select-none backdrop-blur relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            CURRENT DECISION
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-300 font-semibold">{decision.strategy}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold">
            CONFIDENCE: {decision.confidence}%
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono font-bold border",
              isApproved
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/50 border-rose-500/40 text-rose-300"
            )}
          >
            RISK: {decision.riskStatus}
          </span>
        </div>
      </div>

      {/* Main Trade Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Symbol & Action */}
        <div className="bg-[#07192f] border border-[#13406c] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-mono uppercase">SYMBOL & ACTION</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded font-black text-xs font-mono border",
                isBuy
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-rose-500/20 border-rose-400 text-rose-300"
              )}
            >
              {decision.action}
            </span>
            <span className="font-extrabold text-sm text-white font-mono">{decision.symbol}</span>
          </div>
        </div>

        {/* Entry Price */}
        <div className="bg-[#07192f] border border-[#13406c] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-mono uppercase">ENTRY PRICE</span>
          <div className="text-base font-extrabold text-[#00D4FF] font-mono mt-1">
            {formatMoney(decision.entryPrice, "₹")}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="bg-[#07192f] border border-[#13406c] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-mono uppercase">STOP LOSS</span>
          <div className="text-base font-extrabold text-rose-400 font-mono mt-1">
            {formatMoney(decision.stopLoss, "₹")}
          </div>
        </div>

        {/* Target */}
        <div className="bg-[#07192f] border border-[#13406c] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-mono uppercase">TARGET</span>
          <div className="text-base font-extrabold text-emerald-400 font-mono mt-1">
            {formatMoney(decision.takeProfit, "₹")}
          </div>
        </div>
      </div>

      {/* Secondary Meta Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-[#040f1f] p-2.5 rounded-lg border border-[#0d2847] mb-3">
        <div>
          <span className="text-slate-500 text-[10px] block">QUANTITY</span>
          <span className="text-slate-200 font-bold">{decision.quantity} Units</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">MARKET DATA SOURCE</span>
          <span className="text-[#00D4FF] font-bold">{decision.marketDataProvider}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">EXECUTION BROKER</span>
          <span className="text-emerald-400 font-bold">{decision.executionBroker}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">MODE</span>
          <span className="text-cyan-300 font-bold">{decision.executionMode}</span>
        </div>
      </div>

      {/* Reasoning Snippet & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-300 italic line-clamp-1 flex-1">
          &ldquo;{decision.reason}&rdquo;
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDrawer("ai_reasoning", "AI Strategy Agent Reasoning", decision)}
            className="px-2.5 py-1.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 border border-[#143e69] text-xs font-semibold transition-all cursor-pointer"
          >
            VIEW REASONING
          </button>
          <button
            onClick={() => onApprove(decision.id)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            APPROVE
          </button>
          <button
            onClick={() => onReject(decision.id)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer"
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
};
