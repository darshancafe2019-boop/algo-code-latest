"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  RefreshCw,
  Send,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

interface TaxQuickActionsProps {
  onGenerateReport: () => void;
  onDownloadTradeBook: () => void;
  onRecalculateTax: () => void;
  onFileItrData: () => void;
  onSyncAllBrokers: () => void;
  isRecalculating: boolean;
}

export function TaxQuickActions({
  onGenerateReport,
  onDownloadTradeBook,
  onRecalculateTax,
  onFileItrData,
  onSyncAllBrokers,
  isRecalculating,
}: TaxQuickActionsProps) {
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const handleActionFeedback = (msg: string, fn: () => void) => {
    fn();
    setCopiedStatus(msg);
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#00F0FF]" />
          <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
            STATUTORY TAX ACTIONS & EXPORT SUITE
          </span>
          {copiedStatus && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30 font-semibold animate-fadeIn">
              {copiedStatus}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleActionFeedback("Generating Tax Report...", onGenerateReport)}
            className="px-3 py-1.5 rounded-[5px] bg-[#06101B] hover:bg-[#10263A] border border-[#122A42] hover:border-[#168BFF]/50 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#00F0FF]" />
            <span>Generate Tax Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionFeedback("Downloading Reconciled Trade Book...", onDownloadTradeBook)}
            className="px-3 py-1.5 rounded-[5px] bg-[#06101B] hover:bg-[#10263A] border border-[#122A42] hover:border-[#168BFF]/50 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#00E89A]" />
            <span>Download Trade Book</span>
          </button>

          <button
            type="button"
            onClick={onRecalculateTax}
            disabled={isRecalculating}
            className="px-3 py-1.5 rounded-[5px] bg-[#06101B] hover:bg-[#10263A] border border-[#122A42] hover:border-[#168BFF]/50 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isRecalculating ? "animate-spin" : ""}`} />
            <span>Recalculate Tax</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionFeedback("Checking ITR-2/ITR-3 Filing Readiness...", onFileItrData)}
            className="px-3 py-1.5 rounded-[5px] bg-[#06101B] hover:bg-[#10263A] border border-[#122A42] hover:border-[#168BFF]/50 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-purple-400" />
            <span>File ITR Data</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionFeedback("Synchronizing All 4 Broker Ledgers...", onSyncAllBrokers)}
            className="px-3 py-1.5 rounded-[5px] bg-[#168BFF] hover:bg-[#1270D0] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Database className="h-3.5 w-3.5 text-white" />
            <span>Sync All Brokers</span>
          </button>
        </div>
      </div>
    </div>
  );
}

