"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export function DecisionLogFeed() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["decisionLogs"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots/events?limit=15", { timeoutMs: 5000, deduplicate: true });
      if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch decision logs");
      return res.data;
    },
    staleTime: 5000,
    refetchInterval: 8000,
    placeholderData: (prev) => prev,
  });

  const rawLogs = data?.events || data?.decision_logs || data?.logs || [];

  // Filter out auth-failure events — those belong on provider health badge, not decision feed
  const logs = rawLogs.filter((log: any) => {
    const evtType = (log.event_type || "").toUpperCase();
    const decision = (log.decision || log.final_decision || log.action || "").toUpperCase();
    return evtType !== "DHAN_AUTH_FAILED" && evtType !== "AUTH_FAILED" &&
           decision !== "DHAN_AUTH_FAILED" && decision !== "AUTH_FAILED";
  });

  return (
    <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 font-sans select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#22D3EE]" />
          <h3 className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">
            Live Bot Decision &amp; Activity Feed
          </h3>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#05101A] transition-colors cursor-pointer"
          title="Refresh Decision Logs"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#7D8EA5] font-mono">
            No bot activity yet
          </div>
        ) : (
          logs.map((log: any, index: number) => {
            // Authoritative field priority: final_decision → decision → action → event → HOLD
            const decision = (
              log.final_decision || log.decision || log.direction || log.event || log.action || "HOLD"
            ).toUpperCase();

            // Confidence: prefer confidence_score (0-100), then bull_score
            const rawConfidence = log.confidence_score !== undefined
              ? log.confidence_score
              : log.bull_score !== undefined
              ? log.bull_score
              : null;
            const confidence = rawConfidence !== null ? Number(rawConfidence).toFixed(1) : null;

            const isLong = decision === "BUY" || decision === "LONG" || decision === "ENTRY SIGNAL";
            const isShort = decision === "SELL" || decision === "SHORT" || decision === "EXIT SIGNAL";
            const isRebalance = decision.includes("REBALANCE") || decision.includes("SCAN") ||
                                decision.includes("PAUSED") || decision.includes("STARTED");

            // Bot label: prefer bot_name, then name, then bot_id fields
            const botLabel = log.bot_name || log.name || log.bot_id || log.bot_instance_id || "System";
            const regime = log.regime || log.event_type || null;
            const provider = log.provider || null;
            const reason = log.decision_reason || log.summary || null;

            return (
              <div
                key={log.id || index}
                className="p-2 rounded-lg bg-[#05101A] border border-[#12304A] flex items-center justify-between text-[11px]"
                title={reason || undefined}
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-[#7D8EA5]">
                    {log.timestamp
                      ? log.timestamp.includes("T")
                        ? log.timestamp.split("T")[1]?.slice(0, 8)
                        : log.timestamp.slice(11, 19)
                      : "Live"}
                  </span>
                  <span className="font-semibold text-[#F8FAFC] truncate max-w-[120px]" title={botLabel}>
                    {botLabel}
                  </span>
                  {regime && <span className="text-[#7D8EA5]">[{regime}]</span>}
                  {provider && (
                    <span className="text-[10px] text-[#22D3EE]/60 truncate max-w-[60px]" title={provider}>
                      {provider}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {confidence !== null && (
                    <span className="text-[10px] text-[#7D8EA5] font-mono">
                      Score: <strong className="text-[#22D3EE]">{confidence}%</strong>
                    </span>
                  )}

                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border",
                      isLong
                        ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                        : isShort
                        ? "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20"
                        : isRebalance
                        ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                        : "bg-[#0A1422] text-[#7D8EA5] border-[#12304A]"
                    )}
                  >
                    {decision}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
