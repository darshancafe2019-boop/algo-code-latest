"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BotWizardDraft, formatPositionBotName } from "./types";
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
  onSuccess?: (botId: string) => void;
}

export default function Step7ReviewDeploy({ draft, updateDraft, onPrev, onSuccess }: Step7Props) {
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
      const finalBotName = draft.bot_name && draft.bot_name.includes("[") && draft.bot_name.includes("]")
        ? draft.bot_name
        : formatPositionBotName(draft.contract?.symbol || draft.underlying, draft.option_strategy?.strategy_name);

      const isIndiaDeploy = (draft.market_type || "").includes("INDIA") ||
        /NIFTY|BANKNIFTY|FINNIFTY|SENSEX|RELIANCE/.test((draft.contract?.symbol || draft.underlying || draft.bot_name || "").toUpperCase()) ||
        /UPSTOX|DHAN|ZERODHA|NSE|BSE/.test((draft.broker || "").toUpperCase());

      const deployPayload = {
        ...draft,
        bot_name: finalBotName,
        execution_mode: mode,
        currency: isIndiaDeploy ? "INR" : "USD",
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
        if (onSuccess) {
          onSuccess(res.bot_id);
        } else {
          router.push(`/bots/${res.bot_id}`);
        }
      } else {
        if (onSuccess) {
          onSuccess("");
        } else {
          router.push("/bots");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  };

  const contract = draft.contract;
  const optStrat = draft.option_strategy;
  const isIndia = (draft.market_type || "").includes("INDIA") ||
    /NIFTY|BANKNIFTY|FINNIFTY|SENSEX|RELIANCE/.test((draft.contract?.symbol || draft.underlying || draft.bot_name || "").toUpperCase()) ||
    /UPSTOX|DHAN|ZERODHA|NSE|BSE/.test((draft.broker || "").toUpperCase());
  const currencySymbol = isIndia ? "₹" : "$";

  const isReady = validationResult ? (validationResult.ready ?? validationResult.valid ?? false) : false;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                Step 7 — Review, Validation & Deployment
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                FINAL AUDIT GATE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              Deterministic verification of live feeds, canonical contract identity, mathematical rules, and broker connection.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleValidate}
          disabled={validating}
          className="text-xs sm:text-sm font-mono font-bold px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-blue-600/10 text-cyan-300 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Activity className={`h-4 w-4 ${validating ? "animate-spin" : ""}`} />
          Run Validation Cross-Check
        </button>
      </div>

      {errorMsg && (
        <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/40 text-xs sm:text-sm font-mono text-rose-300 flex flex-col gap-3.5 leading-relaxed shadow-lg">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-rose-200 block text-xs sm:text-sm">Activation Warning:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleDeploy("PAPER", true)}
                disabled={deploying}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="h-4 w-4" />
                Activate Paper Mode
              </button>
              <button
                type="button"
                onClick={() => handleDeploy("LIVE", true, true)}
                disabled={deploying}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <AlertTriangle className="h-4 w-4" />
                Force Live Anyway
              </button>
            </div>
          </div>

          {detectedIp && (
            <div className="pt-2.5 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2.5 bg-rose-900/20 px-3.5 py-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-xs font-bold">Detected IP Address:</span>
                <code className="text-amber-300 bg-black/60 px-2.5 py-1 rounded-md text-xs font-mono font-bold select-all">
                  {detectedIp}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyIp(detectedIp)}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedIp ? "Copied" : "Copy IP"}
                </button>
                <a
                  href="https://india.delta.exchange/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Delta API Whitelist Settings
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Deployment Validation Panel */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            Pre-Deployment Validation Status:
          </h4>
          {validationResult && (
            <span
              className={`text-xs sm:text-sm font-mono font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${
                isReady
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
            >
              {isReady ? "SYSTEM READY TO DEPLOY" : "CRITICAL VALIDATION BLOCKED"}
            </span>
          )}
        </div>

        {validating ? (
          <div className="py-10 text-center text-xs sm:text-sm font-mono text-slate-300 flex items-center justify-center gap-2.5">
            <Activity className="h-5 w-5 animate-spin text-cyan-400" />
            Running cross-system validation checks...
          </div>
        ) : validationResult?.checks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {validationResult.checks.map((chk: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#070D1A] border border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-mono shadow-inner"
              >
                <span className="text-slate-200 font-bold">{chk.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black ${
                      chk.status === "PASS"
                        ? "text-emerald-400"
                        : chk.status === "FAIL"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {chk.status}
                  </span>
                  {chk.status === "PASS" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : chk.status === "FAIL" ? (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Target Execution Environment Selector */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1426]/90 p-5 shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-mono font-bold uppercase text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Execution Mode for this Bot:
          </span>
          <p className="text-xs font-mono text-slate-300 mt-1">
            Current mode: <strong className={draft.execution_mode === "LIVE" ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{draft.execution_mode}</strong>. Switch mode below or use the activation buttons directly.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              updateDraft({ execution_mode: "PAPER" });
              setErrorMsg(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
              draft.execution_mode === "PAPER"
                ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            PAPER TRADING
          </button>
          <button
            type="button"
            onClick={() => {
              updateDraft({ execution_mode: "LIVE" });
              setErrorMsg(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
              draft.execution_mode === "LIVE"
                ? "bg-rose-950/50 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            LIVE TRADING
          </button>
        </div>
      </div>

      {/* Comprehensive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Step 1 & 2: Identity & Canonical Contract */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase text-cyan-400 border-b border-slate-800/80 pb-3">
            <Radio className="h-4 w-4" /> Market & Contract
          </div>
          <div className="space-y-2.5 text-xs sm:text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Bot Name:</span>
              <span className="text-white font-bold truncate max-w-[170px]">{draft.bot_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Market:</span>
              <span className="text-slate-200 font-medium">{draft.market_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Broker:</span>
              <span className="text-cyan-300 font-bold">{draft.broker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Underlying:</span>
              <span className="text-emerald-400 font-bold">{draft.underlying}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Contract:</span>
              <span className="text-emerald-400 font-bold truncate max-w-[160px]">{contract?.symbol || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Live LTP:</span>
              <span className="text-emerald-400 font-black">
                {currencySymbol}
                {contract?.premium != null && !isNaN(Number(contract.premium)) ? Number(contract.premium).toFixed(2) : "0.00"}
              </span>
            </div>
            {contract?.expiry && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Expiry:</span>
                <span className="text-slate-200 font-medium">
                  {typeof contract.expiry === "string" ? contract.expiry : String(contract.expiry)}
                </span>
              </div>
            )}
            {contract?.strike && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Strike / Type:</span>
                <span className="text-slate-200 font-medium">
                  {contract.strike} {contract.option_type}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3, 4, 5: Strategy & Indicators */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase text-indigo-400 border-b border-slate-800/80 pb-3">
            <Cpu className="h-4 w-4" /> Strategy & Rule Pipeline
          </div>
          <div className="space-y-2.5 text-xs sm:text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Model:</span>
              <span className="text-white font-bold truncate max-w-[170px]">
                {draft.trading_strategy?.strategy_name || "Direct Trigger"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Timeframe:</span>
              <span className="text-slate-200 font-medium">{draft.timeframe}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Option Structure:</span>
              <span className="text-cyan-300 font-bold">
                {optStrat ? optStrat.strategy_name : "Direct Spot/Future"}
              </span>
            </div>
            {optStrat && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Max Profit / Loss:</span>
                <span className="text-slate-200 font-bold">
                  {optStrat.max_profit} / {optStrat.max_loss}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 text-xs block mb-1.5 font-bold">Active Indicators ({draft.indicators.length}):</span>
              {draft.indicators.length > 0 ? (
                draft.indicators.map((ind) => (
                  <div key={ind.id} className="text-xs sm:text-sm text-slate-200 py-0.5">
                    • {ind.indicator_name} ({ind.timeframe}) {ind.operator} {ind.target_value}
                  </div>
                ))
              ) : (
                <span className="text-slate-500 text-xs sm:text-sm">No indicator filters</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 6: Risk Management */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase text-rose-400 border-b border-slate-800/80 pb-3">
            <Lock className="h-4 w-4" /> Risk & Safety Guardrails
          </div>
          <div className="space-y-2.5 text-xs sm:text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Capital Allocated:</span>
              <span className="text-emerald-400 font-black">
                {currencySymbol}
                {draft.capital_allocation.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Trading Style:</span>
              <span className="text-slate-200 font-bold">{draft.risk.trading_style}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Stop Loss:</span>
              <span className="text-rose-400 font-bold">
                {draft.risk.stop_loss_value} ({draft.risk.stop_loss_mode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Take Profit:</span>
              <span className="text-emerald-400 font-bold">
                {draft.risk.take_profit_value} ({draft.risk.take_profit_mode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Trailing Stop:</span>
              <span className="text-slate-200 font-bold">{draft.risk.trailing_stop_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Max Daily Loss:</span>
              <span className="text-white font-black">
                {currencySymbol}
                {draft.risk.max_daily_loss}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Max Trades/Day:</span>
              <span className="text-slate-200 font-bold">{draft.risk.max_trades_per_day}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Activation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 px-6 py-3 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          ← Return to Step 6
        </button>

        <div className="flex flex-wrap items-center gap-3.5">
          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleDeploy(draft.execution_mode, false)}
            disabled={deploying}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <Save className="h-4 w-4" /> Save Configuration
          </button>

          {/* Activate Paper Bot */}
          <button
            type="button"
            onClick={() => handleDeploy("PAPER", true)}
            disabled={deploying}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-7 py-3 text-xs sm:text-sm font-mono font-black text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
          >
            <Zap className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
            ACTIVATE PAPER BOT (SAFE)
          </button>

          {/* Activate Live Bot */}
          <button
            type="button"
            onClick={() => handleDeploy("LIVE", true)}
            disabled={deploying}
            className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-7 py-3 text-xs sm:text-sm font-mono font-black text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
          >
            <AlertTriangle className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
            ACTIVATE LIVE BOT
          </button>
        </div>
      </div>
    </div>
  );
}
