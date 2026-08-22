"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  IncidentItem, 
  IncidentDetailResponse 
} from "@/types/alerts";
import { 
  X, 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Clock, 
  Layers, 
  Bot, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  FileText, 
  Code, 
  ExternalLink, 
  ShieldAlert, 
  ArrowRight,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";

interface IncidentDetailDrawerProps {
  incident: IncidentItem | null;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string, note?: string) => void;
  onArchive: (id: string) => void;
}

export function IncidentDetailDrawer({
  incident,
  onClose,
  onAcknowledge,
  onResolve,
  onArchive
}: IncidentDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TIMELINE" | "CONTEXT" | "NOTES" | "NOTIFICATIONS" | "RAW">("OVERVIEW");
  const [newComment, setNewComment] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch full incident details (including child alerts and comments)
  const { data: detailData, isLoading, refetch } = useQuery<IncidentDetailResponse>({
    queryKey: ["incidentDetail", incident?.incident_id],
    queryFn: async () => {
      if (!incident?.incident_id) return { status: "error", message: "No ID" };
      const res = await fetch(`/api/incidents/${incident.incident_id}`);
      if (!res.ok) throw new Error("Failed to fetch incident details");
      return res.json();
    },
    enabled: !!incident?.incident_id,
    staleTime: 5000
  });

  // Mutation to add operator comment
  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!incident?.incident_id) return;
      const res = await fetch(`/api/incidents/${incident.incident_id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "Operator", comment: commentText })
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      refetch();
    }
  });

  if (!incident) return null;

  const fullInc = detailData?.incident || incident;
  const alertsList = detailData?.incident?.alerts || [];
  const commentsList = detailData?.incident?.comments || [];
  const deliveriesList = detailData?.incident?.deliveries || [];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(fullInc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "OVERVIEW", label: "Overview", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "TIMELINE", label: `Timeline (${alertsList.length || incident.occurrence_count})`, icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "CONTEXT", label: "Context & State", icon: <Bot className="w-3.5 h-3.5" /> },
    { id: "NOTES", label: `Notes (${commentsList.length})`, icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "NOTIFICATIONS", label: "Telegram Dispatch", icon: <Send className="w-3.5 h-3.5" /> },
    { id: "RAW", label: "Raw JSON", icon: <Code className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#090D16] border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A]/90 flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700">
              #{incident.incident_id}
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                incident.severity === "CRITICAL"
                  ? "bg-rose-950/70 border-rose-500 text-rose-300"
                  : incident.severity === "ERROR"
                  ? "bg-red-950/60 border-red-500 text-red-300"
                  : incident.severity === "WARNING"
                  ? "bg-amber-950/50 border-amber-500 text-amber-300"
                  : "bg-cyan-950/40 border-cyan-500 text-cyan-300"
              }`}
            >
              {incident.severity}
            </span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-slate-400 border border-slate-800">
              {incident.status}
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight truncate">
            {incident.title}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {incident.category} • Source: {incident.source}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 px-4 border-b border-slate-800 bg-[#0B0F19] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-3 text-xs font-mono font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === "OVERVIEW" && (
          <div className="space-y-4">
            {/* Impact & Duration Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Operational Impact Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-cyan-400">
                    {incident.impact_score || 25.0}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Active Duration
                </span>
                <div className="text-lg font-mono font-bold text-slate-200">
                  {fullInc.active_duration_str || "Active"}
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                Incident Summary
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {incident.summary}
              </p>
            </div>

            {/* Root Cause Analysis */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Root Cause Analysis
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {incident.root_cause || `Condition '${incident.error_code || incident.category}' detected in subsystem '${incident.source}'. Total occurrences: ${incident.occurrence_count}.`}
              </p>
            </div>

            {/* Recommended Operator Action */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
              <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Recommended Action
              </span>
              <p className="text-xs text-cyan-100 leading-relaxed font-mono">
                {incident.recommended_action || "Verify bot connectivity in Bot Control Center. Check open positions and order status. If unrecoverable, engage Kill Switch or restart worker."}
              </p>
            </div>

            {/* Subsystem Deep Links */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                Related Subsystem Deep Links
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Link
                  href="/bots"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors font-mono"
                >
                  <span>Bot Control</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/positions"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors font-mono"
                >
                  <span>Positions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/orders"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors font-mono"
                >
                  <span>Order Book</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "TIMELINE" && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
              Granular Event Occurrence Stream ({alertsList.length} total)
            </span>
            {alertsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                Primary incident created on {incident.created_at}.
              </div>
            ) : (
              <div className="space-y-2">
                {alertsList.map((alt, idx) => (
                  <div
                    key={alt.alert_id || idx}
                    className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-cyan-400">#{alt.alert_id}</span>
                      <span>{alt.timestamp_utc || alt.created_at}</span>
                    </div>
                    <p className="text-slate-200 font-sans font-semibold">{alt.title}</p>
                    <p className="text-slate-400 text-[11px]">{alt.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "CONTEXT" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Affected Bot ID:</span>
                <span className="font-bold text-white">{incident.bot_id || "Fleet Global"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Trading Symbol:</span>
                <span className="font-bold text-cyan-300">{incident.symbol || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Order ID:</span>
                <span className="text-slate-300">{incident.order_id || "None"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Position ID:</span>
                <span className="text-slate-300">{incident.position_id || "None"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Worker ID:</span>
                <span className="text-slate-300">{incident.worker_id || "Worker-Main"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Account ID:</span>
                <span className="text-slate-300">{incident.account_id || "default_account"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Fingerprint:</span>
                <span className="text-[10px] text-slate-400 break-all">{incident.fingerprint}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "NOTES" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {commentsList.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No operator notes recorded yet.</p>
              ) : (
                commentsList.map((cmt) => (
                  <div key={cmt.comment_id} className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-cyan-300">{cmt.author}</span>
                      <span>{cmt.created_at}</span>
                    </div>
                    <p className="text-xs text-slate-200 font-sans">{cmt.comment_text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newComment.trim()) {
                    commentMutation.mutate(newComment.trim());
                  }
                }}
                placeholder="Add operator investigation note..."
                className="flex-1 px-3 py-2 bg-[#080D1A] border border-slate-800 focus:border-cyan-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newComment.trim()) commentMutation.mutate(newComment.trim());
                }}
                disabled={commentMutation.isPending || !newComment.trim()}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {activeTab === "NOTIFICATIONS" && (
          <div className="space-y-3 font-mono text-xs">
            <span className="text-[11px] text-slate-400 uppercase font-bold">
              Telegram Notification Deliveries ({deliveriesList.length})
            </span>
            {deliveriesList.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                No external notifications recorded for this incident.
              </div>
            ) : (
              <div className="space-y-2">
                {deliveriesList.map((del) => (
                  <div key={del.delivery_id} className="p-3.5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-sky-400">{del.channel} Dispatch</span>
                      <span className={`font-bold ${del.status === "SENT" ? "text-emerald-400" : "text-amber-400"}`}>
                        {del.status}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">Sent At: {del.sent_at || del.created_at}</p>
                    {del.error_message && (
                      <p className="text-rose-400 text-[11px]">{del.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "RAW" && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                onClick={handleCopyJson}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1 font-mono transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#050811] border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-96">
              {JSON.stringify(fullInc, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Operational Actions */}
      <div className="p-4 border-t border-slate-800 bg-[#0F172A]/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {incident.status === "NEW" && (
            <button
              onClick={() => onAcknowledge(incident.incident_id)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Acknowledge Incident
            </button>
          )}

          {incident.status !== "RESOLVED" && incident.status !== "ARCHIVED" && (
            <button
              onClick={() => onResolve(incident.incident_id)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Mark Resolved
            </button>
          )}

          {incident.status === "RESOLVED" && (
            <button
              onClick={() => onArchive(incident.incident_id)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Archive Record
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
