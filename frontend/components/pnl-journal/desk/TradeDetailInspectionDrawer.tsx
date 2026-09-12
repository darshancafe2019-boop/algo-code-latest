"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Calculator,
  Target,
  Flame,
  Clock,
  MessageSquare,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { TradeRecord } from "@/types/pnl-journal";

interface TradeDetailInspectionDrawerProps {
  trade: TradeRecord | null;
  onClose: () => void;
  onSaveNotes?: (tradeId: string, notes: string, tags: string[]) => void;
  currencySymbol?: string;
}

export const TradeDetailInspectionDrawer: React.FC<TradeDetailInspectionDrawerProps> = ({
  trade,
  onClose,
  onSaveNotes,
  currencySymbol = "₹",
}) => {
  const [notes, setNotes] = useState(trade?.notes || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(trade?.tags || []);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (trade) {
      setNotes(trade.notes || "");
      setTags(trade.tags || []);
      setIsSaved(false);
    }
  }, [trade]);

  if (!trade) return null;

  const fees = trade.feeBreakdown;
  const isProfit = trade.netPnl > 0;
  const isLoss = trade.netPnl < 0;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  const handleSave = () => {
    if (onSaveNotes) {
      onSaveNotes(trade.id, notes, tags);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const formatMoney = (val: number) => {
    return `${val < 0 ? "-" : "+"}${currencySymbol}${Math.abs(val).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col justify-between overflow-y-auto font-sans">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg font-bold text-xs ${
                trade.side === "BUY"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {trade.side}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-mono">
                  {trade.symbol}
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {trade.assetClass}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {trade.broker}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: {trade.id} • Order: {trade.orderId || "N/A"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* P&L Snapshot Card */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Net P&L</div>
              <div
                className={`text-base font-bold ${
                  isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {formatMoney(trade.netPnl)}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Gross P&L</div>
              <div className="text-sm font-semibold text-slate-200">
                {formatMoney(trade.grossPnl)}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Fees</div>
              <div className="text-sm font-semibold text-amber-400">
                {currencySymbol}{trade.totalCharges.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Trade Execution Metrics */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Execution & Timing
            </h4>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Entry Timestamp:</span>
                <span className="text-slate-200">{new Date(trade.entryTimestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Exit Timestamp:</span>
                <span className="text-slate-200">
                  {trade.exitTimestamp ? new Date(trade.exitTimestamp).toLocaleString() : "OPEN"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Entry Price:</span>
                <span className="text-slate-200 font-semibold">{currencySymbol}{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Exit Price:</span>
                <span className="text-slate-200 font-semibold">
                  {trade.exitPrice ? `${currencySymbol}${trade.exitPrice.toFixed(2)}` : "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Quantity / Lots:</span>
                <span className="text-slate-200 font-semibold">{trade.quantity}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Holding Duration:</span>
                <span className="text-slate-200">
                  {trade.holdingDurationSeconds ? `${Math.round(trade.holdingDurationSeconds / 60)} mins` : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Granular Statutory Fee Breakdown */}
          {fees && (
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                Statutory Fee & Tax Audit
              </h4>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Brokerage:</span>
                  <span className="text-slate-200">{currencySymbol}{fees.brokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">STT / CTT:</span>
                  <span className="text-slate-200">{currencySymbol}{fees.stt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exchange Turnover:</span>
                  <span className="text-slate-200">{currencySymbol}{fees.exchangeCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SEBI Charges:</span>
                  <span className="text-slate-200">{currencySymbol}{fees.sebiCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GST (18% on fees):</span>
                  <span className="text-slate-200">{currencySymbol}{fees.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stamp Duty:</span>
                  <span className="text-slate-200">{currencySymbol}{fees.stampDuty.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Trade Risk & Excursion Metrics */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Risk Metrics & Execution Quality
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">R-Multiple</div>
                <div className="text-sm font-bold text-emerald-400">
                  {trade.rMultiple ? `+${trade.rMultiple.toFixed(2)}R` : "-"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">MAE (Adverse)</div>
                <div className="text-sm font-bold text-rose-400">
                  {currencySymbol}{trade.mae?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">MFE (Favorable)</div>
                <div className="text-sm font-bold text-cyan-400">
                  {currencySymbol}{trade.mfe?.toFixed(2) || "0.00"}
                </div>
              </div>
            </div>
          </div>

          {/* Psychology & Journal Notes Editor */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              Trade Autopsy & Psychology Notes
            </h4>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was the entry trigger? Did you follow rules? Did you experience FOMO or revenge trading?"
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 font-sans focus:outline-none"
            />

            {/* Tag Management */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add tag (e.g. #fomo, #rules_followed, #gap_up)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {isSaved ? "Saved Successfully!" : "Save Journal Review"}
          </button>
        </div>
      </div>
    </div>
  );
};
