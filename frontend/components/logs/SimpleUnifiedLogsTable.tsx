"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, Terminal, RefreshCw } from "lucide-react";

interface StructuredLogItem {
  timestamp: string;
  level: string;
  service: string;
  bot_id: string;
  message: string;
  details?: Record<string, any>;
}

interface SimpleUnifiedLogsTableProps {
  logs: StructuredLogItem[];
  rawLines: string[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function SimpleUnifiedLogsTable({
  logs,
  rawLines,
  isLoading,
  onRefresh,
}: SimpleUnifiedLogsTableProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showRawFormat, setShowRawFormat] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.bot_id.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q)
      );
    });
  }, [logs, search, levelFilter]);

  const filteredRawLines = useMemo(() => {
    if (!search.trim()) return rawLines;
    const q = search.toLowerCase();
    return rawLines.filter((l) => l.toLowerCase().includes(q));
  }, [rawLines, search]);

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs space-y-3 p-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search logs by keyword, bot, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-500 font-sans"
          />
        </div>

        {/* Level Filters & Format Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg font-bold transition border text-[11px] ${
                  levelFilter === lvl
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowRawFormat(!showRawFormat)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition text-[11px]"
          >
            {showRawFormat ? "Table View" : "Raw Console"}
          </button>

          <button
            onClick={onRefresh}
            className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {showRawFormat ? (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-[500px] overflow-y-auto space-y-1">
          {filteredRawLines.length === 0 ? (
            <div className="text-slate-500 py-4 text-center">No raw log lines available.</div>
          ) : (
            filteredRawLines.map((line, idx) => (
              <div
                key={idx}
                className={`leading-relaxed whitespace-pre-wrap ${
                  line.includes("ERROR")
                    ? "text-rose-400"
                    : line.includes("WARN")
                    ? "text-amber-400"
                    : "text-slate-300"
                }`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[500px]">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono">
              No matching log records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Bot</th>
                  <th className="py-2.5 px-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filteredLogs.map((log, idx) => {
                  const isError = log.level === "ERROR";
                  const isWarn = log.level === "WARN";
                  const isExpanded = expandedIndex === idx;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="hover:bg-slate-800/30 transition cursor-pointer"
                      >
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {log.timestamp.substring(11, 19)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isError
                                ? "bg-rose-500/20 text-rose-400"
                                : isWarn
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold whitespace-nowrap">
                          {log.service}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                          {log.bot_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                            )}
                            <span className="truncate max-w-xl">{log.message}</span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={5} className="p-3 pl-8">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] space-y-2">
                              <div>
                                <span className="text-slate-500 font-bold">Full Message: </span>
                                <span className="text-white">{log.message}</span>
                              </div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <span className="text-slate-500 font-bold block mb-1">Payload Details:</span>
                                  <pre className="text-slate-300 text-[10px] overflow-x-auto bg-slate-900 p-2 rounded">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
