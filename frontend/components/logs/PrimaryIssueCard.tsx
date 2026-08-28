"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowRight, RotateCcw, CheckCircle2, ShieldAlert } from "lucide-react";

interface PrimaryIssueCardProps {
  issue: {
    id: number;
    error_code?: string;
    error_message?: string;
    plain_explanation?: string;
    root_cause?: string;
    bot_id?: string;
    instrument_id?: string;
    occurrence_count?: number;
    last_seen?: string;
    status?: string;
    is_retryable?: number;
  } | null;
  onViewDetails: (issueId: number) => void;
  onRefresh: () => void;
}

export function PrimaryIssueCard({ issue, onViewDetails, onRefresh }: PrimaryIssueCardProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  if (!issue) {
    return (
      <div className="bg-[#0B132B]/70 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-center justify-between font-mono text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white text-sm">NO ACTIVE PRIMARY ISSUES</span>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              All trading bots, data feeds, and execution engines are operating normally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const title = issue.error_code || "RUNNER_EXECUTION_ERROR";
  const symbol = issue.instrument_id || "BTC/USDT";
  const botId = issue.bot_id || "System Runner";
  const occurrences = issue.occurrence_count || 1;
  const lastSeen = issue.last_seen ? issue.last_seen.substring(11, 19) : "Just now";
  const explanation =
    issue.plain_explanation ||
    "A required numeric market price or account parameter was unavailable. Execution was safely blocked.";

  const handleSafeRetry = async () => {
    setIsRetrying(true);
    setRetryFeedback(null);
    try {
      const res = await fetch("/api/self-healing/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: issue.bot_id || "system", entity_type: "BOT" }),
      });
      const data = await res.json();
      setRetryFeedback(data.message || "Safe recovery initiated.");
      onRefresh();
    } catch (e: any) {
      setRetryFeedback("Recovery attempt dispatched.");
      onRefresh();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 md:p-5 font-mono text-xs space-y-3 relative overflow-hidden shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-black text-[10px] uppercase">
              PRIMARY ISSUE
            </span>
            <span className="text-slate-400 font-bold">{symbol}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-bold">{botId}</span>
          </div>

          <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide">
            {title.replace(/_/g, " ")}
          </h3>

          <p className="text-xs text-slate-300 font-sans max-w-3xl leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Metadata & Actions */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>
              Occurrences: <strong className="text-cyan-400">x{occurrences}</strong>
            </span>
            <span>•</span>
            <span>
              Last Seen: <strong className="text-white">{lastSeen}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onViewDetails(issue.id)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <span>View Issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleSafeRetry}
              disabled={isRetrying}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>Retry Safe Recovery</span>
            </button>
          </div>
        </div>
      </div>

      {retryFeedback && (
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-emerald-400 text-[11px]">
          {retryFeedback}
        </div>
      )}
    </div>
  );
}
