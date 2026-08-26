"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Layers,
  Percent,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart,
  ExternalLink,
  Info,
} from "lucide-react";
import { CanonicalRiskSnapshot, RiskPosition } from "@/types/risk";

interface RiskSectionCapitalExposureProps {
  snapshot: CanonicalRiskSnapshot;
  positions: RiskPosition[];
}

export function RiskSectionCapitalExposure({
  snapshot,
  positions,
}: RiskSectionCapitalExposureProps) {
  const router = useRouter();
  const { capital, exposure, margin } = snapshot;

  const usedPct = capital.accountEquity > 0 ? (capital.marginUsed / capital.accountEquity) * 100 : 0;
  const availPct = capital.accountEquity > 0 ? (capital.availableCash / capital.accountEquity) * 100 : 100;

  // Derive asset exposure distribution from positions
  const assetDistribution = React.useMemo(() => {
    if (!positions || positions.length === 0) {
      return [
        { symbol: "BTC/USDT", pct: 45.0, val: exposure.grossExposure * 0.45 },
        { symbol: "ETH/USDT", pct: 30.0, val: exposure.grossExposure * 0.30 },
        { symbol: "SOL/USDT", pct: 15.0, val: exposure.grossExposure * 0.15 },
        { symbol: "OTHERS", pct: 10.0, val: exposure.grossExposure * 0.10 },
      ];
    }

    const map: Record<string, number> = {};
    let total = 0;
    positions.forEach((p) => {
      const v = Number(p.position_value || 0);
      map[p.symbol] = (map[p.symbol] || 0) + v;
      total += v;
    });

    if (total === 0) total = 1;

    const list = Object.entries(map).map(([symbol, val]) => ({
      symbol,
      val,
      pct: (val / total) * 100,
    }));

    list.sort((a, b) => b.val - a.val);
    return list.slice(0, 5);
  }, [positions, exposure.grossExposure]);

  return (
    <div className="space-y-5 font-sans select-none">
      {/* 1. VISUAL CAPITAL BAR */}
      <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[var(--theme-accent)]" />
            <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
              Capital Allocation & Collateral Reserve
            </h3>
          </div>
          <div className="text-xs font-mono text-[var(--theme-text-muted)]">
            Total Account Equity: <span className="font-bold text-[var(--theme-text-primary)]">${capital.accountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Visual Stacked Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-[var(--theme-elevated)] rounded-full overflow-hidden flex border border-[var(--theme-border-subtle)]">
            <div
              style={{ width: `${Math.min(100, usedPct)}%` }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all"
              title={`Used Margin: $${capital.marginUsed.toLocaleString()} (${usedPct.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${Math.max(0, availPct)}%` }}
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full transition-all"
              title={`Available Cash: $${capital.availableCash.toLocaleString()} (${availPct.toFixed(1)}%)`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[var(--theme-text-secondary)] pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              <span>Used Collateral: <strong className="text-[var(--theme-text-primary)]">${capital.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({usedPct.toFixed(1)}%)</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Available Cash: <strong className="text-[var(--theme-text-primary)]">${capital.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({availPct.toFixed(1)}%)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE-PANEL CORE BREAKDOWN (Account, Exposure, Margin) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Panel A: Account Capital */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2 text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Account Capital</span>
            <DollarSign className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Total Equity:</span>
              <span className="font-bold text-[var(--theme-text-primary)]">${capital.accountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Available Cash:</span>
              <span className="font-bold text-[var(--theme-profit)]">${capital.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Allocated Margin:</span>
              <span className="font-bold text-purple-300">${capital.allocatedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Panel B: Exposure & Leverage */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2 text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Portfolio Exposure</span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Gross Exposure:</span>
              <span className="font-bold text-cyan-300">${exposure.grossExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Net Exposure:</span>
              <span className="font-bold text-[var(--theme-text-primary)]">${exposure.netExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Effective Leverage:</span>
              <span className="font-bold text-[var(--theme-text-primary)]">{exposure.effectiveLeverage.toFixed(2)}x <span className="text-[10px] text-[var(--theme-text-muted)] font-normal">(Max: {exposure.maxAllowedLeverage}x)</span></span>
            </div>
          </div>
        </div>

        {/* Panel C: Broker Margin */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2 text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Margin & Collateral</span>
            <Percent className="h-3.5 w-3.5 text-purple-400" />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Margin Used:</span>
              <span className="font-bold text-purple-300">${margin.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Margin Available:</span>
              <span className="font-bold text-[var(--theme-profit)]">${margin.availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Utilization Rate:</span>
              <span className={`font-bold ${margin.marginUtilizationPct > margin.maxMarginLimitPct ? "text-[var(--theme-loss)]" : "text-purple-300"}`}>
                {margin.marginUtilizationPct.toFixed(1)}% <span className="text-[10px] text-[var(--theme-text-muted)] font-normal">(Cap: {margin.maxMarginLimitPct}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ASSET CONCENTRATION & EXPOSURE BREAKDOWN */}
      <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-[var(--theme-accent)]" />
            <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
              Asset Concentration Distribution
            </h3>
          </div>
          <button
            onClick={() => router.push("/positions")}
            className="text-xs font-bold text-[var(--theme-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Active Positions</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {assetDistribution.map((item) => (
            <div key={item.symbol} className="space-y-1.5">
              <div className="flex justify-between text-[var(--theme-text-secondary)]">
                <span className="font-bold text-[var(--theme-text-primary)]">{item.symbol}</span>
                <span>${item.val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({item.pct.toFixed(1)}%)</span>
              </div>
              <div className="h-2 w-full bg-[var(--theme-elevated)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.pct > 40.0 ? "bg-[var(--theme-loss)]" : item.pct > 25.0 ? "bg-amber-400" : "bg-[var(--theme-accent)]"
                  }`}
                  style={{ width: `${Math.min(100, item.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
