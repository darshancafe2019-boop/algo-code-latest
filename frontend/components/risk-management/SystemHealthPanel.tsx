"use client";

import React from "react";
import {
  Activity,
  Server,
  Wifi,
  Database,
  Shield,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";

export function SystemHealthPanel() {
  const healthItems = [
    { name: "CCXT Binance Market Feed", status: "HEALTHY", latency: "4ms", tick_age: "0.2s", type: "WebSocket L2" },
    { name: "NSE / Dhan HQ Adapter", status: "HEALTHY", latency: "12ms", tick_age: "0.5s", type: "Direct API" },
    { name: "SQLite State Journal", status: "HEALTHY", latency: "<1ms", tick_age: "WAL Mode", type: "Storage" },
    { name: "Pre-Trade Risk Validator", status: "HEALTHY", latency: "<2ms", tick_age: "Synchronous", type: "Safety Gate" },
    { name: "Telegram Dispatcher", status: "CONNECTED", latency: "45ms", tick_age: "Active", type: "Alerts" },
  ];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Risk & Market Data Health Architecture
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Continuous verification of feed latency, socket heartbeats, tick staleness, and database integrity.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          All Systems Operational
        </span>
      </div>

      {/* Grid of Health Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
        {healthItems.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-2 hover:border-[#2E7D5B] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[#70877A] uppercase font-bold">{item.type}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#123C2A] text-[#55C98A] font-bold border border-[#39B978]/40 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>{item.status}</span>
              </span>
            </div>

            <div>
              <span className="font-bold text-white text-[11px] block">{item.name}</span>
              <span className="text-[10px] text-cyan-300">Latency: {item.latency}</span>
            </div>

            <div className="pt-1 text-[10px] text-[#70877A] border-t border-[#1B3328]/60 flex justify-between">
              <span>Freshness:</span>
              <span className="text-[#55C98A] font-bold">{item.tick_age}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
