"use client";

import React, { useState } from "react";
import {
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Edit2,
} from "lucide-react";
import { CanonicalRiskSnapshot } from "@/types/risk";
import { RiskLimitEditDrawer, EditableRiskLimitItem } from "./RiskLimitEditDrawer";

interface RiskSectionLimitsProps {
  snapshot: CanonicalRiskSnapshot;
}

export function RiskSectionLimits({ snapshot }: RiskSectionLimitsProps) {
  const { capital, exposure, margin, dailyRisk, tradeRisk, concentration, correlation } = snapshot;

  const [selectedLimit, setSelectedLimit] = useState<EditableRiskLimitItem | null>(null);

  // 8 Canonical Risk Limits Definition
  const limitRows = [
    {
      key: "max_single_trade_risk_pct",
      name: "Risk Per Trade",
      current: `${tradeRisk.maxRiskPerTradePct.toFixed(1)}%`,
      numericCurrent: tradeRisk.maxRiskPerTradePct,
      max: "2.0%",
      numericMax: 2.0,
      unit: "%",
      minAllowed: 0.1,
      maxAllowed: 3.0,
      step: 0.1,
      status: tradeRisk.maxRiskPerTradePct > 2.0 ? "BLOCK" : "PASS",
      description: "Maximum capital budgeted for loss on a single stop-loss execution.",
      isCritical: true,
    },
    {
      key: "max_daily_loss_pct",
      name: "Daily Drawdown Limit",
      current: `${dailyRisk.dailyDrawdownPct.toFixed(1)}%`,
      numericCurrent: dailyRisk.maxDailyLossPct,
      max: `${dailyRisk.maxDailyLossPct.toFixed(1)}%`,
      numericMax: dailyRisk.maxDailyLossPct,
      unit: "%",
      minAllowed: 1.0,
      maxAllowed: 10.0,
      step: 0.5,
      status: dailyRisk.dailyDrawdownPct >= dailyRisk.maxDailyLossPct ? "BLOCK" : dailyRisk.dailyDrawdownPct >= dailyRisk.maxDailyLossPct * 0.75 ? "WARN" : "PASS",
      description: "Maximum cumulative daily loss before emergency day-lockout triggers.",
      isCritical: true,
    },
    {
      key: "max_leverage",
      name: "Portfolio Leverage Cap",
      current: `${exposure.effectiveLeverage.toFixed(2)}x`,
      numericCurrent: exposure.maxAllowedLeverage,
      max: `${exposure.maxAllowedLeverage}x`,
      numericMax: exposure.maxAllowedLeverage,
      unit: "x",
      minAllowed: 1.0,
      maxAllowed: 20.0,
      step: 0.5,
      status: exposure.effectiveLeverage > exposure.maxAllowedLeverage ? "BLOCK" : "PASS",
      description: "Maximum allowable gross notional leverage multiplier across entire portfolio.",
      isCritical: true,
    },
    {
      key: "max_portfolio_risk_pct",
      name: "Margin Utilization Ceiling",
      current: `${margin.marginUtilizationPct.toFixed(1)}%`,
      numericCurrent: margin.maxMarginLimitPct,
      max: `${margin.maxMarginLimitPct.toFixed(0)}%`,
      numericMax: margin.maxMarginLimitPct,
      unit: "%",
      minAllowed: 20.0,
      maxAllowed: 90.0,
      step: 5.0,
      status: margin.marginUtilizationPct > margin.maxMarginLimitPct ? "BLOCK" : margin.marginUtilizationPct > margin.maxMarginLimitPct * 0.85 ? "WARN" : "PASS",
      description: "Maximum percentage of account equity locked in broker initial margin requirements.",
      isCritical: true,
    },
    {
      key: "max_symbol_concentration_pct",
      name: "Single Asset Concentration",
      current: `${concentration.topAssetPct.toFixed(1)}%`,
      numericCurrent: concentration.maxConcentrationPct,
      max: `${concentration.maxConcentrationPct.toFixed(0)}%`,
      numericMax: concentration.maxConcentrationPct,
      unit: "%",
      minAllowed: 10.0,
      maxAllowed: 60.0,
      step: 5.0,
      status: concentration.topAssetPct > concentration.maxConcentrationPct ? "WARN" : "PASS",
      description: "Maximum exposure permitted in any single underlying instrument (e.g. BTC).",
      isCritical: false,
    },
    {
      key: "max_correlation",
      name: "Cross-Asset Correlation",
      current: `${correlation.averageCorrelation.toFixed(2)}`,
      numericCurrent: correlation.maxCorrelationLimit,
      max: `${correlation.maxCorrelationLimit.toFixed(2)}`,
      numericMax: correlation.maxCorrelationLimit,
      unit: "coef",
      minAllowed: 0.40,
      maxAllowed: 0.95,
      step: 0.05,
      status: correlation.averageCorrelation > correlation.maxCorrelationLimit ? "WARN" : "PASS",
      description: "Upper bound for pairwise correlation across open portfolio positions.",
      isCritical: false,
    },
    {
      key: "max_open_positions",
      name: "Max Open Positions",
      current: "4",
      numericCurrent: 10,
      max: "10",
      numericMax: 10,
      unit: "pos",
      minAllowed: 1,
      maxAllowed: 30,
      step: 1,
      status: "PASS",
      description: "Maximum concurrent active positions across all running bot instances.",
      isCritical: false,
    },
    {
      key: "max_spread_pct",
      name: "Slippage & Spread Guard",
      current: "0.04%",
      numericCurrent: 0.50,
      max: "0.50%",
      numericMax: 0.50,
      unit: "%",
      minAllowed: 0.10,
      maxAllowed: 2.0,
      step: 0.05,
      status: "PASS",
      description: "Maximum allowable bid-ask spread before order execution is halted.",
      isCritical: false,
    },
  ];

  return (
    <div className="space-y-5 font-sans select-none">
      {/* 1. LIMITS TABLE CARD */}
      <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[var(--theme-accent)]" />
            <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
              Authoritative Risk Thresholds & Safety Bounds
            </h3>
          </div>
          <span className="text-xs text-[var(--theme-text-muted)] font-mono">
            Click any parameter row to adjust threshold bounds
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] text-[var(--theme-text-muted)] uppercase tracking-wider">
                <th className="py-2.5 px-3">Limit Parameter</th>
                <th className="py-2.5 px-3">Current Value</th>
                <th className="py-2.5 px-3">Maximum Allowed</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border-subtle)]">
              {limitRows.map((row) => {
                const isPass = row.status === "PASS";
                const isWarn = row.status === "WARN";
                return (
                  <tr
                    key={row.key}
                    onClick={() =>
                      setSelectedLimit({
                        key: row.key,
                        name: row.name,
                        currentValue: row.numericMax,
                        unit: row.unit,
                        minAllowed: row.minAllowed,
                        maxAllowed: row.maxAllowed,
                        step: row.step,
                        description: row.description,
                        isCritical: row.isCritical,
                      })
                    }
                    className="hover:bg-[var(--theme-elevated)] transition cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--theme-text-primary)]">{row.name}</span>
                        <span
                          className="text-[var(--theme-text-muted)] hover:text-white transition"
                          title={row.description}
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-[var(--theme-text-primary)]">
                      {row.current}
                    </td>

                    <td className="py-3 px-3 text-[var(--theme-text-secondary)]">
                      {row.max}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          isPass
                            ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                            : isWarn
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                        }`}
                      >
                        {isPass ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isWarn ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span>{row.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button className="p-1.5 rounded-lg bg-[var(--theme-elevated)] group-hover:bg-[var(--theme-accent)] text-[var(--theme-text-muted)] group-hover:text-white transition cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. SLIDE-OVER EDIT DRAWER */}
      <RiskLimitEditDrawer
        isOpen={Boolean(selectedLimit)}
        limitItem={selectedLimit}
        onClose={() => setSelectedLimit(null)}
      />
    </div>
  );
}
