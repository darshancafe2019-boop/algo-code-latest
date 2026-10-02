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
  () => import("@/components/strategy/StrategyBotCreationWorkspace").then((m) => m.StrategyBotCreationWorkspace),
  { ssr: false, loading: () => null }
);
const StrategyCenter = dynamic(
  () => import("@/components/strategy/StrategyCenter").then((m) => m.StrategyCenter),
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
const FuturesWorkspace = dynamic(
  () => import("@/src/features/markets/futures").then((m) => m.FuturesWorkspace),
  { ssr: false, loading: () => null }
);
const TaxIntelligenceTab = dynamic(
  () => import("@/components/tax-intelligence/TaxIntelligenceTab").then((m) => m.TaxIntelligenceTab),
  { ssr: false, loading: () => null }
);
const MarketCommandCenter = dynamic(
  () => import("@/components/live/MarketCommandCenter").then((m) => m.MarketCommandCenter),
  { ssr: false, loading: () => null }
);
const DhanLiveMarketFeed = dynamic(
  () => import("@/components/live/DhanLiveMarketFeed").then((m) => m.DhanLiveMarketFeed),
  { ssr: false, loading: () => null }
);
const UpstoxLiveMarketFeed = dynamic(
  () => import("@/components/live/UpstoxLiveMarketFeed").then((m) => m.UpstoxLiveMarketFeed),
  { ssr: false, loading: () => null }
);
const DeltaLiveMarketFeed = dynamic(
  () => import("@/components/live/DeltaLiveMarketFeed").then((m) => m.DeltaLiveMarketFeed),
  { ssr: false, loading: () => null }
);


function MainApp() {
  const [activeTab, setActiveTab] = useState<string>("home");

  // Read URL query parameter ?tab=... on initial mount & listen to browser back/forward buttons
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }

      const handlePopState = (e: PopStateEvent) => {
        const currentParams = new URLSearchParams(window.location.search);
        const t = currentParams.get("tab") || (e.state && e.state.tab) || "home";
        setActiveTab(t);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    } catch {}
  }, []);

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const targetUrl = tabId === "home" || tabId === "dashboard" ? "/" : `/?tab=${tabId}`;
      window.history.pushState({ tab: tabId }, "", targetUrl);
    }
  };

  // Idle-time chunk preloading: warms up heavy tab bundles during browser idle periods
  useEffect(() => {
    const preload = () => {
      import("@/src/features/markets/futures").catch(() => {});
      import("@/src/features/markets/options").catch(() => {});
      import("@/components/terminal/TradingTerminal").catch(() => {});
      import("@/components/bot-control/BotControlTab").catch(() => {});
      import("@/components/market-universe/MarketUniverse").catch(() => {});
      import("@/components/options/OptionChainView").catch(() => {});
      import("@/components/analytics/PerformanceAnalytics").catch(() => {});
      import("@/components/analytics/InstitutionalCapitalSegregationTab").catch(() => {});
      import("@/components/positions/EcoPositionsView").catch(() => {});
      import("@/components/order-execution/OrderExecutionCenter").catch(() => {});
      import("@/components/strategy/StrategyBotCreationWorkspace").catch(() => {});
      import("@/components/strategy/StrategyCenter").catch(() => {});
      import("@/components/indicators/IndicatorCenter").catch(() => {});
      import("@/components/risk-management/RiskManagement").catch(() => {});
      import("@/components/trade-journal/TradeJournal").catch(() => {});
      import("@/components/logs/LogsDebugging").catch(() => {});
      import("@/components/tax-intelligence/TaxIntelligenceTab").catch(() => {});
      import("@/components/settings/TerminalSettingsView").catch(() => {});
      import("@/components/live/MarketCommandCenter").catch(() => {});
      import("@/components/live/DhanLiveMarketFeed").catch(() => {});
      import("@/components/live/UpstoxLiveMarketFeed").catch(() => {});
      import("@/components/live/DeltaLiveMarketFeed").catch(() => {});
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(preload, { timeout: 1000 });
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const id = setTimeout(preload, 400);
        return () => clearTimeout(id);
      }
    }
  }, []);

  const isTabActive = (tabKey: string, aliases: string[] = []) => {
    return activeTab === tabKey || aliases.includes(activeTab);
  };

  return (
    <CommandCenterShell activeTab={activeTab} onTabSelect={handleTabSelect}>
      <div className="w-full h-full">
        {/* 0. Executive Home Overview */}
        {isTabActive("home", ["dashboard"]) && (
          <ErrorBoundary title="Executive Home Overview Failed">
            <HomeExecutiveOverview />
          </ErrorBoundary>
        )}

        {/* 0.5 Real-Time Live Feed */}
        {isTabActive("live", ["live-feed", "live-data"]) && (
          <ErrorBoundary title="Live Market Feed Failed">
            <MarketCommandCenter />
          </ErrorBoundary>
        )}

        {/* 1. Markets Discovery & Analysis */}
        {isTabActive("markets", ["market-universe", "universe"]) && (
          <ErrorBoundary title="Market Discovery Failed">
            <MarketUniverse />
          </ErrorBoundary>
        )}

        {/* 2. Runtime Operations & Command Center */}
        {isTabActive("command-center") && (
          <ErrorBoundary title="Command Center Operations Failed">
            <RuntimeCommandCenter />
          </ErrorBoundary>
        )}

        {/* 3. Flagship Trading Terminal */}
        {isTabActive("terminal") && (
          <ErrorBoundary title="Trading Terminal Failed">
            <TradingTerminal />
          </ErrorBoundary>
        )}

        {/* 4. Option Chain & Greeks Engine */}
        {isTabActive("options") && (
          <ErrorBoundary title="Option Chain & Greeks Engine Failed">
            <OptionChainView />
          </ErrorBoundary>
        )}

        {/* 4.5 Order Book Depth */}
        {isTabActive("orderbook") && (
          <ErrorBoundary title="Order Book Depth Failed">
            <OrderBookDepthView />
          </ErrorBoundary>
        )}

        {/* 5. Bot Control & Instances */}
        {isTabActive("bot-control", ["bots"]) && (
          <ErrorBoundary title="Bot Control & Instances Tab Failed">
            <BotControlTab />
          </ErrorBoundary>
        )}

        {/* 6. Strategy Center */}
        {isTabActive("strategies", ["strategy", "strategy-center"]) && (
          <ErrorBoundary title="Strategy Center Failed">
            <StrategyCenter />
          </ErrorBoundary>
        )}

        {/* 6.5 Strategy Builder */}
        {isTabActive("strategy-builder") && (
          <ErrorBoundary title="Visual Strategy Builder Failed">
            <StrategyBuilder />
          </ErrorBoundary>
        )}

        {/* 7. Indicator Center / Scanner */}
        {isTabActive("indicators", ["scanner"]) && (
          <ErrorBoundary title="Indicator Center Failed">
            <IndicatorCenter />
          </ErrorBoundary>
        )}

        {/* 8. Risk Management */}
        {isTabActive("risk-management", ["risk"]) && (
          <ErrorBoundary title="Risk Management Tab Failed">
            <RiskManagement />
          </ErrorBoundary>
        )}

        {/* 9. Provider Capability Matrix */}
        {isTabActive("providers") && (
          <ErrorBoundary title="Provider Capability Matrix Failed">
            <ProviderMatrixView />
          </ErrorBoundary>
        )}

        {/* 10. Backtesting Lab */}
        {isTabActive("backtesting", ["backtest", "research"]) && (
          <ErrorBoundary title="Backtesting Lab Tab Failed">
            <BacktestingLab />
          </ErrorBoundary>
        )}

        {/* 11. Performance Analytics & P&L */}
        {isTabActive("performance", ["pnl"]) && (
          <ErrorBoundary title="Performance Analytics Tab Failed">
            <PerformanceAnalytics />
          </ErrorBoundary>
        )}

        {/* 11.5 Portfolio & Capital Management */}
        {isTabActive("portfolio", ["capital-funds", "capital", "funds"]) && (
          <ErrorBoundary title="Portfolio & Capital Tab Failed">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              <InstitutionalCapitalSegregationTab />
            </div>
          </ErrorBoundary>
        )}

        {/* 11.8 Tax Intelligence */}
        {isTabActive("tax", ["tax-intelligence", "reports"]) && (
          <ErrorBoundary title="Tax Intelligence Tab Failed">
            <TaxIntelligenceTab />
          </ErrorBoundary>
        )}

        {/* 12. Canonical Orders Execution & Lifecycle */}
        {isTabActive("orders") && (
          <ErrorBoundary title="Orders Execution Center Failed">
            <OrderExecutionCenter />
          </ErrorBoundary>
        )}

        {/* 13. Open Positions Exposure & Risk */}
        {isTabActive("positions") && (
          <ErrorBoundary title="Positions Exposure Center Failed">
            <EcoPositionsView />
          </ErrorBoundary>
        )}

        {/* 14. Human Trade Review Journal */}
        {isTabActive("trade-journal", ["journal"]) && (
          <ErrorBoundary title="Trade Journal Tab Failed">
            <TradeJournal />
          </ErrorBoundary>
        )}

        {/* 15. Alerts & Monitoring */}
        {isTabActive("alerts") && (
          <ErrorBoundary title="Alerts & Monitoring Tab Failed">
            <AlertsMonitoring />
          </ErrorBoundary>
        )}

        {/* 16. Logs & Debugging */}
        {isTabActive("logs") && (
          <ErrorBoundary title="Logs & Debugging Tab Failed">
            <LogsDebugging />
          </ErrorBoundary>
        )}

        {/* 17. Settings & Timezone */}
        {isTabActive("settings") && (
          <ErrorBoundary title="Settings Tab Failed">
            <TerminalSettingsView />
          </ErrorBoundary>
        )}

        {/* 18. Account & Security */}
        {isTabActive("account-security", ["security"]) && (
          <ErrorBoundary title="Account & Security Tab Failed">
            <AccountSecurity />
          </ErrorBoundary>
        )}

        {/* 19. Crypto Derivatives Overview */}
        {isTabActive("crypto-derivatives", ["crypto"]) && (
          <ErrorBoundary title="Crypto Derivatives Hub Failed">
            <CryptoOverviewView />
          </ErrorBoundary>
        )}

        {/* 20. Modular Futures Universe Terminal */}
        {isTabActive("crypto-futures", ["futures"]) && (
          <ErrorBoundary title="Futures & Derivatives Terminal Failed">
            <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
              <FuturesWorkspace activeBoard="ALL" boardTitle="Universal Futures Workstation" />
            </div>
          </ErrorBoundary>
        )}

        {/* 21. Crypto Option Chain */}
        {isTabActive("crypto-options-chain") && (
          <ErrorBoundary title="Crypto Option Chain Failed">
            <CryptoOptionChainTerminal />
          </ErrorBoundary>
        )}

        {/* 22. Crypto Options Studio */}
        {isTabActive("crypto-options") && (
          <ErrorBoundary title="Crypto Options Studio Failed">
            <OptionStrategyBuilder />
          </ErrorBoundary>
        )}
      </div>
    </CommandCenterShell>
  );
}

export default function Home() {
  return <MainApp />;
}
