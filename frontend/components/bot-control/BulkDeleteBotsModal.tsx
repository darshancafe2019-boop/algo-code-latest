"use client";

import React from "react";
import { AlertTriangle, Trash2, X, CheckCircle2, ShieldAlert } from "lucide-react";
import { BotRowItem } from "./SimpleBotTable";

interface BulkDeleteBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBots: BotRowItem[];
  onConfirmBulkDelete: (botIds: string[]) => Promise<void>;
  isDeleting?: boolean;
}

export function BulkDeleteBotsModal({
  isOpen,
  onClose,
  selectedBots,
  onConfirmBulkDelete,
  isDeleting = false,
}: BulkDeleteBotsModalProps) {
  if (!isOpen || selectedBots.length === 0) return null;

  const totalCount = selectedBots.length;
  const runningBots = selectedBots.filter((b) => {
    const s = (b.status || b.state || "STOPPED").toUpperCase();
    return s === "RUNNING" || s === "PAUSED" || s === "STARTING";
  });
  const runningCount = runningBots.length;

  const handleConfirm = async () => {
    try {
      const ids = selectedBots.map((b) => b.id);
      await onConfirmBulkDelete(ids);
      onClose();
    } catch {
      // Handled by parent error notification
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-[#0B132B] border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Bulk Delete Bot Instances</span>
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
          {/* Main prompt */}
          <div className="space-y-1">
            <h3 className="text-white font-sans font-bold text-sm">
              Delete {totalCount} selected bot{totalCount > 1 ? "s" : ""}?
            </h3>
            <p className="text-slate-400 font-sans text-xs">
              This will remove {totalCount} bot instance{totalCount > 1 ? "s" : ""} from your fleet. This action cannot be undone.
            </p>
          </div>

          {/* Running Process Termination Warning if any selected are running */}
          {runningCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="font-sans leading-relaxed">
                <span className="font-bold text-amber-400 block mb-0.5">Active Process Notice:</span>
                <strong className="text-white font-mono">{runningCount}</strong> of the {totalCount} selected bots are currently running or paused. Their processes will be cleanly stopped first before removal.
              </div>
            </div>
          )}

          {/* Trade History Preservation Policy Notice */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-xl flex items-start gap-2.5 text-cyan-300 text-xs font-sans">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-cyan-300 block mb-0.5">Trade History Preserved:</span>
              Historical trades and execution journals for all {totalCount} bots will remain preserved in your database for audit logs and analytics.
            </div>
          </div>

          {/* Scrollable list of bots to be deleted */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 font-sans flex justify-between items-center">
              <span>Bots to be removed ({totalCount}):</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl divide-y divide-slate-800/60 space-y-1">
              {selectedBots.map((bot) => {
                const s = (bot.status || bot.state || "STOPPED").toUpperCase();
                return (
                  <div key={bot.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold truncate text-xs">{bot.name}</div>
                      <div className="text-[10px] text-slate-500 font-sans truncate">
                        {bot.symbol} • {bot.id}
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        s === "RUNNING"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : s === "PAUSED"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition disabled:opacity-50 font-sans"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/25 disabled:opacity-50 font-sans"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting {totalCount} Bots...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {totalCount} Bots</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
