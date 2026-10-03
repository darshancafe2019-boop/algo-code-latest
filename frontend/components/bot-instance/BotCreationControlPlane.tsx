"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building,
  Layers,
  Activity,
  Zap,
  Compass,
  ShieldCheck,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Radio,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import {
  Step1IdentityCapital,
  validateStep1,
  resolveActiveBrokerAccount,
} from "./steps/Step1IdentityCapital";
import { Step2MarketInstrument } from "./steps/Step2MarketInstrument";
import { Step3IndicatorsRuleBuilder } from "./steps/Step3IndicatorsRuleBuilder";
import { Step4OptionChainStrategyBuilder } from "./steps/Step4OptionChainStrategyBuilder";
import { Step5StrategyCatalogLibrary } from "./steps/Step5StrategyCatalogLibrary";
import { Step6RiskManagementEngine } from "./steps/Step6RiskManagementEngine";
import { Step7ReviewDeployValidation } from "./steps/Step7ReviewDeployValidation";

export type ModularStepKey = "step3Indicators" | "step4OptionChain" | "step5StrategyLibrary";

export const SEVEN_WIZARD_STEPS: Array<{
  id: number;
  key: string;
  title: string;
  desc: string;
  icon: any;
  isToggleable?: boolean;
  moduleKey?: ModularStepKey;
}> = [
  { id: 1, key: "STEP_1", title: "Identity & Capital", desc: "Naming, broker, market & capital", icon: Building },
  { id: 2, key: "STEP_2", title: "Market & Instrument", desc: "Contract setup & strike resolution", icon: Layers },
  { id: 3, key: "STEP_3", title: "20 Indicators & Rules", desc: "Mathematical indicator logic AST", icon: Activity, isToggleable: true, moduleKey: "step3Indicators" },
  { id: 4, key: "STEP_4", title: "Option Chain & 21 Strats", desc: "Live chain & multi-leg builder", icon: Zap, isToggleable: true, moduleKey: "step4OptionChain" },
  { id: 5, key: "STEP_5", title: "30 Strategy Library", desc: "5-category institutional library", icon: Compass, isToggleable: true, moduleKey: "step5StrategyLibrary" },
  { id: 6, key: "STEP_6", title: "Risk Management", desc: "4-tier limits & kill-switch guards", icon: ShieldCheck },
  { id: 7, key: "STEP_7", title: "Review & Deployment", desc: "18-point audit & activation", icon: FileCheck },
];

export interface BotCreationControlPlaneProps {
  isModal?: boolean;
  onClose?: () => void;
  botId?: string;
  isEditMode?: boolean;
}

export function BotCreationControlPlane({
  isModal = false,
  onClose,
  botId: propBotId,
  isEditMode = false,
}: BotCreationControlPlaneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeIntent, loadStoredIntent } = useBotCreationIntentStore();

  const store = useBotCreationStore();
  const { accounts, providers } = useQuantDataCore();
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    identity,
    capital,
    market,
    instrument,
    provider,
    strategies,
    risk,
    validation,
    saveDraft,
    loadDraft,
    loadIntent,
    isDraftSaved,
    draftSavedAt,
  } = store;

  // Authoritative Step 1 Real Account & Validation Gate
  const activeAccount = useMemo(() => {
    return resolveActiveBrokerAccount(accounts, provider.executionBroker, identity.environment);
  }, [accounts, provider.executionBroker, identity.environment]);

  const step1Validation = useMemo(() => {
    return validateStep1({
      identity,
      market,
      provider,
      capital,
      activeAccount,
      providers,
    });
  }, [identity, market, provider, capital, activeAccount, providers]);

  const step2Validation = useMemo(() => {
    const isOptions = market.marketType === "OPTIONS" || market.marketType === "CRYPTO_OPTIONS";
    const errors: string[] = [];
    if (!market.underlying) errors.push("Underlying instrument is required.");
    if (!market.lotSize || market.lotSize <= 0) errors.push("Lot size must be greater than zero.");
    if (isOptions && !instrument.contractExpiry) errors.push("Contract expiry date is required for options.");
    return {
      valid: errors.length === 0,
      errors,
    };
  }, [market.underlying, market.lotSize, market.marketType, instrument.contractExpiry]);

  const handleStepClick = (targetStepId: number) => {
    if (currentStep === 1 && targetStepId > 1 && !step1Validation.valid) {
      return;
    }
    if (currentStep === 2 && targetStepId > 2 && !step2Validation.valid) {
      return;
    }
    setStep(targetStepId);
  };

  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentSuccessMessage, setDeploymentSuccessMessage] = useState<string | null>(null);

  // Ingest Query Parameters or Intent on Mount
  useEffect(() => {
    const stored = activeIntent || loadStoredIntent();
    const querySymbol = searchParams?.get("symbol");
    const queryStrategyId = searchParams?.get("strategyId");

    if (querySymbol || queryStrategyId || stored) {
      if (stored) {
        loadIntent(stored);
      } else if (querySymbol || queryStrategyId) {
        loadIntent({
          symbol: querySymbol || "NIFTY",
          strategyTemplateId: queryStrategyId || undefined,
          side: (searchParams?.get("side") as any) || "BUY",
          underlying: searchParams?.get("underlying") || undefined,
          strike: searchParams?.get("strike") ? Number(searchParams?.get("strike")) : undefined,
          expiry: searchParams?.get("expiry") || undefined,
          optionType: (searchParams?.get("optionType") as any) || undefined,
          assetClass: (searchParams?.get("assetClass") as any) || undefined,
          currentPrice: searchParams?.get("ltp") ? Number(searchParams?.get("ltp")) : undefined,
          bid: searchParams?.get("bid") ? Number(searchParams?.get("bid")) : undefined,
          ask: searchParams?.get("ask") ? Number(searchParams?.get("ask")) : undefined,
          lotSize: searchParams?.get("lotSize") ? Number(searchParams?.get("lotSize")) : undefined,
          iv: searchParams?.get("iv") ? Number(searchParams?.get("iv")) : undefined,
          oi: searchParams?.get("oi") ? Number(searchParams?.get("oi")) : undefined,
          canonicalContractId: searchParams?.get("canonicalContractId") || searchParams?.get("canonicalSymbol") || undefined,
          marketDataSource: searchParams?.get("marketDataSource") || undefined,
          broker: searchParams?.get("broker") || undefined,
          origin: (searchParams?.get("origin") as any) || "MANUAL",
          timestamp: Date.now(),
        });
      }
    } else {
      loadDraft();
    }
  }, [searchParams]);

  // Final Deployment Handler (Paper / Shadow / Live)
  const handleDeploy = async (targetMode: "PAPER" | "SHADOW" | "LIVE") => {
    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentSuccessMessage(null);

    const safeCapital = Number(capital.allocatedCapital) > 0 ? Number(capital.allocatedCapital) : 10000;
    const safeMaxDailyLoss = Math.min(
      Number(risk.maxDailyLoss) > 0 ? Number(risk.maxDailyLoss) : Math.round(safeCapital * 0.05),
      Math.max(10, Math.round(safeCapital * 0.5))
    );

    const canonicalPayload = {
      bot_id: identity.botId || `bot_${Date.now()}`,
      name: (identity.name && identity.name.trim()) || `${market.underlying || market.symbol || "Algo"} Bot`,
      description: identity.description || "",
      environment: targetMode,
      market: market.marketType || "CRYPTO_SPOT",
      exchange: market.exchange || "BINANCE",
      symbol: market.symbol || market.underlying || "BTC/USDT",
      underlying: market.underlying || market.symbol || "BTC",
      broker: provider.executionBroker || "PAPER",
      market_data_provider: provider.marketDataProvider || "BINANCE",
      allocated_capital: safeCapital,
      sizing_mode: capital.sizingMode || "FIXED",
      strategy_id: strategies.primaryStrategyId || "EMA_SUPERTREND_CONFLUENCE",
      timeframe: strategies.primaryTimeframe || "5m",
      stop_loss_pct: Number(risk.stopLossPct) > 0 ? Number(risk.stopLossPct) : 1.5,
      take_profit_pct: Number(risk.takeProfitPct) > 0 ? Number(risk.takeProfitPct) : 3.0,
      risk_per_trade_pct: Number(risk.riskPerTradePct) > 0 ? Number(risk.riskPerTradePct) : 1.0,
      max_daily_loss: safeMaxDailyLoss,
      max_open_positions: Number(risk.maxOpenPositions) > 0 ? Number(risk.maxOpenPositions) : 1,
      lot_size: Number(market.lotSize) > 0 ? Number(market.lotSize) : 1,
      strike: instrument.contractStrike,
      expiry: instrument.contractExpiry,
      option_type: instrument.contractOptionType,
      side: instrument.entrySide || "BUY",
    };

    try {
      const res: any = await apiClient.post("/api/bots/create", canonicalPayload);
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to deploy bot instance to backend engine");
      }

      setDeploymentSuccessMessage(
        `Bot "${identity.name}" successfully created in ${targetMode} mode (ID: ${identity.botId}).`
      );

      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });

      setTimeout(() => {
        if (isModal && onClose) {
          onClose();
        } else {
          router.push("/bots");
        }
      }, 1500);
    } catch (err: any) {
      setDeploymentError(err.message || "An unexpected error occurred during bot deployment.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="w-full bg-[#05101A] text-slate-100 min-h-[calc(100vh-64px)] flex flex-col justify-between">
      <div className="max-w-[1680px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Modal Close Header if in modal mode */}
        {isModal && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-slate-100">Quantum Bot Creation Control Plane</span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* 1. TOP 7-STEP PROGRESS NAVIGATION BAR */}
        <div className="p-2 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {SEVEN_WIZARD_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              const isToggleable = step.isToggleable;
              const isModuleEnabled = isToggleable && step.moduleKey ? (store.modulesEnabled?.[step.moduleKey] ?? true) : true;

              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between relative group cursor-pointer select-none ${
                    isActive
                      ? "bg-cyan-950/70 border-cyan-500/80 text-cyan-200 shadow-md ring-1 ring-cyan-500/50"
                      : isPast
                      ? "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
                      : "bg-slate-950/20 border-slate-900 text-slate-500 hover:text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isActive
                          ? "bg-cyan-500 text-slate-950"
                          : isPast
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      Step 0{step.id}
                    </span>

                    {isToggleable && step.moduleKey ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          store.toggleModule(step.moduleKey!);
                        }}
                        title={`Toggle Step 0${step.id} (${step.title}) ON / OFF`}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all shadow-sm cursor-pointer ${
                          isModuleEnabled
                            ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isModuleEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                          }`}
                        />
                        <span>{isModuleEnabled ? "ON" : "OFF"}</span>
                      </button>
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? "text-cyan-400" : isPast ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                    )}
                  </div>

                  <div className="mt-1.5">
                    <span className={`text-xs font-bold block truncate ${isToggleable && !isModuleEnabled ? "text-slate-400 line-through opacity-80" : "text-slate-100"}`}>
                      {step.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {isToggleable && !isModuleEnabled ? "Module Disabled (OFF)" : step.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. MAIN ACTIVE STEP WORKSPACE */}
        <div className="w-full space-y-6">

          {currentStep === 1 && <Step1IdentityCapital />}
          {currentStep === 2 && <Step2MarketInstrument />}
          {currentStep === 3 && <Step3IndicatorsRuleBuilder />}
          {currentStep === 4 && <Step4OptionChainStrategyBuilder />}
          {currentStep === 5 && <Step5StrategyCatalogLibrary />}
          {currentStep === 6 && <Step6RiskManagementEngine />}
          {currentStep === 7 && (
            <Step7ReviewDeployValidation
              onDeploy={handleDeploy}
              isDeploying={isDeploying}
              deploymentError={deploymentError}
              deploymentSuccessMessage={deploymentSuccessMessage}
            />
          )}
        </div>
      </div>

      {/* 3. BOTTOM CONTROL & STEP NAVIGATION BAR */}
      <div className="sticky bottom-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg px-4 sm:px-8 py-3.5 mt-8 shadow-2xl">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={prevStep}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              type="button"
              onClick={() => saveDraft()}
              className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Draft</span>
              {isDraftSaved && (
                <span className="text-[10px] text-emerald-400 font-mono ml-1">({draftSavedAt || "Saved"})</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
              Step {currentStep} of 7: <strong className="text-slate-200">{SEVEN_WIZARD_STEPS[currentStep - 1].title}</strong>
            </span>

            {currentStep < 7 ? (
              <div className="flex items-center gap-2">
                {currentStep === 1 && !step1Validation.valid && (
                  <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg hidden md:inline-block">
                    {step1Validation.errors[0] || "Step 1 incomplete"}
                  </span>
                )}
                {currentStep === 2 && !step2Validation.valid && (
                  <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg hidden md:inline-block">
                    {step2Validation.errors[0] || "Step 2 incomplete"}
                  </span>
                )}
                <button
                  type="button"
                  disabled={
                    (currentStep === 1 && !step1Validation.valid) ||
                    (currentStep === 2 && !step2Validation.valid)
                  }
                  onClick={nextStep}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono shadow-md shadow-cyan-900/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isDeploying}
                onClick={() => handleDeploy(identity.environment)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5"
              >
                Deploy Bot <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

