"use client";

import React from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Plus,
  Sliders,
  Globe,
  Database,
} from "lucide-react";
import {
  FUTURES_PROVIDER_REGISTRY,
  SECONDARY_PROVIDERS_CATALOG,
} from "../types/provider-registry";

export function FuturesOtherProvidersView() {
  return (
    <div className="space-y-5 font-sans text-slate-200">
      {/* Overview Banner */}
      <div className="p-5 bg-gradient-to-r from-[#0E1524] to-[#161D2F] border border-cyan-500/30 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Futures Provider & Market Ecosystem</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Extensible provider architecture. Connect additional global, Indian, or crypto licensed exchanges seamlessly.
            </p>
          </div>
        </div>

        <Link
          href="/settings/brokers"
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Manage API Credentials</span>
        </Link>
      </div>

      {/* 1. Core Configured Providers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Primary Normalized Futures Adapters</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            5 ACTIVE DRIVERS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FUTURES_PROVIDER_REGISTRY.filter((p) => p.provider_id !== "OTHER").map((prov) => (
            <div
              key={prov.provider_id}
              className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition">
                    {prov.display_name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {prov.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{prov.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Adapter Online</span>
                </div>
                <Link
                  href={prov.route}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition"
                >
                  <span>Open Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Secondary Ready-to-Connect Providers Catalog */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Extensible Provider Connectors</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Plug & Play Driver Catalogue</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SECONDARY_PROVIDERS_CATALOG.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">
                    {item.category}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1 font-mono text-[10px]">
                  {item.supported_assets.map((asset) => (
                    <span key={asset} className="px-1.5 py-0.5 rounded bg-[#080C14] text-slate-400 border border-[#1E293B]">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Standard API Key Auth</span>
                <Link
                  href="/settings/brokers"
                  className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800 rounded-lg font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Connect</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
