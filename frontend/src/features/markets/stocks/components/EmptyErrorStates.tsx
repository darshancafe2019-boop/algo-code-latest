"use client";

import React from "react";
import { AlertCircle, SearchX, WifiOff, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  type: "no_results" | "error" | "offline";
  message?: string;
  onRetry?: () => void;
}

export const EmptyErrorStates: React.FC<EmptyStateProps> = ({
  type,
  message,
  onRetry,
}) => {
  if (type === "no_results") {
    return (
      <div className="p-12 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800/60 font-mono">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-400">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-white font-bold text-sm">No Matching Stocks Found</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            {message || "Try loosening your search terms, changing exchange filters, or resetting the screener."}
          </p>
        </div>
      </div>
    );
  }

  if (type === "offline") {
    return (
      <div className="p-12 text-center space-y-3 bg-amber-950/20 rounded-2xl border border-amber-500/30 font-mono">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400">
          <WifiOff className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-amber-200 font-bold text-sm">Network Offline</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Unable to connect to market data gateway. Retrying automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 text-center space-y-4 bg-rose-950/20 rounded-2xl border border-rose-500/30 font-mono">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-rose-200 font-bold text-sm">Market Data Feed Error</h3>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          {message || "An unexpected error occurred while loading stock records."}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-2 mx-auto border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Query</span>
        </button>
      )}
    </div>
  );
};
