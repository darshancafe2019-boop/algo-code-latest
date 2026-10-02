"use client";

import React from "react";
import { Layers, Trash2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { BotRowItem } from "@/types/bot-control";

interface DuplicateBotsReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: { key: string; bots: BotRowItem[] }[];
  onDeleteBot: (botId: string) => Promise<void>;
}

export function DuplicateBotsReviewModal({
  isOpen,
  onClose,
  duplicates,
  onDeleteBot,
}: DuplicateBotsReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0B132B] border border-cyan-500/40 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden font-mono text-xs max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Duplicate Bot Definitions Review ({duplicates.length} groups)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          {duplicates.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-mono text-xs">
              No duplicate bot definitions detected in active fleet.
            </div>
          ) : (
            duplicates.map((grp, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    Group: {grp.key}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                    {grp.bots.length} Instances
                  </span>
                </div>

                <div className="space-y-2">
                  {grp.bots.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <strong className="text-white block">{b.name}</strong>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {b.id} | Env: {b.environment || b.execution_mode || "PAPER"} | Status: {b.status || "STOPPED"}
                        </span>
                      </div>

                      <button
                        onClick={() => onDeleteBot(b.id)}
                        className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        Prune
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
}
