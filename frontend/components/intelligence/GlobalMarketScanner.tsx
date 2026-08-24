"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Bot,
  Zap,
  Sliders,
  Play,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useActiveBot } from "@/context/ActiveBotContext";

export function GlobalMarketScanner() {
  const queryClient = useQueryClient();
  const { setActiveSymbol } = useActiveBot();
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("ALL");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch Tier 2 Market Scanner candidates
  const { data: scanData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["intelligenceScanner", selectedAssetClass],
    queryFn: async () => {
      const acParam = selectedAssetClass !== "ALL" ? `?asset_class=${selectedAssetClass}` : "";
      const res = await apiClient.get<any>(`/api/intelligence/scanner${acParam}`);
      if (!res.ok) return [];
      return res.data?.results || [];
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Paper Bot Deployment Mutation
  const createBotMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await apiClient.post<any>("/api/paper/orders", {
        symbol,
        direction: "BUY",
        quantity: symbol.includes("BANK") ? 15 : (symbol.includes("NIFTY") ? 50 : 0.01),
        strategy: "AI_ENSEMBLE_PRO",
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to launch paper bot");
      return res.data;
    },
    onSuccess: (data, sym) => {
      setActionFeedback(`[SUCCESS] Deployed automated PAPER bot for ${sym}!`);
      setTimeout(() => setActionFeedback(null), 4000);
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const candidates = scanData || [];

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-mono text-xs">
      {/* Scanner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-accent)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-sans">
              Tier 2 Global Market Intelligence Scanner
            </h3>
            <p className="text-[11px] text-[var(--theme-text-secondary)] font-sans">
              Autonomous Bar-by-Bar Multi-Asset Evaluation (1m - 1h Completed Bars)
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
          <span>Rescan</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Asset Class Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {["ALL", "CRYPTO_SPOT", "CRYPTO_FUTURES", "INDIAN_INDICES", "INDIAN_EQUITIES", "US_EQUITIES", "FOREX", "COMMODITIES"].map((ac) => (
          <button
            key={ac}
            onClick={() => setSelectedAssetClass(ac)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
              selectedAssetClass === ac
                ? "bg-[var(--theme-accent)] text-slate-950 shadow-md shadow-[var(--theme-accent)]/20"
                : "bg-[var(--theme-elevated)] text-slate-400 hover:text-white"
            }`}
          >
            {ac.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Candidate Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--theme-elevated)]/60 text-slate-400 border-b border-[var(--theme-border-subtle)] text-[11px]">
              <th className="py-2 px-3">Instrument</th>
              <th className="py-2 px-3">Exchange</th>
              <th className="py-2 px-3">Feed Status</th>
              <th className="py-2 px-3">AI Signal</th>
              <th className="py-2 px-3">Confidence</th>
              <th className="py-2 px-3">Expected Return</th>
              <th className="py-2 px-3">Risk/Reward</th>
              <th className="py-2 px-3">Regime</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {candidates.map((c: any, idx: number) => {
              const isLong = c.decision === "LONG";
              const isShort = c.decision === "SHORT";
              return (
                <tr key={idx} className="hover:bg-[var(--theme-elevated)]/40 transition">
                  <td className="py-2.5 px-3 font-bold text-white">
                    {c.symbol}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{c.exchange}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      c.feedStatus === "REAL-TIME"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {c.feedStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isLong
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : isShort
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {c.decision}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">
                    {(c.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                    {c.expectedReturn ? `+${(c.expectedReturn * 100).toFixed(2)}%` : "0.00%"}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300">
                    1:{c.riskReward?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{c.marketRegime}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setActiveSymbol(c.symbol)}
                        className="px-2 py-1 bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-accent)] rounded border border-[var(--theme-border)] text-[10px] font-bold"
                        title="Set active in primary decision hero"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={() => createBotMutation.mutate(c.symbol)}
                        disabled={createBotMutation.isPending}
                        className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded text-[10px] font-bold shadow-sm"
                        title="Launch Paper Bot"
                      >
                        Paper Bot
                      </button>
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
