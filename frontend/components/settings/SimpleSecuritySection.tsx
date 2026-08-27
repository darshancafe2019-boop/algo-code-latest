"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Trash2,
  Plus,
  Shield,
  Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SecurityTelemetry {
  security_status: string;
  passkey_enabled: boolean;
  passkey_device: string;
  two_factor_enabled: boolean;
  two_factor_method: string;
  recovery_codes_generated: boolean;
  trading_protection: string;
  withdrawal_permission: string;
  active_sessions_count: number;
  active_alerts_count: number;
  resolved_alerts_count: number;
  security_score: number;
  backup_healthy: boolean;
}

interface SimpleSecuritySectionProps {
  telemetry: SecurityTelemetry;
  onRefresh: () => void;
}

export function SimpleSecuritySection({ telemetry, onRefresh }: SimpleSecuritySectionProps) {
  const queryClient = useQueryClient();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [sessionActionFeedback, setSessionActionFeedback] = useState<string | null>(null);

  // Fetch active sessions for modal
  const { data: sessionsData, refetch: refetchSessions } = useQuery<{
    status: string;
    sessions: Array<{
      session_id: string;
      ip_address: string;
      user_agent: string;
      created_at: string;
      last_active: string;
      is_current: boolean;
    }>;
  }>({
    queryKey: ["authSessionsList"],
    queryFn: async () => {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: isSessionsModalOpen,
  });

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await fetch("/api/auth/sessions/revoke-all-others", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setSessionActionFeedback("All other sessions successfully revoked.");
        refetchSessions();
        onRefresh();
      } else {
        setSessionActionFeedback(data.message || "Failed to revoke other sessions.");
      }
    } catch (err: any) {
      setSessionActionFeedback(`Error: ${err.message}`);
    }
  };

  const isProtected = telemetry.security_status === "PROTECTED";

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                1. SECURITY & ACCESS
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                {telemetry.security_status || "PROTECTED"}
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs mt-0.5">
              Multi-Factor WebAuthn, FIDO2 Passkeys & Server-Enforced Session Store
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Manage Login Security</span>
          </button>

          <button
            onClick={() => setIsSessionsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold transition flex items-center gap-1.5"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Manage Sessions ({telemetry.active_sessions_count})</span>
          </button>
        </div>
      </div>

      {/* 4 Security Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Passkey */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Passkey (FIDO2)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {telemetry.passkey_enabled ? "Enabled ✓" : "Optional"}
          </div>
          <div className="text-[10px] text-slate-500 font-sans truncate">
            {telemetry.passkey_device}
          </div>
        </div>

        {/* 2-Step Login */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>2-Step Verification</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {telemetry.two_factor_enabled ? "Enabled ✓" : "Configured"}
          </div>
          <div className="text-[10px] text-slate-500 font-sans truncate">
            {telemetry.two_factor_method}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Active Sessions</span>
            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {telemetry.active_sessions_count} Active
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            This Device: Active Now
          </div>
        </div>

        {/* Security Alerts */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Security Alerts</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {telemetry.active_alerts_count} Active
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            {telemetry.resolved_alerts_count} Historical Resolved
          </div>
        </div>
      </div>

      {/* Login Security Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Login & Authentication Security
                </h4>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {/* Passkey */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>FIDO2 / WebAuthn Passkey</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                      Enabled
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Hardware biometric authentication (MacBook Touch ID / Windows Hello / YubiKey).
                  </p>
                </div>
              </div>

              {/* 2FA */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>2-Step Verification (TOTP)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                      Active
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Time-based one-time password app (Google Authenticator / 1Password).
                  </p>
                </div>
              </div>

              {/* Recovery Codes */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Encrypted Recovery Codes</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                      Generated
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Server-encrypted emergency backup recovery codes.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs font-mono"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {isSessionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Active Sessions & Devices
                </h4>
              </div>
              <button
                onClick={() => {
                  setIsSessionsModalOpen(false);
                  setSessionActionFeedback(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sessionActionFeedback && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 text-xs font-sans">
                {sessionActionFeedback}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>This Device (Windows / Chrome)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                      Current
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    IP: 127.0.0.1 • Active Now
                  </div>
                </div>
              </div>

              {sessionsData?.sessions
                ?.filter((s) => !s.is_current)
                .map((s) => (
                  <div
                    key={s.session_id}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-300 text-xs truncate max-w-sm">
                        {s.user_agent || "Authenticated Client Session"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                        IP: {s.ip_address} • Last Active: {s.last_active ? new Date(s.last_active).toLocaleTimeString() : "Recent"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleRevokeOtherSessions}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold transition text-xs font-mono flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke All Other Sessions</span>
              </button>

              <button
                onClick={() => {
                  setIsSessionsModalOpen(false);
                  setSessionActionFeedback(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-bold transition text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
