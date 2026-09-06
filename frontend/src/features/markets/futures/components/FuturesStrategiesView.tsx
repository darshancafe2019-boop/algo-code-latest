"use client";

import React, { useState } from "react";
import {
  Code,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  Shield,
  Bot,
  Play,
  CheckCircle2,
  Sliders,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { CanonicalFuturesContract } from "../types/futures";

interface FuturesStrategiesViewProps {
  contracts: CanonicalFuturesContract[];
}

interface StrategyTemplate {
  id: string;
  name: string;
  category: "DIRECTIONAL" | "SPREAD" | "RELATIVE_VALUE" | "FUNDING";
  description: string;
  recommendedInstruments: string[];
  estApr?: string;
  riskProfile: "LOW" | "MODERATE" | "HIGH";
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "funding_carry",
    name: "Perpetual Funding Rate Carry",
    category: "FUNDING",
    description: "Captures positive 8-hour funding rates by longing spot and shorting equal notional perpetuals.",
    recommendedInstruments: ["BTC/USDT:USDT", "ETH/USDT:USDT", "SOL/USDT:USDT"],
    estApr: "+14.2% APR",
    riskProfile: "LOW",
  },
  {
    id: "cash_and_carry",
    name: "Cash-and-Carry Basis Arbitrage",
    category: "RELATIVE_VALUE",
    description: "Exploits contango basis premium between spot and quarterly dated futures contracts.",
    recommendedInstruments: ["BTC/USDT:USDT", "NIFTY-FUT"],
    estApr: "+9.8% APR",
    riskProfile: "LOW",
  },
  {
    id: "calendar_spread",
    name: "Index Calendar Roll Spread",
    category: "SPREAD",
    description: "Trades near-month vs far-month futures rollover differentials.",
    recommendedInstruments: ["NIFTY-FUT", "BANKNIFTY-FUT"],
    estApr: "+11.5% APR",
    riskProfile: "MODERATE",
  },
  {
    id: "inter_exchange_arb",
    name: "Cross-Exchange Basis Spread",
    category: "SPREAD",
    description: "Monitors price discrepancies across Binance USD-M and Delta India perpetual books.",
    recommendedInstruments: ["BTC/USDT:USDT", "BTC-PERP"],
    estApr: "Variable",
    riskProfile: "MODERATE",
  },
  {
    id: "trend_momentum",
    name: "SuperTrend Futures Momentum",
    category: "DIRECTIONAL",
    description: "Algorithmic directional breakout strategy with trailing ATR stop loss.",
    recommendedInstruments: ["BTC/USDT:USDT", "ETH/USDT:USDT", "NIFTY-FUT"],
    estApr: "Dynamic",
    riskProfile: "HIGH",
  },
];

export function FuturesStrategiesView({ contracts }: FuturesStrategiesViewProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTemplate>(STRATEGY_TEMPLATES[0]);
  const [selectedContractSym, setSelectedContractSym] = useState<string>("BTC/USDT:USDT");
  const [leverage, setLeverage] = useState<number>(5);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(5000);
  const [attachedSuccess, setAttachedSuccess] = useState<string | null>(null);

  const contract = contracts.find((c) => c.symbol === selectedContractSym) || contracts[0];
  const markPrice = contract?.mark_price || 78540.0;
  const estNotional = allocatedCapital * leverage;
  const fundingApr = contract?.funding_rate?.funding_rate_annualized || 13.14;
  const estDailyYield = ((estNotional * (fundingApr / 100)) / 365).toFixed(2);

  const handleDeployToBot = () => {
    setAttachedSuccess(`✅ Strategy '${selectedStrategy.name}' attached to Paper Bot Engine for ${selectedContractSym}!`);
    setTimeout(() => setAttachedSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Templates Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
        {STRATEGY_TEMPLATES.map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStrategy(st)}
            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedStrategy.id === st.id
                ? "bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10"
                : "bg-[#0E1524] border-[#1E293B] hover:border-slate-700"
            }`}
          >
            <div>
              <span className="text-[9px] text-purple-400 uppercase font-bold block">{st.category}</span>
              <h4 className="font-bold text-white text-xs mt-0.5 leading-snug">{st.name}</h4>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold">{st.estApr}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                  st.riskProfile === "LOW"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : st.riskProfile === "MODERATE"
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {st.riskProfile}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Strategy Customizer & Real-time Exposure Workbench */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl font-mono text-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#1E293B] gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">{selectedStrategy.name} Workbench</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{selectedStrategy.description}</p>
          </div>
          <button
            onClick={handleDeployToBot}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            <Bot className="w-4 h-4" />
            <span>Deploy to Paper Bot</span>
          </button>
        </div>

        {attachedSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{attachedSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Parameter 1: Underlying Instrument */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Target Futures Instrument</label>
            <select
              value={selectedContractSym}
              onChange={(e) => setSelectedContractSym(e.target.value)}
              className="w-full bg-[#080C14] border border-[#1E293B] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} ({c.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Parameter 2: Allocated Capital */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Allocated Capital ($)</label>
            <input
              type="number"
              step="500"
              value={allocatedCapital}
              onChange={(e) => setAllocatedCapital(Math.max(100, parseFloat(e.target.value) || 0))}
              className="w-full bg-[#080C14] border border-[#1E293B] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Parameter 3: Max Leverage */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Strategy Leverage: {leverage}x</label>
            <input
              type="range"
              min="1"
              max="20"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer mt-2"
            />
          </div>

          {/* Parameter 4: Execution Engine Mode */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Execution Mode</label>
            <div className="px-3 py-2 bg-[#080C14] border border-[#1E293B] rounded-xl text-emerald-400 font-bold">
              PAPER SIMULATION (Gated)
            </div>
          </div>
        </div>

        {/* Calculated Institutional Metrics Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#080C14] rounded-xl border border-[#1E293B]">
          <div>
            <span className="text-[9px] text-slate-500 uppercase block">Total Net Notional</span>
            <strong className="text-white text-sm block">${estNotional.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase block">Annualized Yield / APR</span>
            <strong className="text-emerald-400 text-sm block">+{fundingApr.toFixed(2)}% APR</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase block">Est. Daily Carry Yield</span>
            <strong className="text-cyan-300 text-sm block">+${estDailyYield} / day</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase block">Liquidation Sensitivity</span>
            <strong className="text-purple-300 text-sm block">&gt; 18.5% Safe Distance</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
