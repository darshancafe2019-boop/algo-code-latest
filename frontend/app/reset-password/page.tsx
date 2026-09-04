"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const { resetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const evaluatePassword = (pwd: string): { score: number; label: string; color: string; criteria: PasswordCriteria } => {
    const criteria: PasswordCriteria = {
      minLength: pwd.length >= 10,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };

    let passedCount = 0;
    if (criteria.minLength) passedCount++;
    if (criteria.hasUpper) passedCount++;
    if (criteria.hasLower) passedCount++;
    if (criteria.hasNumber) passedCount++;
    if (criteria.hasSpecial) passedCount++;

    if (pwd.length === 0) {
      return { score: 0, label: "Enter Password", color: "bg-slate-700", criteria };
    }
    if (passedCount <= 2) {
      return { score: 25, label: "Weak", color: "bg-rose-500", criteria };
    }
    if (passedCount === 3) {
      return { score: 50, label: "Fair", color: "bg-amber-500", criteria };
    }
    if (passedCount === 4) {
      return { score: 75, label: "Strong", color: "bg-cyan-400", criteria };
    }
    return { score: 100, label: "Institutional Grade", color: "bg-emerald-400", criteria };
  };

  const strength = evaluatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!token) {
      setFeedback({
        type: "error",
        message: "No password reset authorization token provided. Please request a new recovery link.",
      });
      return;
    }

    if (!newPassword) {
      setFeedback({
        type: "error",
        message: "Please enter your new master password.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({
        type: "error",
        message: "Master password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "Passwords do not match. Please verify both fields.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(token, newPassword, confirmPassword);
      if (res.success) {
        setResetSuccess(true);
        setFeedback({
          type: "success",
          message: res.message || "Master credentials reset successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || res.message || "Failed to reset password. Token may be expired or already consumed.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to communicate with authentication server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md bg-[#0B132B]/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-[#060913] rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-cyan-400" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[#060913] flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
            ALPHA ALGO TERMINAL
          </span>
        </div>
        <h1 className="text-xl font-bold font-mono text-white mt-1">
          Reset Master Password
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1 max-w-xs">
          Establish a new cryptographic password for your institutional operator account.
        </p>
      </div>

      {/* Missing Token Notice */}
      {!token && (
        <div className="mb-5 p-3.5 rounded-xl border bg-amber-950/40 border-amber-500/40 text-amber-300 flex items-start gap-3 font-mono text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-semibold mb-0.5">Authorization Token Missing</p>
            <p className="text-[11px] text-amber-400/90 leading-relaxed">
              No reset token detected in the URL. Please ensure you clicked the full link from your recovery dispatch.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 underline"
            >
              Request New Recovery Link →
            </Link>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 font-mono text-xs animate-in fade-in slide-in-from-top-1 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          )}
          <p className="leading-relaxed">{feedback.message}</p>
        </div>
      )}

      {/* Success State View */}
      {resetSuccess ? (
        <div className="space-y-4 pt-2">
          <p className="text-xs font-mono text-slate-300 text-center leading-relaxed">
            Your credentials have been securely updated. All previous active sessions have been invalidated.
          </p>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all"
          >
            <span>Proceed to Login Gateway</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        /* Reset Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5"
            >
              New Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isSubmitting || !token}
                className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Security Strength:</span>
                  <span className="font-bold text-slate-200">{strength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono text-slate-400">
                  <span className={`flex items-center gap-1 ${strength.criteria.minLength ? "text-emerald-400" : ""}`}>
                    <Check className="h-3 w-3" /> 10+ Characters
                  </span>
                  <span className={`flex items-center gap-1 ${strength.criteria.hasUpper && strength.criteria.hasLower ? "text-emerald-400" : ""}`}>
                    <Check className="h-3 w-3" /> Upper & Lowercase
                  </span>
                  <span className={`flex items-center gap-1 ${strength.criteria.hasNumber ? "text-emerald-400" : ""}`}>
                    <Check className="h-3 w-3" /> Numbers (0-9)
                  </span>
                  <span className={`flex items-center gap-1 ${strength.criteria.hasSpecial ? "text-emerald-400" : ""}`}>
                    <Check className="h-3 w-3" /> Special Symbol (!@#$)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Confirm New Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isSubmitting || !token}
                className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
              />
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-[11px] font-mono text-rose-400 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Committing Changes...</span>
              </>
            ) : (
              <>
                <span>Commit New Password</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Login</span>
        </Link>
        <span className="text-[10px] text-slate-600 font-mono">
          Cryptographic Vault
        </span>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060913] text-slate-100 overflow-hidden font-sans p-4 sm:p-6">
      {/* Ambient Aura & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      <Suspense
        fallback={
          <div className="relative z-10 p-8 text-center font-mono text-cyan-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <span>Loading Cryptographic Context...</span>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
