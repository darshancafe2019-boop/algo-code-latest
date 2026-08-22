"use client";

import React, { useState } from "react";
import { ShieldAlert, KeyRound, Smartphone, Lock, CheckCircle2, AlertTriangle, X } from "lucide-react";

interface StepUpModalProps {
  isOpen: boolean;
  purpose: string;
  actionTitle: string;
  actionDescription: string;
  onSuccess: (stepUpToken: string) => void;
  onClose: () => void;
}

export function StepUpModal({
  isOpen,
  purpose,
  actionTitle,
  actionDescription,
  onSuccess,
  onClose,
}: StepUpModalProps) {
  const [method, setMethod] = useState<"PASSKEY" | "TOTP" | "PASSWORD">("PASSKEY");
  const [totpCode, setTotpCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          auth_method: method,
          totp_code: totpCode,
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Step-up authentication failed.");
      }

      onSuccess(data.step_up_token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0A101D] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B] bg-gradient-to-r from-amber-950/40 via-[#0A101D] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{actionTitle}</h3>
              <p className="text-[11px] text-amber-400 font-mono">Step-Up Authentication Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs text-slate-300 leading-relaxed">
            {actionDescription}
          </div>

          {/* Auth Method Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setMethod("PASSKEY")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                method === "PASSKEY"
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm"
                  : "bg-[#070D14] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Passkey</span>
            </button>

            <button
              onClick={() => setMethod("TOTP")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                method === "TOTP"
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm"
                  : "bg-[#070D14] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>2FA App</span>
            </button>

            <button
              onClick={() => setMethod("PASSWORD")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                method === "PASSWORD"
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm"
                  : "bg-[#070D14] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Password</span>
            </button>
          </div>

          {/* Inputs based on method */}
          {method === "PASSKEY" && (
            <div className="p-4 rounded-xl bg-[#070D14] border border-[#1E293B] text-center space-y-2">
              <KeyRound className="w-6 h-6 mx-auto text-amber-400 animate-pulse" />
              <p className="text-xs text-slate-300 font-medium">Use MacBook Touch ID / WebAuthn</p>
              <p className="text-[11px] text-slate-500">Fastest biometric high-assurance verification</p>
            </div>
          )}

          {method === "TOTP" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D14] border border-[#1E293B] text-center font-mono text-lg font-bold tracking-widest text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          )}

          {method === "PASSWORD" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Confirm Master Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D14] border border-[#1E293B] font-mono text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#1E293B] bg-[#070D14] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthenticate}
            disabled={isLoading || (method === "TOTP" && totpCode.length !== 6) || (method === "PASSWORD" && !password)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            {isLoading ? "Verifying..." : "Authenticate & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
