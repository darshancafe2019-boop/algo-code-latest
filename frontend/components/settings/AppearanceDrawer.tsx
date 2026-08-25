"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  BUILTIN_THEMES,
  ThemePreset,
  AppearanceMode,
  Density,
  TextSize,
  Accent,
  ChartStyle,
  ACCENT_SWATCHES,
  InterfaceFont,
  NumericFont,
  FontWeightEmphasis,
  calculateContrastRatio,
  getContrastRating,
} from "@/lib/themeTokens";
import {
  Paintbrush,
  X,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  CandlestickChart,
  BarChart2,
  LineChart,
  Grid,
} from "lucide-react";

export function AppearanceDrawer() {
  const {
    config,
    draftConfig,
    isDrawerOpen,
    setTheme,
    setMode,
    setDensity,
    setTextSize,
    setAccent,
    setChartStyle,
    setHighContrast,
    updateDraftColors,
    updateDraftTypography,
    updateDraftChart,
    applyDraft,
    cancelDraft,
    resetToDefaults,
    closeAppearanceDrawer,
    exportThemeJson,
    importThemeJson,
  } = useTheme();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isDrawerOpen) return null;

  // Real-time WCAG contrast score calculations
  const textContrast = calculateContrastRatio(draftConfig.colors.textPrimary, draftConfig.colors.surface);
  const textRating = getContrastRating(textContrast);
  const profitContrast = calculateContrastRatio(draftConfig.colors.profit, draftConfig.colors.surface);
  const profitRating = getContrastRating(profitContrast);

  const handleExport = () => {
    const json = exportThemeJson();
    navigator.clipboard.writeText(json);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleImport = () => {
    const res = importThemeJson(importJsonText);
    if (res.success) {
      setImportStatus({ success: true, message: "Theme imported and previewed!" });
    } else {
      setImportStatus({ success: false, message: res.error || "Invalid theme JSON." });
    }
  };

  const handleApply = async () => {
    await applyDraft();
    closeAppearanceDrawer();
  };

  const handleReset = async () => {
    await resetToDefaults();
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to cancel */}
      <div className="hidden sm:block flex-1 h-full" onClick={cancelDraft} />

      {/* Main Appearance Modal / Panel */}
      <div className="w-full sm:max-w-2xl h-full max-h-screen sm:max-h-[92vh] sm:my-auto sm:mr-4 bg-[var(--theme-surface)] border border-[var(--theme-border)] sm:rounded-2xl shadow-2xl flex flex-col z-10 text-[var(--theme-text-primary)] overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--theme-accent-soft)] border border-[var(--theme-accent-border)] text-[var(--theme-accent)]">
              <Paintbrush className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--theme-text-primary)]">
                Appearance
              </h2>
              <p className="text-xs text-[var(--theme-text-secondary)]">
                Customize your Quant.OS workspace.
              </p>
            </div>
          </div>

          <button
            onClick={cancelDraft}
            className="p-2 rounded-xl hover:bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] border border-transparent hover:border-[var(--theme-border)] transition"
            title="Close Appearance"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* OPTION 1: THEME (4 Institutional Presets) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                1. Theme Preset
              </label>
              <span className="text-xs font-semibold text-[var(--theme-accent)] font-mono">
                {draftConfig.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: "obsidian-blue", name: "Obsidian Blue", sub: "Dark Default", bg: "#070B14", surf: "#0E1626", acc: "#4F8CFF", pro: "#34D399", los: "#FB7185" },
                  { id: "midnight-emerald", name: "Midnight Emerald", sub: "Dark Financial", bg: "#07110D", surf: "#0D1B15", acc: "#2FD07F", pro: "#3DDC97", los: "#FF647C" },
                  { id: "graphite", name: "Graphite", sub: "Minimal Dark", bg: "#0B0B0E", surf: "#141418", acc: "#8B5CF6", pro: "#34D399", los: "#FB7185" },
                  { id: "light-professional", name: "Light Professional", sub: "Light Mode", bg: "#F4F7FB", surf: "#FFFFFF", acc: "#1368E8", pro: "#078A55", los: "#D92D20" },
                ] as const
              ).map((t) => {
                const isSelected = draftConfig.themeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ThemePreset)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/30 bg-[var(--theme-elevated)] shadow-md"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-border-subtle)] hover:bg-[var(--theme-elevated)]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="font-bold text-xs sm:text-sm text-[var(--theme-text-primary)]">
                        {t.name}
                      </span>
                      {isSelected && (
                        <span className="p-0.5 rounded-full bg-[var(--theme-accent)] text-[var(--theme-bg)]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.bg }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.surf }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.acc }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.pro }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.los }} />
                    </div>

                    <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
                      {t.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OPTION 2: DISPLAY (Mode, Density, Text Size) */}
          <div className="space-y-3 p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)]">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] block">
              2. Display & Layout
            </label>

            {/* Mode */}
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-[var(--theme-text-muted)] font-medium">Color Mode</span>
              <div className="flex items-center gap-1.5">
                {(["dark", "light", "system"] as AppearanceMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      draftConfig.colorMode === m
                        ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold shadow-sm"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Interface Density */}
            <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-muted)] font-medium">Density</span>
              <div className="flex items-center gap-1.5">
                {(["compact", "comfortable"] as Density[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      draftConfig.typography.density === d
                        ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold shadow-sm"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    {d} {d === "compact" ? "(Trading)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size */}
            <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-muted)] font-medium">Text Size</span>
              <div className="flex items-center gap-1.5">
                {(["small", "default", "large"] as TextSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTextSize(s)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      draftConfig.typography.fontScale === s
                        ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold shadow-sm"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* OPTION 3: ACCENT (4 Swatches) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                3. Accent Color
              </label>
              <span className="text-[11px] font-mono text-[var(--theme-text-muted)]">
                Navigation & Focus Highlights
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(["blue", "cyan", "green", "violet"] as Accent[]).map((acc) => {
                const swatch = ACCENT_SWATCHES[acc];
                const isSelected = draftConfig.accent === acc;
                return (
                  <button
                    key={acc}
                    onClick={() => setAccent(acc)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition ${
                      isSelected
                        ? "border-[var(--theme-accent)] bg-[var(--theme-elevated)] shadow-sm ring-1 ring-[var(--theme-accent)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-elevated)]"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span
                      className={`text-xs font-semibold capitalize ${
                        isSelected ? "text-[var(--theme-text-primary)] font-bold" : "text-[var(--theme-text-secondary)]"
                      }`}
                    >
                      {swatch.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OPTION 4: CHART STYLE (4 Styles) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                4. Chart Style
              </label>
              <span className="text-[11px] font-mono text-[var(--theme-text-muted)]">
                Candle Visualizer
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: "candles", label: "Candles", icon: CandlestickChart },
                  { id: "hollow", label: "Hollow", icon: Grid },
                  { id: "bars", label: "Bars", icon: BarChart2 },
                  { id: "line", label: "Line", icon: LineChart },
                ] as const
              ).map((cs) => {
                const Icon = cs.icon;
                const isSelected = draftConfig.chart.style === cs.id;
                return (
                  <button
                    key={cs.id}
                    onClick={() => setChartStyle(cs.id as ChartStyle)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                      isSelected
                        ? "border-[var(--theme-accent)] bg-[var(--theme-elevated)] text-[var(--theme-accent)] font-bold ring-1 ring-[var(--theme-accent)] shadow-sm"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs capitalize">{cs.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLLAPSIBLE ADVANCED SETTINGS */}
          <div className="pt-2 border-t border-[var(--theme-border)]">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between w-full py-2 text-xs font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
            >
              <span className="flex items-center gap-1.5">
                {isAdvancedOpen ? <ChevronDown className="h-4 w-4 text-[var(--theme-accent)]" /> : <ChevronRight className="h-4 w-4" />}
                Advanced Settings
              </span>
              <span className="text-[11px] font-normal text-[var(--theme-text-muted)]">
                {isAdvancedOpen ? "Hide technical parameters" : "Typography, Sliders, WCAG & JSON"}
              </span>
            </button>

            {isAdvancedOpen && (
              <div className="mt-3 space-y-4 p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-xs animate-in slide-in-from-top-2 duration-150">
                
                {/* 1. Typography Fonts */}
                <div className="space-y-2">
                  <label className="font-bold text-[var(--theme-text-secondary)] uppercase text-[11px]">
                    Typography Families
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Interface Font</span>
                      <select
                        value={draftConfig.typography.interfaceFont}
                        onChange={(e) => updateDraftTypography({ interfaceFont: e.target.value as InterfaceFont })}
                        className="w-full p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)] outline-none"
                      >
                        <option value="Inter">Inter (Clean Sans)</option>
                        <option value="Manrope">Manrope (Modern Geometric)</option>
                        <option value="IBM Plex Sans">IBM Plex Sans (Technical)</option>
                        <option value="System Sans">System Sans (OS Native)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Numeric Font</span>
                      <select
                        value={draftConfig.typography.numericFont}
                        onChange={(e) => updateDraftTypography({ numericFont: e.target.value as NumericFont })}
                        className="w-full p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)] font-mono outline-none"
                      >
                        <option value="JetBrains Mono">JetBrains Mono</option>
                        <option value="IBM Plex Mono">IBM Plex Mono</option>
                        <option value="SF Mono / System Mono">SF Mono / System Mono</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Chart Technical Appearance */}
                <div className="space-y-3 pt-2 border-t border-[var(--theme-border-subtle)]">
                  <label className="font-bold text-[var(--theme-text-secondary)] uppercase text-[11px]">
                    Chart Fine-Tuning
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--theme-text-muted)]">Grid Opacity</span>
                        <span className="font-mono text-[var(--theme-accent)]">{Math.round(draftConfig.chart.gridOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={draftConfig.chart.gridOpacity}
                        onChange={(e) => updateDraftChart({ gridOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-[var(--theme-accent)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--theme-text-muted)]">Line Width</span>
                        <span className="font-mono text-[var(--theme-accent)]">{draftConfig.chart.lineThickness}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={draftConfig.chart.lineThickness}
                        onChange={(e) => updateDraftChart({ lineThickness: parseInt(e.target.value) })}
                        className="w-full accent-[var(--theme-accent)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Accessibility & WCAG Scorecard */}
                <div className="space-y-2 pt-2 border-t border-[var(--theme-border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--theme-text-secondary)] uppercase text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      WCAG Contrast & Accessibility
                    </span>
                    <button
                      onClick={() => setHighContrast(!draftConfig.highContrast)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                        draftConfig.highContrast
                          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)]"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)]"
                      }`}
                    >
                      High Contrast: {draftConfig.highContrast ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)]">
                      <span className="text-[var(--theme-text-muted)] block text-[10px]">Text on Surface</span>
                      <span className={textRating.isPass ? "text-[var(--theme-profit)] font-bold" : "text-[var(--theme-loss)] font-bold"}>
                        {textRating.scoreText}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)]">
                      <span className="text-[var(--theme-text-muted)] block text-[10px]">Profit on Surface</span>
                      <span className={profitRating.isPass ? "text-[var(--theme-profit)] font-bold" : "text-[var(--theme-loss)] font-bold"}>
                        {profitRating.scoreText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Import / Export JSON */}
                <div className="space-y-2 pt-2 border-t border-[var(--theme-border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--theme-text-secondary)] uppercase text-[11px]">
                      Theme JSON
                    </span>
                    <button
                      onClick={handleExport}
                      className="px-2.5 py-1 rounded bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      {copiedExport ? <CheckCircle2 className="h-3 w-3 text-[var(--theme-profit)]" /> : <Download className="h-3 w-3" />}
                      <span>{copiedExport ? "Copied!" : "Copy JSON"}</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='Paste JSON to import...'
                      className="flex-1 px-2.5 py-1 text-xs font-mono bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-text-primary)] outline-none"
                    />
                    <button
                      onClick={handleImport}
                      disabled={!importJsonText.trim()}
                      className="px-3 py-1 rounded bg-[var(--theme-accent)] hover:opacity-90 disabled:opacity-40 text-[var(--theme-bg)] font-bold text-xs transition"
                    >
                      Import
                    </button>
                  </div>
                  {importStatus && (
                    <span className={`text-[10px] block ${importStatus.success ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                      {importStatus.message}
                    </span>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-elevated)] flex items-center justify-between gap-2 text-xs">
          
          {/* RESET BUTTON */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)] font-semibold flex items-center gap-1.5 transition"
            title="Reset to default appearance"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          {/* CANCEL & APPLY */}
          <div className="flex items-center gap-2">
            <button
              onClick={cancelDraft}
              className="px-4 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] font-semibold transition"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold shadow-md shadow-[var(--theme-accent)]/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>

      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl space-y-3 text-center">
            <h4 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Reset appearance settings?
            </h4>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Reset to Quant.OS defaults (Obsidian Blue, Dark, Compact, Blue Accent, Candles)?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg)] text-xs font-bold shadow-md"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
