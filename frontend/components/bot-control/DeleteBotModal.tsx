"use client";

import React from "react";
import { AlertTriangle, Trash2, X, CheckCircle2 } from "lucide-react";
import { BotRowItem } from "./SimpleBotTable";

interface DeleteBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: BotRowItem | null;
  onConfirmDelete: (botId: string, force?: boolean) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteBotModal({
  isOpen,
  onClose,
  bot,
  onConfirmDelete,
  isDeleting = false,
}: DeleteBotModalProps) {
  if (!isOpen || !bot) return null;

  const state = (bot.status || bot.state || "STOPPED").toUpperCase();
  const isLiveRunning = state === "RUNNING" || state === "PAUSED" || state === "STARTING";
  const isErrorOrStuck = state === "ERROR" || state === "RECOVERING" || state === "STUCK" || Boolean(bot.last_error);

  const handleConfirm = async (force: boolean = false) => {
    try {
      await onConfirmDelete(bot.id, force);
      onClose();
    } catch {
      // Error handling is managed by parent notification banner
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-[#0B132B] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{isErrorOrStuck ? "Force Delete Bot Instance" : "Delete Bot Instance"}</span>
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
              {isErrorOrStuck ? `Force Delete '${bot.name}'?` : `Delete '${bot.name}'?`}
            </h3>
            <p className="text-slate-400 font-sans text-xs">
              {isErrorOrStuck
                ? "This will forcefully kill any worker process, remove locks, timers, heartbeats, and purge the bot instance permanently."
                : "This will remove the bot instance from your fleet. This action cannot be undone."}
            </p>
          </div>

          {/* Bot Specs Summary Card */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Bot Identifier:</span>
              <span className="text-cyan-300 font-bold">{bot.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Symbol & Timeframe:</span>
              <span className="text-white font-bold">{bot.symbol} ({bot.timeframe})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Strategy:</span>
              <span className="text-slate-200 font-sans truncate max-w-xs">{bot.strategy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  state === "RUNNING"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : state === "PAUSED"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : state === "ERROR"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {state}
              </span>
            </div>
            {bot.last_error && (
              <div className="pt-1 border-t border-slate-800">
                <span className="text-rose-400 block font-sans text-[11px] truncate">
                  Error: {bot.last_error}
                </span>
              </div>
            )}
          </div>

          {/* Live Running Process Safety Warning */}
          {isLiveRunning && !isErrorOrStuck && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="font-sans leading-relaxed">
                <span className="font-bold text-amber-400 block mb-0.5">Live Process Termination Notice:</span>
                This bot is currently <strong className="text-white font-mono">{state}</strong>. Deleting it will cleanly stop the underlying OS worker process and safely record positions first before removing the instance.
              </div>
            </div>
          )}

          {/* Trade History & Position Preservation Policy Notice */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-xl flex items-start gap-2.5 text-cyan-300 text-xs font-sans">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-cyan-300 block mb-0.5">Trade & Position History Preserved:</span>
              All historical trades, open position details, journal entries, and P&L analytics tied to this bot will remain preserved for accounting and audit compliance.
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
          {isErrorOrStuck ? (
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50 font-sans"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Purging & Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Force Delete Bot</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/25 disabled:opacity-50 font-sans"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Stopping & Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bot</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
