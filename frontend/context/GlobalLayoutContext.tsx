"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface GlobalLayoutContextType {
  isSidebarCollapsed: boolean;
  isBottomDockOpen: boolean;
  isSearchOpen: boolean;
  toggleSidebar: () => void;
  toggleBottomDock: () => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsBottomDockOpen: (open: boolean) => void;
}

const GlobalLayoutContext = createContext<GlobalLayoutContextType | undefined>(undefined);

const STORAGE_KEY_SIDEBAR = "alpha_sidebar_collapsed";

export function GlobalLayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isBottomDockOpen, setIsBottomDockOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Synchronize layout preferences from localStorage on client mount
  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      if (savedSidebar !== null) {
        setIsSidebarCollapsed(savedSidebar === "true");
      }
    } catch {
      // Safe fallback
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleBottomDock = useCallback(() => {
    setIsBottomDockOpen((prev) => !prev);
  }, []);

  return (
    <GlobalLayoutContext.Provider
      value={{
        isSidebarCollapsed,
        isBottomDockOpen,
        isSearchOpen,
        toggleSidebar,
        toggleBottomDock,
        setIsSearchOpen,
        setIsBottomDockOpen,
      }}
    >
      {children}
    </GlobalLayoutContext.Provider>
  );
}

export function useGlobalLayout() {
  const context = useContext(GlobalLayoutContext);
  if (!context) {
    throw new Error("useGlobalLayout must be used within a GlobalLayoutProvider");
  }
  return context;
}
