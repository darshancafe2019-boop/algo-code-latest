"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Shield,
  Layers,
  BarChart3,
  Clock,
  Target,
  Sliders,
  FlaskConical,
  Bot,
} from "lucide-react";

export type FlowStepId =
  | "market"
  | "timeframe"
  | "entry"
  | "confirmation"
  | "confluence"
  | "exit"
  | "stops"
  | "options"
  | "futures"
  | "risk"
  | "backtest"
  | "papertest";

interface StrategyVisualFlowProps {
  activeStep: FlowStepId;
  onSelectStep: (step: FlowStepId) => void;
  direction: string;
}

export function StrategyVisualFlow({ activeStep, onSelectStep, direction }: StrategyVisualFlowProps) {
  const steps: Array<{ id: FlowStepId; label: string; icon: any }> = [
    { id: "entry", label: "1. Entry Conditions", icon: Zap },
    { id: "confirmation", label: "2. Confirmation", icon: CheckCircle2 },
    { id: "confluence", label: "3. Confluence Weights", icon: Sliders },
    { id: "exit", label: "4. Exit Rules", icon: Target },
    { id: "stops", label: "5. SL / TP Targets", icon: Shield },
    ...(direction === "OPTIONS_MULTI_LEG"
      ? [{ id: "options" as FlowStepId, label: "6. Options Studio", icon: Layers }]
      : direction === "FUTURES"
      ? [{ id: "futures" as FlowStepId, label: "6. Futures & Margin", icon: Layers }]
      : []),
    { id: "risk", label: "Risk & Capital", icon: Shield },
    { id: "backtest", label: "Backtest Lab", icon: BarChart3 },
    { id: "papertest", label: "Paper Stream", icon: FlaskConical },
  ];

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-3 shadow-lg select-none font-sans overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        {steps.map((step, idx) => {
          const isActive = activeStep === step.id;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep(step.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-gradient-to-r from-[#123C2A] to-[#2E7D5B] text-[#55C98A] border border-[#39B978]/60 shadow-md shadow-[#2E7D5B]/20"
                    : "bg-[#07110D] hover:bg-[#123C2A]/60 text-[#A8BDB0] hover:text-[#E8F3EC] border border-[#1B3328]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#55C98A]" : "text-[#70877A]"}`} />
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-[#294238] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
