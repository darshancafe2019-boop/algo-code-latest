"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { TaxDeadlineItem } from "@/types/tax";

interface TaxCalendarViewProps {
  deadlines: TaxDeadlineItem[];
  currency: string;
}

export function TaxCalendarView({ deadlines, currency }: TaxCalendarViewProps) {
  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string, days: number) => {
    if (status === "OVERDUE" || days < 0) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> OVERDUE ({Math.abs(days)}d)
        </span>
      );
    }
    if (status === "APPROACHING" || days <= 14) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> DUE IN {days} DAYS
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        UPCOMING ({days}d)
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              TAX PAYMENT & STATUTORY FILING CALENDAR
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Advance tax installments, annual returns, and withholding compliance deadlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Total Obligations:</span>
          <span className="font-bold text-amber-400">
            {formatCurrency(deadlines.reduce((acc, d) => acc + d.estimated_amount, 0))}
          </span>
        </div>
      </div>

      {/* Deadlines Timeline Table */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Due Date</th>
                <th className="py-3 px-4 font-medium">Jurisdiction</th>
                <th className="py-3 px-4 font-medium">Obligation / Title</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">Estimated Amount</th>
                <th className="py-3 px-4 font-medium">Statutory Citation</th>
                <th className="py-3 px-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deadlines.map((dl) => (
                <tr
                  key={dl.id}
                  className="hover:bg-slate-800/30 transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100 font-sans">
                      {dl.due_date}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {dl.tax_year}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                      {dl.country_code}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-slate-100 font-semibold font-sans">
                      {dl.title}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                      {dl.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-amber-400">
                    {dl.estimated_amount > 0 ? formatCurrency(dl.estimated_amount) : "Filing Only"}
                  </td>

                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {dl.statutory_reference}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {getStatusBadge(dl.status, dl.days_remaining)}
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
