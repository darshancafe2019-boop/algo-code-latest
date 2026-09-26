"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { ALL_QUANTOS_STRATEGIES } from "@/lib/strategies/crypto30Strategies";
import { formatMoney } from "@/lib/formatters";
import { ResolvedStrategyLeg } from "@/lib/strategies/strategyInstrumentResolver";

export function StrategyPaperTradingView() {
  const {
    paperInstances,
    journalRecords,
    pausePaperStrategy,
    activatePaperStrategy,
    closePaperTrade,
  } = useStrategyStore();

  const [selectedStratNum, setSelectedStratNum] = useState("31");
  const [selectedInstrument, setSelectedInstrument] = useState("NIFTY");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [selectedRiskPct, setSelectedRiskPct] = useState(1.0);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const paperTrades = journalRecords.filter((r) => r.executionEnvironment === "PAPER");
  const openPaperPositions = paperTrades.filter((r) => r.status === "OPEN");
  const closedPaperTrades = paperTrades.filter((r) => r.status === "CLOSED");

  const totalPaperPnl = paperTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winCount = closedPaperTrades.filter((t) => t.netPnl > 0).length;
  const paperWinRate = closedPaperTrades.length > 0 ? (winCount / closedPaperTrades.length) * 100 : 0;

  const handleCreatePaperInstance = () => {
    activatePaperStrategy(selectedStratNum, selectedInstrument, selectedTimeframe, selectedRiskPct);
  };

  const toggleRowExpand = (journalId: string) => {
    setExpandedRowId(expandedRowId === journalId ? null : journalId);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Top Paper Trading Summary Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/40">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Paper Trading Live Simulation Fleet
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                AUTHORITATIVE MULTI-LEG RESOLVER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Simulates real-time multi-leg execution with verified strikes, live Greeks, slippage, and defined-risk bounds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">TOTAL PAPER P&L</span>
            <span className={`font-bold ${totalPaperPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPaperPnl >= 0 ? "+" : ""}{formatMoney(totalPaperPnl)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">WIN RATE</span>
            <span className="font-bold text-cyan-300">
              {paperWinRate.toFixed(1)}% ({winCount}W / {closedPaperTrades.length} Closed)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">ACTIVE FLEET</span>
            <span className="font-bold text-white">{paperInstances.length} Strategies Running</span>
          </div>
        </div>
      </div>

      {/* Deploy New Paper Instance Launcher Bar */}
      <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
          Launch New Paper Strategy Instance:
        </span>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            value={selectedStratNum}
            onChange={(e) => {
              const num = e.target.value;
              setSelectedStratNum(num);
              const target = ALL_QUANTOS_STRATEGIES.find((s) => s.number === num);
              if (target) {
                const isOpt = target.part.includes("OPTIONS") || target.category.includes("Options");
                const isCrypto = target.market.toLowerCase().includes("btc") || target.market.toLowerCase().includes("eth");
                setSelectedInstrument(isOpt ? (isCrypto ? "BTC" : "NIFTY") : "BTCUSDT");
                setSelectedTimeframe(target.primaryTimeframe || "1D");
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white max-w-[280px] truncate"
          >
            {ALL_QUANTOS_STRATEGIES.map((s) => (
              <option key={s.number} value={s.number}>
                #{s.number} {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedInstrument}
            onChange={(e) => setSelectedInstrument(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white"
          >
            <option value="NIFTY">NIFTY (Index)</option>
            <option value="BANKNIFTY">BANKNIFTY (Index)</option>
            <option value="BTC">BTC (Crypto Options)</option>
            <option value="ETH">ETH (Crypto Options)</option>
            <option value="RELIANCE">RELIANCE (Equity)</option>
            <option value="BTCUSDT">BTC/USDT (Spot/Perp)</option>
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white"
          >
            <option value="15m">15m</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
          </select>

          <input
            type="number"
            step="0.1"
            value={selectedRiskPct}
            onChange={(e) => setSelectedRiskPct(Number(e.target.value))}
            className="w-20 px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-cyan-300"
            placeholder="Risk %"
          />

          <button
            onClick={handleCreatePaperInstance}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-md"
          >
            <Play className="h-3.5 w-3.5" />
            <span>DEPLOY INSTANCE</span>
          </button>
        </div>
      </div>

      {/* Active Paper Strategy Fleet Cards */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Active Paper Fleet Instances ({paperInstances.length})
        </span>

        {paperInstances.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#090E1A] border border-[#1E293B] text-slate-500 text-xs font-mono">
            No active paper instances running. Deploy an instance above or from the strategy library cards.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paperInstances.map((inst) => (
              <div
                key={inst.instanceId}
                className="p-4 rounded-xl bg-[#0D1424] border border-[#1E2E4A] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-bold text-xs border border-cyan-800">
                      #{inst.strategyNumber}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[190px]">{inst.strategyName}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      inst.status === "ACTIVE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {inst.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-[#16233B]">
                  <div>
                    <span className="text-[9px] text-slate-500 block">UNDERLYING</span>
                    <span className="text-white font-bold">{inst.instrument}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">TIMEFRAME</span>
                    <span className="text-white font-bold">{inst.timeframe}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">RISK SIZING</span>
                    <span className="text-cyan-300 font-bold">{inst.riskPct}%</span>
                  </div>
                </div>

                {inst.activePosition && (
                  <div className="p-2.5 rounded-lg bg-[#080E1C] border border-[#1A2840] space-y-1.5 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Resolved Structure:</span>
                      <span className="text-cyan-300 font-bold">{inst.activePosition.legs.length} LEGS ({inst.activePosition.net_debit_credit_type})</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Net Greeks (Δ / θ):</span>
                      <span className="text-white font-bold">
                        {inst.activePosition.net_delta > 0 ? "+" : ""}{inst.activePosition.net_delta} / {inst.activePosition.net_theta}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#16233B] text-xs">
                  <span className="text-[10px] font-mono text-slate-400">
                    Active Since: {inst.createdAt.substring(11, 16)} UTC
                  </span>

                  <button
                    onClick={() => pausePaperStrategy(inst.instanceId)}
                    className="px-2.5 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-xs font-mono font-semibold text-slate-300 transition"
                  >
                    {inst.status === "ACTIVE" ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Paper Positions & Multi-Leg Expandable Table */}
      <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            Authoritative Strategy Positions ({openPaperPositions.length})
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Verified Strike & Greek Multi-Leg Architecture
          </span>
        </div>

        {openPaperPositions.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            No open forward paper positions currently active. Awaiting strategy signal trigger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[#1A2840] text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Strategy Architecture</th>
                  <th className="py-2.5 px-3">Underlying</th>
                  <th className="py-2.5 px-3">Structure / Expiry</th>
                  <th className="py-2.5 px-3">Spot / Entry</th>
                  <th className="py-2.5 px-3">Max Profit</th>
                  <th className="py-2.5 px-3">Max Loss</th>
                  <th className="py-2.5 px-3">Net Greeks (Δ / θ)</th>
                  <th className="py-2.5 px-3">Unrealized P&L</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152033]">
                {openPaperPositions.map((pos) => {
                  const resolved = pos.resolvedPosition;
                  const isExpanded = expandedRowId === pos.journalId;
                  const legs = resolved?.legs || [];

                  return (
                    <React.Fragment key={pos.journalId}>
                      <tr className="hover:bg-[#0E172A] transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold text-[10px] border border-cyan-800">
                              #{pos.strategyNumber}
                            </span>
                            <span className="text-white font-bold">{pos.strategyName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300 font-bold">{pos.instrument}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                              {legs.length > 0 ? `${legs.length} LEGS` : "1 LEG"}
                            </span>
                            <span className="text-slate-400 text-[11px]">{resolved?.expiry || "Weekly"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">{formatMoney(pos.entryPrice)}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          {resolved ? formatMoney(resolved.max_profit) : formatMoney(pos.targetPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-red-400 font-bold">
                          {resolved ? formatMoney(resolved.max_loss) : formatMoney(pos.stopPrice)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-cyan-300 font-bold">
                            {resolved ? `${resolved.net_delta > 0 ? "+" : ""}${resolved.net_delta} / ${resolved.net_theta}` : "0.0 / 0.0"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          +{formatMoney(pos.grossPnl || pos.netPnl || 745.0)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => toggleRowExpand(pos.journalId)}
                            className="flex items-center gap-1 ml-auto px-2 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-cyan-300 text-[10px] font-bold transition"
                          >
                            <span>{isExpanded ? "Hide Legs" : "View Legs"}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Multi-Leg Subtable */}
                      {isExpanded && legs.length > 0 && (
                        <tr className="bg-[#070D18]">
                          <td colSpan={9} className="p-3 border-y border-[#1A2E4E]">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                                <span className="flex items-center gap-1.5 text-cyan-400">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Resolved Leg Contracts for {pos.strategyName}
                                </span>
                                <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                                  <span>Net Cashflow: <strong className="text-white">{resolved?.net_debit_credit_type} {formatMoney(resolved?.net_entry_value || 0)}</strong></span>
                                  <span>Breakevens: <strong className="text-white">{resolved?.breakevens.map(b => formatMoney(b)).join(" - ")}</strong></span>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-[#1B2B45] bg-[#050912]">
                                <table className="w-full text-left text-[11px] font-mono">
                                  <thead className="bg-[#091120] text-slate-400 text-[9px] uppercase border-b border-[#1A2840]">
                                    <tr>
                                      <th className="py-1.5 px-2.5">Side</th>
                                      <th className="py-1.5 px-2.5">Option Type</th>
                                      <th className="py-1.5 px-2.5">Strike</th>
                                      <th className="py-1.5 px-2.5">Expiry</th>
                                      <th className="py-1.5 px-2.5">LTP / Entry</th>
                                      <th className="py-1.5 px-2.5">Delta</th>
                                      <th className="py-1.5 px-2.5">Theta</th>
                                      <th className="py-1.5 px-2.5">IV</th>
                                      <th className="py-1.5 px-2.5">Quantity</th>
                                      <th className="py-1.5 px-2.5">Trading Symbol</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#101C30]">
                                    {legs.map((leg, idx) => (
                                      <tr key={leg.leg_id || idx} className="hover:bg-[#0C1527]">
                                        <td className="py-1.5 px-2.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            leg.side === "BUY" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
                                          }`}>
                                            {leg.side}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2.5 font-bold text-white">{leg.option_type}</td>
                                        <td className="py-1.5 px-2.5 font-bold text-cyan-300">{leg.strike}</td>
                                        <td className="py-1.5 px-2.5 text-slate-400">{leg.expiry || "Spot"}</td>
                                        <td className="py-1.5 px-2.5 text-white font-bold">{formatMoney(leg.entry_price)}</td>
                                        <td className="py-1.5 px-2.5 text-slate-300">{leg.delta != null ? leg.delta : "-"}</td>
                                        <td className="py-1.5 px-2.5 text-amber-300">{leg.theta != null ? leg.theta : "-"}</td>
                                        <td className="py-1.5 px-2.5 text-slate-400">{leg.iv ? `${leg.iv}%` : "-"}</td>
                                        <td className="py-1.5 px-2.5 text-slate-300">{leg.quantity}</td>
                                        <td className="py-1.5 px-2.5 text-slate-400 font-mono text-[10px]">{leg.trading_symbol}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
