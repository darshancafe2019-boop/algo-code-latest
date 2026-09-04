/**
 * Institutional Trading Terminal Theme & Design System Tokens
 * =============================================================
 * Single Source of Truth for Quant.OS Appearance Customization.
 */

export type ThemePreset =
  | "obsidian-blue"
  | "midnight-emerald"
  | "graphite"
  | "light-professional";

export type ThemeId =
  | ThemePreset
  | "graphite-violet" // legacy alias for graphite
  | "high-contrast"   // legacy alias
  | "custom";

export type AppearanceMode = "dark" | "light" | "system";
export type Density = "compact" | "comfortable";
export type TextSize = "small" | "default" | "large";
export type Accent = "blue" | "cyan" | "green" | "violet";
export type ChartStyle = "candles" | "hollow" | "bars" | "line";

export type InterfaceFont =
  | "Inter"
  | "Manrope"
  | "IBM Plex Sans"
  | "System Sans";

export type NumericFont =
  | "JetBrains Mono"
  | "IBM Plex Mono"
  | "SF Mono / System Mono";

export type FontWeightEmphasis = "regular" | "medium" | "bold";

export interface ThemeColors {
  pageBg: string;
  surface: string;
  elevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  profit: string;
  loss: string;
  warning: string;
  info: string;
  live: string;
  paper: string;
  halted: string;
  neutral: string;
}

export interface ChartSettings {
  style: ChartStyle;
  background: string;
  gridColor: string;
  gridOpacity: number; // 0 to 1
  candleUp: string;
  candleDown: string;
  lineThickness: number; // 1 to 4
  borderRadius: number; // 0 to 24px
  volumeOpacity: number; // 0.1 to 1
  reducedMotion: boolean;
}

export interface TypographyConfig {
  interfaceFont: InterfaceFont;
  numericFont: NumericFont;
  fontScale: TextSize;
  fontWeight: FontWeightEmphasis;
  density: Density;
}

export interface AppearanceConfig {
  themeId: ThemeId;
  name: string;
  colorMode: AppearanceMode;
  accent: Accent;
  colors: ThemeColors;
  typography: TypographyConfig;
  chart: ChartSettings;
  highContrast: boolean;
  version: number;
}

// ----------------------------------------------------------------------
// 4 Primary Accent Color Swatches
// ----------------------------------------------------------------------

export const ACCENT_SWATCHES: Record<
  Accent,
  { name: string; hex: string; bgSoft: string; border: string; glow: string }
> = {
  blue: {
    name: "Sky Blue",
    hex: "#38BDF8",
    bgSoft: "rgba(56, 189, 248, 0.12)",
    border: "#0284C7",
    glow: "rgba(56, 189, 248, 0.25)",
  },
  cyan: {
    name: "Electric Cyan",
    hex: "#06B6D4",
    bgSoft: "rgba(6, 182, 212, 0.12)",
    border: "#0891B2",
    glow: "rgba(6, 182, 212, 0.25)",
  },
  green: {
    name: "Emerald",
    hex: "#10B981",
    bgSoft: "rgba(16, 185, 129, 0.12)",
    border: "#059669",
    glow: "rgba(16, 185, 129, 0.25)",
  },
  violet: {
    name: "Neon Violet",
    hex: "#8B5CF6",
    bgSoft: "rgba(139, 92, 246, 0.12)",
    border: "#7C3AED",
    glow: "rgba(139, 92, 246, 0.25)",
  },
};

// ----------------------------------------------------------------------
// Exactly 4 Built-in Institutional Themes
// ----------------------------------------------------------------------

export const BUILTIN_THEMES: Record<ThemePreset, AppearanceConfig> = {
  "obsidian-blue": {
    themeId: "obsidian-blue",
    name: "Obsidian Slate",
    colorMode: "dark",
    accent: "blue",
    colors: {
      pageBg: "#080C14",
      surface: "#0D1526",
      elevated: "#142138",
      border: "#1E2C44",
      borderSubtle: "#121C2E",
      textPrimary: "#F8FAFC",
      textSecondary: "#94A3B8",
      textMuted: "#64748B",
      accent: "#38BDF8",
      profit: "#10B981",
      loss: "#F43F5E",
      warning: "#F59E0B",
      info: "#38BDF8",
      live: "#10B981",
      paper: "#38BDF8",
      halted: "#F43F5E",
      neutral: "#64748B",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "default",
      fontWeight: "medium",
      density: "compact",
    },
    chart: {
      style: "candles",
      background: "#080C14",
      gridColor: "#1E2C44",
      gridOpacity: 0.25,
      candleUp: "#10B981",
      candleDown: "#F43F5E",
      lineThickness: 2,
      borderRadius: 14,
      volumeOpacity: 0.6,
      reducedMotion: false,
    },
    highContrast: false,
    version: 4,
  },

  "midnight-emerald": {
    themeId: "midnight-emerald",
    name: "Midnight Emerald",
    colorMode: "dark",
    accent: "green",
    colors: {
      pageBg: "#060E0A",
      surface: "#0B1812",
      elevated: "#11261D",
      border: "#183B2C",
      borderSubtle: "#0F261C",
      textPrimary: "#F8FAFC",
      textSecondary: "#94A3B8",
      textMuted: "#64748B",
      accent: "#10B981",
      profit: "#10B981",
      loss: "#F43F5E",
      warning: "#F59E0B",
      info: "#38BDF8",
      live: "#10B981",
      paper: "#38BDF8",
      halted: "#F43F5E",
      neutral: "#64748B",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "default",
      fontWeight: "medium",
      density: "compact",
    },
    chart: {
      style: "candles",
      background: "#060E0A",
      gridColor: "#183B2C",
      gridOpacity: 0.25,
      candleUp: "#10B981",
      candleDown: "#F43F5E",
      lineThickness: 2,
      borderRadius: 14,
      volumeOpacity: 0.6,
      reducedMotion: false,
    },
    highContrast: false,
    version: 4,
  },

  graphite: {
    themeId: "graphite",
    name: "Graphite Studio",
    colorMode: "dark",
    accent: "violet",
    colors: {
      pageBg: "#09090C",
      surface: "#111116",
      elevated: "#1A1A22",
      border: "#252530",
      borderSubtle: "#181820",
      textPrimary: "#F8FAFC",
      textSecondary: "#94A3B8",
      textMuted: "#64748B",
      accent: "#8B5CF6",
      profit: "#10B981",
      loss: "#F43F5E",
      warning: "#F59E0B",
      info: "#818CF8",
      live: "#10B981",
      paper: "#818CF8",
      halted: "#F43F5E",
      neutral: "#64748B",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "default",
      fontWeight: "medium",
      density: "compact",
    },
    chart: {
      style: "candles",
      background: "#0B0B0E",
      gridColor: "#2C2C35",
      gridOpacity: 0.35,
      candleUp: "#34D399",
      candleDown: "#FB7185",
      lineThickness: 2,
      borderRadius: 14,
      volumeOpacity: 0.6,
      reducedMotion: false,
    },
    highContrast: false,
    version: 4,
  },

  "light-professional": {
    themeId: "light-professional",
    name: "Light Professional",
    colorMode: "light",
    accent: "blue",
    colors: {
      pageBg: "#F4F7FB",
      surface: "#FFFFFF",
      elevated: "#EDF2F7",
      border: "#CBD5E1",
      borderSubtle: "#E2E8F0",
      textPrimary: "#111827",
      textSecondary: "#475569",
      textMuted: "#94A3B8",
      accent: "#1368E8",
      profit: "#078A55",
      loss: "#D92D20",
      warning: "#A15C00",
      info: "#0284C7",
      live: "#078A55",
      paper: "#0284C7",
      halted: "#D92D20",
      neutral: "#64748B",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "default",
      fontWeight: "medium",
      density: "compact",
    },
    chart: {
      style: "candles",
      background: "#FFFFFF",
      gridColor: "#E2E8F0",
      gridOpacity: 0.65,
      candleUp: "#078A55",
      candleDown: "#D92D20",
      lineThickness: 2,
      borderRadius: 14,
      volumeOpacity: 0.6,
      reducedMotion: false,
    },
    highContrast: false,
    version: 4,
  },
};

// Aliases for backwards compatibility
(BUILTIN_THEMES as any)["graphite-violet"] = BUILTIN_THEMES.graphite;
(BUILTIN_THEMES as any)["high-contrast"] = BUILTIN_THEMES["obsidian-blue"];

export const DEFAULT_APPEARANCE_CONFIG: AppearanceConfig = BUILTIN_THEMES["obsidian-blue"];

// ----------------------------------------------------------------------
// Typography & Layout Density Lookups
// ----------------------------------------------------------------------

export const FONT_FAMILY_MAP: Record<InterfaceFont, string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  Manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "IBM Plex Sans": "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "System Sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export const NUMERIC_FONT_MAP: Record<NumericFont, string> = {
  "JetBrains Mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "IBM Plex Mono": "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "SF Mono / System Mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
};

export const FONT_SCALE_MAP: Record<TextSize, { scale: string; fontSizeModifier: string }> = {
  small: { scale: "0.92", fontSizeModifier: "13px" },
  default: { scale: "1.00", fontSizeModifier: "14px" },
  large: { scale: "1.08", fontSizeModifier: "15.5px" },
};

export const FONT_WEIGHT_MAP: Record<FontWeightEmphasis, { base: string; heading: string; number: string }> = {
  regular: { base: "400", heading: "600", number: "500" },
  medium: { base: "500", heading: "600", number: "600" },
  bold: { base: "500", heading: "700", number: "700" },
};

export const DENSITY_MAP: Record<Density, { paddingY: string; paddingX: string; gap: string; tableRowHeight: string }> = {
  compact: { paddingY: "0.35rem", paddingX: "0.5rem", gap: "0.375rem", tableRowHeight: "2rem" },
  comfortable: { paddingY: "0.6rem", paddingX: "0.85rem", gap: "0.625rem", tableRowHeight: "2.5rem" },
};

// ----------------------------------------------------------------------
// WCAG Contrast Utilities
// ----------------------------------------------------------------------

function parseHex(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = parseHex(foregroundHex);
  const bg = parseHex(backgroundHex);

  const lum1 = getLuminance(fg.r, fg.g, fg.b);
  const lum2 = getLuminance(bg.r, bg.g, bg.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

export function getContrastRating(ratio: number): {
  level: "AAA" | "AA" | "AA Large" | "FAIL";
  isPass: boolean;
  scoreText: string;
} {
  const r = Math.round(ratio * 10) / 10;
  if (r >= 7.0) {
    return { level: "AAA", isPass: true, scoreText: `${r}:1 (WCAG AAA Pass)` };
  } else if (r >= 4.5) {
    return { level: "AA", isPass: true, scoreText: `${r}:1 (WCAG AA Pass)` };
  } else if (r >= 3.0) {
    return { level: "AA Large", isPass: true, scoreText: `${r}:1 (AA Large Text Only)` };
  } else {
    return { level: "FAIL", isPass: false, scoreText: `${r}:1 (Low Contrast Warning)` };
  }
}

// ----------------------------------------------------------------------
// Export & Import Validation
// ----------------------------------------------------------------------

export function validateThemeJson(jsonStr: string): { valid: boolean; config?: AppearanceConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") {
      return { valid: false, error: "JSON must be an object." };
    }
    if (!parsed.colors || typeof parsed.colors !== "object") {
      return { valid: false, error: "Theme colors object is missing." };
    }
    const requiredColors = ["pageBg", "surface", "border", "textPrimary", "accent", "profit", "loss"];
    for (const k of requiredColors) {
      if (!parsed.colors[k] || typeof parsed.colors[k] !== "string") {
        return { valid: false, error: `Missing required color key: '${k}'.` };
      }
    }

    const config: AppearanceConfig = {
      themeId: "custom",
      name: parsed.name || "Custom Imported Theme",
      colorMode: parsed.colorMode === "light" ? "light" : "dark",
      accent: parsed.accent || "blue",
      colors: {
        ...DEFAULT_APPEARANCE_CONFIG.colors,
        ...parsed.colors,
      },
      typography: {
        ...DEFAULT_APPEARANCE_CONFIG.typography,
        ...(parsed.typography || {}),
      },
      chart: {
        ...DEFAULT_APPEARANCE_CONFIG.chart,
        ...(parsed.chart || {}),
      },
      highContrast: Boolean(parsed.highContrast),
      version: parsed.version || 3,
    };

    return { valid: true, config };
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}
