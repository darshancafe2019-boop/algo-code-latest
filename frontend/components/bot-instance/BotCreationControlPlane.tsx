"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Layers,
  Sliders,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Radio,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { BotWizardDraft } from "@/components/wizard/types";
import Step1Identity from "@/components/wizard/Step1Identity";
import Step2LiveMarket from "@/components/wizard/Step2LiveMarket";
import Step3Indicators from "@/components/wizard/Step3Indicators";
import Step4OptionStrategies from "@/components/wizard/Step4OptionStrategies";
import Step5TradingStrategy from "@/components/wizard/Step5TradingStrategy";
import Step6RiskManagement from "@/components/wizard/Step6RiskManagement";
import Step7ReviewDeploy from "@/components/wizard/Step7ReviewDeploy";

const STEPS = [
  { id: 1, title: "Identity & Capital", icon: Shield },
  { id: 2, title: "Live Market & Contract", icon: Radio },
  { id: 3, title: "Indicators", icon: Sliders },
  { id: 4, title: "Option Strategy", icon: Layers },
  { id: 5, title: "Trading Strategy", icon: Cpu },
  { id: 6, title: "Risk Management", icon: ShieldAlert },
  { id: 7, title: "Review & Deploy", icon: ShieldCheck },
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
  botId,
  isEditMode = false,
}: BotCreationControlPlaneProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Canonical Draft State connecting all 7 steps with guaranteed contract continuity
  const [draft, setDraft] = useState<BotWizardDraft>({
    bot_name: "BTC Delta Alpha Sniper",
    market_type: "CRYPTO_OPTION",
    underlying: "BTC",
    timeframe: "5m",
    broker: "DELTA",
    execution_mode: "PAPER",
    capital_allocation: 1000.0,
    available_funds: "UNAVAILABLE",

    contract: null,
    indicators: [],
    option_strategy: null,
    trading_strategy: null,

    risk: {
      stop_loss_mode: "PERCENTAGE",
      stop_loss_value: 2.0,
      take_profit_mode: "PERCENTAGE",
      take_profit_value: 5.0,
      trailing_stop_mode: "OFF",
      trailing_stop_value: 1.0,
      max_daily_loss: 500.0,
      max_drawdown_pct: 10.0,
      risk_per_trade: 100.0,
      max_position_size: 2.0,
      max_trades_per_day: 10,
      max_open_positions: 2,
      max_total_exposure: 2000.0,
      order_type: "MARKET",
      trading_style: "INTRADAY",
      auto_square_off_time: "15:15",
    },
  });

  const updateDraft = (updates: Partial<BotWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 ${isModal ? "p-4" : ""}`}>
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        {isModal ? (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold font-mono text-white">Create Trading Bot Wizard</h2>
          </div>
        ) : (
          <Link
            href="/bots"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Bot Fleet
          </Link>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="text-blue-400 font-bold">Step {currentStep} of 7</span>:{" "}
            <span className="text-white">{STEPS[currentStep - 1].title}</span>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 mb-6 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                    isCurrent
                      ? "bg-blue-600/20 border border-blue-500 text-blue-300 font-bold shadow-sm"
                      : isCompleted
                      ? "text-emerald-400 hover:bg-slate-900"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div
                    className={`rounded-full p-1 ${
                      isCurrent
                        ? "bg-blue-500 text-slate-950"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span>{step.id}. {step.title}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-700 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {currentStep === 1 && (
          <Step1Identity draft={draft} updateDraft={updateDraft} onNext={nextStep} />
        )}
        {currentStep === 2 && (
          <Step2LiveMarket
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 3 && (
          <Step3Indicators
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 4 && (
          <Step4OptionStrategies
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 5 && (
          <Step5TradingStrategy
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 6 && (
          <Step6RiskManagement
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 7 && (
          <Step7ReviewDeploy draft={draft} updateDraft={updateDraft} onPrev={prevStep} />
        )}
      </div>
    </div>
  );
}
