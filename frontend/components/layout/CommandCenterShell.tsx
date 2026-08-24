"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalLayout } from "@/context/GlobalLayoutContext";
import { TopCommandBar } from "./TopCommandBar";
import { LeftNavigationSidebar } from "./LeftNavigationSidebar";
import { BottomActivityDock } from "./BottomActivityDock";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { AppearanceDrawer } from "@/components/settings/AppearanceDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileCommandSheet } from "./MobileCommandSheet";
import { QuickOrderModal } from "@/components/order-execution/QuickOrderModal";
import { CreateBotModal } from "@/components/bot-control/CreateBotModal";

interface CommandCenterShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export function CommandCenterShell({
  children,
  activeTab,
  onTabSelect,
}: CommandCenterShellProps) {
  const router = useRouter();
  const {
    isSidebarCollapsed,
    isBottomDockOpen,
    isSearchOpen,
    toggleSidebar,
    toggleBottomDock,
    setIsSearchOpen,
  } = useGlobalLayout();

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
          router.push("/bots/create");
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
    <div className="min-h-screen h-screen bg-[var(--theme-bg)] text-[var(--theme-text-primary)] flex flex-col font-sans overflow-hidden">
      {/* 1. TOP COMMAND BAR */}
      <ErrorBoundary title="Top Command Bar Failed">
        <TopCommandBar
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </ErrorBoundary>

      {/* 2. MIDDLE AREA: LEFT NAV + MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <ErrorBoundary title="Left Navigation Failed">
          <LeftNavigationSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            activeTab={activeTab}
            onTabSelect={onTabSelect}
          />
        </ErrorBoundary>

        {/* Center Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-[var(--theme-bg)] p-3 sm:p-4 pb-20 md:pb-4 min-w-0">
          <ErrorBoundary title="Workspace View Failed">{children}</ErrorBoundary>
        </main>
      </div>

      {/* 3. BOTTOM ACTIVITY DOCK */}
      <ErrorBoundary title="Bottom Activity Dock Failed">
        <BottomActivityDock
          isOpen={isBottomDockOpen}
          onToggle={toggleBottomDock}
        />
      </ErrorBoundary>

      {/* 4. GLOBAL SEARCH MODAL (⌘K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateTab={onTabSelect}
      />

      {/* 5. CUSTOM APPEARANCE & THEME EDITOR DRAWER */}
      <AppearanceDrawer />

      {/* 6. MOBILE COMMAND DOCK & QUICK MODALS */}
      <MobileCommandSheet />
      <QuickOrderModal />
      <CreateBotModal />
    </div>
  );
}
