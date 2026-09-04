"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, Unlock, KeyRound, AlertTriangle, RefreshCw, LogOut, ShieldCheck } from "lucide-react";

export function TerminalLockOverlay() {
  const { user, unlockTerminal, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage("Please enter your master password to unlock.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await unlockTerminal(password);
      if (!res.success) {
        setErrorMessage(res.error || "Incorrect unlock password.");
        setPassword("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#060913]/90 backdrop-blur-2xl flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-[#0B132B]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white tracking-wide">
            Terminal Locked
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Quant.OS secure idle lock engaged to protect active trading sessions.
          </p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold font-mono">
            {user?.username?.substring(0, 2).toUpperCase() || "AD"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold font-mono text-white truncate">
              {user?.username || "admin"}
            </p>
            <p className="text-xs text-slate-400 font-mono truncate">
              {user?.email || "admin@algotrading.local"} • <span className="text-cyan-400 font-semibold">{user?.role || "ADMIN"}</span>
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Enter Password to Unlock
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                disabled={isSubmitting}
                className="w-full bg-[#060913] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Unlock Terminal</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-rose-400 hover:text-rose-300 font-mono text-xs transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out & Terminate Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
