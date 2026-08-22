import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { ActiveBotProvider } from "@/context/ActiveBotContext";
import { GlobalLayoutProvider } from "@/context/GlobalLayoutContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "BTC/USDT | Alpha Algo Terminal",
  description: "Next-Generation Institutional Algorithmic Trading Terminal",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

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
        {/* Anti-FOUC: Immediately apply stored theme tokens before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('algo_terminal_appearance_v2');
                if (stored) {
                  var cfg = JSON.parse(stored);
                  if (cfg && cfg.colors) {
                    var r = document.documentElement;
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
                      r.classList.add('dark');
                    }
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        {/* Register Service Worker for Offline PWA Support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--theme-bg)] text-[var(--theme-text-primary)]">
        <QueryProvider>
          <ThemeProvider>
            <ActiveBotProvider>
              <GlobalLayoutProvider>{children}</GlobalLayoutProvider>
            </ActiveBotProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
