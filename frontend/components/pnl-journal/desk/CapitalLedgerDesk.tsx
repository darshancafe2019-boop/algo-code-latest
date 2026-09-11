"use client";

import React, { useState } from "react";
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  PlusCircle,
  FileSpreadsheet,
} from "lucide-react";
import { CapitalEvent } from "@/types/pnl-journal";

interface CapitalLedgerDeskProps {
  events: CapitalEvent[];
  currencySymbol?: string;
  onAddEvent?: (event: Partial<CapitalEvent>) => void;
}

export const CapitalLedgerDesk: React.FC<CapitalLedgerDeskProps> = ({
  events,
  currencySymbol = "₹",
  onAddEvent,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newBroker, setNewBroker] = useState("DHAN");
  const [newType, setNewType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [newRef, setNewRef] = useState("");

  const handleCreate = () => {
    if (onAddEvent && Number(newAmount) > 0) {
      onAddEvent({
        broker: newBroker as any,
        type: newType,
        amount: Number(newAmount),
        currency: "INR",
        reference: newRef || "MANUAL_ENTRY",
        status: "SETTLED",
      });
      setShowAddModal(false);
      setNewAmount("");
      setNewRef("");
    }
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
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Capital Ledger & Cashflow Journal
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit trail of deposits, withdrawals, fund allocations, and capital events
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Record Capital Event
        </button>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-left text-xs font-mono select-none">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold">Broker / Account</th>
              <th className="py-2.5 px-3 font-semibold text-center">Event Type</th>
              <th className="py-2.5 px-3 font-semibold text-right">Credit (+)</th>
              <th className="py-2.5 px-3 font-semibold text-right">Debit (-)</th>
              <th className="py-2.5 px-3 font-semibold">Reference ID</th>
              <th className="py-2.5 px-3 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No capital events recorded yet.
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const isCredit = evt.type === "DEPOSIT" || evt.type === "DIVIDEND" || evt.type === "INTEREST";
                return (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(evt.timestamp).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">{evt.broker}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCredit
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {evt.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {isCredit ? formatMoney(evt.amount) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                      {!isCredit ? formatMoney(evt.amount) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {evt.reference || "INTERNAL_TRANSFER"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 font-semibold">
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 font-mono">Record New Capital Event</h3>
            
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Broker / Account</label>
                <select
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="DHAN">Dhan</option>
                  <option value="DELTA">Delta Exchange</option>
                  <option value="UPSTOX">Upstox</option>
                  <option value="ZERODHA">Zerodha</option>
                  <option value="PAPER">Paper Sim</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Event Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="DEPOSIT">Capital Deposit (Inflow)</option>
                  <option value="WITHDRAWAL">Capital Withdrawal (Outflow)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Bank Reference / UPI UTR</label>
                <input
                  type="text"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  placeholder="e.g. UPI/409123847"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
