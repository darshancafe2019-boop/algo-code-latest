"use client";

import React from "react";
import {
  Power,
  ShieldAlert,
  AlertTriangle,
  X,
  RotateCcw,
} from "lucide-react";

interface EmergencyKillSwitchModalProps {
  isOpen: boolean;
  isKilled: boolean;
  onClose: () => void;
  onConfirmKill: () => void;
  onResetKill: () => void;
}

export const EmergencyKillSwitchModal: React.FC<EmergencyKillSwitchModalProps> = ({
  isOpen,
  isKilled,
  onClose,
  onConfirmKill,
  onResetKill,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#050e1d] border border-rose-600 shadow-2xl rounded-2xl overflow-hidden z-10 text-slate-100 font-sans p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-rose-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-950/60 border border-rose-600/50 flex items-center justify-center text-rose-400">
              <Power className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-rose-300 tracking-wide">
                {isKilled ? "RESET EMERGENCY STOP" : "TRIGGER EMERGENCY STOP"}
              </h2>
              <p className="text-xs text-slate-400">
                Master system execution & order interlock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#07192f] text-slate-400 hover:text-white border border-[#143e69]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 text-xs space-y-2 text-slate-300">
          <p>
            {isKilled
              ? "Resetting the emergency stop will restore automated trading schedulers and re-arm the risk engine."
              : "Activating the emergency stop will immediately:"}
          </p>
          {!isKilled && (
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-200">
              <li>Block all automated & manual trade execution</li>
              <li>Pause all active strategy trading bots</li>
              <li>Maintain real-time market data & price telemetry</li>
              <li>Lock the risk engine into hard halt state</li>
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#07192f] hover:bg-[#0c284a] text-slate-300 font-semibold text-xs border border-[#143e69] transition-all cursor-pointer"
          >
            DISMISS
          </button>
          {isKilled ? (
            <button
              onClick={onResetKill}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              RESET KILL SWITCH
            </button>
          ) : (
            <button
              onClick={onConfirmKill}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Power className="h-4 w-4" />
              CONFIRM EMERGENCY STOP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
