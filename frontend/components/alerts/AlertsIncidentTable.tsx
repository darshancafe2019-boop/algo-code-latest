"use client";

import React from "react";
import { 
  IncidentItem, 
  IncidentSeverity, 
  IncidentStatus 
} from "@/types/alerts";
import { 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCheck, 
  CheckCircle2, 
  Archive, 
  ExternalLink, 
  Eye, 
  Layers, 
  Clock, 
  Bot, 
  Zap,
  ShieldAlert
} from "lucide-react";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface AlertsIncidentTableProps {
  incidents: IncidentItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectIncident: (incident: IncidentItem) => void;
  onAcknowledge: (id: string, e: React.MouseEvent) => void;
  onResolve: (id: string, e: React.MouseEvent) => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}

export function AlertsIncidentTable({
  incidents,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectIncident,
  onAcknowledge,
  onResolve,
  onArchive,
  isLoading
}: AlertsIncidentTableProps) {
  const isAllSelected = incidents.length > 0 && selectedIds.size === incidents.length;

  const getSeverityBadge = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === "CRITICAL") {
      return {
        bg: "bg-rose-950/70 border-rose-500/60 text-rose-300",
        borderLeft: "border-l-4 border-l-rose-500",
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />,
        label: "CRITICAL"
      };
    } else if (s === "ERROR") {
      return {
        bg: "bg-red-950/60 border-red-500/50 text-red-300",
        borderLeft: "border-l-4 border-l-red-500",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
        label: "ERROR"
      };
    } else if (s === "WARNING") {
      return {
        bg: "bg-amber-950/50 border-amber-500/40 text-amber-300",
        borderLeft: "border-l-4 border-l-amber-500",
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        label: "WARNING"
      };
    } else if (s === "NOTICE") {
      return {
        bg: "bg-blue-950/50 border-blue-500/40 text-blue-300",
        borderLeft: "border-l-4 border-l-blue-500",
        icon: <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
        label: "NOTICE"
      };
    }
    return {
      bg: "bg-cyan-950/40 border-cyan-500/30 text-cyan-300",
      borderLeft: "border-l-4 border-l-cyan-500",
      icon: <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
      label: "INFO"
    };
  };

  const getStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === "NEW") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold tracking-wider animate-pulse flex items-center gap-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          NEW
        </span>
      );
    } else if (st === "ACKNOWLEDGED") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          ACKNOWLEDGED
        </span>
      );
    } else if (st === "RESOLVED") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          RESOLVED
        </span>
      );
    } else if (st === "ARCHIVED") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1 w-fit">
          ARCHIVED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold w-fit">
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
        <p className="text-xs text-slate-400 font-mono">Loading incident telemetry feed...</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3 backdrop-blur-sm">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">All Systems Operating Normally</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No matching operational incidents or trading risk warnings found. Subsystems, order dispatchers, and risk limits are fully operational.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#080D1A] border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">SEVERITY</th>
              <th className="py-3 px-3">INCIDENT ID & TITLE</th>
              <th className="py-3 px-3">CATEGORY / SOURCE</th>
              <th className="py-3 px-3 text-center">OCCURRENCES</th>
              <th className="py-3 px-3">AFFECTED ENTITY</th>
              <th className="py-3 px-3">LAST SEEN</th>
              <th className="py-3 px-3">STATUS</th>
              <th className="py-3 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {incidents.map((incident) => {
              const sev = getSeverityBadge(incident.severity);
              const isSelected = selectedIds.has(incident.incident_id);
              const isStorm = incident.occurrence_count >= 20;

              return (
                <tr
                  key={incident.incident_id}
                  onClick={() => onSelectIncident(incident)}
                  className={`group hover:bg-slate-800/40 transition-colors cursor-pointer ${
                    sev.borderLeft
                  } ${isSelected ? "bg-cyan-950/20" : ""}`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3 px-3.5 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(incident.incident_id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(incident.incident_id)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>

                  {/* Severity Badge */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono font-bold text-[10px] tracking-wider ${sev.bg}`}
                    >
                      {sev.icon}
                      {sev.label}
                    </span>
                  </td>

                  {/* Title & Summary */}
                  <td className="py-3 px-3 max-w-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          #{incident.incident_id}
                        </span>
                        {incident.is_test === 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-500/40 text-[9px] font-mono text-indigo-300">
                            TEST
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {incident.title}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {incident.summary}
                      </p>
                    </div>
                  </td>

                  {/* Category / Source */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{incident.category}</span>
                      <span className="text-slate-500 text-[10px]">{incident.source}</span>
                    </div>
                  </td>

                  {/* Occurrence Count */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                        isStorm
                          ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse"
                          : incident.occurrence_count > 1
                          ? "bg-amber-950/50 border-amber-500/40 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      x{incident.occurrence_count}
                    </span>
                  </td>

                  {/* Affected Entity */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    {incident.bot_id ? (
                      <div className="flex items-center gap-1.5 text-purple-300">
                        <Bot className="w-3 h-3 text-purple-400" />
                        <span>{incident.bot_id}</span>
                        {incident.symbol && <span className="text-slate-500">({incident.symbol})</span>}
                      </div>
                    ) : incident.symbol ? (
                      <span className="text-cyan-300 font-semibold">{incident.symbol}</span>
                    ) : (
                      <span className="text-slate-500">Fleet Global</span>
                    )}
                  </td>

                  {/* Last Seen */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <HydratedTimestamp timestamp={incident.last_seen_at} />
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    {getStatusBadge(incident.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Acknowledge Action */}
                      {incident.status === "NEW" && (
                        <button
                          onClick={(e) => onAcknowledge(incident.incident_id, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 text-slate-300 transition-colors"
                          title="Acknowledge Incident"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Resolve Action */}
                      {incident.status !== "RESOLVED" && incident.status !== "ARCHIVED" && (
                        <button
                          onClick={(e) => onResolve(incident.incident_id, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-slate-300 transition-colors"
                          title="Resolve Incident"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Archive Action */}
                      {incident.status === "RESOLVED" && (
                        <button
                          onClick={(e) => onArchive(incident.incident_id, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40 text-slate-300 transition-colors"
                          title="Archive Incident"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* View Detail Drawer */}
                      <button
                        onClick={() => onSelectIncident(incident)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-slate-300 transition-colors"
                        title="View Detailed Telemetry & Timeline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
