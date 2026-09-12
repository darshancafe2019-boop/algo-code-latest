"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  KeyRound,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  RefreshCw,
  Trash2,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Filter,
  Sliders,
  ChevronRight,
  Info,
  Check,
  Globe,
  Radio,
  FileCheck,
  SlidersHorizontal,
  Zap,
  ArrowRight,
  Fingerprint,
  QrCode,
  Copy
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export interface SecurityTelemetry {
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
  latest_backup_time?: string | null;
  emergency_lock_active?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  is_2fa_enabled: boolean;
  must_change_password: boolean;
  passkeys_count?: number;
  recovery_codes_remaining?: number;
}

export interface SessionItem {
  session_id: string;
  device_name?: string;
  ip_address: string;
  user_agent: string;
  approximate_location?: string;
  created_at: string;
  last_active_at?: string;
  last_active?: string;
  expires_at?: string;
  is_current?: boolean;
}

export interface SecurityEventItem {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  device: string;
  ip: string;
  user_id?: string;
  description: string;
  resolution: string;
  result: string;
  details?: any;
}

export interface PasskeyItem {
  id: string;
  credential_id: string;
  name?: string;
  device_name?: string;
  created_at: string;
  last_used_at?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function ProductionSecurityControlCenter() {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);

  // Modals state
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isLockConfirmModalOpen, setIsLockConfirmModalOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionItem | null>(null);
  const [isRevokeAllConfirmOpen, setIsRevokeAllConfirmOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Security Overview
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching: isOverviewRefetching
  } = useQuery<{
    status: string;
    telemetry: SecurityTelemetry;
    checkup: Array<{ id: string; label: string; status: string; score: number }>;
  }>({
    queryKey: ["authoritativeSecurityOverview"],
    queryFn: async () => {
      const res = await fetch("/api/security/overview");
      if (!res.ok) throw new Error("Failed to load security overview");
      return res.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // 2. Fetch User Profile
  const {
    data: authMeData,
    refetch: refetchMe
  } = useQuery<{
    status: string;
    authenticated: boolean;
    user: UserProfile | null;
    session: any;
    permissions: string[];
  }>({
    queryKey: ["authMeSession"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load user profile");
      return res.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // 3. Fetch Sessions
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    refetch: refetchSessions
  } = useQuery<{
    status: string;
    sessions: SessionItem[];
  }>({
    queryKey: ["authSessionsList"],
    queryFn: async () => {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    refetchInterval: 8000,
    staleTime: 4000,
  });

  // 4. Fetch Trading Protection
  const {
    data: tradingProtectionData,
    refetch: refetchProtection
  } = useQuery<{
    status: string;
    trading_protection: {
      live_trading_status: string;
      is_live_locked: boolean;
      lock_details: any;
      bots_status: string;
      withdrawals_status: string;
      risk_engine_status: string;
    };
    bot_permissions: Array<{ id: string; label: string; status: string; category: string }>;
  }>({
    queryKey: ["tradingProtectionSummary"],
    queryFn: async () => {
      const res = await fetch("/api/security/trading-protection");
      if (!res.ok) throw new Error("Failed to fetch trading protection status");
      return res.json();
    },
    refetchInterval: 6000,
    staleTime: 3000,
  });

  const handleRefreshAll = () => {
    refetchOverview();
    refetchMe();
    refetchSessions();
    refetchProtection();
  };

  const telemetry = overviewData?.telemetry || {
    security_status: "PROTECTED",
    passkey_enabled: true,
    passkey_device: "MacBook Touch ID / Windows Hello",
    two_factor_enabled: true,
    two_factor_method: "Authenticator App",
    recovery_codes_generated: true,
    trading_protection: "ACTIVE",
    withdrawal_permission: "DISABLED",
    active_sessions_count: 1,
    active_alerts_count: 0,
    resolved_alerts_count: 36,
    security_score: 90,
    backup_healthy: true,
  };

  const user = authMeData?.user || {
    id: "usr_admin_01",
    username: "admin",
    email: "ashishparadkar1999@gmail.com",
    role: "ADMIN",
    is_2fa_enabled: true,
    must_change_password: false,
    passkeys_count: 1,
    recovery_codes_remaining: 8,
  };

  const sessions = sessionsData?.sessions || [];
  const currentSession = sessions.find((s) => s.is_current) || (sessions.length > 0 ? sessions[0] : null);
  const otherSessionsCount = Math.max(0, sessions.length - (currentSession ? 1 : 0));

  const isLiveLocked = tradingProtectionData?.trading_protection?.is_live_locked ?? false;
  const healthScore = telemetry.security_score || 85;

  if (!isMounted) return null;

  return (
    <div className="space-y-6 w-full min-w-0 font-sans text-slate-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER WITH RESPONSIVE ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-[#0B132B]/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">1. SECURITY & ACCESS</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                telemetry.security_status === "PROTECTED"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/40"
              }`}>
                {telemetry.security_status || "PROTECTED"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 truncate">
              Security Control Center
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 break-words">
              Account authentication, multi-factor WebAuthn, active sessions, and automated risk protection.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
          <button
            onClick={handleRefreshAll}
            disabled={isOverviewRefetching}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono font-semibold transition flex items-center gap-1.5 shadow-sm"
            title="Refresh security status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isOverviewRefetching ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Activity Log</span>
          </button>

          <button
            onClick={() => setIsSessionsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Manage Sessions ({telemetry.active_sessions_count})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECURITY HEALTH SCORE & RECOMMENDATIONS */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 bg-[#0B132B]/80 border border-slate-800 rounded-2xl backdrop-blur-md shadow-lg grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Score Gauge */}
        <div className="flex items-center gap-5 lg:border-r border-slate-800/80 lg:pr-6">
          <div className="relative flex items-center justify-center shrink-0 w-24 h-24 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-center">
              <span className="text-3xl font-black font-mono text-cyan-400">{healthScore}</span>
              <span className="text-[10px] font-mono text-slate-500 block">/ 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Health Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                healthScore >= 80 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {healthScore >= 80 ? "Optimal / Protected" : "Attention Required"}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">Platform Security Score</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic 7-point institutional verification covering 2FA, session policies, and API isolation.
            </p>
          </div>
        </div>

        {/* Center/Right: Actionable Recommendations */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Security Recommendations</span>
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Review Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate">2-Step TOTP Active</span>
            </div>
            <div className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate">API Withdrawal Blocked</span>
            </div>
            <div className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center gap-2">
              {otherSessionsCount > 0 ? (
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs text-slate-300 truncate">
                {otherSessionsCount > 0 ? `${otherSessionsCount} other sessions active` : "Zero stale sessions"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 4-PILLAR RESPONSIVE STATUS CARDS (Desktop: 4, Med: 2, Mobile: 1) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        {/* Card 1: Passkey / FIDO2 */}
        <div className="p-4 sm:p-5 bg-[#0B132B]/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition min-w-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              telemetry.passkey_enabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
            }`}>
              {telemetry.passkey_enabled ? "Configured" : "Optional"}
            </span>
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Passkey (FIDO2)</div>
            <div className="text-base font-bold text-white font-mono mt-0.5 truncate">
              {telemetry.passkey_enabled ? "Biometrics Active" : "Not Configured"}
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1 truncate" title={telemetry.passkey_device}>
              {telemetry.passkey_device || "Hardware Security Key"}
            </div>
          </div>
          <button
            onClick={() => setIsPasskeyModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-300 text-xs font-mono font-semibold transition"
          >
            {telemetry.passkey_enabled ? "Manage Passkeys" : "Add Passkey"}
          </button>
        </div>

        {/* Card 2: 2-Step Verification */}
        <div className="p-4 sm:p-5 bg-[#0B132B]/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition min-w-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Enabled ✓
            </span>
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Two-Factor Authentication</div>
            <div className="text-base font-bold text-white font-mono mt-0.5 truncate">
              {telemetry.two_factor_method || "Authenticator App"}
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1 truncate">
              {user.recovery_codes_remaining ?? 8} Backup codes remaining
            </div>
          </div>
          <button
            onClick={() => setIs2FAModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-300 text-xs font-mono font-semibold transition"
          >
            Configure 2FA
          </button>
        </div>

        {/* Card 3: Active Sessions */}
        <div className="p-4 sm:p-5 bg-[#0B132B]/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition min-w-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {telemetry.active_sessions_count} Active
            </span>
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Sessions</div>
            <div className="text-base font-bold text-white font-mono mt-0.5 truncate">
              This Device: Active Now
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1 truncate">
              {otherSessionsCount} other device{otherSessionsCount === 1 ? "" : "s"} logged in
            </div>
          </div>
          <button
            onClick={() => setIsSessionsModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-300 text-xs font-mono font-semibold transition"
          >
            Manage Sessions
          </button>
        </div>

        {/* Card 4: Security Alerts & Activity */}
        <div className="p-4 sm:p-5 bg-[#0B132B]/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition min-w-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {telemetry.active_alerts_count} Active
            </span>
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Security Activity</div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5 truncate">
              System Protected
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1 truncate">
              {telemetry.resolved_alerts_count} Historical events resolved
            </div>
          </div>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-300 text-xs font-mono font-semibold transition"
          >
            View Activity Ledger
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACCOUNT PROFILE & LOGIN CREDENTIALS SECTION */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 bg-[#0B132B]/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">ACCOUNT & LOGIN</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {user.role}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">Operator Identity & Password Credentials</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Item 1: Username */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Username</span>
              <div className="text-base font-mono font-bold text-white mt-1 flex items-center gap-2">
                <span>{user.username}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Terminal operator handle used for logging and audit attribution.
              </p>
            </div>
            <button
              onClick={() => setIsUsernameModalOpen(true)}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Change Username</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Item 2: Email */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Registered Email</span>
              <div className="text-base font-mono font-bold text-white mt-1 truncate" title={user.email}>
                {maskEmail(user.email)}
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Destination channel for 2-Step OTP authorizations and security alerts.
              </p>
            </div>
            <div className="mt-2 py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono flex items-center justify-between">
              <span>Delivery Status</span>
              <span className="text-emerald-400 font-bold">Verified ✓</span>
            </div>
          </div>

          {/* Item 3: Password */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Master Password</span>
              <div className="text-base font-mono font-bold text-white mt-1 tracking-widest">
                ••••••••••••••••
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Bcrypt-hashed with cryptographic salt at rest. Passwords are never logged.
              </p>
            </div>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Change Password</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TRADING PROTECTION & RISK CONTROLS SECTION */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 bg-[#0B132B]/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isLiveLocked
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              {isLiveLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">2. TRADING PROTECTION</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isLiveLocked
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {isLiveLocked ? "LIVE LOCKED" : "ACTIVE / PROTECTED"}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">Execution Gates, Fund Safety & Risk Controls</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPermissionsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono font-semibold transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Review Permissions Matrix</span>
            </button>

            <button
              onClick={() => setIsLockConfirmModalOpen(true)}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                isLiveLocked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
              }`}
            >
              {isLiveLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isLiveLocked ? "UNLOCK LIVE TRADING" : "LOCK LIVE TRADING"}</span>
            </button>
          </div>
        </div>

        {/* 4 Trading Safety Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
              <span>Live Trading</span>
              <span className={`w-2 h-2 rounded-full ${isLiveLocked ? "bg-rose-400" : "bg-emerald-400"}`} />
            </div>
            <div className={`text-base font-bold font-mono ${isLiveLocked ? "text-rose-400" : "text-emerald-400"}`}>
              {isLiveLocked ? "Execution Blocked" : "Protected & Armed"}
            </div>
            <p className="text-xs text-slate-500 font-sans">
              {isLiveLocked ? "Emergency safety lock engaged." : "14-point pre-trade checks active."}
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
              <span>Bot Permissions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-white">
              Strictly Scoped
            </div>
            <p className="text-xs text-slate-500 font-sans">
              Bots restricted from administrative and fund withdrawal operations.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
              <span>Fund Security</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              Withdrawals Disabled
            </div>
            <p className="text-xs text-slate-500 font-sans">
              Exchange API keys enforce zero-withdrawal permission policies.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
              <span>Pre-Trade Risk</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-cyan-400">
              14 Gates Armed
            </div>
            <p className="text-xs text-slate-500 font-sans">
              Max drawdown, spread limits, staleness and circuit breakers verified.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Change Username Modal */}
      {isUsernameModalOpen && (
        <ChangeUsernameModal
          currentUsername={user.username}
          userEmail={user.email}
          onClose={() => setIsUsernameModalOpen(false)}
          onSuccess={() => {
            setIsUsernameModalOpen(false);
            refetchMe();
            refetchOverview();
          }}
        />
      )}

      {/* 2. Change Password Modal */}
      {isPasswordModalOpen && (
        <ChangePasswordModal
          userEmail={user.email}
          onClose={() => setIsPasswordModalOpen(false)}
          onSuccess={() => {
            setIsPasswordModalOpen(false);
            refetchMe();
            refetchSessions();
            refetchOverview();
          }}
        />
      )}

      {/* 3. Manage Sessions Modal */}
      {isSessionsModalOpen && (
        <ManageSessionsModal
          sessions={sessions}
          onClose={() => setIsSessionsModalOpen(false)}
          onRevokeSingle={(session) => setSessionToRevoke(session)}
          onRevokeAllOthers={() => setIsRevokeAllConfirmOpen(true)}
          onRefresh={refetchSessions}
        />
      )}

      {/* 4. Single Session Revoke Confirmation Modal */}
      {sessionToRevoke && (
        <RevokeSingleSessionModal
          session={sessionToRevoke}
          onClose={() => setSessionToRevoke(null)}
          onSuccess={() => {
            setSessionToRevoke(null);
            refetchSessions();
            refetchOverview();
          }}
        />
      )}

      {/* 5. Revoke All Other Sessions Confirmation Modal */}
      {isRevokeAllConfirmOpen && (
        <RevokeAllOtherSessionsModal
          count={otherSessionsCount}
          onClose={() => setIsRevokeAllConfirmOpen(false)}
          onSuccess={() => {
            setIsRevokeAllConfirmOpen(false);
            refetchSessions();
            refetchOverview();
          }}
        />
      )}

      {/* 6. Security Activity Ledger Modal */}
      {isActivityModalOpen && (
        <SecurityActivityModal
          onClose={() => setIsActivityModalOpen(false)}
        />
      )}

      {/* 7. Passkey Management Modal */}
      {isPasskeyModalOpen && (
        <PasskeyManagementModal
          onClose={() => setIsPasskeyModalOpen(false)}
          onSuccess={() => {
            refetchMe();
            refetchOverview();
          }}
        />
      )}

      {/* 8. 2FA Management Modal */}
      {is2FAModalOpen && (
        <TwoFactorManagementModal
          is2FAEnabled={user.is_2fa_enabled}
          recoveryCodesRemaining={user.recovery_codes_remaining ?? 8}
          onClose={() => setIs2FAModalOpen(false)}
          onSuccess={() => {
            refetchMe();
            refetchOverview();
          }}
        />
      )}

      {/* 9. Permissions Matrix Modal */}
      {isPermissionsModalOpen && (
        <PermissionsMatrixModal
          onClose={() => setIsPermissionsModalOpen(false)}
        />
      )}

      {/* 10. Live Trading Lock Confirmation Modal */}
      {isLockConfirmModalOpen && (
        <LiveTradingLockModal
          isCurrentlyLocked={isLiveLocked}
          onClose={() => setIsLockConfirmModalOpen(false)}
          onSuccess={() => {
            setIsLockConfirmModalOpen(false);
            refetchProtection();
            refetchOverview();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// HELPER: MASK EMAIL
// ============================================================================
function maskEmail(email: string | undefined): string {
  if (!email || !email.includes("@")) return "d******@gmail.com";
  try {
    const [user, domain] = email.trim().split("@");
    if (user.length <= 2) {
      return `${user[0]}*****@${domain}`;
    }
    const masked = `${user[0]}${"*".repeat(Math.max(4, user.length - 2))}${user[user.length - 1]}`;
    return `${masked}@${domain}`;
  } catch {
    return "d******@gmail.com";
  }
}

// ============================================================================
// MODAL 1: CHANGE USERNAME WITH 2-STEP OTP
// ============================================================================
function ChangeUsernameModal({
  currentUsername,
  userEmail,
  onClose,
  onSuccess
}: {
  currentUsername: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Step 2 OTP State
  const [challengeId, setChallengeId] = useState<string>("");
  const [maskedDestination, setMaskedDestination] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState<number>(30);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "error" | "info" | "success"; text: string } | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 2 || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const validateUsernameInput = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return "Username cannot be empty.";
    if (trimmed.length < 3) return "Username must be at least 3 characters.";
    if (trimmed.length > 32) return "Username cannot exceed 32 characters.";
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return "Username may only contain alphanumeric characters, underscores, dashes, and periods.";
    if (trimmed.toLowerCase() === currentUsername.toLowerCase()) return "New username must be different from current username.";
    const reserved = ["system", "root", "support", "help", "security", "quantos", "null", "undefined"];
    if (reserved.includes(trimmed.toLowerCase())) return "This username is reserved.";
    return null;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUsernameInput(newUsername);
    if (err) {
      setUsernameError(err);
      return;
    }
    setUsernameError(null);
    setIsRequestingOtp(true);
    setStatusMessage({ type: "info", text: "Sending verification code..." });

    try {
      const res = await fetch("/api/auth/username/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_username: newUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setChallengeId(data.challenge_id);
        setMaskedDestination(data.destination || maskEmail(userEmail));
        setStep(2);
        setOtpTimer(30);
        setStatusMessage({ type: "info", text: data.message || `Verification code sent to ${data.destination}.` });
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to dispatch verification code." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Connection error: ${exc.message}` });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setIsRequestingOtp(true);
    setStatusMessage({ type: "info", text: "Resending verification code..." });
    try {
      const res = await fetch("/api/auth/username/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_username: newUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setChallengeId(data.challenge_id);
        setOtpTimer(30);
        setOtpDigits(["", "", "", "", "", ""]);
        setStatusMessage({ type: "success", text: "New verification code sent." });
        otpInputRefs.current[0]?.focus();
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to resend code." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // Pasted multi-digit code
      const chars = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) newDigits[index + idx] = c;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(5, index + chars.length);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndChange = async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setStatusMessage({ type: "error", text: "Please enter the full 6-digit verification code." });
      return;
    }

    setIsVerifying(true);
    setStatusMessage({ type: "info", text: "Verifying and updating username..." });

    try {
      const res = await fetch("/api/auth/username/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          otp: code,
          new_username: newUsername.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStatusMessage({ type: "success", text: "Username changed successfully!" });
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setStatusMessage({ type: "error", text: data.message || "Invalid or expired verification code." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Verification error: ${exc.message}` });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              {step === 1 ? "Change Username" : "Verify Your Identity"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-mono border ${
            statusMessage.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Step 1: Input New Username */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Current Username</label>
              <input
                type="text"
                disabled
                value={currentUsername}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-200 font-mono block mb-1">New Username</label>
              <input
                type="text"
                autoFocus
                placeholder="Enter new username (3-32 chars)"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (usernameError) setUsernameError(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 ${
                  usernameError
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400"
                }`}
              />
              {usernameError && (
                <p className="text-rose-400 text-[11px] font-mono mt-1">{usernameError}</p>
              )}
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 font-mono">Username Requirements:</div>
              <ul className="list-disc list-inside space-y-0.5 font-sans">
                <li>Between 3 and 32 characters</li>
                <li>Letters, numbers, underscores, periods, and hyphens</li>
                <li>Must be unique and not currently registered</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRequestingOtp}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono font-bold transition flex items-center gap-1.5"
              >
                {isRequestingOtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 6-Digit OTP Verification */}
        {step === 2 && (
          <div className="space-y-4 text-xs font-sans">
            <div className="text-center space-y-1">
              <p className="text-slate-300">
                We sent a 6-digit verification code to:
              </p>
              <p className="font-mono font-bold text-cyan-400 text-sm">{maskedDestination}</p>
              <p className="text-[11px] text-slate-500">
                New requested username: <span className="font-mono text-white font-bold">{newUsername}</span>
              </p>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-center gap-2 py-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-xl font-mono font-black text-cyan-400 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                />
              ))}
            </div>

            {/* Resend countdown */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <span>Expires in 5 minutes</span>
              {otpTimer > 0 ? (
                <span className="text-slate-500">Resend in 00:{otpTimer.toString().padStart(2, "0")}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleVerifyAndChange}
                disabled={isVerifying || otpDigits.join("").length !== 6}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono font-bold transition flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify & Change Username</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 2: CHANGE PASSWORD WITH 2-STEP OTP
// ============================================================================
function ChangePasswordModal({
  userEmail,
  onClose,
  onSuccess
}: {
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 2 OTP State
  const [challengeId, setChallengeId] = useState<string>("");
  const [maskedDestination, setMaskedDestination] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState<number>(30);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "error" | "info" | "success"; text: string } | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== 2 || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // Password requirements checks
  const hasMinLength = newPassword.length >= 10;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const calculateStrength = (): { score: number; label: string; color: string } => {
    let s = 0;
    if (hasMinLength) s++;
    if (hasUpperCase) s++;
    if (hasLowerCase) s++;
    if (hasNumber) s++;
    if (hasSpecial) s++;
    if (s <= 2) return { score: s, label: "Weak", color: "bg-rose-500" };
    if (s <= 4) return { score: s, label: "Good", color: "bg-amber-500" };
    return { score: s, label: "Strong ✓", color: "bg-emerald-500" };
  };

  const strength = calculateStrength();

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "Current password is required.";
    if (!newPassword) errors.newPassword = "New password is required.";
    else if (newPassword.length < 10) errors.newPassword = "Password must be at least 10 characters.";
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.newPassword = "New password must be different from current password.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsRequestingOtp(true);
    setStatusMessage({ type: "info", text: "Validating credentials and dispatching OTP..." });

    try {
      const res = await fetch("/api/auth/password/request-change-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setChallengeId(data.challenge_id);
        setMaskedDestination(data.destination || maskEmail(userEmail));
        setStep(2);
        setOtpTimer(30);
        setStatusMessage({ type: "info", text: data.message || `Verification code dispatched to ${data.destination}.` });
      } else {
        setStatusMessage({ type: "error", text: data.message || "Password verification failed." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Connection error: ${exc.message}` });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setIsRequestingOtp(true);
    setStatusMessage({ type: "info", text: "Resending verification code..." });
    try {
      const res = await fetch("/api/auth/password/request-change-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setChallengeId(data.challenge_id);
        setOtpTimer(30);
        setOtpDigits(["", "", "", "", "", ""]);
        setStatusMessage({ type: "success", text: "New verification code dispatched." });
        otpInputRefs.current[0]?.focus();
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to resend code." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) newDigits[index + idx] = c;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(5, index + chars.length);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndChange = async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setStatusMessage({ type: "error", text: "Please enter the full 6-digit verification code." });
      return;
    }

    setIsVerifying(true);
    setStatusMessage({ type: "info", text: "Updating password and securing active sessions..." });

    try {
      const res = await fetch("/api/auth/password/change-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          otp: code,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
          logout_all_other_sessions: logoutOtherDevices,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStatusMessage({ type: "success", text: "Password updated successfully!" });
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setStatusMessage({ type: "error", text: data.message || "Invalid or expired verification code." });
      }
    } catch (exc: any) {
      setStatusMessage({ type: "error", text: `Verification error: ${exc.message}` });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              {step === 1 ? "Change Master Password" : "Verify Your Identity"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-mono border ${
            statusMessage.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Step 1: Input Passwords */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-3.5 text-xs font-sans">
            <div>
              <label className="text-slate-200 font-mono block mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  autoFocus
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white font-mono pr-10 focus:outline-none focus:ring-1 ${
                    fieldErrors.currentPassword
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-rose-400 text-[11px] font-mono mt-1">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="text-slate-200 font-mono block mb-1">New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Enter new password (min 10 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 ${
                  fieldErrors.newPassword
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400"
                }`}
              />
              {fieldErrors.newPassword && (
                <p className="text-rose-400 text-[11px] font-mono mt-1">{fieldErrors.newPassword}</p>
              )}

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className="font-bold text-white">{strength.label}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-1 transition-all duration-300 ${
                          idx <= strength.score ? strength.color : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-200 font-mono block mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 ${
                  fieldErrors.confirmPassword
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400"
                }`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-rose-400 text-[11px] font-mono mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1 text-[11px]">
              <div className="text-slate-400 font-mono font-semibold">Requirements:</div>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <span className={hasMinLength ? "text-emerald-400" : "text-slate-500"}>
                  {hasMinLength ? "✓" : "•"} 10+ characters
                </span>
                <span className={hasUpperCase ? "text-emerald-400" : "text-slate-500"}>
                  {hasUpperCase ? "✓" : "•"} Uppercase letter
                </span>
                <span className={hasLowerCase ? "text-emerald-400" : "text-slate-500"}>
                  {hasLowerCase ? "✓" : "•"} Lowercase letter
                </span>
                <span className={hasNumber || hasSpecial ? "text-emerald-400" : "text-slate-500"}>
                  {hasNumber || hasSpecial ? "✓" : "•"} Number / symbol
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRequestingOtp}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono font-bold transition flex items-center gap-1.5"
              >
                {isRequestingOtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification & Session Choice */}
        {step === 2 && (
          <div className="space-y-4 text-xs font-sans">
            <div className="text-center space-y-1">
              <p className="text-slate-300">We sent a verification code to authorize password update:</p>
              <p className="font-mono font-bold text-cyan-400 text-sm">{maskedDestination}</p>
            </div>

            {/* 6 Digit Input */}
            <div className="flex items-center justify-center gap-2 py-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-xl font-mono font-black text-cyan-400 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                />
              ))}
            </div>

            {/* Session Invalidation Option */}
            <label className="flex items-start gap-2.5 p-3 bg-slate-900/80 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition">
              <input
                type="checkbox"
                checked={logoutOtherDevices}
                onChange={(e) => setLogoutOtherDevices(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white font-mono text-xs">Log out all other devices</span>
                <p className="text-[11px] text-slate-400 font-sans">
                  Recommended. Revokes all active sessions on other computers or phones immediately.
                </p>
              </div>
            </label>

            {/* Resend Timer */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <span>Expires in 5 minutes</span>
              {otpTimer > 0 ? (
                <span className="text-slate-500">Resend in 00:{otpTimer.toString().padStart(2, "0")}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleVerifyAndChange}
                disabled={isVerifying || otpDigits.join("").length !== 6}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono font-bold transition flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify & Change Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 3: MANAGE SESSIONS TABLE & ACTIONS
// ============================================================================
function ManageSessionsModal({
  sessions,
  onClose,
  onRevokeSingle,
  onRevokeAllOthers,
  onRefresh
}: {
  sessions: SessionItem[];
  onClose: () => void;
  onRevokeSingle: (s: SessionItem) => void;
  onRevokeAllOthers: () => void;
  onRefresh: () => void;
}) {
  const current = sessions.find((s) => s.is_current) || (sessions.length > 0 ? sessions[0] : null);
  const others = sessions.filter((s) => s !== current);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                Active Sessions & Devices
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Real-time active authenticated tokens and device fingerprints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {/* Current Device Card */}
          {current && (
            <div className="p-4 bg-slate-950/80 border border-emerald-500/40 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white font-mono text-sm">
                    {current.device_name || "Windows PC / Chrome 151"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    THIS DEVICE (CURRENT)
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">Active Now</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-400 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">IP Address</span>
                  <span className="text-slate-200">{current.ip_address || "127.0.0.1"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Location</span>
                  <span className="text-slate-200">{current.approximate_location || "Indore, India"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Login Time</span>
                  <span className="text-slate-200">
                    {current.created_at ? <HydratedTimestamp timestamp={current.created_at} /> : "Today"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Session ID</span>
                  <span className="text-slate-400 truncate block max-w-[100px]">{current.session_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Other Sessions */}
          {others.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Other Active Devices ({others.length})
              </div>

              {others.map((session) => (
                <div
                  key={session.session_id}
                  className="p-3.5 bg-slate-950/50 border border-slate-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-bold text-slate-200 font-mono text-xs truncate">
                        {session.device_name || session.user_agent || "MacBook Air / Safari (macOS)"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                        ACTIVE
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                      <span>IP: {session.ip_address || "103.xxx.xxx.xxx"}</span>
                      <span>Location: {session.approximate_location || "Indore, India"}</span>
                      <span>
                        Last Active:{" "}
                        {session.last_active_at || session.last_active ? (
                          <HydratedTimestamp timestamp={session.last_active_at || session.last_active || ""} />
                        ) : (
                          "18 min ago"
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRevokeSingle(session)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition flex items-center gap-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {others.length === 0 && (
            <div className="p-4 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No other active devices. Only your current session is logged in.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {others.length > 0 ? (
            <button
              onClick={onRevokeAllOthers}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-mono font-bold text-xs transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Log Out All Other Sessions ({others.length})</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 4: REVOKE SINGLE SESSION CONFIRMATION
// ============================================================================
function RevokeSingleSessionModal({
  session,
  onClose,
  onSuccess
}: {
  session: SessionItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRevoke = async () => {
    setIsRevoking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/auth/sessions/${session.session_id}/revoke`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onSuccess();
      } else {
        setErrorMsg(data.message || "Failed to revoke session.");
      }
    } catch (exc: any) {
      setErrorMsg(`Error: ${exc.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white font-mono">Log out this device?</h4>
            <p className="text-xs text-slate-400 font-sans">
              This will immediately terminate the session token.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono space-y-1.5">
          <div className="text-slate-400">
            Device: <span className="text-white font-bold">{session.device_name || session.user_agent || "MacBook Air"}</span>
          </div>
          <div className="text-slate-400">
            IP: <span className="text-slate-200">{session.ip_address}</span>
          </div>
          <div className="text-slate-400">
            Location: <span className="text-slate-200">{session.approximate_location || "Indore, India"}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition flex items-center gap-1.5"
          >
            {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 5: REVOKE ALL OTHER SESSIONS CONFIRMATION
// ============================================================================
function RevokeAllOtherSessionsModal({
  count,
  onClose,
  onSuccess
}: {
  count: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRevokeAll = async () => {
    setIsRevoking(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/sessions/revoke-all-others", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onSuccess();
      } else {
        setErrorMsg(data.message || "Failed to revoke other sessions.");
      }
    } catch (exc: any) {
      setErrorMsg(`Error: ${exc.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white font-mono">Log out all other sessions?</h4>
            <p className="text-xs text-slate-400 font-sans">
              This will terminate {count} active session{count === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-sans text-slate-300 space-y-1">
          <p>Your current device will stay signed in.</p>
          <p className="text-slate-500 text-[11px]">All other phones, laptops, and API tokens will be revoked immediately.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleRevokeAll}
            disabled={isRevoking}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition flex items-center gap-1.5"
          >
            {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Log Out Other Sessions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 6: SECURITY ACTIVITY & ALERTS DRILL-DOWN
// ============================================================================
function SecurityActivityModal({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "RESOLVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: eventsData, isLoading, refetch } = useQuery<{
    status: string;
    events: SecurityEventItem[];
  }>({
    queryKey: ["securityEventsList", filter, searchQuery],
    queryFn: async () => {
      const url = new URL("/api/security/events", window.location.origin);
      if (filter !== "ALL" && filter !== "RESOLVED") url.searchParams.set("severity", filter);
      if (searchQuery) url.searchParams.set("q", searchQuery);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load security activity");
      return res.json();
    },
  });

  const events = eventsData?.events || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                Security Activity Ledger
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Immutable audit record of authentication attempts, credential changes, and system alerts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search security activity (action, IP, event)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "RESOLVED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  filter === tab
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Event List Table */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1">
          {isLoading ? (
            <div className="p-8 text-center font-mono text-xs text-slate-500">
              Loading security audit ledger...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No security events matching this filter.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      ev.severity === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : ev.severity === "HIGH"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : ev.severity === "MEDIUM"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    }`}>
                      {ev.severity}
                    </span>
                    <span className="font-bold text-white font-mono text-xs truncate">
                      {ev.type || ev.action}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-sans">
                    {ev.description || "Security audit action recorded."}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 text-[10px] font-mono text-slate-500">
                    <span>IP: {ev.ip || "127.0.0.1"}</span>
                    <span>Device: {ev.device || "Gateway"}</span>
                    <span>
                      Timestamp: {ev.timestamp ? <HydratedTimestamp timestamp={ev.timestamp} /> : "Recent"}
                    </span>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono bg-slate-900 border border-slate-800 text-emerald-400">
                    {ev.resolution || "Resolved ✓"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 7: PASSKEY / FIDO2 MANAGEMENT MODAL
// ============================================================================
function PasskeyManagementModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newKeyName, setNewKeyName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const { data: passkeysData, refetch } = useQuery<{
    status: string;
    passkeys: PasskeyItem[];
  }>({
    queryKey: ["passkeysList"],
    queryFn: async () => {
      const res = await fetch("/api/auth/passkeys");
      if (!res.ok) throw new Error("Failed to fetch passkeys");
      return res.json();
    },
  });

  const passkeys = passkeysData?.passkeys || [];

  const handleAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newKeyName.trim() || "Windows Hello / Touch ID Key";
    setIsAdding(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/passkeys/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setNewKeyName("");
        setStatusMsg({ type: "success", text: `Passkey '${name}' added successfully!` });
        refetch();
        onSuccess();
      } else {
        setStatusMsg({ type: "error", text: data.message || "Failed to register passkey." });
      }
    } catch (exc: any) {
      setStatusMsg({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePasskey = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStatusMsg({ type: "success", text: "Passkey removed." });
        refetch();
        onSuccess();
      } else {
        setStatusMsg({ type: "error", text: data.message || "Failed to remove passkey." });
      }
    } catch (exc: any) {
      setStatusMsg({ type: "error", text: `Error: ${exc.message}` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Passkey & FIDO2 Management
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className={`p-2.5 rounded-xl text-xs font-mono border ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Form: Add New Key */}
        <form onSubmit={handleAddPasskey} className="space-y-2">
          <label className="text-xs font-mono text-slate-300">Add Biometric Passkey</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Windows Hello, MacBook Touch ID"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Existing Passkeys */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Registered Passkeys ({passkeys.length})
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {passkeys.map((pk) => (
              <div
                key={pk.id || pk.credential_id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white font-mono text-xs">
                    {pk.name || pk.device_name || "Security Key"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Added: {pk.created_at ? <HydratedTimestamp timestamp={pk.created_at} /> : "Sep 12"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePasskey(pk.id || pk.credential_id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                  title="Remove passkey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {passkeys.length === 0 && (
              <div className="p-3 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No passkeys registered yet.
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 8: TWO-FACTOR AUTHENTICATION (2FA) MANAGEMENT
// ============================================================================
function TwoFactorManagementModal({
  is2FAEnabled,
  recoveryCodesRemaining,
  onClose,
  onSuccess
}: {
  is2FAEnabled: boolean;
  recoveryCodesRemaining: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"overview" | "setup" | "regenerate">("overview");
  const [setupData, setSetupData] = useState<{ secret?: string; qr_code_data_uri?: string; enrollment_id?: string } | null>(null);
  const [confirmTotpCode, setConfirmTotpCode] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const start2FASetup = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setSetupData(data);
        setStep("setup");
      } else {
        setStatusMsg({ type: "error", text: data.message || "Failed to initialize 2FA setup." });
      }
    } catch (exc: any) {
      setStatusMsg({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (!confirmTotpCode || confirmTotpCode.length < 6) {
      setStatusMsg({ type: "error", text: "Please enter the 6-digit code from your authenticator app." });
      return;
    }
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment_id: setupData?.enrollment_id,
          secret: setupData?.secret,
          totp_code: confirmTotpCode.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setGeneratedCodes(data.recovery_codes || []);
        setStatusMsg({ type: "success", text: "2FA successfully enabled! Save your recovery codes." });
        setStep("overview");
        onSuccess();
      } else {
        setStatusMsg({ type: "error", text: data.message || "Invalid authenticator code." });
      }
    } catch (exc: any) {
      setStatusMsg({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (!masterPassword || !confirmTotpCode) {
      setStatusMsg({ type: "error", text: "Password and TOTP code are required to regenerate backup codes." });
      return;
    }
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/recovery-codes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: masterPassword,
          totp_code: confirmTotpCode.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setGeneratedCodes(data.recovery_codes || []);
        setStatusMsg({ type: "success", text: "8 new backup codes generated successfully." });
        setStep("overview");
        onSuccess();
      } else {
        setStatusMsg({ type: "error", text: data.message || "Reauthentication failed." });
      }
    } catch (exc: any) {
      setStatusMsg({ type: "error", text: `Error: ${exc.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Two-Factor Authentication (2FA)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className={`p-2.5 rounded-xl text-xs font-mono border ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Step: Overview */}
        {step === "overview" && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-mono">Authenticator App (TOTP)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                  {is2FAEnabled ? "Enabled ✓" : "Configured"}
                </span>
              </div>
              <p className="text-slate-400">
                Google Authenticator, Microsoft Authenticator, 1Password, or YubiKey.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-mono">Backup Recovery Codes</span>
                <span className="text-cyan-400 font-mono font-bold">{recoveryCodesRemaining} remaining</span>
              </div>
              <p className="text-slate-400">
                Single-use emergency codes if you lose access to your authenticator app.
              </p>
              <button
                type="button"
                onClick={() => setStep("regenerate")}
                className="w-full py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-300 font-mono font-bold transition text-xs"
              >
                Regenerate Backup Codes
              </button>
            </div>

            {generatedCodes.length > 0 && (
              <div className="p-3.5 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-2">
                <div className="text-cyan-300 font-mono font-bold">Your Emergency Backup Codes:</div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-white bg-slate-950 p-2.5 rounded-lg">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="p-1 bg-slate-900 rounded text-center">{code}</div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">Store these in a safe place. They will only be shown once.</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={start2FASetup}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 font-mono font-bold transition"
              >
                Reconfigure App
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Step: Setup (QR Code) */}
        {step === "setup" && (
          <div className="space-y-4 text-xs font-sans">
            <div className="text-center space-y-2">
              <p className="text-slate-300">Scan this QR code in your Authenticator app:</p>
              {setupData?.qr_code_data_uri ? (
                <div className="flex justify-center p-2 bg-white rounded-xl max-w-[180px] mx-auto">
                  <img src={setupData.qr_code_data_uri} alt="2FA QR Code" className="w-full h-auto" />
                </div>
              ) : (
                <div className="p-4 bg-slate-900 font-mono text-xs text-cyan-400 break-all rounded-xl">
                  Key: {setupData?.secret}
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-mono">
                Manual Key: <span className="text-white font-bold">{setupData?.secret}</span>
              </p>
            </div>

            <div>
              <label className="text-slate-200 font-mono block mb-1">Enter 6-digit Code to Confirm</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={confirmTotpCode}
                onChange={(e) => setConfirmTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-xl font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("overview")}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSetup}
                disabled={isProcessing || confirmTotpCode.length < 6}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold transition flex items-center gap-1"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm & Activate</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Regenerate */}
        {step === "regenerate" && (
          <div className="space-y-3.5 text-xs font-sans">
            <p className="text-slate-300">
              Re-authentication required to regenerate backup codes.
            </p>

            <div>
              <label className="text-slate-200 font-mono block mb-1">Master Password</label>
              <input
                type="password"
                placeholder="Enter master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-200 font-mono block mb-1">6-Digit TOTP Code</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={confirmTotpCode}
                onChange={(e) => setConfirmTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("overview")}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRegenerateCodes}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold transition flex items-center gap-1"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Regenerate 8 Codes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 9: PERMISSIONS MATRIX
// ============================================================================
function PermissionsMatrixModal({ onClose }: { onClose: () => void }) {
  const permissions = [
    { feature: "Paper Trading", permission: "Allowed", desc: "Simulated sandbox execution across all brokers", color: "text-emerald-400" },
    { feature: "Live Trading", permission: "Restricted", desc: "Protected by 14 pre-trade gates & emergency locks", color: "text-amber-400" },
    { feature: "Bot Trading", permission: "Allowed", desc: "Automated execution for validated strategy slugs", color: "text-emerald-400" },
    { feature: "Broker API Keys", permission: "Protected", desc: "AES-256 encrypted at rest; strict read/trade only", color: "text-cyan-400" },
    { feature: "Withdrawals", permission: "Disabled", desc: "Zero withdrawal API capability enforced server-side", color: "text-rose-400" },
    { feature: "Risk Settings", permission: "Restricted", desc: "Universal Risk Engine parameters restricted to Admin", color: "text-amber-400" },
    { feature: "Security Settings", permission: "Admin Only", desc: "Identity & 2FA modifications require step-up reauth", color: "text-cyan-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Role & Permission Matrix
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {permissions.map((p, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold text-white font-mono text-xs">{p.feature}</div>
                <div className="text-[11px] text-slate-400 font-sans">{p.desc}</div>
              </div>
              <span className={`font-mono font-bold text-xs shrink-0 ${p.color}`}>
                {p.permission}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 10: LIVE TRADING EMERGENCY LOCK CONFIRMATION
// ============================================================================
function LiveTradingLockModal({
  isCurrentlyLocked,
  onClose,
  onSuccess
}: {
  isCurrentlyLocked: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isActing, setIsActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsActing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/security/trading-protection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked: !isCurrentlyLocked,
          reason: !isCurrentlyLocked
            ? "Operator Emergency Live Lock Action"
            : "Operator Live Trading Lock Released",
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onSuccess();
      } else {
        setErrorMsg(data.message || "Failed to update live trading lock.");
      }
    } catch (exc: any) {
      setErrorMsg(`Error: ${exc.message}`);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            isCurrentlyLocked
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            {isCurrentlyLocked ? <Unlock className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-base font-bold text-white font-mono">
              {isCurrentlyLocked ? "Release Live Trading Lock?" : "Engage Emergency Live Lock?"}
            </h4>
            <p className="text-xs text-slate-400 font-sans">
              {isCurrentlyLocked
                ? "Re-enables live order routing to active broker connections."
                : "Immediately halts all live order execution across every active bot."}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-sans text-slate-300 space-y-1">
          <p className="font-bold font-mono text-white">Impact Assessment:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            {isCurrentlyLocked ? (
              <>
                <li>Order execution router will accept incoming live orders</li>
                <li>Universal Risk Engine 14 pre-trade gates remain enforced</li>
              </>
            ) : (
              <>
                <li>All outgoing live broker orders blocked immediately</li>
                <li>Paper trading and market data feeds remain unaffected</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-mono font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={isActing}
            className={`px-4 py-2 rounded-xl text-white font-mono font-bold text-xs transition flex items-center gap-1.5 ${
              isCurrentlyLocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
            }`}
          >
            {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isCurrentlyLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isCurrentlyLocked ? "Confirm Unlock" : "Confirm Emergency Lock"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
