"use client";

import React from "react";
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaxAlertItemData {
  id: string;
  time: string | Date;
  type: "TAX" | "BROKER" | "RULE" | "BOT" | "DATA" | "FILING" | "RECONCILIATION";
  message: string;
  source: string;
  severity: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
}

interface TaxAlertsPanelProps {
  alerts: TaxAlertItemData[];
}

function formatIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso) return "—";
  try {
    const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d) + " IST";
  } catch {
    return "—";
  }
}

export function TaxAlertsPanel({ alerts }: TaxAlertsPanelProps) {
  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              TAX ALERTS & STATUTORY NOTIFICATIONS
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
              Advance Tax & Compliance
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#7D8EA5]">
            Action Gate: <span className="text-[#00F0FF] font-bold">MONITORED</span>
          </span>
        </div>

        {/* Alerts List */}
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alt) => {
            const isCrit = alt.severity === "CRITICAL";
            const isWarn = alt.severity === "WARNING";
            const isSuccess = alt.severity === "SUCCESS";
            return (
              <div
                key={alt.id}
                className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A] flex items-start gap-2.5 text-xs hover:border-[#168BFF]/40 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {isCrit ? (
                    <AlertOctagon className="h-3.5 w-3.5 text-[#FF3B5C]" />
                  ) : isWarn ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00E89A]" />
                  ) : (
                    <Info className="h-3.5 w-3.5 text-[#00F0FF]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[9px] font-bold text-[#22D3EE] uppercase tracking-wider">
                        [{alt.type}]
                      </span>
                      <span className="text-[10px] font-semibold text-[#F8FAFC]">
                        {alt.source}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-[#7D8EA5] shrink-0">
                      {formatIST(alt.time)}
                    </span>
                  </div>
                  <p className="text-[#7D8EA5] text-[11px] leading-tight font-sans">
                    {alt.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
        <span>Advance Tax Due Dates: <span className="text-[#00E89A]">15 Jun • 15 Sep • 15 Dec • 15 Mar</span></span>
        <span>Statutory Advice Disclaimer: <span className="text-[#F8FAFC]">Automated Computation Engine</span></span>
      </div>
    </div>
  );
}

