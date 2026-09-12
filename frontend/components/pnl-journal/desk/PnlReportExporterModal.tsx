"use client";

import React, { useState } from "react";
import { X, Download, FileSpreadsheet, FileText, Check, Copy } from "lucide-react";
import { TradeRecord, PnlSummary, DayPnlRecord, CapitalEvent } from "@/types/pnl-journal";

interface PnlReportExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: TradeRecord[];
  summary: PnlSummary;
  calendarRecords: DayPnlRecord[];
  capitalEvents: CapitalEvent[];
}

export const PnlReportExporterModal: React.FC<PnlReportExporterModalProps> = ({
  isOpen,
  onClose,
  trades,
  summary,
  calendarRecords,
  capitalEvents,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Export CSV of Trade Journal
  const handleExportTradesCsv = () => {
    const headers = [
      "Trade ID",
      "Order ID",
      "Symbol",
      "Asset Class",
      "Broker",
      "Mode",
      "Side",
      "Entry Time",
      "Exit Time",
      "Entry Price",
      "Exit Price",
      "Quantity",
      "Gross PnL",
      "Brokerage",
      "STT",
      "Exchange Charges",
      "SEBI Charges",
      "GST",
      "Stamp Duty",
      "Total Charges",
      "Net PnL",
      "R Multiple",
      "Strategy",
      "Notes",
    ];

    const rows = trades.map((t) => [
      t.id,
      t.orderId || "",
      t.symbol,
      t.assetClass,
      t.broker,
      t.mode,
      t.side,
      t.entryTimestamp,
      t.exitTimestamp || "",
      t.entryPrice,
      t.exitPrice || "",
      t.quantity,
      t.grossPnl.toFixed(2),
      t.feeBreakdown.brokerage.toFixed(2),
      t.feeBreakdown.stt.toFixed(2),
      t.feeBreakdown.exchangeCharges.toFixed(2),
      t.feeBreakdown.sebiCharges.toFixed(2),
      t.feeBreakdown.gst.toFixed(2),
      t.feeBreakdown.stampDuty.toFixed(2),
      t.totalCharges.toFixed(2),
      t.netPnl.toFixed(2),
      t.rMultiple || "",
      t.strategy,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `QuantOS_Trade_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export CA Tax Audit CSV (Section 44AB & Schedule 115BBH)
  const handleExportCaAuditCsv = () => {
    const headers = [
      "Date",
      "Trades Count",
      "Gross Profit",
      "Gross Loss",
      "Total Turnover (Sec 44AB)",
      "STT Paid",
      "GST Paid",
      "Brokerage Paid",
      "Net Realized PnL",
    ];

    const rows = calendarRecords.map((c) => {
      const grossProfit = c.netPnl > 0 ? c.grossPnl : 0;
      const grossLoss = c.netPnl < 0 ? Math.abs(c.grossPnl) : 0;
      const sec44abTurnover = Math.abs(c.grossPnl);

      return [
        c.date,
        c.tradeCount,
        grossProfit.toFixed(2),
        grossLoss.toFixed(2),
        sec44abTurnover.toFixed(2),
        (c.charges * 0.4).toFixed(2), // Estimated STT portion
        (c.charges * 0.25).toFixed(2), // Estimated GST portion
        (c.charges * 0.35).toFixed(2), // Estimated Brokerage portion
        c.netPnl.toFixed(2),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `QuantOS_CA_Tax_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Copy Summary text to Clipboard
  const handleCopySummary = () => {
    const text = `
=== Quant.OS Institutional P&L Audit Report ===
Date: ${new Date().toLocaleDateString()}
Total Trades: ${summary.totalTrades}
Win Rate: ${summary.winRate.toFixed(2)}% (${summary.winningTradesCount}W / ${summary.losingTradesCount}L)
Gross P&L: ₹${summary.grossPnl.toFixed(2)}
Total Charges & Taxes: ₹${summary.totalCharges.toFixed(2)}
  - STT: ₹${summary.totalStt.toFixed(2)}
  - GST (18%): ₹${summary.totalGst.toFixed(2)}
  - Brokerage: ₹${summary.totalBrokerage.toFixed(2)}
Net Realized P&L: ₹${summary.realizedPnl.toFixed(2)}
Live Unrealized P&L: ₹${summary.unrealizedPnl.toFixed(2)}
Profit Factor: ${summary.profitFactor.toFixed(2)}
Trade Expectancy: ₹${summary.tradeExpectancy.toFixed(2)} / trade
Max Drawdown: -${summary.maxDrawdownPercent.toFixed(2)}% (₹${summary.maxDrawdownAmount.toFixed(2)})
Recovery Factor: ${summary.recoveryFactor.toFixed(2)}x
================================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                P&L Audit & Report Exporter
              </h3>
              <p className="text-xs text-slate-400">
                Institutional data exports for CA tax filing, ledger backup, and performance audits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 font-mono text-xs">
          {/* Option 1 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200">CA Tax-Audit Section 44AB Report</div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Daily turnover breakdown, STT, GST, and net profit ledger for Indian Chartered Accountants.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportCaAuditCsv}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 transition-colors"
            >
              Export CSV
            </button>
          </div>

          {/* Option 2 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200">Raw Trade Journal & Order Fills</div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Tick-by-tick fills, prices, fee breakdown, R-multiples, and strategy autopsy notes.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportTradesCsv}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shrink-0 transition-colors"
            >
              Export CSV
            </button>
          </div>

          {/* Option 3 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3">
              <Copy className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200">Copy Executive P&L Summary</div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Formatted text summary with win rate, profit factor, drawdown, and fee audit.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shrink-0 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
