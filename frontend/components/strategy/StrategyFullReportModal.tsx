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
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TRADES" | "EQUITY">("OVERVIEW");

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn text-xs">
      <div className="bg-[#0A1422] border border-[#12304A] rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#12304A] bg-[#07111F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC]">{strategy.name}</h2>
                <QosBadge status="INFO" dot={false}>
                  FULL QUANT REPORT
                </QosBadge>
              </div>
              <p className="text-xs text-[#7D8EA5] font-mono mt-0.5">
                {strategy.symbol} • {strategy.base_timeframe} • {strategy.direction} • {trades.length} Trades Simulated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trades.length > 0 && (
              <QosButton
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5 font-mono text-[11px]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </QosButton>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-4 py-2 bg-[#0A1422] border-b border-[#12304A] flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === "OVERVIEW"
                ? "bg-[#168BFF] text-white"
                : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TRADES")}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === "TRADES"
                ? "bg-[#168BFF] text-white"
                : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
            }`}
          >
            Trade Execution Log ({trades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EQUITY")}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === "EQUITY"
                ? "bg-[#168BFF] text-white"
                : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
            }`}
          >
            Equity Curve
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {activeTab === "OVERVIEW" && (
            <div className="space-y-4">
              {/* Primary 6 Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Net Profit</span>
                  <span className="text-xl font-bold text-[#00E89A] block mt-1">
                    +{metrics.return_pct}%
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    ${metrics.total_net_profit.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Win Rate</span>
                  <span className="text-xl font-bold text-[#F8FAFC] block mt-1">
                    {metrics.win_rate_pct}%
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    {metrics.winning_trades}W / {metrics.losing_trades}L
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Profit Factor</span>
                  <span className="text-xl font-bold text-[#22D3EE] block mt-1">
                    {metrics.profit_factor}
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    Gross Win/Loss
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Max Drawdown</span>
                  <span className="text-xl font-bold text-[#FF3B5C] block mt-1">
                    -{metrics.max_drawdown_pct}%
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    -${metrics.max_drawdown_usd.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Sharpe Ratio</span>
                  <span className="text-xl font-bold text-[#F8FAFC] block mt-1">
                    {metrics.sharpe_ratio}
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    Risk-Adjusted
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1727] border border-[#12304A]">
                  <span className="text-[10px] text-[#7D8EA5] block uppercase">Expectancy</span>
                  <span className="text-xl font-bold text-[#22D3EE] block mt-1">
                    {metrics.expectancy}R
                  </span>
                  <span className="text-[10px] text-[#7D8EA5] block mt-0.5">
                    Avg Per Trade
                  </span>
                </div>
              </div>

              {/* Secondary Metrics Table */}
              <div className="p-4 rounded-xl bg-[#0C1727] border border-[#12304A] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <span className="text-[#7D8EA5] text-[10px] block">Average Winner</span>
                  <span className="text-sm font-bold text-[#00E89A]">${metrics.avg_win}</span>
                </div>
                <div>
                  <span className="text-[#7D8EA5] text-[10px] block">Average Loser</span>
                  <span className="text-sm font-bold text-[#FF3B5C]">-${metrics.avg_loss}</span>
                </div>
                <div>
                  <span className="text-[#7D8EA5] text-[10px] block">Sortino Ratio</span>
                  <span className="text-sm font-bold text-[#F8FAFC]">{metrics.sortino_ratio}</span>
                </div>
                <div>
                  <span className="text-[#7D8EA5] text-[10px] block">Ending Equity</span>
                  <span className="text-sm font-bold text-[#00E89A]">
                    ${metrics.ending_equity.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "TRADES" && (
            <div className="rounded-xl border border-[#12304A] bg-[#0C1727] overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#07111F] border-b border-[#12304A] text-[10px] text-[#7D8EA5] uppercase">
                  <tr>
                    <th className="p-2.5">Trade</th>
                    <th className="p-2.5">Side</th>
                    <th className="p-2.5">Entry Time</th>
                    <th className="p-2.5">Entry Price</th>
                    <th className="p-2.5">Exit Time</th>
                    <th className="p-2.5">Exit Price</th>
                    <th className="p-2.5">Net PnL</th>
                    <th className="p-2.5">Return %</th>
                    <th className="p-2.5">Exit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12304A] text-[11px]">
                  {trades.map((t) => (
                    <tr key={t.trade_id} className="hover:bg-[#101B2D]">
                      <td className="p-2.5 text-[#7D8EA5]">#{t.trade_id}</td>
                      <td className="p-2.5">
                        <span className={t.side === "LONG" ? "text-[#00E89A] font-bold" : "text-[#FF3B5C] font-bold"}>
                          {t.side}
                        </span>
                      </td>
                      <td className="p-2.5 text-[#7D8EA5]">{t.entry_time}</td>
                      <td className="p-2.5 text-[#F8FAFC]">${t.entry_price.toLocaleString()}</td>
                      <td className="p-2.5 text-[#7D8EA5]">{t.exit_time}</td>
                      <td className="p-2.5 text-[#F8FAFC]">${t.exit_price.toLocaleString()}</td>
                      <td className="p-2.5">
                        <span className={t.net_pnl >= 0 ? "text-[#00E89A] font-bold" : "text-[#FF3B5C] font-bold"}>
                          {t.net_pnl >= 0 ? `+$${t.net_pnl.toFixed(2)}` : `-$${Math.abs(t.net_pnl).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={t.return_pct >= 0 ? "text-[#00E89A] font-bold" : "text-[#FF3B5C] font-bold"}>
                          {t.return_pct >= 0 ? `+${t.return_pct}%` : `${t.return_pct}%`}
                        </span>
                      </td>
                      <td className="p-2.5 text-[#7D8EA5]">{t.exit_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "EQUITY" && (
            <div className="p-4 rounded-xl bg-[#0C1727] border border-[#12304A] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F8FAFC] uppercase text-[11px]">
                  Simulated Equity Growth Curve
                </span>
                <span className="text-[10px] text-[#00E89A] font-bold">
                  Final: ${metrics.ending_equity.toLocaleString()} (+{metrics.return_pct}%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {equityCurve.map((pt, i) => (
                  <div key={i} className="p-2 rounded bg-[#0A1422] border border-[#12304A]">
                    <span className="text-[10px] text-[#7D8EA5] block">{pt.time}</span>
                    <span className="text-xs font-bold text-[#F8FAFC]">${pt.equity.toLocaleString()}</span>
                    <span className="text-[10px] text-[#FF3B5C] block mt-0.5">
                      DD: -{pt.drawdown_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
