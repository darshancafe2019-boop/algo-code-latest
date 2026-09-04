"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Lock,
} from "lucide-react";

export function ForcePasswordChangeModal() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsOn, setIsCapsOn] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evaluate password strength
  const evaluatePassword = (pwd: string) => {
    const minLength = pwd.length >= 10;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (minLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    let label = "Weak";
    let color = "bg-rose-500";
    if (score >= 4 && minLength) {
      label = "Institutional Grade";
      color = "bg-emerald-400";
    } else if (score >= 3) {
      label = "Moderate";
      color = "bg-amber-500";
    }

    return { score, label, color, minLength, hasUpper, hasLower, hasNumber, hasSpecial };
  };

  const strength = evaluatePassword(newPassword);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsOn(e.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 10) {
      setErrorMessage("New password must be at least 10 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password must be different from current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccessMessage("Password successfully updated. Entering terminal...");
      } else {
        setErrorMessage(res.error || "Failed to update password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#060913]/95 backdrop-blur-2xl flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-lg bg-[#0B132B]/95 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white tracking-wide">
            Initial Bootstrap Password Change Required
          </h2>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Your account <span className="text-cyan-400 font-bold">{user?.username}</span> was authenticated using bootstrap credentials. Production security policy requires establishing a new personal password before accessing trading execution or platform features.
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isCapsOn && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>CAPS LOCK is active</span>
          </div>
        )}

        {/* Password Change Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Current Bootstrap Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyUp={handleKeyUp}
                placeholder="Enter current password"
                disabled={isSubmitting}
                className="w-full bg-[#060913] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                New Personal Password (10+ Chars)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyUp={handleKeyUp}
              placeholder="Create strong password"
              disabled={isSubmitting}
              className="w-full bg-[#060913] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Strength:</span>
                  <span className="text-white font-bold">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : "bg-transparent"}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : "bg-transparent"}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : "bg-transparent"}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 4 ? strength.color : "bg-transparent"}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 5 ? strength.color : "bg-transparent"}`} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyUp={handleKeyUp}
              placeholder="Confirm new password"
              disabled={isSubmitting}
              className="w-full bg-[#060913] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || strength.score < 3 || newPassword.length < 10}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Update Password & Enter Terminal</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cancel & Sign Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
