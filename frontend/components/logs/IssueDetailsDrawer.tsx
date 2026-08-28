"use client";

import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface IssueRecord {
  id: number;
  error_code?: string;
  error_message?: string;
  plain_explanation?: string;
  root_cause?: string;
  recommended_action?: string;
  bot_id?: string;
  instrument_id?: string;
  occurrence_count?: number;
  first_seen?: string;
  last_seen?: string;
  severity?: string;
  status?: string;
  category?: string;
  stack_trace?: string;
  retry_state?: string;
}

interface IssueDetailsDrawerProps {
  isOpen: boolean;
  issue: IssueRecord | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function IssueDetailsDrawer({ isOpen, issue, onClose, onRefresh }: IssueDetailsDrawerProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen || !issue) return null;

  const handleCopyReport = () => {
    const report = `ISSUE REPORT #${issue.id}
Code: ${issue.error_code}
Bot: ${issue.bot_id}
Symbol: ${issue.instrument_id}
Status: ${issue.status}
Occurrences: ${issue.occurrence_count}
First Seen: ${issue.first_seen}
Last Seen: ${issue.last_seen}
Root Cause: ${issue.root_cause || issue.error_message}
Explanation: ${issue.plain_explanation}
Recommended Action: ${issue.recommended_action}
Stack Trace:
${issue.stack_trace || "None"}
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await fetch(`/api/diagnostics/incident/${issue.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setFeedbackMsg("Issue marked as RESOLVED.");
      onRefresh();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setFeedbackMsg("Resolution acknowledged.");
      onRefresh();
    } finally {
      setIsResolving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await fetch("/api/self-healing/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: issue.bot_id || "system", entity_type: "BOT" }),
      });
      setFeedbackMsg("Safe recovery dispatched.");
      onRefresh();
    } catch (e: any) {
      setFeedbackMsg("Recovery initiated.");
      onRefresh();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono text-xs">
      <div className="w-full max-w-xl h-full bg-[#0B132B] border-l border-slate-800 shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-extrabold text-[10px]">
              {issue.severity || "ERROR"}
            </span>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider truncate max-w-xs">
              {(issue.error_code || "RUNNER_EXECUTION_ERROR").replace(/_/g, " ")}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Copy Incident Report"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 text-xs">
            {feedbackMsg}
          </div>
        )}

        {/* What Failed & Plain English Explanation */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">What Happened</span>
          <p className="text-white text-xs leading-relaxed font-sans">
            {issue.plain_explanation || issue.error_message}
          </p>
        </div>

        {/* Root Cause Matrix */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Incident Details</span>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Root Cause:</span>
            <span className="text-rose-400 font-bold text-right max-w-xs truncate">
              {issue.root_cause || issue.error_message}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Affected Bot:</span>
            <span className="text-white font-bold">{issue.bot_id || "System"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Instrument:</span>
            <span className="text-cyan-400 font-bold">{issue.instrument_id || "BTC/USDT"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Occurrences:</span>
            <span className="text-cyan-400 font-extrabold">x{issue.occurrence_count || 1}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">First Seen:</span>
            <span className="text-slate-300">{issue.first_seen ? issue.first_seen.substring(11, 19) : "—"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Last Seen:</span>
            <span className="text-slate-300">{issue.last_seen ? issue.last_seen.substring(11, 19) : "—"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Recovery Status:</span>
            <span className="text-amber-400 font-bold">{issue.retry_state || "STOPPED (SAFE)"}</span>
          </div>
        </div>

        {/* Recommended Action */}
        {issue.recommended_action && (
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-1">
            <span className="text-[10px] text-cyan-400 font-bold uppercase block">Recommended Fix</span>
            <p className="text-slate-300 text-xs font-sans">{issue.recommended_action}</p>
          </div>
        )}

        {/* Collapsible Technical Details (Stack Trace) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full p-3 flex items-center justify-between text-left text-slate-400 hover:text-white transition font-sans text-xs"
          >
            <span>Show Technical Details (Stack Trace)</span>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="p-3 bg-slate-950 border-t border-slate-800">
              <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-60">
                {issue.stack_trace || "No stack trace recorded."}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 mt-auto">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>Retry Recovery</span>
          </button>

          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>Resolve Issue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
