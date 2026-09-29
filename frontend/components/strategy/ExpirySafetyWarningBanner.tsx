"use client";

import React from "react";
import { AlertTriangle, Calendar, ShieldAlert, Clock, Info } from "lucide-react";
import { ExpiryValidationResult } from "@/lib/derivatives/contractValidationService";

interface ExpirySafetyWarningBannerProps {
  validationResult: ExpiryValidationResult;
  onSelectExpiry: (expiry: string) => void;
  availableExpiries?: string[];
}

export const ExpirySafetyWarningBanner: React.FC<ExpirySafetyWarningBannerProps> = ({
  validationResult,
  onSelectExpiry,
  availableExpiries = [],
}) => {
  if (validationResult.isValid && validationResult.status === "NORMAL") {
    return null;
  }

  const isExpired = validationResult.status === "EXPIRED" || validationResult.isBlocked;
  const isCritical = validationResult.status === "EXPIRY_CRITICAL";
  const isExpiryDay = validationResult.status === "EXPIRY_DAY";
  const isApproaching = validationResult.status === "EXPIRY_APPROACHING";

  const getStatusBadge = () => {
    if (isExpired) return { label: "EXPIRED (EXECUTION BLOCKED)", color: "bg-rose-950/80 text-rose-300 border-rose-800/60" };
    if (isCritical) return { label: "EXPIRY CRITICAL (<2H REMAINING)", color: "bg-rose-900/60 text-rose-200 border-rose-700/60 animate-pulse" };
    if (isExpiryDay) return { label: "EXPIRY DAY (HIGH RISK)", color: "bg-amber-950/80 text-amber-300 border-amber-800/60" };
    if (isApproaching) return { label: "EXPIRY APPROACHING (6-24H)", color: "bg-blue-950/80 text-cyan-300 border-cyan-800/60" };
    return { label: "NEAR EXPIRY", color: "bg-amber-950/80 text-amber-300 border-amber-800/60" };
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`rounded-xl border p-4 mb-4 transition-all duration-200 ${
        isExpired || isCritical
          ? "bg-rose-950/20 border-rose-800/50 text-rose-300"
          : isExpiryDay
          ? "bg-amber-950/20 border-amber-800/50 text-amber-300"
          : "bg-cyan-950/20 border-cyan-800/50 text-cyan-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {isExpired || isCritical ? (
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span>CONTRACT EXPIRY GOVERNANCE</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badge.color}`}>
                {badge.label}
              </span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/50 border border-slate-800 text-slate-300">
              Contract: {validationResult.expiry} | Today: {validationResult.currentDate}
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-2 leading-relaxed">
            {validationResult.blockingReason ||
              "Expiry is approaching or expiring today. To safeguard capital and prevent delta decay slippage, automated rollover is disabled. Please verify your contract selection."}
          </p>

          {/* Timestamp and Settlement Transparency Pill Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-black/40 p-2.5 rounded-lg border border-slate-800/60 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Expiry Time</span>
              <span className="text-slate-200 font-bold">{validationResult.expiryTime || "15:30 IST / 17:30 IST"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Settlement</span>
              <span className="text-slate-200 font-bold">{validationResult.settlementMethod || "CASH_SETTLED"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Days to Expiry (DTE)</span>
              <span className={validationResult.daysToExpiry <= 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {validationResult.dte !== undefined ? `${validationResult.dte.toFixed(2)} DTE` : `${validationResult.daysToExpiry}d`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Auto-Rollover</span>
              <span className="text-amber-400 font-bold">DISABLED (User Control)</span>
            </div>
          </div>

          {/* Replacement Expiry Quick Selector */}
          <div className="bg-black/30 rounded-lg p-2.5 border border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Active Replacement Contract (Explicit Confirmation Required):</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {validationResult.suggestedExpiries && validationResult.suggestedExpiries.length > 0 ? (
                validationResult.suggestedExpiries.map((exp, idx) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => onSelectExpiry(exp)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-sm"
                  >
                    <span>{exp}</span>
                    {idx === 0 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans">
                        Next Valid
                      </span>
                    )}
                  </button>
                ))
              ) : availableExpiries.length > 0 ? (
                availableExpiries
                  .filter((e) => e > validationResult.currentDate)
                  .slice(0, 4)
                  .map((exp, idx) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => onSelectExpiry(exp)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-sm"
                    >
                      <span>{exp}</span>
                      {idx === 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans">
                          Next Valid
                        </span>
                      )}
                    </button>
                  ))
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  No active expiration cycles returned from provider catalog. Please check market connection.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

