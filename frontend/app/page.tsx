"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { CommandCenterShell } from "@/components/layout/CommandCenterShell";
import { HomeExecutiveOverview } from "@/components/home/HomeExecutiveOverview";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Code-split heavy tabs with zero-layout-shift and no SSR hydration delay
const RuntimeCommandCenter = dynamic(
  () => import("@/components/command-center/RuntimeCommandCenter").then((m) => m.RuntimeCommandCenter),
  { ssr: false, loading: () => null }
);
const TradingTerminal = dynamic(
  () => import("@/components/terminal/TradingTerminal").then((m) => m.TradingTerminal),
  { ssr: false, loading: () => null }
);
const BotControlTab = dynamic(
  () => import("@/components/bot-control/BotControlTab").then((m) => m.BotControlTab),
  { ssr: false, loading: () => null }
);
const StrategyBuilder = dynamic(
  () => import("@/components/strategy/StrategyBuilder").then((m) => m.StrategyBuilder),
  { ssr: false, loading: () => null }
);
const IndicatorCenter = dynamic(
  () => import("@/components/indicators/IndicatorCenter").then((m) => m.IndicatorCenter),
  { ssr: false, loading: () => null }
);
const PerformanceAnalytics = dynamic(
  () => import("@/components/analytics/PerformanceAnalytics").then((m) => m.PerformanceAnalytics),
  { ssr: false, loading: () => null }
);
const InstitutionalCapitalSegregationTab = dynamic(
  () => import("@/components/analytics/InstitutionalCapitalSegregationTab").then((m) => m.InstitutionalCapitalSegregationTab),
  { ssr: false, loading: () => null }
);
const TradeJournal = dynamic(
  () => import("@/components/trade-journal/TradeJournal").then((m) => m.TradeJournal),
  { ssr: false, loading: () => null }
);
const MarketUniverse = dynamic(
  () => import("@/components/market-universe/MarketUniverse").then((m) => m.MarketUniverse),
  { ssr: false, loading: () => null }
);
const AlertsMonitoring = dynamic(
  () => import("@/components/alerts/AlertsMonitoring").then((m) => m.AlertsMonitoring),
  { ssr: false, loading: () => null }
);
const AccountSecurity = dynamic(
  () => import("@/components/account-security/AccountSecurity").then((m) => m.AccountSecurity),
  { ssr: false, loading: () => null }
);
const RiskManagement = dynamic(
  () => import("@/components/risk-management/RiskManagement").then((m) => m.RiskManagement),
  { ssr: false, loading: () => null }
);
const BacktestingLab = dynamic(
  () => import("@/components/backtesting/BacktestingLab").then((m) => m.BacktestingLab),
  { ssr: false, loading: () => null }
);
const LogsDebugging = dynamic(
  () => import("@/components/logs/LogsDebugging").then((m) => m.LogsDebugging),
  { ssr: false, loading: () => null }
);
const OptionChainView = dynamic(
  () => import("@/components/options/OptionChainView").then((m) => m.OptionChainView),
  { ssr: false, loading: () => null }
);
const OrderBookDepthView = dynamic(
  () => import("@/components/orderbook/OrderBookDepthView").then((m) => m.OrderBookDepthView),
  { ssr: false, loading: () => null }
);
const ProviderMatrixView = dynamic(
  () => import("@/components/providers/ProviderMatrixView").then((m) => m.ProviderMatrixView),
  { ssr: false, loading: () => null }
);
const TerminalSettingsView = dynamic(
  () => import("@/components/settings/TerminalSettingsView").then((m) => m.TerminalSettingsView),
  { ssr: false, loading: () => null }
);
const CryptoOverviewView = dynamic(
  () => import("@/components/crypto/CryptoOverviewView").then((m) => m.CryptoOverviewView),
  { ssr: false, loading: () => null }
);
const CryptoFuturesTerminal = dynamic(
  () => import("@/components/crypto/CryptoFuturesTerminal").then((m) => m.CryptoFuturesTerminal),
  { ssr: false, loading: () => null }
);
const CryptoOptionChainTerminal = dynamic(
  () => import("@/components/crypto/CryptoOptionChainTerminal").then((m) => m.CryptoOptionChainTerminal),
  { ssr: false, loading: () => null }
);
const OrderExecutionCenter = dynamic(
  () => import("@/components/order-execution/OrderExecutionCenter").then((m) => m.OrderExecutionCenter),
  { ssr: false, loading: () => null }
);
const EcoPositionsView = dynamic(
  () => import("@/components/positions/EcoPositionsView").then((m) => m.EcoPositionsView),
  { ssr: false, loading: () => null }
);
const OptionStrategyBuilder = dynamic(
  () => import("@/components/crypto/OptionStrategyBuilder").then((m) => m.OptionStrategyBuilder),
  { ssr: false, loading: () => null }
);
const FuturesUniverseView = dynamic(
  () => import("@/src/features/markets/futures").then((m) => m.FuturesUniverseView),
  { ssr: false, loading: () => null }
);
const TaxIntelligenceTab = dynamic(
  () => import("@/components/tax-intelligence/TaxIntelligenceTab").then((m) => m.TaxIntelligenceTab),
  { ssr: false, loading: () => null }
);
const DhanLiveMarketFeed = dynamic(
  () => import("@/components/live/DhanLiveMarketFeed").then((m) => m.DhanLiveMarketFeed),
  { ssr: false, loading: () => null }
);
const DeltaLiveMarketFeed = dynamic(
  () => import("@/components/live/DeltaLiveMarketFeed").then((m) => m.DeltaLiveMarketFeed),
  { ssr: false, loading: () => null }
);


function MainApp() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [liveProvider, setLiveProvider] = useState<"dhan" | "delta">("dhan");

  // Idle-time chunk preloading: warms up heavy tab bundles during browser idle periods
  useEffect(() => {
    const preload = () => {
      import("@/components/terminal/TradingTerminal");
      import("@/components/bot-control/BotControlTab");
      import("@/components/market-universe/MarketUniverse");
      import("@/components/options/OptionChainView");
      import("@/components/analytics/PerformanceAnalytics");
      import("@/components/analytics/InstitutionalCapitalSegregationTab");
      import("@/components/positions/EcoPositionsView");
      import("@/components/order-execution/OrderExecutionCenter");
      import("@/components/strategy/StrategyBuilder");
      import("@/components/indicators/IndicatorCenter");
      import("@/components/risk-management/RiskManagement");
      import("@/components/trade-journal/TradeJournal");
      import("@/components/logs/LogsDebugging");
      import("@/src/features/markets/futures");
      import("@/components/tax-intelligence/TaxIntelligenceTab");
      import("@/components/live/DhanLiveMarketFeed");
      import("@/components/live/DeltaLiveMarketFeed");
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(preload, { timeout: 2000 });
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const id = setTimeout(preload, 1200);
        return () => clearTimeout(id);
      }
    }
  }, []);

  return (
    <CommandCenterShell activeTab={activeTab} onTabSelect={setActiveTab}>
      <div className="w-full h-full">
        {/* 0. Executive Home Overview */}
        {(activeTab === "home" || activeTab === "dashboard") && (
          <ErrorBoundary title="Executive Home Overview Failed">
            <HomeExecutiveOverview />
          </ErrorBoundary>
        )}

        {/* 0.5 Real-Time Live Feed */}
        {(activeTab === "live" || activeTab === "live-feed" || activeTab === "live-data") && (
          <ErrorBoundary title="Live Market Feed Failed">
            <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
              {/* Feed Switcher */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#080E20] border border-[#213047] w-fit shadow-lg">
                <button
                  type="button"
                  onClick={() => setLiveProvider("dhan")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    liveProvider === "dhan"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40 border border-cyan-400/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#142036]"
                  }`}
                >
                  <span className="text-sm">🇮🇳</span>
                  <span>DHAN HQ (NSE / BSE)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/40 text-cyan-300">EQUITY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLiveProvider("delta")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    liveProvider === "delta"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-900/40 border border-amber-400/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#142036]"
                  }`}
                >
                  <span className="text-amber-300 font-bold">₿</span>
                  <span>DELTA EXCHANGE</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/40 text-amber-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    24/7 LIVE
                  </span>
                </button>
              </div>

              {liveProvider === "dhan" ? <DhanLiveMarketFeed /> : <DeltaLiveMarketFeed />}
            </div>
          </ErrorBoundary>
        )}

        {/* 1. Markets Discovery & Analysis */}
        {(activeTab === "markets" || activeTab === "market-universe") && (
          <ErrorBoundary title="Market Discovery Failed">
            <MarketUniverse />
          </ErrorBoundary>
        )}

        {/* 2. Runtime Operations & Command Center */}
        {activeTab === "command-center" && (
          <ErrorBoundary title="Command Center Operations Failed">
            <RuntimeCommandCenter />
          </ErrorBoundary>
        )}

        {/* 3. Flagship Trading Terminal */}
        {activeTab === "terminal" && (
          <ErrorBoundary title="Trading Terminal Failed">
            <TradingTerminal />
          </ErrorBoundary>
        )}

        {/* 4. Option Chain & Greeks Engine */}
        {activeTab === "options" && (
          <ErrorBoundary title="Option Chain & Greeks Engine Failed">
            <OptionChainView />
          </ErrorBoundary>
        )}

        {/* 3. Order Book Depth & Pressure Gauge */}
        {activeTab === "orderbook" && (
          <ErrorBoundary title="Order Book Depth Failed">
            <OrderBookDepthView />
          </ErrorBoundary>
        )}

        {/* 4. Bot Control & Instances */}
        {(activeTab === "bot-control" || activeTab === "bots") && (
          <ErrorBoundary title="Bot Control & Instances Tab Failed">
            <BotControlTab />
          </ErrorBoundary>
        )}

        {/* 5. Visual Strategy Builder */}
        {(activeTab === "strategy-builder" || activeTab === "strategies") && (
          <ErrorBoundary title="Visual Strategy Builder Failed">
            <StrategyBuilder />
          </ErrorBoundary>
        )}

        {/* 6. Indicator Center / Scanner */}
        {(activeTab === "indicators" || activeTab === "scanner") && (
          <ErrorBoundary title="Indicator Center Failed">
            <IndicatorCenter />
          </ErrorBoundary>
        )}

        {/* 7. Risk Management */}
        {(activeTab === "risk-management" || activeTab === "risk") && (
          <ErrorBoundary title="Risk Management Tab Failed">
            <RiskManagement />
          </ErrorBoundary>
        )}

        {/* 8. Market Universe / Watchlist */}
        {(activeTab === "market-universe" || activeTab === "watchlist") && (
          <ErrorBoundary title="Market Universe Tab Failed">
            <MarketUniverse />
          </ErrorBoundary>
        )}

        {/* 9. Provider Capability Matrix */}
        {activeTab === "providers" && (
          <ErrorBoundary title="Provider Capability Matrix Failed">
            <ProviderMatrixView />
          </ErrorBoundary>
        )}

        {/* 10. Backtesting Lab */}
        {activeTab === "backtesting" && (
          <ErrorBoundary title="Backtesting Lab Tab Failed">
            <BacktestingLab />
          </ErrorBoundary>
        )}

        {/* 11. Performance Analytics & P&L */}
        {(activeTab === "performance" || activeTab === "pnl") && (
          <ErrorBoundary title="Performance Analytics Tab Failed">
            <PerformanceAnalytics />
          </ErrorBoundary>
        )}

        {/* 11.5 Portfolio & Capital Management */}
        {(activeTab === "portfolio" || activeTab === "capital-funds" || activeTab === "capital" || activeTab === "funds") && (
          <ErrorBoundary title="Portfolio & Capital Tab Failed">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              <InstitutionalCapitalSegregationTab />
            </div>
          </ErrorBoundary>
        )}

        {/* 11.6 Quantitative Research & Backtesting Lab */}
        {(activeTab === "research" || activeTab === "backtest" || activeTab === "backtesting") && (
          <ErrorBoundary title="Research Lab Tab Failed">
            <BacktestingLab />
          </ErrorBoundary>
        )}

        {/* 11.8 Tax Intelligence */}
        {(activeTab === "tax" || activeTab === "tax-intelligence" || activeTab === "reports") && (
          <ErrorBoundary title="Tax Intelligence Tab Failed">
            <TaxIntelligenceTab />
          </ErrorBoundary>
        )}


        {/* 12. Canonical Orders Execution & Lifecycle */}
        {activeTab === "orders" && (
          <ErrorBoundary title="Orders Execution Center Failed">
            <OrderExecutionCenter />
          </ErrorBoundary>
        )}

        {/* 13. Open Positions Exposure & Risk */}
        {activeTab === "positions" && (
          <ErrorBoundary title="Positions Exposure Center Failed">
            <EcoPositionsView />
          </ErrorBoundary>
        )}

        {/* 14. Human Trade Review Journal */}
        {(activeTab === "trade-journal" || activeTab === "journal") && (
          <ErrorBoundary title="Trade Journal Tab Failed">
            <TradeJournal />
          </ErrorBoundary>
        )}

        {/* 13. Alerts & Monitoring */}
        {activeTab === "alerts" && (
          <ErrorBoundary title="Alerts & Monitoring Tab Failed">
            <AlertsMonitoring />
          </ErrorBoundary>
        )}

        {/* 14. Logs & Debugging */}
        {activeTab === "logs" && (
          <ErrorBoundary title="Logs & Debugging Tab Failed">
            <LogsDebugging />
          </ErrorBoundary>
        )}

        {/* 15. Settings & Timezone */}
        {activeTab === "settings" && (
          <ErrorBoundary title="Settings Tab Failed">
            <TerminalSettingsView />
          </ErrorBoundary>
        )}

        {/* 16. Account & Security */}
        {(activeTab === "account-security" || activeTab === "security") && (
          <ErrorBoundary title="Account & Security Tab Failed">
            <AccountSecurity />
          </ErrorBoundary>
        )}

        {/* 17. Crypto Derivatives Overview */}
        {(activeTab === "crypto-derivatives" || activeTab === "crypto") && (
          <ErrorBoundary title="Crypto Derivatives Hub Failed">
            <CryptoOverviewView />
          </ErrorBoundary>
        )}

        {/* 18. Modular Futures Universe Terminal */}
        {(activeTab === "crypto-futures" || activeTab === "futures") && (
          <ErrorBoundary title="Futures & Derivatives Terminal Failed">
            <FuturesUniverseView />
          </ErrorBoundary>
        )}

        {/* 19. Crypto Option Chain */}
        {activeTab === "crypto-options-chain" && (
          <ErrorBoundary title="Crypto Option Chain Failed">
            <CryptoOptionChainTerminal />
          </ErrorBoundary>
        )}

        {/* 20. Crypto Options Studio */}
        {activeTab === "crypto-options" && (
          <ErrorBoundary title="Crypto Options Studio Failed">
            <OptionStrategyBuilder />
          </ErrorBoundary>
        )}

        {/* Fallback for unhandled or unexpected tab IDs to prevent blank/black screen */}
        {![
          "home", "dashboard", "live", "live-feed", "live-data", "markets", "market-universe", "watchlist",
          "command-center", "terminal", "options", "orderbook", "bot-control", "bots",
          "strategy-builder", "strategies", "indicators", "scanner", "risk-management", "risk",
          "providers", "backtesting", "backtest", "research", "performance", "pnl",
          "portfolio", "capital-funds", "capital", "funds", "tax", "tax-intelligence", "reports",
          "orders", "positions", "trade-journal", "journal", "alerts", "logs", "settings",
          "account-security", "security", "crypto", "crypto-derivatives", "crypto-futures", "futures",
          "crypto-options-chain", "crypto-options"
        ].includes(activeTab) && (
          <ErrorBoundary title="Executive Home Overview Failed">
            <HomeExecutiveOverview />
          </ErrorBoundary>
        )}
      </div>
    </CommandCenterShell>
  );
}

export default function Home() {
  return <MainApp />;
}
