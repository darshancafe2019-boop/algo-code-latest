"use client";

import React, { useState, useMemo } from "react";
import { FileText, Search, Filter, ShieldAlert, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatters";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  eventType: string;
  severity: "INFO" | "WARN" | "ERROR";
  description: string;
  relatedId?: string;
  source: string;
}

interface AuditLogsActivityCenterProps {
  logs: AuditLogItem[];
}

export function AuditLogsActivityCenter({ logs }: AuditLogsActivityCenterProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.description.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q) ||
        (log.relatedId && log.relatedId.toLowerCase().includes(q)) ||
        log.source.toLowerCase().includes(q);

      const matchSeverity = severityFilter === "ALL" || log.severity === severityFilter;
      const matchType = eventTypeFilter === "ALL" || log.eventType === eventTypeFilter;

      return matchSearch && matchSeverity && matchType;
    });
  }, [logs, search, severityFilter, eventTypeFilter]);

  const uniqueEventTypes = Array.from(new Set(logs.map((l) => l.eventType)));

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-3 font-sans select-none shadow-md">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1A2B43]/70 gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Audit Logs &amp; Activity Center
          </h3>
          <span className="text-[10px] font-mono text-[#00C9E8] bg-[#0878FF]/15 px-2 py-0.5 rounded border border-[#0878FF]/30">
            {filteredLogs.length} Records
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-[#91A7C1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-8 pr-6 py-1 bg-[#050B16] border border-[#1A2B43] rounded text-xs text-[#EAF3FF] placeholder-[#91A7C1]/60 focus:outline-none focus:border-[#00C9E8]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#91A7C1] hover:text-[#EAF3FF]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#050B16] p-0.5 rounded border border-[#1A2B43]">
            {["ALL", "INFO", "WARN", "ERROR"].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                  severityFilter === sev
                    ? "bg-[#0878FF] text-white shadow-sm"
                    : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Event Type Filter */}
          {uniqueEventTypes.length > 0 && (
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] text-xs focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              {uniqueEventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-72 custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono min-w-[950px]">
          <thead className="sticky top-0 bg-[#081321] z-10">
            <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
              <th className="px-3 py-1.5">Timestamp</th>
              <th className="px-3 py-1.5">Event Type</th>
              <th className="px-2 py-1.5 text-center">Severity</th>
              <th className="px-3 py-1.5">Description</th>
              <th className="px-3 py-1.5">Related ID</th>
              <th className="px-3 py-1.5">Source Component</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2B43]/50">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#91A7C1]">
                  No audit events matched the filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#0D1D35]/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] text-[#91A7C1] tabular-nums whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-2 font-bold text-[#00C9E8]">{log.eventType}</td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                        log.severity === "ERROR"
                          ? "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                          : log.severity === "WARN"
                          ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/30"
                          : "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                      )}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#EAF3FF] leading-relaxed max-w-md">{log.description}</td>
                  <td className="px-3 py-2 text-[#91A7C1] text-[11px]">{log.relatedId || "N/A"}</td>
                  <td className="px-3 py-2 text-[#91A7C1] text-[11px]">{log.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

