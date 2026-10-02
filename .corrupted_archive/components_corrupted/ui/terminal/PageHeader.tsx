"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Shield, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  category?: string;
  marketStatus?: "OPEN" | "CLOSED" | "PRE_OPEN" | "WEEKEND" | string;
  broker?: string;
  brokerStatus?: "LIVE" | "CONNECTING" | "RECONNECTING" | "OFFLINE" | string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  category,
  marketStatus = "OPEN",
  broker = "DHAN HQ",
  brokerStatus = "LIVE",
  actions,
  className = "",
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-lg bg-[#07101F] border border-[#162238] shadow-md flex flex-wrap items-center justify-between gap-3 relative overflow-hidden ${className}`}
    >
      {/* Top Tech Accent Line */}
      <div className="absolute top-0 left-4 h-[2px] w-20 bg-gradient-to-r from-cyan-400 via-cyan-500/80 to-transparent" />

      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-[#0A1426] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.15)] flex-shrink-0">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold font-mono tracking-wide text-slate-100 uppercase truncate">
              {title}
            </h1>
            {category && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {category}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0 text-xs font-mono">
        {/* Market Status */}
        {marketStatus && (
          <StatusBadge
            variant={marketStatus === "OPEN" ? "live" : "neutral"}
            label={`MARKET: ${marketStatus}`}
            size="sm"
          />
        )}

        {/* Broker Status */}
        {broker && (
          <StatusBadge
            variant={brokerStatus === "LIVE" ? "live" : brokerStatus === "CONNECTING" ? "connecting" : "paper"}
            label={`${broker}: ${brokerStatus}`}
            size="sm"
          />
        )}

        {/* Live Clock */}
        {timeStr && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A1426] border border-[#162238] text-[11px] text-slate-300 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeStr}</span>
          </div>
        )}

        {/* Custom Actions */}
        {actions && <div className="flex items-center gap-2 ml-1">{actions}</div>}
      </div>
    </div>
  );
};
