"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { BotRowItem } from "@/types/bot-control";

interface DeleteAllBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bots: BotRowItem[];
  onConfirmDeleteAll: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteAllBotsModal({
  isOpen,
  onClose,
  bots,
  onConfirmDeleteAll,
  isDeleting = false,
}: DeleteAllBotsModalProps) {
  const [typedConfirm, setTypedConfirm] = useState("");

  if (!isOpen) return null;

  const totalBots = bots.length;
  const runningBots = bots.filter((b) => {
    const s = (b.status || b.state || "").toUpperCase();
    return s === "RUNNING" || s === "STARTING" || s === "IN TRADE";
  });
  const liveBotsWithPositions = bots.filter(
    (b) => (b.environment === "LIVE" || b.execution_mode === "LIVE") && b.position?.has_position
  );

  const hasLiveOpenPositions = liveBotsWithPositions.length > 0;
  const isConfirmEnabled = typedConfirm.trim().toUpperCase() === "DELETE ALL" && !hasLiveOpenPositions;

  const handleConfirm = async () => {
    if (!isConfirmEnabled || isDeleting) return;
    try {
      await onConfirmDeleteAll();
      onClose();
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-[#0B132B] border border-rose-500/50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-rose-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>CRITICAL: Fleet-Wide Purge (Delete All Bots)</span>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
            <div className="text-white font-sans font-bold text-sm">
              You are about to delete ALL {totalBots} bots in your fleet.
            </div>
            <p className="text-slate-300 font-sans text-xs">
              This will terminate instances, remove configuration manifests, and purge local logs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Total Bots</span>
              <strong className="text-white text-sm">{totalBots}</strong>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Active / Running</span>
              <strong className="text-amber-400 text-sm">{runningBots.length}</strong>
            </div>
          </div>

          {hasLiveOpenPositions && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/80 rounded-xl text-rose-200 text-xs font-sans space-y-1">
              <strong className="block font-bold">⛔ ACTION BLOCKED: LIVE OPEN POSITIONS</strong>
              <p>
                {liveBotsWithPositions.length} LIVE bot(s) currently own open positions. You must square off or detach positions before purging the fleet.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-slate-400 text-[11px] block">
              Type <strong className="text-rose-400 font-bold">DELETE ALL</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="DELETE ALL"
              disabled={hasLiveOpenPositions || isDeleting}
              className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3 font-sans">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-950"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? "Purging Fleet..." : "Confirm Delete All"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
