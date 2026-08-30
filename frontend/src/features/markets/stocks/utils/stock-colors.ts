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

export function getDataQualityBadge(quality?: string): { bg: string; text: string; border: string; label: string } {
  switch (quality?.toUpperCase()) {
    case "LIVE":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: "LIVE" };
    case "DELAYED":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", label: "DELAYED" };
    case "STALE":
      return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", label: "STALE" };
    case "MARKET_CLOSED":
      return { bg: "bg-slate-800/80", text: "text-slate-400", border: "border-slate-700", label: "CLOSED" };
    case "PROVIDER_DOWN":
      return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", label: "DOWN" };
    default:
      return { bg: "bg-slate-800/60", text: "text-slate-400", border: "border-slate-700/60", label: quality || "FEED" };
  }
}
