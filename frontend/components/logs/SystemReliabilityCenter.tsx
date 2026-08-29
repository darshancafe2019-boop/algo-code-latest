"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  Server,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
  Info,
  X,
} from "lucide-react";
import {
  SystemIncident,
  ReliabilitySummary,
  ProviderHealth,
  ErrorSeverity,
  IncidentStatus,
} from "@/types/reliability";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface SystemReliabilityCenterProps {
  initialIncidents?: SystemIncident[];
}

export function SystemReliabilityCenter({ initialIncidents = [] }: SystemReliabilityCenterProps) {
  const [incidents, setIncidents] = useState<SystemIncident[]>(initialIncidents);
  const [summary, setSummary] = useState<ReliabilitySummary | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "CRITICAL" | "INSTRUMENT" | "RESOLVED">("ALL");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);

  const fetchReliabilityData = async () => {
    try {
      setLoading(true);
      const [incRes, sumRes, provRes] = await Promise.all([
        fetch("/api/reliability/incidents?limit=100"),
        fetch("/api/reliability/summary"),
        fetch("/api/reliability/providers"),
      ]);

      if (incRes.ok) {
        const d = await incRes.json();
        if (d.incidents) setIncidents(d.incidents);
      }
      if (sumRes.ok) {
        const d = await sumRes.json();
        if (d.summary) setSummary(d.summary);
      }
      if (provRes.ok) {
        const d = await provRes.json();
        if (d.providers) setProviders(d.providers);
      }
    } catch (err) {
      console.error("Failed to load reliability data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReliabilityData();
    const interval = setInterval(fetchReliabilityData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleIncidentAction = async (incidentId: number, action: "ACKNOWLEDGE" | "RESOLVE" | "ARCHIVE") => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/reliability/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, action }),
      });
      if (res.ok) {
        await fetchReliabilityData();
        if (selectedIncident && selectedIncident.id === incidentId) {
          const updated = incidents.find((i) => i.id === incidentId);
          if (updated) setSelectedIncident({ ...updated, status: action === "RESOLVE" ? "RESOLVED" : action === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : "ARCHIVED" });
          else setSelectedIncident(null);
        }
      }
    } catch (err) {
      console.error("Failed to update incident:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyTrace = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          inc.error_message?.toLowerCase().includes(q) ||
          inc.root_cause?.toLowerCase().includes(q) ||
          inc.bot_id?.toLowerCase().includes(q) ||
          inc.instrument_id?.toLowerCase().includes(q) ||
          inc.error_code?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Quick filter chips
      if (activeFilter === "ACTIVE") return inc.status === "ACTIVE" || inc.status === "NEW";
      if (activeFilter === "CRITICAL") return inc.severity === "CRITICAL";
      if (activeFilter === "INSTRUMENT") return inc.category === "INSTRUMENT_RESOLUTION" || inc.error_code?.includes("INSTRUMENT");
      if (activeFilter === "RESOLVED") return inc.status === "RESOLVED";

      return true;
    });
  }, [incidents, searchQuery, activeFilter]);

  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">CRITICAL</span>;
      case "ERROR":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800">ERROR</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">INFO</span>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
            ACTIVE
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="h-2.5 w-2.5" />
            ACKNOWLEDGED
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="h-2.5 w-2.5" />
            RESOLVED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{status || "UNKNOWN"}</span>;
    }
  };

  const getCircuitBadge = (circuitState?: string) => {
    if (circuitState === "CLOSED") return <span className="text-[10px] font-bold text-emerald-400">CLOSED (NORMAL)</span>;
    if (circuitState === "OPEN") return <span className="text-[10px] font-bold text-rose-400 animate-pulse">OPEN (BLOCKED)</span>;
    return <span className="text-[10px] font-bold text-amber-400">HALF_OPEN (PROBING)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Reliability Telemetry Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System State</div>
            <div className="text-lg font-black mt-1 flex items-center gap-2">
              {summary?.critical_incidents && summary.critical_incidents > 0 ? (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> DEGRADED
                </span>
              ) : summary?.active_incidents && summary.active_incidents > 0 ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> ATTENTION REQUIRED
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> HEALTHY & STABLE
                </span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Incidents</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {summary?.active_incidents ?? incidents.filter((i) => i.status === "ACTIVE").length}
              <span className="text-xs font-normal text-slate-500 ml-2">
                ({summary?.critical_incidents ?? 0} critical)
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovered Today</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              {summary?.resolved_incidents ?? incidents.filter((i) => i.status === "RESOLVED").length}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Affected Bots</div>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
              {summary?.affected_bots ?? 0}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-900/50 text-cyan-400">
            <Server className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Provider Connectivity & Circuit Breakers Strip */}
      <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Provider Telemetry & Circuit Breaker Health
            </span>
          </div>
          <button
            onClick={fetchReliabilityData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-[11px] font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            Refresh Telemetry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {providers.length > 0 ? (
            providers.map((p) => (
              <div key={p.provider_id} className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    {p.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      p.status === "HEALTHY"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : p.status === "RATE_LIMITED"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]">
                  <div>
                    Circuit: <span>{getCircuitBadge(p.circuit_state)}</span>
                  </div>
                  <div>
                    P95 Latency: <span className="text-white font-bold">{p.p95_latency_ms}ms</span>
                  </div>
                  <div>
                    Errors / Reqs:{" "}
                    <span className="text-white">
                      {p.error_count} / {p.request_count}
                    </span>
                  </div>
                  <div>
                    Last Success: <span className="text-white">{p.last_success}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-3 text-xs text-slate-500">
              Loading provider adapters...
            </div>
          )}
        </div>
      </div>

      {/* Incident Ledger Filters & Search */}
      <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === "ALL"
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                  : "bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-slate-300"
              }`}
            >
              All Incidents ({incidents.length})
            </button>
            <button
              onClick={() => setActiveFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === "ACTIVE"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-slate-300"
              }`}
            >
              Active ({incidents.filter((i) => i.status === "ACTIVE" || i.status === "NEW").length})
            </button>
            <button
              onClick={() => setActiveFilter("CRITICAL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === "CRITICAL"
                  ? "bg-rose-600 text-white"
                  : "bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-slate-300"
              }`}
            >
              Critical ({incidents.filter((i) => i.severity === "CRITICAL").length})
            </button>
            <button
              onClick={() => setActiveFilter("INSTRUMENT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === "INSTRUMENT"
                  ? "bg-purple-600 text-white"
                  : "bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-slate-300"
              }`}
            >
              Instrument Errors
            </button>
            <button
              onClick={() => setActiveFilter("RESOLVED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === "RESOLVED"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#0B0F17] hover:bg-slate-800 border border-[#1E293B] text-slate-300"
              }`}
            >
              Resolved ({incidents.filter((i) => i.status === "RESOLVED").length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search error message, code, bot, symbol..."
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Dense Institutional Incident Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B0F17] border-b border-[#1E293B] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3">Incident / Code</th>
                <th className="py-3 px-3">Bot / Symbol</th>
                <th className="py-3 px-3">Occurrences</th>
                <th className="py-3 px-3">Last Seen</th>
                <th className="py-3 px-3">Retry Policy</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] font-mono">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((inc) => {
                  const count = inc.occurrence_count || 1;
                  const isSelected = selectedIncident?.id === inc.id;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-cyan-950/30" : "hover:bg-[#0B0F17]/80"
                      }`}
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap">{getSeverityBadge(inc.severity)}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">#{inc.id} {inc.error_code || "RUNNER_ERROR"}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs font-sans">
                          {inc.error_message}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-cyan-300 font-bold">{inc.bot_id || "system"}</div>
                        <div className="text-[10px] text-slate-500">{inc.instrument_id || "UNKNOWN"}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            count > 10
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          x{count}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[10px] text-slate-400">
                        {inc.last_seen ? <HydratedTimestamp timestamp={inc.last_seen} /> : (inc.timestamp || "--:--:--")}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            inc.is_retryable
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-slate-900 text-slate-400 border border-slate-800"
                          }`}
                        >
                          {inc.retry_state || (inc.is_retryable ? "RETRYING" : "STOPPED")}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{getStatusBadge(inc.status)}</td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(inc);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-cyan-950/60 border border-[#1E293B] text-[11px] font-bold text-cyan-300 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    No active system reliability incidents matched your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Slide-Over Detail Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-[#0E131F] border-l border-[#1E293B] h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(selectedIncident.severity)}
                    <span className="text-xs font-mono font-bold text-slate-400">Incident #{selectedIncident.id}</span>
                    {getStatusBadge(selectedIncident.status)}
                  </div>
                  <h2 className="text-lg font-black text-white">{selectedIncident.error_code || "SYSTEM_INCIDENT"}</h2>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Aggregation & Occurrence Banner */}
              <div className="bg-[#121824] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="text-slate-400 text-[10px] uppercase">Occurrence Aggregation</div>
                  <div className="text-white font-bold">
                    Aggregated <span className="text-cyan-400 font-black">{selectedIncident.occurrence_count || 1}</span> identical errors
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <div>First: {selectedIncident.first_seen || selectedIncident.timestamp}</div>
                  <div>Last: {selectedIncident.last_seen || selectedIncident.timestamp}</div>
                </div>
              </div>

              {/* 1. What Happened? (Plain English) */}
              <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Info className="h-4 w-4" />
                  What Happened? (Plain-Language Explanation)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedIncident.plain_explanation || selectedIncident.error_message}
                </p>
              </div>

              {/* 2. Root Cause Analysis */}
              <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  Root Cause Analysis
                </div>
                <p className="text-xs text-rose-200 font-mono leading-relaxed">
                  {selectedIncident.root_cause || selectedIncident.error_message}
                </p>
              </div>

              {/* 3. Recommended Remediation */}
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  Required Remediation & Action
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {selectedIncident.recommended_action || "Check bot settings and restart after fixing configuration."}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#121824] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Bot Instance</div>
                  <div className="text-white font-bold mt-0.5">{selectedIncident.bot_id || "system"}</div>
                </div>
                <div className="bg-[#121824] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Instrument Query</div>
                  <div className="text-cyan-300 font-bold mt-0.5">{selectedIncident.instrument_id || "UNKNOWN"}</div>
                </div>
                <div className="bg-[#121824] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Provider Venue</div>
                  <div className="text-white font-bold mt-0.5">{selectedIncident.provider || "Binance"}</div>
                </div>
                <div className="bg-[#121824] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Retry Classification</div>
                  <div className="text-white font-bold mt-0.5">
                    {selectedIncident.is_retryable ? "Retryable (Network/RateLimit)" : "Non-Retryable (Configuration)"}
                  </div>
                </div>
              </div>

              {/* Technical Stack Trace (Sanitized) */}
              {selectedIncident.stack_trace && (
                <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Sanitized Stack Trace
                    </span>
                    <button
                      onClick={() => handleCopyTrace(selectedIncident.stack_trace || "")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-300"
                    >
                      {copiedTrace ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedTrace ? "Copied" : "Copy Trace"}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedIncident.stack_trace}
                  </pre>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-[#1E293B] pt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => handleIncidentAction(selectedIncident.id, "ARCHIVE")}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300"
              >
                Archive
              </button>
              <div className="flex items-center gap-2">
                {selectedIncident.status !== "ACKNOWLEDGED" && (
                  <button
                    onClick={() => handleIncidentAction(selectedIncident.id, "ACKNOWLEDGE")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-xs font-bold text-amber-300"
                  >
                    Acknowledge
                  </button>
                )}
                {selectedIncident.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleIncidentAction(selectedIncident.id, "RESOLVE")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
