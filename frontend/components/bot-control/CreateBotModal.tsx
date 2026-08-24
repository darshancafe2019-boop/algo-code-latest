"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/useUIStore";
import { CreateBotSchema, CreateBotInput } from "@/lib/schemas/botSchema";
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
import { Badge } from "@/components/ui/badge";
import { Bot, AlertCircle, Sparkles } from "lucide-react";

export function CreateBotModal() {
  const queryClient = useQueryClient();
  const { isCreateBotModalOpen, setCreateBotModalOpen } = useUIStore();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBotInput>({
    resolver: zodResolver(CreateBotSchema),
    defaultValues: {
      name: "Alpha-Momentum-BTC",
      symbol: "BTC/USDT",
      timeframe: "5m",
      strategy_name: "EMA_MACD_VP",
      trading_mode: "PAPER",
      allocated_capital: 10000,
      max_position_size: 1.0,
      max_daily_loss: 500,
      stop_loss_pct: 1.5,
      take_profit_pct: 3.0,
      allow_shorts: true,
      confluence_threshold: 75,
    },
  });

  const tradingMode = watch("trading_mode") || "PAPER";
  const isLive = tradingMode === "LIVE";

  const createMutation = useMutation({
    mutationFn: async (data: CreateBotInput) => {
      setFormError(null);
      return await executeCommand(
        "CREATE_BOT",
        null,
        data,
        queryClient,
        ["botsList", "botsSummary", "systemStatus"]
      );
    },
    onSuccess: () => {
      setCreateBotModalOpen(false);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create bot instance");
    },
  });

  const onSubmit = (data: CreateBotInput) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isCreateBotModalOpen} onOpenChange={setCreateBotModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--theme-accent)]" />
              <DialogTitle>LAUNCH BOT INSTANCE</DialogTitle>
            </div>
            <Badge variant={isLive ? "live" : "paper"} dot>
              {tradingMode}
            </Badge>
          </div>
          <DialogDescription>
            Configure execution parameters and risk boundaries for autonomous quantitative execution.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 font-sans text-xs">
          {/* Bot Name & Mode */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">INSTANCE NAME</label>
              <input
                type="text"
                {...register("name")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
              {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">EXECUTION MODE</label>
              <select
                {...register("trading_mode")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="PAPER">PAPER SANDBOX</option>
                <option value="LIVE">LIVE MONEY (AUTHORIZED)</option>
              </select>
            </div>
          </div>

          {/* Symbol & Timeframe */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">SYMBOL</label>
              <input
                type="text"
                {...register("symbol")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              />
              {errors.symbol && <p className="text-[10px] text-rose-400 mt-1">{errors.symbol.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">TIMEFRAME</label>
              <select
                {...register("timeframe")}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
              >
                <option value="1m">1 Minute (1m)</option>
                <option value="3m">3 Minutes (3m)</option>
                <option value="5m">5 Minutes (5m)</option>
                <option value="15m">15 Minutes (15m)</option>
                <option value="1h">1 Hour (1h)</option>
                <option value="4h">4 Hours (4h)</option>
                <option value="1d">1 Day (1d)</option>
              </select>
            </div>
          </div>

          {/* Strategy Assignment */}
          <div className="font-mono">
            <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">QUANT STRATEGY</label>
            <select
              {...register("strategy_name")}
              className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
            >
              <option value="EMA_MACD_VP">EMA + MACD + Volume Profile Trend Confluence</option>
              <option value="RSI_MACD">RSI Multi-Timeframe Mean Reversion</option>
              <option value="ORDER_FLOW_SCALPER">Order Flow Microstructure Scalper</option>
              <option value="CONFLUENCE_MASTER">Institutional Multi-Signal Confluence Master</option>
            </select>
          </div>

          {/* Capital & Position Limits */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            <div>
              <label className="block text-[10px] text-[var(--theme-text-secondary)] mb-1">CAPITAL ($)</label>
              <input
                type="number"
                step="any"
                {...register("allocated_capital", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[var(--theme-text-secondary)] mb-1">MAX SIZE</label>
              <input
                type="number"
                step="any"
                {...register("max_position_size", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[var(--theme-text-secondary)] mb-1">MAX LOSS ($)</label>
              <input
                type="number"
                step="any"
                {...register("max_daily_loss", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--theme-text-primary)]"
              />
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">STOP LOSS (%)</label>
              <input
                type="number"
                step="0.1"
                {...register("stop_loss_pct", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[var(--theme-text-secondary)] mb-1">TAKE PROFIT (%)</label>
              <input
                type="number"
                step="0.1"
                {...register("take_profit_pct", { valueAsNumber: true })}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--theme-text-primary)]"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateBotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isLive ? "destructive" : "default"}
              disabled={createMutation.isPending}
              className="font-mono font-bold"
            >
              {createMutation.isPending ? "INITIALIZING..." : isLive ? "LAUNCH LIVE BOT" : "DEPLOY PAPER BOT"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
