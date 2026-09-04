"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  AppearanceConfig,
  ThemePreset,
  ThemeId,
  AppearanceMode,
  Density,
  TextSize,
  Accent,
  ChartStyle,
  BUILTIN_THEMES,
  DEFAULT_APPEARANCE_CONFIG,
  ACCENT_SWATCHES,
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
  setTheme: (themeId: ThemeId | ThemePreset) => void;
  setMode: (mode: AppearanceMode) => void;
  setDensity: (density: Density) => void;
  setTextSize: (size: TextSize) => void;
  setAccent: (accent: Accent) => void;
  setChartStyle: (style: ChartStyle) => void;
  setHighContrast: (enabled: boolean) => void;
  updateDraftColors: (partial: Partial<ThemeColors>) => void;
  updateDraftTypography: (partial: Partial<TypographyConfig>) => void;
  updateDraftChart: (partial: Partial<ChartSettings>) => void;
  setPreviewActive: (active: boolean) => void;
  applyDraft: () => Promise<void>;
  cancelDraft: () => void;
  resetToDefaults: () => Promise<void>;
  openAppearanceDrawer: () => void;
  closeAppearanceDrawer: () => void;
  exportThemeJson: () => string;
  importThemeJson: (jsonStr: string) => { success: boolean; error?: string };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "quantos_appearance_v3";

/**
 * Apply CSS custom properties dynamically to document.documentElement
 */
export function applyCssTokensToDom(config: AppearanceConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Structural Colors
  root.style.setProperty("--theme-bg", config.colors.pageBg);
  root.style.setProperty("--theme-surface", config.colors.surface);
  root.style.setProperty("--theme-elevated", config.colors.elevated);
  root.style.setProperty("--theme-border", config.colors.border);
  root.style.setProperty("--theme-border-subtle", config.colors.borderSubtle);
  root.style.setProperty("--theme-text-primary", config.colors.textPrimary);
  root.style.setProperty("--theme-text-secondary", config.colors.textSecondary);
  root.style.setProperty("--theme-text-muted", config.colors.textMuted);

  // 2. Primary Accent Swatch
  const accentInfo = ACCENT_SWATCHES[config.accent] || ACCENT_SWATCHES.blue;
  const activeAccentHex = config.colors.accent || accentInfo.hex;
  root.style.setProperty("--theme-accent", activeAccentHex);
  root.style.setProperty("--theme-accent-soft", accentInfo.bgSoft);
  root.style.setProperty("--theme-accent-border", accentInfo.border);
  root.style.setProperty("--theme-accent-glow", accentInfo.glow);

  // 3. Financial & Status Semantics (STRICT PROTECTED CONSTANTS)
  root.style.setProperty("--theme-profit", config.colors.profit);
  root.style.setProperty("--theme-loss", config.colors.loss);
  root.style.setProperty("--theme-warning", config.colors.warning);
  root.style.setProperty("--theme-info", config.colors.info);
  root.style.setProperty("--theme-live", config.colors.live || config.colors.profit);
  root.style.setProperty("--theme-paper", config.colors.paper || config.colors.info);
  root.style.setProperty("--theme-halted", config.colors.halted || config.colors.loss);
  root.style.setProperty("--theme-neutral", config.colors.neutral || config.colors.textMuted);

  // 4. Chart Settings
  root.style.setProperty("--theme-chart-bg", config.chart.background);
  root.style.setProperty("--theme-chart-grid", config.chart.gridColor);
  root.style.setProperty("--theme-chart-grid-opacity", String(config.chart.gridOpacity));
  root.style.setProperty("--theme-chart-candle-up", config.chart.candleUp);
  root.style.setProperty("--theme-chart-candle-down", config.chart.candleDown);
  root.style.setProperty("--theme-chart-line-thickness", `${config.chart.lineThickness}px`);
  root.style.setProperty("--theme-radius", `${config.chart.borderRadius}px`);
  root.style.setProperty("--theme-radius-sm", `${Math.max(4, config.chart.borderRadius / 2)}px`);
  root.style.setProperty("--theme-radius-lg", `${config.chart.borderRadius + 4}px`);

  // 5. Typography & Font Family Stacks
  const sansFont = FONT_FAMILY_MAP[config.typography.interfaceFont] || FONT_FAMILY_MAP["Inter"];
  const monoFont = NUMERIC_FONT_MAP[config.typography.numericFont] || NUMERIC_FONT_MAP["JetBrains Mono"];
  const scaleInfo = FONT_SCALE_MAP[config.typography.fontScale] || FONT_SCALE_MAP["default"];
  const densityInfo = DENSITY_MAP[config.typography.density] || DENSITY_MAP["compact"];

  root.style.setProperty("--theme-font-sans", sansFont);
  root.style.setProperty("--theme-font-mono", monoFont);
  root.style.setProperty("--theme-font-scale", scaleInfo.scale);
  root.style.setProperty("--theme-base-font-size", scaleInfo.fontSizeModifier);
  root.style.setProperty("--theme-density-padding-y", densityInfo.paddingY);
  root.style.setProperty("--theme-density-padding-x", densityInfo.paddingX);
  root.style.setProperty("--theme-density-gap", densityInfo.gap);
  root.style.setProperty("--theme-table-row-height", densityInfo.tableRowHeight);

  // 6. High Contrast Mode Toggle
  if (config.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // 7. Dark / Light Root Class
  if (config.colorMode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else if (config.colorMode === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    // System Mode: Detect OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE_CONFIG);
  const [draftConfig, setDraftConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE_CONFIG);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Initialize from localStorage with migration
  useEffect(() => {
    try {
      // Clear obsolete legacy keys
      localStorage.removeItem("algo_terminal_appearance_v2");
      localStorage.removeItem("quantos_appearance_v2");

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.colors) {
          const isBuiltin = parsed.themeId && parsed.themeId in BUILTIN_THEMES;
          const isOutdated = !parsed.version || parsed.version < 4;

          const baseTheme = isBuiltin
            ? BUILTIN_THEMES[parsed.themeId as ThemePreset]
            : DEFAULT_APPEARANCE_CONFIG;

          const merged: AppearanceConfig = {
            ...baseTheme,
            ...parsed,
            colors: isOutdated && isBuiltin ? { ...baseTheme.colors } : { ...baseTheme.colors, ...parsed.colors },
            typography: { ...baseTheme.typography, ...parsed.typography },
            chart: { ...baseTheme.chart, ...parsed.chart },
            version: 4,
          };

          if (merged.themeId !== "custom" && !(merged.themeId in BUILTIN_THEMES)) {
            merged.themeId = "obsidian-blue";
            merged.name = BUILTIN_THEMES["obsidian-blue"].name;
            merged.colors = { ...BUILTIN_THEMES["obsidian-blue"].colors };
          }
          setConfig(merged);
          setDraftConfig(merged);
          applyCssTokensToDom(merged);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return;
        }
      }
      applyCssTokensToDom(DEFAULT_APPEARANCE_CONFIG);
    } catch (e) {
      console.warn("Theme storage load warning:", e);
      applyCssTokensToDom(DEFAULT_APPEARANCE_CONFIG);
    }
  }, []);

  // Update DOM when preview is toggled
  useEffect(() => {
    if (isPreviewActive) {
      applyCssTokensToDom(draftConfig);
    } else {
      applyCssTokensToDom(config);
    }
  }, [isPreviewActive, draftConfig, config]);

  const setTheme = useCallback((themeId: ThemeId | ThemePreset | string) => {
    const canonicalId =
      themeId === "graphite-violet"
        ? "graphite"
        : themeId === "high-contrast"
        ? "obsidian-blue"
        : (themeId as ThemePreset);

    if (canonicalId in BUILTIN_THEMES) {
      const selected = BUILTIN_THEMES[canonicalId];
      setDraftConfig((prev) => {
        const updated: AppearanceConfig = {
          ...selected,
          accent: prev.accent || selected.accent,
          typography: {
            ...selected.typography,
            density: prev.typography.density,
            fontScale: prev.typography.fontScale,
          },
          chart: {
            ...selected.chart,
            style: prev.chart.style,
          },
        };
        applyCssTokensToDom(updated);
        return updated;
      });
    }
  }, []);

  const setMode = useCallback((mode: AppearanceMode) => {
    setDraftConfig((prev) => {
      let updatedThemeId = prev.themeId;
      if (mode === "light" && prev.themeId !== "light-professional") {
        updatedThemeId = "light-professional";
      } else if (mode === "dark" && prev.themeId === "light-professional") {
        updatedThemeId = "obsidian-blue";
      }

      const baseTheme = BUILTIN_THEMES[updatedThemeId as ThemePreset] || BUILTIN_THEMES["obsidian-blue"];
      const updated: AppearanceConfig = {
        ...prev,
        themeId: updatedThemeId,
        name: baseTheme.name,
        colorMode: mode,
        colors: { ...baseTheme.colors },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const setDensity = useCallback((density: Density) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        typography: { ...prev.typography, density },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const setTextSize = useCallback((size: TextSize) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        typography: { ...prev.typography, fontScale: size },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const setAccent = useCallback((accent: Accent) => {
    const swatch = ACCENT_SWATCHES[accent] || ACCENT_SWATCHES.blue;
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        accent,
        colors: {
          ...prev.colors,
          accent: swatch.hex,
        },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const setChartStyle = useCallback((style: ChartStyle) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        chart: { ...prev.chart, style },
      };
      applyCssTokensToDom(updated);
      return updated;
    });
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setDraftConfig((prev) => {
      const updated: AppearanceConfig = {
        ...prev,
        highContrast: enabled,
      };
      applyCssTokensToDom(updated);
      return updated;
    });
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
  }, [draftConfig]);

  const cancelDraft = useCallback(() => {
    setDraftConfig(config);
    applyCssTokensToDom(config);
    setIsPreviewActive(false);
    setIsDrawerOpen(false);
  }, [config]);

  const resetToDefaults = useCallback(async () => {
    const factory = BUILTIN_THEMES["obsidian-blue"];
    setConfig(factory);
    setDraftConfig(factory);
    applyCssTokensToDom(factory);
    setIsPreviewActive(false);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(factory));
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
        setMode,
        setDensity,
        setTextSize,
        setAccent,
        setChartStyle,
        setHighContrast,
        updateDraftColors,
        updateDraftTypography,
        updateDraftChart,
        setPreviewActive: setIsPreviewActive,
        applyDraft,
        cancelDraft,
        resetToDefaults,
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
