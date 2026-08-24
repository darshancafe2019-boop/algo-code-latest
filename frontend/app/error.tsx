"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Quant.OS Client Component Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-200 font-mono">
      <div className="max-w-lg w-full bg-[#0E1626] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Component Rendering Degraded</h2>
            <p className="text-xs text-slate-400">Quant.OS Core Fail-Safe Guard</p>
          </div>
        </div>

        <div className="bg-[#070B14] border border-[#233553] rounded-xl p-3 text-xs text-amber-300/90 break-words font-mono">
          {error.message || "An unexpected error occurred during rendering."}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg bg-[#15213A] hover:bg-[#233553] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => reset()}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Component</span>
          </button>
        </div>
      </div>
    </div>
  );
}
