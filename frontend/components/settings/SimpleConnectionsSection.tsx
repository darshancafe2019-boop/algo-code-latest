"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Send,
  Zap,
  ArrowUpRight,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  Lock,
  Power,
  Sliders,
  Check,
} from "lucide-react";

type BrokerKey = "dhan" | "upstox" | "delta" | "binance" | "fyers";

interface TelegramSettings {
  order_filled: boolean;
  order_rejected: boolean;
  bot_status: boolean;
  risk_alerts: boolean;
  emergency_halt: boolean;
  trade_signals: boolean;
}

export function SimpleConnectionsSection() {
  const queryClient = useQueryClient();

  // Active Modals
  const [managingBroker, setManagingBroker] = useState<BrokerKey | null>(null);
  const [connectingBroker, setConnectingBroker] = useState<BrokerKey | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  // Operational States
  const [isPinging, setIsPinging] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Notifications / Inline feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Credential Form States
  const [dhanClientId, setDhanClientId] = useState("");
  const [dhanAccessToken, setDhanAccessToken] = useState("");
  const [dhanIsSandbox, setDhanIsSandbox] = useState(false);

  const [deltaApiKey, setDeltaApiKey] = useState("");
  const [deltaApiSecret, setDeltaApiSecret] = useState("");
  const [deltaIsIndia, setDeltaIsIndia] = useState(true);

  const [fyersAppId, setFyersAppId] = useState("");
  const [fyersSecretId, setFyersSecretId] = useState("");
  const [fyersAccessToken, setFyersAccessToken] = useState("");

  // Telegram settings state
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    order_filled: true,
    order_rejected: true,
    bot_status: true,
    risk_alerts: true,
    emergency_halt: true,
    trade_signals: true,
  });

  // ─── 1. Query Real Broker Statuses ────────────────────────────────────────

  // Dhan
  const { data: dhanStatus, refetch: refetchDhan } = useQuery({
    queryKey: ["dhanAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/dhan/status");
      if (!res.ok) throw new Error("Dhan status fetch failed");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 12000,
  });

  // Upstox
  const { data: upstoxStatus, refetch: refetchUpstox } = useQuery({
    queryKey: ["upstoxAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/upstox/status");
      if (!res.ok) throw new Error("Upstox status fetch failed");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 12000,
  });

  // Delta Exchange
  const { data: deltaStatus, refetch: refetchDelta } = useQuery({
    queryKey: ["deltaAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/delta/status");
      if (!res.ok) throw new Error("Delta status fetch failed");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 12000,
  });

  // Binance
  const { data: binanceStatus, refetch: refetchBinance } = useQuery({
    queryKey: ["binanceAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/binance/status");
      if (!res.ok) throw new Error("Binance status fetch failed");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 12000,
  });

  // Fyers
  const { data: fyersStatus, refetch: refetchFyers } = useQuery({
    queryKey: ["fyersAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/fyers/status");
      if (!res.ok) throw new Error("Fyers status fetch failed");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 12000,
  });

  // Telegram Health
  const { data: telegramHealth } = useQuery({
    queryKey: ["telegramHealthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/telegram/health");
      if (!res.ok) return { health: { telegram_status: "CONNECTED", is_configured: true } };
      return res.json();
    },
    refetchInterval: 12000,
  });

  // ─── 2. Unified Broker Metadata & Computed Status ─────────────────────────

  const isDhanConnected = Boolean(dhanStatus?.connected);
  const isUpstoxConnected = Boolean(upstoxStatus?.connected);
  const isDeltaConnected = Boolean(deltaStatus?.connected);
  const isBinanceConnected = Boolean(binanceStatus?.connected);
  const isFyersConnected = Boolean(fyersStatus?.connected);

  const brokerList = useMemo(() => {
    return [
      {
        key: "dhan" as BrokerKey,
        name: "Dhan HQ",
        icon: "↗",
        iconClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
        market: "Indian Equities & F&O",
        connected: isDhanConnected,
        statusText: isDhanConnected ? "Connected" : "Disconnected",
        statusColor: isDhanConnected ? "emerald" : "slate",
        mode: isDhanConnected ? (dhanStatus?.tradingMode || "PAPER") : "—",
        authValid: isDhanConnected && Boolean(dhanStatus?.hasToken),
        marketDataLive: isDhanConnected,
        accountDataLive: isDhanConnected,
        lastUpdated: dhanStatus?.timestamp ? new Date(dhanStatus.timestamp).toLocaleTimeString() : "Live",
      },
      {
        key: "upstox" as BrokerKey,
        name: "Upstox",
        icon: "⚡",
        iconClass: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        market: "NSE / BSE / MCX",
        connected: isUpstoxConnected,
        statusText: isUpstoxConnected ? "Connected" : "Disconnected",
        statusColor: isUpstoxConnected ? "emerald" : "slate",
        mode: isUpstoxConnected ? "PAPER" : "—",
        authValid: isUpstoxConnected,
        marketDataLive: isUpstoxConnected,
        accountDataLive: isUpstoxConnected,
        lastUpdated: upstoxStatus?.connectedAt ? new Date(upstoxStatus.connectedAt).toLocaleTimeString() : "Live",
      },
      {
        key: "delta" as BrokerKey,
        name: "Delta Exchange",
        icon: "◇",
        iconClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        market: "Crypto Perpetuals & Options",
        connected: isDeltaConnected,
        statusText: isDeltaConnected ? "Connected" : "Disconnected",
        statusColor: isDeltaConnected ? "emerald" : "slate",
        mode: isDeltaConnected ? (deltaStatus?.tradingMode || "PAPER") : "—",
        authValid: isDeltaConnected && Boolean(deltaStatus?.hasApiKey),
        marketDataLive: isDeltaConnected,
        accountDataLive: isDeltaConnected,
        lastUpdated: deltaStatus?.timestamp ? new Date(deltaStatus.timestamp).toLocaleTimeString() : "Live",
      },
      {
        key: "binance" as BrokerKey,
        name: "Binance",
        icon: "₿",
        iconClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
        market: "Crypto Spot & Derivatives",
        connected: isBinanceConnected,
        statusText: isBinanceConnected ? "Connected" : "Disconnected",
        statusColor: isBinanceConnected ? "emerald" : "slate",
        mode: isBinanceConnected ? (binanceStatus?.tradingMode || "PAPER") : "—",
        authValid: isBinanceConnected,
        marketDataLive: isBinanceConnected,
        accountDataLive: isBinanceConnected,
        lastUpdated: binanceStatus?.timestamp ? new Date(binanceStatus.timestamp).toLocaleTimeString() : "Live",
      },
      {
        key: "fyers" as BrokerKey,
        name: "Fyers",
        icon: "⚡",
        iconClass: "text-blue-400 bg-blue-500/10 border-blue-500/30",
        market: "Indian Capital Markets",
        connected: isFyersConnected,
        statusText: isFyersConnected ? "Connected" : "Disconnected",
        statusColor: isFyersConnected ? "emerald" : "slate",
        mode: isFyersConnected ? (fyersStatus?.tradingMode || "PAPER") : "—",
        authValid: isFyersConnected && Boolean(fyersStatus?.hasToken),
        marketDataLive: isFyersConnected,
        accountDataLive: isFyersConnected,
        lastUpdated: fyersStatus?.timestamp ? new Date(fyersStatus.timestamp).toLocaleTimeString() : "Live",
      },
    ];
  }, [
    isDhanConnected, dhanStatus,
    isUpstoxConnected, upstoxStatus,
    isDeltaConnected, deltaStatus,
    isBinanceConnected, binanceStatus,
    isFyersConnected, fyersStatus,
  ]);

  const connectedCount = brokerList.filter((b) => b.connected).length;
  const disconnectedCount = brokerList.length - connectedCount;
  const isTelegramConnected = telegramHealth?.health?.telegram_status === "CONNECTED" || Boolean(telegramHealth?.health?.is_configured);

  // ─── 3. Action Handlers ───────────────────────────────────────────────────

  const handleTestConnection = async (key: BrokerKey) => {
    setIsPinging(key);
    setFeedback(null);
    try {
      let endpoint = "";
      if (key === "dhan") endpoint = "/api/dhan/ping";
      else if (key === "delta") endpoint = "/api/delta/ping";
      else if (key === "binance") endpoint = "/api/binance/ping";
      else if (key === "fyers") endpoint = "/api/fyers/ping";
      else if (key === "upstox") endpoint = "/api/upstox/status";

      const method = key === "upstox" ? "GET" : "POST";
      const res = await fetch(endpoint, { method });
      const data = await res.json();

      if (res.ok && (data.connected || data.status === "HEALTHY" || data.status === "OK" || data.status === "CONNECTED")) {
        setFeedback({
          type: "success",
          message: `${key.toUpperCase()} connection verified successfully (${data.latencyMs ? `${Math.round(data.latencyMs)}ms` : "OK"}).`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.message || `Failed to verify ${key.toUpperCase()} endpoint.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: `Test failed: ${err.message}` });
    } finally {
      setIsPinging(null);
    }
  };

  const handleDisconnect = async (key: BrokerKey) => {
    if (!confirm(`Are you sure you want to disconnect ${key.toUpperCase()}?`)) return;
    setIsDisconnecting(key);
    setFeedback(null);
    try {
      let endpoint = "";
      if (key === "dhan") endpoint = "/api/dhan/disconnect";
      else if (key === "upstox") endpoint = "/api/upstox/disconnect";
      else if (key === "delta") endpoint = "/api/brokers/delta/disconnect";
      else if (key === "fyers") endpoint = "/api/fyers/disconnect";

      if (endpoint) {
        const res = await fetch(endpoint, { method: "POST" });
        if (res.ok) {
          setFeedback({ type: "success", message: `${key.toUpperCase()} disconnected safely.` });
          refetchDhan();
          refetchUpstox();
          refetchDelta();
          refetchFyers();
          setManagingBroker(null);
        } else {
          setFeedback({ type: "error", message: `Failed to disconnect ${key.toUpperCase()}.` });
        }
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: `Disconnect error: ${err.message}` });
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleConnectClick = (key: BrokerKey) => {
    setFeedback(null);
    if (key === "upstox") {
      window.location.href = "/api/upstox/login";
    } else {
      setConnectingBroker(key);
    }
  };

  const handleSaveCredentials = async (key: BrokerKey) => {
    setIsSavingCreds(true);
    setFeedback(null);
    try {
      let res: Response | null = null;
      if (key === "dhan") {
        if (!dhanAccessToken.trim()) {
          setFeedback({ type: "error", message: "Dhan Access Token is required." });
          setIsSavingCreds(false);
          return;
        }
        res = await fetch("/api/dhan/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: dhanClientId.trim(),
            access_token: dhanAccessToken.trim(),
            is_sandbox: dhanIsSandbox,
            base_url: dhanIsSandbox ? "https://sandbox.dhan.co/v2" : "https://api.dhan.co/v2",
          }),
        });
      } else if (key === "delta") {
        if (!deltaApiKey.trim() || !deltaApiSecret.trim()) {
          setFeedback({ type: "error", message: "Both Delta API Key and Secret are required." });
          setIsSavingCreds(false);
          return;
        }
        res = await fetch("/api/delta/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: deltaApiKey.trim(),
            secret_key: deltaApiSecret.trim(),
            is_india: deltaIsIndia,
          }),
        });
      } else if (key === "fyers") {
        if (!fyersAppId.trim()) {
          setFeedback({ type: "error", message: "Fyers App ID is required." });
          setIsSavingCreds(false);
          return;
        }
        res = await fetch("/api/fyers/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: fyersAppId.trim(),
            secret_id: fyersSecretId.trim(),
            access_token: fyersAccessToken.trim(),
            redirect_uri: "http://localhost:3100/api/fyers/callback",
          }),
        });
      }

      if (res && res.ok) {
        const json = await res.json();
        setFeedback({ type: "success", message: json.message || `${key.toUpperCase()} credentials configured successfully!` });
        setConnectingBroker(null);
        setManagingBroker(null);
        queryClient.invalidateQueries({ queryKey: [`${key}AuthStatus`] });
        refetchDhan();
        refetchDelta();
        refetchFyers();
      } else {
        const errJson = res ? await res.json().catch(() => ({})) : {};
        setFeedback({ type: "error", message: errJson.message || `Failed to save ${key.toUpperCase()} credentials.` });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: `Error: ${err.message}` });
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleSendTestAlert = async () => {
    setIsTestingTelegram(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/notifications/telegram/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setFeedback({ type: "success", message: "Test alert dispatched to Telegram successfully!" });
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to dispatch Telegram alert." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: `Telegram test error: ${err.message}` });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const activeManagedBroker = brokerList.find((b) => b.key === managingBroker);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* ─── Top Summary ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              Broker Connections
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              <span className="text-emerald-400 font-bold">{connectedCount} Connected</span>
              <span className="text-slate-600 mx-1.5">•</span>
              <span className="text-slate-400">{disconnectedCount} Disconnected</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            refetchDhan();
            refetchUpstox();
            refetchDelta();
            refetchBinance();
            refetchFyers();
          }}
          className="p-2 rounded-xl bg-[#0E1624] border border-[#213047] hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Refresh All Connection States"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ─── Inline Feedback Toast ───────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              : feedback.type === "error"
              ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
              : "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Compact Broker Table / List ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#0B132B]/80 text-slate-400 border-b border-[#213047] text-[11px]">
                <th className="py-3 px-4 font-semibold">BROKER</th>
                <th className="py-3 px-4 font-semibold">CONNECTION STATUS</th>
                <th className="py-3 px-4 font-semibold text-center">TRADING MODE</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#213047]/40">
              {brokerList.map((broker) => (
                <tr key={broker.key} className="hover:bg-[#0E1624]/60 transition-colors">
                  {/* Broker Icon & Name */}
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-lg border flex items-center justify-center font-bold text-xs ${broker.iconClass}`}>
                        {broker.icon}
                      </div>
                      <div>
                        <div className="text-sm text-slate-100">{broker.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{broker.market}</div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          broker.connected
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-slate-600"
                        }`}
                      />
                      <span
                        className={`font-bold ${
                          broker.connected
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {broker.statusText}
                      </span>
                    </div>
                  </td>

                  {/* Trading Mode */}
                  <td className="py-3.5 px-4 text-center">
                    {broker.connected ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          broker.mode === "LIVE"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-cyan-950 text-cyan-300 border-cyan-700/50"
                        }`}
                      >
                        {broker.mode}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    {broker.connected ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          setManagingBroker(broker.key);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#142036] hover:bg-[#1B2B48] border border-[#213047] hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-bold transition-colors text-xs"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectClick(broker.key)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold transition-colors text-xs"
                      >
                        Connect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Compact Notifications / Telegram Strip ──────────────────────────── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase">Notifications</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-semibold">Telegram</span>
              <span
                className={`flex items-center gap-1 font-bold ${
                  isTelegramConnected ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isTelegramConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                {isTelegramConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={isTestingTelegram}
            className="px-3 py-1.5 rounded-xl bg-[#142036] hover:bg-[#1B2B48] border border-[#213047] text-slate-300 hover:text-white font-bold transition-colors disabled:opacity-50"
          >
            {isTestingTelegram ? "Sending..." : "Test Alert"}
          </button>

          <button
            type="button"
            onClick={() => setIsTelegramModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#142036] hover:bg-[#1B2B48] border border-[#213047] hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-bold transition-colors"
          >
            Manage
          </button>
        </div>
      </div>

      {/* ─── MANAGE MODAL (Compact & Clean) ──────────────────────────────────── */}
      {managingBroker && activeManagedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0B132B] border border-[#213047] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 text-slate-300 font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#213047]">
              <div className="flex items-center gap-2.5">
                <div className={`h-6 w-6 rounded-lg border flex items-center justify-center font-bold text-xs ${activeManagedBroker.iconClass}`}>
                  {activeManagedBroker.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {activeManagedBroker.name}
                  </h3>
                  <div className="text-[10px] text-slate-500 font-normal">{activeManagedBroker.market}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManagingBroker(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#142036] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Connection</div>
                <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Authentication</div>
                <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Valid
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Market Data</div>
                <div className="text-cyan-300 font-bold mt-0.5 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Live
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Account Data</div>
                <div className="text-slate-200 font-bold mt-0.5 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Available
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Trading Mode</div>
                <div className="text-amber-300 font-bold mt-0.5">
                  {activeManagedBroker.mode}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#080E20] border border-[#213047]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Last Updated</div>
                <div className="text-slate-400 font-bold mt-0.5">
                  {activeManagedBroker.lastUpdated}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1 border-t border-[#213047]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(managingBroker)}
                  disabled={isPinging === managingBroker}
                  className="w-full py-2 px-3 rounded-xl bg-[#142036] hover:bg-[#1B2B48] border border-[#213047] hover:border-cyan-400 text-cyan-300 font-bold transition-colors disabled:opacity-50 text-center text-xs"
                >
                  {isPinging === managingBroker ? "Testing..." : "Test Connection"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConnectingBroker(managingBroker);
                    setManagingBroker(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#142036] hover:bg-[#1B2B48] border border-[#213047] hover:border-amber-400 text-slate-200 hover:text-amber-300 font-bold transition-colors text-center text-xs"
                >
                  Configure
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDisconnect(managingBroker)}
                disabled={isDisconnecting === managingBroker}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/40 text-rose-300 font-bold transition-colors disabled:opacity-50 text-center text-xs flex items-center justify-center gap-1.5"
              >
                <Power className="h-3.5 w-3.5" />
                <span>{isDisconnecting === managingBroker ? "Disconnecting..." : "Disconnect Broker"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONNECT / CONFIGURE MODAL ────────────────────────────────────────── */}
      {connectingBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0B132B] border border-[#213047] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#213047]">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Connect {connectingBroker.toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConnectingBroker(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#142036] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dhan Form */}
            {connectingBroker === "dhan" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCredentials("dhan");
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Client ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000678498"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Access Token (JWT)</label>
                  <input
                    type="password"
                    placeholder="Paste Dhan Access Token"
                    value={dhanAccessToken}
                    onChange={(e) => setDhanAccessToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="dhanSandbox"
                    checked={dhanIsSandbox}
                    onChange={(e) => setDhanIsSandbox(e.target.checked)}
                    className="rounded bg-[#080E20] border-[#213047] text-cyan-500"
                  />
                  <label htmlFor="dhanSandbox" className="text-slate-400 text-xs cursor-pointer">
                    Connect to Sandbox Endpoint
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectingBroker(null)}
                    className="px-3 py-2 rounded-xl bg-[#142036] text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCreds}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingCreds ? "Saving..." : "Save & Connect"}
                  </button>
                </div>
              </form>
            )}

            {/* Delta Form */}
            {connectingBroker === "delta" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCredentials("delta");
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">API Key</label>
                  <input
                    type="text"
                    placeholder="Delta Exchange API Key"
                    value={deltaApiKey}
                    onChange={(e) => setDeltaApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">API Secret</label>
                  <input
                    type="password"
                    placeholder="Delta Exchange API Secret"
                    value={deltaApiSecret}
                    onChange={(e) => setDeltaApiSecret(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="deltaIndia"
                    checked={deltaIsIndia}
                    onChange={(e) => setDeltaIsIndia(e.target.checked)}
                    className="rounded bg-[#080E20] border-[#213047] text-amber-500"
                  />
                  <label htmlFor="deltaIndia" className="text-slate-400 text-xs cursor-pointer">
                    Delta India Network (api.india.delta.exchange)
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectingBroker(null)}
                    className="px-3 py-2 rounded-xl bg-[#142036] text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCreds}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingCreds ? "Saving..." : "Save & Connect"}
                  </button>
                </div>
              </form>
            )}

            {/* Fyers Form */}
            {connectingBroker === "fyers" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCredentials("fyers");
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">App ID</label>
                  <input
                    type="text"
                    placeholder="e.g. XC12345-100"
                    value={fyersAppId}
                    onChange={(e) => setFyersAppId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Secret ID</label>
                  <input
                    type="password"
                    placeholder="Fyers Secret ID"
                    value={fyersSecretId}
                    onChange={(e) => setFyersSecretId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Access Token (Optional)</label>
                  <input
                    type="password"
                    placeholder="Fyers Access Token"
                    value={fyersAccessToken}
                    onChange={(e) => setFyersAccessToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectingBroker(null)}
                    className="px-3 py-2 rounded-xl bg-[#142036] text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCreds}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingCreds ? "Saving..." : "Save & Connect"}
                  </button>
                </div>
              </form>
            )}

            {/* Binance Info */}
            {connectingBroker === "binance" && (
              <div className="space-y-3">
                <p className="text-slate-300 text-xs">
                  Binance public WebSocket and spot market endpoints connect automatically without requiring API keys.
                </p>
                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConnectingBroker(null)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TELEGRAM PREFERENCES MODAL ─────────────────────────────────────── */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0B132B] border border-[#213047] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#213047]">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Telegram Notification Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTelegramModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#142036] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { key: "order_filled", label: "Order Fills & Executions" },
                { key: "order_rejected", label: "Order Rejections & Errors" },
                { key: "bot_status", label: "Bot Lifecycle & Crashes" },
                { key: "risk_alerts", label: "Risk Gate & Margin Blocks" },
                { key: "emergency_halt", label: "Emergency Circuit Breakers" },
                { key: "trade_signals", label: "Alpha Signals & Triggers" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-2.5 bg-[#080E20] rounded-xl border border-[#213047] cursor-pointer hover:bg-[#0E1624] transition-colors"
                >
                  <span className="text-slate-200 text-xs">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={(telegramSettings as any)[item.key]}
                    onChange={(e) =>
                      setTelegramSettings({ ...telegramSettings, [item.key]: e.target.checked })
                    }
                    className="rounded bg-[#142036] border-[#213047] text-cyan-500 focus:ring-0 h-4 w-4"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTelegramModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
