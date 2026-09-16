"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  TrendingUp,
  Radio,
  Layers,
  Bot,
  Sliders,
  Briefcase,
  Shield,
  RefreshCw,
  Power,
  FileText,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDrawer: (type: any, title: string, data?: any) => void;
  onEmergencyStop: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenDrawer,
  onEmergencyStop,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const actions = useMemo(
    () => [
      { id: "markets_nifty", label: "Open NIFTY Universe", category: "Navigation", icon: TrendingUp, action: () => { router.push("/markets"); onClose(); } },
      { id: "markets_bnifty", label: "Open BANKNIFTY Options", category: "Navigation", icon: Layers, action: () => { router.push("/options"); onClose(); } },
      { id: "crypto_btc", label: "Open Crypto Futures / BTC", category: "Navigation", icon: Zap, action: () => { router.push("/futures"); onClose(); } },
      { id: "bots_manage", label: "Manage AI Trading Bots", category: "Automation", icon: Bot, action: () => { router.push("/bots"); onClose(); } },
      { id: "strategy_builder", label: "Open Strategy Workspace", category: "Automation", icon: Sliders, action: () => { router.push("/strategy"); onClose(); } },
      { id: "view_risk", label: "View 12 Risk Checks Matrix", category: "Risk & Control", icon: Shield, action: () => { onOpenDrawer("risk_checks", "Risk Engine — Full 12 Check Compliance Matrix"); onClose(); } },
      { id: "view_providers", label: "View Provider Diagnostics", category: "Data Feeds", icon: Radio, action: () => { onOpenDrawer("provider_diagnostics", "Provider Diagnostics & Latency Matrix"); onClose(); } },
      { id: "view_reconciliation", label: "View Broker Reconciliation", category: "Audit", icon: RefreshCw, action: () => { onOpenDrawer("reconciliation", "Multi-Broker Position & Order Reconciliation"); onClose(); } },
      { id: "view_audit", label: "Open Execution & Trade Audit Log", category: "Audit", icon: FileText, action: () => { onOpenDrawer("trade_audit", "Chronological Execution & Trade Ledger"); onClose(); } },
      { id: "emergency_stop", label: "TRIGGER EMERGENCY STOP / KILL SWITCH", category: "Emergency", icon: Power, action: () => { onEmergencyStop(); onClose(); } },
    ],
    [router, onClose, onOpenDrawer, onEmergencyStop]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [actions, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-start justify-center pt-20 px-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-[#050e1d] border border-[#143e69] shadow-2xl rounded-2xl overflow-hidden z-10 text-slate-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#0f2d4e] bg-[#07192f]">
          <Search className="h-5 w-5 text-[#00D4FF]" />
          <input
            type="text"
            placeholder="Type a command, instrument, or action... (e.g. NIFTY, Risk, Bots)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
          />
          <kbd className="px-1.5 py-0.5 bg-[#050e1d] border border-[#143e69] rounded text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-mono">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              const isEmergency = item.category === "Emergency";
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer",
                    isEmergency
                      ? "hover:bg-rose-950/60 text-rose-300"
                      : "hover:bg-[#092547] text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isEmergency ? "text-rose-400" : "text-[#00D4FF]"
                      )}
                    />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
