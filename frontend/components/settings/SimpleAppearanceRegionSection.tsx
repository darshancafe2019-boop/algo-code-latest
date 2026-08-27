"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Paintbrush,
  Clock,
  DollarSign,
  CheckCircle2,
  X,
  Sparkles,
  Sliders,
  Check,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";

interface MarketSessionItem {
  exchange: string;
  market_name: string;
  timezone: string;
  status: string;
  sub_status: string;
  open_time: string;
  close_time: string;
  current_local_time: string;
  is_open_for_trading: boolean;
}

export function SimpleAppearanceRegionSection() {
  const { config: themeConfig, openAppearanceDrawer } = useTheme();
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Load from localStorage & backend settings
  useEffect(() => {
    const savedTz = localStorage.getItem("terminal_timezone");
    const savedCurr = localStorage.getItem("terminal_currency");
    if (savedTz) setTimezone(savedTz);
    if (savedCurr) setCurrency(savedCurr);
  }, []);

  // Fetch Authoritative Market Sessions Snapshot
  const { data: sessionData } = useQuery<{
    status: string;
    sessions: MarketSessionItem[];
  }>({
    queryKey: ["globalMarketSessionsSummary"],
    queryFn: async () => {
      const res = await fetch("/api/universe/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const handleSavePreferences = async () => {
    localStorage.setItem("terminal_timezone", timezone);
    localStorage.setItem("terminal_currency", currency);

    try {
      await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: { timezone, currency },
        }),
      });
    } catch {
      // Ignored for resilience
    }

    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      setIsCustomizeModalOpen(false);
    }, 1200);
  };

  const sessions = sessionData?.sessions || [];

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Paintbrush className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                4. APPEARANCE & REGION
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ACTIVE
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs mt-0.5">
              Theme Tokens, Canonical UTC Timezone Mapping & Authoritative Exchange Clocks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAppearanceDrawer?.()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-400 text-purple-300 font-bold transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Theme Builder</span>
          </button>

          <button
            onClick={() => setIsCustomizeModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 font-bold transition flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Customize Region</span>
          </button>
        </div>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Appearance */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Active Theme</span>
            <Paintbrush className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            Obsidian Blue
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Dark Mode • Compact Density
          </div>
        </div>

        {/* Region & Timezone */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Display Timezone</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {timezone}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Canonical Internal: UTC
          </div>
        </div>

        {/* Presentation Currency */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
            <span>Display Currency</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {currency} ({currency === "INR" ? "₹" : "$"})
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Presentation Only (Zero Balance Mutation)
          </div>
        </div>
      </div>

      {/* Global Market Session Clocks Strip */}
      <div className="pt-2 border-t border-slate-800/80">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
          Authoritative Exchange Clocks & Sessions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {sessions.map((s) => {
            const isOpen = s.status === "OPEN";
            const isPre = s.status === "PRE_MARKET";
            const isHoliday = s.status === "HOLIDAY";

            return (
              <div
                key={s.exchange}
                className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{s.exchange}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isOpen
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isPre
                        ? "bg-cyan-500/20 text-cyan-300"
                        : isHoliday
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {s.current_local_time}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customize Region Modal */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Region & Localization Settings
                </h4>
              </div>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-xs">
              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold font-mono">Application Display Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-400 font-mono text-xs"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+05:30)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                  <option value="Europe/London">Europe/London (GMT / BST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT • UTC+08:00)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST • UTC+09:00)</option>
                </select>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold font-mono">Display Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-400 font-mono text-xs"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="USDT">USDT (₮ - Tether USD)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                ℹ️ <strong>Financial Invariance Notice:</strong> Changing display currency or timezone is presentation-only and will never modify internal account balances or historical ledger timestamps.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {savedFeedback ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Preferences Saved</span>
                </span>
              ) : <div />}

              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold transition font-mono"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
