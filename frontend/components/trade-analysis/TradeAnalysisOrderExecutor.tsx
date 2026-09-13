"use client";

import React, { useRef, useState } from "react";
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
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const handleExecutePaperOrder = async () => {
    if (isSubmitting || !isReadyForReview) return;

    setIsSubmitting(true);
    setFeedback({ type: null, message: "" });

    const fingerprint = [
      orderPreview.symbol,
      orderPreview.side,
      orderPreview.orderType,
      orderPreview.quantity,
      orderPreview.price,
      orderPreview.stopLoss || 0,
      orderPreview.target || 0,
    ].join("|");
    if (!idempotencyRef.current || idempotencyRef.current.fingerprint !== fingerprint) {
      idempotencyRef.current = {
        fingerprint,
        key: apiClient.generateIdempotencyKey("TRADE_ANALYSIS_ORDER", fingerprint),
      };
    }
    const idempotencyKey = idempotencyRef.current.key;

    const initialRecord: ExecutionStatusRecord = {
      orderId: "CLIENT-" + idempotencyKey,
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
        client_order_id: idempotencyKey,
        symbol: orderPreview.symbol,
        side: orderPreview.side,
        order_type: orderPreview.orderType,
        orderType: orderPreview.orderType,
        product: orderPreview.product,
        quantity: orderPreview.quantity,
        price: orderPreview.price,
        trigger_price: orderPreview.triggerPrice,
        stop_loss: orderPreview.stopLoss,
        target: orderPreview.target,
        validity: "DAY",
        mode: "PAPER",
        broker: "PAPER",
        execution_mode: "PAPER",
      };

      const res = await apiClient.post<any>("/api/orders", orderPayload, {
        timeoutMs: 5000,
        idempotencyKey,
      });
      const body = res.data || {};
      const order = body.order || body;
      const accepted = res.ok && body.success === true && order.success !== false;

      if (!accepted) {
        const errText =
          res.error?.message ||
          body.message ||
          order.message ||
          "Paper order was rejected by the execution gateway.";
        const failedRecord: ExecutionStatusRecord = {
          ...initialRecord,
          status: "REJECTED",
          message: String(errText),
          timestamp: new Date().toLocaleTimeString(),
        };
        setExecutionRecord(failedRecord);
        setFeedback({ type: "error", message: String(errText) });
        return;
      }

      const rawStatus = String(order.status || body.status || "SUBMITTED").toUpperCase();
      const filledQuantity = Number(
        order.filled_quantity ?? order.filledAmount ?? order.filled ?? 0
      );
      const remainingQuantity = Number(
        order.remaining_quantity ?? order.remainingQuantity ?? Math.max(0, orderPreview.quantity - filledQuantity)
      );
      const averagePrice = Number(
        order.average_price ?? order.fill_price ?? order.price ?? orderPreview.price
      );
      const hasFill = rawStatus === "FILLED" && Number.isFinite(filledQuantity) && filledQuantity > 0;
      const status: ExecutionStatusRecord["status"] = hasFill
        ? "FILLED"
        : rawStatus === "OPEN" || rawStatus === "PENDING"
        ? "OPEN"
        : "SUBMITTED";
      const confirmedId = String(
        body.orderId || body.order_id || order.order_id || order.orderId || initialRecord.orderId
      );
      const acceptedRecord: ExecutionStatusRecord = {
        orderId: confirmedId,
        symbol: orderPreview.symbol,
        side: orderPreview.side,
        status,
        filledQuantity: Number.isFinite(filledQuantity) && filledQuantity >= 0 ? filledQuantity : 0,
        remainingQuantity:
          Number.isFinite(remainingQuantity) && remainingQuantity >= 0
            ? remainingQuantity
            : orderPreview.quantity,
        averagePrice: Number.isFinite(averagePrice) && averagePrice > 0 ? averagePrice : orderPreview.price,
        totalValue: orderPreview.estimatedValue || 0,
        timestamp: new Date().toLocaleTimeString(),
        message: hasFill
          ? "Paper order filled: " + orderPreview.side + " " + orderPreview.quantity + " @ " + averagePrice.toFixed(2)
          : "Paper order accepted by the execution gateway; fill is pending broker confirmation.",
      };
      setExecutionRecord(acceptedRecord);
      setFeedback({ type: "success", message: acceptedRecord.message || "Paper order accepted." });
      if (onOrderExecuted) onOrderExecuted(acceptedRecord);
      if (refreshAll) refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order transmission failed.";
      const errRecord: ExecutionStatusRecord = {
        ...initialRecord,
        status: "FAILED",
        message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setExecutionRecord(errRecord);
      setFeedback({ type: "error", message });
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
