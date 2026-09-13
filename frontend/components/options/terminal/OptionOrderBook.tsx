"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  BookOpen,
  Activity,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  ActionableOptionContract,
  OrderBookDepthData,
  OrderBookLevel,
} from "@/types/option-terminal";

interface OptionOrderBookProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ActionableOptionContract | null;
  currency?: string;
  onTradeAction?: (action: "BUY" | "SELL", contract: ActionableOptionContract) => void;
}

export const OptionOrderBook: React.FC<OptionOrderBookProps> = ({
  isOpen,
  onClose,
  contract,
  currency = "₹",
  onTradeAction,
}) => {
  const isCall = contract?.optionType === "CALL" || contract?.optionType === "CE";
  const underlyingIsCrypto = contract ? ["BTC", "ETH", "SOL", "XRP"].includes(contract.underlying) : false;
  const curSymbol = underlyingIsCrypto ? "$" : currency;

  // Real-time order-book query.  The component never constructs depth
  // from L1 values: unavailable or stale provider data remains unavailable.
  const { data: depthData, isLoading } = useQuery<OrderBookDepthData>({
    queryKey: ["optionOrderBookDepth", contract?.symbol, contract?.broker, contract?.strike, contract?.optionType],
    queryFn: async () => {
      if (!contract) {
        throw new Error("Contract is missing");
      }

      const unavailable = (
        message: string,
        status: OrderBookDepthData["status"] = "UNAVAILABLE"
      ): OrderBookDepthData => ({
        broker: contract.broker,
        source: contract.source || "UNKNOWN",
        symbol: contract.symbol,
        underlying: contract.underlying,
        expiry: contract.expiry,
        strike: contract.strike,
        optionType: contract.optionType,
        bids: [],
        asks: [],
        ltp: Number.isFinite(contract.ltp) && contract.ltp > 0 ? contract.ltp : 0,
        markPrice: contract.markPrice,
        spread: 0,
        spreadPct: 0,
        totalBidQty: 0,
        totalAskQty: 0,
        imbalanceRatio: 0,
        volume: contract.volume,
        oi: contract.oi,
        iv: contract.iv,
        timestamp: 0,
        status,
        error: message,
      });

      try {
        const res = await fetch(
          "/api/market-data/orderbook?symbol=" + encodeURIComponent(contract.symbol),
          {
            cache: "no-store",
            signal: AbortSignal.timeout(3000),
          }
        );
        if (!res.ok) {
          return unavailable("Order-book provider returned HTTP " + res.status + ".");
        }

        const json = await res.json();
        const rawBook = json?.orderbook;
        if (!Array.isArray(rawBook?.bids) || !Array.isArray(rawBook?.asks)) {
          return unavailable("Order-book provider returned no bid/ask levels.");
        }

        const normalizeLevel = (level: any): OrderBookLevel | null => {
          const rawPrice = typeof level === "object" && !Array.isArray(level) ? level.price : level?.[0];
          const rawQuantity =
            typeof level === "object" && !Array.isArray(level)
              ? level.quantity ?? level.size
              : level?.[1];
          const price = Number(rawPrice);
          const quantity = Number(rawQuantity);
          if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
            return null;
          }
          const rawOrders =
            typeof level === "object" && !Array.isArray(level) ? Number(level.orders) : undefined;
          return {
            price,
            quantity,
            orders: rawOrders !== undefined && Number.isFinite(rawOrders) && rawOrders >= 0 ? rawOrders : undefined,
          };
        };

        const bids = rawBook.bids.map(normalizeLevel).filter(Boolean) as OrderBookLevel[];
        const asks = rawBook.asks.map(normalizeLevel).filter(Boolean) as OrderBookLevel[];
        if (bids.length === 0 || asks.length === 0) {
          return unavailable("Order-book provider returned no valid bid/ask levels.");
        }

        const bestBid = bids[0].price;
        const bestAsk = asks[0].price;
        if (bestAsk < bestBid) {
          return unavailable("Order-book provider returned crossed prices.", "STALE");
        }

        const rawTimestamp = rawBook.timestamp ?? rawBook.updated_at ?? json?.timestamp;
        let timestamp = Number(rawTimestamp);
        if (typeof rawTimestamp === "string" && !Number.isFinite(timestamp)) {
          timestamp = Date.parse(rawTimestamp);
        }
        if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 100000000000) {
          timestamp *= 1000;
        }
        if (!Number.isFinite(timestamp) || timestamp <= 0) {
          return unavailable("Order-book provider did not include a source timestamp.", "STALE");
        }

        const dataAgeMs = Math.max(0, Date.now() - timestamp);
        const status: OrderBookDepthData["status"] = dataAgeMs <= 5000 ? "LIVE" : "STALE";
        const ltpCandidate = Number(rawBook.ltp ?? rawBook.last_price ?? contract.ltp);
        const ltp =
          Number.isFinite(ltpCandidate) && ltpCandidate > 0
            ? ltpCandidate
            : (bestBid + bestAsk) / 2;
        const spread = bestAsk - bestBid;
        const spreadPct = ltp > 0 ? (spread / ltp) * 100 : 0;
        const totalBidQty = bids.reduce((acc, level) => acc + level.quantity, 0);
        const totalAskQty = asks.reduce((acc, level) => acc + level.quantity, 0);
        const total = totalBidQty + totalAskQty;

        return {
          broker: contract.broker,
          source: rawBook.source || contract.source || "UNKNOWN",
          symbol: contract.symbol,
          underlying: contract.underlying,
          expiry: contract.expiry,
          strike: contract.strike,
          optionType: contract.optionType,
          bids: bids.slice(0, 5),
          asks: asks.slice(0, 5),
          ltp,
          markPrice: Number(rawBook.mark_price ?? contract.markPrice) || undefined,
          spread,
          spreadPct,
          totalBidQty,
          totalAskQty,
          imbalanceRatio: total > 0 ? Math.round((totalBidQty / total) * 100) : 0,
          volume: contract.volume,
          oi: contract.oi,
          iv: contract.iv,
          timestamp,
          dataAgeMs,
          status,
          error: status === "STALE" ? "Provider timestamp is older than 5 seconds." : undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Order-book request failed.";
        return unavailable("Order-book unavailable: " + message);
      }
    },
    enabled: isOpen && !!contract,
    refetchInterval: 3000,
    staleTime: 1500,
  });

  const bids = useMemo(() => depthData?.bids || [], [depthData?.bids]);
  const asks = useMemo(() => depthData?.asks || [], [depthData?.asks]);
  const maxBidQty = useMemo(() => (bids.length > 0 ? Math.max(1, ...bids.map((b) => b.quantity)) : 1), [bids]);
  const maxAskQty = useMemo(() => (asks.length > 0 ? Math.max(1, ...asks.map((a) => a.quantity)) : 1), [asks]);
  const maxQty = Math.max(maxBidQty, maxAskQty);

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = depthData?.spread ?? 0;
  const spreadPct = depthData?.spreadPct ?? 0;
  const imbalance = depthData?.imbalanceRatio ?? 0;
  const depthIsTradable =
    depthData?.status === "LIVE" &&
    bids.length > 0 &&
    asks.length > 0 &&
    bestBid > 0 &&
    bestAsk >= bestBid;
  const feedAgeLabel =
    depthData?.dataAgeMs !== undefined ? String(Math.round(depthData.dataAgeMs)) + "ms" : "UNAVAILABLE";

  const brokerSourceLabel = useMemo(() => {
    if (!contract) return "SOURCE UNAVAILABLE";
    const src = (contract.source || contract.broker || "").toUpperCase();
    if (src.includes("DELTA")) return "DELTA EXCHANGE";
    if (src.includes("DHAN")) return "DHAN HQ";
    if (src.includes("UPSTOX")) return "UPSTOX PRO";
    return "SOURCE UNAVAILABLE";
  }, [contract]);

  if (!isOpen || !contract) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0A101D] border border-slate-800 rounded-2xl max-w-lg w-full p-4 md:p-5 shadow-2xl font-mono text-xs text-slate-300 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                isCall
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isCall ? "CE" : "PE"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  {contract.underlying} {contract.strike} {isCall ? "CALL" : "PUT"}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {brokerSourceLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {contract.symbol} • Exp: {contract.expiry}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Close Order Book (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-4 gap-2 bg-[#060A12] border border-slate-800/90 rounded-xl p-2.5 text-center text-[11px]">
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">LTP</div>
            <div className="text-white font-extrabold">
              {curSymbol}{(depthData?.ltp || contract.ltp).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Mark</div>
            <div className="text-slate-300 font-bold">
              {curSymbol}{(depthData?.markPrice ?? contract.markPrice ?? contract.ltp).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Spread</div>
            <div className={`${spreadPct > 3 ? "text-amber-400 font-bold" : "text-slate-300 font-bold"}`}>
              {curSymbol}{spread.toFixed(2)} ({spreadPct.toFixed(1)}%)
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Feed Age</div>
            <div className={depthData?.status === "LIVE" ? "text-emerald-400 font-bold flex items-center justify-center gap-1" : "text-amber-400 font-bold flex items-center justify-center gap-1"}>
              <span className={depthData?.status === "LIVE" ? "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" : "w-1.5 h-1.5 rounded-full bg-amber-400"} />
              {isLoading ? "LOADING" : feedAgeLabel}
            </div>
          </div>
        </div>

        {depthData?.status !== "LIVE" && !isLoading && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-200">
            Level 2 data is unavailable or stale. Trading actions remain disabled.
            {depthData?.error ? " " + depthData.error : ""}
          </div>
        )}

        {/* Order Book Level 2 Table */}
        <div className="bg-[#080E1A] border border-slate-800/90 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#060A12] border-b border-slate-800 py-1.5 px-3">
            <div className="flex items-center justify-between text-emerald-400">
              <span>Orders</span>
              <span>Qty</span>
              <span>Bid Price</span>
            </div>
            <div className="flex items-center justify-between text-rose-400 pl-3 border-l border-slate-800">
              <span>Ask Price</span>
              <span>Qty</span>
              <span>Orders</span>
            </div>
          </div>

          {/* 5-Level Depth Rows */}
          <div className="divide-y divide-slate-800/40 text-[11px]">
            {[0, 1, 2, 3, 4].map((i) => {
              const b = bids[i];
              const a = asks[i];
              const bidDepthPct = b ? (b.quantity / maxQty) * 100 : 0;
              const askDepthPct = a ? (a.quantity / maxQty) * 100 : 0;

              return (
                <div key={i} className="grid grid-cols-2 py-1 px-3 hover:bg-slate-800/30 transition">
                  {/* Bid Side */}
                  <div className="relative flex items-center justify-between pr-2">
                    <div
                      className="absolute inset-y-0 right-0 bg-emerald-500/10 pointer-events-none rounded-sm transition-all"
                      style={{ width: `${bidDepthPct}%` }}
                    />
                    <span className="text-[10px] text-slate-500 z-10">{b?.orders ?? "—"}</span>
                    <span className="text-slate-300 font-semibold z-10">{b ? b.quantity.toLocaleString() : "—"}</span>
                    <span className="text-emerald-400 font-extrabold z-10">
                      {b ? b.price.toFixed(2) : "—"}
                    </span>
                  </div>

                  {/* Ask Side */}
                  <div className="relative flex items-center justify-between pl-3 border-l border-slate-800">
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-500/10 pointer-events-none rounded-sm transition-all"
                      style={{ width: `${askDepthPct}%` }}
                    />
                    <span className="text-rose-400 font-extrabold z-10">
                      {a ? a.price.toFixed(2) : "—"}
                    </span>
                    <span className="text-slate-300 font-semibold z-10">{a ? a.quantity.toLocaleString() : "—"}</span>
                    <span className="text-[10px] text-slate-500 z-10">{a?.orders ?? "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals & Imbalance Gauge */}
          <div className="bg-[#060A12] border-t border-slate-800 p-2.5 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">
                Total Bids: {depthData?.totalBidQty?.toLocaleString() || 0}
              </span>
              <span className="text-slate-400 font-bold">
                Imbalance: {imbalance}% / {100 - imbalance}%
              </span>
              <span className="text-rose-400 font-bold">
                Total Asks: {depthData?.totalAskQty?.toLocaleString() || 0}
              </span>
            </div>
            {/* Visual Balance Bar */}
            <div className="h-1.5 w-full bg-rose-500/40 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${imbalance}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contract Provenance & Liquidity Specs */}
        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-[#060A12] p-2.5 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-slate-500">Volume:</span>{" "}
            <span className="text-slate-200 font-bold">{contract.volume?.toLocaleString() || "—"}</span>
          </div>
          <div>
            <span className="text-slate-500">Open Interest:</span>{" "}
            <span className="text-slate-200 font-bold">{contract.oi?.toLocaleString() || "—"}</span>
          </div>
          <div>
            <span className="text-slate-500">IV / Delta:</span>{" "}
            <span className="text-purple-300 font-bold">
              {contract.iv ? `${contract.iv.toFixed(1)}%` : "—"} / {contract.delta !== undefined ? contract.delta.toFixed(2) : "—"}
            </span>
          </div>
        </div>

        {/* Action Direct Trading Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={!depthIsTradable}
            onClick={() => {
              if (!depthIsTradable) return;
              if (onTradeAction) onTradeAction("BUY", contract);
              onClose();
            }}
            className={depthIsTradable ? "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition active:scale-[0.98]" : "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700 text-slate-400 font-extrabold text-xs cursor-not-allowed"}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>BUY @ ASK ({curSymbol}{bestAsk.toFixed(2)})</span>
          </button>

          <button
            type="button"
            disabled={!depthIsTradable}
            onClick={() => {
              if (!depthIsTradable) return;
              if (onTradeAction) onTradeAction("SELL", contract);
              onClose();
            }}
            className={depthIsTradable ? "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg transition active:scale-[0.98]" : "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700 text-slate-400 font-extrabold text-xs cursor-not-allowed"}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>SELL @ BID ({curSymbol}{bestBid.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
