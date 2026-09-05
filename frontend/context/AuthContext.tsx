"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  is_2fa_enabled: boolean;
  must_change_password?: boolean;
  passkeys_count?: number;
  recovery_codes_remaining?: number;
}

export interface AuthSession {
  session_id: string;
  device_name?: string;
  ip_address?: string;
  last_active_at?: string;
  expires_at?: string;
}

export interface LoginResult {
  success: boolean;
  requiresEmailOTP?: boolean;
  requires2FA?: boolean;
  challengeId?: string;
  destination?: string;
  userId?: string;
  message?: string;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  isQuickFillAvailable: boolean;
  lockoutUntil: number | null;
  failedAttempts: number;
  login: (credentials: {
    username: string;
    password: string;
    totp_code?: string;
    remember_me?: boolean;
  }) => Promise<LoginResult>;
  verifyEmailOTP: (challengeId: string, otp: string) => Promise<LoginResult>;
  resendEmailOTP: (challengeId: string) => Promise<{ success: boolean; message: string; challengeId?: string; destination?: string; cooldown_seconds?: number; error?: string }>;
  verify2FA: (challengeId: string, code: string) => Promise<LoginResult>;
  forgotPassword: (emailOrUsername: string) => Promise<{ success: boolean; message: string; challengeId?: string; destination?: string; error?: string }>;
  verifyResetOTP: (challengeId: string, otp: string) => Promise<{ success: boolean; resetToken?: string; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  lockTerminal: () => void;
  unlockTerminal: (password: string) => Promise<{ success: boolean; error?: string }>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCK_STORAGE_KEY = "algo_terminal_locked";
const FAILED_ATTEMPTS_KEY = "algo_auth_failed_attempts";
const LOCKOUT_UNTIL_KEY = "algo_auth_lockout_until";

// Max 5 failed attempts before a 30s lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Quick fill is strictly permitted ONLY in development when NEXT_PUBLIC_AUTH_DEMO_MODE is true
  const isQuickFillAvailable =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_AUTH_DEMO_MODE === "true";

  const clearSessionState = useCallback(() => {
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    try {
      sessionStorage.removeItem(LOCK_STORAGE_KEY);
    } catch {}
  }, []);

  // Check active session against authoritative backend HttpOnly cookie
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.user) {
          setUser(data.user);
          setSession(data.session || null);
          setIsAuthenticated(true);

          // Restore terminal lock state if it was actively locked in this tab
          try {
            const wasLocked = sessionStorage.getItem(LOCK_STORAGE_KEY) === "true";
            if (wasLocked) setIsLocked(true);
          } catch {}

          return true;
        }
      }

      clearSessionState();
      return false;
    } catch {
      clearSessionState();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionState]);

  // Initial load & Global Auth Event Bus Listeners
  useEffect(() => {
    try {
      const storedLockout = sessionStorage.getItem(LOCKOUT_UNTIL_KEY);
      if (storedLockout) {
        const until = parseInt(storedLockout, 10);
        if (until > Date.now()) {
          setLockoutUntil(until);
        } else {
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        }
      }
      const storedAttempts = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
      if (storedAttempts) {
        setFailedAttempts(parseInt(storedAttempts, 10));
      }
    } catch {}

    const handleAuthRestored = (e: any) => {
      const detail = e?.detail || {};
      if (detail.user) {
        setUser(detail.user);
        setSession(detail.session || null);
        setIsAuthenticated(true);
        setIsLoading(false);
      }
    };

    const handleAuthRequired = () => {
      clearSessionState();
      setIsLoading(false);
    };

    window.addEventListener("quantos:auth_restored", handleAuthRestored);
    window.addEventListener("quantos:auth_required", handleAuthRequired);

    checkSession();

    return () => {
      window.removeEventListener("quantos:auth_restored", handleAuthRestored);
      window.removeEventListener("quantos:auth_required", handleAuthRequired);
    };
  }, [checkSession, clearSessionState]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        try {
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
          sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
        } catch {}
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Handle Login
  const login = async (credentials: {
    username: string;
    password: string;
    totp_code?: string;
    remember_me?: boolean;
  }): Promise<LoginResult> => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `Anti-Brute Force active: Access locked for ${remainingSec} more seconds.`,
      };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password,
          totp_code: credentials.totp_code?.trim(),
          device_name: typeof navigator !== "undefined" ? `${navigator.platform} Browser` : "Web Terminal",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const retryAfter = data.retry_after || 60;
        const until = Date.now() + retryAfter * 1000;
        setLockoutUntil(until);
        try {
          sessionStorage.setItem(LOCKOUT_UNTIL_KEY, until.toString());
        } catch {}
        return {
          success: false,
          error: data.message || "Too many failed attempts. Rate limit enforced.",
        };
      }

      // Check if Email OTP step is required
      if (
        data.status === "email_otp_required" ||
        data.status === "EMAIL_OTP_REQUIRED"
      ) {
        return {
          success: false,
          requiresEmailOTP: true,
          challengeId: data.challenge_id,
          destination: data.destination || data.email,
          userId: data.user_id,
          message: data.message || "Enter the 6-digit verification code sent to your email.",
        };
      }

      // Check if 2FA step is required
      if (data.status === "requires_2fa" || data.status === "2fa_required") {
        return {
          success: false,
          requires2FA: true,
          challengeId: data.challenge_id,
          userId: data.user_id,
          message: data.message || "Two-factor authentication required.",
        };
      }

      if (res.ok && data.status === "success") {
        setUser(data.user);
        setSession(data.session || null);
        setIsAuthenticated(true);
        setIsLocked(false);
        setFailedAttempts(0);
        setLockoutUntil(null);
        try {
          sessionStorage.removeItem(LOCK_STORAGE_KEY);
          sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        } catch {}

        return {
          success: true,
          message: data.message || "Authentication successful.",
        };
      }

      // Record failed attempt
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      try {
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());
      } catch {}

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        try {
          sessionStorage.setItem(LOCKOUT_UNTIL_KEY, until.toString());
        } catch {}
        return {
          success: false,
          error: `Maximum failed attempts exceeded (${MAX_FAILED_ATTEMPTS}/${MAX_FAILED_ATTEMPTS}). Terminal locked for 30s.`,
        };
      }

      return {
        success: false,
        error: data.message || "Invalid credentials or authentication failed.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to reach authentication server.",
      };
    }
  };

  // Verify Email OTP
  const verifyEmailOTP = async (
    challengeId: string,
    otp: string
  ): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          challenge_id: challengeId,
          otp: otp.trim(),
          device_name: typeof navigator !== "undefined" ? `${navigator.platform} Browser` : "Web Terminal",
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setUser(data.user);
        setSession(data.session || null);
        setIsAuthenticated(true);
        setIsLocked(false);
        setFailedAttempts(0);
        setLockoutUntil(null);
        try {
          sessionStorage.removeItem(LOCK_STORAGE_KEY);
          sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        } catch {}

        return {
          success: true,
          message: data.message || "Email verification successful.",
        };
      }

      return {
        success: false,
        error: data.message || "Invalid or expired verification code.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to reach authentication server.",
      };
    }
  };

  // Resend Email OTP
  const resendEmailOTP = async (
    challengeId: string
  ): Promise<{ success: boolean; message: string; challengeId?: string; destination?: string; cooldown_seconds?: number; error?: string }> => {
    try {
      const res = await fetch("/api/auth/email-otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        return {
          success: true,
          message: data.message || "Verification code resent.",
          challengeId: data.challenge_id || challengeId,
          destination: data.destination,
          cooldown_seconds: data.cooldown_seconds || 60,
        };
      }
      return {
        success: false,
        message: data.message || "Failed to resend code.",
        error: data.message,
        cooldown_seconds: data.cooldown_seconds || 60,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Network error while requesting code resend.",
        error: err?.message,
      };
    }
  };

  // Verify 2FA via challenge
  const verify2FA = async (
    challengeId: string,
    code: string
  ): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          challenge_id: challengeId,
          code: code.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setUser(data.user);
        setSession(data.session || null);
        setIsAuthenticated(true);
        setIsLocked(false);
        setFailedAttempts(0);
        setLockoutUntil(null);
        try {
          sessionStorage.removeItem(LOCK_STORAGE_KEY);
          sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        } catch {}

        return {
          success: true,
          message: data.message || "Two-factor authentication successful.",
        };
      }

      return {
        success: false,
        error: data.message || "Invalid two-factor authentication code or recovery code.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to connect to authentication server for 2FA.",
      };
    }
  };

  // Request Password Reset Link
  const forgotPassword = async (
    emailOrUsername: string
  ): Promise<{ success: boolean; message: string; challengeId?: string; destination?: string; error?: string }> => {
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrUsername.trim() }),
      });

      const data = await res.json();
      return {
        success: res.ok && data.status === "success",
        message: data.message || "If that account exists, password recovery instructions have been dispatched.",
        challengeId: data.challenge_id,
        destination: data.destination,
        error: res.ok ? undefined : data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Failed to communicate with authentication server.",
        error: err?.message,
      };
    }
  };

  // Verify Reset OTP
  const verifyResetOTP = async (
    challengeId: string,
    otp: string
  ): Promise<{ success: boolean; resetToken?: string; message?: string; error?: string }> => {
    try {
      const res = await fetch("/api/auth/password/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success" && data.reset_token) {
        return {
          success: true,
          resetToken: data.reset_token,
          message: data.message || "Code verified successfully.",
        };
      }
      return {
        success: false,
        error: data.message || "Invalid or expired verification code.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to communicate with authentication server.",
      };
    }
  };

  // Reset Password via Token
  const resetPassword = async (
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      return {
        success: res.ok && data.status === "success",
        message: data.message || (res.ok ? "Password reset successful." : "Password reset failed."),
        error: res.ok ? undefined : data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Failed to communicate with authentication server.",
        error: err?.message,
      };
    }
  };

  // Change Password
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        if (user) {
          setUser({ ...user, must_change_password: false });
        }
        return { success: true };
      }

      return {
        success: false,
        error: data.message || "Password change failed.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Network error while updating password.",
      };
    }
  };

  // Handle Logout
  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch {
      // Best effort backend notification
    } finally {
      clearSessionState();
    }
  };

  // Revoke All Sessions
  const logoutAll = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout-all", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch {
      // Best effort
    } finally {
      clearSessionState();
    }
  };

  // Lock Terminal (Screen Lock without ending session)
  const lockTerminal = () => {
    setIsLocked(true);
    try {
      sessionStorage.setItem(LOCK_STORAGE_KEY, "true");
    } catch {}
  };

  // Unlock Terminal with Password
  const unlockTerminal = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!password) {
      return { success: false, error: "Password cannot be empty." };
    }

    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setIsLocked(false);
        try {
          sessionStorage.removeItem(LOCK_STORAGE_KEY);
        } catch {}
        return { success: true };
      }

      return {
        success: false,
        error: data.message || "Invalid unlock password.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Verification request failed.",
      };
    }
  };

  const mustChangePassword = Boolean(user?.must_change_password);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        isLocked,
        mustChangePassword,
        isQuickFillAvailable,
        lockoutUntil,
        failedAttempts,
        login,
        verifyEmailOTP,
        resendEmailOTP,
        verify2FA,
        forgotPassword,
        verifyResetOTP,
        resetPassword,
        logout,
        logoutAll,
        changePassword,
        lockTerminal,
        unlockTerminal,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
