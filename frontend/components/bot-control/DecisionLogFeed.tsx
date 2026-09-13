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

  const logs = data?.events || data?.decision_logs || data?.logs || [];

  return (
    <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 font-sans select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#22D3EE]" />
          <h3 className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">
            Live Bot Decision & Activity Feed
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
          <div className="p-4 text-center text-xs text-[#7D8EA5] font-mono">
            No decision logs recorded yet. Waiting for bot cycle...
          </div>
        ) : (
          logs.map((log: any, index: number) => {
            const decision = (log.decision || log.direction || "HOLD").toUpperCase();
            const confidence = Number(log.confidence_score ?? log.bull_score ?? 0).toFixed(1);
            const isLong = decision === "BUY" || decision === "LONG";
            const isShort = decision === "SELL" || decision === "SHORT";
            const isRebalance = decision.includes("REBALANCE") || decision.includes("SCAN");

            return (
              <div
                key={log.id || index}
                className="p-2 rounded-lg bg-[#05101A] border border-[#12304A] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-[#7D8EA5]">
                    {log.timestamp ? log.timestamp.split("T")[1]?.slice(0, 8) : "Live"}
                  </span>
                  <span className="font-semibold text-[#F8FAFC]">{log.bot_id || "bot-1"}</span>
                  <span className="text-[#7D8EA5]">[{log.regime || "TRENDING"}]</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-[#7D8EA5] font-mono">
                    Score: <strong className="text-[#22D3EE]">{confidence}%</strong>
                  </span>

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
