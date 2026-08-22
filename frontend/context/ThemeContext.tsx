"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  AppearanceConfig,
  ThemeId,
  BUILTIN_THEMES,
  DEFAULT_APPEARANCE_CONFIG,
  ThemeColors,
  TypographyConfig,
  ChartSettings,
  FONT_FAMILY_MAP,
  NUMERIC_FONT_MAP,
  FONT_SCALE_MAP,
  FONT_WEIGHT_MAP,
  DENSITY_MAP,
  validateThemeJson,
} from "@/lib/themeTokens";

interface ThemeContextType {
  config: AppearanceConfig;
  draftConfig: AppearanceConfig;
  isPreviewActive: boolean;
  isDrawerOpen: boolean;
  setTheme: (themeId: ThemeId) => void;
  updateDraftColors: (partial: Partial<ThemeColors>) => void;
  updateDraftTypography: (partial: Partial<TypographyConfig>) => void;
  updateDraftChart: (partial: Partial<ChartSettings>) => void;
  setPreviewActive: (active: boolean) => void;
  applyDraft: () => Promise<void>;
  cancelDraft: () => void;
  resetCurrentTheme: () => void;
  restoreFactoryDefaults: () => Promise<void>;
  openAppearanceDrawer: () => void;
  closeAppearanceDrawer: () => void;
  exportThemeJson: () => string;
  importThemeJson: (jsonStr: string) => { success: boolean; error?: string };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "algo_terminal_appearance_v2";

/**
 * Apply CSS custom properties dynamically to document.documentElement
 */
export function applyCssTokensToDom(config: AppearanceConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Structural & Accent Colors
  root.style.setProperty("--theme-bg", config.colors.pageBg);
  root.style.setProperty("--theme-surface", config.colors.surface);
  root.style.setProperty("--theme-elevated", config.colors.elevated);
  root.style.setProperty("--theme-border", config.colors.border);
  root.style.setProperty("--theme-border-subtle", config.colors.borderSubtle);
  root.style.setProperty("--theme-text-primary", config.colors.textPrimary);
  root.style.setProperty("--theme-text-secondary", config.colors.textSecondary);
  root.style.setProperty("--theme-text-muted", config.colors.textMuted);

  // 2. Financial & Status Semantics
  root.style.setProperty("--theme-accent", config.colors.accent);
  root.style.setProperty("--theme-profit", config.colors.profit);
  root.style.setProperty("--theme-loss", config.colors.loss);
  root.style.setProperty("--theme-warning", config.colors.warning);
  root.style.setProperty("--theme-info", config.colors.info);
  root.style.setProperty("--theme-live", config.colors.live || config.colors.profit);
  root.style.setProperty("--theme-paper", config.colors.paper || config.colors.info);
  root.style.setProperty("--theme-halted", config.colors.halted || config.colors.loss);
  root.style.setProperty("--theme-neutral", config.colors.neutral || config.colors.textMuted);

  // 3. Chart & Radius Settings
  root.style.setProperty("--theme-chart-bg", config.chart.background);
  root.style.setProperty("--theme-chart-grid", config.chart.gridColor);
  root.style.setProperty("--theme-chart-grid-opacity", String(config.chart.gridOpacity));
  root.style.setProperty("--theme-chart-candle-up", config.chart.candleUp);
  root.style.setProperty("--theme-chart-candle-down", config.chart.candleDown);
  root.style.setProperty("--theme-chart-line-thickness", `${config.chart.lineThickness}px`);
  root.style.setProperty("--theme-radius", `${config.chart.borderRadius}px`);
  root.style.setProperty("--theme-radius-sm", `${Math.max(4, config.chart.borderRadius / 2)}px`);
  root.style.setProperty("--theme-radius-lg", `${config.chart.borderRadius + 4}px`);

  // 4. Typography & Font Family Stacks
  const sansFont = FONT_FAMILY_MAP[config.typography.interfaceFont] || FONT_FAMILY_MAP["Inter"];
  const monoFont = NUMERIC_FONT_MAP[config.typography.numericFont] || NUMERIC_FONT_MAP["JetBrains Mono"];
  const scaleInfo = FONT_SCALE_MAP[config.typography.fontScale] || FONT_SCALE_MAP["standard"];
  const densityInfo = DENSITY_MAP[config.typography.density] || DENSITY_MAP["comfortable"];

  root.style.setProperty("--theme-font-sans", sansFont);
  root.style.setProperty("--theme-font-mono", monoFont);
  root.style.setProperty("--theme-font-scale", scaleInfo.scale);
  root.style.setProperty("--theme-base-font-size", scaleInfo.fontSizeModifier);
  root.style.setProperty("--theme-density-padding-y", densityInfo.paddingY);
  root.style.setProperty("--theme-density-padding-x", densityInfo.paddingX);
  root.style.setProperty("--theme-density-gap", densityInfo.gap);
  root.style.setProperty("--theme-table-row-height", densityInfo.tableRowHeight);

  // 5. Dark / Light root class
  if (config.colorMode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE_CONFIG);
  const [draftConfig, setDraftConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE_CONFIG);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Initialize from localStorage and backend
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.colors) {
          const merged: AppearanceConfig = {
            ...DEFAULT_APPEARANCE_CONFIG,
            ...parsed,
            colors: { ...DEFAULT_APPEARANCE_CONFIG.colors, ...parsed.colors },
            typography: { ...DEFAULT_APPEARANCE_CONFIG.typography, ...parsed.typography },
            chart: { ...DEFAULT_APPEARANCE_CONFIG.chart, ...parsed.chart },
          };
          setConfig(merged);
          setDraftConfig(merged);
          applyCssTokensToDom(merged);
        }
      } else {
        applyCssTokensToDom(DEFAULT_APPEARANCE_CONFIG);
      }
    } catch (e) {
      console.warn("Theme storage load warning:", e);
      applyCssTokensToDom(DEFAULT_APPEARANCE_CONFIG);
    }

    // Background sync from backend settings API
    fetch("/api/appearance/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.appearance) {
          const serverConfig: AppearanceConfig = {
            ...DEFAULT_APPEARANCE_CONFIG,
            ...data.appearance,
            colors: { ...DEFAULT_APPEARANCE_CONFIG.colors, ...data.appearance.colors },
            typography: { ...DEFAULT_APPEARANCE_CONFIG.typography, ...data.appearance.typography },
            chart: { ...DEFAULT_APPEARANCE_CONFIG.chart, ...data.appearance.chart },
          };
          setConfig(serverConfig);
          setDraftConfig(serverConfig);
          applyCssTokensToDom(serverConfig);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverConfig));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Update DOM when preview is toggled
  useEffect(() => {
    if (isPreviewActive) {
      applyCssTokensToDom(draftConfig);
    } else {
      applyCssTokensToDom(config);
    }
  }, [isPreviewActive, draftConfig, config]);

  const setTheme = useCallback((themeId: ThemeId) => {
    if (themeId in BUILTIN_THEMES) {
      const selected = BUILTIN_THEMES[themeId as Exclude<ThemeId, "custom">];
      setDraftConfig(selected);
      applyCssTokensToDom(selected);
    }
  }, []);

  const updateDraftColors = useCallback((partial: Partial<ThemeColors>) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        themeId: "custom",
        name: "Custom Theme",
        colors: { ...prev.colors, ...partial },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const updateDraftTypography = useCallback((partial: Partial<TypographyConfig>) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        typography: { ...prev.typography, ...partial },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const updateDraftChart = useCallback((partial: Partial<ChartSettings>) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        chart: { ...prev.chart, ...partial },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const applyDraft = useCallback(async () => {
    setConfig(draftConfig);
    applyCssTokensToDom(draftConfig);
    setIsPreviewActive(false);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draftConfig));
    } catch (e) {
      console.warn("Theme save local error:", e);
    }

    // Persist to server
    try {
      await fetch("/api/appearance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance: draftConfig }),
      });
    } catch (e) {
      console.warn("Theme sync server error:", e);
    }
  }, [draftConfig]);

  const cancelDraft = useCallback(() => {
    setDraftConfig(config);
    applyCssTokensToDom(config);
    setIsPreviewActive(false);
    setIsDrawerOpen(false);
  }, [config]);

  const resetCurrentTheme = useCallback(() => {
    const targetThemeId = config.themeId in BUILTIN_THEMES ? config.themeId : "midnight-emerald";
    const original = BUILTIN_THEMES[targetThemeId as Exclude<ThemeId, "custom">];
    setDraftConfig(original);
    if (isPreviewActive) {
      applyCssTokensToDom(original);
    }
  }, [config.themeId, isPreviewActive]);

  const restoreFactoryDefaults = useCallback(async () => {
    const factory = BUILTIN_THEMES["midnight-emerald"];
    setConfig(factory);
    setDraftConfig(factory);
    applyCssTokensToDom(factory);
    setIsPreviewActive(false);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(factory));
      await fetch("/api/appearance/reset", { method: "POST" });
    } catch (e) {
      console.warn("Reset error:", e);
    }
  }, []);

  const openAppearanceDrawer = useCallback(() => {
    setDraftConfig(config);
    setIsPreviewActive(true);
    setIsDrawerOpen(true);
  }, [config]);

  const closeAppearanceDrawer = useCallback(() => {
    if (isPreviewActive) {
      applyCssTokensToDom(config);
      setIsPreviewActive(false);
    }
    setIsDrawerOpen(false);
  }, [config, isPreviewActive]);

  const exportThemeJson = useCallback(() => {
    return JSON.stringify(draftConfig, null, 2);
  }, [draftConfig]);

  const importThemeJson = useCallback((jsonStr: string) => {
    const res = validateThemeJson(jsonStr);
    if (!res.valid || !res.config) {
      return { success: false, error: res.error || "Failed to validate theme JSON" };
    }
    setDraftConfig(res.config);
    if (isPreviewActive) {
      applyCssTokensToDom(res.config);
    }
    return { success: true };
  }, [isPreviewActive]);

  return (
    <ThemeContext.Provider
      value={{
        config,
        draftConfig,
        isPreviewActive,
        isDrawerOpen,
        setTheme,
        updateDraftColors,
        updateDraftTypography,
        updateDraftChart,
        setPreviewActive: setIsPreviewActive,
        applyDraft,
        cancelDraft,
        resetCurrentTheme,
        restoreFactoryDefaults,
        openAppearanceDrawer,
        closeAppearanceDrawer,
        exportThemeJson,
        importThemeJson,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
