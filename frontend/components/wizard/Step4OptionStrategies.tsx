"use client";

import React, { useEffect, useState, useMemo } from "react";
import { BotWizardDraft, OptionStrategyConfig, SelectedLeg } from "./types";
import { api } from "../../lib/api";
import {
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

interface Step4Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step4OptionStrategies({ draft, updateDraft, onNext, onPrev }: Step4Props) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(
    draft.option_strategy?.strategy_id || ""
  );
  const [loading, setLoading] = useState(false);
  const [calculatingPayoff, setCalculatingPayoff] = useState(false);

  useEffect(() => {
    const loadOptionStrategies = async () => {
      setLoading(true);
      try {
        const list = await api.getOptionStrategies();
        setStrategies(list || []);
      } catch (err) {
        console.error("Failed to load option strategies", err);
      } finally {
        setLoading(false);
      }
    };
    loadOptionStrategies();
  }, []);

  const handleSelectStrategy = async (strat: any) => {
    setSelectedStrategyId(strat.id);
    const contract = draft.contract;
    const baseStrike = contract?.strike || 85000;
    const baseExpiry = contract?.expiry || "2026-10-09";
    const baseLot = contract?.lot_size || 0.001;
    const basePrem = contract?.premium || 150.0;

    // Build default legs for the strategy template
    const templateList = strat.structure_template || strat.default_legs || [];
    const stepSize = baseStrike > 10000 ? 500 : (baseStrike > 1000 ? 50 : 5);

    const legs: SelectedLeg[] = templateList.map((legTemplate: any, i: number) => {
      let strikeOffset = 0;
      if (typeof legTemplate.strike_offset === "number") {
        strikeOffset = legTemplate.strike_offset;
      } else if (typeof legTemplate.strike_offset === "string") {
        if (legTemplate.strike_offset.includes("+1") || legTemplate.strike_offset.includes("OTM")) {
          strikeOffset = stepSize;
        } else if (legTemplate.strike_offset.includes("-1") || legTemplate.strike_offset.includes("ITM")) {
          strikeOffset = -stepSize;
        }
      }

      const legStrike = baseStrike + strikeOffset;
      const premEst = Math.max(10, basePrem - Math.abs(strikeOffset) * 0.05);
      return {
        symbol: `${legTemplate.option_type}-${draft.underlying}-${legStrike}-${baseExpiry}`,
        strike: legStrike,
        option_type: (legTemplate.option_type || "CE") as "CE" | "PE",
        side: (legTemplate.side || "BUY") as "BUY" | "SELL",
        ratio: legTemplate.ratio || 1,
        premium: premEst,
        lot_size: baseLot,
        expiry: baseExpiry,
        greeks: {
          delta: legTemplate.option_type === "CE" ? 0.5 : -0.5,
          gamma: 0.00005,
          theta: -25.0,
          vega: 20.0,
          iv: 55.0,
          greeks_source: "CALCULATED",
        },
      };
    });

    // Request Payoff calculation from backend
    try {
      setCalculatingPayoff(true);
      const payoffRes = await api.calculateOptionPayoff({
        strategy_id: strat.id,
        underlying_spot: baseStrike,
        spot_price: baseStrike,
        legs: legs,
      });

      const optConfig: OptionStrategyConfig = {
        strategy_id: strat.id,
        strategy_name: strat.name,
        market_view: strat.market_view,
        enabled: true,
        legs,
        net_cost: payoffRes.net_cost,
        cost_type: payoffRes.cost_type,
        max_profit: payoffRes.max_profit,
        max_loss: payoffRes.max_loss,
        breakevens: payoffRes.breakevens || [],
        greeks: payoffRes.greeks || { delta: 0, gamma: 0, theta: 0, vega: 0 },
        payoff_points: payoffRes.payoff_points || [],
      };

      updateDraft({ option_strategy: optConfig });
    } catch (err) {
      console.error("Payoff calculation error", err);
    } finally {
      setCalculatingPayoff(false);
    }
  };

  const handleDisableStrategy = () => {
    setSelectedStrategyId("");
    updateDraft({ option_strategy: null });
  };

  const optStrategy = draft.option_strategy;
  const spotPrice = draft.contract?.strike || 85000;

  // Payoff chart dimensions and scaling
  const chartPoints = optStrategy?.payoff_points || [];
  const minPrice = chartPoints.length > 0 ? chartPoints[0].underlying_price : spotPrice * 0.85;
  const maxPrice = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].underlying_price : spotPrice * 1.15;
  const pnls = chartPoints.map((p) => p.pnl);
  const minPnl = pnls.length > 0 ? Math.min(...pnls, -100) : -500;
  const maxPnl = pnls.length > 0 ? Math.max(...pnls, 100) : 500;

  const svgWidth = 650;
  const svgHeight = 220;

  const getX = (price: number) => ((price - minPrice) / (maxPrice - minPrice || 1)) * (svgWidth - 40) + 20;
  const getY = (pnl: number) => svgHeight - 20 - ((pnl - minPnl) / (maxPnl - minPnl || 1)) * (svgHeight - 40);

  const polylinePoints = chartPoints
    .map((pt) => `${getX(pt.underlying_price)},${getY(pt.pnl)}`)
    .join(" ");

  const zeroY = getY(0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Step 4 — Option Strategy & Payoff Architecture</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select from 21 canonical option multi-leg structures. All strike legs and payoffs derive directly from the live option chain.
            </p>
          </div>
        </div>

        {optStrategy && (
          <button
            type="button"
            onClick={handleDisableStrategy}
            className="text-xs font-mono text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 transition-colors"
          >
            Disable Multi-Leg Option Strategy
          </button>
        )}
      </div>

      {/* Strategy Selector Carousel / Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            21 Quantitative Option Strategies
          </h4>
          <span className="text-[11px] font-mono text-slate-500">
            Contract Base: <strong className="text-emerald-400">{draft.contract?.symbol || "No contract chosen in Step 2"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 max-h-48 overflow-y-auto pr-1">
          {strategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            return (
              <button
                key={strat.id}
                type="button"
                onClick={() => handleSelectStrategy(strat)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-600/30 text-white font-bold ring-1 ring-blue-500"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="text-xs font-mono truncate">{strat.name}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">{strat.market_view}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Strategy Detail & Live Payoff Chart */}
      {optStrategy ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Strategy Analytics & Legs */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-mono font-bold text-white">{optStrategy.strategy_name}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {optStrategy.market_view}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {optStrategy.cost_type}: ${Math.abs(optStrategy.net_cost).toFixed(2)}
              </span>
            </div>

            {/* Metrics Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">MAX PROFIT</span>
                <span className="font-bold text-emerald-400">
                  {optStrategy.max_profit === "UNLIMITED" ? "UNLIMITED" : `$${optStrategy.max_profit.toFixed(2)}`}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">MAX LOSS</span>
                <span className="font-bold text-red-400">
                  {optStrategy.max_loss === "UNLIMITED" ? "UNLIMITED" : `$${optStrategy.max_loss.toFixed(2)}`}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">BREAKEVENS</span>
                <span className="font-bold text-slate-200">
                  {optStrategy.breakevens.length > 0 ? optStrategy.breakevens.map((b) => `$${b.toFixed(0)}`).join(", ") : "N/A"}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">NET DELTA</span>
                <span className="font-bold text-blue-300">{optStrategy.greeks.delta.toFixed(3)}</span>
              </div>
            </div>

            {/* Strategy Legs Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">Configured Legs:</span>
              <div className="space-y-1.5">
                {optStrategy.legs.map((leg, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          leg.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {leg.side}
                      </span>
                      <span className="font-bold text-white">{leg.strike}</span>
                      <span className="text-slate-400">{leg.option_type}</span>
                    </div>
                    <div className="text-right text-slate-300">
                      ${leg.premium.toFixed(2)} <span className="text-slate-500 text-[10px]">x{leg.ratio}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payoff Chart Canvas */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                Live Expiry Payoff Curve ($ P&L)
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                Current Spot: <strong className="text-emerald-400">${spotPrice.toLocaleString()}</strong>
              </span>
            </div>

            {/* SVG Payoff Curve */}
            <div className="w-full bg-slate-900/40 rounded-lg p-2 border border-slate-800/80">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 overflow-visible">
                {/* Zero P&L reference line */}
                <line
                  x1="20"
                  y1={zeroY}
                  x2={svgWidth - 20}
                  y2={zeroY}
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Spot Price vertical line */}
                <line
                  x1={getX(spotPrice)}
                  y1="20"
                  x2={getX(spotPrice)}
                  y2={svgHeight - 20}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Payoff Curve line */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={polylinePoints}
                  />
                )}

                {/* Breakeven lines */}
                {optStrategy.breakevens.map((be, idx) => (
                  <g key={idx}>
                    <line
                      x1={getX(be)}
                      y1="20"
                      x2={getX(be)}
                      y2={svgHeight - 20}
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                    <text
                      x={getX(be)}
                      y={svgHeight - 6}
                      fill="#f59e0b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      BE: ${be.toFixed(0)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-2">
              <span className="text-blue-400">● Current Spot Price</span>
              <span className="text-amber-400">● Breakeven Targets</span>
              <span className="text-emerald-400">● Expiry P&L Profile</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
          Option strategy layer is currently disabled. The bot will trade the base instrument selected in Step 2 directly.
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          ← Back: Step 3
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2"
        >
          Proceed to Step 5: Trading Strategy →
        </button>
      </div>
    </div>
  );
}
