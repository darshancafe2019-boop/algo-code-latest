"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-6 text-slate-200 font-mono">
      <div className="max-w-md w-full bg-[#0E1626] border border-[#233553] rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
          <Terminal className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">404 — Route Not Found</h1>
          <p className="text-xs text-slate-400">
            The requested quantitative resource or view does not exist in Quant.OS.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
