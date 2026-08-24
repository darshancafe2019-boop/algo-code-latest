"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/useUIStore";
import { useActiveBot } from "@/context/ActiveBotContext";
import { QuickOrderSchema, QuickOrderInput } from "@/lib/schemas/botSchema";
import { executeCommand } from "@/lib/commandClient";
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
import { ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickOrderInput>({
    resolver: zodResolver(QuickOrderSchema),
    defaultValues: {
      symbol: activeSymbol || "BTC/USDT",
      side: quickOrderSide,
      order_type: "MARKET",
      quantity: 0.1,
      trading_mode: "PAPER",
    },
  });

  const currentSide = watch("side") || quickOrderSide;
  const currentMode = watch("trading_mode") || "PAPER";
  const isLiveMode = currentMode === "LIVE";

  const orderMutation = useMutation({
    mutationFn: async (data: QuickOrderInput) => {
      setOrderError(null);
      return await executeCommand(
        "CREATE_ORDER",
        activeBot?.id,
        {
          ...data,
          symbol: activeSymbol || data.symbol,
        },
        queryClient,
        ["canonicalOrders", "openPositions", "systemStatus", "tradeJournal"]
      );
    },
    onSuccess: () => {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>DISPATCH ORDER</DialogTitle>
            <Badge variant={isLiveMode ? "live" : "paper"} dot>
              {currentMode}
            </Badge>
          </div>
          <DialogDescription>
            Direct order router for {activeSymbol || "BTC/USDT"} with institutional pre-trade risk checks.
          </DialogDescription>
        </DialogHeader>

        {orderError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{orderError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans text-xs">
          {/* Side Toggle (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => {
                setValue("side", "BUY");
                setQuickOrderSide("BUY");
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono font-bold transition-all ${
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
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono font-bold transition-all ${
                currentSide === "SELL"
                  ? "bg-[var(--theme-loss)] text-white shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              <ArrowDownRight className="h-4 w-4" />
              <span>SELL / SHORT</span>
            </button>
          </div>

          {/* Quantity & Order Type */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">QUANTITY</label>
              <input
                type="number"
                step="any"
                {...register("quantity", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
              {errors.quantity && <p className="text-[10px] text-rose-400 mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">ORDER TYPE</label>
              <select
                {...register("order_type")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="STOP_LIMIT">STOP LIMIT</option>
              </select>
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">STOP LOSS ($)</label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                {...register("stop_loss", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">TAKE PROFIT ($)</label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                {...register("take_profit", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
            </div>
          </div>

          {/* Mode Switch (Paper / Live) */}
          <div className="flex items-center justify-between p-3 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
            <span className="text-[11px] font-mono text-[var(--theme-text-secondary)]">ENVIRONMENT</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setValue("trading_mode", "PAPER")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  !isLiveMode ? "bg-[var(--theme-info)]/20 text-[var(--theme-info)] border border-[var(--theme-info)]/40" : "text-[var(--theme-text-muted)]"
                }`}
              >
                PAPER
              </button>
              <button
                type="button"
                onClick={() => setValue("trading_mode", "LIVE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  isLiveMode ? "bg-[var(--theme-loss)]/20 text-[var(--theme-loss)] border border-[var(--theme-loss)]/40" : "text-[var(--theme-text-muted)]"
                }`}
              >
                LIVE
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2">
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
                disabled={orderMutation.isPending}
              />
            ) : (
              <Button
                type="submit"
                variant={currentSide === "BUY" ? "profit" : "loss"}
                disabled={orderMutation.isPending}
                className="font-bold font-mono"
              >
                {orderMutation.isPending ? "DISPATCHING..." : `DISPATCH PAPER ${currentSide}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
