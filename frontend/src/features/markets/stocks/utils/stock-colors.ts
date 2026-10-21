/**
 * Semantic Color Definitions for Stocks
 * =====================================
 */

export function getTrendColor(bias?: string): { bg: string; text: string; border: string } {
  switch (bias?.toUpperCase()) {
    case "STRONG_BULLISH":
      return { bg: "bg-emerald-500/15", text: "text-emerald-300 font-extrabold", border: "border-emerald-500/40" };
    case "BULLISH":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400 font-bold", border: "border-emerald-500/30" };
    case "STRONG_BEARISH":
      return { bg: "bg-rose-500/15", text: "text-rose-300 font-extrabold", border: "border-rose-500/40" };
    case "BEARISH":
      return { bg: "bg-rose-500/10", text: "text-rose-400 font-bold", border: "border-rose-500/30" };
    default:
      return { bg: "bg-slate-800/60", text: "text-slate-400 font-medium", border: "border-slate-700/60" };
  }
}

export function getDataQualityBadge(
  quality?: string,
  dataAgeMs?: number | null,
  timestamp?: string | null
): { bg: string; text: string; border: string; label: string } {
  let ageSec = 0;
  if (dataAgeMs != null && dataAgeMs > 0) {
    ageSec = Math.floor(dataAgeMs / 1000);
  } else if (timestamp) {
    try {
      const ts = new Date(timestamp).getTime();
      if (!isNaN(ts)) {
        ageSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      }
    } catch {}
  }

  const q = quality?.toUpperCase();
  if (q === "MARKET_CLOSED") {
    return { bg: "bg-slate-800/80", text: "text-slate-400 font-bold", border: "border-slate-700", label: "CLOSED" };
  }

  if (q === "PROVIDER_DOWN") {
    return { bg: "bg-rose-500/10", text: "text-rose-400 font-bold", border: "border-rose-500/30", label: "DOWN" };
  }

  // A row is LIVE only if its timestamp is under 15s old; otherwise show STALE with the age
  if (ageSec <= 15 && (q === "LIVE" || q == null || q === "REAL_TIME")) {
    return { bg: "bg-emerald-500/10", text: "text-emerald-400 font-bold", border: "border-emerald-500/30", label: "LIVE" };
  }

  const ageStr = ageSec > 0 ? `STALE (${ageSec}s)` : "STALE";
  return { bg: "bg-orange-500/10", text: "text-orange-400 font-bold", border: "border-orange-500/30", label: ageStr };
}
