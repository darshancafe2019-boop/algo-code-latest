"use client";

import React from "react";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StockQuoteRow } from "../types/stocks";
import { formatStockCurrency, formatStockPercent, formatStockVolume, formatStockMarketCap, formatRelativeVolume } from "../utils/formatting";
import { getTrendColor, getDataQualityBadge } from "../utils/stock-colors";
import { useStocksStore, ColumnConfig } from "../state/stocks-store";

interface StockRowProps {
  stock: StockQuoteRow;
  columns: ColumnConfig[];
  isSelected: boolean;
  onSelect: (stock: StockQuoteRow) => void;
  onToggleFavorite: (stock: StockQuoteRow) => void;
}

export const StockRow: React.FC<StockRowProps> = ({
  stock,
  columns,
  isSelected,
  onSelect,
  onToggleFavorite,
}) => {
  const { favorites } = useStocksStore();
  const isFav = favorites.has(stock.instrument_id);

  const changePct = stock.change_pct ?? 0;
  const isPositive = changePct > 0;
  const isNegative = changePct < 0;

  const trendStyle = getTrendColor(stock.directional_bias);
  const qualityBadge = getDataQualityBadge(stock.data_quality);

  const colVisible = (id: string) => columns.find((c) => c.id === id)?.visible !== false;

  return (
    <tr
      onClick={() => onSelect(stock)}
      className={`group border-b border-slate-800/50 hover:bg-cyan-500/[0.03] transition cursor-pointer select-none font-mono text-xs ${
        isSelected ? "bg-cyan-500/[0.08] border-cyan-500/30" : ""
      }`}
    >
      {/* 1. Favorite Star */}
      {colVisible("favorite") && (
        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleFavorite(stock)}
            className={`p-1 rounded transition ${
              isFav ? "text-amber-400 fill-amber-400" : "text-slate-600 hover:text-slate-300"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
          </button>
        </td>
      )}

      {/* 2. Symbol & Company */}
      {colVisible("symbol") && (
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="font-extrabold text-white group-hover:text-cyan-300 transition tracking-tight">
                {stock.symbol}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-[220px]">
                {stock.company_name}
              </div>
            </div>
            {stock.is_fno_enabled && (
              <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                F&amp;O
              </span>
            )}
          </div>
        </td>
      )}

      {/* 3. Exchange */}
      {colVisible("exchange") && (
        <td className="py-3 px-3">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {stock.exchange}
          </span>
        </td>
      )}

      {/* 4. Price */}
      {colVisible("price") && (
        <td className="py-3 px-3 text-right">
          <span className="font-extrabold text-white text-sm">
            {formatStockCurrency(stock.last_price, stock.currency)}
          </span>
        </td>
      )}

      {/* 5. 24h Return % */}
      {colVisible("change_pct") && (
        <td className="py-3 px-3 text-right">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isNegative
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>{formatStockPercent(stock.change_pct)}</span>
          </span>
        </td>
      )}

      {/* 6. Volume */}
      {colVisible("volume") && (
        <td className="py-3 px-3 text-right text-slate-200">
          {formatStockVolume(stock.volume_shares)}
        </td>
      )}

      {/* 7. Relative Volume */}
      {colVisible("relative_volume") && (
        <td className="py-3 px-3 text-right">
          <span
            className={`font-semibold ${
              (stock.relative_volume ?? 1) >= 1.5
                ? "text-cyan-400 font-bold"
                : "text-slate-400"
            }`}
          >
            {formatRelativeVolume(stock.relative_volume)}
          </span>
        </td>
      )}

      {/* 8. Market Cap */}
      {colVisible("market_cap") && (
        <td className="py-3 px-3 text-right text-slate-300">
          {stock.turnover ? formatStockMarketCap(stock.turnover * 800, stock.currency) : "—"}
        </td>
      )}

      {/* 9. P/E Ratio (Optional) */}
      {colVisible("pe_ratio") && (
        <td className="py-3 px-3 text-right text-slate-400">
          {stock.pe_ratio != null ? stock.pe_ratio.toFixed(1) : "—"}
        </td>
      )}

      {/* 10. RSI 14 (Optional) */}
      {colVisible("rsi") && (
        <td className="py-3 px-3 text-right">
          <span
            className={`${
              (stock.rsi_14 ?? 50) >= 70
                ? "text-rose-400 font-bold"
                : (stock.rsi_14 ?? 50) <= 30
                ? "text-emerald-400 font-bold"
                : "text-slate-300"
            }`}
          >
            {stock.rsi_14 != null ? stock.rsi_14.toFixed(1) : "—"}
          </span>
        </td>
      )}

      {/* 11. Trend & Directional Score */}
      {colVisible("trend") && (
        <td className="py-3 px-3 text-center">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${trendStyle.bg} ${trendStyle.text} ${trendStyle.border}`}
          >
            {stock.directional_bias?.replace("_", " ") || "NEUTRAL"}
          </span>
        </td>
      )}

      {/* 12. Quality & Freshness */}
      {colVisible("status") && (
        <td className="py-3 px-3 text-center">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${qualityBadge.bg} ${qualityBadge.text} ${qualityBadge.border}`}
          >
            {qualityBadge.label}
          </span>
        </td>
      )}
    </tr>
  );
};
