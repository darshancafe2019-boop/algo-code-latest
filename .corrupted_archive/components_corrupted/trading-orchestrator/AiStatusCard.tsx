"use client";

import React from "react";
import {
  Sparkles,
  Cpu,
  Brain,
  RefreshCw,
  Eye,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { TradeDecisionProposal, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface AiStatusCardProps {
  decision: TradeDecisionProposal | null;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
  onReanalyze: () => void;
  isLoading: boolean;
}

export const AiStatusCard: React.FC<AiStatusCardProps> = ({
  decision,
  onOpenDrawer,
  onReanalyze,
  isLoading,
}) => {
  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-4 shadow-lg select-none backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            AI STRATEGY AGENT
          </h3>
        </div>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          READY
        </span>
      </div>

      {/* Body Information */}
      <div className="space-y-2.5 py-3 text-xs font-sans">
        <div className="flex items-start justify-between gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Current Task:</span>
          <span className="text-slate-200 font-semibold text-right">
            {decision ? `Analyzing ${decision.symbol} setup` : "Scanning market universe & volatility"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Decision:</span>
          <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
            {decision ? (
              <>
                <ArrowUpRight className="h-3.5 w-3.5" />
                {decision.action} ({decision.confidence}% Conf)
              </>
            ) : (
              "—"
            )}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <span className="text-slate-400 font-mono text-[11px] shrink-0">Reason:</span>
          <span className="text-slate-300 text-right line-clamp-2 italic text-[11px]">
            {decision ? decision.reason : "Awaiting next scheduled checkpoint trigger"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#0d2847]">
        <button
          onClick={() => onOpenDrawer("ai_reasoning", "AI Strategy Agent Reasoning & Thesis", decision)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 border border-[#143e69] text-[11px] font-semibold transition-all cursor-pointer"
        >
          <Eye className="h-3 w-3 text-[#00D4FF]" />
          VIEW REASONING
        </button>

        <button
          onClick={onReanalyze}
          disabled={isLoading}
          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-600/50 text-[11px] font-bold transition-all cursor-pointer"
        >
          <RefreshCw className={cn("h-3 w-3 text-purple-300", isLoading && "animate-spin")} />
          RE-ANALYZE
        </button>

        <button
          onClick={() => onOpenDrawer("ai_reasoning", "AI Strategy Multi-Model Configuration")}
          className="p-1.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-400 hover:text-slate-200 border border-[#143e69] transition-all cursor-pointer"
          title="AI Details"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
