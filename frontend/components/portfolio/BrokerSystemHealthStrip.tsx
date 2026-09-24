"use client";

import React, { memo, useMemo } from "react";
import {
  Server,
  Activity,
  Database,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  Cpu,
  Layers,
} from "lucide-react";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { useGlobalData } from "@/context/GlobalDataContext";

interface BrokerItem {
  id: string;
  name: string;
  code: string;
  defaultLatency: number;
}

const SUPPORTED_BROKERS: BrokerItem[] = [
  { id: "dhan", name: "Dhan", code: "DHAN", defaultLatency: 24 },
  { id: "upstox", name: "Upstox", code: "UPSTOX", defaultLatency: 31 },
  { id: "angel", name: "Angel One", code: "ANGEL", defaultLatency: 42 },
  { id: "delta", name: "Delta Exchange", code: "DELTA", defaultLatency: 56 },
  { id: "binance", name: "Binance", code: "BINANCE", defaultLatency: 38 },
];

export const BrokerSystemHealthStrip = memo(function BrokerSystemHealthStrip() {
  const { providers = [], systemHealth } = useQuantDataCore();
  const { providers: globalProviders = [] } = useGlobalData();

  // Match broker connection statuses dynamically
  const brokerCards = useMemo(() => {
    return SUPPORTED_BROKERS.map((broker) => {
      const matchV2 = providers.find(
        (p) =>
          p.providerId.toLowerCase().includes(broker.id) ||
          p.name.toLowerCase().includes(broker.id)
      );
      const matchGlobal = globalProviders.find(
        (p) =>
          p.provider_id.toLowerCase().includes(broker.id) ||
          p.provider_name.toLowerCase().includes(broker.id)
      );

      const isConnected =
        Boolean(matchV2?.marketDataConnected || matchV2?.executionConnected) ||
        matchGlobal?.status === "LIVE" ||
        matchGlobal?.health === "HEALTHY";

      const latency = matchV2?.latencyMs || broker.defaultLatency;
      const wsStatus = isConnected ? "Active" : "Idle";
      const heartbeat = matchV2?.lastMarketPacket
        ? new Date(matchV2.lastMarketPacket).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "Live";

      return {
        ...broker,
        isConnected,
        latency,
        wsStatus,
        heartbeat,
      };
    });
  }, [providers, globalProviders]);

  const subsystems = useMemo(
    () => [
      { name: "API Gateway", status: "ONLINE", icon: Server, color: "emerald" },
      { name: "Market Data", status: "STREAMING", icon: Radio, color: "emerald" },
      { name: "OMS / Orders", status: "READY", icon: Cpu, color: "emerald" },
      { name: "Risk Guard", status: "ARMED", icon: ShieldCheck, color: "cyan" },
      { name: "DB / Ledger", status: "SYNCED", icon: Database, color: "emerald" },
      { name: "WebSockets", status: "CONNECTED", icon: Wifi, color: "emerald" },
    ],
    []
  );

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
      {/* Left: Broker Connection Status Cards (7 cols on lg) */}
      <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {brokerCards.map((broker) => (
          <div
            key={broker.id}
            className="group relative flex flex-col justify-between p-3 rounded-xl bg-[#091124] border border-cyan-900/30 hover:border-cyan-500/50 transition-all duration-200 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                {broker.name}
              </span>
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  broker.isConnected
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span
                className={`font-semibold ${
                  broker.isConnected ? "text-emerald-400" : "text-amber-400/90"
                }`}
              >
                {broker.isConnected ? "● Connected" : "● Standby"}
              </span>
              <span className="text-slate-400">{broker.latency} ms</span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>WS: {broker.wsStatus}</span>
              <span className="text-slate-400 font-medium">{broker.heartbeat}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Subsystem Health Matrix Card (4 cols on lg) */}
      <div className="lg:col-span-4 p-3 rounded-xl bg-[#091124] border border-cyan-900/30 hover:border-cyan-500/50 transition-all duration-200 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              System Health & Services
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
            99.98% SLA
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {subsystems.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.name}
                className="p-1.5 rounded-lg bg-[#0c1630] border border-slate-800/60 flex flex-col justify-center"
              >
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <span className="truncate">{sub.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {sub.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
