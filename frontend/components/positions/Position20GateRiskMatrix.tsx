"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { RiskGateReport, RiskGateItem } from "@/types/data-core";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sliders,
} from "lucide-react";

export function Position20GateRiskMatrix() {
  const { environment } = useQuantDataCore();

  const { data: riskReport, isLoading, refetch } = useQuery({
    queryKey: ["v2_risk_gates", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: RiskGateReport }>(
        `/api/v2/positions/risk-gates?environment=${environment}`
      );
      return res.data?.data || null;
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const gates: RiskGateItem[] = riskReport?.gates || [];
  const overallArmed = riskReport?.overallStatus === "ARMED";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-border bg-card/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border ${
              overallArmed
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {overallArmed ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">20-Gate Institutional Risk Intelligence Matrix</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  overallArmed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                {riskReport?.overallStatus || "EVALUATING"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Continuous multi-tier pre-trade risk checks, Greek limits, VaR 99% cushions, and circuit breakers
            </p>
          </div>
        </div>

        {/* Stats and Refresh */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Armed:</span>
            <span className="font-bold text-emerald-400">{riskReport?.gatesArmed ?? 20}/20</span>
          </div>
          {riskReport?.gatesTriggered ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Triggered:</span>
              <span className="font-bold text-rose-400">{riskReport.gatesTriggered}</span>
            </div>
          ) : null}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Re-evaluate Risk Gates"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 20 Risk Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {gates.map((g) => {
          const isArmed = g.status === "ARMED";
          const isTriggered = g.status === "TRIGGERED";

          return (
            <div
              key={g.gateId}
              className={`p-3.5 rounded-xl border bg-card/30 flex flex-col justify-between space-y-3 transition-colors ${
                isTriggered
                  ? "border-rose-500/40 bg-rose-950/10"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">GATE #{g.gateId.toString().padStart(2, "0")}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                      isArmed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : isTriggered
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-foreground mt-1.5 line-clamp-1" title={g.name}>
                  {g.name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {g.reason}
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-muted-foreground">Threshold</span>
                  <div className="font-semibold text-foreground truncate">{g.threshold}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current</span>
                  <div className={`font-semibold truncate ${isTriggered ? "text-rose-400" : "text-emerald-400"}`}>
                    {g.currentValue}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
