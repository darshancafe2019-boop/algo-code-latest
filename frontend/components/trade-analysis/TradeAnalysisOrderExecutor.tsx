"use client";

import React, { useState } from "react";
import {
  Send,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { OrderPreviewData, ExecutionStatusRecord } from "./TradeAnalysisTypes";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { cn } from "@/lib/utils";

interface TradeAnalysisOrderExecutorProps {
  orderPreview: OrderPreviewData;
  riskRewardRatio: number;
  totalMaxRisk: number;
  totalPotentialProfit: number;
  isReadyForReview: boolean;
  onOrderExecuted?: (record: ExecutionStatusRecord) => void;
}

export function TradeAnalysisOrderExecutor({
  orderPreview,
  riskRewardRatio,
  totalMaxRisk,
  totalPotentialProfit,
  isReadyForReview,
  onOrderExecuted,
}: TradeAnalysisOrderExecutorProps) {
  const { refreshAll } = useGlobalData();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionRecord, setExecutionRecord] = useState<ExecutionStatusRecord | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  const handleExecutePaperOrder = async () => {
    setIsSubmitting(true);
    setFeedback({ type: null, message: "" });

    // Initial Submitted status
    const initialRecord: ExecutionStatusRecord = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      symbol: orderPreview.symbol,
      side: orderPreview.side,
      status: "SUBMITTED",
      filledQuantity: 0,
      remainingQuantity: orderPreview.quantity,
      averagePrice: orderPreview.price,
      totalValue: orderPreview.estimatedValue || 0,
      timestamp: new Date().toLocaleTimeString(),
    };
    setExecutionRecord(initialRecord);

    try {
      const orderPayload = {
        symbol: orderPreview.symbol,
        side: orderPreview.side,
        order_type: orderPreview.orderType,
        product: orderPreview.product,
        quantity: orderPreview.quantity,
        price: orderPreview.price,
        trigger_price: orderPreview.triggerPrice,
        stop_loss: orderPreview.stopLoss,
        target: orderPreview.target,
        validity: "DAY",
        execution_mode: "PAPER",
        timestamp: new Date().toISOString(),
      };

      const res = await apiClient.post<any>("/api/orders", orderPayload, { timeoutMs: 5000 });

      if (res.ok && res.data) {
        const confirmedId = res.data.order_id || initialRecord.orderId;
        const filledRecord: ExecutionStatusRecord = {
          orderId: confirmedId,
          symbol: orderPreview.symbol,
          side: orderPreview.side,
          status: "FILLED",
          filledQuantity: orderPreview.quantity,
          remainingQuantity: 0,
          averagePrice: orderPreview.price,
          totalValue: orderPreview.estimatedValue || 0,
          timestamp: new Date().toLocaleTimeString(),
          message: `Paper order executed successfully: ${orderPreview.side} ${orderPreview.quantity} @ ₹${orderPreview.price.toFixed(2)}`,
        };
        setExecutionRecord(filledRecord);
        setFeedback({
          type: "success",
          message: filledRecord.message || "Order filled in Paper mode.",
        });
        if (onOrderExecuted) onOrderExecuted(filledRecord);
        if (refreshAll) refreshAll();
      } else {
        const fallbackRes = await apiClient.post<any>("/api/paper-orders", orderPayload, { timeoutMs: 5000 });
        if (fallbackRes.ok) {
          const filledRecord: ExecutionStatusRecord = {
            orderId: initialRecord.orderId,
            symbol: orderPreview.symbol,
            side: orderPreview.side,
            status: "FILLED",
            filledQuantity: orderPreview.quantity,
            remainingQuantity: 0,
            averagePrice: orderPreview.price,
            totalValue: orderPreview.estimatedValue || 0,
            timestamp: new Date().toLocaleTimeString(),
            message: `Paper order executed: ${orderPreview.side} ${orderPreview.quantity} @ ₹${orderPreview.price.toFixed(2)}`,
          };
          setExecutionRecord(filledRecord);
          setFeedback({
            type: "success",
            message: filledRecord.message || "Order executed.",
          });
          if (onOrderExecuted) onOrderExecuted(filledRecord);
          if (refreshAll) refreshAll();
        } else {
          const errText =
            (typeof fallbackRes.error === "object" ? (fallbackRes.error as any)?.message : fallbackRes.error) ||
            (typeof res.error === "object" ? (res.error as any)?.message : res.error) ||
            "Order execution failed. Please verify risk limits.";

          const failedRecord: ExecutionStatusRecord = {
            orderId: initialRecord.orderId,
            symbol: orderPreview.symbol,
            side: orderPreview.side,
            status: "REJECTED",
            filledQuantity: 0,
            remainingQuantity: orderPreview.quantity,
            averagePrice: orderPreview.price,
            totalValue: orderPreview.estimatedValue || 0,
            timestamp: new Date().toLocaleTimeString(),
            message: String(errText),
          };
          setExecutionRecord(failedRecord);
          setFeedback({
            type: "error",
            message: String(errText),
          });
        }
      }
    } catch (err: any) {
      const errRecord: ExecutionStatusRecord = {
        orderId: initialRecord.orderId,
        symbol: orderPreview.symbol,
        side: orderPreview.side,
        status: "FAILED",
        filledQuantity: 0,
        remainingQuantity: orderPreview.quantity,
        averagePrice: orderPreview.price,
        totalValue: orderPreview.estimatedValue || 0,
        timestamp: new Date().toLocaleTimeString(),
        message: err.message || "Order transmission failed.",
      };
      setExecutionRecord(errRecord);
      setFeedback({
        type: "error",
        message: err.message || "Order transmission failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#07111F] border border-[#102338] rounded-lg p-3 font-mono text-xs shadow-sm space-y-3">
      {/* ── 1. Order Preview Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0F2236]">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-[#22D3EE]" />
          <span className="font-bold text-[#F8FAFC] tracking-wider uppercase text-xs">
            ORDER PREVIEW & EXECUTION
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0A223B] border border-[#143E6B] text-[#38BDF8] text-[10px] font-bold">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>PAPER EXECUTION ONLY</span>
        </div>
      </div>

      {/* ── 2. Order Preview Parameters Summary ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#050C16] border border-[#0F2236] rounded-lg p-2.5 text-xs">
        <div>
          <span className="text-[10px] text-[#5A738E] block uppercase">Instrument & Side</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={cn(
                "px-1.5 py-0.2 rounded text-[10px] font-black uppercase",
                orderPreview.side === "BUY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              )}
            >
              {orderPreview.side}
            </span>
            <span className="font-bold text-[#F8FAFC] truncate">{orderPreview.symbol}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-[#5A738E] block uppercase">Qty & Lots</span>
          <span className="font-bold text-[#F8FAFC] mt-0.5 block">
            {orderPreview.quantity} Units ({orderPreview.lots} {orderPreview.lots === 1 ? "Lot" : "Lots"})
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#5A738E] block uppercase">Product & Type</span>
          <span className="font-bold text-[#F8FAFC] mt-0.5 block">
            {orderPreview.product} • {orderPreview.orderType}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#5A738E] block uppercase">Est. Value</span>
          <span className="font-bold text-[#F8FAFC] mt-0.5 block tabular-nums">
            ₹{orderPreview.estimatedValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── 3. Risk / Reward Context Summary ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#040A14] border border-[#0D1E30] text-[11px]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[#5A738E]">Max Risk: </span>
            <span className="font-bold text-rose-400">
              ₹{totalMaxRisk.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[#5A738E]">Target Profit: </span>
            <span className="font-bold text-emerald-400">
              ₹{totalPotentialProfit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#5A738E]">R:R Ratio:</span>
          <span className="font-bold text-[#22D3EE]">1 : {riskRewardRatio}</span>
        </div>
      </div>

      {/* ── 4. Feedback Notice ──────────────────────────────────────── */}
      {feedback.type && (
        <div
          className={cn(
            "p-2 rounded text-xs flex items-center gap-2",
            feedback.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span className="truncate">{feedback.message}</span>
        </div>
      )}

      {/* ── 5. Primary Action Button ─────────────────────────────────── */}
      <button
        type="button"
        disabled={isSubmitting || !isReadyForReview}
        onClick={handleExecutePaperOrder}
        className={cn(
          "w-full py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2",
          orderPreview.side === "BUY"
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50"
            : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50",
          (!isReadyForReview || isSubmitting) && "opacity-60 cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" />
        <span>
          {isSubmitting
            ? "TRANSMITTING PAPER ORDER..."
            : `EXECUTE PAPER ORDER (${orderPreview.side} ${orderPreview.symbol})`}
        </span>
      </button>

      {/* ── 6. Real-Time Execution Status Track ─────────────────────── */}
      {executionRecord && (
        <div className="bg-[#050C16] border border-[#142E4C] rounded-lg p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#0F2236] pb-1">
            <span className="text-[#5A738E]">EXECUTION TELEMETRY</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                executionRecord.status === "FILLED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : executionRecord.status === "SUBMITTED" || executionRecord.status === "OPEN"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              )}
            >
              {executionRecord.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-0.5">
            <div>
              <span className="text-[#5A738E] block">Order ID</span>
              <span className="font-bold text-[#F8FAFC]">{executionRecord.orderId}</span>
            </div>
            <div>
              <span className="text-[#5A738E] block">Filled Qty</span>
              <span className="font-bold text-emerald-400">
                {executionRecord.filledQuantity} / {orderPreview.quantity}
              </span>
            </div>
            <div>
              <span className="text-[#5A738E] block">Avg Price</span>
              <span className="font-bold text-[#F8FAFC]">₹{executionRecord.averagePrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#5A738E] block">Timestamp</span>
              <span className="text-[#7D8EA5]">{executionRecord.timestamp}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
