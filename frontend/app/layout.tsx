import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ActiveBotProvider } from "@/context/ActiveBotContext";
import { GlobalLayoutProvider } from "@/context/GlobalLayoutContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { MarketGatewayProvider } from "@/context/MarketGatewayContext";
import { GlobalDataProvider } from "@/context/GlobalDataContext";

export const metadata: Metadata = {
  title: "BTC/USDT | Alpha Algo Terminal",
  description: "Next-Generation Institutional Algorithmic Trading Terminal",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

import { BackendAvailabilityBanner } from "@/components/common/BackendAvailabilityBanner";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00F0FF" />
        {/* Anti-FOUC & Startup Recovery */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('algo_terminal_appearance_v2');
                var stored = localStorage.getItem('quantos_appearance_v3');
                var r = document.documentElement;
                if (stored) {
                  var cfg = JSON.parse(stored);
                  if (cfg && cfg.colors && cfg.version >= 4) {
                    r.style.setProperty('--theme-bg', cfg.colors.pageBg);
                    r.style.setProperty('--theme-surface', cfg.colors.surface);
                    r.style.setProperty('--theme-elevated', cfg.colors.elevated);
                    r.style.setProperty('--theme-border', cfg.colors.border);
                    r.style.setProperty('--theme-border-subtle', cfg.colors.borderSubtle);
                    r.style.setProperty('--theme-text-primary', cfg.colors.textPrimary);
                    r.style.setProperty('--theme-text-secondary', cfg.colors.textSecondary);
                    r.style.setProperty('--theme-text-muted', cfg.colors.textMuted);
                    r.style.setProperty('--theme-accent', cfg.colors.accent);
                    r.style.setProperty('--theme-profit', cfg.colors.profit);
                    r.style.setProperty('--theme-loss', cfg.colors.loss);
                    r.style.setProperty('--theme-warning', cfg.colors.warning);
                    r.style.setProperty('--theme-info', cfg.colors.info);
                    if (cfg.colorMode === 'light') {
                      r.classList.remove('dark');
                      r.classList.add('light');
                    } else {
                      r.classList.remove('light');
                    }
                  }
                }
              } catch (e) {}

              // Auto-unregister stale service workers and purge outdated HTTP caches
              try {
                if (typeof window !== 'undefined') {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) regs[i].unregister();
                    }).catch(function() {});
                  }
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (var i = 0; i < names.length; i++) caches.delete(names[i]);
                    }).catch(function() {});
                  }
                  // Auto-recover from stale Webpack chunk / Fast Refresh hash mismatches after server restarts
                  window.addEventListener('error', function(e) {
                    if (e && e.message && (
                      e.message.indexOf("Cannot read properties of undefined (reading 'call')") !== -1 ||
                      e.message.indexOf("Loading chunk") !== -1 ||
                      e.message.indexOf("ChunkLoadError") !== -1
                    )) {
                      var reloadKey = 'quantos_chunk_recover_ts';
                      var lastReload = sessionStorage.getItem(reloadKey);
                      var now = Date.now();
                      if (!lastReload || (now - Number(lastReload)) > 5000) {
                        sessionStorage.setItem(reloadKey, String(now));
                        window.location.reload();
                      }
                    }
                  });
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--theme-bg)] text-[var(--theme-text-primary)]">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <ActiveBotProvider>
                <GlobalLayoutProvider>
                  <MarketGatewayProvider>
                    <GlobalDataProvider>
                      <BackendAvailabilityBanner />
                      <AuthGuard>
                        {children}
                      </AuthGuard>
                    </GlobalDataProvider>
                  </MarketGatewayProvider>
                </GlobalLayoutProvider>
              </ActiveBotProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
