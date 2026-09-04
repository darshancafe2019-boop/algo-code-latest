"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, verifyResetOTP, resetPassword } = useAuth();

  // Wizard Stage: "request" | "verify_otp" | "new_password" | "complete"
  const [stage, setStage] = useState<"request" | "verify_otp" | "new_password" | "complete">("request");

  // State
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [destinationEmail, setDestinationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UX Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // OTP Input Refs
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Evaluate Password Strength
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

  // Stage 1: Request Password Reset OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setFeedback({
        type: "error",
        message: "Please enter your registered email address or operator username.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(cleanIdentifier);
      if (res.success && res.challengeId) {
        setChallengeId(res.challengeId);
        setDestinationEmail(res.destination || cleanIdentifier);
        setStage("verify_otp");
        setFeedback({
          type: "success",
          message: `A 6-digit password reset code was dispatched to ${res.destination || "your email"}.`,
        });
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 200);
      } else {
        setFeedback({
          type: res.success ? "success" : "error",
          message: res.message || res.error || "Failed to initiate recovery request.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to submit recovery request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 2: Handle OTP Input Navigation
  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1);
    if (char && !/[0-9]/.test(char)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (char && index === 5 && newDigits.every((d) => d !== "")) {
      handleVerifyOTP(newDigits.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^[0-9]{6}$/.test(pasted)) {
      const chars = pasted.split("");
      setOtpDigits(chars);
      digitInputRefs.current[5]?.focus();
      handleVerifyOTP(pasted);
    }
  };

  // Stage 2: Verify Reset OTP
  const handleVerifyOTP = async (codeToSubmit?: string) => {
    setFeedback(null);
    const code = codeToSubmit || otpDigits.join("");

    if (!code || code.length !== 6) {
      setFeedback({
        type: "error",
        message: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyResetOTP(challengeId, code);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStage("new_password");
        setFeedback({
          type: "success",
          message: "Verification code confirmed. You may now set a new password.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Invalid or expired verification code.",
        });
        setOtpDigits(["", "", "", "", "", ""]);
        digitInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to verify reset code.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 3: Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 10) {
      setFeedback({
        type: "error",
        message: "Password must be at least 10 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(resetToken, newPassword, confirmPassword);
      if (res.success) {
        setStage("complete");
        setFeedback({
          type: "success",
          message: "Password reset successful! All previous active sessions have been revoked.",
        });
        setTimeout(() => {
          router.push("/");
        }, 2500);
      } else {
        setFeedback({
          type: "error",
          message: res.error || res.message || "Failed to update password.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to connect to authentication server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060913] text-slate-100 overflow-hidden font-sans p-4 sm:p-6">
      {/* Ambient Aura & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-[#0B132B]/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <div className="h-full w-full bg-[#060913] rounded-2xl flex items-center justify-center">
                <KeyRound className="h-7 w-7 text-cyan-400" />
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
            Recover Operator Access
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-xs">
            {stage === "request" && "Enter your registered email address or operator username to receive a 6-digit recovery code."}
            {stage === "verify_otp" && `Enter the 6-digit verification code sent to ${destinationEmail || "your email"}.`}
            {stage === "new_password" && "Enter and confirm your new institutional master password."}
            {stage === "complete" && "Your password has been successfully reset."}
          </p>
        </div>

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

        {/* STAGE 1: Request Password Reset Code */}
        {stage === "request" && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label
                htmlFor="identifier-input"
                className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Operator Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="identifier-input"
                  type="text"
                  autoComplete="email username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or ashishparadkar1999@gmail.com"
                  disabled={isSubmitting}
                  className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Dispatching Reset Code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 2: Verify 6-Digit Reset Code */}
        {stage === "verify_otp" && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2 sm:gap-3 my-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    digitInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={handleDigitPaste}
                  disabled={isSubmitting}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold bg-[#060913] border border-slate-700 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOTP()}
              disabled={isSubmitting || otpDigits.some((d) => d === "")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify Code & Continue</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setStage("request");
                  setFeedback(null);
                }}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Change Email or Username
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: Set New Password */}
        {stage === "new_password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                New Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  disabled={isSubmitting}
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

              {/* Strength meter */}
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
                      <Check className="h-3 w-3" /> Upper & Lower
                    </span>
                    <span className={`flex items-center gap-1 ${strength.criteria.hasNumber ? "text-emerald-400" : ""}`}>
                      <Check className="h-3 w-3" /> Numbers
                    </span>
                    <span className={`flex items-center gap-1 ${strength.criteria.hasSpecial ? "text-emerald-400" : ""}`}>
                      <Check className="h-3 w-3" /> Special (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={isSubmitting}
                  className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || newPassword.length < 10 || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Update Password & Revoke Old Sessions</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 4: Complete */}
        {stage === "complete" && (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-xs font-mono text-slate-300">
              Your password has been changed. Redirecting to login terminal...
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold font-mono text-xs"
            >
              <span>Go to Login Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
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
    </div>
  );
}
