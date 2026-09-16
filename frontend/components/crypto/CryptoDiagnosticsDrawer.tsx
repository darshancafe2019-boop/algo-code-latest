"use client";

import React from "react";
import {
  X,
  SlidersHorizontal,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoDiagnosticsDrawerProps {
  isOpen: boolean;
  diagnostics: Array<{
    id: string;
    name: string;
    status: string;
    restStatus: string;
    wsStatus: string;
    latencyMs: number;
    contractsCount: number;
    subscriptionsCount: number;
    lastTickAge: string;
    reconnects: number;
    isCanonical: boolean;
  }>;
  onClose: () => void;
}

export const CryptoDiagnosticsDrawer: React.FC<CryptoDiagnosticsDrawerProps> = ({
  isOpen,
  diagnostics,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-[#050e1d] border-l border-[#143e69] shadow-2xl flex flex-col h-full z-10 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0f2d4e] bg-[#07192f]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#00D4FF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              CRYPTO PROVIDER DIAGNOSTICS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#050e1d] hover:bg-[#0c284a] text-slate-400 hover:text-white border border-[#143e69] transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          <p className="text-slate-400 text-xs">
            Real-time feed health, latency telemetry, and failover status for supported crypto derivative exchanges.
          </p>

          <div className="space-y-3">
            {diagnostics.map((prov) => {
              const isConn = prov.status === "CONNECTED";
              const isNotConf = prov.status === "NOT_CONFIGURED";

              return (
                <div
                  key={prov.id}
                  className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3 font-mono"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#0d2847]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-sans">{prov.name}</span>
                      {prov.isCanonical && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-bold border",
                        isConn
                          ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                          : isNotConf
                          ? "bg-slate-800 border-slate-700 text-slate-400"
                          : "bg-rose-950/60 border-rose-500 text-rose-300"
                      )}
                    >
                      {prov.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">REST API</span>
                      <span className="text-slate-200 font-bold">{prov.restStatus}</span>
                    </div>

                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">WEBSOCKET</span>
                      <span className={isConn ? "text-emerald-400 font-bold" : "text-slate-400"}>
                        {prov.wsStatus}
                      </span>
                    </div>

                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">CONTRACTS LOADED</span>
                      <span className="text-[#00D4FF] font-bold">{prov.contractsCount}</span>
                    </div>

                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">PING / LATENCY</span>
                      <span className="text-slate-200">{prov.latencyMs} ms</span>
                    </div>

                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">ACTIVE SUBSCRIPTIONS</span>
                      <span className="text-slate-200">{prov.subscriptionsCount}</span>
                    </div>

                    <div className="bg-[#050e1d] p-2 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">LAST TICK AGE</span>
                      <span className="text-slate-200">{prov.lastTickAge}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
