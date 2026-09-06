"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";
import { apiClient } from "@/lib/apiClient";

interface OrderDestinationModalProps {
  isOpen: boolean;
  bot: BotRowItem | null;
  side: "BUY" | "SELL";
  onClose: () => void;
  onOrderConfirmed: (tradeData: any) => void;
}

export function OrderDestinationModal({
  isOpen,
  bot,
  side,
  onClose,
  onOrderConfirmed,
}: OrderDestinationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  if (!isOpen || !bot) return null;

  const env = (bot.execution_mode || "PAPER").toUpperCase();
  const isLive = env === "LIVE";
  const brokerName = bot.execution_broker || "Paper Simulator";
  const brokerAccount = bot.broker_account_id || bot.broker_account_alias || "Paper-Account-01";
  const exchange = bot.exchange || (bot.symbol.includes("RELIANCE") || bot.symbol.includes("NIFTY") ? "NSE" : "BINANCE");
  const instrumentId = bot.instrument_key || (bot.symbol.includes("RELIANCE") ? "NSE_EQ|INE002A01018" : bot.symbol.replace("/", "").replace(":", ""));
  
  // Sizing & estimates
  const estPrice = bot.position?.entry_price || (bot.symbol.includes("BTC") ? 65840.0 : (bot.symbol.includes("RELIANCE") ? 2520.0 : (bot.symbol.includes("NIFTY") ? 24500.0 : (bot.symbol.includes("SOL") ? 135.0 : 100.0))));
  const leverage = bot.symbol.includes("BTC") ? 10 : (bot.symbol.includes("RELIANCE") ? 5 : 1);
  const quantity = bot.symbol.includes("BTC") ? 0.15 : (bot.symbol.includes("RELIANCE") ? 50 : 1);
  const estNotional = Math.round(quantity * estPrice * 100) / 100;
  const estMargin = Math.round((estNotional / Math.max(1, leverage)) * 100) / 100;
  const currencySymbol = bot.asset_class === "INDIAN_STOCKS" || bot.asset_class === "NSE" || bot.symbol.includes("RELIANCE") || bot.symbol.includes("NIFTY") ? "₹" : "$";

  const isBrokerConfigured = bot.feed_status !== "NOT CONFIGURED";

  const handleConfirmOrder = async () => {
    if (isLive) {
      setErrorMsg("LIVE TRADING DISABLED: Live order execution is blocked by server-side policy.");
      return;
    }
    if (!isBrokerConfigured) {
      setErrorMsg(`Cannot route order: ${brokerName} is NOT CONFIGURED.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const tradeType = side === "BUY" ? "LONG_ENTRY" : "SHORT_ENTRY";
      const idempotencyKey = apiClient.generateIdempotencyKey("ORDER_DEST", bot.id);
      
      const res = await fetch(`/api/bots/${bot.id}/force_test_trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade_type: tradeType,
          side: side,
          quantity: quantity,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.status === "success" || data.success)) {
        setOrderResult(data);
        onOrderConfirmed(data);
      } else {
        setErrorMsg(data.message || "Failed to execute order at destination.");
      }
    } catch (err: any) {
      setErrorMsg(`Order routing failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-5 border-b border-[var(--theme-border-subtle)] flex items-center justify-between bg-[var(--theme-elevated)]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--theme-text-primary)] tracking-wide">
                ORDER DESTINATION CONFIRMATION
              </h3>
              <p className="text-[11px] font-mono text-[var(--theme-text-muted)] mt-0.5">
                Target Bot: <strong className="text-[var(--theme-text-primary)]">{bot.name}</strong> ({bot.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Disabled Banner */}
        {isLive && (
          <div className="px-5 py-3 bg-[var(--theme-loss)]/15 border-b border-[var(--theme-loss)]/30 flex items-center gap-2.5 text-xs text-[var(--theme-loss)] font-mono font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>LIVE TRADING DISABLED — Orders cannot be placed to real live broker accounts.</span>
          </div>
        )}

        {/* Body Details */}
        <div className="p-5 space-y-4 font-mono text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {orderResult ? (
            <div className="p-4 rounded-2xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/30 space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-[var(--theme-profit)] mx-auto" />
              <div className="text-sm font-extrabold text-[var(--theme-profit)]">
                Order Confirmed & Filled by Destination!
              </div>
              <div className="text-[11px] text-[var(--theme-text-secondary)]">
                Order ID: <code>{orderResult.order_id || "TEST_ORD_CONFIRMED"}</code> • Fill Price: {currencySymbol}{orderResult.price?.toLocaleString()}
              </div>
              <button
                onClick={onClose}
                className="mt-3 px-4 py-2 rounded-xl bg-[var(--theme-profit)] text-[var(--theme-bg)] font-extrabold text-xs transition"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Destination Specification Grid */}
              <div className="rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-elevated)]/50 divide-y divide-[var(--theme-border-subtle)]/60 overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Destination Broker:</span>
                  <span className="font-extrabold text-[var(--theme-text-primary)] flex items-center gap-1.5">
                    <span>{brokerName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                        isBrokerConfigured
                          ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                      }`}
                    >
                      {isBrokerConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Broker Account:</span>
                  <span className="font-bold text-[var(--theme-accent)]">{brokerAccount}</span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Execution Environment:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono border ${
                      isLive
                        ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                        : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/40"
                    }`}
                  >
                    {env}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Exchange & Segment:</span>
                  <span className="font-bold text-[var(--theme-text-primary)]">{exchange} • {bot.segment || "EQUITY_CASH"}</span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Exact Instrument ID:</span>
                  <span className="font-extrabold text-[var(--theme-text-primary)] bg-[var(--theme-surface)] px-2 py-0.5 rounded border border-[var(--theme-border-subtle)]">
                    {instrumentId}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Order Side:</span>
                  <span
                    className={`font-black text-xs px-2.5 py-0.5 rounded border ${
                      side === "BUY"
                        ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40"
                        : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                    }`}
                  >
                    {side}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Quantity / Leverage:</span>
                  <span className="font-bold text-[var(--theme-text-primary)]">{quantity} units ({leverage}x)</span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-[var(--theme-text-muted)] font-sans">Estimated Price:</span>
                  <span className="font-bold text-[var(--theme-text-primary)]">{currencySymbol}{estPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--theme-elevated)]/80">
                  <span className="text-[var(--theme-text-muted)] font-sans font-semibold">Estimated Margin Required:</span>
                  <span className="font-extrabold text-sm text-[var(--theme-accent)]">{currencySymbol}{estMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Safety Note */}
              <div className="p-3 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] text-[11px] text-[var(--theme-text-muted)] space-y-1">
                <p>• Orders are routed exclusively via the selected broker adapter and account ID.</p>
                <p>• In PAPER mode, the simulator receives live pricing and executes simulated paper trades.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!orderResult && (
          <div className="p-5 border-t border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 bg-[var(--theme-elevated)]/40">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] font-bold text-xs transition"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || isLive || !isBrokerConfigured}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 shadow-lg ${
                isLive || !isBrokerConfigured
                  ? "bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] border border-[var(--theme-border-subtle)] cursor-not-allowed"
                  : side === "BUY"
                  ? "bg-[var(--theme-profit)] text-[var(--theme-bg)] hover:opacity-90 shadow-[var(--theme-profit)]/20"
                  : "bg-[var(--theme-loss)] text-white hover:opacity-90 shadow-[var(--theme-loss)]/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Routing to Broker...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Send {side} Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
