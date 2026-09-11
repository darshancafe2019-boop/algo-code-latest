"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGlobalLayout } from "@/context/GlobalLayoutContext";
import { GlobalHeader } from "./GlobalHeader";
import { LeftNavigationSidebar } from "@/components/layout/LeftNavigationSidebar";
import { DetailDrawer } from "./DetailDrawer";
import { OrderReviewModal, OrderIntentData } from "./OrderReviewModal";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { AppearanceDrawer } from "@/components/settings/AppearanceDrawer";
import { MobileCommandSheet } from "@/components/layout/MobileCommandSheet";
import { QuickOrderModal } from "@/components/order-execution/QuickOrderModal";
import { CreateBotModal } from "@/components/bot-control/CreateBotModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthGuard } from "@/components/auth/AuthGuard";

export interface DrawerConfig {
  isOpen: boolean;
  type?: string;
  title: string;
  subtitle?: string;
  category?: string;
  status?: string;
  provider?: string;
  metadata?: Record<string, any>;
  rawJson?: any;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

interface QuantOSShellContextType {
  openDrawer: (config: Omit<DrawerConfig, "isOpen">) => void;
  closeDrawer: () => void;
  openOrderReview: (data: OrderIntentData, onConfirm: () => Promise<void>) => void;
  closeOrderReview: () => void;
}

const QuantOSShellContext = createContext<QuantOSShellContextType | null>(null);

export function useQuantOSShell() {
  const ctx = useContext(QuantOSShellContext);
  if (!ctx) {
    return {
      openDrawer: () => {},
      closeDrawer: () => {},
      openOrderReview: () => {},
      closeOrderReview: () => {},
    };
  }
  return ctx;
}

interface QuantOSAppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export function QuantOSAppShell({
  children,
  activeTab,
  onTabSelect,
}: QuantOSAppShellProps) {
  const router = useRouter();
  const {
    isSidebarCollapsed,
    isSearchOpen,
    toggleSidebar,
    setIsSearchOpen,
  } = useGlobalLayout();

  // Detail Drawer State
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig>({
    isOpen: false,
    title: "",
  });

  const openDrawer = useCallback((config: Omit<DrawerConfig, "isOpen">) => {
    setDrawerConfig({ ...config, isOpen: true });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Order Review Modal State
  const [orderReviewState, setOrderReviewState] = useState<{
    isOpen: boolean;
    data: OrderIntentData | null;
    onConfirm: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    data: null,
    onConfirm: null,
  });

  const openOrderReview = useCallback(
    (data: OrderIntentData, onConfirm: () => Promise<void>) => {
      setOrderReviewState({
        isOpen: true,
        data,
        onConfirm,
      });
    },
    []
  );

  const closeOrderReview = useCallback(() => {
    setOrderReviewState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Preset Handlers for Status Rail triggers
  const handleQuickStatusInspect = useCallback((type: string) => {
    switch (type) {
      case "providers":
        openDrawer({
          title: "Market Data Gateway",
          subtitle: "Live feed connections & websocket latency",
          category: "DATA GATEWAY",
          status: "LIVE",
          metadata: {
            "Binance Futures": "CONNECTED (42ms)",
            "Delta Exchange": "CONNECTED (86ms)",
            "Dhan Multi-Broker": "CONNECTED (112ms)",
            "Upstox V2 API": "CONNECTED (94ms)",
            "Active Symbols": "14 Tickers",
            "Feed Mode": "WebSocket Streaming",
          },
        });
        break;
      case "risk":
        openDrawer({
          title: "Risk Control Guardrails",
          subtitle: "Pre-trade limits and execution gates",
          category: "RISK ENGINE",
          status: "ARMED",
          metadata: {
            "Global Kill Switch": "INACTIVE (SAFE)",
            "Max Daily Drawdown": "5.00%",
            "Max Leverage": "10x",
            "Max Single Order": "₹2,500,000",
            "Consecutive Losses Halt": "3 Trades",
          },
        });
        break;
      case "oms":
        openDrawer({
          title: "Order Management System",
          subtitle: "Execution router & smart order routing telemetry",
          category: "OMS",
          status: "ONLINE",
          metadata: {
            "Engine Status": "DISPATCHING",
            "Pending Orders": 0,
            "Rate Limit Remaining": "1,180 / 1,200 req/min",
            "Slippage Protection": "ENABLED (0.15%)",
          },
        });
        break;
      case "recon":
        openDrawer({
          title: "Ledger Reconciliation",
          subtitle: "Real-time balance & position consistency engine",
          category: "ACCOUNTING",
          status: "RECONCILED",
          metadata: {
            "Discrepancies": "0 Detected",
            "Last Reconciled": new Date().toLocaleTimeString(),
            "Broker Audit Hash": "0x7F...3B9A",
            "State": "SYNCHRONIZED",
          },
        });
        break;
      case "backend":
        openDrawer({
          title: "Quantitative Backend Server",
          subtitle: "FastAPI / Python algo core execution node",
          category: "SYS INFRA",
          status: "OPTIMAL",
          metadata: {
            "Runtime Port": "5050",
            "Gateway Port": "5051",
            "CPU Utilization": "6.2%",
            "Memory Footprint": "214 MB",
            "Uptime": "99.98%",
          },
        });
        break;
      default:
        break;
    }
  }, [openDrawer]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // ⌘/Ctrl + K (Search / Command Center)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Navigation shortcuts (only outside inputs)
      if (!isInput && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          router.push("/bots");
        } else if (e.key.toLowerCase() === "o") {
          e.preventDefault();
          router.push("/orders");
        } else if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          router.push("/positions");
        } else if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          router.push("/risk");
        } else if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          router.push("/scanner");
        }
      }

      // Escape key closes search modal
      if (e.key === "Escape") {
        if (isSearchOpen) setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, router, setIsSearchOpen]);

  return (
    <QuantOSShellContext.Provider
      value={{
        openDrawer,
        closeDrawer,
        openOrderReview,
        closeOrderReview,
      }}
    >
      <AuthGuard>
        <div className="min-h-screen h-screen bg-[#070B14] text-[#F4F7FA] flex flex-col font-sans overflow-hidden">
          {/* 1. TOP GLOBAL HEADER */}
          <ErrorBoundary title="Global Header Failed">
            <GlobalHeader
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenDetailDrawer={handleQuickStatusInspect}
            />
          </ErrorBoundary>

          {/* 2. MIDDLE AREA: LEFT NAV + MAIN WORKSPACE */}
          <div className="flex-1 flex overflow-hidden relative">
            <ErrorBoundary title="Left Navigation Failed">
              <LeftNavigationSidebar
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebar}
                activeTab={activeTab}
                onTabSelect={onTabSelect}
              />
            </ErrorBoundary>

            {/* Main Center Workspace */}
            <main className="flex-1 overflow-y-auto bg-[#070B14] p-3 sm:p-4 pb-20 md:pb-4 min-w-0">
              <ErrorBoundary title="Workspace View Failed">{children}</ErrorBoundary>
            </main>
          </div>

          {/* 4. DETAIL DRAWER (Universal Slide-out Inspector) */}
          <DetailDrawer
            isOpen={drawerConfig.isOpen}
            onClose={closeDrawer}
            title={drawerConfig.title}
            subtitle={drawerConfig.subtitle}
            category={drawerConfig.category}
            status={drawerConfig.status}
            provider={drawerConfig.provider}
            metadata={drawerConfig.metadata}
            rawJson={drawerConfig.rawJson}
            actions={drawerConfig.actions}
            width={drawerConfig.width}
          >
            {drawerConfig.children}
          </DetailDrawer>

          {/* 5. ORDER CONFIRMATION / REVIEW MODAL */}
          {orderReviewState.data && (
            <OrderReviewModal
              isOpen={orderReviewState.isOpen}
              onClose={closeOrderReview}
              order={orderReviewState.data}
              onConfirm={orderReviewState.onConfirm || (async () => {})}
            />
          )}

          {/* 6. GLOBAL SEARCH MODAL (⌘K) */}
          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onNavigateTab={onTabSelect}
          />

          {/* 7. APPEARANCE & THEME EDITOR DRAWER */}
          <AppearanceDrawer />

          {/* 8. MOBILE COMMAND DOCK & QUICK MODALS */}
          <MobileCommandSheet />
          <QuickOrderModal />
          <CreateBotModal />
        </div>
      </AuthGuard>
    </QuantOSShellContext.Provider>
  );
}
