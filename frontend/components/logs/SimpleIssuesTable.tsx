"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, AlertTriangle, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";

interface IssueRecord {
  id: number;
  error_code?: string;
  error_message?: string;
  plain_explanation?: string;
  root_cause?: string;
  bot_id?: string;
  instrument_id?: string;
  occurrence_count?: number;
  first_seen?: string;
  last_seen?: string;
  severity?: string;
  status?: string;
  category?: string;
  is_retryable?: number;
}

interface SimpleIssuesTableProps {
  issues: IssueRecord[];
  onSelectIssue: (issue: IssueRecord) => void;
  onRefresh: () => void;
}

export function SimpleIssuesTable({ issues, onSelectIssue, onRefresh }: SimpleIssuesTableProps) {
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "ERROR" | "WARNING" | "RESOLVED">("ALL");

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (filterSeverity === "ERROR" && iss.severity !== "ERROR" && iss.severity !== "CRITICAL") return false;
      if (filterSeverity === "WARNING" && iss.severity !== "WARNING") return false;
      if (filterSeverity === "RESOLVED" && iss.status !== "RESOLVED") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (iss.error_code || "").toLowerCase().includes(q) ||
        (iss.plain_explanation || "").toLowerCase().includes(q) ||
        (iss.error_message || "").toLowerCase().includes(q) ||
        (iss.bot_id || "").toLowerCase().includes(q) ||
        (iss.instrument_id || "").toLowerCase().includes(q)
      );
    });
  }, [issues, search, filterSeverity]);

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs space-y-3 p-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search issue, bot, symbol, error code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-500 font-sans"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(["ALL", "ERROR", "WARNING", "RESOLVED"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterSeverity(lvl)}
              className={`px-3 py-1 rounded-lg font-bold transition border text-[11px] ${
                filterSeverity === lvl
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {lvl === "ALL" ? "All Issues" : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Table */}
      <div className="overflow-x-auto">
        {filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono">
            No matching issues found. System is running cleanly.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3 font-semibold">Issue</th>
                <th className="py-2.5 px-3 font-semibold">Affected</th>
                <th className="py-2.5 px-3 text-center font-semibold">Occurrences</th>
                <th className="py-2.5 px-3 text-right font-semibold">Last Seen</th>
                <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                <th className="py-2.5 px-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredIssues.map((iss) => {
                const isError = iss.severity === "ERROR" || iss.severity === "CRITICAL";
                const isResolved = iss.status === "RESOLVED";
                const timeStr = iss.last_seen ? iss.last_seen.substring(11, 19) : "Recent";

                return (
                  <tr key={iss.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isResolved
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isError
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {iss.severity || "ERROR"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">
                        {(iss.error_code || "RUNNER_EXECUTION_ERROR").replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-md">
                        {iss.plain_explanation || iss.error_message}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-200">{iss.instrument_id || "BTC/USDT"}</div>
                      <div className="text-[10px] text-slate-500">{iss.bot_id || "System"}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-cyan-400 font-extrabold">
                      x{iss.occurrence_count || 1}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{timeStr}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {iss.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectIssue(iss)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-bold text-[11px] transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
