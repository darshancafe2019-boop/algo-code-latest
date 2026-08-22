"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertRuleItem, AlertRulesResponse } from "@/types/alerts";
import { 
  X, 
  Sliders, 
  ShieldCheck, 
  Lock, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Clock
} from "lucide-react";

interface AlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlertRulesModal({ isOpen, onClose }: AlertRulesModalProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AlertRulesResponse>({
    queryKey: ["alertRules"],
    queryFn: async () => {
      const res = await fetch("/api/alert-rules");
      if (!res.ok) throw new Error("Failed to fetch alert rules");
      return res.json();
    },
    enabled: isOpen,
    staleTime: 10000
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ ruleId, payload }: { ruleId: string; payload: Partial<AlertRuleItem> }) => {
      const res = await fetch(`/api/alert-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to update rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertRules"] });
    }
  });

  if (!isOpen) return null;

  const rules = data?.rules || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-[#090D16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Alert Rules & Safety Policies Engine
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Institutional Alert Thresholds, Cooldowns & Telegram Routing
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              Loading rules configuration...
            </div>
          ) : (
            rules.map((rule) => {
              const isSystemRequired = Boolean(rule.is_system_required);
              const isEnabled = Boolean(rule.is_enabled);
              const tgNotify = Boolean(rule.telegram_notify);

              return (
                <div
                  key={rule.rule_id}
                  className="p-4 rounded-xl bg-[#0F172A] border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {rule.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          rule.severity === "CRITICAL"
                            ? "bg-rose-950/70 border-rose-500 text-rose-300"
                            : rule.severity === "ERROR"
                            ? "bg-red-950/60 border-red-500 text-red-300"
                            : rule.severity === "WARNING"
                            ? "bg-amber-950/50 border-amber-500 text-amber-300"
                            : "bg-cyan-950/40 border-cyan-500 text-cyan-300"
                        }`}
                      >
                        {rule.severity}
                      </span>
                      {isSystemRequired && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          MANDATORY
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-sans">
                      {rule.description || `Evaluates ${rule.condition_type} conditions.`}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                      <span>Condition: <b className="text-slate-300">{rule.condition_type}</b></span>
                      <span>Threshold: <b className="text-slate-300">{rule.threshold_value}</b></span>
                      <span>Cooldown: <b className="text-slate-300">{rule.cooldown_sec}s</b></span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Telegram Toggle */}
                    <button
                      onClick={() =>
                        updateRuleMutation.mutate({
                          ruleId: rule.rule_id,
                          payload: { telegram_notify: tgNotify ? 0 : 1 }
                        })
                      }
                      className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        tgNotify
                          ? "bg-sky-950/60 border-sky-500/50 text-sky-300"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                      title={tgNotify ? "Telegram alerts enabled" : "Telegram alerts disabled"}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">{tgNotify ? "TG ON" : "TG OFF"}</span>
                    </button>

                    {/* Enable / Disable Toggle */}
                    <button
                      disabled={isSystemRequired}
                      onClick={() =>
                        updateRuleMutation.mutate({
                          ruleId: rule.rule_id,
                          payload: { is_enabled: isEnabled ? 0 : 1 }
                        })
                      }
                      className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        isSystemRequired
                          ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                          : isEnabled
                          ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                          : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                      }`}
                    >
                      {isEnabled ? "ACTIVE" : "DISABLED"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
