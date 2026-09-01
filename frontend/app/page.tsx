"use client";

import React, { useState } from "react";
import { CommandCenterShell } from "@/components/layout/CommandCenterShell";
import { HomeExecutiveOverview } from "@/components/home/HomeExecutiveOverview";
import { RuntimeCommandCenter } from "@/components/command-center/RuntimeCommandCenter";
import { TradingTerminal } from "@/components/terminal/TradingTerminal";
import { BotControlTab } from "@/components/bot-control/BotControlTab";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";
import { IndicatorCenter } from "@/components/indicators/IndicatorCenter";
import { PerformanceAnalytics } from "@/components/analytics/PerformanceAnalytics";
import { TradeJournal } from "@/components/trade-journal/TradeJournal";
import { MarketUniverse } from "@/components/market-universe/MarketUniverse";
import { AlertsMonitoring } from "@/components/alerts/AlertsMonitoring";
import { AccountSecurity } from "@/components/account-security/AccountSecurity";
import { RiskManagement } from "@/components/risk-management/RiskManagement";
import { BacktestingLab } from "@/components/backtesting/BacktestingLab";
import { LogsDebugging } from "@/components/logs/LogsDebugging";
import { OptionChainView } from "@/components/options/OptionChainView";
import { OrderBookDepthView } from "@/components/orderbook/OrderBookDepthView";
import { ProviderMatrixView } from "@/components/providers/ProviderMatrixView";
import { TerminalSettingsView } from "@/components/settings/TerminalSettingsView";
import { CryptoOverviewView } from "@/components/crypto/CryptoOverviewView";
import { CryptoFuturesTerminal } from "@/components/crypto/CryptoFuturesTerminal";
import { CryptoOptionChainTerminal } from "@/components/crypto/CryptoOptionChainTerminal";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";
import { EcoPositionsView } from "@/components/positions/EcoPositionsView";
import { OptionStrategyBuilder } from "@/components/crypto/OptionStrategyBuilder";
import { FuturesUniverseView } from "@/src/features/markets/futures";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function MainApp() {
  const [activeTab, setActiveTab] = useState<string>("home");

  return (
    <CommandCenterShell activeTab={activeTab} onTabSelect={setActiveTab}>
      <div className="w-full h-full">
        {/* 0. Executive Home Overview */}
        {activeTab === "home" && (
          <ErrorBoundary title="Executive Home Overview Failed">
            <HomeExecutiveOverview />
          </ErrorBoundary>
        )}

        {/* 1. Markets Discovery & Analysis */}
        {(activeTab === "markets" || activeTab === "market-universe") && (
          <ErrorBoundary title="Market Discovery Failed">
            <MarketUniverse />
          </ErrorBoundary>
        )}

        {/* 2. Runtime Operations & Command Center */}
        {(activeTab === "command-center" || activeTab === "dashboard") && (
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
        {activeTab === "account-security" && (
          <ErrorBoundary title="Account & Security Tab Failed">
            <AccountSecurity />
          </ErrorBoundary>
        )}

        {/* 17. Crypto Derivatives Overview */}
        {activeTab === "crypto-derivatives" && (
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
      </div>
    </CommandCenterShell>
  );
}

export default function Home() {
  return <MainApp />;
}
