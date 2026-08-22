"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Cpu, Zap, Shield, Sparkles } from "lucide-react";

interface AICoreThemeSelectorProps {
  compact?: boolean;
  className?: string;
}

export function AICoreThemeSelector({ compact = false, className = "" }: AICoreThemeSelectorProps) {
  const { config, setTheme, applyDraft } = useTheme();
  const currentTheme = config.themeId;
  const isJarvis = currentTheme === "jarvis-core" || currentTheme === "obsidian-blue";
  const isUltron = currentTheme === "ultron-core";

  const handleSelectCore = async (themeId: "jarvis-core" | "ultron-core") => {
    setTheme(themeId);
    // Persist immediately
    setTimeout(() => {
      applyDraft();
    }, 50);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] ${className}`}>
        <button
          onClick={() => handleSelectCore("jarvis-core")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
            isJarvis
              ? "bg-[#0B1D3A] text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm shadow-[#00E5FF]/20"
              : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
          }`}
          title="JARVIS CORE: Analytical, Calm, Cyan/Blue AI Matrix"
        >
          <Sparkles className={`h-3 w-3 ${isJarvis ? "text-[#00E5FF] animate-pulse" : "text-[var(--theme-text-muted)]"}`} />
          <span>JARVIS</span>
        </button>

        <button
          onClick={() => handleSelectCore("ultron-core")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
            isUltron
              ? "bg-[#25080C] text-[#FF1E44] border border-[#FF1E44]/40 shadow-sm shadow-[#FF1E44]/20"
              : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
          }`}
          title="ULTRON CORE: Tactical, High-Contrast, Crimson/Graphite Engine"
        >
          <Zap className={`h-3 w-3 ${isUltron ? "text-[#FF1E44] animate-pulse" : "text-[var(--theme-text-muted)]"}`} />
          <span>ULTRON</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md select-none ${className}`}>
      {/* JARVIS CORE Button */}
      <button
        onClick={() => handleSelectCore("jarvis-core")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all relative ${
          isJarvis
            ? "bg-[#0B1D3A] text-[#00E5FF] border border-[#00E5FF]/50 shadow-md shadow-[#00E5FF]/25"
            : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)] border border-transparent"
        }`}
        title="Switch to JARVIS CORE (Analytical AI Intelligence)"
      >
        <div className={`w-2 h-2 rounded-full ${isJarvis ? "bg-[#00E5FF] animate-ping" : "bg-cyan-900"}`} />
        <span className="tracking-wide">JARVIS CORE</span>
        {isJarvis && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 uppercase">
            ACTIVE
          </span>
        )}
      </button>

      {/* ULTRON CORE Button */}
      <button
        onClick={() => handleSelectCore("ultron-core")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all relative ${
          isUltron
            ? "bg-[#25080C] text-[#FF1E44] border border-[#FF1E44]/50 shadow-md shadow-[#FF1E44]/25"
            : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)] border border-transparent"
        }`}
        title="Switch to ULTRON CORE (Tactical High-Contrast Execution)"
      >
        <div className={`w-2 h-2 rounded-full ${isUltron ? "bg-[#FF1E44] animate-ping" : "bg-rose-950"}`} />
        <span className="tracking-wide">ULTRON CORE</span>
        {isUltron && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#FF1E44]/15 text-[#FF1E44] border border-[#FF1E44]/30 uppercase">
            ACTIVE
          </span>
        )}
      </button>
    </div>
  );
}
