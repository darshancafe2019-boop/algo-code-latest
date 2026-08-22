/**
 * Institutional Trading Terminal Theme & Design System Tokens
 */

export type ThemeId =
  | "jarvis-core"
  | "ultron-core"
  | "midnight-emerald"
  | "obsidian-blue"
  | "graphite-violet"
  | "light-professional"
  | "high-contrast"
  | "custom";

export type InterfaceFont =
  | "Inter"
  | "Manrope"
  | "IBM Plex Sans"
  | "System Sans";

export type NumericFont =
  | "JetBrains Mono"
  | "IBM Plex Mono"
  | "SF Mono / System Mono";

export type FontScale = "compact" | "standard" | "large";
export type FontWeightEmphasis = "regular" | "medium" | "bold";
export type UiDensity = "compact" | "comfortable" | "spacious";
export type ColorMode = "dark" | "light" | "system";

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
  background: string;
  gridColor: string;
  gridOpacity: number; // 0 to 1
  candleUp: string;
  candleDown: string;
  lineThickness: number; // 1 to 4
  borderRadius: number; // 0 to 24px
  reducedMotion: boolean;
}

export interface TypographyConfig {
  interfaceFont: InterfaceFont;
  numericFont: NumericFont;
  fontScale: FontScale;
  fontWeight: FontWeightEmphasis;
  density: UiDensity;
}

export interface AppearanceConfig {
  themeId: ThemeId;
  name: string;
  colorMode: ColorMode;
  colors: ThemeColors;
  typography: TypographyConfig;
  chart: ChartSettings;
  version: number;
}

// ----------------------------------------------------------------------
// Built-in Themes Definitions (JARVIS CORE, ULTRON CORE, & Classics)
// ----------------------------------------------------------------------

export const BUILTIN_THEMES: Record<Exclude<ThemeId, "custom">, AppearanceConfig> = {
  "jarvis-core": {
    themeId: "jarvis-core",
    name: "JARVIS CORE (AI Intelligence)",
    colorMode: "dark",
    colors: {
      pageBg: "#060B13",
      surface: "#0B1528",
      elevated: "#0F1D36",
      border: "#1D355E",
      borderSubtle: "#122442",
      textPrimary: "#F0F6FC",
      textSecondary: "#9DB2CE",
      textMuted: "#5F7597",
      accent: "#00E5FF",
      profit: "#00F2A9",
      loss: "#FF4757",
      warning: "#FFB800",
      info: "#38BDF8",
      live: "#00F2A9",
      paper: "#38BDF8",
      halted: "#FF4757",
      neutral: "#5F7597",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#060B13",
      gridColor: "#13233E",
      gridOpacity: 0.35,
      candleUp: "#00F2A9",
      candleDown: "#FF4757",
      lineThickness: 2,
      borderRadius: 14,
      reducedMotion: false,
    },
    version: 2,
  },

  "ultron-core": {
    themeId: "ultron-core",
    name: "ULTRON CORE (Tactical Execution)",
    colorMode: "dark",
    colors: {
      pageBg: "#08080A",
      surface: "#111114",
      elevated: "#18181D",
      border: "#2E2E38",
      borderSubtle: "#1E1E26",
      textPrimary: "#FAFAFA",
      textSecondary: "#A1A1AA",
      textMuted: "#71717A",
      accent: "#FF1E44",
      profit: "#00E676",
      loss: "#FF1744",
      warning: "#FFC107",
      info: "#00B0FF",
      live: "#00E676",
      paper: "#00B0FF",
      halted: "#FF1744",
      neutral: "#71717A",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#08080A",
      gridColor: "#24242E",
      gridOpacity: 0.4,
      candleUp: "#00E676",
      candleDown: "#FF1744",
      lineThickness: 2,
      borderRadius: 12,
      reducedMotion: false,
    },
    version: 2,
  },

  "midnight-emerald": {
    themeId: "midnight-emerald",
    name: "Midnight Emerald",
    colorMode: "dark",
    colors: {
      pageBg: "#07110D",
      surface: "#0D1B15",
      elevated: "#12241C",
      border: "#1E4432",
      borderSubtle: "#142D21",
      textPrimary: "#F3F7F4",
      textSecondary: "#A9B8AF",
      textMuted: "#70877A",
      accent: "#2FD07F",
      profit: "#3DDC97",
      loss: "#FF647C",
      warning: "#F4B942",
      info: "#4DA3FF",
      live: "#3DDC97",
      paper: "#4DA3FF",
      halted: "#FF647C",
      neutral: "#70877A",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#07110D",
      gridColor: "#1E4432",
      gridOpacity: 0.35,
      candleUp: "#3DDC97",
      candleDown: "#FF647C",
      lineThickness: 2,
      borderRadius: 16,
      reducedMotion: false,
    },
    version: 2,
  },

  "obsidian-blue": {
    themeId: "obsidian-blue",
    name: "Obsidian Blue",
    colorMode: "dark",
    colors: {
      pageBg: "#070B14",
      surface: "#0E1626",
      elevated: "#15213A",
      border: "#233553",
      borderSubtle: "#18263E",
      textPrimary: "#F4F7FB",
      textSecondary: "#A9B6CA",
      textMuted: "#6B7B94",
      accent: "#4F8CFF",
      profit: "#34D399",
      loss: "#FB7185",
      warning: "#FBBF24",
      info: "#38BDF8",
      live: "#34D399",
      paper: "#38BDF8",
      halted: "#FB7185",
      neutral: "#6B7B94",
    },
    typography: {
      interfaceFont: "Inter",
      numericFont: "JetBrains Mono",
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#070B14",
      gridColor: "#233553",
      gridOpacity: 0.4,
      candleUp: "#34D399",
      candleDown: "#FB7185",
      lineThickness: 2,
      borderRadius: 16,
      reducedMotion: false,
    },
    version: 2,
  },

  "graphite-violet": {
    themeId: "graphite-violet",
    name: "Graphite Violet",
    colorMode: "dark",
    colors: {
      pageBg: "#0E0E12",
      surface: "#17171F",
      elevated: "#20202B",
      border: "#343446",
      borderSubtle: "#242433",
      textPrimary: "#F7F5FF",
      textSecondary: "#B8B4C7",
      textMuted: "#79758B",
      accent: "#8B5CF6",
      profit: "#32D49A",
      loss: "#FF667D",
      warning: "#F4B942",
      info: "#A78BFA",
      live: "#32D49A",
      paper: "#A78BFA",
      halted: "#FF667D",
      neutral: "#79758B",
    },
    typography: {
      interfaceFont: "Manrope",
      numericFont: "IBM Plex Mono",
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#0E0E12",
      gridColor: "#343446",
      gridOpacity: 0.35,
      candleUp: "#32D49A",
      candleDown: "#FF667D",
      lineThickness: 2,
      borderRadius: 16,
      reducedMotion: false,
    },
    version: 2,
  },

  "light-professional": {
    themeId: "light-professional",
    name: "Light Professional",
    colorMode: "light",
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
      fontScale: "standard",
      fontWeight: "medium",
      density: "comfortable",
    },
    chart: {
      background: "#FFFFFF",
      gridColor: "#E2E8F0",
      gridOpacity: 0.7,
      candleUp: "#078A55",
      candleDown: "#D92D20",
      lineThickness: 2,
      borderRadius: 14,
      reducedMotion: false,
    },
    version: 2,
  },

  "high-contrast": {
    themeId: "high-contrast",
    name: "High Contrast (WCAG AAA)",
    colorMode: "dark",
    colors: {
      pageBg: "#000000",
      surface: "#0A0A0A",
      elevated: "#141414",
      border: "#404040",
      borderSubtle: "#262626",
      textPrimary: "#FFFFFF",
      textSecondary: "#D4D4D4",
      textMuted: "#A3A3A3",
      accent: "#00E5FF",
      profit: "#00FF66",
      loss: "#FF1744",
      warning: "#FFEA00",
      info: "#00E5FF",
      live: "#00FF66",
      paper: "#00E5FF",
      halted: "#FF1744",
      neutral: "#A3A3A3",
    },
    typography: {
      interfaceFont: "IBM Plex Sans",
      numericFont: "JetBrains Mono",
      fontScale: "large",
      fontWeight: "bold",
      density: "spacious",
    },
    chart: {
      background: "#000000",
      gridColor: "#404040",
      gridOpacity: 0.6,
      candleUp: "#00FF66",
      candleDown: "#FF1744",
      lineThickness: 3,
      borderRadius: 8,
      reducedMotion: true,
    },
    version: 2,
  },
};

export const DEFAULT_APPEARANCE_CONFIG: AppearanceConfig = BUILTIN_THEMES["jarvis-core"];

// ----------------------------------------------------------------------
// Typography Family Stacks
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

export const FONT_SCALE_MAP: Record<FontScale, { scale: string; fontSizeModifier: string }> = {
  compact: { scale: "0.92", fontSizeModifier: "13px" },
  standard: { scale: "1.00", fontSizeModifier: "14px" },
  large: { scale: "1.08", fontSizeModifier: "15.5px" },
};

export const FONT_WEIGHT_MAP: Record<FontWeightEmphasis, { base: string; heading: string; number: string }> = {
  regular: { base: "400", heading: "600", number: "500" },
  medium: { base: "500", heading: "600", number: "600" },
  bold: { base: "500", heading: "700", number: "700" },
};

export const DENSITY_MAP: Record<UiDensity, { paddingY: string; paddingX: string; gap: string; tableRowHeight: string }> = {
  compact: { paddingY: "0.35rem", paddingX: "0.5rem", gap: "0.375rem", tableRowHeight: "2rem" },
  comfortable: { paddingY: "0.6rem", paddingX: "0.85rem", gap: "0.625rem", tableRowHeight: "2.5rem" },
  spacious: { paddingY: "0.85rem", paddingX: "1.1rem", gap: "0.875rem", tableRowHeight: "3rem" },
};

// ----------------------------------------------------------------------
// WCAG Relative Luminance & Contrast Calculation
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
// Export & Import Validator
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
      version: parsed.version || 2,
    };

    return { valid: true, config };
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}
