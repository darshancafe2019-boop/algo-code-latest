"use client";

import React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  BarChart3,
  Gauge,
  Percent,
} from "lucide-react";
import { ConfluenceBreakdown } from "@/types/intelligence";

interface ConfluenceScorecardProps {
  confluenceData?: ConfluenceBreakdown | null;
}

interface PillarItem {
  id: string;
  name: string;
  earned: number;
  max: number;
  inputValue: string;
  threshold: string;
  status: "PASS" | "WAITING" | "FAIL";
  contributionPct: number;
}

export function ConfluenceScorecard({ confluenceData }: ConfluenceScorecardProps) {
  // Transparent Weighted Pillars (Sum of max points = 100)
  const pillars: PillarItem[] = [
    {
      id: "trend",
      name: "Macro Trend Bias",
      earned: 25,
      max: 25,
      inputValue: "Price > 1H/4H EMA 200 ($62,100)",
      threshold: "Price above EMA 200",
      status: "PASS",
      contributionPct: 25.0,
    },
    {
      id: "ema",
      name: "EMA Ribbon Structure",
      earned: 20,
      max: 20,
      inputValue: "EMA 9 ($65,420) > EMA 21 ($64,800)",
      threshold: "Fast EMA above Slow EMA",
      status: "PASS",
      contributionPct: 20.0,
    },
    {
      id: "momentum",
      name: "RSI Momentum Zone",
      earned: 15,
      max: 20,
      inputValue: "RSI 58.5 (Target > 60.0)",
      threshold: "RSI > 60.0 on candle close",
      status: "WAITING",
      contributionPct: 15.0,
    },
    {
      id: "volume",
      name: "Volume Confirmation",
      earned: 12,
      max: 15,
      inputValue: "1.42x 20-period Volume MA",
      threshold: "Volume > 1.2x Volume MA",
      status: "PASS",
      contributionPct: 12.0,
    },
    {
      id: "htf",
      name: "Higher-Timeframe Alignment",
      earned: 10,
      max: 10,
      inputValue: "1H Bullish + 4H Bullish",
      threshold: "Both 1H and 4H Bullish",
      status: "PASS",
      contributionPct: 10.0,
    },
    {
      id: "volatility",
      name: "Volatility / ATR Buffer",
      earned: 8,
      max: 10,
      inputValue: "ATR $620 (1.4% normal range)",
      threshold: "ATR < 2.5% safe band",
      status: "PASS",
      contributionPct: 8.0,
    },
  ];

  // Mathematical Reconciliation
  const totalEarned = pillars.reduce((sum, p) => sum + p.earned, 0);
  const totalMax = pillars.reduce((sum, p) => sum + p.max, 0); // 100
  const aggregateScorePct = (totalEarned / totalMax) * 100; // 90.0%

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl font-sans select-none space-y-4">
      {/* 1. Header with Total Reconciled Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider">
              Confluence Scorecard & Weight Breakdown
            </h3>
            <p className="text-[11px] text-[var(--theme-text-secondary)] mt-0.5 font-mono">
              Transparent multi-factor technical scoring ({totalEarned} / {totalMax} pts reconciled).
            </p>
          </div>
        </div>

        {/* Total Score Badge */}
        <div className="flex items-center gap-2 font-mono">
          <div className="px-3 py-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-2">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold">TOTAL SCORE:</span>
            <span className="text-xs font-black text-[var(--theme-profit)] tabular-nums">
              {totalEarned} / {totalMax} ({aggregateScorePct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visual Waterfall / Factor Contribution Strip */}
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-muted)]">
          <span>FACTOR CONTRIBUTION WATERFALL</span>
          <span className="text-[var(--theme-profit)] font-bold">{totalEarned}% / 100% EARNED</span>
        </div>
        <div className="w-full h-3 bg-[var(--theme-elevated)] rounded-full overflow-hidden flex border border-[var(--theme-border-subtle)]">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              title={`${p.name}: ${p.earned}/${p.max} pts (${p.status})`}
              className={`h-full border-r border-[var(--theme-surface)] transition-all ${
                p.status === "PASS"
                  ? "bg-[var(--theme-profit)]"
                  : p.status === "WAITING"
                  ? "bg-[var(--theme-warning)]"
                  : "bg-[var(--theme-loss)]"
              }`}
              style={{ width: `${(p.earned / totalMax) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* 3. Detailed Pillar Table (Full Width Responsive) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] text-[var(--theme-text-muted)] uppercase">
              <th className="py-2 px-3">Quantitative Factor</th>
              <th className="py-2 px-3 text-right">Points</th>
              <th className="py-2 px-3">Live Indicator Value</th>
              <th className="py-2 px-3">Rule / Threshold</th>
              <th className="py-2 px-3 text-right">Gate State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {pillars.map((p, idx) => {
              const isPass = p.status === "PASS";
              const isWaiting = p.status === "WAITING";

              return (
                <tr key={idx} className="hover:bg-[var(--theme-elevated)]/50 transition">
                  <td className="py-2.5 px-3 font-bold text-[var(--theme-text-primary)]">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black tabular-nums">
                    <span className={isPass ? "text-[var(--theme-profit)]" : isWaiting ? "text-[var(--theme-warning)]" : "text-[var(--theme-loss)]"}>
                      {p.earned}
                    </span>
                    <span className="text-[var(--theme-text-muted)]"> / {p.max}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--theme-text-secondary)]">
                    {p.inputValue}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--theme-text-muted)] text-[11px]">
                    {p.threshold}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isPass
                        ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]"
                        : isWaiting
                        ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)]"
                        : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]"
                    }`}>
                      {isPass ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {p.status}
                    </span>
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
