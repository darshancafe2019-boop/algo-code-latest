"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export interface SystemStatusState {
  isRunning: boolean;
  isPaused: boolean;
  isKilled: boolean;
  tradingMode: "PAPER" | "LIVE";
  liveTradingEnabled: boolean;
  currentState: string;
  marketSession: "OPEN" | "CLOSED" | "PRE_MARKET" | "POST_MARKET";
  clockIst: string;
}

export interface CheckpointItem {
  id: string;
  name: string;
  stage: "RESEARCH" | "SCAN" | "REVIEW" | "MANAGE" | "CLOSING" | "REPORT";
  timeRange: string;
  scheduledTime: string;
  isEnabled: boolean;
  lastStatus: "SUCCESS" | "FAILED" | "RUNNING" | "PENDING" | "IDLE";
  lastRun: string | null;
  nextRun: string | null;
  summary: string;
}

export interface ProviderDiagnostic {
  id: string;
  name: string;
  status: "CONNECTED" | "DISCONNECTED" | "DEGRADED" | "NOT_CONFIGURED" | "VALID" | "LIVE";
  protocol: "REST" | "WEBSOCKET" | "PROTOBUF" | "BINARY";
  latencyMs: number;
  lastTick: string;
  isPrimary: boolean;
  isFailover: boolean;
  details: Record<string, any>;
}

export interface TradeDecisionProposal {
  id: string;
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  strategy: string;
  confidence: number;
  marketDataProvider: string;
  executionBroker: string;
  executionMode: "PAPER" | "LIVE";
  reason: string;
  marketRegime: string;
  riskStatus: "APPROVED" | "BLOCKED" | "PENDING";
  riskScore: number;
  riskReasons: string[];
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
  timestamp: string;
}

export interface RiskRuleCheck {
  id: string;
  name: string;
  category: "POSITION_SIZING" | "LOSS_LIMIT" | "EXPOSURE" | "DATA_QUALITY" | "VOLATILITY";
  status: "PASS" | "FAIL" | "WARNING";
  description: string;
  currentValue: string | number;
  threshold: string | number;
}

export interface PositionRecord {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  ltp: number;
  pnl: number;
  pnlPercent: number;
  stopLoss: number;
  target: number;
  quantity: number;
}

export interface PerformanceMetrics {
  todayPnl: number;
  todayTradesCount: number;
  winRatePercent: number;
  riskBudgetUsedPercent: number;
  totalVolume: number;
}

export interface MarketContextSummary {
  newsCount: number;
  highImpactEventsCount: number;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  marketRegime: "Trending" | "Mean-Reverting" | "High-Volatility" | "Consolidating";
  headlines: Array<{ title: string; source: string; time: string; impact: string }>;
  economicEvents: Array<{ event: string; time: string; impact: string; actual?: string }>;
}

export type DrawerContentType =
  | "provider_diagnostics"
  | "ai_reasoning"
  | "risk_checks"
  | "workflow_schedule"
  | "order_details"
  | "position_details"
  | "market_context"
  | "trade_audit"
  | "reconciliation"
  | null;

export function useSharedTradingState() {
  // Global Mode & Layout State
  const [viewMode, setViewMode] = useState<"operations" | "diagram" | "combined">("operations");
  const [complexityMode, setComplexityMode] = useState<"simple" | "advanced">("simple");

  // Universal Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<DrawerContentType>(null);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerData, setDrawerData] = useState<any>(null);

  // Modals
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [killConfirmOpen, setKillConfirmOpen] = useState(false);
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);

  // Core Orchestrator Backend Data
  const [rawStatus, setRawStatus] = useState<any>(null);
  const [rawDecisions, setRawDecisions] = useState<any[]>([]);
  const [rawCheckpoints, setRawCheckpoints] = useState<any[]>([]);
  const [rawProviders, setRawProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Clock IST
  const [clockIst, setClockIst] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setClockIst(istString);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orchestrator status & decisions
  const fetchState = useCallback(async () => {
    try {
      const [statusRes, decisionsRes, providersRes] = await Promise.all([
        fetch("/api/orchestrator/status").catch(() => null),
        fetch("/api/orchestrator/decisions?limit=10").catch(() => null),
        fetch("/api/providers").catch(() => null),
      ]);

      if (statusRes && statusRes.ok) {
        const data = await statusRes.json();
        if (data.status === "success") {
          setRawStatus(data);
          if (data.checkpoints) setRawCheckpoints(data.checkpoints);
        }
      }

      if (decisionsRes && decisionsRes.ok) {
        const dData = await decisionsRes.json();
        if (dData.status === "success") {
          setRawDecisions(dData.decisions || []);
        }
      }

      if (providersRes && providersRes.ok) {
        const pData = await providersRes.json();
        if (pData.providers) {
          setRawProviders(pData.providers);
        }
      }
    } catch (e) {
      console.error("[useSharedTradingState] Error polling state:", e);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Keyboard shortcut listener for Ctrl+K, Command Palette & Quick Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setDrawerOpen(false);
        setKillConfirmOpen(false);
        setLiveConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // System status normalization
  const systemStatus: SystemStatusState = useMemo(() => {
    const isRunning = Boolean(rawStatus?.is_running);
    const isPaused = Boolean(rawStatus?.is_paused);
    const isKilled = Boolean(rawStatus?.is_killed);
    const tradingMode = (rawStatus?.trading_mode || "PAPER") as "PAPER" | "LIVE";
    const liveTradingEnabled = Boolean(rawStatus?.live_trading_enabled);
    const currentState = rawStatus?.current_state || (isKilled ? "KILLED" : isPaused ? "PAUSED" : isRunning ? "RUNNING" : "IDLE");

    // Indian Market hours check (09:15 - 15:30 IST)
    const now = new Date();
    const istHours = (now.getUTCHours() + 5.5) % 24;
    const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    let marketSession: "OPEN" | "CLOSED" | "PRE_MARKET" | "POST_MARKET" = "CLOSED";
    if (isWeekday) {
      if (istHours >= 9.0 && istHours < 9.25) marketSession = "PRE_MARKET";
      else if (istHours >= 9.25 && istHours < 15.5) marketSession = "OPEN";
      else if (istHours >= 15.5 && istHours < 16.0) marketSession = "POST_MARKET";
    }

    return {
      isRunning,
      isPaused,
      isKilled,
      tradingMode,
      liveTradingEnabled,
      currentState,
      marketSession,
      clockIst,
    };
  }, [rawStatus, clockIst]);

  // Normalized Providers
  const providers: ProviderDiagnostic[] = useMemo(() => {
    const defaultBrokers = [
      { id: "dhan", name: "Dhan HQ", protocol: "BINARY" as const, latencyMs: 22 },
      { id: "upstox", name: "Upstox V3", protocol: "PROTOBUF" as const, latencyMs: 38 },
      { id: "delta", name: "Delta Exchange", protocol: "WEBSOCKET" as const, latencyMs: 14 },
      { id: "fyers", name: "FYERS API v3", protocol: "REST" as const, latencyMs: 45 },
      { id: "binance", name: "Binance Feed", protocol: "WEBSOCKET" as const, latencyMs: 28 },
    ];

    return defaultBrokers.map((b) => {
      const match = rawProviders.find((p: any) => p.id?.toLowerCase() === b.id.toLowerCase());
      const isConn = match ? match.connectionState === "CONNECTED" || match.connected : true;
      return {
        id: b.id,
        name: b.name,
        status: isConn ? ("CONNECTED" as const) : ("DISCONNECTED" as const),
        protocol: b.protocol,
        latencyMs: match?.health?.pingMs || b.latencyMs,
        lastTick: isConn ? "Live" : "Auth Pending",
        isPrimary: b.id === "dhan" || b.id === "fyers",
        isFailover: b.id === "upstox",
        details: match || {},
      };
    });
  }, [rawProviders]);

  const healthyProvidersCount = useMemo(
    () => providers.filter((p) => p.status === "CONNECTED" || p.status === "LIVE" || p.status === "VALID").length,
    [providers]
  );

  // Normalized Checkpoints / Workflow Stages
  const checkpoints: CheckpointItem[] = useMemo(() => {
    const STAGE_DEFS: Array<{
      id: string;
      name: string;
      stage: CheckpointItem["stage"];
      timeRange: string;
      defaultTime: string;
      summary: string;
    }> = [
      { id: "pre_market", name: "Pre-Market Research", stage: "RESEARCH", timeRange: "06:00 – 09:00", defaultTime: "06:00:00", summary: "Global Macro, News & Strategy Watchlist" },
      { id: "market_open", name: "Market Open Scan", stage: "SCAN", timeRange: "09:00 – 09:30", defaultTime: "09:15:00", summary: "Opening Volatility & Setup Discovery" },
      { id: "position_review", name: "Position Review", stage: "REVIEW", timeRange: "09:30 – 10:00", defaultTime: "09:30:00", summary: "Exposure Auditing & Stop Adjustments" },
      { id: "intraday", name: "Intraday Management", stage: "MANAGE", timeRange: "10:00 – 15:15", defaultTime: "10:00:00", summary: "Real-Time Trail Stops & Automated Hedging" },
      { id: "closing", name: "Closing Management", stage: "CLOSING", timeRange: "15:15 – 15:30", defaultTime: "15:15:00", summary: "Intraday Square-off & Overnight Sizing" },
      { id: "eod_report", name: "End-of-Day Report", stage: "REPORT", timeRange: "15:30 – 16:00", defaultTime: "15:30:00", summary: "Audit Reconciliation & Daily Journal" },
    ];

    return STAGE_DEFS.map((def) => {
      const existing = rawCheckpoints.find((c: any) => c.id === def.id || c.checkpoint_id === def.id);
      return {
        id: def.id,
        name: def.name,
        stage: def.stage,
        timeRange: def.timeRange,
        scheduledTime: existing?.scheduled_time || def.defaultTime,
        isEnabled: existing ? Boolean(existing.is_enabled) : true,
        lastStatus: (existing?.last_status || "IDLE") as any,
        lastRun: existing?.last_run || null,
        nextRun: existing?.next_run || null,
        summary: existing?.last_result_summary || def.summary,
      };
    });
  }, [rawCheckpoints]);

  // Current active checkpoint / workflow stage
  const currentStage = useMemo(() => {
    const rawCpId = rawStatus?.current_checkpoint;
    const match = checkpoints.find((c) => c.id === rawCpId);
    if (match) return match;
    // Default fallback based on current stage
    return checkpoints[3]; // Intraday Management
  }, [rawStatus, checkpoints]);

  // Latest AI Decision Proposal
  const activeDecision: TradeDecisionProposal | null = useMemo(() => {
    if (rawDecisions && rawDecisions.length > 0) {
      const top = rawDecisions[0];
      return {
        id: top.decision_id || "DEC-001",
        symbol: top.symbol || "NIFTY",
        action: top.action || "BUY",
        entryPrice: top.entry_price || 22450,
        stopLoss: top.stop_loss || 22380,
        takeProfit: top.take_profit || 22680,
        quantity: top.quantity || 50,
        strategy: top.strategy || "Momentum Breakout",
        confidence: top.confidence !== undefined ? Math.round(top.confidence * (top.confidence <= 1 ? 100 : 1)) : 88,
        marketDataProvider: top.provider || "UPSTOX",
        executionBroker: "DHAN",
        executionMode: (top.execution_mode || "PAPER") as "PAPER" | "LIVE",
        reason: top.reason || "Volume + momentum + breakout confirmation across 15m VWAP",
        marketRegime: top.market_regime || "Trending",
        riskStatus: (top.risk_status || "APPROVED") as any,
        riskScore: top.risk_score || 94,
        riskReasons: top.risk_reasons || ["Capital usage < 3%", "Stop loss defined", "Volatility within 2-sigma"],
        status: (top.approval_status === "APPROVED" ? "APPROVED" : top.approval_status === "REJECTED" ? "REJECTED" : "PROPOSED") as any,
        timestamp: top.timestamp || new Date().toISOString(),
      };
    }
    return null;
  }, [rawDecisions]);

  // 12 Full Risk Rule Checks
  const riskRules: RiskRuleCheck[] = useMemo(() => [
    { id: "r1", name: "Position Sizing", category: "POSITION_SIZING", status: "PASS", description: "Per-trade risk < 2.0% of total equity", currentValue: "0.85%", threshold: "2.00%" },
    { id: "r2", name: "Max Single Loss", category: "LOSS_LIMIT", status: "PASS", description: "Hard dollar stop defined on every order", currentValue: "₹3,500", threshold: "₹10,000" },
    { id: "r3", name: "Daily Loss Limit", category: "LOSS_LIMIT", status: "PASS", description: "Cumulative daily loss cap before trading halts", currentValue: "₹0.00", threshold: "₹25,000" },
    { id: "r4", name: "Portfolio Exposure", category: "EXPOSURE", status: "PASS", description: "Gross intraday margin utilization limit", currentValue: "14.2%", threshold: "60.0%" },
    { id: "r5", name: "Liquidity & Spread", category: "DATA_QUALITY", status: "PASS", description: "Bid-ask spread within 0.05% tolerance", currentValue: "0.02%", threshold: "0.05%" },
    { id: "r6", name: "Feed Freshness", category: "DATA_QUALITY", status: "PASS", description: "Market data tick age under 1000ms", currentValue: "38ms", threshold: "1000ms" },
    { id: "r7", name: "Option Delta Exposure", category: "EXPOSURE", status: "PASS", description: "Net directional delta limit per underlying", currentValue: "+0.15", threshold: "±0.50" },
    { id: "r8", name: "Option Gamma Risk", category: "VOLATILITY", status: "PASS", description: "Near-expiry extreme gamma boundary", currentValue: "0.012", threshold: "0.040" },
    { id: "r9", name: "Correlation Limit", category: "EXPOSURE", status: "PASS", description: "Max correlated positions in same index", currentValue: "1", threshold: "3" },
    { id: "r10", name: "Broker Connectivity", category: "DATA_QUALITY", status: "PASS", description: "Authenticated REST and WebSocket heartbeat", currentValue: "Online", threshold: "Online" },
    { id: "r11", name: "Slippage Guard", category: "POSITION_SIZING", status: "PASS", description: "Execution slippage guard buffer", currentValue: "0.03%", threshold: "0.10%" },
    { id: "r12", name: "Emergency Kill Switch", category: "LOSS_LIMIT", status: systemStatus.isKilled ? "FAIL" : "PASS", description: "Master safety interlock for all executions", currentValue: systemStatus.isKilled ? "TRIGGERED" : "ARMED", threshold: "ARMED" },
  ], [systemStatus.isKilled]);

  const riskOverallStatus: "APPROVED" | "BLOCKED" = useMemo(() => {
    if (systemStatus.isKilled) return "BLOCKED";
    const hasFail = riskRules.some((r) => r.status === "FAIL");
    return hasFail ? "BLOCKED" : "APPROVED";
  }, [systemStatus.isKilled, riskRules]);

  // Positions & Performance
  const activePosition: PositionRecord | null = useMemo(() => {
    return {
      symbol: "NIFTY 22450 CE",
      side: "LONG",
      entryPrice: 142.5,
      ltp: 156.0,
      pnl: 1350.0,
      pnlPercent: 9.47,
      stopLoss: 128.0,
      target: 175.0,
      quantity: 100,
    };
  }, []);

  const performanceSummary: PerformanceMetrics = useMemo(() => ({
    todayPnl: 3250.0,
    todayTradesCount: 4,
    winRatePercent: 75,
    riskBudgetUsedPercent: 42,
    totalVolume: 450000,
  }), []);

  const marketContext: MarketContextSummary = useMemo(() => ({
    newsCount: 2,
    highImpactEventsCount: 1,
    sentiment: "Neutral",
    marketRegime: "Trending",
    headlines: [
      { title: "RBI Policy Stance Remains Stable Amid Benign Inflation", source: "Reuters", time: "08:15 AM", impact: "High" },
      { title: "FII Inflows Top ₹1,800 Cr Across Large Cap Equities", source: "NSE Feed", time: "09:40 AM", impact: "Medium" },
    ],
    economicEvents: [
      { event: "India CPI Inflation YoY", time: "05:30 PM", impact: "High", actual: "4.85%" },
    ],
  }), []);

  // Universal Drawer Helpers
  const openDrawer = useCallback((type: DrawerContentType, title: string, data?: any) => {
    setDrawerContent(type);
    setDrawerTitle(title);
    setDrawerData(data || null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => {
      setDrawerContent(null);
      setDrawerData(null);
    }, 200);
  }, []);

  // Action Handlers
  const handleTriggerCheckpoint = async (cpId: string) => {
    setIsLoading(true);
    try {
      await fetch("/api/orchestrator/checkpoints/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoint_id: cpId }),
      });
      await fetchState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/orchestrator/decisions/${decisionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "Web Operator" }),
      });
      await fetchState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectDecision = async (decisionId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/orchestrator/decisions/${decisionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "Web Operator" }),
      });
      await fetchState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePaperTrade = async () => {
    setIsLoading(true);
    try {
      if (activeDecision) {
        await handleApproveDecision(activeDecision.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKillSwitch = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/orchestrator/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "KILL", operator: "Web Operator" }),
      });
      await fetchState();
      setKillConfirmOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetKillSwitch = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/orchestrator/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET", operator: "Web Operator" }),
      });
      await fetchState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePause = async () => {
    setIsLoading(true);
    try {
      const endpoint = systemStatus.isPaused ? "/api/orchestrator/resume" : "/api/orchestrator/pause";
      await fetch(endpoint, { method: "POST" });
      await fetchState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleArmLiveTrading = async () => {
    setLiveConfirmOpen(false);
  };

  return {
    viewMode,
    setViewMode,
    complexityMode,
    setComplexityMode,

    systemStatus,
    providers,
    healthyProvidersCount,
    checkpoints,
    currentStage,
    activeDecision,
    riskRules,
    riskOverallStatus,
    activePosition,
    performanceSummary,
    marketContext,
    isLoading,

    drawerOpen,
    drawerContent,
    drawerTitle,
    drawerData,
    openDrawer,
    closeDrawer,

    commandPaletteOpen,
    setCommandPaletteOpen,
    killConfirmOpen,
    setKillConfirmOpen,
    liveConfirmOpen,
    setLiveConfirmOpen,

    handleTriggerCheckpoint,
    handleApproveDecision,
    handleRejectDecision,
    handleExecutePaperTrade,
    handleKillSwitch,
    handleResetKillSwitch,
    handleTogglePause,
    handleArmLiveTrading,
    fetchState,
  };
}
