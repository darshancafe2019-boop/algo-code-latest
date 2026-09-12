"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  Percent,
  CheckCircle2,
  DollarSign,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StrategyIdeRisk, StrategyIdeExit } from "@/types/strategy-ide";

interface StrategyRiskSettingsProps {
  risk: StrategyIdeRisk;
  exit: StrategyIdeExit;
  onUpdateRisk: (updated: Partial<StrategyIdeRisk>) => void;
  onUpdateExit: (updated: Partial<StrategyIdeExit>) => void;
  botCapital?: {
    allocated: number;
    currency?: string;
    botName?: string;
  };
}

export function StrategyRiskSettings({
  risk,
  exit,
  onUpdateRisk,
  onUpdateExit,
  botCapital,
}: StrategyRiskSettingsProps) {
  const [isAdvancedExitOpen, setIsAdvancedExitOpen] = useState(false);

  // Live Risk:Reward Ratio calculation
  const riskRewardRatio = useMemo(() => {
    const sl = exit.stop_loss_value || 1.0;
    const tp = exit.take_profit_value || 2.0;
    if (sl <= 0) return "1 : ∞";
    const ratio = Math.round((tp / sl) * 100) / 100;
    return `1 : ${ratio}`;
  }, [exit.stop_loss_value, exit.take_profit_value]);

  const effectiveCapital = botCapital?.allocated || risk.capital || 10000;
  const currencySymbol = botCapital?.currency === "INR" ? "₹" : "$";
  const maxRiskMonetary = Math.round((effectiveCapital * (risk.risk_per_trade_pct || 1.0)) / 100);

  return (
    <section className="bg-[#0A1422] border border-[#12304A] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3.5 font-sans select-none text-xs">
      {/* 1. Header & Closed-Bar Invariant Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12304A] pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30 shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              <span>EXIT & RISK MANAGEMENT</span>
            </h3>
            <p className="text-[11px] text-[#7D8EA5]">Deterministic capital preservation, stop-loss, and profit targets</p>
          </div>
        </div>

        {/* Closed-Bar Execution Invariant Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07111F] border border-[#12304A] text-[#7D8EA5] text-[10px] font-mono"
          title="Strategy evaluates completed candles only."
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[#00E89A]" />
          <span className="text-[#F8FAFC] font-bold">Closed-Bar Execution</span>
        </div>
      </div>

      {/* 2. Primary 5-Metric Simple Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
        {/* 1. Stop Loss % */}
        <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#7D8EA5] font-semibold uppercase">Stop Loss</span>
            <span className="text-[#FF3B5C] font-bold">-{exit.stop_loss_value || 1.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={50}
              value={exit.stop_loss_value || 1.0}
              onChange={(e) => onUpdateExit({ stop_loss_value: parseFloat(e.target.value) || 1.0 })}
              className="w-full bg-[#0A1422] border border-[#12304A] rounded px-2 py-1 text-xs text-[#FF3B5C] font-bold focus:outline-none focus:border-[#FF3B5C]"
            />
            <span className="text-[#7D8EA5]">%</span>
          </div>
        </div>

        {/* 2. Take Profit % */}
        <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#7D8EA5] font-semibold uppercase">Take Profit</span>
            <span className="text-[#00E89A] font-bold">+{exit.take_profit_value || 2.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={200}
              value={exit.take_profit_value || 2.0}
              onChange={(e) => onUpdateExit({ take_profit_value: parseFloat(e.target.value) || 2.0 })}
              className="w-full bg-[#0A1422] border border-[#12304A] rounded px-2 py-1 text-xs text-[#00E89A] font-bold focus:outline-none focus:border-[#00E89A]"
            />
            <span className="text-[#7D8EA5]">%</span>
          </div>
        </div>

        {/* 3. Trailing Stop Toggle */}
        <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#7D8EA5] font-semibold uppercase">Trailing Stop</span>
            <button
              type="button"
              onClick={() => onUpdateExit({ trailing_stop_enabled: !exit.trailing_stop_enabled })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                exit.trailing_stop_enabled
                  ? "bg-[#168BFF] text-white"
                  : "bg-[#0A1422] text-[#7D8EA5] border border-[#12304A]"
              }`}
            >
              {exit.trailing_stop_enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="text-[10px] text-[#7D8EA5] pt-0.5">
            {exit.trailing_stop_enabled ? "Dynamic ATR Trail" : "Fixed Stop Loss"}
          </div>
        </div>

        {/* 4. Risk / Trade % */}
        <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#7D8EA5] font-semibold uppercase">Risk / Trade</span>
            <span className="text-[#F59E0B] font-bold">{risk.risk_per_trade_pct || 1.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={10}
              value={risk.risk_per_trade_pct || 1.0}
              onChange={(e) => onUpdateRisk({ risk_per_trade_pct: parseFloat(e.target.value) || 1.0 })}
              className="w-full bg-[#0A1422] border border-[#12304A] rounded px-2 py-1 text-xs text-[#F59E0B] font-bold focus:outline-none focus:border-[#F59E0B]"
            />
            <span className="text-[#7D8EA5]">%</span>
          </div>
        </div>

        {/* 5. Risk:Reward Ratio */}
        <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#7D8EA5] font-semibold uppercase">R:R Ratio</span>
            <span className="text-[#22D3EE] font-bold">{riskRewardRatio}</span>
          </div>
          <div className="text-[10px] text-[#7D8EA5] pt-0.5">
            Expected reward ratio
          </div>
        </div>
      </div>
    </section>
  );
}
