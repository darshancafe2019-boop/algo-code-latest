"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  FileText,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { formatMoney } from "@/lib/formatters";

export function StrategyTradeJournalView() {
  const { journalRecords } = useStrategyStore();
  const [filterEnv, setFilterEnv] = useState<"ALL" | "BACKTEST" | "PAPER" | "LIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = journalRecords.filter((r) => {
    const matchesEnv = filterEnv === "ALL" || r.executionEnvironment === filterEnv;
    const matchesSearch =
      searchQuery === "" ||
      r.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.strategyNumber.includes(searchQuery) ||
      r.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.journalId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEnv && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Immutable Strategy Execution Trade Journal
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                AUDIT COMPLIANT
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Complete audit ledger recording every trade, condition state, entry/exit timestamp, fees, slippage, and regime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-[#0E1628] border border-[#1A2840] text-slate-300">
            Recorded Entries: <strong className="text-white">{filteredRecords.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#090E1A] border border-[#1E293B]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by strategy name, number, instrument, or journal ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Environment:</span>
          {(["ALL", "PAPER", "BACKTEST", "LIVE"] as const).map((env) => (
            <button
              key={env}
              onClick={() => setFilterEnv(env)}
              className={`px-3 py-1 rounded-lg transition font-semibold ${
                filterEnv === env
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "bg-[#060A14] text-slate-400 border border-[#1F2E47] hover:text-white"
              }`}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Journal Table */}
      <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#1A2840] text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Journal ID</th>
                <th className="py-2.5 px-3">Env</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Entry Time</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Stop / Target</th>
                <th className="py-2.5 px-3">Exit Price</th>
                <th className="py-2.5 px-3">Net P&L</th>
                <th className="py-2.5 px-3">R-Multiple</th>
                <th className="py-2.5 px-3">Exit Reason</th>
                <th className="py-2.5 px-3">Regime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152033]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500 text-xs">
                    No journal trade records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.journalId} className="hover:bg-[#0E172A] transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] truncate max-w-[120px]">
                      {r.journalId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {r.executionEnvironment}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      #{r.strategyNumber} {r.strategyName}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">v{r.strategyVersion}</span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{r.instrument}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.direction === "LONG"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-red-950 text-red-400"
                        }`}
                      >
                        {r.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{r.entryTime.substring(11, 19)}</td>
                    <td className="py-2.5 px-3">{formatMoney(r.entryPrice)}</td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <span className="text-red-400">{formatMoney(r.stopPrice)}</span> /{" "}
                      <span className="text-emerald-400">{formatMoney(r.targetPrice)}</span>
                    </td>
                    <td className="py-2.5 px-3">{r.exitPrice ? formatMoney(r.exitPrice) : "—"}</td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={r.netPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {r.netPnl >= 0 ? "+" : ""}{formatMoney(r.netPnl)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {r.rMultiple ? `${r.rMultiple > 0 ? "+" : ""}${r.rMultiple}R` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-300">
                      {r.exitReason || r.status}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400">{r.marketRegime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
