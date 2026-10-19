"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Layers,
  Sliders,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Radio,
  ChevronRight,
  CheckCircle2,
  X,
  Sparkles,
  Bot,
  Zap,
} from "lucide-react";
import {
  BotWizardDraft,
  MarketType,
  ProviderType,
  SelectedContract,
  formatPositionBotName,
} from "@/components/wizard/types";
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";
import Step1Identity from "@/components/wizard/Step1Identity";
import Step2LiveMarket from "@/components/wizard/Step2LiveMarket";
import Step3Indicators from "@/components/wizard/Step3Indicators";
import Step4OptionStrategies from "@/components/wizard/Step4OptionStrategies";
import Step5TradingStrategy from "@/components/wizard/Step5TradingStrategy";
import Step6RiskManagement from "@/components/wizard/Step6RiskManagement";
import Step7ReviewDeploy from "@/components/wizard/Step7ReviewDeploy";

const STEPS = [
  { id: 1, title: "Identity & Capital", icon: Shield },
  { id: 2, title: "Live Market & Contract", icon: Radio },
  { id: 3, title: "Indicators", icon: Sliders },
  { id: 4, title: "Option Strategy", icon: Layers },
  { id: 5, title: "Trading Strategy", icon: Cpu },
  { id: 6, title: "Risk Management", icon: ShieldAlert },
  { id: 7, title: "Review & Deploy", icon: ShieldCheck },
];

export interface BotCreationControlPlaneProps {
  isModal?: boolean;
  onClose?: () => void;
  botId?: string;
  isEditMode?: boolean;
}

function mapToWizardMarketType(
  rawType?: string | null,
  underlying?: string | null,
  hasStrike?: boolean
): MarketType {
  const norm = (rawType || "").toUpperCase();
  const und = (underlying || "").toUpperCase();
  const isCrypto =
    norm.includes("CRYPTO") ||
    ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].includes(und);

  if (norm.includes("OPTION") || hasStrike) {
    return isCrypto ? "CRYPTO_OPTION" : "INDIA_OPTION";
  }
  if (norm.includes("FUTURE")) {
    return isCrypto ? "CRYPTO_FUTURE" : "INDIA_FUTURE";
  }
  if (norm.includes("STOCK") || norm.includes("EQUITY")) {
    return isCrypto ? "CRYPTO_SPOT" : "INDIA_STOCK";
  }
  if (isCrypto) return hasStrike ? "CRYPTO_OPTION" : "CRYPTO_FUTURE";
  return hasStrike ? "INDIA_OPTION" : "INDIA_STOCK";
}

function mapToWizardBroker(
  rawBroker?: string | null,
  marketType?: MarketType
): ProviderType {
  const norm = (rawBroker || "").toUpperCase();
  if (norm.includes("DELTA")) return "DELTA";
  if (norm.includes("UPSTOX")) return "UPSTOX";
  if (norm.includes("DHAN")) return "DHAN";
  if (norm.includes("BINANCE")) return "BINANCE";
  if (norm.includes("ALPACA")) return "ALPACA";
  if (norm.includes("FYERS")) return "FYERS";
  if (norm.includes("ANGEL")) return "ANGEL";
  if (norm.includes("ZERODHA")) return "ZERODHA";

  if (marketType?.includes("CRYPTO")) return "DELTA";
  return "UPSTOX";
}

export function BotCreationControlPlane({
  isModal = false,
  onClose,
  botId,
  isEditMode = false,
}: BotCreationControlPlaneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loadedSourceBanner, setLoadedSourceBanner] = useState<{
    symbol: string;
    underlying: string;
    price?: number;
    currency: string;
    origin: string;
    expiry?: string;
    optionType?: string;
    strike?: number;
  } | null>(null);

  const initializedRef = useRef(false);

  // Canonical Draft State connecting all 7 steps with guaranteed contract continuity
  const [draft, setDraft] = useState<BotWizardDraft>({
    bot_name: "BTC Delta Alpha Sniper",
    market_type: "CRYPTO_OPTION",
    underlying: "BTC",
    timeframe: "5m",
    broker: "DELTA",
    execution_mode: "PAPER",
    capital_allocation: 1000.0,
    available_funds: "UNAVAILABLE",

    contract: null,
    indicators: [],
    option_strategy: null,
    trading_strategy: null,

    risk: {
      stop_loss_mode: "PERCENTAGE",
      stop_loss_value: 2.0,
      take_profit_mode: "PERCENTAGE",
      take_profit_value: 5.0,
      trailing_stop_mode: "OFF",
      trailing_stop_value: 1.0,
      max_daily_loss: 500.0,
      max_drawdown_pct: 10.0,
      risk_per_trade: 100.0,
      max_position_size: 2.0,
      max_trades_per_day: 10,
      max_open_positions: 2,
      max_total_exposure: 2000.0,
      order_type: "MARKET",
      trading_style: "INTRADAY",
      auto_square_off_time: "15:15",
    },
  });

  // Load intent from URL query params or central intent store
  useEffect(() => {
    if (initializedRef.current) return;

    // 1. Check URL parameters
    const urlSymbol = searchParams?.get("symbol");
    const urlUnderlying = searchParams?.get("underlying");
    const urlStrike = searchParams?.get("strike");
    const urlOptionType = searchParams?.get("optionType");
    const urlExpiry = searchParams?.get("expiry");
    const urlAssetClass = searchParams?.get("assetClass") || searchParams?.get("market_type");
    const urlBroker = searchParams?.get("broker");
    const urlExchange = searchParams?.get("exchange");
    const urlLtp = searchParams?.get("ltp") || searchParams?.get("price");
    const urlBid = searchParams?.get("bid");
    const urlAsk = searchParams?.get("ask");
    const urlLotSize = searchParams?.get("lotSize");
    const urlSide = searchParams?.get("side") || "BUY";
    const urlOrigin = searchParams?.get("origin") || searchParams?.get("source");

    // 2. Check Zustand / SessionStorage intent
    const storedIntent = useBotCreationIntentStore.getState().loadStoredIntent();

    const hasIncoming = Boolean(
      urlSymbol ||
      urlUnderlying ||
      urlStrike ||
      storedIntent?.symbol ||
      storedIntent?.underlying ||
      storedIntent?.strike
    );

    if (hasIncoming) {
      initializedRef.current = true;

      const rawUnderlying =
        urlUnderlying ||
        storedIntent?.underlying ||
        (urlSymbol ? urlSymbol.split(/[\s-]/)[0] : "BTC");
      const und = (rawUnderlying || "BTC").toUpperCase();

      const rawStrike = urlStrike ? parseFloat(urlStrike) : (storedIntent?.strike ?? null);
      const strikeVal = rawStrike != null && !isNaN(rawStrike) && rawStrike > 0 ? rawStrike : null;

      const rawOptType = (urlOptionType || storedIntent?.optionType || "").toUpperCase();
      const normOptType =
        rawOptType === "CALL" ? "CE" : rawOptType === "PUT" ? "PE" : (rawOptType === "CE" || rawOptType === "PE") ? rawOptType : null;

      const ltpVal = urlLtp ? parseFloat(urlLtp) : (storedIntent?.currentPrice ?? storedIntent?.ltp ?? 0);
      const bidVal = urlBid ? parseFloat(urlBid) : (storedIntent?.bid ?? 0);
      const askVal = urlAsk ? parseFloat(urlAsk) : (storedIntent?.ask ?? 0);
      const expiryVal = urlExpiry || storedIntent?.expiry || "";
      const sideVal = urlSide || storedIntent?.side || "BUY";

      const symbolVal =
        urlSymbol ||
        storedIntent?.symbol ||
        (strikeVal ? `${und} ${strikeVal} ${normOptType || "CE"}` : und);

      const targetMarketType = mapToWizardMarketType(
        urlAssetClass || storedIntent?.assetClass,
        und,
        strikeVal != null
      );
      const targetBroker = mapToWizardBroker(
        urlBroker || storedIntent?.broker,
        targetMarketType
      );

      const isIndia = targetMarketType.includes("INDIA");
      const currSymbol = isIndia ? "₹" : "$";
      const lotSizeVal = urlLotSize
        ? parseInt(urlLotSize)
        : storedIntent?.lotSize || (isIndia ? 25 : 1);

      const incomingContract: SelectedContract = {
        instrument_id:
          storedIntent?.securityId ||
          storedIntent?.instrumentId ||
          searchParams?.get("securityId") ||
          symbolVal,
        symbol: symbolVal,
        underlying: und,
        expiry: expiryVal,
        strike: strikeVal,
        option_type: normOptType as any,
        premium: ltpVal || askVal || bidVal || 0,
        bid: Number(bidVal || 0),
        ask: Number(askVal || 0),
        volume: Number(storedIntent?.volume || 0),
        open_interest: Number(storedIntent?.openInterest || storedIntent?.oi || 0),
        lot_size: lotSizeVal,
        tick_size: Number(storedIntent?.tickSize || 0.05),
        provider: targetBroker,
        exchange: urlExchange || storedIntent?.exchange || (isIndia ? "NSE" : "DELTA"),
        timestamp: new Date().toISOString(),
        is_live: true,
        greeks: {
          delta: storedIntent?.delta,
          gamma: storedIntent?.gamma,
          theta: storedIntent?.theta,
          vega: storedIntent?.vega,
          iv: storedIntent?.iv,
          greeks_source: `${targetBroker}_LIVE`,
        },
      };

      setDraft((prev) => ({
        ...prev,
        market_type: targetMarketType,
        underlying: und,
        broker: targetBroker,
        bot_name: formatPositionBotName(symbolVal, sideVal),
        contract: incomingContract,
        capital_allocation: isIndia ? 25000 : 1000,
      }));

      setLoadedSourceBanner({
        symbol: symbolVal,
        underlying: und,
        price: ltpVal > 0 ? ltpVal : undefined,
        currency: currSymbol,
        origin: urlOrigin || storedIntent?.origin || "Live Market Feed",
        expiry: expiryVal,
        optionType: normOptType || undefined,
        strike: strikeVal || undefined,
      });

      // Jump directly to Step 2 so the user immediately sees the live market contract and streaming quotes
      setCurrentStep(2);

      // Clear the stored intent to prevent stale re-triggering
      useBotCreationIntentStore.getState().clearIntent();
    }
  }, [searchParams]);

  const updateDraft = (updates: Partial<BotWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className={`w-full space-y-6 pb-12 text-slate-100 font-sans ${isModal ? "p-4" : ""}`}>
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/40 flex-shrink-0">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Quantitative Bot Deployment
                </h1>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-bold bg-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  CANONICAL 7-STAGE WIZARD
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 mt-1.5 max-w-2xl font-sans">
                Stage {currentStep} of 7 — <strong className="text-white font-bold">{STEPS[currentStep - 1].title}</strong>. Configure underlying feeds, automated technical indicators, and deterministic risk boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm sm:text-base font-mono font-black text-cyan-400">
                {Math.round((currentStep / 7) * 100)}% Completed
              </div>
              <div className="w-36 h-2 rounded-full bg-slate-800 mt-2 overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / 7) * 100}%` }}
                />
              </div>
            </div>

            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-colors cursor-pointer"
                title="Close Wizard"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Market Intent Synchronized Banner */}
      {loadedSourceBanner && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-[#0B1528] to-cyan-950/70 border border-cyan-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-sm sm:text-base animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-sm">
              <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-white text-base sm:text-lg tracking-tight">
                  {loadedSourceBanner.symbol}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  LIVE STREAM ACTIVE
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  SOURCE: {loadedSourceBanner.origin.toUpperCase()}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium">
                Underlying: <strong className="text-white">{loadedSourceBanner.underlying}</strong>
                {loadedSourceBanner.expiry && <> • Expiry: <strong className="text-white">{loadedSourceBanner.expiry}</strong></>}
                {loadedSourceBanner.price != null && <> • Market Price: <strong className="text-emerald-400 font-bold">{loadedSourceBanner.currency}{loadedSourceBanner.price}</strong></>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Inspect Live Contract</span>
            </button>
            <button
              type="button"
              onClick={() => setLoadedSourceBanner(null)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Upgraded 7-Step Navigation Bar */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1426]/90 p-3 shadow-xl backdrop-blur-md overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[850px] gap-2.5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40"
                      : isCompleted
                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/60 font-medium"
                  }`}
                >
                  <div
                    className={`rounded-xl p-2 flex items-center justify-center transition-colors ${
                      isCurrent
                        ? "bg-white/20 text-white"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-mono font-bold text-slate-400 leading-tight">
                      {isCompleted ? "COMPLETED" : `STAGE 0${step.id}`}
                    </span>
                    <span className="truncate max-w-[130px] font-bold text-sm sm:text-base leading-tight mt-0.5">{step.title}</span>
                  </div>
                </button>

                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-700/80 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0C1527] to-[#070D1A] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {currentStep === 1 && (
          <Step1Identity draft={draft} updateDraft={updateDraft} onNext={nextStep} />
        )}
        {currentStep === 2 && (
          <Step2LiveMarket
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 3 && (
          <Step3Indicators
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 4 && (
          <Step4OptionStrategies
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 5 && (
          <Step5TradingStrategy
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 6 && (
          <Step6RiskManagement
            draft={draft}
            updateDraft={updateDraft}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        {currentStep === 7 && (
          <Step7ReviewDeploy draft={draft} updateDraft={updateDraft} onPrev={prevStep} />
        )}
      </div>
    </div>
  );
}
