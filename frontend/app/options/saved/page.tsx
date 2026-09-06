"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { Bookmark, Plus, Trash2, ArrowUpRight, Shield, Layers, Radio } from "lucide-react";
import { OptionSource } from "@/types/option-chain";

interface SavedOptionChainConfig {
  id: string;
  name: string;
  provider: OptionSource;
  underlying: string;
  expiryPreference: string;
  strikeRange: number;
  filterMoneyness: "ALL" | "ITM" | "ATM" | "OTM";
  createdAt: string;
}

const STORAGE_KEY = "quantos_saved_option_chains";

const DEFAULT_SAVED_CHAINS: SavedOptionChainConfig[] = [
  {
    id: "saved-1",
    name: "NIFTY Weekly Main (Dhan)",
    provider: "DHAN",
    underlying: "NIFTY",
    expiryPreference: "CURRENT",
    strikeRange: 20,
    filterMoneyness: "ALL",
    createdAt: new Date().toISOString(),
  },
  {
    id: "saved-2",
    name: "BANKNIFTY F&O (Upstox)",
    provider: "UPSTOX",
    underlying: "BANKNIFTY",
    expiryPreference: "CURRENT",
    strikeRange: 20,
    filterMoneyness: "ATM",
    createdAt: new Date().toISOString(),
  },
  {
    id: "saved-3",
    name: "BTC Crypto Volatility (Delta)",
    provider: "DELTA_INDIA",
    underlying: "BTC",
    expiryPreference: "CURRENT",
    strikeRange: 20,
    filterMoneyness: "ALL",
    createdAt: new Date().toISOString(),
  },
  {
    id: "saved-4",
    name: "ETH Options (Binance)",
    provider: "BINANCE",
    underlying: "ETH",
    expiryPreference: "CURRENT",
    strikeRange: 10,
    filterMoneyness: "ALL",
    createdAt: new Date().toISOString(),
  },
];

export default function SavedOptionChainsPage() {
  const router = useRouter();
  const [savedChains, setSavedChains] = useState<SavedOptionChainConfig[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState<OptionSource>("DHAN");
  const [newUnderlying, setNewUnderlying] = useState("NIFTY");
  const [newStrikeRange, setNewStrikeRange] = useState(20);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedChains(JSON.parse(stored));
      } else {
        setSavedChains(DEFAULT_SAVED_CHAINS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAVED_CHAINS));
      }
    } catch {
      setSavedChains(DEFAULT_SAVED_CHAINS);
    }
  }, []);

  const saveToStorage = (chains: SavedOptionChainConfig[]) => {
    setSavedChains(chains);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chains));
    } catch {}
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedChains.filter((c) => c.id !== id);
    saveToStorage(updated);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newChain: SavedOptionChainConfig = {
      id: `saved-${Date.now()}`,
      name: newName.trim(),
      provider: newProvider,
      underlying: newUnderlying,
      expiryPreference: "CURRENT",
      strikeRange: newStrikeRange,
      filterMoneyness: "ALL",
      createdAt: new Date().toISOString(),
    };

    saveToStorage([newChain, ...savedChains]);
    setIsAdding(false);
    setNewName("");
  };

  const handleOpenChain = (chain: SavedOptionChainConfig) => {
    const providerRouteMap: Record<string, string> = {
      DHAN: "/options/dhan",
      UPSTOX: "/options/upstox",
      DELTA_INDIA: "/options/delta",
      DELTA: "/options/delta",
      BINANCE: "/options/binance",
      ALL: "/options",
    };
    const targetRoute = providerRouteMap[chain.provider] || "/options";
    router.push(targetRoute);
  };

  return (
    <DirectPageLayout activeTab="options">
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#0B132B]/90 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                SAVED OPTION CHAINS
              </h1>
              <p className="text-xs text-slate-400">
                Preset underlying instruments, providers, and strike filters. Market data is always fetched live.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-bold transition shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? "Cancel" : "Save Current View"}</span>
          </button>
        </div>

        {/* Add Modal / Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="p-5 bg-[#0D182E] border border-sky-500/30 rounded-2xl shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-sm font-bold text-sky-300">Save Custom Option Chain Preset</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Preset Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. NIFTY Expiry Scalp"
                  className="w-full bg-[#141E33] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Provider Source</label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value as OptionSource)}
                  className="w-full bg-[#141E33] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="DHAN">Dhan (NSE)</option>
                  <option value="UPSTOX">Upstox (NSE F&O)</option>
                  <option value="DELTA_INDIA">Delta Exchange India</option>
                  <option value="BINANCE">Binance Options</option>
                  <option value="ALL">Smart View (All)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Underlying Symbol</label>
                <input
                  type="text"
                  value={newUnderlying}
                  onChange={(e) => setNewUnderlying(e.target.value.toUpperCase())}
                  placeholder="NIFTY, BANKNIFTY, BTC"
                  className="w-full bg-[#141E33] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Strike Range</label>
                <select
                  value={newStrikeRange}
                  onChange={(e) => setNewStrikeRange(Number(e.target.value))}
                  className="w-full bg-[#141E33] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-400"
                >
                  <option value={10}>ATM ± 5</option>
                  <option value={20}>ATM ± 10</option>
                  <option value={40}>ATM ± 20</option>
                  <option value={100}>All Available</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
              >
                Save Preset
              </button>
            </div>
          </form>
        )}

        {/* Saved Chains Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedChains.map((chain) => (
            <div
              key={chain.id}
              onClick={() => handleOpenChain(chain)}
              className="p-5 bg-[#0B132B]/80 hover:bg-[#0E1A38] border border-slate-800 hover:border-sky-500/50 rounded-2xl transition cursor-pointer group shadow-lg flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-mono font-bold">
                    SOURCE: {chain.provider}
                  </span>
                  <button
                    onClick={(e) => handleDelete(chain.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    title="Delete saved preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-sm font-bold text-white group-hover:text-sky-300 transition font-mono">
                  {chain.name}
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Underlying: <span className="text-slate-200 font-bold">{chain.underlying}</span> · Strikes: ATM ± {chain.strikeRange / 2}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
                <span className="flex items-center gap-1 text-sky-400 group-hover:translate-x-0.5 transition">
                  Open Chain <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DirectPageLayout>
  );
}
