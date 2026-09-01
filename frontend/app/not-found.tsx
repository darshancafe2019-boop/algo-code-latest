"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Bot, LayoutDashboard, Shield, TrendingUp } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/bots");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-6 text-slate-200 font-sans select-none">
      <div className="max-w-lg w-full bg-[#0E1626]/90 border border-[#233553] rounded-3xl p-8 shadow-2xl text-center space-y-6 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10 animate-pulse">
          <Bot className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ROUTE AUTO-RESOLVER</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">404 — Route Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The requested page or endpoint has been moved or does not exist. Redirecting you to the Bot Command Center in{" "}
            <span className="text-cyan-400 font-mono font-bold">{countdown}s</span>.
          </p>
        </div>

        {/* Quick Nav Destination Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Link
            href="/bots"
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all group"
          >
            <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Bot Fleet Center</span>
          </Link>

          <Link
            href="/positions"
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all group"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Active Positions</span>
          </Link>

          <Link
            href="/risk"
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all group"
          >
            <Shield className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Risk Center</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all group"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
            <span>Overview</span>
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/bots"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Bot Command Center</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
