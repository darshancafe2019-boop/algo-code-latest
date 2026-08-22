"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradeDetailDrawer } from "@/components/trade-journal/TradeDetailDrawer";
import { ArrowLeft, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { TradeJournalRecord } from "@/types/trade-journal";

export default function DedicatedTradeWorkstationPage() {
  const router = useRouter();
  const params = useParams();
  const tradeId = String(params?.tradeId || "");

  const { data: tradeDetail, isLoading, error } = useQuery({
    queryKey: ["tradeDetailDirect", tradeId],
    queryFn: async () => {
      const res = await fetch(`/api/trades/${tradeId}/detail`);
      if (!res.ok) throw new Error(`Trade #${tradeId} not found`);
      return res.json();
    },
    enabled: Boolean(tradeId),
  });

  const tradeRecord: TradeJournalRecord | null = tradeDetail?.overview || null;

  return (
    <DirectPageLayout activeTab="trade-journal">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-4 font-sans select-none">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-4">
          <button
            type="button"
            onClick={() => router.push("/trade-journal")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-xs font-semibold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Trade Journal</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--theme-text-muted)]">
              STANDALONE FORENSIC WORKSTATION #{tradeId}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3 font-mono text-xs text-[var(--theme-text-secondary)]">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--theme-accent)] mx-auto" />
            <p>Loading authoritative trade ledger forensic record #{tradeId}...</p>
          </div>
        ) : error || !tradeRecord ? (
          <div className="py-20 text-center space-y-3 font-mono text-xs text-[var(--theme-loss)]">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p>Could not locate trade record #{tradeId}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <TradeDetailDrawer
              trade={tradeRecord}
              isOpen={true}
              onClose={() => router.push("/trade-journal")}
            />
          </div>
        )}
      </div>
    </DirectPageLayout>
  );
}
