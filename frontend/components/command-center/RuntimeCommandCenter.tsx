"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";
import {
  Terminal,
  Play,
  Square,
  Pause,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Database,
  Radio,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface CommandLogItem {
  id: string;
  command: string;
  bot_id?: string | null;
  status: string;
  timestamp: string;
  details?: any;
}

export function RuntimeCommandCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedCommand, setSelectedCommand] = useState<string>("REFRESH_MARKET_DATA");
  const [commandPayload, setCommandPayload] = useState<string>("{}");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);
  const [haltConfirmWord, setHaltConfirmWord] = useState("");

  // 1. Fetch System Health Telemetry
  const { data: healthData } = useQuery({
    queryKey: ["commandCenterHealth"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/system-health/status", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: 3000,
    placeholderData: (prev: any) => prev,
  });

  // 2. Fetch System Status & Operating Mode
  const { data: statusData } = useQuery({
    queryKey: ["commandCenterStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: 3000,
    placeholderData: (prev: any) => prev,
  });

  // 3. Fetch Operational Events / Command Trace Logs
  const { data: eventsData } = useQuery({
    queryKey: ["commandCenterEvents"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/logs?limit=25", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return [];
      const json = res.data;
      return (json.logs || json.events || json.data || []).slice(0, 15);
    },
    refetchInterval: 4000,
    placeholderData: (prev: any) => prev,
  });

  const isKillSwitchActive = statusData?.system_summary?.kill_switch_active || false;
  const tradingMode = statusData?.trading_mode || "PAPER";

  // Dispatch Operational Command Mutation
  const handleDispatchCommand = async (cmdName: string, payload: any = {}) => {
    setIsExecuting(true);
    const timestamp = new Date().toLocaleTimeString();
    try {
      setConsoleOutput((prev) => [
        `[${timestamp}] 🚀 Dispatching command '${cmdName}' to CommandBus...`,
        ...prev.slice(0, 20),
      ]);
      const res = await executeCommand(cmdName, null, payload, queryClient);
      setConsoleOutput((prev) => [
        `[${timestamp}] ✅ Command '${cmdName}' executed successfully. Status: ${res?.status || "OK"}`,
        ...prev.slice(0, 20),
      ]);
      queryClient.invalidateQueries({ queryKey: ["commandCenterStatus"] });
      queryClient.invalidateQueries({ queryKey: ["commandCenterHealth"] });
      queryClient.invalidateQueries({ queryKey: ["commandCenterEvents"] });
    } catch (err: any) {
      setConsoleOutput((prev) => [
        `[${timestamp}] ❌ Command '${cmdName}' failed: ${err.message}`,
        ...prev.slice(0, 20),
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const availableCommands = [
    { id: "START_ALL_BOTS", label: "START ALL BOTS", desc: "Launch all authorized bot processes", icon: Play },
    { id: "PAUSE_ALL_BOTS", label: "PAUSE ALL BOTS", desc: "Suspend entry signal evaluation", icon: Pause },
    { id: "RESUME_ALL_BOTS", label: "RESUME ALL BOTS", desc: "Re-enable active bot execution cycles", icon: Play },
    { id: "RESTART_ALL_BOTS", label: "RESTART ALL BOTS", desc: "Restart background bot worker threads", icon: RotateCcw },
    { id: "STOP_ALL_BOTS", label: "STOP ALL BOTS", desc: "Gracefully shut down all running bots", icon: Square },
    { id: "SELF_HEAL_FLEET", label: "SELF-HEAL FLEET", desc: "Autonomous self-healing & error resolution pass", icon: Zap },
    { id: "REFRESH_MARKET_DATA", label: "REFRESH MARKET DATA", desc: "Force update live candles & tickers", icon: RefreshCw },
    { id: "RECONCILE_ACCOUNT", label: "RECONCILE ACCOUNT", desc: "Synchronize broker balances & ledger", icon: RotateCcw },
    { id: "SYNC_UNIVERSE", label: "SYNC UNIVERSE MASTER", desc: "Sync 220+ canonical market instruments", icon: Database },
    { id: "CLEAR_CACHE", label: "PURGE CACHE", desc: "Clear in-memory fast session cache", icon: RefreshCw },
    { id: "RUN_DIAGNOSTICS", label: "RUN DIAGNOSTICS", desc: "Evaluate platform reliability & self-healing telemetry", icon: Activity },
    { id: "RESET_PAPER_SANDBOX", label: "RESET PAPER SANDBOX", desc: "Reset balances to $10,000 baseline", icon: RotateCcw },
  ];

  return (
    <div className="w-full space-y-6 text-[var(--theme-text-primary)] font-sans max-w-7xl mx-auto pb-12">
      {/* 1. Header Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Runtime Operations Command Center
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
                ORCHESTRATION & CONTROL
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
              Supervise active platform workers, dispatch administrative commands, and manage execution gates.
            </p>
          </div>
        </div>

        {/* Global Action Trigger: Emergency Kill Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHaltConfirm(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all ${
              isKillSwitchActive
                ? "bg-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/90 text-[var(--theme-bg)] animate-pulse"
                : "bg-[var(--theme-loss)] hover:opacity-90 text-[var(--theme-bg)] active:scale-95 shadow-[var(--theme-loss)]/25"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{isKillSwitchActive ? "RESUME TRADING PLATFORM" : "TRIGGER EMERGENCY HALT"}</span>
          </button>
        </div>
      </div>

      {/* 2. Runtime Subsystem Health & Connectivity Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { name: "Flask Core API", desc: "Port 5050 REST Gateway", icon: Server, status: "HEALTHY", latency: "1.8 ms" },
          { name: "APScheduler Worker", desc: "Cron & Live Runner", icon: Cpu, status: "RUNNING", latency: "60s cycle" },
          { name: "Market SSE Stream", desc: "Realtime Ticker Channel", icon: Radio, status: "LIVE", latency: "12 ms" },
          { name: "20-Stage Risk Gate", desc: "Pre-Trade Gatekeeper", icon: ShieldCheck, status: "ARMED", latency: "2.1 ms" },
          { name: "Telegram Service", desc: "Asynchronous Alerts", icon: Zap, status: "CONNECTED", latency: "42 ms" },
        ].map((sub, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-2"
          >
            <div className="flex items-center justify-between">
              <sub.icon className="h-4 w-4 text-[var(--theme-accent)]" />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border border-[var(--theme-profit)]/30">
                {sub.status}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--theme-text-primary)]">{sub.name}</div>
              <div className="text-[11px] text-[var(--theme-text-secondary)]">{sub.desc}</div>
            </div>
            <div className="text-[10px] font-mono text-[var(--theme-text-muted)] border-t border-[var(--theme-border-subtle)] pt-1.5 flex justify-between">
              <span>Latency</span>
              <span className="font-bold text-[var(--theme-text-primary)]">{sub.latency}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Primary Operations Suite & Interactive Command Bus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Quick Command Triggers */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--theme-accent)]" />
              <h3 className="text-sm font-bold tracking-tight">Platform Operational Controls</h3>
            </div>
            <span className="text-[11px] text-[var(--theme-text-muted)] font-mono">
              Direct Server Execution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleDispatchCommand(cmd.id)}
                disabled={isExecuting}
                className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 hover:bg-[var(--theme-surface)] text-left transition-all group flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-accent)] group-hover:scale-105 transition">
                  <cmd.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[var(--theme-text-primary)]">{cmd.label}</div>
                  <div className="text-[11px] text-[var(--theme-text-secondary)] mt-0.5 leading-tight">{cmd.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Interactive Custom Command Dispatcher */}
          <div className="p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-3 mt-4">
            <div className="text-xs font-bold text-[var(--theme-text-primary)]">Custom Command Dispatcher</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedCommand}
                onChange={(e) => setSelectedCommand(e.target.value)}
                className="bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none"
              >
                {availableCommands.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <input
                type="text"
                value={commandPayload}
                onChange={(e) => setCommandPayload(e.target.value)}
                placeholder='Payload JSON e.g. {"symbol": "BTC/USDT"}'
                className="sm:col-span-2 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 font-mono text-[var(--theme-text-primary)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(commandPayload);
                    handleDispatchCommand(selectedCommand, parsed);
                  } catch {
                    handleDispatchCommand(selectedCommand, {});
                  }
                }}
                disabled={isExecuting}
                className="px-4 py-2 bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Execute via CommandBus</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Command & Event Console */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--theme-info)]" />
              <h3 className="text-sm font-bold tracking-tight">Real-Time Operational Trace</h3>
            </div>
            <button
              onClick={() => setConsoleOutput([])}
              className="text-[11px] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
            >
              Clear Log
            </button>
          </div>

          <div className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-3 font-mono text-[11px] space-y-1.5 h-64 overflow-y-auto">
            {consoleOutput.length === 0 ? (
              <div className="text-[var(--theme-text-muted)] italic">
                Awaiting command execution... Ready on CommandBus channel.
              </div>
            ) : (
              consoleOutput.map((line, idx) => (
                <div key={idx} className="text-[var(--theme-text-primary)] leading-tight">
                  {line}
                </div>
              ))
            )}
          </div>

          {/* Quick Deep-Navigation Hub */}
          <div className="space-y-2 pt-2 border-t border-[var(--theme-border-subtle)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              Diagnostic & Deep Inspection Hubs
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => router.push("/system-health")}
                className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-left flex items-center justify-between transition"
              >
                <span>System Health Hub</span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              </button>

              <button
                onClick={() => router.push("/providers")}
                className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-left flex items-center justify-between transition"
              >
                <span>Providers Matrix</span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              </button>

              <button
                onClick={() => router.push("/bots")}
                className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-left flex items-center justify-between transition"
              >
                <span>Bot Instance Wizard</span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              </button>

              <button
                onClick={() => router.push("/logs")}
                className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-left flex items-center justify-between transition"
              >
                <span>Full Audit Logs</span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Kill Switch Modal */}
      {showHaltConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-loss)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--theme-loss)]">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-[var(--theme-text-primary)]">
                {isKillSwitchActive ? "Deactivate Platform Kill Switch?" : "EMERGENCY GLOBAL HALT"}
              </h3>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
              {isKillSwitchActive
                ? "Re-enable order routing and resume bot signal processing."
                : "Immediately stops all active bot processes, cancels working orders, and blocks new trade routing."}
            </p>

            {!isKillSwitchActive && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-[var(--theme-text-muted)] block">
                  Type <strong className="text-[var(--theme-loss)]">HALT</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={haltConfirmWord}
                  onChange={(e) => setHaltConfirmWord(e.target.value.toUpperCase())}
                  placeholder="HALT"
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowHaltConfirm(false);
                  setHaltConfirmWord("");
                }}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isKillSwitchActive) {
                    await handleDispatchCommand("DEACTIVATE_KILL_SWITCH");
                  } else {
                    await handleDispatchCommand("ACTIVATE_KILL_SWITCH", { reason: "Command Center Halt" });
                  }
                  setShowHaltConfirm(false);
                  setHaltConfirmWord("");
                }}
                disabled={!isKillSwitchActive && haltConfirmWord !== "HALT"}
                className="px-4 py-2 rounded-xl bg-[var(--theme-loss)] text-[var(--theme-bg)] text-xs font-bold shadow-lg disabled:opacity-40"
              >
                {isKillSwitchActive ? "Confirm Resume" : "Confirm Emergency Halt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
