export interface CanonicalTimeframe {
  value: string;
  label: string;
  seconds: number;
  category: "second" | "minute" | "hour" | "day" | "week" | "month" | "custom";
  isStandard?: boolean;
  baseTimeframe?: string;
  status?: "DIRECT" | "AGGREGATED" | "UNSUPPORTED";
}

export const ALL_CANONICAL_TIMEFRAMES: CanonicalTimeframe[] = [
  // Seconds
  { value: "1s", label: "1S", seconds: 1, category: "second", isStandard: true },
  { value: "5s", label: "5S", seconds: 5, category: "second", isStandard: true, baseTimeframe: "1s" },
  { value: "10s", label: "10S", seconds: 10, category: "second", isStandard: true, baseTimeframe: "1s" },
  { value: "15s", label: "15S", seconds: 15, category: "second", isStandard: true, baseTimeframe: "1s" },
  { value: "30s", label: "30S", seconds: 30, category: "second", isStandard: true, baseTimeframe: "1s" },

  // Minutes
  { value: "1m", label: "1M", seconds: 60, category: "minute", isStandard: true },
  { value: "2m", label: "2M", seconds: 120, category: "minute", isStandard: true, baseTimeframe: "1m" },
  { value: "3m", label: "3M", seconds: 180, category: "minute", isStandard: true },
  { value: "5m", label: "5M", seconds: 300, category: "minute", isStandard: true },
  { value: "10m", label: "10M", seconds: 600, category: "minute", isStandard: true, baseTimeframe: "5m" },
  { value: "15m", label: "15M", seconds: 900, category: "minute", isStandard: true },
  { value: "20m", label: "20M", seconds: 1200, category: "minute", isStandard: true, baseTimeframe: "5m" },
  { value: "30m", label: "30M", seconds: 1800, category: "minute", isStandard: true },
  { value: "45m", label: "45M", seconds: 2700, category: "minute", isStandard: true, baseTimeframe: "15m" },

  // Hours
  { value: "1h", label: "1H", seconds: 3600, category: "hour", isStandard: true },
  { value: "2h", label: "2H", seconds: 7200, category: "hour", isStandard: true },
  { value: "3h", label: "3H", seconds: 10800, category: "hour", isStandard: true, baseTimeframe: "1h" },
  { value: "4h", label: "4H", seconds: 14400, category: "hour", isStandard: true },
  { value: "6h", label: "6H", seconds: 21600, category: "hour", isStandard: true },
  { value: "8h", label: "8H", seconds: 28800, category: "hour", isStandard: true },
  { value: "12h", label: "12H", seconds: 43200, category: "hour", isStandard: true },

  // Days
  { value: "1d", label: "1D", seconds: 86400, category: "day", isStandard: true },
  { value: "2d", label: "2D", seconds: 172800, category: "day", isStandard: true, baseTimeframe: "1d" },
  { value: "3d", label: "3D", seconds: 259200, category: "day", isStandard: true },

  // Weeks
  { value: "1w", label: "1W", seconds: 604800, category: "week", isStandard: true },
  { value: "2w", label: "2W", seconds: 1209600, category: "week", isStandard: true, baseTimeframe: "1w" },

  // Months
  { value: "1M", label: "1MO", seconds: 2592000, category: "month", isStandard: true },
  { value: "3M", label: "3MO", seconds: 7776000, category: "month", isStandard: true, baseTimeframe: "1M" },
  { value: "6M", label: "6MO", seconds: 15552000, category: "month", isStandard: true, baseTimeframe: "1M" },
  { value: "12M", label: "12MO", seconds: 31104000, category: "month", isStandard: true, baseTimeframe: "1M" },
];

export const DEFAULT_TOOLBAR_PRESETS = [
  "1s",
  "5s",
  "15s",
  "30s",
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
  "1w",
];

export function formatTimeframeLabel(tf: string): string {
  const found = ALL_CANONICAL_TIMEFRAMES.find(
    (t) => t.value.toLowerCase() === (tf || "").toLowerCase()
  );
  if (found) return found.label;
  return (tf || "5m").toUpperCase();
}
