"use client";

import React, { useState } from "react";
import { BookOpen, Search, Download, Filter } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TradeBookViewProps {
  currency: string;
}

export function TradeBookView({ currency }: TradeBookViewProps) {
  const sym = currency === "INR" ? "₹" : "$";
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");

  const tradeBookFills = [
    { id: "TB-98412", date: "31 Oct 2026, 11:42 AM", symbol: "NIFTY 24300 CE", broker: "Upstox", side: "BUY", qty: 150, price: 124.50, turnover: 18675, fee: 38.5, taxClass: "BUSINESS_DERIVATIVE", rate: "Slab" },
    { id: "TB-98411", date: "31 Oct 2026, 10:15 AM", symbol: "NIFTY 24300 CE", broker: "Upstox", side: "SELL", qty: 150, price: 168.20, turnover: 25230, fee: 42.0, taxClass: "BUSINESS_DERIVATIVE", rate: "Slab" },
    { id: "TB-98410", date: "30 Oct 2026, 03:12 PM", symbol: "RELIANCE", broker: "Dhan", side: "BUY", qty: 100, price: 2940.00, turnover: 294000, fee: 85.0, taxClass: "SHORT_TERM_CAPITAL_GAIN", rate: "20.0%" },
    { id: "TB-98409", date: "30 Oct 2026, 02:45 PM", symbol: "BTC-PERP", broker: "Delta Exchange", side: "BUY", qty: 0.5, price: 67200.00, turnover: 33600, fee: 16.8, taxClass: "CRYPTO_VDA_INCOME", rate: "30.0%" },
    { id: "TB-98408", date: "30 Oct 2026, 01:20 PM", symbol: "BTC-PERP", broker: "Delta Exchange", side: "SELL", qty: 0.5, price: 68450.00, turnover: 34225, fee: 17.1, taxClass: "CRYPTO_VDA_INCOME", rate: "30.0%" },
    { id: "TB-98407", date: "29 Oct 2026, 11:30 AM", symbol: "TATASTEEL", broker: "Dhan", side: "BUY", qty: 500, price: 162.40, turnover: 81200, fee: 32.5, taxClass: "INTRADAY_SPECULATIVE", rate: "Slab" },
    { id: "TB-98406", date: "29 Oct 2026, 02:15 PM", symbol: "TATASTEEL", broker: "Dhan", side: "SELL", qty: 500, price: 164.20, turnover: 82100, fee: 33.0, taxClass: "INTRADAY_SPECULATIVE", rate: "Slab" },
  ];

  const filtered = tradeBookFills.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = t.symbol.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.broker.toLowerCase().includes(q);
    const matchClass = filterClass === "ALL" || t.taxClass === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Header & Controls */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              STATUTORY TRADE BOOK & FIFO AUDIT TRAIL
            </h2>
          </div>
          <p className="text-xs text-[#7D8EA5] mt-0.5">
            Complete transaction ledger with buy/sell matching, turnover computations, and statutory tax classifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#06101B] border border-[#122A42] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F8FAFC]">
            <Search className="h-3.5 w-3.5 text-[#7D8EA5]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol, ID, broker..."
              className="bg-transparent text-xs text-[#F8FAFC] placeholder-[#7D8EA5] focus:outline-none w-40"
            />
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-[#06101B] border border-[#122A42] rounded-[6px] px-2 py-1.5 text-xs font-semibold text-[#F8FAFC] cursor-pointer"
          >
            <option value="ALL">All Classifications</option>
            <option value="SHORT_TERM_CAPITAL_GAIN">STCG (Sec 111A)</option>
            <option value="BUSINESS_DERIVATIVE">F&O Business (Sec 43(5))</option>
            <option value="CRYPTO_VDA_INCOME">Crypto VDA (Sec 115BBH)</option>
            <option value="INTRADAY_SPECULATIVE">Speculative (Sec 73)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                <th className="pb-1">Trade ID</th>
                <th className="pb-1">Timestamp</th>
                <th className="pb-1">Symbol</th>
                <th className="pb-1">Broker</th>
                <th className="pb-1 text-center">Side</th>
                <th className="pb-1 text-right">Qty</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Turnover</th>
                <th className="pb-1 text-right">Fee & STT</th>
                <th className="pb-1">Tax Classification</th>
                <th className="pb-1 text-center">Statutory Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60 font-mono">
              {filtered.map((t) => (
                <tr key={t.id} className="h-[34px] hover:bg-[#0E1E34] transition-colors">
                  <td className="text-[#00F0FF] font-bold">{t.id}</td>
                  <td className="text-[#7D8EA5] text-[10px]">{t.date}</td>
                  <td className="font-semibold text-[#F8FAFC] font-sans">{t.symbol}</td>
                  <td className="text-[#22D3EE] text-[10px]">{t.broker}</td>
                  <td className="text-center">
                    <span className={cn("px-1 py-0.2 rounded text-[9px] font-bold", t.side === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A]" : "bg-[#FF3B5C]/15 text-[#FF3B5C]")}>
                      {t.side}
                    </span>
                  </td>
                  <td className="text-right text-[#F8FAFC] tabular-nums">{t.qty}</td>
                  <td className="text-right text-[#F8FAFC] tabular-nums">{formatMoney(t.price, sym)}</td>
                  <td className="text-right text-[#F8FAFC] tabular-nums font-semibold">{formatMoney(t.turnover, sym)}</td>
                  <td className="text-right text-[#7D8EA5] tabular-nums">{formatMoney(t.fee, sym)}</td>
                  <td className="text-[10px] text-slate-300 font-sans">{t.taxClass}</td>
                  <td className="text-center">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      {t.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

