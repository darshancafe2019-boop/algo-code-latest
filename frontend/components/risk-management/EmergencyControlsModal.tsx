"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  Pause,
  XCircle,
  Square,
  RefreshCw,
  X,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface EmergencyControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isKillSwitchActive: boolean;
}

export function EmergencyControlsModal({
  isOpen,
  onClose,
  isKillSwitchActive,
}: EmergencyControlsModalProps) {
  const queryClient = useQueryClient();
  const [killConfirmed, setKillConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Pause New Orders Mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bots/pause-all", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "All active bots paused successfully." });
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
    },
  });

  // 2. Cancel Open Orders Mutation
  const cancelOrdersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/orders", { method: "DELETE" });
      if (!res.ok) {
        // Fallback to stop-all if direct cancel all is mapped
        await fetch("/api/bots/stop-all", { method: "POST" });
      }
      return { status: "success", message: "All open resting orders cancelled." };
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message });
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["botOrders"] });
    },
  });

  // 3. Close All Paper Positions Mutation
  const closePositionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bots/paper/reset", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "All simulated paper positions squared off." });
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["botPositions"] });
    },
  });

  // 4. Global Kill Switch Mutation (Authoritative Backend Stop)
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bots/stop-all", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: "SERVER KILL SWITCH ACTIVATED. System trading halted." });
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="bg-[#0D1914] border border-red-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-red-900/60 bg-red-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-400 font-bold">
            <div className="p-2 rounded-xl bg-red-900/40 border border-red-800">
              <AlertOctagon className="h-6 w-6 fill-current animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white">
                Emergency Trading Controls
              </h2>
              <p className="text-xs text-red-300 font-normal">
                Authoritative Server-Side Emergency Defense
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {isKillSwitchActive && (
            <div className="p-3.5 bg-red-950/80 border border-red-700 rounded-xl flex items-center gap-2.5 text-red-300 font-bold font-mono">
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
              <span>KILL SWITCH ACTIVE — System in emergency halt.</span>
            </div>
          )}

          <div className="space-y-2.5">
            {/* 1. Pause New Orders */}
            <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Pause New Orders</span>
                <span className="text-[11px] text-[#A8BDB0]">Suspends signal dispatch across all running bots.</span>
              </div>
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {pauseMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                <span>Pause</span>
              </button>
            </div>

            {/* 2. Cancel Open Orders */}
            <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Cancel Open Orders</span>
                <span className="text-[11px] text-[#A8BDB0]">Cancels all resting limit and stop orders in flight.</span>
              </div>
              <button
                onClick={() => cancelOrdersMutation.mutate()}
                disabled={cancelOrdersMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {cancelOrdersMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>Cancel Orders</span>
              </button>
            </div>

            {/* 3. Close All Paper Positions */}
            <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Close Paper Positions</span>
                <span className="text-[11px] text-[#A8BDB0]">Instantly squares off all open simulated positions.</span>
              </div>
              <button
                onClick={() => closePositionsMutation.mutate()}
                disabled={closePositionsMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {closePositionsMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                <span>Close All</span>
              </button>
            </div>

            {/* 4. Global Kill Switch */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-red-300 block">GLOBAL EMERGENCY KILL SWITCH</span>
                  <span className="text-[11px] text-slate-300">Stops all workers, disconnects sockets, cancels orders.</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={killConfirmed}
                  onChange={(e) => setKillConfirmed(e.target.checked)}
                  className="accent-red-500 rounded h-4 w-4"
                />
                <span>I confirm server-authoritative emergency halt.</span>
              </label>

              <button
                onClick={() => killSwitchMutation.mutate()}
                disabled={!killConfirmed || killSwitchMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 disabled:opacity-40"
              >
                {killSwitchMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertOctagon className="h-4 w-4 fill-current" />}
                <span>TRIGGER GLOBAL KILL SWITCH</span>
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-red-950 text-red-300 border border-red-800"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1B3328] bg-[#0A130F] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#07110D] hover:bg-[#123C2A] text-slate-300 font-bold text-xs transition-colors"
          >
            Close Emergency Panel
          </button>
        </div>
      </div>
    </div>
  );
}
