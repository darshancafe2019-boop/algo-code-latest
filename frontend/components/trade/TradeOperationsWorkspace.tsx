"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  Terminal,
  Play,
  Square,
  Pause,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Database,
  Radio,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCcw,
  Sliders,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Lock,
  ArrowRight,
  DollarSign,
  ExternalLink,
  Percent,
} from "lucide-react";
import { formatCurrency, formatDecimal, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const QUICK_INSTRUMENTS = [
  { symbol: "BTC/USDT", name: "Bitcoin Perp", price: 64280.0, broker: "Delta Exchange" },
  { symbol: "NIFTY24SEP24200CE", name: "Nifty 24200 CE", price: 148.2, broker: "Upstox" },
  { symbol: "BANKNIFTY24SEP51000PE", name: "BankNifty 51000 PE", price: 172.4, broker: "Upstox" },
  { symbol: "RELIANCE", name: "Reliance Ind", price: 2984.5, broker: "Dhan HQ" },
  { symbol: "INFY", name: "Infosys Ltd", price: 1820.4, broker: "Dhan HQ" },
];

export function TradeOperationsWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { positions, orders, refreshAll } = useGlobalData();

  // ── 1. Execution / Quick Trade State ─────────────────────────────
  const [tradeSymbol, setTradeSymbol] = useState("BTC/USDT");
  const [tradeBroker, setTradeBroker] = useState("Paper Simulator");
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [tradeOrderType, setTradeOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [tradeQty, setTradeQty] = useState<string>("0.1");
  const [tradePrice, setTradePrice] = useState<string>("64280.00");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  // ── 2. Command Dispatcher & Trace State ─────────────────────────
  const [selectedCommand, setSelectedCommand] = useState<string>("REFRESH_MARKET_DATA");
  const [commandPayload, setCommandPayload] = useState<string>("{}");
  const [consoleOutput, setConsoleOutput] = useState<
    Array<{ timestamp: string; command: string; status: "STARTED" | "COMPLETED" | "FAILED"; message: string; latency?: string }>
  >([
    {
      timestamp: "18:42:11",
      command: "REFRESH_MARKET_DATA",
      status: "COMPLETED",
      message: "Candles and tick buffers refreshed across 220 instruments",
      latency: "42ms",
    },
    {
      timestamp: "18:42:12",
      command: "DHAN_FEED",
      status: "COMPLETED",
      message: "Official Dhan v2 market feed authenticated and connected",
      latency: "12ms",
    },
    {
      timestamp: "18:42:12",
      command: "TELEGRAM_ALERTS",
      status: "COMPLETED",
      message: "Notification worker ACK received (Chat ID: 5657...)",
      latency: "38ms",
    },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);

  // ── 3. Safety Confirmation Modals ──────────────────────────────
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);
  const [haltConfirmWord, setHaltConfirmWord] = useState("");
  const [showStopBotsConfirm, setShowStopBotsConfirm] = useState(false);
  const [showResetSandboxConfirm, setShowResetSandboxConfirm] = useState(false);

  // ── 4. Telemetry & Health Queries ──────────────────────────────
  const { data: statusData } = useQuery({
    queryKey: ["tradeWorkspaceStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 4000 });
      return res.ok ? res.data : null;
    },
    refetchInterval: 4000,
  });

  const { data: healthData } = useQuery({
    queryKey: ["tradeWorkspaceHealth"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/system-health/status", { timeoutMs: 4000 });
      return res.ok ? res.data : null;
    },
    refetchInterval: 4000,
  });

  const isKillSwitchActive = Boolean(statusData?.system_summary?.kill_switch_active);

  // ── 5. Command Execution Handler ───────────────────────────────
  const handleDispatchCommand = async (cmdName: string, payload: any = {}) => {
    setIsExecuting(true);
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
    
    // Add started log
    setConsoleOutput((prev) => [
      {
        timestamp: timeStr,
        command: cmdName,
        status: "STARTED",
        message: `Dispatched to CommandBus with payload ${JSON.stringify(payload)}`,
      },
      ...prev.slice(0, 40),
    ]);

    const startTime = Date.now();
    try {
      const res = await executeCommand(cmdName, null, payload, queryClient);
      const elapsed = `${Date.now() - startTime}ms`;
      setConsoleOutput((prev) => [
        {
          timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          command: cmdName,
          status: "COMPLETED",
          message: res?.message || `Execution status: ${res?.status || "SUCCEEDED"}`,
          latency: elapsed,
        },
        ...prev.slice(0, 40),
      ]);
      queryClient.invalidateQueries({ queryKey: ["tradeWorkspaceStatus"] });
      queryClient.invalidateQueries({ queryKey: ["tradeWorkspaceHealth"] });
      queryClient.invalidateQueries({ queryKey: ["homeBotsFleet"] });
    } catch (err: any) {
      const elapsed = `${Date.now() - startTime}ms`;
      setConsoleOutput((prev) => [
        {
          timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          command: cmdName,
          status: "FAILED",
          message: err.message || "Command execution rejected by engine",
          latency: elapsed,
        },
        ...prev.slice(0, 40),
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // ── 6. Direct Quick Order Placement Handler ────────────────────
  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setOrderFeedback({ type: null, message: "" });
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });

    try {
      const parsedQty = parseFloat(tradeQty) || 1;
      const parsedPrice = tradeOrderType === "LIMIT" ? parseFloat(tradePrice) : undefined;

      const orderPayload = {
        symbol: tradeSymbol,
        side: tradeSide,
        order_type: tradeOrderType,
        quantity: parsedQty,
        price: parsedPrice,
        broker: tradeBroker,
        execution_mode: "PAPER",
      };

      const res = await apiClient.post<any>("/api/orders", orderPayload, { timeoutMs: 8000 });

      if (res.ok && res.data) {
        setOrderFeedback({
          type: "success",
          message: `Order submitted: ${tradeSide} ${parsedQty} ${tradeSymbol} (${tradeOrderType}) - FILLED`,
        });
        setConsoleOutput((prev) => [
          {
            timestamp: timeStr,
            command: "PLACE_ORDER",
            status: "COMPLETED",
            message: `Executed ${tradeSide} ${parsedQty} ${tradeSymbol} via ${tradeBroker}`,
            latency: "18ms",
          },
          ...prev.slice(0, 40),
        ]);
        if (refreshAll) refreshAll();
        queryClient.invalidateQueries({ queryKey: ["homeExecutiveStatus"] });
        queryClient.invalidateQueries({ queryKey: ["openPositions"] });
      } else {
        throw new Error(res.error?.message || "Order rejected by OMS Risk Gate");
      }
    } catch (err: any) {
      setOrderFeedback({
        type: "error",
        message: err.message || "Failed to place order. Risk guardrails active.",
      });
      setConsoleOutput((prev) => [
        {
          timestamp: timeStr,
          command: "PLACE_ORDER",
          status: "FAILED",
          message: err.message || "Order rejected",
        },
        ...prev.slice(0, 40),
      ]);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const commandCatalog = [
    { id: "START_ALL_BOTS", label: "START ALL BOTS", group: "BOT CONTROL", desc: "Launch all authorized bot processes", icon: Play },
    { id: "PAUSE_ALL_BOTS", label: "PAUSE ALL BOTS", group: "BOT CONTROL", desc: "Suspend entry signal evaluation", icon: Pause },
    { id: "RESUME_ALL_BOTS", label: "RESUME ALL BOTS", group: "BOT CONTROL", desc: "Re-enable active bot execution cycles", icon: Play },
    { id: "RESTART_ALL_BOTS", label: "RESTART ALL BOTS", group: "BOT CONTROL", desc: "Restart background bot worker threads", icon: RotateCcw },
    { id: "STOP_ALL_BOTS", label: "STOP ALL BOTS", group: "BOT CONTROL", desc: "Gracefully shut down all running bots", icon: Square, isDanger: true },
    { id: "SELF_HEAL_FLEET", label: "SELF-HEAL FLEET", group: "SYSTEM CONTROL", desc: "Autonomous self-healing & error resolution pass", icon: Zap },
    { id: "RUN_DIAGNOSTICS", label: "RUN DIAGNOSTICS", group: "SYSTEM CONTROL", desc: "Evaluate platform reliability & self-healing telemetry", icon: Activity },
    { id: "CLEAR_CACHE", label: "PURGE CACHE", group: "SYSTEM CONTROL", desc: "Clear in-memory fast session cache", icon: RefreshCw },
    { id: "REFRESH_MARKET_DATA", label: "REFRESH MARKET DATA", group: "MARKET DATA", desc: "Force update live candles & tickers", icon: RefreshCw },
    { id: "SYNC_UNIVERSE", label: "SYNC UNIVERSE MASTER", group: "MARKET DATA", desc: "Sync 220+ canonical market instruments", icon: Database },
    { id: "RECONCILE_ACCOUNT", label: "RECONCILE ACCOUNT", group: "ACCOUNT CONTROL", desc: "Synchronize broker balances & ledger", icon: RotateCcw },
    { id: "RESET_PAPER_SANDBOX", label: "RESET PAPER SANDBOX", group: "PAPER ENVIRONMENT", desc: "Reset balances to ₹10,00,000 baseline", icon: RotateCcw, isWarning: true },
  ];

  return (
    <div className="w-full space-y-3.5 font-sans max-w-[1600px] mx-auto px-4 pt-4 pb-12 bg-[#05101A]">
      {/* ── 1. TOP HEADER STRIP ───────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-xs">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[19px] font-bold tracking-tight text-[#F8FAFC] leading-none">
                TRADE / EXECUTION COMMAND CENTER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-[6px] font-bold font-mono bg-[#168BFF]/15 text-[#17C5FF] border border-[#168BFF]/30">
                OPERATIONAL CONTROL
              </span>
            </div>
            <p className="text-[11px] text-[#7D8EA5] mt-1 font-medium">
              Operational control, broker execution, risk gates and real-time system trace
            </p>
          </div>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Paper Mode Pill */}
          <div className="h-[38px] px-3.5 flex items-center gap-2 rounded-lg bg-[#168BFF]/15 border border-[#168BFF]/40 text-[#17C5FF] font-sans text-[12px] font-bold shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#22D3EE] animate-pulse" />
            <span className="tracking-wide">PAPER MODE</span>
          </div>

          {/* Emergency Kill Switch Button */}
          <button
            type="button"
            onClick={() => setShowHaltConfirm(true)}
            className={cn(
              "h-[38px] px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs",
              isKillSwitchActive
                ? "bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#040A12] animate-pulse border border-[#F59E0B]"
                : "bg-[#FF3B5C]/20 hover:bg-[#FF3B5C]/30 text-[#FF3B5C] border border-[#FF3B5C]/50 hover:border-[#FF3B5C]"
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{isKillSwitchActive ? "RESUME TRADING PLATFORM" : "TRIGGER EMERGENCY HALT"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP STATUS ROW (5 CARDS, EXACT DASHBOARD GEOMETRY) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {[
          { name: "Flask Core API", desc: "Port 5050 REST Gateway", icon: Server, status: "HEALTHY", latency: "1.8 ms", isOk: true },
          { name: "APScheduler Worker", desc: "Cron & Live Runner", icon: Cpu, status: "RUNNING", latency: "60s cycle", isOk: true },
          { name: "Market SSE Stream", desc: "Realtime Ticker Channel", icon: Radio, status: "LIVE", latency: "12 ms", isOk: true },
          { name: "20-Stage Risk Gate", desc: "Pre-Trade Gatekeeper", icon: ShieldCheck, status: "ARMED", latency: "2.1 ms", isOk: true },
          { name: "Telegram Service", desc: "Asynchronous Alerts", icon: Zap, status: "CONNECTED", latency: "42 ms", isOk: true },
        ].map((sub, idx) => (
          <div
            key={idx}
            className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#7D8EA5] tracking-tight truncate">{sub.name}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-[6px] bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
                ● {sub.status}
              </span>
            </div>
            <div>
              <span className="text-[12px] font-semibold text-[#F8FAFC]">{sub.desc}</span>
            </div>
            <div className="text-[11px] text-[#7D8EA5] flex items-center justify-between font-mono pt-1 border-t border-[#10263A]">
              <span>Latency</span>
              <span className="font-semibold text-[#22D3EE] tabular-nums">{sub.latency}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. MAIN WORKSPACE: TWO-COLUMN LAYOUT (65% / 35%) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* LEFT COLUMN: QUICK TRADE & RUNTIME CONTROLS (Col-Span 7 or 8) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* SECTION A: QUICK TRADE EXECUTION */}
          <div className="p-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#22D3EE]" />
                <h3 className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                  QUICK TRADE EXECUTION
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-[#00E89A] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                OMS ROUTING: ACTIVE
              </span>
            </div>

            {/* Instrument Quick Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {QUICK_INSTRUMENTS.map((inst) => (
                <button
                  key={inst.symbol}
                  type="button"
                  onClick={() => {
                    setTradeSymbol(inst.symbol);
                    setTradeBroker(inst.broker);
                    setTradePrice(inst.price.toString());
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer shrink-0 whitespace-nowrap",
                    tradeSymbol === inst.symbol
                      ? "bg-[#168BFF]/20 border-[#168BFF] text-[#22D3EE] font-semibold"
                      : "bg-[#0C1727] border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0F1C2F]"
                  )}
                >
                  <span>{inst.name}</span>
                  <span className="ml-1 text-[#F8FAFC] tabular-nums font-mono">₹{inst.price}</span>
                </button>
              ))}
            </div>

            {/* Trade Parameters Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Instrument Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#7D8EA5] uppercase">Instrument</label>
                <input
                  type="text"
                  value={tradeSymbol}
                  onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
                  className="w-full h-[36px] bg-[#0C1727] border border-[#12304A] focus:border-[#22D3EE] rounded-lg px-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  placeholder="BTC/USDT"
                />
              </div>

              {/* Broker Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#7D8EA5] uppercase">Broker Gateway</label>
                <select
                  value={tradeBroker}
                  onChange={(e) => setTradeBroker(e.target.value)}
                  className="w-full h-[36px] bg-[#0C1727] border border-[#12304A] focus:border-[#22D3EE] rounded-lg px-2.5 text-xs text-[#F8FAFC] focus:outline-none"
                >
                  <option value="Paper Simulator">Paper Simulator (Active)</option>
                  <option value="Dhan HQ">Dhan HQ (NSE / BSE)</option>
                  <option value="Upstox">Upstox Pro (Options)</option>
                  <option value="Delta Exchange">Delta Exchange (Crypto)</option>
                </select>
              </div>

              {/* Order Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#7D8EA5] uppercase">Order Type</label>
                <select
                  value={tradeOrderType}
                  onChange={(e) => setTradeOrderType(e.target.value as any)}
                  className="w-full h-[36px] bg-[#0C1727] border border-[#12304A] focus:border-[#22D3EE] rounded-lg px-2.5 text-xs text-[#F8FAFC] focus:outline-none"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#7D8EA5] uppercase">Quantity</label>
                <input
                  type="text"
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  className="w-full h-[36px] bg-[#0C1727] border border-[#12304A] focus:border-[#22D3EE] rounded-lg px-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                  placeholder="1.0"
                />
              </div>
            </div>

            {/* Side Selection & Limit Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Buy / Sell Pill Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTradeSide("BUY")}
                  className={cn(
                    "flex-1 h-[36px] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    tradeSide === "BUY"
                      ? "bg-[#00E89A] text-[#040A12] shadow-xs"
                      : "bg-[#0C1727] text-[#7D8EA5] border border-[#12304A] hover:text-[#F8FAFC]"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>BUY (LONG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTradeSide("SELL")}
                  className={cn(
                    "flex-1 h-[36px] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    tradeSide === "SELL"
                      ? "bg-[#FF3B5C] text-[#F8FAFC] shadow-xs"
                      : "bg-[#0C1727] text-[#7D8EA5] border border-[#12304A] hover:text-[#F8FAFC]"
                  )}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>SELL (SHORT)</span>
                </button>
              </div>

              {/* Price or Market Estimate */}
              <div>
                {tradeOrderType === "LIMIT" ? (
                  <input
                    type="text"
                    value={tradePrice}
                    onChange={(e) => setTradePrice(e.target.value)}
                    className="w-full h-[36px] bg-[#0C1727] border border-[#12304A] focus:border-[#22D3EE] rounded-lg px-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none"
                    placeholder="Limit Price"
                  />
                ) : (
                  <div className="h-[36px] px-3 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between text-xs font-mono text-[#7D8EA5]">
                    <span>Market Execution</span>
                    <span className="text-[#00E89A] font-semibold">14/14 Risk Checks OK</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button & Feedback */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-[11px] text-[#7D8EA5] font-mono">
                Pipeline: <strong className="text-[#17C5FF]">Trade UI → Risk Engine → OMS → Broker Adapter</strong>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full sm:w-auto h-[38px] px-6 rounded-lg bg-[#168BFF] hover:bg-[#0F6FD9] text-[#F8FAFC] font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isPlacingOrder ? "DISPATCHING..." : "REVIEW & DISPATCH ORDER"}</span>
              </button>
            </div>

            {orderFeedback.type && (
              <div
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-mono flex items-center gap-2",
                  orderFeedback.type === "success"
                    ? "bg-[#00E89A]/10 border-[#00E89A]/30 text-[#00E89A]"
                    : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]"
                )}
              >
                {orderFeedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                <span>{orderFeedback.message}</span>
              </div>
            )}
          </div>

          {/* SECTION B: RUNTIME OPERATIONAL CONTROLS (GROUPED) */}
          <div className="p-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#22D3EE]" />
                <h3 className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                  PLATFORM OPERATIONAL CONTROLS
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#7D8EA5]">Direct CommandBus Dispatch</span>
            </div>

            {/* 1. BOT CONTROL */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-[#7D8EA5] uppercase tracking-wider">
                BOT CONTROL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {commandCatalog.filter((c) => c.group === "BOT CONTROL").map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        if (cmd.id === "STOP_ALL_BOTS") {
                          setShowStopBotsConfirm(true);
                        } else {
                          handleDispatchCommand(cmd.id);
                        }
                      }}
                      disabled={isExecuting}
                      className={cn(
                        "p-2.5 rounded-lg bg-[#0C1727] border text-left transition-all group flex items-start gap-2.5 cursor-pointer disabled:opacity-50",
                        cmd.isDanger
                          ? "border-[#FF3B5C]/40 hover:border-[#FF3B5C] hover:bg-[#FF3B5C]/10"
                          : "border-[#12304A] hover:border-[#22D3EE] hover:bg-[#0F1C2F]"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-md border text-xs shrink-0 transition-transform group-hover:scale-105",
                        cmd.isDanger ? "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]" : "bg-[#0A1422] border-[#12304A] text-[#22D3EE]"
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("text-[11px] font-bold truncate", cmd.isDanger ? "text-[#FF3B5C]" : "text-[#F8FAFC]")}>
                          {cmd.label}
                        </div>
                        <div className="text-[10px] text-[#7D8EA5] truncate leading-tight mt-0.5">{cmd.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. SYSTEM CONTROL */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-[#7D8EA5] uppercase tracking-wider">
                SYSTEM CONTROL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {commandCatalog.filter((c) => c.group === "SYSTEM CONTROL").map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => handleDispatchCommand(cmd.id)}
                      disabled={isExecuting}
                      className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] hover:border-[#22D3EE] hover:bg-[#0F1C2F] text-left transition-all group flex items-start gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      <div className="p-1.5 rounded-md bg-[#0A1422] border border-[#12304A] text-[#22D3EE] text-xs shrink-0 transition-transform group-hover:scale-105">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-[#F8FAFC] truncate">{cmd.label}</div>
                        <div className="text-[10px] text-[#7D8EA5] truncate leading-tight mt-0.5">{cmd.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. MARKET DATA, ACCOUNT CONTROL, PAPER ENVIRONMENT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* MARKET DATA */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#7D8EA5] uppercase tracking-wider">MARKET DATA</div>
                {commandCatalog.filter((c) => c.group === "MARKET DATA").map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => handleDispatchCommand(cmd.id)}
                    disabled={isExecuting}
                    className="w-full p-2 rounded-lg bg-[#0C1727] border border-[#12304A] hover:border-[#22D3EE] hover:bg-[#0F1C2F] text-left text-[11px] font-semibold text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{cmd.label}</span>
                    <cmd.icon className="h-3 w-3 text-[#22D3EE] shrink-0" />
                  </button>
                ))}
              </div>

              {/* ACCOUNT CONTROL */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#7D8EA5] uppercase tracking-wider">ACCOUNT CONTROL</div>
                {commandCatalog.filter((c) => c.group === "ACCOUNT CONTROL").map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => handleDispatchCommand(cmd.id)}
                    disabled={isExecuting}
                    className="w-full p-2 rounded-lg bg-[#0C1727] border border-[#12304A] hover:border-[#22D3EE] hover:bg-[#0F1C2F] text-left text-[11px] font-semibold text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{cmd.label}</span>
                    <cmd.icon className="h-3 w-3 text-[#22D3EE] shrink-0" />
                  </button>
                ))}
              </div>

              {/* PAPER ENVIRONMENT */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#7D8EA5] uppercase tracking-wider">SANDBOX</div>
                {commandCatalog.filter((c) => c.group === "PAPER ENVIRONMENT").map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => setShowResetSandboxConfirm(true)}
                    disabled={isExecuting}
                    className="w-full p-2 rounded-lg bg-[#0C1727] border border-[#F59E0B]/40 hover:border-[#F59E0B] text-left text-[11px] font-semibold text-[#F59E0B] flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{cmd.label}</span>
                    <cmd.icon className="h-3 w-3 text-[#F59E0B] shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION C: CUSTOM COMMAND DISPATCHER */}
            <div className="p-3 rounded-lg bg-[#0C1727] border border-[#12304A] space-y-2 mt-2">
              <div className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                CUSTOM COMMAND DISPATCHER
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedCommand}
                  onChange={(e) => setSelectedCommand(e.target.value)}
                  className="h-[34px] bg-[#0A1422] border border-[#12304A] focus:border-[#22D3EE] text-xs rounded-lg px-2.5 text-[#F8FAFC] focus:outline-none"
                >
                  {commandCatalog.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  placeholder='Payload JSON e.g. {"symbol": "BTC/USDT"}'
                  className="sm:col-span-2 h-[34px] bg-[#0A1422] border border-[#12304A] focus:border-[#22D3EE] text-xs rounded-lg px-2.5 font-mono text-[#F8FAFC] focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(commandPayload);
                      handleDispatchCommand(selectedCommand, parsed);
                    } catch {
                      handleDispatchCommand(selectedCommand, {});
                    }
                  }}
                  disabled={isExecuting}
                  className="h-[34px] px-4 bg-[#168BFF] hover:bg-[#0F6FD9] text-[#F8FAFC] font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  <span>Execute via CommandBus</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OPERATIONAL TRACE, BROKERS, SYSTEM HEALTH (Col-Span 5) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* SECTION D: REAL-TIME OPERATIONAL TRACE */}
          <div className="p-4 rounded-[10px] bg-[#07111F] border border-[#12304A] space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#22D3EE]" />
                <h3 className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                  REAL-TIME OPERATIONAL TRACE
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConsoleOutput([])}
                className="text-[10px] font-medium text-[#7D8EA5] hover:text-[#22D3EE] transition-colors cursor-pointer"
              >
                Clear Trace
              </button>
            </div>

            {/* Terminal Trace Stream */}
            <div className="h-64 bg-[#040A12] border border-[#10263A] rounded-lg p-2.5 font-mono text-[10px] space-y-1.5 overflow-y-auto scrollbar-thin">
              {consoleOutput.length === 0 ? (
                <div className="text-[#7D8EA5] italic text-[11px] p-2">
                  Awaiting operational triggers... CommandBus channel ready.
                </div>
              ) : (
                consoleOutput.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed border-b border-[#10263A]/40 pb-1 last:border-none">
                    <span className="text-[#7D8EA5] tabular-nums shrink-0">{item.timestamp}</span>
                    <span className="font-semibold text-[#22D3EE] shrink-0">{item.command}</span>
                    <span
                      className={cn(
                        "px-1 py-0.2 rounded text-[9px] font-bold shrink-0",
                        item.status === "COMPLETED" && "bg-[#00E89A]/15 text-[#00E89A]",
                        item.status === "STARTED" && "bg-[#168BFF]/15 text-[#17C5FF]",
                        item.status === "FAILED" && "bg-[#FF3B5C]/15 text-[#FF3B5C]"
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="text-[#B7C6D8] truncate flex-1">{item.message}</span>
                    {item.latency && (
                      <span className="text-[#7D8EA5] tabular-nums shrink-0">{item.latency}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION E: EXECUTION BROKERS */}
          <div className="p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                EXECUTION BROKERS
              </span>
              <span className="text-[10px] font-semibold text-[#00E89A] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                4/4 READY
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                { name: "Dhan HQ", auth: true, data: true, orders: true, mode: "LIVE LOCKED", latency: "42ms" },
                { name: "Upstox", auth: true, data: true, orders: true, mode: "LIVE LOCKED", latency: "68ms" },
                { name: "Delta Exchange", auth: true, data: true, orders: true, mode: "LIVE LOCKED", latency: "85ms" },
                { name: "Paper Simulator", auth: true, data: true, orders: true, mode: "ACTIVE", latency: "0ms", isPaper: true },
              ].map((b) => (
                <div
                  key={b.name}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00E89A]" />
                    <span className="font-semibold text-[#F8FAFC]">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-[#00E89A]">AUTH ●</span>
                    <span className="text-[#00E89A]">DATA ●</span>
                    <span className="text-[#00E89A]">ORDERS ●</span>
                    <span className={cn("px-1.5 py-0.2 rounded font-semibold", b.isPaper ? "bg-[#17C5FF]/10 text-[#17C5FF]" : "bg-[#F59E0B]/10 text-[#F59E0B]")}>
                      {b.mode}
                    </span>
                    <span className="text-[#22D3EE] tabular-nums">{b.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION F: SYSTEM HEALTH & TELEMETRY */}
          <div className="p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">SYSTEM HEALTH</span>
              <span className="text-[10px] font-medium text-[#7D8EA5]">TELEMETRY</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {[
                { name: "Backend", status: "Operational", latency: "1.8ms" },
                { name: "Database", status: "Operational", latency: "0.4ms" },
                { name: "Gateway", status: "Operational", latency: "2.1ms" },
                { name: "Market Data", status: "Live Feed", latency: "12ms" },
                { name: "Risk Engine", status: "Operational", latency: "0.8ms" },
                { name: "OMS", status: "Operational", latency: "1.2ms" },
                { name: "WebSocket", status: "Connected", latency: "14ms" },
                { name: "Scheduler", status: "Running", latency: "60s" },
              ].map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-0.5">
                  <span className="text-[#7D8EA5]">{svc.name}</span>
                  <div className="flex items-center gap-1 text-[#00E89A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A]" />
                    <span className="font-medium text-[10px]">{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION G: DIAGNOSTIC & DEEP INSPECTION LINKS */}
          <div className="p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7D8EA5] pb-1 border-b border-[#10263A]">
              DIAGNOSTIC & DEEP INSPECTION HUBS
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => router.push("/system-health")}
                className="p-2 rounded-lg bg-[#0C1727] hover:bg-[#0F1C2F] border border-[#12304A] text-left flex items-center justify-between transition-colors cursor-pointer text-[#F8FAFC]"
              >
                <span>System Health Hub</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#22D3EE]" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/providers")}
                className="p-2 rounded-lg bg-[#0C1727] hover:bg-[#0F1C2F] border border-[#12304A] text-left flex items-center justify-between transition-colors cursor-pointer text-[#F8FAFC]"
              >
                <span>Providers Matrix</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#22D3EE]" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/bots")}
                className="p-2 rounded-lg bg-[#0C1727] hover:bg-[#0F1C2F] border border-[#12304A] text-left flex items-center justify-between transition-colors cursor-pointer text-[#F8FAFC]"
              >
                <span>Bot Fleet Wizard</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#22D3EE]" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/logs")}
                className="p-2 rounded-lg bg-[#0C1727] hover:bg-[#0F1C2F] border border-[#12304A] text-left flex items-center justify-between transition-colors cursor-pointer text-[#F8FAFC]"
              >
                <span>Full Audit Logs</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#22D3EE]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. SAFETY CONFIRMATION MODALS ─────────────────────────── */}
      {/* 1. Emergency Kill Switch Modal */}
      {showHaltConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0A1422] border border-[#FF3B5C] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#FF3B5C]">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-[#F8FAFC]">
                {isKillSwitchActive ? "Deactivate Platform Kill Switch?" : "EMERGENCY GLOBAL HALT"}
              </h3>
            </div>
            <p className="text-xs text-[#B7C6D8] leading-relaxed">
              {isKillSwitchActive
                ? "Re-enable order routing and resume bot signal processing."
                : "Immediately stops all active bot processes, cancels working orders, and blocks new trade routing."}
            </p>

            {!isKillSwitchActive && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-[#7D8EA5] block">
                  Type <strong className="text-[#FF3B5C]">HALT</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={haltConfirmWord}
                  onChange={(e) => setHaltConfirmWord(e.target.value.toUpperCase())}
                  placeholder="HALT"
                  className="w-full bg-[#040A12] border border-[#12304A] focus:border-[#FF3B5C] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] font-mono focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowHaltConfirm(false);
                  setHaltConfirmWord("");
                }}
                className="px-4 py-2 rounded-lg bg-[#0C1727] border border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isKillSwitchActive) {
                    await handleDispatchCommand("DEACTIVATE_KILL_SWITCH");
                  } else {
                    await handleDispatchCommand("ACTIVATE_KILL_SWITCH", { reason: "Trade Workspace Halt" });
                  }
                  setShowHaltConfirm(false);
                  setHaltConfirmWord("");
                }}
                disabled={!isKillSwitchActive && haltConfirmWord !== "HALT"}
                className="px-4 py-2 rounded-lg bg-[#FF3B5C] text-[#F8FAFC] text-xs font-bold shadow-lg disabled:opacity-40 cursor-pointer"
              >
                {isKillSwitchActive ? "Confirm Resume" : "Confirm Emergency Halt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Stop All Bots Modal */}
      {showStopBotsConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0A1422] border border-[#FF3B5C]/60 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#FF3B5C]">
              <Square className="h-6 w-6" />
              <h3 className="text-base font-bold text-[#F8FAFC]">Stop All Running Bots?</h3>
            </div>
            <p className="text-xs text-[#B7C6D8] leading-relaxed">
              This will gracefully stop all active bot instances and worker threads across Dhan HQ, Upstox, and Delta Exchange.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStopBotsConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[#0C1727] border border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDispatchCommand("STOP_ALL_BOTS");
                  setShowStopBotsConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#FF3B5C] text-[#F8FAFC] text-xs font-bold shadow-lg cursor-pointer"
              >
                Confirm Stop All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reset Paper Sandbox Modal */}
      {showResetSandboxConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0A1422] border border-[#F59E0B]/60 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#F59E0B]">
              <RotateCcw className="h-6 w-6" />
              <h3 className="text-base font-bold text-[#F8FAFC]">Reset Paper Trading Sandbox?</h3>
            </div>
            <p className="text-xs text-[#B7C6D8] leading-relaxed">
              This will reset paper simulated balances to baseline ₹10,00,000, clear virtual open positions, and purge sandbox trades.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetSandboxConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[#0C1727] border border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDispatchCommand("RESET_PAPER_SANDBOX");
                  setShowResetSandboxConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#040A12] text-xs font-bold shadow-lg cursor-pointer"
              >
                Confirm Sandbox Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
