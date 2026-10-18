import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Truthful initial orchestrator state for Next.js BFF layer
let orchestratorState = {
  is_running: false,
  is_paused: false,
  is_killed: false,
  trading_mode: "PAPER",
  live_trading_enabled: false,
  current_state: "DISCONNECTED",
  checkpoints: [
    {
      id: "PRE_MARKET_RESEARCH",
      name: "Pre-Market Research",
      scheduled_time: "06:00",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
    {
      id: "MARKET_OPEN_SCAN",
      name: "Market Open Scan",
      scheduled_time: "09:00",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
    {
      id: "POSITION_REVIEW",
      name: "Position Review",
      scheduled_time: "09:30",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
    {
      id: "INTRADAY_MANAGEMENT",
      name: "Intraday Management",
      scheduled_time: "10:00",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
    {
      id: "CLOSING_MANAGEMENT",
      name: "Closing Management",
      scheduled_time: "15:15",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
    {
      id: "END_OF_DAY_REPORT",
      name: "End of Day Report",
      scheduled_time: "15:30",
      is_enabled: false,
      status: "OFFLINE",
      last_run_iso: null,
      duration_sec: 0,
      result_summary: "Backend orchestrator disconnected.",
      timezone: "Asia/Kolkata",
    },
  ],
};

let simulatedDecisions: any[] = [];
let journalHistory: any[] = [];

export async function GET(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const path = (params.route || []).join("/");
  const backendUrl = getBackendBaseUrl();

  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  // 1. Try backend Flask route first
  if (backendUrl) {
    const url = `${backendUrl}/api/orchestrator/${path}${req.nextUrl.search}`;
    try {
      const res = await fetch(url, {
        headers: getForwardHeaders(req),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication or authorization required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // 2. Truthful local fallback handlers if backend unreachable
  if (path === "status") {
    return NextResponse.json({
      status: "offline",
      is_running: false,
      is_paused: false,
      is_killed: false,
      trading_mode: orchestratorState.trading_mode,
      live_trading_enabled: false,
      current_state: "DISCONNECTED",
      checkpoints: orchestratorState.checkpoints,
      risk_summary: {
        daily_loss_limit: 0,
        max_position_size: 0,
        kill_switch_active: false,
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "checkpoints") {
    return NextResponse.json({
      status: "offline",
      checkpoints: orchestratorState.checkpoints,
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "workflow") {
    return NextResponse.json({
      status: "offline",
      workflow: {
        current_state: "DISCONNECTED",
        is_paused: false,
        is_killed: false,
        active_checkpoint: null,
        start_time: null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "decisions") {
    return NextResponse.json({
      status: "offline",
      decisions: simulatedDecisions,
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "risk") {
    return NextResponse.json({
      status: "offline",
      risk_limits: {
        max_daily_loss_usd: 0,
        max_position_size_usd: 0,
        max_open_orders: 0,
        max_leverage: 0,
      },
      open_positions_count: 0,
      kill_switch_active: false,
      status_gate: "OFFLINE",
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "journal") {
    return NextResponse.json({
      status: "offline",
      journal: journalHistory,
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "report") {
    return NextResponse.json({
      status: "offline",
      report: {
        date: new Date().toISOString().split("T")[0],
        total_pnl: 0,
        win_rate: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        fees_incurred: 0,
        risk_utilization: 0,
        ai_observations: "Backend orchestrator disconnected.",
        next_session_watchlist: [],
        generated_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { status: "offline", route: path, message: `Backend orchestrator disconnected.` },
    { status: 503 }
  );
}

export async function POST(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const path = (params.route || []).join("/");
  const backendUrl = getBackendBaseUrl();

  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1. Try forwarding to backend Flask
  if (backendUrl) {
    const url = `${backendUrl}/api/orchestrator/${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
      if (res.status >= 400 && res.status < 500) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // In production, if backend fails, fail closed
  if (isProduction()) {
    return NextResponse.json(
      { error: `Backend orchestrator unreachable for command '${path}'.` },
      { status: 503 }
    );
  }

  // 2. Local fallback command execution in development
  if (path === "start") {
    orchestratorState.is_running = true;
    orchestratorState.is_paused = false;
    orchestratorState.current_state = "RUNNING";
    return NextResponse.json({ status: "success", message: "Trading Orchestrator started." });
  }

  if (path === "pause") {
    orchestratorState.is_paused = true;
    orchestratorState.current_state = "PAUSED";
    return NextResponse.json({ status: "success", message: "Trading Orchestrator paused." });
  }

  if (path === "resume") {
    orchestratorState.is_paused = false;
    orchestratorState.current_state = "RUNNING";
    return NextResponse.json({ status: "success", message: "Trading Orchestrator resumed." });
  }

  if (path === "stop") {
    orchestratorState.is_running = false;
    orchestratorState.current_state = "IDLE";
    return NextResponse.json({ status: "success", message: "Trading Orchestrator stopped." });
  }

  if (path === "kill") {
    const action = body.action || "KILL";
    if (action === "RESET") {
      orchestratorState.is_killed = false;
      orchestratorState.current_state = "IDLE";
      return NextResponse.json({ status: "success", message: "Emergency Kill Switch reset. System back to IDLE." });
    } else {
      orchestratorState.is_killed = true;
      orchestratorState.is_running = false;
      orchestratorState.current_state = "KILLED";
      return NextResponse.json({ status: "success", message: "EMERGENCY KILL SWITCH ACTIVATED. All orders halted." });
    }
  }

  if (path === "checkpoints/trigger") {
    const cpId = body.checkpoint_id || "MARKET_OPEN_SCAN";
    const cp = orchestratorState.checkpoints.find((c) => c.id === cpId);
    if (cp) {
      cp.status = "COMPLETED";
      cp.last_run_iso = new Date().toISOString();
      cp.result_summary = `Manually triggered at ${new Date().toLocaleTimeString()} - Complete`;
    }
    return NextResponse.json({ status: "success", message: `Triggered checkpoint '${cpId}' successfully.` });
  }

  if (path === "checkpoints/configure") {
    const cpId = body.checkpoint_id;
    const cp = orchestratorState.checkpoints.find((c) => c.id === cpId);
    if (cp) {
      if (body.scheduled_time !== undefined) cp.scheduled_time = body.scheduled_time;
      if (body.is_enabled !== undefined) cp.is_enabled = body.is_enabled;
    }
    return NextResponse.json({ status: "success", checkpoint: cp });
  }

  return NextResponse.json({
    status: "success",
    action: path,
    message: `Orchestrator action '${path}' simulated locally.`,
    timestamp: new Date().toISOString(),
  });
}
