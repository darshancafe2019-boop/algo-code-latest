"use client";

import React, { useState, memo } from "react";
import { EcoBadge } from "@/components/eco/EcoBadge";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface HeaderTradingModeProps {
  tradingMode: "PAPER" | "LIVE";
}

export const HeaderTradingMode = memo(function HeaderTradingMode({
  tradingMode = "PAPER",
}: HeaderTradingModeProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [confirmCheck1, setConfirmCheck1] = useState(false);
  const [confirmCheck2, setConfirmCheck2] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modeMutation = useMutation({
    mutationFn: async (targetMode: "PAPER" | "LIVE") => {
      setErrorMessage(null);
      if (targetMode === "LIVE") {
        const res = await apiClient.post<any>("/api/live-trading/arm", {
          user_confirm: true,
          user_ack_risk: true,
        });
        if (!res.ok) throw new Error(res.error?.message || "Failed to arm live trading");
        return res.data;
      } else {
        const res = await apiClient.post<any>("/api/live-trading/disarm", {});
        if (!res.ok) throw new Error(res.error?.message || "Failed to disarm live trading");
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["portfolioSnapshot"] });
      setShowModal(false);
      setConfirmCheck1(false);
      setConfirmCheck2(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to change execution mode");
    },
  });

  const handleOpen = () => {
    setErrorMessage(null);
    setConfirmCheck1(false);
    setConfirmCheck2(false);
    setShowModal(true);
  };

  const isSwitchingToLive = tradingMode === "PAPER";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Trading Execution Mode: ${tradingMode}. Click to change.`}
        className="cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg select-none active:scale-95 transition-transform"
        title="Execution Mode Sandbox / Live Gate"
      >
        <EcoBadge variant={tradingMode === "LIVE" ? "live" : "paper"} size="sm" dot pulse>
          {tradingMode}
        </EcoBadge>
      </button>

      {/* Mode Switch Safety Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border-subtle)]">
              <div className="flex items-center gap-2">
                {isSwitchingToLive ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                )}
                <h3 className="text-sm font-bold text-slate-100">
                  {isSwitchingToLive ? "Switch to LIVE Trading?" : "Switch to PAPER Sandbox?"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--theme-elevated)] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSwitchingToLive ? (
              <div className="space-y-3">
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1 text-[11px] leading-relaxed font-sans">
                  <p className="font-bold font-mono">⚠️ LIVE EXECUTION WARNING:</p>
                  <p>
                    Switching to LIVE mode sends real orders directly to your connected broker (Upstox / Delta Exchange) using real capital.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={confirmCheck1}
                      onChange={(e) => setConfirmCheck1(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-[11px] leading-tight">
                      I confirm broker API credentials & account risk parameters are verified.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={confirmCheck2}
                      onChange={(e) => setConfirmCheck2(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-[11px] leading-tight">
                      I understand that automated live trades will execute with real capital.
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-[11px] leading-relaxed font-sans">
                Switching to PAPER mode routes all future orders through the simulated matching sandbox. Real broker balances will not be risked.
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-[11px]">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--theme-border-subtle)]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => modeMutation.mutate(isSwitchingToLive ? "LIVE" : "PAPER")}
                disabled={isSwitchingToLive && (!confirmCheck1 || !confirmCheck2 || modeMutation.isPending)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer ${
                  isSwitchingToLive
                    ? "bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md shadow-amber-500/20"
                    : "bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20"
                }`}
              >
                {modeMutation.isPending ? "Switching..." : isSwitchingToLive ? "Switch to LIVE" : "Switch to PAPER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
