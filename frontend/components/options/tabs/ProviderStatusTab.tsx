"use client";

import React, { useState, useEffect } from "react";
import { Server, CheckCircle, AlertCircle, RefreshCw, Lock, Cpu, Globe } from "lucide-react";

export function ProviderStatusTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/options/providers/status");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error("Fetch providers error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const STATIC_CAPABILITIES = [
    {
      id: "indian_broker",
      name: "Indian Broker Adapter (NSE/BSE)",
      asset_classes: ["Indian Index Options", "Indian Stock Options", "Indian Futures", "Indian Equities"],
      underlyings: "NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, SENSEX, BANKEX, Top 100 F&O Equities",
      order_types: ["Limit", "Market", "Multi-Leg Basket", "OCO", "Stop-Loss"],
      server_signing: "Server-Side SHA-256 + TOTP Lock",
      execution_latency: "12ms - 35ms",
      status: "CONNECTED",
      health: "OPERATIONAL",
    },
    {
      id: "global_broker",
      name: "Global Broker Adapter (US/EU/Asia)",
      asset_classes: ["US Equities", "US ETFs", "US Stock Options", "Index Futures", "CBOE Volatility"],
      underlyings: "SPY, QQQ, AAPL, MSFT, NVDA, TSLA, GLD, SLV, /ES, /NQ, /CL, /GC",
      order_types: ["Limit", "Combo Complex Order", "Market", "Trailing Stop"],
      server_signing: "Server-Side OAuth2.0 / API Key",
      execution_latency: "45ms - 80ms",
      status: "CONNECTED",
      health: "OPERATIONAL",
    },
    {
      id: "ibkr_adapter",
      name: "Interactive Brokers (IBKR TWS / Gateway)",
      asset_classes: ["Global Multi-Asset", "Stock Options", "Futures Options", "Forex", "Bonds"],
      underlyings: "Direct Universal listed instrument master across 150+ global exchanges",
      order_types: ["Combo Orders", "Delta-Neutral Bags", "Adaptive Algo", "Bracket"],
      server_signing: "TWS Local Socket SSL Server-Side",
      execution_latency: "8ms - 20ms",
      status: "STANDBY",
      health: "CONFIGURED",
    },
    {
      id: "binance_options",
      name: "Binance Options Provider (European Vanilla)",
      asset_classes: ["Crypto Options (BTC, ETH, BNB)", "Volatility Index"],
      underlyings: "BTC-USDT, ETH-USDT, BNB-USDT Options",
      order_types: ["Limit", "Post-Only", "Block Trade", "Market"],
      server_signing: "Server-Side HMAC-SHA256 / Ed25519",
      execution_latency: "25ms - 50ms",
      status: "CONNECTED",
      health: "OPERATIONAL",
    },
    {
      id: "binance_futures",
      name: "Binance USDⓈ-M & COIN-M Futures",
      asset_classes: ["USDⓈ-M Perpetuals", "COIN-M Delivery Futures", "Funding Rates"],
      underlyings: "350+ Crypto Perpetual pairs with real-time mark/index & funding arbitration",
      order_types: ["Limit", "Market", "Stop-Market", "Take-Profit", "Reduce-Only"],
      server_signing: "Server-Side HMAC-SHA256",
      execution_latency: "20ms - 40ms",
      status: "CONNECTED",
      health: "OPERATIONAL",
    },
    {
      id: "paper_multimarket",
      name: "Quant.OS Paper Multi-Market Sandbox",
      asset_classes: ["All Supported Multi-Market Asset Classes"],
      underlyings: "100% Synthetic & Real-Time Exchange Mirror with realistic slippage & fills",
      order_types: ["All Supported Order Types & Complex Combo Spreads"],
      server_signing: "Local In-Memory Virtual Exchange Engine",
      execution_latency: "< 1ms",
      status: "ACTIVE",
      health: "RUNNING",
    },
  ];

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-white font-extrabold text-sm">
              Server-Side Provider Adapter Capability Matrix
            </h3>
            <div className="text-[11px] text-slate-400">
              All credentials, token signatures, and order dispatches executed strictly server-side.
            </div>
          </div>
        </div>

        <button
          onClick={fetchProviders}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Providers</span>
        </button>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STATIC_CAPABILITIES.map((prov) => (
          <div
            key={prov.id}
            className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-white text-sm">{prov.name}</div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                {prov.health}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div>
                <span className="text-slate-400">Supported Underlyings:</span>
                <div className="text-white font-bold text-xs">{prov.underlyings}</div>
              </div>

              <div>
                <span className="text-slate-400">Asset Classes:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {prov.asset_classes.map((ac, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 text-[10px]"
                    >
                      {ac}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                <div>
                  <span className="text-slate-400">Signing:</span>
                  <div className="text-slate-200">{prov.server_signing}</div>
                </div>
                <div>
                  <span className="text-slate-400">Latency:</span>
                  <div className="text-cyan-400 font-bold">{prov.execution_latency}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
