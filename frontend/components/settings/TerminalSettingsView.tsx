"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Clock,
  Globe,
  ShieldCheck,
  Lock,
  Bell,
  Save,
  CheckCircle2,
  Calendar,
  Send,
  Radio,
  AlertTriangle,
  RefreshCw,
  Zap,
  Check,
  X,
  Server,
  Paintbrush,
  Sparkles,
  Sliders,
  Type,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { BUILTIN_THEMES, ThemeId } from "@/lib/themeTokens";
import { SecurityCenter } from "@/components/security/SecurityCenter";

interface TelegramSettings {
  trade_signals: boolean;
  order_filled: boolean;
  order_rejected: boolean;
  stop_loss: boolean;
  take_profit: boolean;
  bot_status: boolean;
  risk_alerts: boolean;
  system_errors: boolean;
}

interface TelegramHealth {
  status: "CONNECTED" | "DISCONNECTED" | "NOT CONFIGURED" | "ERROR" | "DEGRADED";
  telegram_status: "CONNECTED" | "DISCONNECTED" | "NOT CONFIGURED" | "ERROR" | "DEGRADED";
  is_configured: boolean;
  queue_size: number;
  total_sent: number;
  total_failed: number;
  total_retried: number;
  total_deduped: number;
  last_successful_alert: string | null;
  last_failure: string | null;
  last_error: string | null;
  last_alert_time: string | null;
}

export function TerminalSettingsView() {
  const { config: themeConfig, setTheme, openAppearanceDrawer } = useTheme();
  const [settingsSection, setSettingsSection] = useState<"SECURITY" | "APPEARANCE" | "TELEGRAM" | "LOCALIZATION">("SECURITY");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Telegram State
  const [telegramHealth, setTelegramHealth] = useState<TelegramHealth | null>(null);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    trade_signals: true,
    order_filled: true,
    order_rejected: true,
    stop_loss: true,
    take_profit: true,
    bot_status: true,
    risk_alerts: true,
    system_errors: true,
  });
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestFeedback, setTelegramTestFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSavingTelegramSettings, setIsSavingTelegramSettings] = useState(false);

  // Load preferences from localStorage & backend APIs
  useEffect(() => {
    const savedTz = localStorage.getItem("terminal_timezone");
    const savedCurr = localStorage.getItem("terminal_currency");
    if (savedTz) setTimezone(savedTz);
    if (savedCurr) setCurrency(savedCurr);

    fetchTelegramHealth();
    fetchTelegramSettings();
    const interval = setInterval(fetchTelegramHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelegramHealth = async () => {
    try {
      const res = await fetch("/api/notifications/telegram/health");
      if (res.ok) {
        const data = await res.json();
        if (data.health) setTelegramHealth(data.health);
      }
    } catch {
      // Ignored for resilience
    }
  };

  const fetchTelegramSettings = async () => {
    try {
      const res = await fetch("/api/notifications/telegram/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setTelegramSettings(data.settings);
      }
    } catch {
      // Ignored for resilience
    }
  };

  const handleSaveGeneral = () => {
    localStorage.setItem("terminal_timezone", timezone);
    localStorage.setItem("terminal_currency", currency);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleToggleTelegramSetting = async (key: keyof TelegramSettings) => {
    const updated = { ...telegramSettings, [key]: !telegramSettings[key] };
    setTelegramSettings(updated);
    setIsSavingTelegramSettings(true);
    try {
      const res = await fetch("/api/notifications/telegram/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setTelegramSettings(data.settings);
      }
    } catch {
      // Revert if error
    } finally {
      setIsSavingTelegramSettings(false);
    }
  };

  const handleSendTestAlert = async () => {
    setIsTestingTelegram(true);
    setTelegramTestFeedback(null);
    try {
      const res = await fetch("/api/notifications/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_name: "BTC Scalper" }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setTelegramTestFeedback({
          type: "success",
          message: data.message || "Test alert delivered successfully to Telegram!",
        });
        fetchTelegramHealth();
      } else {
        setTelegramTestFeedback({
          type: "error",
          message: data.message || "Failed to deliver Telegram test alert.",
        });
      }
    } catch (err: any) {
      setTelegramTestFeedback({
        type: "error",
        message: `Network error: ${err.message}`,
      });
    } finally {
      setIsTestingTelegram(false);
      setTimeout(() => setTelegramTestFeedback(null), 6000);
    }
  };

  const marketSessions = [
    { name: "NSE / BSE Indian Equities", hours: "09:15 - 15:30 IST", timezone: "Asia/Kolkata", status: "OPEN" },
    { name: "NSE / BSE Derivatives & Options", hours: "09:15 - 15:30 IST", timezone: "Asia/Kolkata", status: "OPEN" },
    { name: "MCX Commodities", hours: "09:00 - 23:30 IST", timezone: "Asia/Kolkata", status: "OPEN" },
    { name: "Crypto Spot & Perpetuals", hours: "24/7 / 365 Days", timezone: "UTC", status: "OPEN" },
    { name: "US Equities (NASDAQ / NYSE)", hours: "09:30 - 16:00 EST", timezone: "America/New_York", status: "CLOSED" },
    { name: "Forex Interbank", hours: "24/5 Sunday - Friday", timezone: "UTC", status: "OPEN" },
  ];

  const statusVal = telegramHealth?.telegram_status || telegramHealth?.status || (telegramHealth?.is_configured ? "DISCONNECTED" : "NOT CONFIGURED");

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans max-w-7xl mx-auto pb-12">
      {/* Top Main Navigation Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#080E18] border border-[#172338] shadow-lg">
        {[
          { id: "SECURITY", label: "Security & Access Center", icon: ShieldCheck },
          { id: "APPEARANCE", label: "Appearance & Themes", icon: Paintbrush },
          { id: "TELEGRAM", label: "Telegram Notifications", icon: Radio },
          { id: "LOCALIZATION", label: "Localization & Schedules", icon: Globe },
        ].map((sec) => {
          const Icon = sec.icon;
          const isSelected = settingsSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSettingsSection(sec.id as any)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0E1726]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: SECURITY & ACCESS CENTER */}
      {settingsSection === "SECURITY" && <SecurityCenter />}

      {/* SECTION 2: APPEARANCE & THEMES */}
      {settingsSection === "APPEARANCE" && (
        <div className="space-y-6">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-[var(--theme-accent)]" />
                <div>
                  <h2 className="text-sm font-bold text-[var(--theme-text-primary)]">
                    Terminal Theme & Typography System
                  </h2>
                  <p className="text-[11px] text-[var(--theme-text-secondary)]">
                    Active Theme: <strong className="text-[var(--theme-accent)]">{themeConfig.name}</strong> • Font: <strong className="text-[var(--theme-text-primary)]">{themeConfig.typography.interfaceFont}</strong> / <strong className="text-[var(--theme-text-primary)] font-mono">{themeConfig.typography.numericFont}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={openAppearanceDrawer}
                className="px-4 py-2 bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs rounded-xl shadow-lg shadow-[var(--theme-accent)]/20 transition flex items-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                <span>Open Appearance Studio</span>
              </button>
            </div>

            {/* 5-Theme Quick Switcher Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Object.entries(BUILTIN_THEMES).map(([id, t]) => {
                const isSelected = themeConfig.themeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id as ThemeId)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-[var(--theme-accent)] bg-[var(--theme-elevated)] ring-1 ring-[var(--theme-accent)] font-bold shadow-md"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    <div className="text-xs font-semibold truncate text-[var(--theme-text-primary)]">{t.name}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.pageBg }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.accent }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.profit }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.loss }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TELEGRAM NOTIFICATIONS */}
      {settingsSection === "TELEGRAM" && (
        <div className="space-y-6">

      {/* ==================================================================== */}
      {/* TELEGRAM NOTIFICATION SYSTEM SETTINGS */}
      {/* ==================================================================== */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>Telegram Notification Subsystem</span>
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Telegram:</span>
              {statusVal === "CONNECTED" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  CONNECTED
                </span>
              ) : statusVal === "NOT CONFIGURED" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  NOT CONFIGURED
                </span>
              ) : statusVal === "ERROR" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  ERROR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  DISCONNECTED
                </span>
              )}
            </div>

            <button
              onClick={handleSendTestAlert}
              disabled={isTestingTelegram}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
            >
              {isTestingTelegram ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Test Alert</span>
            </button>
          </div>
        </div>

        {/* Test Alert Feedback */}
        {telegramTestFeedback && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
              telegramTestFeedback.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {telegramTestFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{telegramTestFeedback.message}</span>
          </div>
        )}

        {/* Diagnostics & Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Queue Status</div>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {telegramHealth?.queue_size ?? 0} <span className="text-xs text-slate-400 font-normal">pending</span>
            </div>
          </div>

          <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delivered Alerts</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
              {telegramHealth?.total_sent ?? 0}
            </div>
          </div>

          <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Retry Counter</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-1">
              {telegramHealth?.total_retried ?? 0}
            </div>
          </div>

          <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Success</div>
            <div className="text-[11px] font-bold text-slate-300 font-mono mt-1 truncate">
              {telegramHealth?.last_successful_alert
                ? new Date(telegramHealth.last_successful_alert).toLocaleTimeString()
                : "None yet"}
            </div>
          </div>
        </div>

        {/* Category Notification Toggles */}
        <div>
          <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span>Granular Alert Channels & Category Subscriptions</span>
            {isSavingTelegramSettings && (
              <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: "trade_signals", label: "Trade Signals (BUY / SELL)", desc: "Confidence ≥75% strategy entries" },
              { key: "order_filled", label: "Order Filled", desc: "Executed market & limit fills" },
              { key: "order_rejected", label: "Order Rejected / Cancelled", desc: "Order execution failures" },
              { key: "stop_loss", label: "Stop Loss", desc: "Automated risk loss exits" },
              { key: "take_profit", label: "Take Profit", desc: "Target profit exits & milestone fills" },
              { key: "bot_status", label: "Bot Status", desc: "Bot started, paused, stopped" },
              { key: "risk_alerts", label: "Risk Alerts & Kill Switch", desc: "Daily loss, drawdown & exposure blocks" },
              { key: "system_errors", label: "System & Data Errors", desc: "Feed disconnections & runner exceptions" },
            ].map(({ key, label, desc }) => {
              const active = telegramSettings[key as keyof TelegramSettings];
              return (
                <div
                  key={key}
                  onClick={() => handleToggleTelegramSetting(key as keyof TelegramSettings)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    active
                      ? "bg-[#0B0F17] border-sky-500/40 hover:border-sky-400"
                      : "bg-[#0B0F17]/50 border-slate-800/80 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{label}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      active
                        ? "bg-sky-500 border-sky-400 text-black font-bold"
                        : "bg-slate-800 border-slate-700 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )}

      {/* SECTION 4: LOCALIZATION & SCHEDULES */}
      {settingsSection === "LOCALIZATION" && (
        <div className="space-y-6">
          {/* Timezone & Regional Settings */}
          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Timezone & Currency Engine</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Display Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-[#0B0F17] border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30) [Default Indian Markets]</option>
                  <option value="Etc/UTC">Etc/UTC (UTC+0:00) [Standard Crypto]</option>
                  <option value="America/New_York">America/New_York (EST - UTC-5:00) [US Equities]</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8:00)</option>
                  <option value="Europe/London">Europe/London (GMT - UTC+0:00)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Primary Display Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-[#0B0F17] border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="USDT">$ USDT (Tether)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Market Sessions Calendar */}
          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Market Trading Sessions & Exchange Schedules</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {marketSessions.map((ms) => (
                <div key={ms.name} className="p-3 bg-[#0B0F17] border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{ms.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{ms.hours}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {ms.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
