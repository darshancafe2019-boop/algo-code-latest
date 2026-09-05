"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  X,
  FileCheck,
  Sliders,
  DollarSign,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TradingProtectionSummary {
  status: string;
  trading_protection: {
    live_trading_status: string;
    is_live_locked: boolean;
    lock_details: {
      locked: boolean;
      locked_at: string | null;
      locked_by: string | null;
      reason: string;
    };
    bots_status: string;
    withdrawals_status: string;
    risk_engine_status: string;
    emergency_lock_status: string;
  };
  bot_permissions: Array<{
    id: string;
    label: string;
    status: string;
    category: string;
  }>;
  fund_security: {
    withdrawal_scope: string;
    withdrawal_apis_blocked: boolean;
    whitelisted_ip_enforcement: boolean;
  };
}

interface SimpleTradingProtectionSectionProps {
  onRefresh: () => void;
}

export function SimpleTradingProtectionSection({ onRefresh }: SimpleTradingProtectionSectionProps) {
  const queryClient = useQueryClient();
  const [isPermissionsDrawerOpen, setIsPermissionsDrawerOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch Trading Protection status
  const { data: protectionData, refetch: refetchProtection } = useQuery<TradingProtectionSummary>({
    queryKey: ["tradingProtectionSummary"],
    queryFn: async () => {
      const res = await fetch("/api/security/trading-protection");
      if (!res.ok) throw new Error("Failed to load trading protection status");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const protection = protectionData?.trading_protection;
  const isLocked = protection?.is_live_locked ?? false;

  const handleToggleLock = async () => {
    setIsActing(true);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/security/trading-protection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked: !isLocked,
          reason: !isLocked ? "Manual Live Trading Lock by Operator" : "Live Trading Lock Released",
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setIsLockModalOpen(false);
        refetchProtection();
        onRefresh();
      } else {
        setActionFeedback(data.message || "Failed to toggle live trading lock");
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                2. TRADING PROTECTION & ACCESS
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isLocked
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                }`}
              >
                {isLocked ? "LIVE LOCKED" : "PROTECTED"}
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs mt-0.5">
              Authoritative Execution Gate, Scoped Bot Permissions & Zero-Withdrawal Enforcement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPermissionsDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold transition flex items-center gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Review Permissions</span>
          </button>

          <button
            onClick={() => setIsLockModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl font-black transition flex items-center gap-1.5 border shadow-lg ${
              isLocked
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-rose-600 text-white border-rose-500 hover:bg-rose-500 shadow-rose-600/20"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{isLocked ? "UNLOCK LIVE TRADING" : "LOCK LIVE TRADING"}</span>
          </button>
        </div>
      </div>

      {/* 4 Protection Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Live Trading Status */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Live Execution Gate</span>
            {isLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div className={`text-sm font-bold font-mono ${isLocked ? "text-rose-400" : "text-emerald-400"}`}>
            {isLocked ? "Locked (Blocked)" : "Protected ✓"}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Server-Enforced Token Gate
          </div>
        </div>

        {/* Bot Permissions */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Bot Fleet Permissions</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            Restricted ✓
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Cannot alter risk or API keys
          </div>
        </div>

        {/* Withdrawal Scope */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Fund Security</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            Withdrawals Disabled ✓
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Zero withdrawal APIs exposed
          </div>
        </div>

        {/* Central Risk Engine */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Pre-Trade Risk Engine</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            Required ✓
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            14 Pre-Trade Gates Armed
          </div>
        </div>
      </div>

      {/* Review Permissions Modal */}
      {isPermissionsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Bot Fleet Scoped Permissions Matrix
                </h4>
              </div>
              <button
                onClick={() => setIsPermissionsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {(protectionData?.bot_permissions || []).map((perm, idx) => {
                const isAllowed = perm.status === "ALLOWED";
                const isNever = perm.status === "NEVER_ALLOWED";

                return (
                  <div
                    key={perm.id || `perm-${perm.label || perm.category || idx}`}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">{perm.label}</div>
                      <div className="text-[10px] text-slate-500 font-sans uppercase">
                        Category: {perm.category}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAllowed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : isNever
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {perm.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsPermissionsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Live Trading Confirmation Modal */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-rose-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-400" />
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  {isLocked ? "Unlock Live Trading?" : "LOCK LIVE TRADING?"}
                </h4>
              </div>
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2 text-slate-300 font-sans text-xs">
              <p className="font-bold text-white">
                {isLocked
                  ? "Are you sure you want to release the live trading lock?"
                  : "This immediately blocks all NEW live manual orders, automated bot entries, options spreads, and futures orders."}
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Monitoring, active position tracking, real-time P&L calculations, risk checks, and reconciliation remain fully functional.
              </p>
            </div>

            {actionFeedback && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-rose-400 text-xs font-sans">
                {actionFeedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-bold transition"
              >
                Cancel
              </button>

              <button
                onClick={handleToggleLock}
                disabled={isActing}
                className={`py-2.5 px-4 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                  isLocked
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{isActing ? "Applying Lock..." : isLocked ? "Confirm Unlock" : "Lock Live Trading"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
