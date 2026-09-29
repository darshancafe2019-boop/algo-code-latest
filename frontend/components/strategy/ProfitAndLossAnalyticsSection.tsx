"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Percent,
  HelpCircle,
  Download,
  Copy,
  Check,
  Calculator,
  Activity,
  DollarSign,
  AlertTriangle,
  Flame,
  BarChart2,
  Sparkles,
  Layers,
} from "lucide-react";
import { ComprehensiveProfitMetrics, ScenarioRow } from "@/lib/derivatives/profitEngine";
import { SetupQualityEvaluation } from "@/lib/derivatives/setupQualityEngine";
import { FormulaTransparencyModal } from "./FormulaTransparencyModal";
import { ScenarioAnalysisGrid } from "./ScenarioAnalysisGrid";

interface ProfitAndLossAnalyticsSectionProps {
  metrics: ComprehensiveProfitMetrics;
  scenarios: ScenarioRow[];
  quality: SetupQualityEvaluation;
  strategyName: string;
  currency: string;
  onCustomPriceChange?: (price: number) => void;
  customPrice?: number;
}

export const ProfitAndLossAnalyticsSection: React.FC<ProfitAndLossAnalyticsSectionProps> = ({
  metrics,
  scenarios,
  quality,
  strategyName,
  currency,
  onCustomPriceChange,
  customPrice,
}) => {
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"kpi" | "scenario" | "quality" | "greeks">("kpi");

  const handleCopySummary = () => {
    const summary = `QUANT.OS Strategy Analysis: ${strategyName}
- Net Premium: ${currency} ${metrics.netPremiumFlow.toLocaleString()}
- Max Profit: ${metrics.isUnlimitedProfit || metrics.maxProfit === null ? "UNLIMITED" : `${currency} ${metrics.maxProfit?.toLocaleString()}`}
- Max Loss: ${metrics.maxLoss === null ? "UNDEFINED RISK" : `${currency} ${metrics.maxLoss?.toLocaleString()}`}
- Breakeven(s): ${metrics.breakevenPoints.join(", ")}
- Reward / Risk: ${metrics.rewardToRiskRatio}:1
- Margin Required: ${currency} ${metrics.marginRequired.toLocaleString()}
- Setup Quality: ${quality.overallScore}/100 (${quality.grade})`;

    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const data = {
      strategyName,
      metrics,
      quality,
      scenarios,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategyName.toLowerCase().replace(/\s+/g, "_")}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    let csv = "Scenario,Underlying Price,P&L At Expiry,P&L 1d Before,ROI %,Status\n";
    scenarios.forEach((s) => {
      csv += `"${s.scenario}",${s.underlyingPrice},${s.pnlAtExpiry},${s.pnl1dBefore},${s.roiPct}%,"${s.riskStatus}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategyName.toLowerCase().replace(/\s+/g, "_")}_scenarios.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0B1118] border border-[#1E293B] rounded-2xl p-5 shadow-xl">
      {/* Header & Subtabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <span>Profit & Risk Intelligence Center</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  metrics.isDefinedRisk
                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                }`}
              >
                {metrics.riskLabel}
              </span>
            </h3>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              Exact mathematical payoff, capital requirement, and multi-horizon scenario matrix
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFormulaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#334155] hover:border-[#38BDF8]/50 text-xs font-mono font-semibold rounded-xl transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Formula Details
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-white/10 text-[#E2E8F0] border border-[#334155] text-xs font-mono rounded-xl transition-all"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? "Copied" : "Copy"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-white/10 text-[#E2E8F0] border border-[#334155] text-xs font-mono rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 border-b border-[#1E293B]/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("kpi")}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
            activeTab === "kpi"
              ? "bg-[#38BDF8] text-black font-bold shadow-md"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Payoff & Capital KPIs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scenario")}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
            activeTab === "scenario"
              ? "bg-[#38BDF8] text-black font-bold shadow-md"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Scenario Grid (-20% to +20%)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quality")}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
            activeTab === "quality"
              ? "bg-[#38BDF8] text-black font-bold shadow-md"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Setup Quality ({quality.overallScore}/100)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("greeks")}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
            activeTab === "greeks"
              ? "bg-[#38BDF8] text-black font-bold shadow-md"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Net Portfolio Greeks
        </button>
      </div>

      {/* Tab 1: KPI Cards */}
      {activeTab === "kpi" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
          {/* Net Premium Flow */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Net Premium Flow</span>
              <DollarSign className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <div
              className={`text-lg font-mono font-bold mt-1 ${
                metrics.netPremiumFlow >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {metrics.netPremiumFlow >= 0 ? "+" : ""}
              {currency} {metrics.netPremiumFlow.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              {metrics.netPremiumFlow >= 0 ? "Net Credit Collected" : "Net Debit Paid"}
            </div>
          </div>

          {/* Max Profit */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Max Theoretical Profit</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div className="text-lg font-mono font-bold text-[#10B981] mt-1">
              {metrics.isUnlimitedProfit || metrics.maxProfit === null
                ? "UNLIMITED"
                : `${currency} ${metrics.maxProfit?.toLocaleString()}`}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              {metrics.isUnlimitedProfit ? "Open-ended directional upside" : "Capped at upper strike"}
            </div>
          </div>

          {/* Max Loss */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Max Risk / Max Loss</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
            </div>
            <div className="text-lg font-mono font-bold text-[#EF4444] mt-1">
              {metrics.maxLoss === null ? "UNDEFINED RISK" : `${currency} ${metrics.maxLoss?.toLocaleString()}`}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              {metrics.isDefinedRisk ? "Strictly capped by debit / spread" : "Naked short exposure"}
            </div>
          </div>

          {/* Breakevens */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Breakeven Price(s)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <div className="text-base font-mono font-bold text-white mt-1 truncate">
              {metrics.breakevenPoints.length > 0
                ? metrics.breakevenPoints.map((b) => `${currency} ${b}`).join(", ")
                : "N/A"}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              Reward / Risk: {metrics.rewardToRiskRatio}:1
            </div>
          </div>

          {/* Capital & Margins */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">Required Margin</div>
            <div className="text-lg font-mono font-bold text-white mt-1">
              {currency} {metrics.marginRequired.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              Broker / Exchange margin allocation
            </div>
          </div>

          {/* Estimated Transaction Costs */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">Total Est. Costs</div>
            <div className="text-lg font-mono font-bold text-[#F59E0B] mt-1">
              {currency} {metrics.totalTransactionCosts.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">
              Brokerage + Taxes + Slippage
            </div>
          </div>

          {/* Modelled Expected Value */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">Expected Value (EV)</div>
            <div
              className={`text-lg font-mono font-bold mt-1 ${
                metrics.expectedValue >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {metrics.expectedValue >= 0 ? "+" : ""}
              {currency} {metrics.expectedValue.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">Modelled probabilistic expectancy</div>
          </div>

          {/* Setup Quality Score */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Setup Quality</span>
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <div className="text-lg font-mono font-bold text-[#38BDF8] mt-1 flex items-center gap-2">
              <span>{quality.overallScore} / 100</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8]">{quality.grade}</span>
            </div>
            <div className="text-[10px] font-mono text-[#64748B] mt-1">{quality.compatibility}</div>
          </div>
        </div>
      )}

      {/* Tab 2: Scenario Analysis Grid */}
      {activeTab === "scenario" && (
        <ScenarioAnalysisGrid
          scenarios={scenarios}
          currency={currency}
          onCustomPriceChange={onCustomPriceChange}
          customPrice={customPrice}
        />
      )}

      {/* Tab 3: Setup Quality Breakdown */}
      {activeTab === "quality" && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
              Transparent Quality Dimensions (0–100)
            </span>
            <span className="text-[11px] font-mono text-[#38BDF8]">
              Composite Score: {quality.overallScore}/100 ({quality.grade})
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(quality.dimensionSummaries).map(([dim, summary]) => (
              <div key={dim} className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                <div className="text-[11px] text-[#94A3B8] font-mono font-semibold">{dim}</div>
                <div className="text-xs font-mono font-bold text-white mt-1">{summary}</div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#64748B] font-mono italic leading-relaxed pt-2 border-t border-[#1E293B]">
            {quality.disclaimer}
          </p>
        </div>
      )}

      {/* Tab 4: Net Greeks */}
      {activeTab === "greeks" && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 mt-4">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
            Strategy Aggregate Net Greeks
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="text-[11px] text-[#94A3B8] font-mono">Net Delta (Δ)</div>
              <div className="text-base font-mono font-bold text-white mt-1">{metrics.netDelta.toFixed(4)}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Price sensitivity per ₹1 / $1 move</div>
            </div>
            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="text-[11px] text-[#94A3B8] font-mono">Net Gamma (Γ)</div>
              <div className="text-base font-mono font-bold text-white mt-1">{metrics.netGamma.toFixed(6)}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Delta acceleration rate</div>
            </div>
            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="text-[11px] text-[#94A3B8] font-mono">Net Theta (Θ)</div>
              <div className="text-base font-mono font-bold text-white mt-1">{metrics.netTheta.toFixed(4)}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Time decay P&L per day</div>
            </div>
            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="text-[11px] text-[#94A3B8] font-mono">Net Vega (ν)</div>
              <div className="text-base font-mono font-bold text-white mt-1">{metrics.netVega.toFixed(4)}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Sensitivity per 1% IV change</div>
            </div>
          </div>
        </div>
      )}

      {/* Formula Transparency Modal */}
      <FormulaTransparencyModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        metrics={metrics}
        strategyName={strategyName}
      />
    </div>
  );
};
