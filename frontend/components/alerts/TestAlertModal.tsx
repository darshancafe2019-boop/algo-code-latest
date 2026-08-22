"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  X, 
  Sparkles, 
  Send, 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  CheckCircle2
} from "lucide-react";
import { IncidentSeverity } from "@/types/alerts";

interface TestAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestAlertModal({ isOpen, onClose }: TestAlertModalProps) {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState<"CRITICAL" | "ERROR" | "WARNING" | "INFO">("WARNING");
  const [channel, setChannel] = useState<"system" | "telegram">("system");
  const [title, setTitle] = useState("Test System Failure Alert");
  const [message, setMessage] = useState("Controlled diagnostic test event triggered by operator.");
  const [feedback, setFeedback] = useState<string | null>(null);

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity,
          channel,
          title,
          message
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to trigger test alert");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["alertsFeed"] });
      setFeedback(`Test ${severity} alert dispatched successfully!`);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setFeedback(`Error: ${err.message}`);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#090D16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Self-Test Alert Dispatcher
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Simulate controlled operational failure events
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-4 font-mono text-xs">
          {/* Severity Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase text-[10px]">
              Simulated Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["CRITICAL", "ERROR", "WARNING", "INFO"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    severity === s
                      ? s === "CRITICAL"
                        ? "bg-rose-950/80 border-rose-500 text-rose-300 font-bold"
                        : s === "ERROR"
                        ? "bg-red-950/80 border-red-500 text-red-300 font-bold"
                        : s === "WARNING"
                        ? "bg-amber-950/80 border-amber-500 text-amber-300 font-bold"
                        : "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold"
                      : "bg-[#0F172A] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase text-[10px]">
              Target Delivery Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("system")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  channel === "system"
                    ? "bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold"
                    : "bg-[#0F172A] border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                In-App Dashboard Only
              </button>
              <button
                type="button"
                onClick={() => setChannel("telegram")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  channel === "telegram"
                    ? "bg-sky-950/80 border-sky-500 text-sky-300 font-bold"
                    : "bg-[#0F172A] border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                In-App + Telegram
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase text-[10px]">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#080D1A] border border-slate-800 focus:border-cyan-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Message Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase text-[10px]">
              Diagnostic Description
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-[#080D1A] border border-slate-800 focus:border-cyan-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-sans"
            />
          </div>

          {feedback && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors font-mono"
          >
            Cancel
          </button>

          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !title.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors font-mono flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {testMutation.isPending ? "Dispatching..." : "Dispatch Test Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}
