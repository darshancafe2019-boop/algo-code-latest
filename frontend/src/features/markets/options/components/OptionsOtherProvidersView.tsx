"use client";

import React, { useState } from "react";
import {
  Layers,
  Shield,
  Zap,
  Globe,
  CheckCircle2,
  ExternalLink,
  Lock,
  ArrowUpRight,
  Server,
  Activity,
  Sliders,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  SECONDARY_OPTIONS_PROVIDERS_CATALOG,
  SecondaryOptionsProvider,
} from "../types/provider-registry";

export function OptionsOtherProvidersView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeModalProvider, setActiveModalProvider] = useState<SecondaryOptionsProvider | null>(null);

  const categories = ["ALL", "Indian Broker", "Global / US", "Crypto Derivatives", "Market Data Gateway"];

  const filteredProviders =
    selectedCategory === "ALL"
      ? SECONDARY_OPTIONS_PROVIDERS_CATALOG
      : SECONDARY_OPTIONS_PROVIDERS_CATALOG.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B132B] via-slate-900 to-[#0F172A] border border-slate-800 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
              MODULAR OPTIONS PROVIDER REGISTRY & CONNECTORS
            </h1>
            <p className="text-xs text-slate-400">
              Plug-and-play architecture for multi-broker market data feeds, Greeks computation, and multi-leg order routing
            </p>
          </div>
        </div>

        <Link
          href="/settings/brokers"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-900/30"
        >
          <Settings className="h-4 w-4" />
          Manage Broker Credentials
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              selectedCategory === cat
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50 font-bold"
                : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-lg group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {provider.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    provider.status === "Ready for Activation"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {provider.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition font-mono">
                {provider.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{provider.description}</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              {/* Capabilities checklist */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={provider.capabilities.optionChain ? "text-emerald-400" : "text-slate-600"}>●</span>
                  Option Chain: {provider.capabilities.optionChain ? "YES" : "NO"}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={provider.capabilities.streaming ? "text-emerald-400" : "text-slate-600"}>●</span>
                  Live WS: {provider.capabilities.streaming ? "YES" : "NO"}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={provider.capabilities.greeks ? "text-emerald-400" : "text-slate-600"}>●</span>
                  Greeks/IV: {provider.capabilities.greeks ? "YES" : "NO"}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={provider.capabilities.liveExecution ? "text-emerald-400" : "text-slate-600"}>●</span>
                  Live Execution: {provider.capabilities.liveExecution ? "YES" : "NO"}
                </div>
              </div>

              {/* Supported underlyings badges */}
              <div className="flex flex-wrap gap-1">
                {provider.supportedUnderlyings.map((sym) => (
                  <span
                    key={sym}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-400 border border-slate-800"
                  >
                    {sym}
                  </span>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Auth: {provider.authType}</span>
                <button
                  onClick={() => setActiveModalProvider(provider)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white transition flex items-center gap-1"
                >
                  Configure <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {activeModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">{activeModalProvider.name}</h3>
                <span className="text-[10px] text-slate-400">Connector Setup & Readiness</span>
              </div>
              <button
                onClick={() => setActiveModalProvider(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Authentication Protocol</div>
                <div className="text-white font-bold">{activeModalProvider.authType}</div>
                <div className="text-slate-500 text-[10px]">
                  Secure server-side token management. Credentials never exposed to client-side JS.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Supported Markets</div>
                <div className="text-cyan-400">{activeModalProvider.supportedMarkets.join(", ")}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Safety & Execution Defaults</div>
                <div className="text-emerald-400 font-bold">Default Mode: PAPER (Simulation)</div>
                <div className="text-slate-500 text-[10px]">
                  Live order execution requires verified API credentials and deliberate operator authorization.
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Link
                href="/settings/brokers"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-center transition"
              >
                Setup in Settings → Brokers
              </Link>
              <button
                onClick={() => setActiveModalProvider(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
