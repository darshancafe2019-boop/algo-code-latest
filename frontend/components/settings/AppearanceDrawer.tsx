"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  BUILTIN_THEMES,
  ThemeId,
  InterfaceFont,
  NumericFont,
  FontScale,
  FontWeightEmphasis,
  UiDensity,
  calculateContrastRatio,
  getContrastRating,
} from "@/lib/themeTokens";
import {
  Paintbrush,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Eye,
  Sliders,
  Type,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from "lucide-react";

export function AppearanceDrawer() {
  const {
    config,
    draftConfig,
    isPreviewActive,
    isDrawerOpen,
    setTheme,
    updateDraftColors,
    updateDraftTypography,
    updateDraftChart,
    setPreviewActive,
    applyDraft,
    cancelDraft,
    resetCurrentTheme,
    restoreFactoryDefaults,
    closeAppearanceDrawer,
    exportThemeJson,
    importThemeJson,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<"themes" | "typography" | "colors" | "charts" | "import-export">("themes");
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  if (!isDrawerOpen) return null;

  // Real-time WCAG contrast calculation
  const textOnSurfaceContrast = calculateContrastRatio(draftConfig.colors.textPrimary, draftConfig.colors.surface);
  const textOnSurfaceRating = getContrastRating(textOnSurfaceContrast);

  const textOnPageContrast = calculateContrastRatio(draftConfig.colors.textPrimary, draftConfig.colors.pageBg);
  const textOnPageRating = getContrastRating(textOnPageContrast);

  const profitOnSurfaceContrast = calculateContrastRatio(draftConfig.colors.profit, draftConfig.colors.surface);
  const profitOnSurfaceRating = getContrastRating(profitOnSurfaceContrast);

  const handleExport = () => {
    const json = exportThemeJson();
    navigator.clipboard.writeText(json);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleImportSubmit = () => {
    const res = importThemeJson(importJsonText);
    if (res.success) {
      setImportStatus({ success: true, message: "Theme successfully imported and previewed!" });
    } else {
      setImportStatus({ success: false, message: res.error || "Import failed. Please check JSON syntax." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close / cancel */}
      <div className="flex-1" onClick={cancelDraft} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl h-full bg-[var(--theme-surface)] border-l border-[var(--theme-border)] shadow-2xl flex flex-col z-10 text-[var(--theme-text-primary)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)]">
              <Paintbrush className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                Appearance & Design System
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/40 font-mono font-bold">
                  PRO TERMINAL
                </span>
              </h2>
              <p className="text-xs text-[var(--theme-text-secondary)]">
                Customize typography, institutional color palettes, chart styling, and UI density.
              </p>
            </div>
          </div>

          <button
            onClick={closeAppearanceDrawer}
            className="p-2 rounded-xl hover:bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] border border-transparent hover:border-[var(--theme-border)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] overflow-x-auto scrollbar-none text-xs">
          {[
            { id: "themes", label: "Built-in Themes", icon: Sparkles },
            { id: "typography", label: "Typography & Density", icon: Type },
            { id: "colors", label: "Color System", icon: Sliders },
            { id: "charts", label: "Charts & Visuals", icon: TrendingUp },
            { id: "import-export", label: "Import / Export", icon: Download },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-md shadow-[var(--theme-accent)]/20"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: BUILT-IN THEMES */}
          {activeTab === "themes" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  All Institutional Presets
                </h3>
                <span className="text-xs text-[var(--theme-accent)] font-semibold">
                  Active: {draftConfig.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(BUILTIN_THEMES).map(([id, theme]) => {
                  const isSelected = draftConfig.themeId === id;
                  return (
                    <div
                      key={id}
                      id={`theme-preset-${id}`}
                      data-theme-id={id}
                      onClick={() => setTheme(id as ThemeId)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                        isSelected
                          ? "border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/40 bg-[var(--theme-elevated)] shadow-lg"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-accent)]/50 hover:bg-[var(--theme-elevated)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[var(--theme-text-primary)]">
                          {theme.name}
                        </span>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-[var(--theme-accent)] text-[var(--theme-bg)]">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Color Palette Dots */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="w-5 h-5 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: theme.colors.pageBg }} title="Page BG" />
                        <span className="w-5 h-5 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: theme.colors.surface }} title="Surface" />
                        <span className="w-5 h-5 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: theme.colors.accent }} title="Accent" />
                        <span className="w-5 h-5 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: theme.colors.profit }} title="Profit" />
                        <span className="w-5 h-5 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: theme.colors.loss }} title="Loss" />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-mono">
                        <span>{theme.colorMode.toUpperCase()}</span>
                        <span>{theme.typography.interfaceFont}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Theme Mode Switcher */}
              <div className="mt-6 p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-3">
                <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase">
                  Color Mode Appearance
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {(["dark", "light", "system"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === "light") {
                          setTheme("light-professional");
                        } else if (mode === "dark") {
                          setTheme("midnight-emerald");
                        }
                      }}
                      className={`py-2 rounded-xl border capitalize transition-all ${
                        draftConfig.colorMode === mode
                          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold shadow"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & DENSITY */}
          {activeTab === "typography" && (
            <div className="space-y-5">
              {/* Interface Font Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase">
                  Interface Font (Labels, Navigation & Headings)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(["Inter", "Manrope", "IBM Plex Sans", "System Sans"] as InterfaceFont[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => updateDraftTypography({ interfaceFont: f })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        draftConfig.typography.interfaceFont === f
                          ? "border-[var(--theme-accent)] bg-[var(--theme-elevated)] text-[var(--theme-accent)] font-bold"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                      }`}
                    >
                      <div className="font-semibold text-sm">{f}</div>
                      <div className="text-[11px] text-[var(--theme-text-muted)]">Clean, readable geometric sans</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Numeric / Trading Font Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase">
                  Numeric & Technical Font (Prices, P&L, Balances)
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["JetBrains Mono", "IBM Plex Mono", "SF Mono / System Mono"] as NumericFont[]).map((nf) => (
                    <button
                      key={nf}
                      onClick={() => updateDraftTypography({ numericFont: nf })}
                      className={`p-3 rounded-xl border text-left font-mono transition-all ${
                        draftConfig.typography.numericFont === nf
                          ? "border-[var(--theme-accent)] bg-[var(--theme-elevated)] text-[var(--theme-accent)] font-bold"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                      }`}
                    >
                      <div className="font-bold text-xs">{nf}</div>
                      <div className="text-[11px] text-[var(--theme-profit)] mt-1">$65,420.50</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Scale Multiplier */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase">
                  Font Scale & Size
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {(["compact", "standard", "large"] as FontScale[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => updateDraftTypography({ fontScale: scale })}
                      className={`py-2.5 rounded-xl border capitalize transition-all ${
                        draftConfig.typography.fontScale === scale
                          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                      }`}
                    >
                      {scale} {scale === "compact" ? "(92%)" : scale === "standard" ? "(100%)" : "(108%)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Density Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase">
                  Interface Layout Density
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {(["compact", "comfortable", "spacious"] as UiDensity[]).map((den) => (
                    <button
                      key={den}
                      onClick={() => updateDraftTypography({ density: den })}
                      className={`py-2.5 rounded-xl border capitalize transition-all ${
                        draftConfig.typography.density === den
                          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] font-bold"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-text-primary)]"
                      }`}
                    >
                      {den}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR SYSTEM */}
          {activeTab === "colors" && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                Semantic Palette Customization
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "pageBg", label: "Page Background", val: draftConfig.colors.pageBg },
                  { key: "surface", label: "Surface / Panel", val: draftConfig.colors.surface },
                  { key: "elevated", label: "Elevated Surface", val: draftConfig.colors.elevated },
                  { key: "border", label: "Border Line", val: draftConfig.colors.border },
                  { key: "textPrimary", label: "Primary Text", val: draftConfig.colors.textPrimary },
                  { key: "textSecondary", label: "Secondary Text", val: draftConfig.colors.textSecondary },
                  { key: "accent", label: "Accent / Focus", val: draftConfig.colors.accent },
                  { key: "profit", label: "Profit / Success", val: draftConfig.colors.profit },
                  { key: "loss", label: "Loss / Danger", val: draftConfig.colors.loss },
                  { key: "warning", label: "Warning / Pending", val: draftConfig.colors.warning },
                  { key: "info", label: "Information", val: draftConfig.colors.info },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--theme-text-primary)]">{item.label}</div>
                      <div className="text-[11px] font-mono text-[var(--theme-text-muted)] uppercase">{item.val}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={item.val.startsWith("#") ? item.val : "#ffffff"}
                        onChange={(e) => updateDraftColors({ [item.key]: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => updateDraftColors({ [item.key]: e.target.value })}
                        className="w-20 px-2 py-1 text-xs font-mono bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Accessibility & Contrast Scorecard */}
              <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--theme-accent)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-primary)]">
                    WCAG Accessibility & Contrast Check
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-1">
                    <div className="text-[11px] text-[var(--theme-text-muted)]">Primary Text on Surface</div>
                    <div className={`font-mono font-bold ${textOnSurfaceRating.isPass ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                      {textOnSurfaceRating.scoreText}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-1">
                    <div className="text-[11px] text-[var(--theme-text-muted)]">Primary Text on Page</div>
                    <div className={`font-mono font-bold ${textOnPageRating.isPass ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                      {textOnPageRating.scoreText}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-1">
                    <div className="text-[11px] text-[var(--theme-text-muted)]">Profit Color on Surface</div>
                    <div className={`font-mono font-bold ${profitOnSurfaceRating.isPass ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                      {profitOnSurfaceRating.scoreText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHARTS & VISUALS */}
          {activeTab === "charts" && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                Chart & Canvas Appearance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--theme-text-primary)]">Bullish Candle Up</div>
                    <div className="text-[11px] font-mono text-[var(--theme-text-muted)] uppercase">{draftConfig.chart.candleUp}</div>
                  </div>
                  <input
                    type="color"
                    value={draftConfig.chart.candleUp}
                    onChange={(e) => updateDraftChart({ candleUp: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--theme-text-primary)]">Bearish Candle Down</div>
                    <div className="text-[11px] font-mono text-[var(--theme-text-muted)] uppercase">{draftConfig.chart.candleDown}</div>
                  </div>
                  <input
                    type="color"
                    value={draftConfig.chart.candleDown}
                    onChange={(e) => updateDraftChart({ candleDown: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              {/* Grid Opacity & Sliders */}
              <div className="space-y-4 p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Grid Opacity</span>
                    <span className="font-mono text-[var(--theme-accent)]">
                      {Math.round(draftConfig.chart.gridOpacity * 100)}%
                    </span>
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

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Line Thickness</span>
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

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Panel Border Radius</span>
                    <span className="font-mono text-[var(--theme-accent)]">{draftConfig.chart.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    step="2"
                    value={draftConfig.chart.borderRadius}
                    onChange={(e) => updateDraftChart({ borderRadius: parseInt(e.target.value) })}
                    className="w-full accent-[var(--theme-accent)]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[var(--theme-border)]">
                  <span className="font-bold">Reduced Motion Preference</span>
                  <button
                    onClick={() => updateDraftChart({ reducedMotion: !draftConfig.chart.reducedMotion })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                      draftConfig.chart.reducedMotion
                        ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)]"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)]"
                    }`}
                  >
                    {draftConfig.chart.reducedMotion ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: IMPORT / EXPORT */}
          {activeTab === "import-export" && (
            <div className="space-y-5 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                Export & Import Theme Configurations
              </h3>

              <div className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-3">
                <div className="font-bold text-[var(--theme-text-primary)]">Export Current Appearance</div>
                <p className="text-[var(--theme-text-secondary)] text-[11px]">
                  Copy your customized theme schema to clipboard to share or backup across instances.
                </p>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] font-bold flex items-center gap-2 transition"
                >
                  {copiedExport ? <CheckCircle2 className="h-4 w-4 text-[var(--theme-profit)]" /> : <Download className="h-4 w-4" />}
                  <span>{copiedExport ? "Copied JSON to Clipboard!" : "Copy Theme JSON"}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-3">
                <div className="font-bold text-[var(--theme-text-primary)]">Import Theme JSON</div>
                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='Paste valid JSON here e.g. { "name": "Custom Theme", "colors": { ... } }'
                  className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 font-mono text-[11px] text-[var(--theme-text-primary)] focus:outline-none"
                />
                {importStatus && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] ${
                      importStatus.success
                        ? "bg-[var(--theme-profit)]/15 border-[var(--theme-profit)] text-[var(--theme-profit)]"
                        : "bg-[var(--theme-loss)]/15 border-[var(--theme-loss)] text-[var(--theme-loss)]"
                    }`}
                  >
                    {importStatus.message}
                  </div>
                )}
                <button
                  onClick={handleImportSubmit}
                  disabled={!importJsonText.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold flex items-center gap-2 disabled:opacity-40 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span>Validate & Preview Theme</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Strip */}
        <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-elevated)] flex flex-wrap items-center justify-between gap-2 font-sans text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={resetCurrentTheme}
              className="px-3 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)] font-semibold flex items-center gap-1.5 transition"
              title="Reset current customizations back to preset defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Preset</span>
            </button>

            <button
              onClick={restoreFactoryDefaults}
              className="px-3 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] transition"
              title="Restore entire platform to factory default theme"
            >
              Factory Defaults
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelDraft}
              className="px-4 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] font-semibold transition"
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                await applyDraft();
                closeAppearanceDrawer();
              }}
              className="px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold shadow-lg shadow-[var(--theme-accent)]/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Apply & Save Theme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
