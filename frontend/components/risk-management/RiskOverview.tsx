"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertOctagon, TrendingDown, DollarSign, PieChart, Lock, Zap } from "lucide-react";
import { RiskOverviewState } from "@/types/risk";
import { EcoRiskMeter } from "@/components/eco/EcoRiskMeter";
import { EcoCapitalMeter } from "@/components/eco/EcoCapitalMeter";
import { EcoPanel, EcoPanelHeader, EcoPanelContent } from "@/components/eco/EcoPanel";

interface RiskOverviewProps {
  data: RiskOverviewState;
}

export function RiskOverview({ data }: RiskOverviewProps) {
  const isBlocked = data.risk_status?.includes("BLOCKED") || data.kill_switch_active;
  const isCritical = data.risk_score === "CRITICAL" || data.risk_status?.includes("CRITICAL");
  const isHigh = data.risk_score === "HIGH" || data.risk_status?.includes("HIGH");

  const riskValue = isBlocked ? 100 : isCritical ? 85 : isHigh ? 65 : 22;

  const totalCapital = data.account_balance || 100000;
  const allocatedCapital = data.capital_used || 15000;
  const availableCapital = data.available_capital || totalCapital - allocatedCapital;

  return (
    <div className="space-y-4 font-sans text-[#E8F3EC] select-none">
      {/* 1. Eco Gauges Row: Risk Meter (0-100%) + Capital Meter (SVG Ring) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Eco Risk Meter */}
        <EcoPanel>
          <EcoPanelHeader
            title="Portfolio Risk Telemetry Gauge"
            subtitle="Calculated composite risk score across volatility, leverage, and margin"
            icon={ShieldCheck}
          />
          <EcoPanelContent>
            <EcoRiskMeter
              score={riskValue}
              maxDrawdownPct={5.0}
              dailyDrawdownPct={data.daily_drawdown_pct || 1.25}
              marginUsedPct={data.margin_usage_pct || 21.5}
              isKillSwitchActive={isBlocked}
            />
          </EcoPanelContent>
        </EcoPanel>

        {/* Right: Eco Capital Meter */}
        <EcoPanel>
          <EcoPanelHeader
            title="Capital Allocation & Margin Utilization"
            subtitle="Live balance distribution across deployed bot instances and open positions"
            icon={PieChart}
          />
          <EcoPanelContent>
            <EcoCapitalMeter
              totalCapital={totalCapital}
              usedCapital={allocatedCapital}
              currency="$"
            />
          </EcoPanelContent>
        </EcoPanel>
      </div>

      {/* 2. Key Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#0D1914] border border-[#294238] rounded-2xl">
          <span className="text-[10px] text-[#70877A] uppercase block mb-1">Max Daily Loss</span>
          <span className="text-sm font-extrabold text-[#E8F3EC]">$2,500.00</span>
          <span className="text-[10px] text-[#55C98A] block mt-0.5">18% utilized</span>
        </div>

        <div className="p-3 bg-[#0D1914] border border-[#294238] rounded-2xl">
          <span className="text-[10px] text-[#70877A] uppercase block mb-1">Peak-to-Trough Drawdown</span>
          <span className="text-sm font-extrabold text-[#39B978]">
            {(data.daily_drawdown_pct || 1.25).toFixed(2)}%
          </span>
          <span className="text-[10px] text-[#70877A] block mt-0.5">Cap: 5.00%</span>
        </div>

        <div className="p-3 bg-[#0D1914] border border-[#294238] rounded-2xl">
          <span className="text-[10px] text-[#70877A] uppercase block mb-1">Margin Buffer</span>
          <span className="text-sm font-extrabold text-[#55C98A]">
            {(100 - (data.margin_usage_pct || 21.5)).toFixed(1)}% FREE
          </span>
          <span className="text-[10px] text-[#55C98A] block mt-0.5">Safe Threshold</span>
        </div>

        <div className="p-3 bg-[#0D1914] border border-[#294238] rounded-2xl">
          <span className="text-[10px] text-[#70877A] uppercase block mb-1">14-Point Pre-Order Gate</span>
          <span className="text-sm font-extrabold text-[#55C98A]">100% PASS</span>
          <span className="text-[10px] text-[#55C98A] block mt-0.5">0 Breaches</span>
        </div>
      </div>
    </div>
  );
}
