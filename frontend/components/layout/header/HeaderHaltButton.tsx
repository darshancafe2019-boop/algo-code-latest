"use client";

import React, { useState, memo } from "react";
import { Power, AlertTriangle, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";

interface HeaderHaltButtonProps {
  isKillSwitchActive: boolean;
}

export const HeaderHaltButton = memo(function HeaderHaltButton({
  isKillSwitchActive = false,
}: HeaderHaltButtonProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");

  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      if (isKillSwitchActive) {
        return await executeCommand("DEACTIVATE_KILL_SWITCH", null, {}, queryClient);
      } else {
        return await executeCommand("ACTIVATE_KILL_SWITCH", null, { reason: "Header Emergency Halt" }, queryClient);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      setShowModal(false);
      setConfirmWord("");
    },
  });

  const targetWord = isKillSwitchActive ? "RESUME" : "HALT";
  const isConfirmed = confirmWord.trim().toUpperCase() === targetWord;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirmWord("");
          setShowModal(true);
        }}
        aria-label={isKillSwitchActive ? "Resume all trading operations" : "Emergency halt new order execution"}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shadow-xs select-none border focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 ${
          isKillSwitchActive
            ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]"
            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:border-rose-500/50"
        }`}
        title={isKillSwitchActive ? "Click to Resume Platform Trading" : "Safety Emergency Halt"}
      >
        <Power className="h-3.5 w-3.5" />
        <span className="text-[11px] tracking-wide">{isKillSwitchActive ? "RESUME" : "HALT"}</span>
      </button>

      {/* Explicit Halt Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border-subtle)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {isKillSwitchActive ? "Resume All Trading Operations?" : "HALT NEW ORDERS?"}
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

            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-2 text-[11px] leading-relaxed font-sans">
              <p className="font-bold font-mono">
                {isKillSwitchActive ? "RESUME CONFIRMATION:" : "EMERGENCY SAFETY OVERRIDE:"}
              </p>
              <p>
                {isKillSwitchActive
                  ? "This will re-arm order execution gateways and resume active strategy evaluation loops across all running bots."
                  : "This will stop new order execution across all bots. Existing positions will NOT automatically be closed unless the configured emergency procedure explicitly says so."}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-slate-400 text-[11px]">
                Type <strong className="text-rose-400 font-mono font-bold">{targetWord}</strong> to confirm safety action:
              </label>
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                placeholder={`Type ${targetWord}`}
                autoFocus
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] focus:border-rose-500 rounded-xl px-3 py-2 text-sm font-mono text-white placeholder:text-slate-600 outline-none uppercase"
              />
            </div>

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
                onClick={() => killSwitchMutation.mutate()}
                disabled={!isConfirmed || killSwitchMutation.isPending}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer ${
                  isKillSwitchActive
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20"
                }`}
              >
                {killSwitchMutation.isPending
                  ? "Executing..."
                  : isKillSwitchActive
                  ? "Confirm Resume"
                  : "HALT NEW ORDERS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
