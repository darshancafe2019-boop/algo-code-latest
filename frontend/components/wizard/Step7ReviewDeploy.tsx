"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BotWizardDraft } from "./types";
import { api } from "../../lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Save,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  Cpu,
  Lock,
  Activity,
  Zap,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface Step7Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onPrev: () => void;
}

export default function Step7ReviewDeploy({ draft, updateDraft, onPrev }: Step7Props) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  // Extract IP if present in error message (IPv4 or IPv6)
  const ipMatch = errorMsg?.match(/([0-9a-fA-F:]{7,39}|\b\d{1,3}(?:\.\d{1,3}){3}\b)/);
  const detectedIp = ipMatch ? ipMatch[0] : null;

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  // Automatically run validation on initial render of Step 7
  useEffect(() => {
    handleValidate();
  }, []);

  const handleValidate = async () => {
    setValidating(true);
    setErrorMsg(null);
    try {
      const res = await api.validateWizardBot(draft);
      setValidationResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute pre-deployment validation.");
    } finally {
      setValidating(false);
    }
  };

  const handleDeploy = async (mode: "PAPER" | "LIVE", autoStart: boolean = true, force: boolean = false) => {
    setDeploying(true);
    setErrorMsg(null);
    try {
      const deployPayload = {
        ...draft,
        execution_mode: mode,
        auto_start: autoStart,
        force: force,
      };
      const res = await api.deployWizardBot(deployPayload);
      if (res && res.bot_id) {
        if (autoStart && res.status !== "RUNNING") {
          try {
            await api.startBot(res.bot_id);
          } catch (_) {}
        }
        router.push(`/bots/${res.bot_id}`);
      } else {
        router.push("/bots");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  };

  const contract = draft.contract;
  const optStrat = draft.option_strategy;
  const isIndia = draft.market_type.includes("INDIA");
  const currencySymbol = isIndia ? "₹" : "$";

  const isReady = validationResult ? (validationResult.ready ?? validationResult.valid ?? false) : false;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Step 7 — Review, Validation & Activation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic verification of live feeds, canonical contract persistence, risk limits, and broker pipeline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleValidate}
          disabled={validating}
          className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Activity className={`h-3.5 w-3.5 ${validating ? "animate-spin" : ""}`} />
          Run Validation Cross-Check
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/40 text-xs font-mono text-red-300 flex flex-col gap-3 leading-relaxed shadow-lg">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-red-200 block">Activation Warning:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleDeploy("PAPER", true)}
                disabled={deploying}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-colors shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                Activate in Paper Mode Now
              </button>
              <button
                type="button"
                onClick={() => handleDeploy("LIVE", true, true)}
                disabled={deploying}
                className="px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-mono font-bold text-xs transition-colors shadow flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Force Activate Live Anyway
              </button>
            </div>
          </div>

          {detectedIp && (
            <div className="pt-2 border-t border-red-500/20 flex flex-wrap items-center justify-between gap-2 bg-red-900/20 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Detected IP Address:</span>
                <code className="text-amber-300 bg-black/50 px-2 py-0.5 rounded text-[11px] font-bold select-all">
                  {detectedIp}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyIp(detectedIp)}
                  className="px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedIp ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedIp ? "Copied!" : "Copy IP"}
                </button>
                <a
                  href="https://india.delta.exchange/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-[11px] flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Delta API Whitelist Settings
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Deployment Validation Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            Pre-Deployment Validation Status:
          </h4>
          {validationResult && (
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                isReady
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-red-500/20 text-red-300 border-red-500/40"
              }`}
            >
              {isReady ? "SYSTEM READY TO DEPLOY" : "CRITICAL VALIDATION BLOCKED"}
            </span>
          )}
        </div>

        {validating ? (
          <div className="py-6 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <Activity className="h-4 w-4 animate-spin text-blue-400" />
            Running cross-system validation checks...
          </div>
        ) : validationResult?.checks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {validationResult.checks.map((chk: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-slate-300 font-medium">{chk.name}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      chk.status === "PASS"
                        ? "text-emerald-400"
                        : chk.status === "FAIL"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  >
                    {chk.status}
                  </span>
                  {chk.status === "PASS" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : chk.status === "FAIL" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Target Execution Environment Selector */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-400" />
            Execution Mode for this Bot:
          </span>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Current mode: <strong className={draft.execution_mode === "LIVE" ? "text-red-400" : "text-emerald-400"}>{draft.execution_mode}</strong>. Switch mode below or use the activation buttons directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              updateDraft({ execution_mode: "PAPER" });
              setErrorMsg(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              draft.execution_mode === "PAPER"
                ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            PAPER TRADING
          </button>
          <button
            type="button"
            onClick={() => {
              updateDraft({ execution_mode: "LIVE" });
              setErrorMsg(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              draft.execution_mode === "LIVE"
                ? "bg-red-950/50 border-red-500/60 text-red-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            LIVE TRADING
          </button>
        </div>
      </div>

      {/* Comprehensive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Step 1 & 2: Identity & Canonical Contract */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-blue-400 border-b border-slate-800 pb-2">
            <Radio className="h-4 w-4" /> Market & Canonical Contract
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Bot Name:</span>
              <span className="text-white font-bold">{draft.bot_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Market:</span>
              <span className="text-slate-300">{draft.market_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Broker:</span>
              <span className="text-blue-300">{draft.broker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Underlying:</span>
              <span className="text-emerald-400 font-bold">{draft.underlying}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contract Symbol:</span>
              <span className="text-emerald-400 font-bold">{contract?.symbol || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Live LTP:</span>
              <span className="text-emerald-400 font-bold">
                {currencySymbol}
                {contract?.premium?.toFixed(2) || "0.00"}
              </span>
            </div>
            {contract?.expiry && (
              <div className="flex justify-between">
                <span className="text-slate-500">Expiry:</span>
                <span className="text-slate-300">
                  {typeof contract.expiry === "string" ? contract.expiry : String(contract.expiry)}
                </span>
              </div>
            )}
            {contract?.strike && (
              <div className="flex justify-between">
                <span className="text-slate-500">Strike / Type:</span>
                <span className="text-slate-300">
                  {contract.strike} {contract.option_type}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3, 4, 5: Strategy & Indicators */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-purple-400 border-b border-slate-800 pb-2">
            <Cpu className="h-4 w-4" /> Strategy & Rule Pipeline
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span className="text-white font-bold">
                {draft.trading_strategy?.strategy_name || "Direct Trigger"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Timeframe:</span>
              <span className="text-slate-300">{draft.timeframe}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Option Structure:</span>
              <span className="text-blue-300">
                {optStrat ? optStrat.strategy_name : "Direct Spot/Future"}
              </span>
            </div>
            {optStrat && (
              <div className="flex justify-between">
                <span className="text-slate-500">Max Profit / Loss:</span>
                <span className="text-slate-300">
                  {optStrat.max_profit} / {optStrat.max_loss}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-500 text-[10px] block mb-1">Active Indicators ({draft.indicators.length}):</span>
              {draft.indicators.length > 0 ? (
                draft.indicators.map((ind) => (
                  <div key={ind.id} className="text-[11px] text-slate-300">
                    • {ind.indicator_name} ({ind.timeframe}) {ind.operator} {ind.target_value}
                  </div>
                ))
              ) : (
                <span className="text-slate-600 text-[11px]">No indicator filters</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 6: Risk Management */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-red-400 border-b border-slate-800 pb-2">
            <Lock className="h-4 w-4" /> Risk & Safety Guardrails
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Capital Allocated:</span>
              <span className="text-emerald-400 font-bold">
                {currencySymbol}
                {draft.capital_allocation.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trading Style:</span>
              <span className="text-slate-300">{draft.risk.trading_style}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stop Loss:</span>
              <span className="text-red-400 font-bold">
                {draft.risk.stop_loss_value} ({draft.risk.stop_loss_mode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Take Profit:</span>
              <span className="text-emerald-400 font-bold">
                {draft.risk.take_profit_value} ({draft.risk.take_profit_mode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trailing Stop:</span>
              <span className="text-slate-300">{draft.risk.trailing_stop_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Max Daily Loss:</span>
              <span className="text-white font-bold">
                {currencySymbol}
                {draft.risk.max_daily_loss}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Max Trades/Day:</span>
              <span className="text-slate-300">{draft.risk.max_trades_per_day}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Activation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          ← Back: Step 6
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleDeploy(draft.execution_mode, false)}
            disabled={deploying}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-mono font-bold text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" /> Save Bot Config
          </button>

          {/* Activate Paper Bot */}
          <button
            type="button"
            onClick={() => handleDeploy("PAPER", true)}
            disabled={deploying}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg hover:bg-emerald-500 focus:outline-none transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
            ACTIVATE PAPER BOT (SAFE)
          </button>

          {/* Activate Live Bot */}
          <button
            type="button"
            onClick={() => handleDeploy("LIVE", true)}
            disabled={deploying}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 focus:outline-none transition-all flex items-center gap-2 cursor-pointer"
          >
            <AlertTriangle className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
            ACTIVATE LIVE BOT
          </button>
        </div>
      </div>
    </div>
  );
}
