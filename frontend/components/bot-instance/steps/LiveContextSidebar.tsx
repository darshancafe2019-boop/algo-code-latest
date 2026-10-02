"use client";

import React, { useMemo } from "react";
import {
  Activity,
  Server,
  Radio,
  Wallet,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Building,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import {
  resolveProviderRuntime,
  resolveActiveBrokerAccount,
  validateStep1,
} from "./Step1IdentityCapital";

export function LiveContextSidebar() {
  const store = useBotCreationStore();
  const { accounts, providers } = useQuantDataCore();
  const { identity, capital, market, instrument, risk, provider, strategies, currentStep } = store;

  const isPaper = identity.environment === "PAPER";

  // 1. Resolve Active Verified Account
  const activeAccount = useMemo(() => {
    return resolveActiveBrokerAccount(accounts, provider.executionBroker, identity.environment);
  }, [accounts, provider.executionBroker, identity.environment]);

  // 2. Real Broker Funds
  const verifiedAvailableCash = activeAccount?.availableCash ?? (isPaper ? 100000 : null);
  const remainingCapital =
    verifiedAvailableCash !== null ? Math.max(0, verifiedAvailableCash - capital.allocatedCapital) : null;

  // 3. Resolve Real Provider Runtimes
  const brokerRuntime = useMemo(
    () => resolveProviderRuntime(provider.executionBroker, providers),
    [provider.executionBroker, providers]
  );
  const primaryDataRuntime = useMemo(
    () => resolveProviderRuntime(provider.marketDataProvider, providers),
    [provider.marketDataProvider, providers]
  );

  // 4. Run Step 1 Validation Check
  const validation = useMemo(() => {
    return validateStep1({
      identity,
      market,
      provider,
      capital,
      activeAccount,
      providers,
    });
  }, [identity, market, provider, capital, activeAccount, providers]);

  const stopLossAmount = (capital.allocatedCapital * risk.stopLossPct) / 100;
  const takeProfitAmount = (capital.allocatedCapital * risk.takeProfitPct) / 100;

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3.5 text-xs select-none">
      {/* 1. BOT IDENTITY & MARKET SUMMARY */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            Bot & Target Market
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              !isPaper ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}
          >
            {identity.environment}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px] pt-1">
          <div className="font-bold text-slate-100 truncate">{identity.name || "Untitled Bot"}</div>
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Market: {market.marketType}</span>
            <span className="text-cyan-400 font-semibold">{market.underlying} ({market.exchange})</span>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME DATA PROVIDER & SLA */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            Primary Data Feed
          </span>
          <span
            className={`text-[10px] font-mono flex items-center gap-1 ${
              primaryDataRuntime.status === "CONNECTED"
                ? "text-emerald-400"
                : primaryDataRuntime.status === "ERROR"
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                primaryDataRuntime.status === "CONNECTED" ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            {primaryDataRuntime.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div>
            <span className="text-slate-500 block">Feed:</span>
            <span className="font-semibold text-slate-200 truncate block">{primaryDataRuntime.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Latency:</span>
            <span className="font-semibold text-slate-200">
              {primaryDataRuntime.latencyMs ? `${primaryDataRuntime.latencyMs} ms` : "UNKNOWN"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. EXECUTION BROKER STATUS */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Execution Broker
          </span>
          <span
            className={`text-[10px] font-mono flex items-center gap-1 ${
              brokerRuntime.connected ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                brokerRuntime.connected ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {brokerRuntime.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div>
            <span className="text-slate-500 block">Broker:</span>
            <span className="font-semibold text-slate-200 truncate block">{brokerRuntime.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Account:</span>
            <span className="font-semibold text-slate-200 truncate block">
              {activeAccount?.accountId || (isPaper ? "SIMULATOR" : "UNKNOWN")}
            </span>
          </div>
        </div>
      </div>

      {/* 4. REAL ACCOUNT CAPITAL & BOUNDS */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-yellow-400" />
            Account Capital Bounds
          </span>
          <span className="text-[10px] font-mono text-slate-400">{capital.currency}</span>
        </div>

        <div className="space-y-1 font-mono pt-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Available Cash:</span>
            <span className="font-semibold text-slate-200">
              {verifiedAvailableCash !== null ? formatMoney(verifiedAvailableCash, capital.currency) : "UNKNOWN"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Allocated:</span>
            <span className="font-bold text-emerald-400">
              {formatMoney(capital.allocatedCapital, capital.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Remaining Cash:</span>
            <span className="text-slate-300">
              {remainingCapital !== null ? formatMoney(remainingCapital, capital.currency) : "UNKNOWN"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-800/60">
            <span className="text-slate-400">Sizing:</span>
            <span className="text-slate-200">{capital.sizingMode}</span>
          </div>
        </div>
      </div>

      {/* 5. STEP 2 LIVE MARKET QUOTE & CANONICAL CARRIED CONTEXT */}
      {(store.selectedContractContext || market.underlying) && (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Contract Continuity
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              {store.selectedContractContext ? "CARRIED LIVE" : "DEFAULT"}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px] pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Contract:</span>
              <span className="text-slate-100 font-bold truncate max-w-[140px]">
                {store.selectedContractContext?.symbol || market.symbol || market.underlying}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Canonical:</span>
              <span className="text-cyan-400 truncate max-w-[140px]">
                {store.selectedContractContext?.canonicalInstrumentId || market.canonicalInstrumentId || `NSE:${market.underlying}:INDEX`}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-850">
              <span className="text-slate-400">Lot Size:</span>
              <span className="text-slate-200">{store.selectedContractContext?.lotSize || market.lotSize || 50}</span>
            </div>
            {(store.selectedContractContext?.expiry || instrument.contractExpiry) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Expiry:</span>
                <span className="text-purple-300 font-bold">{store.selectedContractContext?.expiry || instrument.contractExpiry}</span>
              </div>
            )}
            {(store.selectedContractContext?.strike || instrument.contractStrike > 0) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Strike / Type:</span>
                <span className="text-yellow-400 font-semibold">
                  {store.selectedContractContext ? `${store.selectedContractContext.strike} ${store.selectedContractContext.optionType}` : `${instrument.contractStrike} ${instrument.contractOptionType}`}
                </span>
              </div>
            )}
            {store.selectedContractContext?.selectedPremiumAtSelection && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Selected At:</span>
                <span className="text-amber-300 font-bold">₹{store.selectedContractContext.selectedPremiumAtSelection.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. PREFLIGHT STEP 1 INTEGRITY CHECKLIST */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Step 1 Preflight Audit
          </span>
          <span
            className={`text-[10px] font-mono font-bold ${
              validation.valid ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {validation.valid ? "PASSED" : "BLOCKED"}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[10px] pt-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Bot Identity:</span>
            {validation.checklist.identity ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Valid</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Incomplete</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Market Universe:</span>
            {validation.checklist.market ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Configured</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Missing</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Execution Broker:</span>
            {validation.checklist.broker ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Ready</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Offline</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Primary Data Feed:</span>
            {validation.checklist.primaryProvider ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Live</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Offline</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Account Verified:</span>
            {validation.checklist.account ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Verified</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Unconfirmed</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Capital Bounds:</span>
            {validation.checklist.capital ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Valid</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Exceeded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
