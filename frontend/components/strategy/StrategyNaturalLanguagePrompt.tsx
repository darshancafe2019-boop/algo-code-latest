"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, Check, Zap, HelpCircle, RefreshCw } from "lucide-react";
import { VisualRule, StrategyRiskConfig, StrategyDirection } from "@/types/strategy-builder";

interface StrategyNaturalLanguagePromptProps {
  onApplyRules: (parsed: {
    name: string;
    description: string;
    direction: StrategyDirection;
    rules: VisualRule[];
    confirmationRules?: VisualRule[];
    risk?: Partial<StrategyRiskConfig>;
  }) => void;
}

export function StrategyNaturalLanguagePrompt({ onApplyRules }: StrategyNaturalLanguagePromptProps) {
  const [promptText, setPromptText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    name: string;
    description: string;
    direction: StrategyDirection;
    rules: VisualRule[];
    risk?: Partial<StrategyRiskConfig>;
  } | null>(null);

  const samplePrompts = [
    {
      title: "Trend Confluence",
      prompt: "Buy BTC when 1H price is above EMA 200, 15M EMA 9 crosses above EMA 21, and 15M RSI is above 50 with 1.5 ATR stop loss.",
    },
    {
      title: "Mean Reversion Rebound",
      prompt: "Buy when 15M price touches Bollinger Lower Band, RSI < 30 oversold, and volume > 1.5x average with 2.0 risk-reward target.",
    },
    {
      title: "Short Momentum Breakdown",
      prompt: "Sell Short when price drops below EMA 50, MACD histogram is negative, and 15M RSI < 45 with 1% risk per trade.",
    },
  ];

  const handleParsePrompt = () => {
    if (!promptText.trim()) return;
    setIsParsing(true);

    setTimeout(() => {
      const text = promptText.toLowerCase();
      const isShort = text.includes("sell") || text.includes("short") || text.includes("bearish");
      const direction: StrategyDirection = isShort ? "SHORT" : "LONG";

      const parsedRules: VisualRule[] = [];

      // 1. Check EMA 200 Macro
      if (text.includes("ema 200") || text.includes("ema200")) {
        parsedRules.push({
          id: `rule-${Date.now()}-1`,
          left: "close",
          leftLabel: "Close Price",
          timeframe: text.includes("1h") ? "1h" : "15m",
          op: isShort ? "<" : ">",
          right: "ema_200",
          rightLabel: "EMA 200",
          enabled: true,
          category: "TREND",
        });
      }

      // 2. Check EMA 9 / 21 Crossover
      if (text.includes("ema 9") || text.includes("ema9")) {
        parsedRules.push({
          id: `rule-${Date.now()}-2`,
          left: "ema_9",
          leftLabel: "EMA 9",
          timeframe: "15m",
          op: isShort ? "crosses_below" : "crosses_above",
          right: "ema_21",
          rightLabel: "EMA 21",
          enabled: true,
          category: "TREND",
        });
      }

      // 3. Check RSI
      if (text.includes("rsi")) {
        let rsiVal = isShort ? "45" : "50";
        if (text.includes("30") || text.includes("oversold")) rsiVal = "30";
        if (text.includes("70") || text.includes("overbought")) rsiVal = "70";

        parsedRules.push({
          id: `rule-${Date.now()}-3`,
          left: "rsi_14",
          leftLabel: "RSI (14)",
          timeframe: "15m",
          op: isShort || rsiVal === "30" ? "<" : ">",
          right: rsiVal,
          rightLabel: rsiVal,
          enabled: true,
          category: "MOMENTUM",
        });
      }

      // 4. Check Volume
      if (text.includes("volume")) {
        parsedRules.push({
          id: `rule-${Date.now()}-4`,
          left: "volume",
          leftLabel: "Volume",
          timeframe: "15m",
          op: ">",
          right: "volume_sma_20",
          rightLabel: "Volume 20-SMA",
          enabled: true,
          category: "VOLUME",
        });
      }

      // 5. Check Bollinger Bands
      if (text.includes("bollinger")) {
        parsedRules.push({
          id: `rule-${Date.now()}-5`,
          left: "close",
          leftLabel: "Close Price",
          timeframe: "15m",
          op: isShort ? ">=" : "<=",
          right: isShort ? "bb_upper" : "bb_lower",
          rightLabel: isShort ? "Bollinger Upper" : "Bollinger Lower",
          enabled: true,
          category: "VOLATILITY",
        });
      }

      // Default fallback if no match
      if (parsedRules.length === 0) {
        parsedRules.push(
          {
            id: `rule-${Date.now()}-1`,
            left: "close",
            leftLabel: "Close Price",
            timeframe: "15m",
            op: isShort ? "<" : ">",
            right: "ema_200",
            rightLabel: "EMA 200",
            enabled: true,
            category: "TREND",
          },
          {
            id: `rule-${Date.now()}-2`,
            left: "rsi_14",
            leftLabel: "RSI (14)",
            timeframe: "15m",
            op: isShort ? "<" : ">",
            right: "50",
            rightLabel: "50",
            enabled: true,
            category: "MOMENTUM",
          }
        );
      }

      setPreviewResult({
        name: isShort ? "AI Momentum Breakdown Strategy" : "AI Trend Confluence Strategy",
        description: promptText,
        direction,
        rules: parsedRules,
        risk: {
          risk_per_trade_pct: 1.0,
          stop_loss_type: "ATR",
          stop_loss_value: 1.5,
          take_profit_type: "RR_RATIO",
          take_profit_value: 2.0,
        },
      });

      setIsParsing(false);
    }, 400);
  };

  const handleApply = () => {
    if (!previewResult) return;
    onApplyRules(previewResult);
    setPreviewResult(null);
    setPromptText("");
  };

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 shadow-xl space-y-3 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-900 to-cyan-700 text-cyan-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Natural Language Strategy Generator
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                AI Rule Assistant
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Type your trading strategy in plain English to automatically construct structured rule cards.
            </p>
          </div>
        </div>
      </div>

      {/* Textarea & Submit */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="e.g. Buy BTC when 1H price is above EMA 200, 15M EMA 9 crosses above EMA 21, RSI > 50 with 1.5 ATR stop loss..."
            rows={2}
            className="w-full bg-[#121927] border border-[#1E293B] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
          />
          <button
            onClick={handleParsePrompt}
            disabled={isParsing || !promptText.trim()}
            className="absolute right-2.5 bottom-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {isParsing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{isParsing ? "Analyzing..." : "Generate Rules"}</span>
          </button>
        </div>

        {/* Quick Sample Prompts */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 font-medium">Quick Ideas:</span>
          {samplePrompts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPromptText(s.prompt);
              }}
              className="px-2 py-0.5 rounded-lg bg-[#121927] hover:bg-[#162032] border border-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] transition-colors"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Rules Preview */}
      {previewResult && (
        <div className="p-3 bg-[#0A0E17] border border-cyan-800/60 rounded-xl space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Parsed Configuration Preview</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                {previewResult.direction}
              </span>
            </div>
            <button
              onClick={handleApply}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-md"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Apply to Workspace</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="space-y-1 bg-[#121927] p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Generated Rules ({previewResult.rules.length}):</span>
              {previewResult.rules.map((r, i) => (
                <div key={i} className="text-cyan-300">
                  • [{r.timeframe || "15m"}] {r.leftLabel || r.left} {r.op} {r.rightLabel || r.right}
                </div>
              ))}
            </div>

            <div className="space-y-1 bg-[#121927] p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Risk Parameters:</span>
              <div className="text-emerald-300">
                • Stop Loss: {previewResult.risk?.stop_loss_value}x ATR
              </div>
              <div className="text-emerald-300">
                • Take Profit: {previewResult.risk?.take_profit_value}x Risk/Reward
              </div>
              <div className="text-slate-400">
                • Risk Allocation: {previewResult.risk?.risk_per_trade_pct}% per trade
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
