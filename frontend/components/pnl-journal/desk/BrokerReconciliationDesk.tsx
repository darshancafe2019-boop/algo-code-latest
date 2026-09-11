"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import { BrokerReconciliation } from "@/types/pnl-journal";

interface BrokerReconciliationDeskProps {
  reconciliations: BrokerReconciliation[];
  currencySymbol?: string;
  onTriggerReconciliation?: (broker: string) => void;
}

export const BrokerReconciliationDesk: React.FC<BrokerReconciliationDeskProps> = ({
  reconciliations,
  currencySymbol = "₹",
  onTriggerReconciliation,
}) => {
  const [reconcilingBroker, setReconcilingBroker] = useState<string | null>(null);

  const handleReconcile = async (broker: string) => {
    setReconcilingBroker(broker);
    if (onTriggerReconciliation) {
      await onTriggerReconciliation(broker);
    }
    setTimeout(() => setReconcilingBroker(null), 1000);
  };

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Multi-Broker Audit & Discrepancy Reconciliation Desk
            </h3>
            <p className="text-[11px] text-slate-400">
              Detect fill mismatches, fee anomalies, and unacknowledged broker orders in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
        {reconciliations.map((rec) => {
          const isClean = rec.discrepancy === 0 && rec.unmatchedOrdersCount === 0;
          const isBusy = reconcilingBroker === rec.broker;

          return (
            <div
              key={`${rec.broker}-${rec.account}`}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isClean
                  ? "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                  : "bg-rose-950/20 border-rose-500/40"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{rec.broker}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {rec.account}
                    </span>
                  </div>
                  {isClean ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      RECONCILED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                      <AlertTriangle className="w-3 h-3" />
                      DISCREPANCY
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Local FIFO P&L:</span>
                    <span className="text-slate-200 font-semibold">{formatMoney(rec.localNetPnl)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Broker Reported P&L:</span>
                    <span className="text-slate-200 font-semibold">{formatMoney(rec.brokerReportedPnl)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/40 pt-1">
                    <span className="text-slate-400">Delta Discrepancy:</span>
                    <span
                      className={`font-bold ${
                        rec.discrepancy === 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatMoney(rec.discrepancy)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Positions (Local / Broker):</span>
                    <span className="text-slate-300">
                      {rec.localOpenPositionsCount} / {rec.brokerOpenPositionsCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unmatched Orders:</span>
                    <span className={rec.unmatchedOrdersCount > 0 ? "text-rose-400 font-bold" : "text-slate-400"}>
                      {rec.unmatchedOrdersCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Last: {new Date(rec.lastReconciledTime).toLocaleTimeString()}
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleReconcile(rec.broker)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className={`w-3 h-3 ${isBusy ? "animate-spin text-cyan-400" : ""}`} />
                  {isBusy ? "Syncing..." : "Sync Contract Notes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
