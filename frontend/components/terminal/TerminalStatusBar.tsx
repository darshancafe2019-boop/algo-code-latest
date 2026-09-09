"use client";

import React, { useState, useEffect } from "react";
import { Radio, Shield, Clock, Activity, Cpu } from "lucide-react";

interface TerminalStatusBarProps {
  brokerName?: string;
  isConnected?: boolean;
  latencyMs?: number;
  riskStatus?: string;
  candleMode?: "LIVE" | "CLOSED_CANDLE";
}

export function TerminalStatusBar({
  brokerName = "DELTA / DHAN / UPSTOX",
  isConnected = true,
  latencyMs = 12,
  riskStatus = "14/14 CHECKS PASSED",
  candleMode = "CLOSED_CANDLE",
}: TerminalStatusBarProps) {
  const [timeUtc, setTimeUtc] = useState("");
  const [timeIst, setTimeIst] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().slice(17, 25) + " UTC");
      setTimeIst(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-6 bg-[#131722] border-t border-[#2A2E39] px-3 flex items-center justify-between text-[10px] font-mono text-[#787B86] select-none shrink-0 z-30">
      {/* Left Telemetry: Broker, WebSocket, Latency */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-[#26A69A] animate-pulse" : "bg-[#EF5350]"
            }`}
          />
          <span className="text-[#D1D4DC] font-semibold">{brokerName}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 border-l border-[#2A2E39] pl-3">
          <Radio className="w-3 h-3 text-[#2962FF]" />
          <span>WS STREAM: </span>
          <span className="text-[#26A69A] font-bold">NORMALIZED</span>
        </div>

        <div className="hidden md:flex items-center gap-1 border-l border-[#2A2E39] pl-3">
          <Activity className="w-3 h-3 text-[#26A69A]" />
          <span>LATENCY: </span>
          <span className="text-[#D1D4DC] tabular-nums font-semibold">{latencyMs}ms</span>
        </div>
      </div>

      {/* Center: Execution & Risk Gate */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-amber-400" />
          <span>EVALUATION: </span>
          <span className="text-[#D1D4DC] font-semibold">{candleMode}</span>
        </div>

        <div className="flex items-center gap-1 border-l border-[#2A2E39] pl-3">
          <Shield className="w-3 h-3 text-[#26A69A]" />
          <span>RISK GATE: </span>
          <span className="text-[#26A69A] font-semibold">{riskStatus}</span>
        </div>
      </div>

      {/* Right: Real-time Clocks */}
      <div className="flex items-center gap-3 tabular-nums">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#787B86]" />
          <span className="text-[#D1D4DC]">{timeIst}</span>
        </div>
        <div className="hidden sm:block text-[#787B86] border-l border-[#2A2E39] pl-3">
          {timeUtc}
        </div>
      </div>
    </footer>
  );
}
