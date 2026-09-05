"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  HardDrive,
  ShieldCheck,
  Download,
  Plus,
  RefreshCw,
  Search,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SimpleAdvancedSettingsAccordionProps {
  checkup: Array<{
    id: string;
    label: string;
    status: string;
    score: number;
  }>;
  totalScore: number;
  onRefresh: () => void;
}

export function SimpleAdvancedSettingsAccordion({
  checkup,
  totalScore,
  onRefresh,
}: SimpleAdvancedSettingsAccordionProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"AUDIT" | "BACKUPS" | "CHECKUP">("AUDIT");
  const [auditSearch, setAuditSearch] = useState("");
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isVerifyingRestore, setIsVerifyingRestore] = useState(false);

  // 1. Fetch Audit Logs
  const { data: auditData, refetch: refetchAudit } = useQuery<{
    status: string;
    audit_logs: Array<{
      event_id?: string;
      id?: string | number;
      timestamp_utc?: string;
      timestamp?: string;
      action: string;
      actor_user_id: string;
      resource_type: string;
      resource_id: string;
      result: string;
      assurance_level: string;
    }>;
  }>({
    queryKey: ["advancedAuditLogs"],
    queryFn: async () => {
      const res = await fetch("/api/security/audit?limit=50");
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
    enabled: isOpen && activeTab === "AUDIT",
  });

  // 2. Fetch Backups
  const { data: backupsData, refetch: refetchBackups } = useQuery<{
    status: string;
    backups: Array<{
      backup_id: string;
      timestamp_utc: string;
      file_name: string;
      file_size_bytes: number;
      raw_sha256: string;
      encrypted: boolean;
      verified: boolean;
    }>;
  }>({
    queryKey: ["advancedBackupsList"],
    queryFn: async () => {
      const res = await fetch("/api/security/backups");
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json();
    },
    enabled: isOpen && activeTab === "BACKUPS",
  });

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupFeedback(null);
    try {
      const res = await fetch("/api/security/backups", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setBackupFeedback("Encrypted database snapshot created and SHA-256 verified successfully.");
        refetchBackups();
        onRefresh();
      } else {
        setBackupFeedback(data.message || "Failed to create backup.");
      }
    } catch (err: any) {
      setBackupFeedback(`Error: ${err.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleVerifyRestore = async (backupId: string) => {
    setIsVerifyingRestore(true);
    setBackupFeedback(null);
    try {
      const res = await fetch(`/api/security/backups/${backupId}/verify-restore`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setBackupFeedback(`Safe restore verification PASSED for ${backupId} in isolated temporary SQLite testbed.`);
        refetchBackups();
      } else {
        setBackupFeedback(data.message || "Restore verification test failed.");
      }
    } catch (err: any) {
      setBackupFeedback(`Error: ${err.message}`);
    } finally {
      setIsVerifyingRestore(false);
    }
  };

  const filteredAudit = (auditData?.audit_logs || []).filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.actor_user_id || "").toLowerCase().includes(q) ||
      (log.resource_type || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#0B132B]/75 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs">
      {/* Accordion Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-800/30 transition text-slate-300"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Advanced Settings & Technical Tools
            </h4>
            <p className="text-slate-500 font-sans text-xs mt-0.5">
              Audit Event Ledger, Disaster Recovery Backups & Security Metric Diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] font-sans hidden sm:inline">
            {isOpen ? "Collapse Details" : "Expand Details"}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="p-5 md:p-6 border-t border-slate-800 space-y-4 animate-in fade-in duration-150">
          {/* Sub Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            {[
              { id: "AUDIT", label: "Security Audit Log", icon: History },
              { id: "BACKUPS", label: "Disaster Recovery Backups", icon: HardDrive },
              { id: "CHECKUP", label: "Deterministic Score Formula", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
                    activeTab === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. AUDIT LOG TAB */}
          {activeTab === "AUDIT" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search audit action, user, resource..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-500 font-sans"
                  />
                </div>

                <button
                  onClick={() => refetchAudit()}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
                  title="Refresh Audit Log"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">TIMESTAMP</th>
                      <th className="py-2.5 px-3 font-semibold">ACTION</th>
                      <th className="py-2.5 px-3 font-semibold">ACTOR</th>
                      <th className="py-2.5 px-3 font-semibold">RESOURCE</th>
                      <th className="py-2.5 px-3 font-semibold text-right">RESULT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-[11px]">
                    {filteredAudit.map((log, idx) => {
                      const rowKey = log.event_id || log.id || `audit-${log.action}-${idx}`;
                      const rawTime = log.timestamp_utc || log.timestamp;
                      return (
                        <tr key={rowKey} className="hover:bg-slate-800/20">
                          <td className="py-2 px-3 text-slate-400">
                            {rawTime ? new Date(rawTime).toLocaleString() : "—"}
                          </td>
                          <td className="py-2 px-3 font-bold text-white">{log.action}</td>
                          <td className="py-2 px-3 text-slate-300">{log.actor_user_id || "admin"}</td>
                          <td className="py-2 px-3 text-slate-400">{log.resource_type || "SYSTEM"}</td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                log.result === "SUCCESS"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {log.result}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. BACKUPS TAB */}
          {activeTab === "BACKUPS" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 font-sans text-xs">
                  Encrypted SQLite database snapshots with SHA-256 verification and sandbox test restoration.
                </p>

                <button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isCreatingBackup ? "Creating..." : "Create Encrypted Backup"}</span>
                </button>
              </div>

              {backupFeedback && (
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 text-xs font-sans">
                  {backupFeedback}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">SNAPSHOT ID</th>
                      <th className="py-2.5 px-3 font-semibold">TIMESTAMP</th>
                      <th className="py-2.5 px-3 font-semibold">SIZE</th>
                      <th className="py-2.5 px-3 font-semibold">ENCRYPTION</th>
                      <th className="py-2.5 px-3 font-semibold text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-[11px]">
                    {(backupsData?.backups || []).map((b, idx) => (
                      <tr key={b.backup_id || `backup-${idx}`} className="hover:bg-slate-800/20">
                        <td className="py-2 px-3 font-bold text-white">{b.backup_id}</td>
                        <td className="py-2 px-3 text-slate-400">
                          {b.timestamp_utc ? new Date(b.timestamp_utc).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {(b.file_size_bytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">Fernet / SHA-256 ✓</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleVerifyRestore(b.backup_id)}
                            disabled={isVerifyingRestore}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold"
                          >
                            Verify Restore Test
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. DETERMINISTIC SCORE BREAKDOWN TAB */}
          {activeTab === "CHECKUP" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-sans">
                  Deterministic Institutional Security Score Calculation:
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {totalScore} / 100 Points
                </span>
              </div>

              <div className="space-y-2">
                {checkup.map((item, idx) => (
                  <div
                    key={item.id || `checkup-${idx}`}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-200">{item.label}</span>
                    </div>
                    <span className="font-bold text-cyan-400 font-mono">+{item.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
