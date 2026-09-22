"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  OptionOrderPreview,
  OptionOrderIntent,
  DirectOrderResult,
  OrderExecutionStatus,
} from "@/types/option-order-intent";
import { formatNumber } from "@/lib/formatters";

interface OptionOrderPreviewModalProps {
  isOpen: boolean;
  preview: OptionOrderPreview | null;
  intent: OptionOrderIntent | null;
  onClose: () => void;
  onOrderSuccess: (result: DirectOrderResult) => void;
  currency?: string;
}

export const OptionOrderPreviewModal: React.FC<OptionOrderPreviewModalProps> = ({
  isOpen,
  preview,
  intent,
  onClose,
  onOrderSuccess,
  currency = "₹",
}) => {
  const [submissionStatus, setSubmissionStatus] = useState<OrderExecutionStatus | "IDLE">("IDLE");
  const [executionResult, setExecutionResult] = useState<DirectOrderResult | null>(null);
  const [liveConsentChecked, setLiveConsentChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !preview || !intent) return null;

  const isBuy = preview.side === "BUY";
  const isCall = preview.optionType === "CALL";
  const isLive = preview.mode === "LIVE";

  const handleConfirmOrder = async () => {
    if (isLive && !liveConsentChecked) {
      setErrorMessage("You must explicitly acknowledge the live execution risks.");
      return;
    }

    setSubmissionStatus("SUBMITTING");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/options/order/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent),
      });

      const data = await res.json();

      if (!res.ok || data.status === "rejected" || data.status === "error") {
        const reason = data.errorReason || data.message || "Order rejected by Central Risk Engine or Broker Router.";
        setSubmissionStatus("REJECTED");
        const rejectResult: DirectOrderResult = {
          status: "rejected",
          orderId: data.orderId || "",
          broker: preview.broker,
          timestamp: new Date().toISOString(),
          filledQty: 0,
          remainingQty: preview.quantity,
          averagePrice: 0,
          executionStatus: "REJECTED",
          mode: preview.mode,
          symbol: preview.symbol,
          side: preview.side,
          optionType: preview.optionType,
          strike: preview.strike,
          errorReason: reason,
          errorCode: data.errorCode || "ORDER_REJECTED",
        };
        setExecutionResult(rejectResult);
        setErrorMessage(reason);
        return;
      }

      // Success fill
      const successResult: DirectOrderResult = {
        status: "success",
        orderId: data.orderId,
        broker: data.broker || preview.broker,
        timestamp: data.timestamp || new Date().toISOString(),
        filledQty: data.filledQty !== undefined ? data.filledQty : preview.quantity,
        remainingQty: data.remainingQty || 0,
        averagePrice: data.averagePrice || preview.price,
        executionStatus: (data.executionStatus as OrderExecutionStatus) || "TRADED",
        mode: preview.mode,
        symbol: preview.symbol,
        side: preview.side,
        optionType: preview.optionType,
        strike: preview.strike,
        message: data.message,
      };

      setSubmissionStatus(successResult.executionStatus);
      setExecutionResult(successResult);
      onOrderSuccess(successResult);
    } catch (err: any) {
      setSubmissionStatus("REJECTED");
      const errReason = err.message || "Network exception during order dispatch";
      setErrorMessage(errReason);
      setExecutionResult({
        status: "error",
        orderId: "",
        broker: preview.broker,
        timestamp: new Date().toISOString(),
        filledQty: 0,
        remainingQty: preview.quantity,
        averagePrice: 0,
        executionStatus: "REJECTED",
        mode: preview.mode,
        symbol: preview.symbol,
        side: preview.side,
        optionType: preview.optionType,
        strike: preview.strike,
        errorReason: errReason,
        errorCode: "NETWORK_ERROR",
      });
    }
  };

  const resetAndClose = () => {
    setSubmissionStatus("IDLE");
    setExecutionResult(null);
    setErrorMessage(null);
    setLiveConsentChecked(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#09101E] border border-slate-800 shadow-2xl overflow-hidden font-mono text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0C1527] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-black tracking-wide text-white">
              {submissionStatus === "IDLE" ? "ORDER PREVIEW & CONFIRMATION" : "EXECUTION STATUS"}
            </h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {submissionStatus === "IDLE" ? (
            <>
              {/* Contract Header Tag */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-white">
                    {preview.symbol}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Expiry: <strong className="text-slate-200">{preview.expiry || "Nearest"}</strong> • Strike: <strong className="text-slate-200">{formatNumber(preview.strike)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isCall
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    }`}
                  >
                    {preview.optionType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isBuy
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {preview.side}
                  </span>
                </div>
              </div>

              {/* Order Parameters Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-[#070D18] border border-slate-800/90 text-[11px]">
                <div className="space-y-1">
                  <span className="text-slate-500">Broker:</span>
                  <div className="font-bold text-cyan-300">{preview.broker}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Order Type:</span>
                  <div className="font-bold text-white">{preview.orderType}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Lots:</span>
                  <div className="font-bold text-white">{preview.lots} ({preview.lotSize}/lot)</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Total Quantity:</span>
                  <div className="font-bold text-white">{preview.quantity}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Price:</span>
                  <div className="font-bold text-emerald-400">{currency}{preview.price.toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Trading Mode:</span>
                  <div className={`font-bold ${isLive ? "text-rose-400" : "text-emerald-400"}`}>
                    {preview.mode} ORDER
                  </div>
                </div>
              </div>

              {/* Financial & Risk Summary */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Required Margin:</span>
                  <strong className="text-white font-mono">{currency}{preview.requiredMargin.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Estimated Fees & Taxes:</span>
                  <span className="text-slate-300 font-mono">{currency}{preview.estimatedFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Capital At Risk:</span>
                  <span className="text-amber-400 font-mono">{currency}{preview.riskAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Available Capital:</span>
                  <span className="text-cyan-300 font-mono">{currency}{preview.availableCapital.toLocaleString()}</span>
                </div>
              </div>

              {/* LIVE Mode Safeguard Warning */}
              {isLive && (
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>CAUTION: LIVE CAPITAL DEPLOYMENT</span>
                  </div>
                  <p className="text-[10px] text-rose-200/90 leading-relaxed">
                    This order will be routed directly to {preview.broker} and execute with real financial capital.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveConsentChecked}
                      onChange={(e) => setLiveConsentChecked(e.target.checked)}
                      className="rounded border-rose-500 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-[10px] font-bold text-white">
                      I understand and confirm live execution.
                    </span>
                  </label>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          ) : (
            /* Post-Submission Status Display */
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                {submissionStatus === "SUBMITTING" && (
                  <>
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <h4 className="text-sm font-black text-cyan-300">SUBMITTING TO OMS...</h4>
                    <p className="text-[11px] text-slate-400">Validating pre-trade risk and routing to broker</p>
                  </>
                )}

                {(submissionStatus === "TRADED" || submissionStatus === "FILLED") && (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-sm font-black text-emerald-300">ORDER EXECUTED (TRADED)</h4>
                    <p className="text-[11px] text-emerald-400/90">
                      Simulated fill confirmed in Paper OMS
                    </p>
                  </>
                )}

                {submissionStatus === "SUBMITTED" && (
                  <>
                    <Clock className="w-8 h-8 text-cyan-400" />
                    <h4 className="text-sm font-black text-cyan-300">ORDER SUBMITTED</h4>
                    <p className="text-[11px] text-slate-400">Order successfully routed to {preview.broker}</p>
                  </>
                )}

                {submissionStatus === "REJECTED" && (
                  <>
                    <AlertTriangle className="w-8 h-8 text-rose-400" />
                    <h4 className="text-sm font-black text-rose-400">ORDER REJECTED</h4>
                    <p className="text-[11px] text-rose-300 max-w-sm">
                      {errorMessage || "Order blocked by pre-trade risk engine"}
                    </p>
                  </>
                )}
              </div>

              {/* Execution Telemetry Details */}
              {executionResult && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#070D18] border border-slate-800 text-[11px]">
                  {executionResult.orderId && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Order ID:</span>{" "}
                      <strong className="text-white font-mono">{executionResult.orderId}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Broker:</span>{" "}
                    <strong className="text-cyan-300">{executionResult.broker}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>{" "}
                    <strong className={executionResult.status === "success" ? "text-emerald-400" : "text-rose-400"}>
                      {executionResult.executionStatus}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Filled Qty:</span>{" "}
                    <strong className="text-white">{executionResult.filledQty}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Remaining Qty:</span>{" "}
                    <strong className="text-white">{executionResult.remainingQty}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Avg Price:</span>{" "}
                    <strong className="text-emerald-400">{currency}{executionResult.averagePrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp:</span>{" "}
                    <strong className="text-slate-400 truncate block">
                      {new Date(executionResult.timestamp).toLocaleTimeString()}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0C1527] flex items-center justify-end gap-2.5">
          {submissionStatus === "IDLE" ? (
            <>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleConfirmOrder}
                className={`px-5 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition shadow-lg flex items-center gap-1.5 ${
                  isLive
                    ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 active:scale-95"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLive ? "CONFIRM LIVE ORDER" : "CONFIRM PAPER ORDER"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
            >
              DONE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
