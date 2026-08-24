"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { executeCommand } from "@/lib/commandClient";
import { useUIStore } from "@/lib/store/useUIStore";
import {
  Play,
  Pause,
  Square,
  Power,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  X,
  Zap,
  RefreshCw,
} from "lucide-react";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm";
import { Badge } from "@/components/ui/badge";

export function MobileCommandSheet() {
  const queryClient = useQueryClient();
  const { activeBot, activeSymbol } = useActiveBot();
  const {
    isMobileCommandSheetOpen,
    setMobileCommandSheetOpen,
    setQuickOrderSide,
    setOrderPlacementModalOpen,
  } = useUIStore();

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Command Mutation
  const commandMutation = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: Record<string, any> }) => {
      setFeedbackMsg(`Dispatching ${action}...`);
      return await executeCommand(action, activeBot?.id, payload || {}, queryClient);
    },
    onSuccess: (data) => {
      setFeedbackMsg(`Success: ${data.message || "Command executed"}`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    },
    onError: (err: any) => {
      setFeedbackMsg(`Error: ${err.message || "Failed"}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
  });

  const botStatus = activeBot?.status?.toUpperCase() || "STOPPED";
  const isRunning = botStatus === "RUNNING";
  const isPaused = botStatus === "PAUSED";

  return (
    <>
      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-4 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setMobileCommandSheetOpen(true)}
          className="h-12 w-12 rounded-2xl bg-[var(--theme-accent)] text-black font-extrabold shadow-2xl flex items-center justify-center border border-white/20 active:scale-95 transition-all"
          aria-label="Open Mobile Trading Controls"
        >
          <Zap className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Bottom Command Sheet Drawer */}
      {isMobileCommandSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200">
          <div className="bg-[var(--theme-surface)] border-t border-[var(--theme-border)] rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--theme-accent)]" />
                <span className="font-mono font-bold text-sm text-[var(--theme-text-primary)]">
                  QUANT.OS COMMAND DOCK
                </span>
                <Badge variant={isRunning ? "running" : isPaused ? "paused" : "stopped"} dot>
                  {botStatus}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setMobileCommandSheetOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status & Feedback Toast */}
            {feedbackMsg && (
              <div className="bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-accent)] text-center">
                {feedbackMsg}
              </div>
            )}

            {/* Quick Bot Control Buttons (Single-Click) */}
            <div className="grid grid-cols-2 gap-2.5">
              {!isRunning && (
                <button
                  type="button"
                  disabled={commandMutation.isPending}
                  onClick={() => commandMutation.mutate({ action: "START_BOT" })}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-profit)] text-black font-mono font-bold text-xs shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>START BOT</span>
                </button>
              )}

              {isRunning && (
                <button
                  type="button"
                  disabled={commandMutation.isPending}
                  onClick={() => commandMutation.mutate({ action: "PAUSE_BOT" })}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-black font-mono font-bold text-xs shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <Pause className="h-4 w-4 fill-current" />
                  <span>PAUSE BOT</span>
                </button>
              )}

              {isPaused && (
                <button
                  type="button"
                  disabled={commandMutation.isPending}
                  onClick={() => commandMutation.mutate({ action: "RESUME_BOT" })}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-profit)] text-black font-mono font-bold text-xs shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>RESUME BOT</span>
                </button>
              )}

              <button
                type="button"
                disabled={commandMutation.isPending || botStatus === "STOPPED"}
                onClick={() => commandMutation.mutate({ action: "STOP_BOT" })}
                className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] font-mono font-bold text-xs hover:bg-[var(--theme-surface)] active:scale-98 transition-all disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>STOP BOT</span>
              </button>
            </div>

            {/* Quick Order Dispatch Toggles */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--theme-border-subtle)]">
              <span className="text-[10px] font-mono uppercase text-[var(--theme-text-muted)]">
                Instant Order Placement ({activeSymbol || "BTC/USDT"})
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQuickOrderSide("BUY");
                    setOrderPlacementModalOpen(true);
                    setMobileCommandSheetOpen(false);
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/40 text-[var(--theme-profit)] font-mono font-bold text-xs active:scale-98"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>BUY / LONG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickOrderSide("SELL");
                    setOrderPlacementModalOpen(true);
                    setMobileCommandSheetOpen(false);
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)]/40 text-[var(--theme-loss)] font-mono font-bold text-xs active:scale-98"
                >
                  <TrendingDown className="h-4 w-4" />
                  <span>SELL / SHORT</span>
                </button>
              </div>
            </div>

            {/* Emergency Kill Switch (Hold to Confirm) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--theme-border-subtle)]">
              <span className="text-[10px] font-mono uppercase text-[var(--theme-text-muted)]">
                Institutional Safety Controls
              </span>
              <HoldToConfirmButton
                label="HOLD FOR EMERGENCY HALT"
                confirmingLabel="TRIGGERING EMERGENCY HALT..."
                variant="danger"
                className="w-full min-h-[48px] text-xs"
                onConfirmed={() => {
                  commandMutation.mutate({
                    action: "ACTIVATE_KILL_SWITCH",
                    payload: { reason: "Mobile Emergency Halt" },
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
