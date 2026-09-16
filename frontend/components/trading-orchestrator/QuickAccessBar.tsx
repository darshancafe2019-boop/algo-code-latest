"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Radio,
  Layers,
  Bot,
  Sliders,
  Briefcase,
  Bell,
  Command,
  Zap,
} from "lucide-react";

interface QuickAccessBarProps {
  onOpenCommandPalette: () => void;
}

export const QuickAccessBar: React.FC<QuickAccessBarProps> = ({
  onOpenCommandPalette,
}) => {
  const links = [
    { label: "MARKETS", href: "/markets", icon: TrendingUp },
    { label: "LIVE FEED", href: "/live", icon: Radio },
    { label: "OPTIONS", href: "/options", icon: Layers },
    { label: "FUTURES", href: "/futures", icon: Zap },
    { label: "BOTS", href: "/bots", icon: Bot },
    { label: "STRATEGY", href: "/strategy", icon: Sliders },
    { label: "PORTFOLIO", href: "/pnl-journal", icon: Briefcase },
    { label: "ALERTS", href: "/alerts", icon: Bell },
  ];

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl px-3 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs select-none backdrop-blur">
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
          QUICK ACCESS:
        </span>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-300 hover:text-white border border-[#143e69] hover:border-[#00D4FF]/60 transition-all font-mono text-[11px] font-semibold"
            >
              <Icon className="h-3 w-3 text-[#00D4FF]" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold transition-all cursor-pointer"
        title="Open Command Palette (Ctrl+K)"
      >
        <Command className="h-3 w-3" />
        <span className="hidden sm:inline">COMMAND PALETTE</span>
        <kbd className="px-1 py-0.2 bg-[#050e1d] border border-cyan-700/50 rounded text-[9px]">
          ⌘K
        </kbd>
      </button>
    </div>
  );
};
