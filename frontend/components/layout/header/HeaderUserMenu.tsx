"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { Lock, LogOut, Paintbrush, BrainCircuit, Play, Pause, ShieldCheck, MoreVertical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";

interface HeaderUserMenuProps {
  onOpenMarketAnalyst: () => void;
}

export const HeaderUserMenu = memo(function HeaderUserMenu({
  onOpenMarketAnalyst,
}: HeaderUserMenuProps) {
  const queryClient = useQueryClient();
  const { user, logout, lockTerminal } = useAuth();
  const { openAppearanceDrawer } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : "AD";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Operator Profile, Settings and Fleet Actions"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 p-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-elevated)]/60 hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 select-none"
        title="Operator Session & Tools"
      >
        <div className="h-6 w-6 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] flex items-center justify-center border border-cyan-500/30">
          {initials}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-2.5 shadow-2xl w-60 flex flex-col gap-2 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* User ID Card */}
          <div className="p-2 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-lg space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-100">{user?.username || "admin"}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                {user?.role || "ADMIN"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9.5px] text-emerald-400 font-sans">
              <ShieldCheck className="h-3 w-3" />
              <span>Session Authenticated</span>
            </div>
          </div>

          {/* Fleet Controls */}
          <div className="flex flex-col gap-0.5 pb-1 border-b border-[var(--theme-border-subtle)]">
            <button
              type="button"
              onClick={async () => {
                await apiClient.post("/api/bots/start-all", {});
                queryClient.invalidateQueries({ queryKey: ["botsList"] });
                queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors text-left cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Start All Bots</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await apiClient.post("/api/bots/pause-all", {});
                queryClient.invalidateQueries({ queryKey: ["botsList"] });
                queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 font-medium transition-colors text-left cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause All Bots</span>
            </button>
          </div>

          {/* Tools & Views */}
          <div className="flex flex-col gap-0.5 pb-1 border-b border-[var(--theme-border-subtle)]">
            <button
              type="button"
              onClick={() => {
                onOpenMarketAnalyst();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[var(--theme-elevated)] font-medium transition-colors text-left cursor-pointer"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
              <span>Market Analyst AI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openAppearanceDrawer();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[var(--theme-elevated)] font-medium transition-colors text-left cursor-pointer"
            >
              <Paintbrush className="h-3.5 w-3.5 text-sky-400" />
              <span>Themes & Layout</span>
            </button>
          </div>

          {/* Session Safety */}
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                lockTerminal();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 font-medium transition-colors text-left cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock Terminal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-medium transition-colors text-left cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
