"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { MultiLegStrategyBuilder } from "@/components/options/MultiLegStrategyBuilder";
import { OptionSource } from "@/types/option-chain";
import { Code, ShieldCheck, Zap, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function OptionStrategiesPage() {
  const [selectedProvider, setSelectedProvider] = useState<OptionSource>("DHAN");
  const [executionBroker, setExecutionBroker] = useState<string>("DHAN");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [environment, setEnvironment] = useState<"PAPER" | "LIVE">("PAPER");
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  const spotPrice = underlying === "BTC" ? 78500.0 : 22500.0;
  const atmStrike = underlying === "BTC" ? 78500.0 : 22500.0;
  const currencySymbol = underlying === "BTC" ? "$" : "₹";

  return (
    <DirectPageLayout activeTab="options">
      <div className="p-4 md:p-6 space-y-6 max-w-[1700px] mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-[#0B132B]/90 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                  OPTION STRATEGIES & MULTI-LEG STUDIO
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  🛡️ PAPER SIMULATION (SAFE)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Construct, analyze risk payoffs, calculate Greeks, and safely paper execute multi-leg option strategies.
              </p>
            </div>
          </div>

          {/* Provider Lock Indicator */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-2.5 px-3 rounded-xl bg-[#141E33] border border-slate-700 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Data Source:</span>
              <span className="text-cyan-300 font-bold">{selectedProvider}</span>
            </div>
            <div className="p-2.5 px-3 rounded-xl bg-[#141E33] border border-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Execution:</span>
              <span className="text-emerald-300 font-bold">{executionBroker} (PAPER)</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border font-mono text-xs flex items-center justify-between shadow-lg ${
              feedback.status === "success"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/80 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Strategy Builder Component */}
        <MultiLegStrategyBuilder
          spotPrice={spotPrice}
          atmStrike={atmStrike}
          selectedExpiry="CURRENT"
          currency={currencySymbol}
          onExecuteStrategy={(payoff) => {
            setFeedback({
              status: "success",
              message: `Multi-Leg Strategy Intent Received (${environment}): ${payoff.strategy_name} on ${underlying} with ${payoff.legs.length} legs routed to Risk Engine.`,
            });
          }}
        />
      </div>
    </DirectPageLayout>
  );
}
