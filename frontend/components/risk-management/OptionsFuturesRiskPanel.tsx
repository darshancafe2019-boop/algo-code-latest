"use client";

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

export function OptionsFuturesRiskPanel() {
  const [subSection, setSubSection] = useState<"options" | "strategies" | "futures">("options");

  // Mock Active Options Positions & Greeks
  const optionsList: OptionsRiskItem[] = [
    {
      underlying: "NIFTY",
      expiry: "24-SEP-2026",
      strike: 24500,
      option_type: "CALL",
      quantity: 50,
      premium: 165.0,
      iv: 14.8,
      delta: 0.54,
      gamma: 0.0018,
      theta: -12.4,
      vega: 24.5,
      open_interest: 2450000,
      margin: 8250.0,
      max_profit: 999999, // Unlimited
      max_loss: 8250.0,
      breakeven: 24665.0,
    },
    {
      underlying: "BTC",
      expiry: "27-SEP-2026",
      strike: 66000,
      option_type: "PUT",
      quantity: 1,
      premium: 1420.0,
      iv: 48.2,
      delta: -0.38,
      gamma: 0.00004,
      theta: -45.2,
      vega: 65.8,
      open_interest: 450,
      margin: 1420.0,
      max_profit: 64580.0,
      max_loss: 1420.0,
      breakeven: 64580.0,
    },
  ];

  const netGreeks = {
    net_delta: +0.16,
    net_gamma: +0.00184,
    net_theta: -57.60,
    net_vega: +90.30,
  };

  const futuresList: FuturesRiskItem[] = [
    {
      contract: "BTC-PERP (Binance)",
      expiry: "PERPETUAL",
      quantity: 0.05,
      entry_price: 64200.0,
      current_price: 65420.0,
      notional: 3271.0,
      margin: 327.1,
      leverage: 10.0,
      funding_rate_pct: 0.01,
      open_interest: 48200,
      liquidation_buffer_pct: 88.5,
      stop_loss: 63200.0,
      max_loss: 50.0,
    },
  ];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Derivatives, Greeks & Multi-Leg Risk Hub
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Analytical Black-Scholes Greeks, payoff horizons, and futures leverage cushions.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
          <button
            onClick={() => setSubSection("options")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "options"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Options Greeks
          </button>
          <button
            onClick={() => setSubSection("strategies")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "strategies"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Multi-Leg Risk
          </button>
          <button
            onClick={() => setSubSection("futures")}
            className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
              subSection === "futures"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Futures & Perps
          </button>
        </div>
      </div>

      {/* Portfolio Net Greeks Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Portfolio Net Delta (Δ)</span>
          <span className="text-base font-bold text-[#55C98A]">{netGreeks.net_delta > 0 ? "+" : ""}{netGreeks.net_delta}</span>
          <span className="text-[10px] text-[#70877A] block">Mildly Bullish Bias</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Portfolio Net Gamma (Γ)</span>
          <span className="text-base font-bold text-cyan-300">+{netGreeks.net_gamma}</span>
          <span className="text-[10px] text-[#70877A] block">Positive Convexity</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Daily Theta Decay (Θ)</span>
          <span className="text-base font-bold text-red-400">{netGreeks.net_theta} / day</span>
          <span className="text-[10px] text-[#70877A] block">Time Value Erosion</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Vega Exposure (ν)</span>
          <span className="text-base font-bold text-purple-300">+{netGreeks.net_vega} / 1% IV</span>
          <span className="text-[10px] text-[#70877A] block">Long Volatility Benefit</span>
        </div>
      </div>

      {/* Sub-Section 1: Options Positions & Greeks Table */}
      {subSection === "options" && (
        <div className="bg-[#0D1914] border border-[#294238] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
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
              <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
                {optionsList.map((opt, idx) => (
                  <tr key={idx} className="hover:bg-[#123C2A]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{opt.underlying} {opt.strike}</span>
                      <span className="text-[10px] text-[#70877A] block">{opt.expiry}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          opt.option_type === "CALL"
                            ? "bg-emerald-950 text-[#55C98A] border border-emerald-800"
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
                    <td className="py-3.5 px-3 font-bold text-[#55C98A]">{opt.delta.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-red-400">${opt.theta.toFixed(1)}/d</td>
                    <td className="py-3.5 px-3 text-purple-300">${opt.vega.toFixed(1)}</td>
                    <td className="py-3.5 px-3 text-white">${opt.margin.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-red-400 font-bold">${opt.max_loss.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      ${opt.breakeven.toLocaleString()}
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
        <div className="p-4 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1B3328] pb-2.5">
            Pre-Defined Quantitative Multi-Leg Strategies & Risk Profiles
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>NIFTY Iron Condor (Range-Bound)</span>
                <span className="text-[#55C98A]">Max Risk: $900</span>
              </div>
              <p className="text-[11px] text-[#A8BDB0]">
                Short 24500 CE / Long 24700 CE + Short 24200 PE / Long 24000 PE
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-[#70877A]">
                <div>Max Profit: <strong className="text-[#55C98A]">$600</strong></div>
                <div>Margin: <strong className="text-white">$1,500</strong></div>
                <div>R:R: <strong className="text-cyan-300">1:1.5</strong></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>BTC Bull Call Spread</span>
                <span className="text-[#55C98A]">Max Risk: $800</span>
              </div>
              <p className="text-[11px] text-[#A8BDB0]">
                Long 65000 CE ($1,200) + Short 68000 CE ($400)
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-[#70877A]">
                <div>Max Profit: <strong className="text-[#55C98A]">$2,200</strong></div>
                <div>Margin: <strong className="text-white">$800</strong></div>
                <div>R:R: <strong className="text-cyan-300">1:2.75</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Section 3: Futures & Perps */}
      {subSection === "futures" && (
        <div className="bg-[#0D1914] border border-[#294238] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
                <tr>
                  <th className="py-3 px-4">Contract / Asset</th>
                  <th className="py-3 px-3">Position / Notional</th>
                  <th className="py-3 px-3">Leverage & Margin</th>
                  <th className="py-3 px-3">Funding Rate</th>
                  <th className="py-3 px-3">Liquidation Cushion</th>
                  <th className="py-3 px-4 text-right">Max Risk / SL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
                {futuresList.map((fut, idx) => (
                  <tr key={idx} className="hover:bg-[#123C2A]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{fut.contract}</span>
                      <span className="text-[10px] text-[#70877A] block">{fut.expiry}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-white block">{fut.quantity} BTC (${fut.notional.toLocaleString()})</span>
                      <span className="text-[10px] text-[#70877A] block">Mark: ${fut.current_price.toLocaleString()}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-cyan-300 font-bold block">{fut.leverage}x Leverage</span>
                      <span className="text-[10px] text-[#70877A] block">Margin: ${fut.margin.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#55C98A] font-bold">
                      +{fut.funding_rate_pct}% / 8h
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
                        {fut.liquidation_buffer_pct}% Buffer
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-red-400 font-bold block">${fut.max_loss.toFixed(2)}</span>
                      <span className="text-[10px] text-[#70877A] block">SL: ${fut.stop_loss.toLocaleString()}</span>
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
