"use client";

import React, { useEffect, useState } from "react";
import { resolveContract, ResolvedContract } from "@/lib/contractResolver";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

interface ContractStatusBadgeProps {
  underlying?: string;
  broker?: string;
  instrumentType?: string;
  className?: string;
}

export const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({
  underlying = "NIFTY",
  broker = "UPSTOX",
  instrumentType = "FUT",
  className = "",
}) => {
  const [contract, setContract] = useState<ResolvedContract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await resolveContract({
      underlying,
      broker,
      instrumentType,
      expiryPreference: "AUTO",
    });
    setContract(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [underlying, broker, instrumentType]);

  const getStatusIcon = () => {
    if (!contract || contract.status === "EXPIRED" || contract.status === "INVALID") {
      return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
    }
    if (contract.status === "NEAR_EXPIRY") {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  };

  const getStatusBadge = () => {
    if (!contract) return <span className="text-xs text-rose-400 font-mono">UNRESOLVED ✕</span>;
    if (contract.status === "EXPIRED") return <span className="text-xs text-rose-400 font-mono">EXPIRED ✕</span>;
    if (contract.status === "NEAR_EXPIRY") return <span className="text-xs text-amber-400 font-mono">NEAR EXPIRY ⚠</span>;
    return <span className="text-xs text-emerald-400 font-mono">ACTIVE ✓</span>;
  };

  return (
    <div className={`p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs font-sans ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
          {getStatusIcon()}
          <span>CONTRACT</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="text-neutral-500 hover:text-neutral-300 transition"
            title="Refresh dynamic contract"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-1 text-neutral-400 text-[11px]">
        <div className="flex justify-between">
          <span>Instrument:</span>
          <span className="font-mono text-neutral-200">{contract?.tradingSymbol || `${underlying} ${instrumentType}`}</span>
        </div>
        <div className="flex justify-between">
          <span>Expiry:</span>
          <span className="font-mono text-emerald-300">{contract?.expiry || "Dynamic AUTO"}</span>
        </div>
        <div className="flex justify-between">
          <span>Source:</span>
          <span className="font-mono text-neutral-200">{broker}</span>
        </div>
        <div className="flex justify-between">
          <span>Key:</span>
          <span className="font-mono text-neutral-400 truncate max-w-[140px]" title={contract?.instrumentKey}>
            {contract?.instrumentKey || "NSE:NIFTY:AUTO:FUT"}
          </span>
        </div>
      </div>
    </div>
  );
};
