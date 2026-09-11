"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/useUIStore";
import { useActiveBot } from "@/context/ActiveBotContext";
import { QuickOrderSchema, QuickOrderInput } from "@/lib/schemas/botSchema";
import { apiClient } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Percent,
  CheckCircle2,
  Lock,
} from "lucide-react";

export function QuickOrderModal() {
  const queryClient = useQueryClient();
  const { activeSymbol, activeBot } = useActiveBot();
  const {
    isOrderPlacementModalOpen,
    setOrderPlacementModalOpen,
    quickOrderSide,
    setQuickOrderSide,
  } = useUIStore();

  const [orderError, setOrderError] = useState<string | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string>("PAPER");
  const [productType, setProductType] = useState<string>("CNC");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [triggerPrice, setTriggerPrice] = useState<string>("");

  const effectiveSymbol = (activeSymbol || "BTC/USDT").toUpperCase().trim();

  // Real-time price query
  const { data: priceData } = useQuery({
    queryKey: ["quickOrderPrice", effectiveSymbol],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/market-data/ltp?symbol=${encodeURIComponent(effectiveSymbol)}`, { timeoutMs: 3000 });
      if (res.ok && res.data) {
        return res.data;
      }
      return null;
    },
    enabled: isOrderPlacementModalOpen,
    refetchInterval: isOrderPlacementModalOpen ? 3000 : false,
    staleTime: 2000,
  });

  const currentLtp = Number(priceData?.price || priceData?.ltp || 100.0);
  const dataAge = Number(priceData?.age || 0.15);
  const isDataStale = dataAge > 5.0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickOrderInput>({
    resolver: zodResolver(QuickOrderSchema),
    defaultValues: {
      symbol: effectiveSymbol,
      side: quickOrderSide,
      order_type: "MARKET",
      quantity: 1,
      trading_mode: "PAPER",
    },
  });

  const currentSide = watch("side") || quickOrderSide;
  const currentMode = watch("trading_mode") || "PAPER";
  const currentOrderType = watch("order_type") || "MARKET";
  const currentQty = Number(watch("quantity") || 1);
  const isLiveMode = currentMode === "LIVE";

  // Financial & Charges Calculations
  const executionPrice = currentOrderType === "LIMIT" && Number(limitPrice) > 0 ? Number(limitPrice) : currentLtp;
  const notionalValue = currentQty * executionPrice;
  const requiredCapital = notionalValue;
  
  // Realistic fee estimation (Brokerage + STT + GST + Exchange Turnovers)
  const isIndianEquity = effectiveSymbol.includes("NSE") || ["RELIANCE", "HDFCBANK", "TCS", "INFY", "ICICIBANK", "NIFTY", "BANKNIFTY"].includes(effectiveSymbol);
  const estimatedBrokerage = isIndianEquity ? Math.min(20.0, notionalValue * 0.0003) : notionalValue * 0.0005;
  const estimatedSTT = isIndianEquity && currentSide === "SELL" ? notionalValue * 0.001 : 0.0;
  const estimatedGST = (estimatedBrokerage + estimatedSTT) * 0.18;
  const totalCharges = Number((estimatedBrokerage + estimatedSTT + estimatedGST).toFixed(2));

  // Idempotent Order Dispatch
  const orderMutation = useMutation({
    mutationFn: async (data: QuickOrderInput) => {
      setOrderError(null);
      if (isDataStale) {
        throw new Error(`Execution blocked: Market data for ${effectiveSymbol} is STALE (age ${dataAge.toFixed(1)}s > 5.0s).`);
      }

      const clientOrderId = `QOS-${selectedBroker}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const payload = {
        idempotencyKey: clientOrderId,
        clientOrderId: clientOrderId,
        symbol: effectiveSymbol,
        side: currentSide,
        quantity: currentQty,
        orderType: data.order_type || "MARKET",
        price: executionPrice,
        triggerPrice: Number(triggerPrice) || undefined,
        stop_loss: Number(data.stop_loss) || undefined,
        take_profit: Number(data.take_profit) || undefined,
        mode: currentMode,
        broker: selectedBroker,
        productType: productType,
        bot_id: activeBot?.id || "manual_terminal",
      };

      const res = await apiClient.post<any>("/api/orders", payload, {
        idempotencyKey: clientOrderId,
        timeoutMs: 8000,
      });

      if (!res.ok) {
        throw new Error(res.error?.message || "Order rejected by risk engine.");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["tradesList"] });
      queryClient.invalidateQueries({ queryKey: ["canonicalOrders"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
      setOrderPlacementModalOpen(false);
    },
    onError: (err: any) => {
      setOrderError(err.message || "Failed to submit order");
    },
  });

  const onSubmit = (data: QuickOrderInput) => {
    orderMutation.mutate(data);
  };

  return (
    <Dialog open={isOrderPlacementModalOpen} onOpenChange={setOrderPlacementModalOpen}>
      <DialogContent className="max-w-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-5">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold font-mono tracking-tight text-[var(--theme-text-primary)]">
                UNIVERSAL TRADE TICKET
              </DialogTitle>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-[var(--theme-text-muted)]">
                {effectiveSymbol}
              </span>
            </div>
            <Badge variant={isLiveMode ? "live" : "paper"} dot>
              {currentMode}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[var(--theme-text-secondary)]">
            One unified execution ticket routed via OMS & 20-Stage Pre-Trade Risk Engine.
          </DialogDescription>
        </DialogHeader>

        {orderError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{orderError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 font-sans text-xs">
          {/* 1. Broker & Environment Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono text-[var(--theme-text-muted)] mb-1">TARGET BROKER</label>
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="PAPER">PAPER SIMULATOR</option>
                <option value="DHAN">DHAN HQ v2</option>
                <option value="UPSTOX">UPSTOX PRO</option>
                <option value="DELTA">DELTA EXCHANGE</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[var(--theme-text-muted)] mb-1">PRODUCT TYPE</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="CNC">CNC (Delivery / Cash)</option>
                <option value="MIS">MIS (Intraday Margin)</option>
                <option value="NRML">NRML (Derivatives)</option>
                <option value="PERP">PERP (Perpetual Swap)</option>
              </select>
            </div>
          </div>

          {/* 2. Side Toggle (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => {
                setValue("side", "BUY");
                setQuickOrderSide("BUY");
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-mono font-bold transition-all ${
                currentSide === "BUY"
                  ? "bg-[var(--theme-profit)] text-black shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>BUY / LONG</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("side", "SELL");
                setQuickOrderSide("SELL");
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-mono font-bold transition-all ${
                currentSide === "SELL"
                  ? "bg-[var(--theme-loss)] text-white shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              <ArrowDownRight className="h-4 w-4" />
              <span>SELL / SHORT</span>
            </button>
          </div>

          {/* 3. Quantity & Order Type */}
          <div className="grid grid-cols-2 gap-2.5 font-mono">
            <div>
              <label className="block text-[10px] text-[var(--theme-text-muted)] mb-1">QUANTITY (UNITS)</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                {...register("quantity", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
              {errors.quantity && <p className="text-[10px] text-rose-400 mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] text-[var(--theme-text-muted)] mb-1">ORDER TYPE</label>
              <select
                {...register("order_type")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="STOP_LOSS">SL (Stop Loss)</option>
                <option value="STOP_LOSS_MARKET">SL-M (Stop Loss Market)</option>
              </select>
            </div>
          </div>

          {/* 4. Conditional Limit & Trigger Prices */}
          {currentOrderType !== "MARKET" && (
            <div className="grid grid-cols-2 gap-2.5 font-mono animate-in fade-in">
              <div>
                <label className="block text-[10px] text-[var(--theme-text-muted)] mb-1">LIMIT PRICE</label>
                <input
                  type="number"
                  step="any"
                  placeholder={currentLtp.toString()}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--theme-text-muted)] mb-1">TRIGGER PRICE</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
                />
              </div>
            </div>
          )}

          {/* 5. Pre-Trade Financial Preview Strip */}
          <div className="p-3 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)] space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
              <span>LTP & Provenance:</span>
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isDataStale ? "bg-rose-400" : "bg-emerald-400"}`} />
                <strong className="text-[var(--theme-text-primary)]">₹/${executionPrice.toFixed(2)}</strong>
                <span className="text-[9px] text-[var(--theme-text-muted)]">({selectedBroker} • {dataAge.toFixed(1)}s ago)</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
              <span>Est. Notional Value:</span>
              <strong className="text-[var(--theme-text-primary)]">₹/${notionalValue.toFixed(2)}</strong>
            </div>

            <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
              <span>Est. Charges & Taxes:</span>
              <strong className="text-amber-400">₹/${totalCharges}</strong>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrderPlacementModalOpen(false)}
            >
              Cancel
            </Button>

            {isLiveMode ? (
              <HoldToConfirmButton
                label={`HOLD TO TRANSMIT LIVE ${currentSide}`}
                confirmingLabel="TRANSMITTING LIVE ORDER..."
                variant="live"
                onConfirmed={() => handleSubmit(onSubmit)()}
                disabled={orderMutation.isPending || isDataStale}
              />
            ) : (
              <Button
                type="submit"
                variant={currentSide === "BUY" ? "profit" : "loss"}
                disabled={orderMutation.isPending || isDataStale}
                className="font-bold font-mono px-5"
              >
                {orderMutation.isPending ? "DISPATCHING..." : `EXECUTE PAPER ${currentSide}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

