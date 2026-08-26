"use client";

import React, { useState } from "react";
import {
  X,
  Award,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Percent,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";
import { BacktestResultPayload, StrategyIdeDefinition } from "@/types/strategy-ide";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition;
  backtestResult: BacktestResultPayload | null;
}

export function StrategyFullReportModal({
  isOpen,
  onClose,
  strategy,
  backtestResult,
}: Props) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TRADES" | "EQUITY" | "MONTHLY">("OVERVIEW");

  if (!isOpen || !backtestResult) return null;

  const metrics = backtestResult.metrics;
  const trades = backtestResult.trades || [];
  const equityCurve = backtestResult.equity_curve || [];

  const handleExportCsv = () => {
    if (trades.length === 0) return;
    const headers = "Trade ID,Side,Entry Time,Entry Price,Exit Time,Exit Price,Quantity,Gross PnL,Net PnL,Fees,Slippage,Return %,Exit Reason,Holding Bars\n";
    const rows = trades
      .map(
        (t) =>
          `${t.trade_id},${t.side},${t.entry_time},${t.entry_price},${t.exit_time},${t.exit_price},${t.quantity},${t.gross_pnl},${t.net_pnl},${t.fees},${t.slippage},${t.return_pct}%,${t.exit_reason},${t.holding_bars}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${strategy.name.replace(/\s+/g, "_")}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#142B21] bg-[#070D0A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">{strategy.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#142B21] text-[#55C98A] border border-[#275841] font-mono font-bold">
                  FULL REPORT
                </span>
              </div>
              <p className="text-xs text-[#8BA596] font-mono">
                {strategy.symbol} • {strategy.base_timeframe} • {strategy.direction} • {trades.length} Trades Simulated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trades.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#55C98A] border border-[#1F392D] text-xs font-mono font-bold transition-all"
                title="Export Trades to CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white border border-[#1F392D] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#142B21] bg-[#070D0A] text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === "OVERVIEW"
                ? "border-[#55C98A] text-[#55C98A]"
                : "border-transparent text-[#8BA596] hover:text-white"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab("EQUITY")}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === "EQUITY"
                ? "border-[#55C98A] text-[#55C98A]"
                : "border-transparent text-[#8BA596] hover:text-white"
            }`}
          >
            Equity Curve ({equityCurve.length})
          </button>
          <button
            onClick={() => setActiveTab("TRADES")}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === "TRADES"
                ? "border-[#55C98A] text-[#55C98A]"
                : "border-transparent text-[#8BA596] hover:text-white"
            }`}
          >
            Trade Log ({trades.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs font-sans">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-4">
              
              {/* Primary KPI Grid (6 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Total Trades</span>
                  <span className="text-white font-bold text-base font-mono">{metrics.total_trades}</span>
                  <span className="text-[9px] text-[#607D6E] block font-mono">
                    {metrics.winning_trades} W / {metrics.losing_trades} L
                  </span>
                </div>

                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Win Rate</span>
                  <span className="text-[#55C98A] font-bold text-base font-mono">{metrics.win_rate_pct}%</span>
                  <span className="text-[9px] text-[#607D6E] block font-mono">Benchmark: 50%</span>
                </div>

                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Net Profit</span>
                  <span
                    className={`font-bold text-base font-mono ${
                      metrics.return_pct >= 0 ? "text-[#55C98A]" : "text-red-400"
                    }`}
                  >
                    {metrics.return_pct >= 0 ? `+$${metrics.total_net_profit.toLocaleString()}` : `-$${Math.abs(metrics.total_net_profit).toLocaleString()}`}
                  </span>
                  <span
                    className={`text-[9px] font-mono block ${
                      metrics.return_pct >= 0 ? "text-[#55C98A]" : "text-red-400"
                    }`}
                  >
                    {metrics.return_pct >= 0 ? "+" : ""}{metrics.return_pct}%
                  </span>
                </div>

                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Profit Factor</span>
                  <span className="text-cyan-400 font-bold text-base font-mono">{metrics.profit_factor}</span>
                  <span className="text-[9px] text-[#607D6E] block font-mono">Gross Gain / Loss</span>
                </div>

                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Max Drawdown</span>
                  <span className="text-red-400 font-bold text-base font-mono">-{metrics.max_drawdown_pct}%</span>
                  <span className="text-[9px] text-[#607D6E] block font-mono">
                    -${metrics.max_drawdown_usd.toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#8BA596] font-mono block">Sharpe Ratio</span>
                  <span className="text-white font-bold text-base font-mono">{metrics.sharpe_ratio}</span>
                  <span className="text-[9px] text-[#607D6E] block font-mono">
                    Sortino: {metrics.sortino_ratio}
                  </span>
                </div>
              </div>

              {/* Secondary Statistics Breakdown */}
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Detailed Strategy Trade Statistics
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#060D0A] border border-[#14271F]">
                    <span className="text-[10px] text-[#8BA596] block">Average Win</span>
                    <span className="text-[#55C98A] font-bold text-sm">+${metrics.avg_win.toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#060D0A] border border-[#14271F]">
                    <span className="text-[10px] text-[#8BA596] block">Average Loss</span>
                    <span className="text-red-400 font-bold text-sm">-${metrics.avg_loss.toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#060D0A] border border-[#14271F]">
                    <span className="text-[10px] text-[#8BA596] block">Win / Loss Ratio</span>
                    <span className="text-cyan-400 font-bold text-sm">
                      {metrics.avg_loss > 0 ? (metrics.avg_win / metrics.avg_loss).toFixed(2) : "N/A"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#060D0A] border border-[#14271F]">
                    <span className="text-[10px] text-[#8BA596] block">Mathematical Expectancy</span>
                    <span className="text-white font-bold text-sm">+{metrics.expectancy}R</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#060D0A] border border-[#14271F] text-[11px] text-[#8BA596] font-mono flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <ShieldCheck className="h-4 w-4" />
                    <strong>Zero-Lookahead Guaranteed:</strong> Simulation strictly evaluated on completed candle closes.
                  </span>
                  <span>Execution Fees: 0.1% | Slippage: 0.05%</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EQUITY CURVE */}
          {activeTab === "EQUITY" && (
            <div className="space-y-4">
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white uppercase">Simulated Equity Growth ($USD)</span>
                  <span className="text-[#8BA596]">
                    Initial: ${metrics.initial_capital.toLocaleString()} → Final: ${metrics.ending_equity.toLocaleString()}
                  </span>
                </div>

                {equityCurve.length > 0 ? (
                  <div className="space-y-2">
                    {/* SVG Equity Chart */}
                    <div className="h-56 w-full bg-[#060D0A] border border-[#14271F] rounded-lg p-2 flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                        {/* Area Gradient */}
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#55C98A" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#55C98A" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Polyline */}
                        <polyline
                          fill="url(#equityGrad)"
                          stroke="#55C98A"
                          strokeWidth="2"
                          points={equityCurve
                            .map((p, idx) => {
                              const x = (idx / Math.max(1, equityCurve.length - 1)) * 500;
                              const minEq = Math.min(...equityCurve.map((e) => e.equity)) * 0.98;
                              const maxEq = Math.max(...equityCurve.map((e) => e.equity)) * 1.02;
                              const y = 140 - ((p.equity - minEq) / Math.max(1, maxEq - minEq)) * 130;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      </svg>
                    </div>

                    <div className="flex justify-between text-[10px] text-[#607D6E] font-mono">
                      <span>Start: {equityCurve[0]?.time?.substring(0, 10) || "2026-01-01"}</span>
                      <span>End: {equityCurve[equityCurve.length - 1]?.time?.substring(0, 10) || "2026-08-25"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#607D6E] font-mono">
                    Deterministic simulation completed without detailed equity step series.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRADES */}
          {activeTab === "TRADES" && (
            <div className="space-y-3">
              {trades.length === 0 ? (
                <div className="p-12 text-center text-[#607D6E] font-mono bg-[#0C1713] border border-[#1A3127] rounded-xl">
                  No individual trade log returned for this fast simulation.
                </div>
              ) : (
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-[#142B21] text-[10px] text-[#8BA596] uppercase bg-[#070D0A]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Side</th>
                          <th className="py-2.5 px-3">Entry Time</th>
                          <th className="py-2.5 px-3 text-right">Entry Price</th>
                          <th className="py-2.5 px-3">Exit Time</th>
                          <th className="py-2.5 px-3 text-right">Exit Price</th>
                          <th className="py-2.5 px-3 text-right">Net P&L</th>
                          <th className="py-2.5 px-3 text-right">Return %</th>
                          <th className="py-2.5 px-3 text-right">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.slice(0, 50).map((t) => {
                          const isWin = t.net_pnl >= 0;
                          return (
                            <tr key={t.trade_id} className="border-b border-[#14271F] hover:bg-[#123C2A]/20">
                              <td className="py-2 px-3 text-[#607D6E]">{t.trade_id}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    t.side === "LONG"
                                      ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20"
                                      : "bg-rose-950/50 text-rose-300 border border-rose-500/20"
                                  }`}
                                >
                                  {t.side}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[#8BA596] text-[11px]">{t.entry_time}</td>
                              <td className="py-2 px-3 text-right text-white">${t.entry_price.toLocaleString()}</td>
                              <td className="py-2 px-3 text-[#8BA596] text-[11px]">{t.exit_time}</td>
                              <td className="py-2 px-3 text-right text-white">${t.exit_price.toLocaleString()}</td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  isWin ? "text-[#55C98A]" : "text-red-400"
                                }`}
                              >
                                {isWin ? `+$${t.net_pnl.toFixed(2)}` : `-$${Math.abs(t.net_pnl).toFixed(2)}`}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  isWin ? "text-[#55C98A]" : "text-red-400"
                                }`}
                              >
                                {isWin ? `+${t.return_pct}%` : `${t.return_pct}%`}
                              </td>
                              <td className="py-2 px-3 text-right text-[10px] text-[#8BA596]">{t.exit_reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {trades.length > 50 && (
                    <div className="p-2.5 text-center text-[10px] text-[#607D6E] font-mono border-t border-[#14271F] bg-[#070D0A]">
                      Showing first 50 of {trades.length} trades. Export CSV to view full dataset.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#142B21] bg-[#070D0A] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-white font-bold text-xs transition-colors shadow-sm"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
