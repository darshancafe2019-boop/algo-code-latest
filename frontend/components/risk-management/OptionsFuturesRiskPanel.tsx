"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import {
  Layers,
  Activity,
  Zap,
  TrendingUp,
  Percent,
  Sliders,
  DollarSign,
  Shield,
  HelpCircle,
} from "lucide-react";
import { OptionsRiskItem, FuturesRiskItem } from "@/types/risk";

import { useQuery } from "@tanstack/react-query";

export function OptionsFuturesRiskPanel() {
  const [subSection, setSubSection] = useState<"options" | "strategies" | "futures">("options");

  // Dynamic query from positions endpoint
  const { data: positionsData } = useQuery({
    queryKey: ["riskDerivativesPositions"],
    queryFn: async () => {
      const res = await fetch("/api/positions");
      if (!res.ok) return [];
      const json = await res.json();
      return json.positions || json.data || [];
    },
    refetchInterval: 8000,
  });

  const rawPositions: any[] = positionsData || [];
  const optionsList: OptionsRiskItem[] = rawPositions
    .filter((p) => (p.asset_class || "").toUpperCase().includes("OPTION") || p.strike || p.option_type)
    .map((p, idx) => ({
      underlying: p.underlying || p.symbol?.split(" ")[0] || p.symbol,
      expiry: p.expiry || "-",
      strike: p.strike || 0,
      option_type: (p.option_type || (p.symbol?.includes("PE") ? "PUT" : "CALL")).toUpperCase() as any,
      quantity: p.quantity || p.size || 1,
      premium: p.entry_price || p.current_price || p.premium || 0,
      iv: p.iv || 0,
      delta: p.delta || 0,
      gamma: p.gamma || 0,
      theta: p.theta || 0,
      vega: p.vega || 0,
      open_interest: p.open_interest || 0,
      margin: p.margin_used || p.position_value || 0,
      max_profit: p.max_profit || 0,
      max_loss: p.max_loss || p.risk_amount || 0,
      breakeven: p.breakeven || 0,
    }));

  const futuresList: FuturesRiskItem[] = rawPositions
    .filter((p) => (p.asset_class || "").toUpperCase().includes("FUTUR") || (p.asset_class || "").toUpperCase().includes("PERP"))
    .map((p) => ({
      contract: p.symbol || "FUT-CONTRACT",
      expiry: p.expiry || "PERPETUAL",
      quantity: p.quantity || p.size || 1,
      entry_price: p.entry_price || 0,
      current_price: p.current_price || p.mark_price || p.entry_price || 0,
      notional: p.position_value || (p.quantity * (p.current_price || p.entry_price || 0)),
      margin: p.margin_used || 0,
      leverage: p.leverage || 1,
      funding_rate_pct: p.funding_rate || 0,
      open_interest: p.open_interest || 0,
      liquidation_buffer_pct: p.liquidation_buffer_pct || 0,
      stop_loss: p.stop_loss || 0,
      max_loss: p.risk_amount || 0,
    }));

  const netGreeks = {
    net_delta: Number(optionsList.reduce((acc, o) => acc + (o.delta * o.quantity), 0).toFixed(2)),
    net_gamma: Number(optionsList.reduce((acc, o) => acc + (o.gamma * o.quantity), 0).toFixed(4)),
    net_theta: Number(optionsList.reduce((acc, o) => acc + (o.theta * o.quantity), 0).toFixed(2)),
    net_vega: Number(optionsList.reduce((acc, o) => acc + (o.vega * o.quantity), 0).toFixed(2)),
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Derivatives, Greeks & Multi-Leg Risk Hub
          </h3>
          <p className="text-[11px] text-[#7C8CA3]">
            Analytical Black-Scholes Greeks, payoff horizons, and futures leverage cushions.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#07101A] p-1 rounded-xl border border-[#122033] text-xs font-mono">
          <button
            onClick={() => setSubSection("options")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "options"
                ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                : "text-[#7C8CA3] hover:text-white"
            }`}
          >
            Options Greeks
          </button>
          <button
            onClick={() => setSubSection("strategies")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "strategies"
                ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                : "text-[#7C8CA3] hover:text-white"
            }`}
          >
            Multi-Leg Risk
          </button>
          <button
            onClick={() => setSubSection("futures")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "futures"
                ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                : "text-[#7C8CA3] hover:text-white"
            }`}
          >
            Futures & Perps
          </button>
        </div>
      </div>

      {/* Portfolio Net Greeks Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-[#0A1422] border border-[#122033]">
          <span className="text-[10px] text-[#52627A] uppercase font-bold block">Portfolio Net Delta (Δ)</span>
          <span className="text-base font-bold text-[#22D3EE]">{netGreeks.net_delta > 0 ? "+" : ""}{netGreeks.net_delta}</span>
          <span className="text-[10px] text-[#52627A] block">Mildly Bullish Bias</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0A1422] border border-[#122033]">
          <span className="text-[10px] text-[#52627A] uppercase font-bold block">Portfolio Net Gamma (Γ)</span>
          <span className="text-base font-bold text-cyan-300">+{netGreeks.net_gamma}</span>
          <span className="text-[10px] text-[#52627A] block">Positive Convexity</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0A1422] border border-[#122033]">
          <span className="text-[10px] text-[#52627A] uppercase font-bold block">Daily Theta Decay (Θ)</span>
          <span className="text-base font-bold text-red-400">{netGreeks.net_theta} / day</span>
          <span className="text-[10px] text-[#52627A] block">Time Value Erosion</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0A1422] border border-[#122033]">
          <span className="text-[10px] text-[#52627A] uppercase font-bold block">Vega Exposure (ν)</span>
          <span className="text-base font-bold text-purple-300">+{netGreeks.net_vega} / 1% IV</span>
          <span className="text-[10px] text-[#52627A] block">Long Volatility Benefit</span>
        </div>
      </div>

      {/* Sub-Section 1: Options Positions & Greeks Table */}
      {subSection === "options" && (
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#52627A] text-[10px] uppercase tracking-wider border-b border-[#122033]">
                <tr>
                  <th className="py-3 px-4">Contract</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Premium / IV</th>
                  <th className="py-3 px-3">Delta (Δ)</th>
                  <th className="py-3 px-3">Theta (Θ)</th>
                  <th className="py-3 px-3">Vega (ν)</th>
                  <th className="py-3 px-3">Margin Req</th>
                  <th className="py-3 px-3">Max Loss</th>
                  <th className="py-3 px-4 text-right">Breakeven</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#122033]/60 text-slate-200">
                {optionsList.map((opt, idx) => (
                  <tr key={idx} className="hover:bg-[rgba(37,99,235,0.18)]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{opt.underlying} {opt.strike}</span>
                      <span className="text-[10px] text-[#52627A] block">{opt.expiry}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          opt.option_type === "CALL"
                            ? "bg-emerald-950 text-[#22D3EE] border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {opt.option_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-white block">${opt.premium.toFixed(2)}</span>
                      <span className="text-[10px] text-cyan-300 block">{opt.iv}% IV</span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#22D3EE]">{opt.delta.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-red-400">${opt.theta.toFixed(1)}/d</td>
                    <td className="py-3.5 px-3 text-purple-300">${opt.vega.toFixed(1)}</td>
                    <td className="py-3.5 px-3 text-white">{formatMoney(opt.margin, "$")}</td>
                    <td className="py-3.5 px-3 text-red-400 font-bold">{formatMoney(opt.max_loss, "$")}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {formatMoney(opt.breakeven, "$")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Section 2: Multi-Leg Strategy Risk */}
      {subSection === "strategies" && (
        <div className="p-4 rounded-2xl bg-[#0A1422] border border-[#122033] space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#122033] pb-2.5">
            Pre-Defined Quantitative Multi-Leg Strategies & Risk Profiles
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#07101A] border border-[#122033] space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>NIFTY Iron Condor (Range-Bound)</span>
                <span className="text-[#22D3EE]">Max Risk: $900</span>
              </div>
              <p className="text-[11px] text-[#7C8CA3]">
                Short 24500 CE / Long 24700 CE + Short 24200 PE / Long 24000 PE
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-[#52627A]">
                <div>Max Profit: <strong className="text-[#22D3EE]">$600</strong></div>
                <div>Margin: <strong className="text-white">$1,500</strong></div>
                <div>R:R: <strong className="text-cyan-300">1:1.5</strong></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#07101A] border border-[#122033] space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>BTC Bull Call Spread</span>
                <span className="text-[#22D3EE]">Max Risk: $800</span>
              </div>
              <p className="text-[11px] text-[#7C8CA3]">
                Long 65000 CE ($1,200) + Short 68000 CE ($400)
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-[#52627A]">
                <div>Max Profit: <strong className="text-[#22D3EE]">$2,200</strong></div>
                <div>Margin: <strong className="text-white">$800</strong></div>
                <div>R:R: <strong className="text-cyan-300">1:2.75</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Section 3: Futures & Perps */}
      {subSection === "futures" && (
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#52627A] text-[10px] uppercase tracking-wider border-b border-[#122033]">
                <tr>
                  <th className="py-3 px-4">Contract / Asset</th>
                  <th className="py-3 px-3">Position / Notional</th>
                  <th className="py-3 px-3">Leverage & Margin</th>
                  <th className="py-3 px-3">Funding Rate</th>
                  <th className="py-3 px-3">Liquidation Cushion</th>
                  <th className="py-3 px-4 text-right">Max Risk / SL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#122033]/60 text-slate-200">
                {futuresList.map((fut, idx) => (
                  <tr key={idx} className="hover:bg-[rgba(37,99,235,0.18)]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{fut.contract}</span>
                      <span className="text-[10px] text-[#52627A] block">{fut.expiry}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-white block">{fut.quantity} BTC ({formatMoney(fut.notional, "$")})</span>
                      <span className="text-[10px] text-[#52627A] block">Mark: {formatMoney(fut.current_price, "$")}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-cyan-300 font-bold block">{fut.leverage}x Leverage</span>
                      <span className="text-[10px] text-[#52627A] block">Margin: ${fut.margin.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#22D3EE] font-bold">
                      +{fut.funding_rate_pct}% / 8h
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
                        {fut.liquidation_buffer_pct}% Buffer
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-red-400 font-bold block">${fut.max_loss.toFixed(2)}</span>
                      <span className="text-[10px] text-[#52627A] block">SL: {formatMoney(fut.stop_loss, "$")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
