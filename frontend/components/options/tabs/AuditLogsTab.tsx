"use client";

import React, { useState, useEffect } from "react";
import { AuditLogEntry } from "@/types/options-workstation";
import { FileText, CheckCircle, AlertTriangle, Shield, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/options/audit-logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-white font-extrabold text-sm">
              Immutable 32-Field Event Audit Ledger
            </h3>
            <div className="text-[11px] text-slate-400">
              Persistent, tamper-evident recording of every strategy creation, risk check, and execution.
            </div>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="w-full h-48 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
          No audit log entries recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => {
            const isExpanded = expandedId === entry.audit_id;
            return (
              <div
                key={entry.audit_id}
                className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-md space-y-2"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.audit_id)}
                  className="flex items-center justify-between cursor-pointer hover:opacity-90"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-extrabold text-white">{entry.event_type}</span>
                    <span className="text-slate-400 text-[11px]">| Target: {entry.target_id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                      {entry.status}
                    </span>
                    <span className="text-slate-500 text-[10px]">{entry.created_at}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 mt-2 font-mono text-[11px] space-y-1">
                    <div className="text-slate-400">
                      Audit ID: <span className="text-cyan-300 font-bold">{entry.audit_id}</span> | Operator:{" "}
                      <span className="text-slate-200">{entry.user_id}</span>
                    </div>
                    <div className="text-slate-400">Action: {entry.action_name}</div>
                    <div className="pt-2 text-slate-300">
                      <div className="text-[10px] text-slate-500 mb-1">Payload Details:</div>
                      <pre className="p-2 rounded-lg bg-slate-900 overflow-x-auto text-[10px] text-cyan-200 border border-slate-800">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
