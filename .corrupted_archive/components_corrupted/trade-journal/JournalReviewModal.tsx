"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Star,
  CheckCircle2,
  AlertTriangle,
  Smile,
  X,
  Save,
  ChevronRight,
  Sparkles,
  Tag,
  Shield,
} from "lucide-react";
import { TradeJournalRecord, TradeReview } from "@/types/trade-journal";

interface JournalReviewModalProps {
  trade: TradeJournalRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (tradeId: number, review: Partial<TradeReview>, isNext?: boolean) => void;
  isSubmitting?: boolean;
  hasNextTrade?: boolean;
}

export function JournalReviewModal({
  trade,
  isOpen,
  onClose,
  onSaveReview,
  isSubmitting,
  hasNextTrade,
}: JournalReviewModalProps) {
  const existing = (trade?.review || {}) as Partial<TradeReview>;

  const [setupQuality, setSetupQuality] = useState(existing.setup_quality || 3);
  const [executionQuality, setExecutionQuality] = useState(existing.execution_quality || 3);
  const [disciplineRating, setDisciplineRating] = useState(existing.discipline_rating || 3);
  const [confidenceBefore, setConfidenceBefore] = useState(existing.confidence_before || 3);
  const [emotionalState, setEmotionalState] = useState(existing.emotional_state || "DISCIPLINED");
  const [entryReasoning, setEntryReasoning] = useState(existing.entry_reasoning || "");
  const [whatWentWell, setWhatWentWell] = useState(existing.what_went_well || "");
  const [whatWentWrong, setWhatWentWrong] = useState(existing.what_went_wrong || "");
  const [lessonsLearned, setLessonsLearned] = useState(existing.lessons_learned || "");
  const [takeAgainVerdict, setTakeAgainVerdict] = useState(existing.take_again_verdict || "YES");
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(
    existing.mistakes ? existing.mistakes.split(", ").filter(Boolean) : []
  );
  const [tags, setTags] = useState<string[]>(existing.tags || []);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (trade) {
      const rev = (trade.review || {}) as Partial<TradeReview>;
      setSetupQuality(rev.setup_quality || 3);
      setExecutionQuality(rev.execution_quality || 3);
      setDisciplineRating(rev.discipline_rating || 3);
      setConfidenceBefore(rev.confidence_before || 3);
      setEmotionalState(rev.emotional_state || "DISCIPLINED");
      setEntryReasoning(rev.entry_reasoning || "");
      setWhatWentWell(rev.what_went_well || "");
      setWhatWentWrong(rev.what_went_wrong || "");
      setLessonsLearned(rev.lessons_learned || "");
      setTakeAgainVerdict(rev.take_again_verdict || "YES");
      setSelectedMistakes(rev.mistakes ? rev.mistakes.split(", ").filter(Boolean) : []);
      setTags(rev.tags || []);
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  const mistakeOptions = [
    "No Mistake",
    "Early Entry",
    "Late Entry",
    "Early Exit",
    "Late Exit",
    "Oversized Position",
    "Undersized Position",
    "Moved Stop",
    "Removed Stop",
    "Chased Entry",
    "FOMO",
    "Revenge Trade",
    "Overtrading",
    "Poor R:R",
    "Manual Override",
    "Strategy Deviation",
  ];

  const toggleMistake = (m: string) => {
    if (m === "No Mistake") {
      setSelectedMistakes(["No Mistake"]);
      return;
    }
    const filtered = selectedMistakes.filter((item) => item !== "No Mistake");
    if (filtered.includes(m)) {
      setSelectedMistakes(filtered.filter((item) => item !== m));
    } else {
      setSelectedMistakes([...filtered, m]);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSave = (isNext: boolean = false) => {
    onSaveReview(
      trade.id,
      {
        setup_quality: setupQuality,
        execution_quality: executionQuality,
        discipline_rating: disciplineRating,
        confidence_before: confidenceBefore,
        emotional_state: emotionalState,
        entry_reasoning: entryReasoning,
        what_went_well: whatWentWell,
        what_went_wrong: whatWentWrong,
        mistakes: selectedMistakes.join(", "),
        lessons_learned: lessonsLearned,
        take_again_verdict: takeAgainVerdict,
        tags: tags,
      },
      isNext
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-sans select-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[var(--theme-accent)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
                Review Trade: {trade.symbol} (#{trade.id})
              </h3>
              <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
                {trade.strategy || "EMA_MACD_VP"} • {trade.direction} • Net P&L: ${trade.net_pnl || trade.result_pnl || 0}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--theme-text-muted)] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Star Rating Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Setup Quality */}
          <div className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
            <label className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] block">Setup Quality</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setSetupQuality(s)} className="p-0.5">
                  <Star className={`h-3.5 w-3.5 ${s <= setupQuality ? "text-[var(--theme-warning)] fill-[var(--theme-warning)]" : "text-[var(--theme-text-muted)]"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Execution Quality */}
          <div className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
            <label className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] block">Execution Quality</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setExecutionQuality(s)} className="p-0.5">
                  <Star className={`h-3.5 w-3.5 ${s <= executionQuality ? "text-[var(--theme-profit)] fill-[var(--theme-profit)]" : "text-[var(--theme-text-muted)]"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Score */}
          <div className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
            <label className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] block">Discipline Score</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setDisciplineRating(s)} className="p-0.5">
                  <Star className={`h-3.5 w-3.5 ${s <= disciplineRating ? "text-[var(--theme-accent)] fill-[var(--theme-accent)]" : "text-[var(--theme-text-muted)]"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Psychological State */}
          <div className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
            <label className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] block">Psychology</label>
            <select
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] rounded-lg px-2 py-1 text-[11px] text-[var(--theme-text-primary)] focus:outline-none"
            >
              <option value="DISCIPLINED">Disciplined</option>
              <option value="CONFIDENT">Confident</option>
              <option value="PATIENT">Patient</option>
              <option value="FOMO">FOMO (Chased)</option>
              <option value="FEARFUL">Fearful (Early Exit)</option>
              <option value="REVENGE">Revenge</option>
              <option value="HESITANT">Hesitant</option>
              <option value="GREEDY">Greedy</option>
            </select>
          </div>
        </div>

        {/* 2. Multi-Select Mistake Tags */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--theme-loss)] block">
            Mistakes / Rule Deviations (Multi-Select):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {mistakeOptions.map((m) => {
              const isSelected = selectedMistakes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMistake(m)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition border ${
                    isSelected
                      ? "bg-[var(--theme-loss)]/20 border-[var(--theme-loss)] text-[var(--theme-loss)]"
                      : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-white"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Qualitative Text Areas */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-bold text-[var(--theme-text-secondary)] block mb-1">
              Entry Thesis & Technical Reasoning:
            </label>
            <textarea
              rows={2}
              value={entryReasoning}
              onChange={(e) => setEntryReasoning(e.target.value)}
              placeholder="Why did you take this trade? Confluence signals, support/resistance, catalyst..."
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2.5 text-xs text-[var(--theme-text-primary)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--theme-profit)] block mb-1">
                What went well?
              </label>
              <textarea
                rows={2}
                value={whatWentWell}
                onChange={(e) => setWhatWentWell(e.target.value)}
                placeholder="Patience, execution speed, target held..."
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2 text-xs text-[var(--theme-text-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--theme-loss)] block mb-1">
                What went wrong?
              </label>
              <textarea
                rows={2}
                value={whatWentWrong}
                onChange={(e) => setWhatWentWrong(e.target.value)}
                placeholder="Hesitation, slippage, sized too big..."
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2 text-xs text-[var(--theme-text-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--theme-accent)] block mb-1">
              Lessons Learned & Future Rule:
            </label>
            <textarea
              rows={2}
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="What will you do differently next time this setup appears?"
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-2 text-xs text-[var(--theme-text-primary)] focus:outline-none"
            />
          </div>

          {/* Take Again Verdict */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
            <span className="text-[11px] font-bold text-[var(--theme-text-secondary)]">Would you take this exact setup again?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTakeAgainVerdict("YES")}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono ${
                  takeAgainVerdict === "YES" ? "bg-[var(--theme-profit)] text-[var(--theme-bg)]" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"
                }`}
              >
                YES (Valid Edge)
              </button>
              <button
                type="button"
                onClick={() => setTakeAgainVerdict("NO")}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono ${
                  takeAgainVerdict === "NO" ? "bg-[var(--theme-loss)] text-white" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"
                }`}
              >
                NO (Rule Break)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--theme-border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] text-xs text-[var(--theme-text-secondary)] hover:text-white"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text-primary)] hover:border-[var(--theme-accent)] transition"
            >
              Save & Close
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] text-xs font-bold shadow-lg flex items-center gap-1.5 transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save & Next Trade</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
