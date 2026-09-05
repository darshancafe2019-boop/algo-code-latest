"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  User,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Check,
  Zap,
  Mail,
  RotateCw,
} from "lucide-react";

interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function LoginGateway() {
  const {
    login,
    verifyEmailOTP,
    resendEmailOTP,
    verify2FA,
    lockoutUntil,
    failedAttempts,
    isQuickFillAvailable,
  } = useAuth();

  // Primary Credentials Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isCapsOn, setIsCapsOn] = useState(false);

  // Email OTP / 2FA State
  const [authStep, setAuthStep] = useState<"credentials" | "email_otp" | "totp">("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [destinationEmail, setDestinationEmail] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devOtpFlash, setDevOtpFlash] = useState(false);

  // Resend OTP Cooldown Timer (Seconds)
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);

  // UX Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input Refs for 6-digit auto-advance
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Lockout remaining seconds
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSec(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSec(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

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

  const strength = evaluatePassword(password);

  // Detect Caps Lock
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsOn(e.getModifierState("CapsLock"));
    }
  };

  // Optional Quick Fill helper strictly for local dev mode
  const handleQuickFill = () => {
    if (!isQuickFillAvailable) return;
    const demoUser = process.env.NEXT_PUBLIC_DEMO_USERNAME || "";
    const demoPass = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  // Submit Primary Credentials (Step 1)
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    if (lockoutSec > 0) {
      setErrorMessage(`Anti-Brute Force active: Terminal locked for ${lockoutSec}s.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        username,
        password,
        remember_me: rememberMe,
      });

      if (res.requiresEmailOTP) {
        setAuthStep("email_otp");
        if (res.challengeId) setChallengeId(res.challengeId);
        if (res.destination) setDestinationEmail(res.destination);
        if (res.devOtp) setDevOtp(res.devOtp);
        setResendCooldown(60);
        setOtpDigits(["", "", "", "", "", ""]);
        setSuccessMessage(`A 6-digit verification code was sent to ${res.destination || "your registered email"}.`);
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 200);
      } else if (res.requires2FA) {
        setAuthStep("totp");
        if (res.challengeId) setChallengeId(res.challengeId);
        setOtpDigits(["", "", "", "", "", ""]);
        setSuccessMessage("Credentials verified. Please complete Two-Factor Authentication.");
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 200);
      } else if (!res.success) {
        setErrorMessage(res.error || "Invalid credentials or authentication failed.");
      } else {
        setSuccessMessage("Authorization granted. Initializing terminal session...");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Email OTP
  const submitEmailOTP = useCallback(async (codeToSubmit?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const otpCode = codeToSubmit || otpDigits.join("");
    if (!otpCode || otpCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!challengeId) {
      setErrorMessage("Session challenge expired. Please restart login.");
      setAuthStep("credentials");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyEmailOTP(challengeId, otpCode);
      if (!res.success) {
        setErrorMessage(res.error || "Invalid or expired verification code.");
        setOtpDigits(["", "", "", "", "", ""]);
        digitInputRefs.current[0]?.focus();
      } else {
        setSuccessMessage("Email verified successfully! Entering terminal...");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [challengeId, otpDigits, verifyEmailOTP]);

  // Handle Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || !challengeId || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await resendEmailOTP(challengeId);
      if (res.success) {
        if (res.challengeId) setChallengeId(res.challengeId);
        if (res.destination) setDestinationEmail(res.destination);
        if (res.devOtp) {
          // Clear first so React always triggers re-render + flash even if same code
          setDevOtp(null);
          setTimeout(() => {
            setDevOtp(res.devOtp!);
            setDevOtpFlash(true);
            setTimeout(() => setDevOtpFlash(false), 1200);
          }, 50);
        }
        setResendCooldown(res.cooldown_seconds || 60);
        setSuccessMessage(`A fresh verification code has been dispatched to ${res.destination || destinationEmail || "your email"}.`);
        setOtpDigits(["", "", "", "", "", ""]);
        digitInputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.error || res.message || "Failed to resend verification code. Please wait and try again.");
        if (res.cooldown_seconds) setResendCooldown(res.cooldown_seconds);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Handle 6-Digit OTP Input Navigation
  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1);
    if (char && !/[0-9]/.test(char)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto-advance
    if (char && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (char && index === 5 && newDigits.every((d) => d !== "")) {
      const fullCode = newDigits.join("");
      if (authStep === "email_otp") {
        submitEmailOTP(fullCode);
      } else if (authStep === "totp") {
        submitTOTP(fullCode);
      }
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
      if (authStep === "email_otp") {
        submitEmailOTP(pasted);
      } else if (authStep === "totp") {
        submitTOTP(pasted);
      }
    } else if (pasted.length >= 8 && authStep === "totp") {
      setUseRecoveryCode(true);
      setRecoveryCode(pasted);
    }
  };

  // Submit Authenticator TOTP
  const submitTOTP = async (codeToSubmit?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = codeToSubmit || (useRecoveryCode ? recoveryCode.trim() : otpDigits.join(""));
    if (!code) {
      setErrorMessage("Please enter your 6-digit TOTP code or one-time recovery code.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (challengeId) {
        res = await verify2FA(challengeId, code);
      } else {
        res = await login({
          username,
          password,
          totp_code: code,
          remember_me: rememberMe,
        });
      }

      if (!res.success) {
        setErrorMessage(res.error || "Invalid 2FA code or recovery code.");
        setOtpDigits(["", "", "", "", "", ""]);
        digitInputRefs.current[0]?.focus();
      } else {
        setSuccessMessage("2FA verification confirmed. Entering terminal...");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060913] text-slate-100 overflow-hidden font-sans p-4 sm:p-6">
      {/* Ambient Aura & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#0B132B]/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Terminal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <div className="h-full w-full bg-[#060913] rounded-2xl flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-cyan-400" />
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
            <span className="text-[11px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SECURE ACCESS
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-wide text-white mt-1">
            ALPHA ALGO TERMINAL
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
            Institutional Algorithmic Trading Platform Access Gate
          </p>
        </div>

        {/* Security Telemetry Pill */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-center text-[10px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1.5 text-slate-300">
            <Lock className="h-3 w-3 text-cyan-400" />
            <span>HttpOnly Cookie</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-slate-300 border-x border-slate-800">
            <Mail className="h-3 w-3 text-emerald-400" />
            <span>Email OTP (Resend)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-slate-300">
            <Shield className="h-3 w-3 text-indigo-400" />
            <span>Anti-Brute Force</span>
          </div>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutSec > 0 && (
          <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-mono animate-pulse">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold">Anti-Brute Force Protection Active</p>
              <p className="text-[11px] text-rose-400">
                Rate limit enforced. Retry available in{" "}
                <span className="font-bold underline">{lockoutSec}s</span>.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE 1: PRIMARY CREDENTIALS (USERNAME & PASSWORD)                  */}
        {/* =================================================================== */}
        {authStep === "credentials" && (
          <form onSubmit={handleSubmitCredentials} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Operator Identity / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter operator username"
                  disabled={isSubmitting || lockoutSec > 0}
                  className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Master Password
                </label>
                {isCapsOn && (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Caps Lock Active
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyUp}
                  placeholder="••••••••••••"
                  disabled={isSubmitting || lockoutSec > 0}
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
              {password.length > 0 && (
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

            {/* Remember Me & Attempt Counter & Forgot Password */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                />
                <span>Trust this terminal</span>
              </label>
              <a
                href="/forgot-password"
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {failedAttempts > 0 && lockoutSec === 0 && (
              <div className="text-right text-[11px] font-mono text-amber-400">
                Failed Attempts: {failedAttempts}/5
              </div>
            )}

            {/* Operator Quick-Fill ONLY in dev when DEMO mode enabled */}
            {isQuickFillAvailable && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400 transition-all text-left text-xs font-mono group"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>Development Bootstrap Credentials</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-semibold">
                    Dev Fill
                  </span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting || lockoutSec > 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Continue to Two-Step Verification</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* STAGE 2A: EMAIL OTP VERIFICATION (DEFAULT 2-STEP AUTH)              */}
        {/* =================================================================== */}
        {authStep === "email_otp" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white">
                Two-Step Email Verification
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Enter the 6-digit code sent to{" "}
                <span className="text-cyan-300 font-semibold">{destinationEmail || "your email"}</span>.
              </p>
            </div>

            {/* Dev Mode OTP Banner */}
            {devOtp && (
              <div
                className={`mb-3 p-3.5 border rounded-2xl cursor-pointer transition-all duration-300 ${
                  devOtpFlash
                    ? "bg-amber-400/25 border-amber-400 shadow-lg shadow-amber-500/30 scale-[1.01]"
                    : "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20"
                }`}
                onClick={() => {
                  const chars = devOtp.split("");
                  setOtpDigits(chars);
                  digitInputRefs.current[5]?.focus();
                  submitEmailOTP(devOtp);
                }}
                title="Click to auto-fill and submit"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    DEV MODE — No Email Provider Configured
                  </span>
                  <div className="flex items-center gap-1.5">
                    {devOtpFlash && (
                      <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded animate-pulse font-bold">NEW</span>
                    )}
                    <span className="text-[9px] font-mono text-amber-600 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">Click to auto-fill</span>
                  </div>
                </div>
                <div className="text-center py-1">
                  <span className={`font-mono text-3xl font-black tracking-[0.3em] transition-colors duration-300 ${devOtpFlash ? "text-amber-200" : "text-amber-300"}`}>{devOtp}</span>
                </div>
                <p className="text-[10px] font-mono text-amber-600 text-center mt-1">OTP shown here because RESEND_API_KEY is not set in .env</p>
              </div>
            )}


            {/* 6-Digit OTP Input Boxes */}
            <div>
              <div className="flex justify-center gap-2 sm:gap-3 my-4">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
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
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => submitEmailOTP()}
                disabled={isSubmitting || otpDigits.some((d) => d === "")}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify Code & Enter Terminal</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-mono pt-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isResending}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 transition-colors"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend Code in ${resendCooldown}s`
                      : "Resend Code"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("credentials");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE 2B: TOTP AUTHENTICATOR APP VERIFICATION                       */}
        {/* =================================================================== */}
        {authStep === "totp" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white">
                Two-Factor Security Verification
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {useRecoveryCode
                  ? "Enter one of your single-use recovery codes (e.g. ABCD-EF12-3456)."
                  : "Enter the 6-digit verification code generated by your Authenticator App."}
              </p>
            </div>

            {!useRecoveryCode ? (
              <div>
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
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                  Single-Use Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  disabled={isSubmitting}
                  className="w-full bg-[#060913]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all uppercase"
                />
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Each recovery code can only be used once. It will be permanently consumed upon authentication.
                </p>
              </div>
            )}

            {/* 2FA Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => submitTOTP()}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify & Grant Access</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <button
                  type="button"
                  onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                  className="text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {useRecoveryCode ? "← Use 6-Digit Authenticator Code" : "Use Single-Use Recovery Code →"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("credentials");
                    setErrorMessage(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Audit Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] font-mono text-slate-500">
          <p>
            Cryptographically sealed session. All authentication events logged to immutable security audit ledger.
          </p>
        </div>
      </div>
    </div>
  );
}
