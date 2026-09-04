"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { LoginGateway } from "./LoginGateway";
import { TerminalLockOverlay } from "./TerminalLockOverlay";
import { ForcePasswordChangeModal } from "./ForcePasswordChangeModal";
import { Shield, RefreshCw } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isLocked, mustChangePassword } = useAuth();

  // 1. Initial Session Check Splash
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--theme-pageBg)] text-[var(--theme-text-primary)] font-mono p-4 select-none">
        <div className="relative mb-4">
          <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <Shield className="h-8 w-8 text-sky-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border border-sky-400/30 animate-ping" />
        </div>
        <div className="flex items-center gap-2 text-sm text-sky-300 font-bold tracking-wider mb-1">
          <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
          <span>ALPHA ALGO TERMINAL | SECURITY GATEWAY</span>
        </div>
        <p className="text-xs text-[var(--theme-text-muted)]">
          Verifying cryptographic session state and identity tokens...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Display High-Security Login Gateway
  if (!isAuthenticated) {
    return <LoginGateway />;
  }

  // 3. Authenticated: Check Forced Password Change or Terminal Lock
  return (
    <>
      {mustChangePassword && <ForcePasswordChangeModal />}
      {isLocked && !mustChangePassword && <TerminalLockOverlay />}
      <div className={isLocked || mustChangePassword ? "filter blur-sm pointer-events-none select-none" : ""}>
        {children}
      </div>
    </>
  );
}
