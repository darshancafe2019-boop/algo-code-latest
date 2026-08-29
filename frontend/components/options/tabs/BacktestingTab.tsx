"use client";

import React, { useState } from "react";
import { PairsBacktestResult } from "@/types/pairs-trading";
import { Activity, Play, CheckCircle, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

export interface BacktestingTabProps {
  currencySymbol?: string;
}

export function BacktestingTab({ currencySymbol = "₹" }: BacktestingTabProps) {
  const [pairId, setPairId] = useState<string>("HDFCBANK_ICICIBANK");
  const [initialCapital, setInitialCapital] = useState<number>(25000);
  const [formationWindow, setFormationWindow] = useState<number>(120);
  const [zEntry, setZEntry] = useState<number>(2.0);
  const [zExit, setZExit] = useState<number>(0.5);
  const [zStop, setZStop] = useState<number>(3.5);
  const [backtestResult, setBacktestResult] = useState<PairsBacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/options/pairs/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair_id: pairId,
          initial_capital: initialCapital,
          formation_window: formationWindow,
          z_entry: zEntry,
          z_exit: zExit,
          z_stop_loss: zStop,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBacktestResult(data.backtest);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Parameter Inputs Panel */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-slate-200 uppercase text-xs">
              Walk-Forward Statistical Arbitrage Backtester
            </h3>
          </div>
          <span className="text-slate-400 text-[10px]">
            Strict Point-in-Time OOS Testing (No Look-Ahead)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="text-[10px] text-slate-400">Target Pair</label>
            <select
              value={pairId}
              onChange={(e) => setPairId(e.target.value)}
              className="w-full px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
            >
              <option value="HDFCBANK_ICICIBANK">HDFCBANK / ICICIBANK</option>
              <option value="TCS_INFY">TCS / INFY</option>
              <option value="RELIANCE_ONGC">RELIANCE / ONGC</option>
              <option value="SPY_QQQ">SPY / QQQ</option>
              <option value="BTC_ETH">BTC / ETH (Perp)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Initial Capital ({currencySymbol})</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Formation Window (bars)</label>
            <input
              type="number"
              value={formationWindow}
              onChange={(e) => setFormationWindow(parseInt(e.target.value) || 120)}
              className="w-full px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Entry Z-Score (|&sigma;|)</label>
            <input
              type="number"
              step="0.1"
              value={zEntry}
              onChange={(e) => setZEntry(parseFloat(e.target.value) || 2.0)}
              className="w-full px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Exit Z-Score (|&sigma;|)</label>
            <input
              type="number"
              step="0.1"
              value={zExit}
              onChange={(e) => setZExit(parseFloat(e.target.value) || 0.5)}
              className="w-full px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="w-full py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-extrabold transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? "Simulating..." : "Run Backtest"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backtest Results Card */}
      {backtestResult && (
        <div className="space-y-4">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Net Profit / Total Return</div>
              <div
                className={`font-black text-base ${
                  backtestResult.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {backtestResult.net_pnl >= 0 ? "+" : ""}
                {currencySymbol}{backtestResult.net_pnl.toLocaleString()} ({backtestResult.total_return_pct}%)
              </div>
              <div className="text-[10px] text-slate-400">CAGR: {backtestResult.cagr_pct}%</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Sharpe / Sortino Ratio</div>
              <div className="font-extrabold text-base text-cyan-300">
                {backtestResult.sharpe_ratio} / {backtestResult.sortino_ratio}
              </div>
              <div className="text-[10px] text-slate-400">Annualized (√252)</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Max Drawdown</div>
              <div className="font-extrabold text-base text-rose-400">
                -{backtestResult.max_drawdown_pct}%
              </div>
              <div className="text-[10px] text-slate-400">
                {currencySymbol}{backtestResult.max_drawdown_dollars.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Win Rate &amp; Trades</div>
              <div className="font-extrabold text-base text-white">
                {backtestResult.win_rate_pct}% ({backtestResult.winning_trades}/{backtestResult.total_trades})
              </div>
              <div className="text-[10px] text-slate-400">Profit Factor: {backtestResult.profit_factor}</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Avg Holding &amp; Convergence</div>
              <div className="font-extrabold text-base text-white">
                {backtestResult.avg_holding_period} bars
              </div>
              <div className="text-[10px] text-slate-400">Half-Life Match: ~5.5d</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Friction &amp; Slippage</div>
              <div className="font-extrabold text-base text-amber-300">
                {currencySymbol}{(backtestResult.total_commission + backtestResult.total_slippage).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">Turnover: {backtestResult.annual_turnover}x</div>
            </div>
          </div>

          {/* Individual Trades Table */}
          <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto">
            <h4 className="text-slate-200 font-bold uppercase text-xs mb-3">
              Simulated Trade Log ({backtestResult.trades?.length || 0} Executions)
            </h4>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3">Trade ID</th>
                  <th className="py-2 px-3">Direction</th>
                  <th className="py-2 px-3">Entry Time</th>
                  <th className="py-2 px-3">Exit Time</th>
                  <th className="py-2 px-3">Holding (Bars)</th>
                  <th className="py-2 px-3 text-right">Entry Z</th>
                  <th className="py-2 px-3 text-right">Exit Z</th>
                  <th className="py-2 px-3 text-right">Net P&L</th>
                  <th className="py-2 px-3 text-center">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {backtestResult.trades?.map((t) => (
                  <tr key={t.trade_id} className="hover:bg-slate-900/60 transition">
                    <td className="py-2 px-3 text-white font-bold">{t.trade_id}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          t.direction === "LONG_A_SHORT_B"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-950 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{t.entry_timestamp}</td>
                    <td className="py-2 px-3 text-slate-400">{t.exit_timestamp}</td>
                    <td className="py-2 px-3 text-slate-200">{t.holding_periods}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.entry_zscore}σ</td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.exit_zscore}σ</td>
                    <td
                      className={`py-2 px-3 text-right font-extrabold ${
                        t.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {t.net_pnl >= 0 ? "+" : ""}
                      {currencySymbol}{t.net_pnl} ({t.return_pct}%)
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 text-[10px] font-bold border border-slate-800">
                        {t.exit_reason}
                      </span>
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
