"use client";

import React, { useState } from "react";
import { Sliders, Plus, Save, Code, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function IndicatorBuilderView() {
  const [name, setName] = useState("Custom Trend Filter");
  const [category, setCategory] = useState("TREND");
  const [source, setSource] = useState("close");
  const [period, setPeriod] = useState(14);
  const [multiplier, setMultiplier] = useState(2.0);
  const [smoothing, setSmoothing] = useState("EMA");
  const [triggerCondition, setTriggerCondition] = useState("CROSS_ABOVE");
  const [threshold, setThreshold] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left 2 Cols: Indicator Configuration */}
      <div className="lg:col-span-2 rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">INDICATOR BUILDER STUDIO</h2>
          </div>
          <span className="text-[10px] font-mono text-[#00E89A]">Mathematical Engine v2.5</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Indicator Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none focus:border-[#00F0FF]/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              <option value="TREND">TREND (Trend Following)</option>
              <option value="MOMENTUM">MOMENTUM (Oscillators)</option>
              <option value="VOLATILITY">VOLATILITY (Channels & Bands)</option>
              <option value="VOLUME">VOLUME (Order Flow & Money Flow)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Price Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              <option value="close">Close Price</option>
              <option value="open">Open Price</option>
              <option value="high">High Price</option>
              <option value="low">Low Price</option>
              <option value="hl2">HL2 ((H+L)/2)</option>
              <option value="hlc3">HLC3 ((H+L+C)/3)</option>
              <option value="ohlc4">OHLC4 ((O+H+L+C)/4)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Calculation Period (Bars)</label>
            <input
              type="number"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Smoothing Operator</label>
            <select
              value={smoothing}
              onChange={(e) => setSmoothing(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              <option value="EMA">Exponential Moving Average (EMA)</option>
              <option value="SMA">Simple Moving Average (SMA)</option>
              <option value="WMA">Weighted Moving Average (WMA)</option>
              <option value="VWMA">Volume-Weighted Moving Average (VWMA)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Signal Trigger Condition</label>
            <select
              value={triggerCondition}
              onChange={(e) => setTriggerCondition(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              <option value="CROSS_ABOVE">Crosses Above Threshold / Series</option>
              <option value="CROSS_BELOW">Crosses Below Threshold / Series</option>
              <option value="GREATER_THAN">Value Greater Than Threshold</option>
              <option value="LESS_THAN">Value Less Than Threshold</option>
              <option value="BULLISH_DIVERGENCE">Bullish Regular Divergence</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-[#10263A] flex items-center justify-between">
          <span className="text-[10px] text-[#7D8EA5] font-mono">Formula: {smoothing}({source}, {period})</span>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {savedSuccess ? <CheckCircle2 className="h-3.5 w-3.5 text-[#00E89A]" /> : <Save className="h-3.5 w-3.5" />}
            <span>{savedSuccess ? "Saved to Catalog!" : "Register Custom Indicator"}</span>
          </button>
        </div>
      </div>

      {/* Right Col: Mathematical Preview */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#10263A]">
            <Code className="h-4 w-4 text-[#A855F7]" />
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase">MATHEMATICAL AUDIT</h3>
          </div>
          <div className="p-3 rounded bg-[#06101B] border border-[#10263A] font-mono text-[10px] space-y-2 text-[#7D8EA5]">
            <p className="text-[#00F0FF]">// Vectorized Formula Specification</p>
            <p>alpha = 2 / ({period} + 1)</p>
            <p>series_t = alpha * {source}_t + (1 - alpha) * series_t-1</p>
            <p className="pt-2 text-[#F8FAFC]">Trigger: output &gt; {threshold} =&gt; BUY</p>
            <p className="text-[#F8FAFC]">Latency Target: &lt; 8ms</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#10263A] text-[10px] text-[#7D8EA5]">
          <span>Pre-Compiled Status: <span className="text-[#00E89A]">SYNTAX VALID</span></span>
        </div>
      </div>
    </div>
  );
}

