"use client";

import React, { useState } from "react";
import { Landmark, CheckCircle2, AlertTriangle, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

export function BrokerReconciliationView({ currency }: { currency: string }) {
  const sym = currency === "INR" ? "₹" : "$";
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciledCount, setReconciledCount] = useState(4);

  const brokerLedgers = [
    {
      broker: "Dhan",
      segment: "NSE / BSE F&O & Cash",
      brokerTrades: 428,
      ledgerTrades: 428,
      brokerPnl: 18450.0,
      ledgerPnl: 18450.0,
      brokerFees: 642.8,
      ledgerFees: 642.8,
      status: "RECONCILED",
      discrepancy: "0.00",
    },
    {
      broker: "Upstox",
      segment: "NSE Equities & Derivatives",
      brokerTrades: 382,
      ledgerTrades: 382,
      brokerPnl: 31200.0,
      ledgerPnl: 31200.0,
      brokerFees: 814.2,
      ledgerFees: 814.2,
      status: "RECONCILED",
      discrepancy: "0.00",
    },
    {
      broker: "Delta Exchange",
      segment: "Crypto Perpetual & Options",
      brokerTrades: 240,
      ledgerTrades: 240,
      brokerPnl: -8400.0,
      ledgerPnl: -8400.0,
      brokerFees: 240.5,
      ledgerFees: 240.5,
      status: "RECONCILED",
      discrepancy: "0.00",
    },
    {
      broker: "Paper Simulator",
      segment: "Virtual Execution Ledger",
      brokerTrades: 512,
      ledgerTrades: 512,
      brokerPnl: 45200.0,
      ledgerPnl: 45200.0,
      brokerFees: 0.0,
      ledgerFees: 0.0,
      status: "RECONCILED",
      discrepancy: "0.00",
    },
  ];

  const handleRunReconciliation = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      setReconciledCount(4);
    }, 1200);
  };

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Header */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              MULTI-BROKER CONTRACT NOTE RECONCILIATION
            </h2>
          </div>
          <p className="text-xs text-[#7D8EA5] mt-0.5">
            Automated double-entry cross-audit comparing broker daily contract notes against internal Quant.OS execution ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className="px-3.5 py-1.5 rounded-[5px] bg-[#168BFF] hover:bg-[#1270D0] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin" : ""}`} />
            <span>Run Cross-Reconciliation</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                <th className="pb-1">Broker Entity</th>
                <th className="pb-1">Market Scope</th>
                <th className="pb-1 text-right">Broker Trades</th>
                <th className="pb-1 text-right">Ledger Trades</th>
                <th className="pb-1 text-right">Broker P&L</th>
                <th className="pb-1 text-right">Internal Ledger P&L</th>
                <th className="pb-1 text-right">Variance / Discrepancy</th>
                <th className="pb-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60 font-mono">
              {brokerLedgers.map((b) => (
                <tr key={b.broker} className="h-[36px] hover:bg-[#0E1E34] transition-colors">
                  <td className="font-semibold text-[#F8FAFC]">{b.broker}</td>
                  <td className="text-[10px] text-[#7D8EA5] font-sans">{b.segment}</td>
                  <td className="text-right text-[#7D8EA5] tabular-nums">{b.brokerTrades}</td>
                  <td className="text-right text-[#F8FAFC] tabular-nums">{b.ledgerTrades}</td>
                  <td className="text-right text-[#F8FAFC] tabular-nums">{formatMoney(b.brokerPnl, sym)}</td>
                  <td className="text-right text-[#00F0FF] tabular-nums">{formatMoney(b.ledgerPnl, sym)}</td>
                  <td className="text-right text-[#00E89A] tabular-nums font-bold">₹{b.discrepancy}</td>
                  <td className="text-center">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 font-bold">
                      {b.status}
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

