"use client";

import React, { useState } from "react";
import {
  Activity,
  Play,
  Calendar,
  DollarSign,
  Percent,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Zap,
  Radio,
  Sliders,
  Shield,
  HelpCircle,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeObservation,
  BacktestResultPayload,
} from "@/types/strategy-ide";
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

interface StrategyTestingDrawerProps {
  strategy: StrategyIdeDefinition;
  liveObservation: StrategyIdeObservation | null;
  isObserving: boolean;
  onRunLiveObservation: () => void;
  backtestResult: BacktestResultPayload | null;
  isBacktesting: boolean;
  onRunBacktest: (params: {
    startDate: string;
    endDate: string;
    capital: number;
    feesPct: number;
    slippagePct: number;
  }) => void;
}

export function StrategyTestingDrawer({
  strategy,
  liveObservation,
  isObserving,
  onRunLiveObservation,
  backtestResult,
  isBacktesting,
  onRunBacktest,
}: StrategyTestingDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"LIVE_OBSERVE" | "BACKTEST" | "WALK_FORWARD" | "PAPER">("BACKTEST");

  // Backtest parameters
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-08-25");
  const [capital, setCapital] = useState(strategy.risk?.capital || 10000);
  const [feesPct, setFeesPct] = useState(0.1);
  const [slippagePct, setSlippagePct] = useState(0.05);

  // Walk-forward split parameters
  const [trainWindowMonths, setTrainWindowMonths] = useState(6);
  const [testWindowMonths, setTestWindowMonths] = useState(2);
  const [optimizationMode, setOptimizationMode] = useState<"GRID" | "RANDOM">("GRID");

  const handleStartBacktest = () => {
    onRunBacktest({
      startDate,
      endDate,
      capital,
      feesPct,
      slippagePct,
    });
  };

  // Rule count for overfitting check
  const totalRules =
    (strategy.entry?.setup?.rules?.length || 0) +
    (strategy.entry?.confirmation?.rules?.length || 0) +
    (strategy.entry?.trigger?.rules?.length || 0);

  const isHighOverfittingRisk = totalRules > 8;

  return (
    <section className="bg-[#0A1422] border border-[#12304A] rounded-xl shadow-lg overflow-hidden font-sans select-none transition-all text-xs">
      {/* Drawer Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#07111F] border-b border-[#12304A]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              Research, Simulation & Backtest Lab
            </h3>
            <p className="text-[10px] text-[#7D8EA5]">
              Deterministic Backtest Lab • Walk-Forward Windows • Paper Stream
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("BACKTEST");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "BACKTEST" && isOpen
                ? "bg-[#168BFF] text-white font-bold"
                : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0C1727]"
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Backtest Lab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("WALK_FORWARD");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "WALK_FORWARD" && isOpen
                ? "bg-[#7C3AED] text-white font-bold"
                : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0C1727]"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Walk-Forward</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("PAPER");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "PAPER" && isOpen
                ? "bg-[#00E89A] text-[#05101A] font-bold"
                : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0C1727]"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Paper Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC]"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* TAB 1: BACKTEST LAB */}
          {activeTab === "BACKTEST" && (
            <div className="space-y-4 font-sans">
              {/* Backtest Parameters Form */}
              <div className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Capital ($ / ₹)</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 10000)}
                    className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Broker Fees %</label>
                  <input
                    type="number"
                    step={0.01}
                    value={feesPct}
                    onChange={(e) => setFeesPct(parseFloat(e.target.value) || 0.1)}
                    className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <QosButton
                    variant="primary"
                    size="md"
                    onClick={handleStartBacktest}
                    isLoading={isBacktesting}
                    className="w-full h-8 gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Run Backtest</span>
                  </QosButton>
                </div>
              </div>

              {/* Overfitting Warning Badge */}
              {isHighOverfittingRisk && (
                <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center gap-2 text-xs text-[#F59E0B]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Overfitting Warning: Strategy has {totalRules} rules. High rule density risks curve-fitting historical noise.
                  </span>
                </div>
              )}

              {/* Backtest Results Grid */}
              {backtestResult && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Total Return</span>
                      <span className="text-base font-bold text-[#00E89A]">
                        +{backtestResult.metrics.return_pct}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Win Rate</span>
                      <span className="text-base font-bold text-[#F8FAFC]">
                        {backtestResult.metrics.win_rate_pct}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Profit Factor</span>
                      <span className="text-base font-bold text-[#22D3EE]">
                        {backtestResult.metrics.profit_factor}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Max Drawdown</span>
                      <span className="text-base font-bold text-[#FF3B5C]">
                        -{backtestResult.metrics.max_drawdown_pct}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Sharpe Ratio</span>
                      <span className="text-base font-bold text-[#F8FAFC]">
                        {backtestResult.metrics.sharpe_ratio}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A]">
                      <span className="text-[10px] text-[#7D8EA5] block">Total Trades</span>
                      <span className="text-base font-bold text-[#F8FAFC]">
                        {backtestResult.metrics.total_trades}
                      </span>
                    </div>
                  </div>

                  {/* Trade Log Table */}
                  <div className="rounded-lg border border-[#12304A] bg-[#0C1727] overflow-hidden">
                    <div className="p-2 bg-[#07111F] border-b border-[#12304A] text-[10px] uppercase text-[#7D8EA5] font-bold">
                      Recent Simulated Trade Executions
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#12304A] text-[10px] text-[#7D8EA5]">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Side</th>
                            <th className="p-2">Entry</th>
                            <th className="p-2">Exit</th>
                            <th className="p-2">Return</th>
                            <th className="p-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#12304A] text-[11px]">
                          {backtestResult.trades.map((tr) => (
                            <tr key={tr.trade_id} className="hover:bg-[#111D30]">
                              <td className="p-2 text-[#7D8EA5]">#{tr.trade_id}</td>
                              <td className="p-2">
                                <span className={tr.side === "LONG" ? "text-[#00E89A]" : "text-[#FF3B5C]"}>
                                  {tr.side}
                                </span>
                              </td>
                              <td className="p-2 text-[#F8FAFC]">${tr.entry_price.toLocaleString()}</td>
                              <td className="p-2 text-[#F8FAFC]">${tr.exit_price.toLocaleString()}</td>
                              <td className="p-2">
                                <span className={tr.return_pct >= 0 ? "text-[#00E89A] font-bold" : "text-[#FF3B5C] font-bold"}>
                                  {tr.return_pct >= 0 ? `+${tr.return_pct}%` : `${tr.return_pct}%`}
                                </span>
                              </td>
                              <td className="p-2 text-[#7D8EA5]">{tr.exit_reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WALK-FORWARD TESTING */}
          {activeTab === "WALK_FORWARD" && (
            <div className="space-y-3 font-sans text-xs">
              <div className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#7C3AED]" />
                    <h4 className="text-xs font-bold text-[#F8FAFC] uppercase">Walk-Forward Out-of-Sample Matrix</h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#22D3EE]">Cross-Validation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-[#7D8EA5] block mb-1">In-Sample Training (Months)</label>
                    <input
                      type="number"
                      value={trainWindowMonths}
                      onChange={(e) => setTrainWindowMonths(parseInt(e.target.value) || 6)}
                      className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7D8EA5] block mb-1">Out-of-Sample Test (Months)</label>
                    <input
                      type="number"
                      value={testWindowMonths}
                      onChange={(e) => setTestWindowMonths(parseInt(e.target.value) || 2)}
                      className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7D8EA5] block mb-1">Optimization Search</label>
                    <select
                      value={optimizationMode}
                      onChange={(e) => setOptimizationMode(e.target.value as any)}
                      className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-[#22D3EE] font-bold"
                    >
                      <option value="GRID">Grid Search</option>
                      <option value="RANDOM">Random Search (Monte Carlo)</option>
                    </select>
                  </div>
                </div>

                {/* Sample Walk-forward Window Results */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">In-Sample Return</span>
                    <span className="text-[#00E89A] font-bold">+24.2%</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">Out-of-Sample Return</span>
                    <span className="text-[#22D3EE] font-bold">+18.4%</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">WFO Efficiency</span>
                    <span className="text-[#00E89A] font-bold">76.0% (Robust)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAPER FORWARD TEST STREAM */}
          {activeTab === "PAPER" && (
            <div className="space-y-3 font-sans text-xs">
              <div className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#00E89A]" />
                    <h4 className="text-xs font-bold text-[#F8FAFC] uppercase">Realtime Paper Forward Testing Stream</h4>
                  </div>
                  <QosBadge status="PAPER" dot={true} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">Paper Unrealized PnL</span>
                    <span className="text-[#00E89A] font-bold">+$142.50 (+1.4%)</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">Simulated Fills</span>
                    <span className="text-[#F8FAFC] font-bold">12 Orders</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">Max Drawdown</span>
                    <span className="text-[#FF3B5C] font-bold">-0.8%</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#07111F] border border-[#12304A]">
                    <span className="text-[#7D8EA5] text-[10px] block">Risk Invariant</span>
                    <span className="text-[#00E89A] font-bold">ARMED (0 Violations)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
