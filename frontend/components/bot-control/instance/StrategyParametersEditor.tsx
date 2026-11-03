"use client";

import React, { useState } from "react";
import { Sliders, Save, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StrategyParamConfig {
  strategyName: string;
  strategyVersion: string;
  timeframe: string;
  confirmationTimeframe: string;
  indicators: {
    emaFast: number;
    emaSlow: number;
    rsiPeriod: number;
    rsiOverbought: number;
    rsiOversold: number;
  };
  entryRules: string;
  exitRules: string;
  stopLossPct: number;
  takeProfitPct: number;
  quantity: number;
  lotSize: number;
  maxTradesPerDay: number;
  cooldownPeriodSec: number;
  tradingSession: string;
  capitalAllocation: number;
}

interface StrategyParametersEditorProps {
  initialConfig: StrategyParamConfig;
  onSave: (config: StrategyParamConfig) => Promise<void>;
  onValidate: (config: StrategyParamConfig) => Promise<boolean>;
}

export function StrategyParametersEditor({
  initialConfig,
  onSave,
  onValidate,
}: StrategyParametersEditorProps) {
  const [activeConfig, setActiveConfig] = useState<StrategyParamConfig>(initialConfig);
  const [formConfig, setFormConfig] = useState<StrategyParamConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasUnsavedChanges = JSON.stringify(activeConfig) !== JSON.stringify(formConfig);

  const handleValidate = async () => {
    setValidating(true);
    setStatusMessage(null);
    try {
      const isValid = await onValidate(formConfig);
      setStatusMessage(isValid ? "Validation Passed: Parameters comply with risk bounds." : "Validation Failed: Parameter out of range.");
    } catch (err: any) {
      setStatusMessage(`Validation Error: ${err.message || "Failed"}`);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await onSave(formConfig);
      setActiveConfig(formConfig);
      setStatusMessage("Parameters successfully saved and committed to engine.");
    } catch (err: any) {
      setStatusMessage(`Save Error: ${err.message || "Failed to update parameters"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormConfig(activeConfig);
    setStatusMessage("Parameters reset to currently active state.");
  };

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1A2B43]/70 gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Strategy Parameters &amp; Execution Logic
          </h3>
          {hasUnsavedChanges && (
            <span className="text-[10px] font-mono font-bold text-[#FFB020] bg-[#FFB020]/15 px-2 py-0.5 rounded border border-[#FFB020]/30">
              Unsaved Changes Pending
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[#91A7C1] hover:text-[#EAF3FF] transition-all cursor-pointer disabled:opacity-40"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#00C9E8]" />
            <span>{validating ? "Validating..." : "Validate"}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#FF5268]/40 text-[#91A7C1] hover:text-[#FF5268] transition-all cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#00C9E8] hover:bg-[#00B4D0] text-[#050B16] font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Parameters"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-xs font-mono text-[#00C9E8]">
          {statusMessage}
        </div>
      )}

      {/* Configuration Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {/* Core Strategy Meta */}
        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43] space-y-2.5">
          <h4 className="text-[11px] font-bold text-[#00C9E8] uppercase tracking-wider pb-1.5 border-b border-[#1A2B43]/50">
            Strategy Architecture
          </h4>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Strategy Name</label>
            <input
              type="text"
              value={formConfig.strategyName}
              disabled
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Timeframe</label>
            <select
              value={formConfig.timeframe}
              onChange={(e) => setFormConfig({ ...formConfig, timeframe: e.target.value })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] font-bold focus:outline-none"
            >
              <option value="1m">1m (Scalping)</option>
              <option value="5m">5m (Intraday)</option>
              <option value="15m">15m (Momentum)</option>
              <option value="1h">1h (Swing)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Trading Session</label>
            <input
              type="text"
              value={formConfig.tradingSession}
              onChange={(e) => setFormConfig({ ...formConfig, tradingSession: e.target.value })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF]"
            />
          </div>
        </div>

        {/* Indicator Hyperparameters */}
        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43] space-y-2.5">
          <h4 className="text-[11px] font-bold text-[#8B5CF6] uppercase tracking-wider pb-1.5 border-b border-[#1A2B43]/50">
            Indicator Parameters
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#91A7C1] block mb-1">Fast EMA</label>
              <input
                type="number"
                value={formConfig.indicators.emaFast}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    indicators: { ...formConfig.indicators, emaFast: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#91A7C1] block mb-1">Slow EMA</label>
              <input
                type="number"
                value={formConfig.indicators.emaSlow}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    indicators: { ...formConfig.indicators, emaSlow: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">RSI Period</label>
            <input
              type="number"
              value={formConfig.indicators.rsiPeriod}
              onChange={(e) =>
                setFormConfig({
                  ...formConfig,
                  indicators: { ...formConfig.indicators, rsiPeriod: Number(e.target.value) },
                })
              }
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF] font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#91A7C1] block mb-1">RSI Low</label>
              <input
                type="number"
                value={formConfig.indicators.rsiOversold}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    indicators: { ...formConfig.indicators, rsiOversold: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2 py-1 text-[#00D6A0] font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#91A7C1] block mb-1">RSI High</label>
              <input
                type="number"
                value={formConfig.indicators.rsiOverbought}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    indicators: { ...formConfig.indicators, rsiOverbought: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2 py-1 text-[#FF5268] font-bold"
              />
            </div>
          </div>
        </div>

        {/* Sizing & Capital Allocation */}
        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43] space-y-2.5">
          <h4 className="text-[11px] font-bold text-[#FFB020] uppercase tracking-wider pb-1.5 border-b border-[#1A2B43]/50">
            Sizing &amp; Frequency
          </h4>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Quantity (Lots)</label>
            <input
              type="number"
              min={1}
              value={formConfig.quantity}
              onChange={(e) => setFormConfig({ ...formConfig, quantity: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Max Trades Per Day</label>
            <input
              type="number"
              value={formConfig.maxTradesPerDay}
              onChange={(e) => setFormConfig({ ...formConfig, maxTradesPerDay: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Cooldown (Seconds)</label>
            <input
              type="number"
              value={formConfig.cooldownPeriodSec}
              onChange={(e) => setFormConfig({ ...formConfig, cooldownPeriodSec: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#EAF3FF]"
            />
          </div>
        </div>

        {/* Protection Limits */}
        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43] space-y-2.5">
          <h4 className="text-[11px] font-bold text-[#00D6A0] uppercase tracking-wider pb-1.5 border-b border-[#1A2B43]/50">
            Protection Bounds
          </h4>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Stop-Loss (%)</label>
            <input
              type="number"
              step="0.1"
              value={formConfig.stopLossPct}
              onChange={(e) => setFormConfig({ ...formConfig, stopLossPct: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#FF5268] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Take-Profit Target (%)</label>
            <input
              type="number"
              step="0.1"
              value={formConfig.takeProfitPct}
              onChange={(e) => setFormConfig({ ...formConfig, takeProfitPct: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#00D6A0] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] block mb-1">Allocated Capital</label>
            <input
              type="number"
              value={formConfig.capitalAllocation}
              onChange={(e) => setFormConfig({ ...formConfig, capitalAllocation: Number(e.target.value) })}
              className="w-full bg-[#091426] border border-[#1A2B43] rounded px-2.5 py-1 text-[#00C9E8] font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

