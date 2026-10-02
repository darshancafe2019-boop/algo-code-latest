"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Target,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";
import { PlaybookRecord } from "@/types/trade-journal";

interface JournalPlaybooksProps {
  playbooks: PlaybookRecord[];
  onSavePlaybook: (playbook: Partial<PlaybookRecord>) => void;
}

export function JournalPlaybooks({
  playbooks,
  onSavePlaybook,
}: JournalPlaybooksProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRR, setTargetRR] = useState(2.5);
  const [preferredRegime, setPreferredRegime] = useState("TRENDING");
  const [requiredConditionsText, setRequiredConditionsText] = useState("EMA 20 > EMA 50\nMACD Bullish Crossover\nPrice above VWAP");
  const [invalidationRulesText, setInvalidationRulesText] = useState("Price closes below 20 EMA\nRSI divergence bearish");

  const defaultPlaybooks: PlaybookRecord[] = [
    {
      id: "pb-orb",
      name: "Opening Range Breakout (ORB)",
      category: "INTRADAY",
      description: "High-momentum breakout of the 15-minute opening range high/low with volume surge.",
      required_conditions: ["15m Range Established", "Volume > 1.5x 20-period avg", "ADX > 22"],
      invalidation_rules: ["Breakout candle closes back inside range", "Opposing volume spike"],
      target_rr: 3.0,
      preferred_regime: "VOLATILE_MOMENTUM",
      mistakes_to_avoid: ["Entering before 15m candle close", "Chasing > 1 ATR from breakout level"],
      is_active: true,
    },
    {
      id: "pb-ema-pullback",
      name: "A+ 20 EMA Trend Pullback",
      category: "TREND_FOLLOWING",
      description: "Entering with the higher-timeframe trend on a healthy test of the 20 exponential moving average.",
      required_conditions: ["EMA 20 > EMA 50 > EMA 200", "RSI pullback to 45-55 zone", "Bullish rejection wick"],
      invalidation_rules: ["2 consecutive closes below 50 EMA", "Trend structure breakdown"],
      target_rr: 2.5,
      preferred_regime: "TRENDING",
      mistakes_to_avoid: ["Buying extended moves > 2 ATR from 20 EMA", "Ignoring higher-timeframe resistance"],
      is_active: true,
    },
    {
      id: "pb-vwap-reversal",
      name: "Mean Reversion VWAP Magnet",
      category: "MEAN_REVERSION",
      description: "Capturing overextended moves returning to the institutional volume-weighted average price.",
      required_conditions: ["Price > 2.5 Std Dev from VWAP", "RSI > 75 or < 25", "Exhaustion candle pattern"],
      invalidation_rules: ["Momentum continuation through 3 Std Dev band"],
      target_rr: 2.0,
      preferred_regime: "RANGING",
      mistakes_to_avoid: ["Trading against strong macro catalyst trends"],
      is_active: true,
    },
  ];

  const displayPlaybooks = playbooks.length > 0 ? playbooks : defaultPlaybooks;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSavePlaybook({
      name,
      description,
      target_rr: targetRR,
      preferred_regime: preferredRegime,
      required_conditions: requiredConditionsText.split("\n").filter(Boolean),
      invalidation_rules: invalidationRulesText.split("\n").filter(Boolean),
      is_active: true,
    });
    setName("");
    setDescription("");
    setIsCreating(false);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-5 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Setup Playbooks & Execution Rules Library
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Pre-defined trade setup playbooks, invalidation triggers, and preferred market regimes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs shadow-md flex items-center gap-1.5 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Playbook Setup</span>
        </button>
      </div>

      {/* Playbook Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayPlaybooks.map((pb) => (
          <div
            key={pb.id}
            className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/40 shadow-md space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-xs text-[var(--theme-text-primary)]">{pb.name}</h4>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
                  {pb.preferred_regime}
                </span>
              </div>

              <p className="text-[11px] text-[var(--theme-text-secondary)] line-clamp-2">
                {pb.description}
              </p>

              {/* Conditions */}
              <div className="space-y-1 text-[11px] pt-1">
                <span className="text-[10px] font-mono uppercase text-[var(--theme-profit)] font-bold block">
                  Required Criteria:
                </span>
                <ul className="space-y-0.5 text-[10px] text-[var(--theme-text-secondary)] list-disc list-inside">
                  {pb.required_conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Invalidation Rules */}
              <div className="space-y-1 text-[11px] pt-1">
                <span className="text-[10px] font-mono uppercase text-[var(--theme-loss)] font-bold block">
                  Invalidation Trigger:
                </span>
                <ul className="space-y-0.5 text-[10px] text-[var(--theme-text-secondary)] list-disc list-inside">
                  {pb.invalidation_rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--theme-border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--theme-text-muted)]">
              <span>Target R:R: <strong className="text-[var(--theme-text-primary)]">1:{pb.target_rr}</strong></span>
              <span className="text-[10px] text-[var(--theme-accent)]">Active Playbook</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Playbook Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">Create Trading Setup Playbook</h3>
              <button onClick={() => setIsCreating(false)} className="text-[var(--theme-text-muted)] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-secondary)] block mb-1">Playbook Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 5-Min Opening Range Breakout"
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-secondary)] block mb-1">Description & Thesis:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="When to execute this setup, edge context, and rules..."
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2.5 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-[10px] font-bold text-[var(--theme-text-secondary)] block mb-1">Target R:R</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetRR}
                    onChange={(e) => setTargetRR(parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--theme-text-secondary)] block mb-1">Market Regime</label>
                  <select
                    value={preferredRegime}
                    onChange={(e) => setPreferredRegime(e.target.value)}
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                  >
                    <option value="TRENDING">Trending</option>
                    <option value="RANGING">Ranging</option>
                    <option value="VOLATILE_MOMENTUM">Volatile Momentum</option>
                    <option value="BREAKOUT">Breakout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--theme-profit)] block mb-1">Required Conditions (1 per line):</label>
                <textarea
                  rows={2}
                  value={requiredConditionsText}
                  onChange={(e) => setRequiredConditionsText(e.target.value)}
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2.5 text-xs text-[var(--theme-text-primary)] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--theme-loss)] block mb-1">Invalidation Rules (1 per line):</label>
                <textarea
                  rows={2}
                  value={invalidationRulesText}
                  onChange={(e) => setInvalidationRulesText(e.target.value)}
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2.5 text-xs text-[var(--theme-text-primary)] focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--theme-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] text-xs text-[var(--theme-text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold text-xs shadow-md"
                >
                  Save Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
