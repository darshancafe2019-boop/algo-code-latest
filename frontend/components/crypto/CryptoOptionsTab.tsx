"use client";

import { formatMoney, formatNumber, formatPrice, formatQuantity, formatVolume } from "@/lib/formatters";
import React, { useState } from "react";
import {
  Layers,
  Calendar,
  Sparkles,
  Info,
  TrendingUp,
  Percent,
} from "lucide-react";
import { OptionChainResponse, StrikeRow } from "@/types/crypto-derivatives";
import { cn } from "@/lib/utils";

interface CryptoOptionsTabProps {
  chainData: OptionChainResponse | undefined;
  availableExpiries: string[];
  selectedExpiry: string;
  onSelectExpiry: (exp: string) => void;
  selectedUnderlying: string;
  complexityMode: "SIMPLE" | "ADVANCED";
  onOpenTradeDrawer: (contract: any, side: "BUY" | "SELL") => void;
  isLoading: boolean;
}

export const CryptoOptionsTab: React.FC<CryptoOptionsTabProps> = ({
  chainData,
  availableExpiries,
  selectedExpiry,
  onSelectExpiry,
  selectedUnderlying,
  complexityMode,
  onOpenTradeDrawer,
  isLoading,
}) => {
  const strikes: StrikeRow[] = Array.isArray(chainData?.strikes) ? chainData.strikes : [];
  const isAdvanced = complexityMode === "ADVANCED";

  return (
    <div className="space-y-3 select-none">
      {/* 1. Expiries & Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050e1d] border border-[#12365a] rounded-xl p-3 shadow-md">
        {/* Expiries Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-bold text-slate-400 font-mono uppercase mr-1">
            EXPIRY:
          </span>
          {availableExpiries.map((exp) => (
            <button
              key={exp}
              onClick={() => onSelectExpiry(exp)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                selectedExpiry === exp
                  ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/20"
                  : "bg-[#07192f] text-slate-300 hover:text-white border border-[#143e69]"
              )}
            >
              {exp}
            </button>
          ))}
        </div>

        {/* Spot & Summary Metrics */}
        {chainData && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-slate-300">
              Spot: <strong className="text-white">{formatMoney(chainData.spot_price, "$")}</strong>
            </div>
            {chainData.max_pain && (
              <div className="text-slate-300 hidden sm:block">
                Max Pain: <strong className="text-purple-300">{formatMoney(chainData.max_pain, "$")}</strong>
              </div>
            )}
            {chainData.pcr && (
              <div className="text-slate-300 hidden sm:block">
                PCR: <strong className="text-emerald-400">{chainData.pcr.pcr_oi?.toFixed(2) || "1.05"}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Option Chain Table (CALLS | STRIKE | PUTS) */}
      <div className="bg-[#050e1d] border border-[#12365a] rounded-xl shadow-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            {/* Top Superheader */}
            <tr className="border-b border-[#0f2d4e] bg-[#07192f] text-[11px] font-black uppercase tracking-wider">
              <th colSpan={isAdvanced ? 6 : 4} className="py-2 text-emerald-400 border-r border-[#103456]">
                CALL OPTIONS
              </th>
              <th className="py-2 text-[#00D4FF] px-4 bg-[#092547]">STRIKE</th>
              <th colSpan={isAdvanced ? 6 : 4} className="py-2 text-rose-400 border-l border-[#103456]">
                PUT OPTIONS
              </th>
            </tr>
            {/* Subheader */}
            <tr className="border-b border-[#0d2642] bg-[#040f1f] text-slate-400 text-[10px] uppercase">
              {isAdvanced && <th className="py-2 px-2 text-right">Delta</th>}
              {isAdvanced && <th className="py-2 px-2 text-right">IV</th>}
              <th className="py-2 px-2 text-right">OI</th>
              <th className="py-2 px-2 text-right">Bid</th>
              <th className="py-2 px-2 text-right">Ask</th>
              <th className="py-2 px-2 text-right border-r border-[#103456]">LTP</th>

              <th className="py-2 px-3 text-center bg-[#071d37] text-white font-bold">PRICE</th>

              <th className="py-2 px-2 text-left border-l border-[#103456]">LTP</th>
              <th className="py-2 px-2 text-left">Bid</th>
              <th className="py-2 px-2 text-left">Ask</th>
              <th className="py-2 px-2 text-left">OI</th>
              {isAdvanced && <th className="py-2 px-2 text-left">IV</th>}
              {isAdvanced && <th className="py-2 px-2 text-left">Delta</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0d2642]">
            {strikes.length === 0 ? (
              <tr>
                <td colSpan={isAdvanced ? 13 : 9} className="py-12 text-center text-slate-400 text-xs">
                  {isLoading ? "Loading dynamic option chain ladder..." : "No options available for the selected expiry."}
                </td>
              </tr>
            ) : (
              strikes.map((s) => {
                const call = s.call;
                const put = s.put;
                const isAtm = s.is_atm;

                return (
                  <tr
                    key={s.strike}
                    className={cn(
                      "transition-colors",
                      isAtm ? "bg-[#092547]/80 font-bold" : "hover:bg-[#07192e]"
                    )}
                  >
                    {/* CALLS */}
                    {isAdvanced && (
                      <td className="py-2 px-2 text-right text-slate-400 text-[10px]">
                        {call?.delta ? call.delta.toFixed(2) : "0.50"}
                      </td>
                    )}
                    {isAdvanced && (
                      <td className="py-2 px-2 text-right text-purple-300 text-[10px]">
                        {call?.iv ? `${(call.iv * 100).toFixed(0)}%` : "55%"}
                      </td>
                    )}
                    <td className="py-2 px-2 text-right text-slate-300 text-[11px]">
                      {formatVolume(call?.open_interest)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                      ${call?.bid?.toFixed(1) || "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                      ${call?.ask?.toFixed(1) || "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold border-r border-[#103456]">
                      {call ? (
                        <button
                          onClick={() => onOpenTradeDrawer(call, "BUY")}
                          className="hover:underline cursor-pointer"
                        >
                          ${call.ltp.toFixed(1)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* STRIKE */}
                    <td className="py-2 px-3 text-center font-extrabold bg-[#07192f] text-white border-x border-[#143e69]">
                      <div className="flex items-center justify-center gap-1">
                        <span>{formatMoney(s.strike, "$")}</span>
                        {isAtm && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40 font-mono">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PUTS */}
                    <td className="py-2 px-2 text-left text-rose-400 font-bold border-l border-[#103456]">
                      {put ? (
                        <button
                          onClick={() => onOpenTradeDrawer(put, "BUY")}
                          className="hover:underline cursor-pointer"
                        >
                          ${put.ltp.toFixed(1)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                      ${put?.bid?.toFixed(1) || "—"}
                    </td>
                    <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                      ${put?.ask?.toFixed(1) || "—"}
                    </td>
                    <td className="py-2 px-2 text-left text-slate-300 text-[11px]">
                      {formatVolume(put?.open_interest)}
                    </td>
                    {isAdvanced && (
                      <td className="py-2 px-2 text-left text-purple-300 text-[10px]">
                        {put?.iv ? `${(put.iv * 100).toFixed(0)}%` : "55%"}
                      </td>
                    )}
                    {isAdvanced && (
                      <td className="py-2 px-2 text-left text-slate-400 text-[10px]">
                        {put?.delta ? put.delta.toFixed(2) : "-0.50"}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
