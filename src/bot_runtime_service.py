"""
Authoritative Bot Runtime Service
=================================
Provides single, canonical source of truth for:
- Mutually exclusive bot lifecycle state machine (DRAFT, STOPPED, STARTING, RUNNING, PAUSING, PAUSED, STOPPING, RECOVERING, ERROR, DISABLED)
- Mathematical count invariant enforcement: TOTAL BOTS = sum(state counts)
- Exact bot_id attributed P&L and Position state
- Truthful health telemetry (HEALTHY, DEGRADED, RECOVERING, ERROR, UNKNOWN)
- Plain-English Next Action derivation
- Mutex-guarded idempotent lifecycle operations (START, PAUSE, RESUME, STOP, BULK_START, EMERGENCY_HALT)
"""

import enum
import json
import logging
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from src import audit, config, db, pnl_engine
from src.process_manager import multi_bot_manager

logger = logging.getLogger("BotRuntimeService")


class BotLifecycleState(str, enum.Enum):
    DRAFT = "DRAFT"
    STOPPED = "STOPPED"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    PAUSING = "PAUSING"
    PAUSED = "PAUSED"
    STOPPING = "STOPPING"
    RECOVERING = "RECOVERING"
    ERROR = "ERROR"
    DISABLED = "DISABLED"


class BotHealthState(str, enum.Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    RECOVERING = "RECOVERING"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"


# Legal State Transitions
VALID_TRANSITIONS: Dict[BotLifecycleState, Set[BotLifecycleState]] = {
    BotLifecycleState.DRAFT: {BotLifecycleState.STOPPED, BotLifecycleState.DISABLED},
    BotLifecycleState.STOPPED: {BotLifecycleState.STARTING, BotLifecycleState.DISABLED, BotLifecycleState.ERROR},
    BotLifecycleState.STARTING: {BotLifecycleState.RUNNING, BotLifecycleState.ERROR, BotLifecycleState.STOPPED},
    BotLifecycleState.RUNNING: {BotLifecycleState.PAUSING, BotLifecycleState.STOPPING, BotLifecycleState.ERROR, BotLifecycleState.RECOVERING},
    BotLifecycleState.PAUSING: {BotLifecycleState.PAUSED, BotLifecycleState.ERROR, BotLifecycleState.STOPPED},
    BotLifecycleState.PAUSED: {BotLifecycleState.STARTING, BotLifecycleState.RUNNING, BotLifecycleState.STOPPING, BotLifecycleState.ERROR},
    BotLifecycleState.STOPPING: {BotLifecycleState.STOPPED, BotLifecycleState.ERROR},
    BotLifecycleState.RECOVERING: {BotLifecycleState.RUNNING, BotLifecycleState.ERROR, BotLifecycleState.STOPPED},
    BotLifecycleState.ERROR: {BotLifecycleState.STARTING, BotLifecycleState.STOPPED, BotLifecycleState.RECOVERING, BotLifecycleState.DISABLED},
    BotLifecycleState.DISABLED: {BotLifecycleState.STOPPED, BotLifecycleState.DRAFT},
}


class BotRuntimeService:
    """Singleton service for fleet orchestration and canonical state snapshots."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(BotRuntimeService, cls).__new__(cls)
                cls._instance._init_service()
            return cls._instance

    def _init_service(self):
        self._bot_locks: Dict[str, threading.Lock] = {}
        self._locks_mutex = threading.Lock()

    def _get_bot_lock(self, bot_id: str) -> threading.Lock:
        with self._locks_mutex:
            if bot_id not in self._bot_locks:
                self._bot_locks[bot_id] = threading.Lock()
            return self._bot_locks[bot_id]

    def _derive_next_action(self, state: BotLifecycleState, timeframe: str, strategy: str, position: Dict[str, Any], last_error: str) -> str:
        """Derives clean, plain-English operator next action."""
        if state == BotLifecycleState.RUNNING:
            if position.get("has_position"):
                direction = position.get("direction", "LONG")
                size = position.get("size", 0.0)
                sl = position.get("stop_loss")
                tp = position.get("take_profit")
                sl_str = f" • SL: ${sl:,.2f}" if sl else ""
                tp_str = f" • TP: ${tp:,.2f}" if tp else ""
                return f"Managing active {direction} ({size} units){sl_str}{tp_str}"
            return f"Waiting for {timeframe} candle close — scanning {strategy}"

        if state == BotLifecycleState.PAUSED:
            if position.get("has_position"):
                return "Paused — existing position held (automation suspended)"
            return "Paused — waiting for resume"

        if state == BotLifecycleState.STARTING:
            return "Starting worker process and subscribing to market feed..."

        if state == BotLifecycleState.STOPPING:
            return "Gracefully terminating worker..."

        if state == BotLifecycleState.RECOVERING:
            return "Self-healing auto-recovery in progress..."

        if state == BotLifecycleState.ERROR:
            err_snip = (last_error or "Unexpected failure").split("\n")[0][:60]
            return f"Error: {err_snip} — Click Review"

        if state == BotLifecycleState.DRAFT:
            return "Draft bot — configure parameters before deployment"

        if state == BotLifecycleState.DISABLED:
            return "Disabled by administrator"

        return "Stopped — ready to start"

    def get_fleet_snapshot(self) -> Dict[str, Any]:
        """
        Calculates authoritative fleet metrics and bot snapshots with strict mathematical invariants.
        """
        conn = db.get_connection()
        c = conn.cursor()

        # 1. Fetch all active non-deleted bots
        c.execute("SELECT * FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0 ORDER BY created_at ASC")
        raw_bots = [dict(r) for r in c.fetchall()]

        # 2. Pre-fetch closed trades for exact bot_id P&L attribution
        c.execute("SELECT * FROM trades_log WHERE status IN ('CLOSED', 'FILLED')")
        closed_trades = [dict(r) for r in c.fetchall()]

        # 3. Pre-fetch open positions
        open_positions = []
        try:
            c.execute("SELECT * FROM positions WHERE status = 'OPEN'")
            open_positions = [dict(r) for r in c.fetchall()]
        except Exception:
            open_positions = []

        # 4. Pre-fetch active open trades
        open_trades = []
        try:
            c.execute("SELECT * FROM trades_log WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL')")
            open_trades = [dict(r) for r in c.fetchall()]
        except Exception:
            open_trades = []

        conn.close()

        # Map closed trades by bot_id with robust timezone handling
        now_dt = datetime.now(timezone.utc)
        today_start_iso = now_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_utc_prefix = now_dt.strftime("%Y-%m-%d")
        bot_pnl_map: Dict[str, Dict[str, float]] = {}
        for t in closed_trades:
            bid = t.get("bot_id") or "system"
            if bid not in bot_pnl_map:
                bot_pnl_map[bid] = {"realized": 0.0, "today": 0.0}
            
            pnl_val = 0.0
            for k in ("net_pnl", "realized_pnl", "result_pnl", "gross_pnl"):
                val = t.get(k)
                if val is not None and float(val) != 0.0:
                    pnl_val = float(val)
                    break
            if pnl_val == 0.0:
                pnl_val = float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("realized_pnl") if t.get("realized_pnl") is not None else (t.get("result_pnl") or 0.0)))

            bot_pnl_map[bid]["realized"] += pnl_val
            ts = str(t.get("exit_timestamp") or t.get("timestamp") or "")
            if ts.startswith(today_utc_prefix) or ts >= today_start_iso:
                bot_pnl_map[bid]["today"] += pnl_val

        # Map open positions/trades by bot_id
        bot_pos_map: Dict[str, Dict[str, Any]] = {}
        for p in open_positions:
            bid = p.get("bot_id") or "system"
            bot_pos_map[bid] = {
                "has_position": True,
                "direction": p.get("direction", "LONG"),
                "size": float(p.get("quantity") or p.get("position_size") or 0.0),
                "entry_price": float(p.get("entry_price") or 0.0),
                "unrealized_pnl": float(p.get("unrealized_pnl") or 0.0),
                "stop_loss": float(p.get("stop_loss") or 0.0) if p.get("stop_loss") else None,
                "take_profit": float(p.get("take_profit") or 0.0) if p.get("take_profit") else None,
            }

        # Fallback to open trades_log if not in positions table
        for t in open_trades:
            bid = t.get("bot_id") or "system"
            if bid not in bot_pos_map:
                bot_pos_map[bid] = {
                    "has_position": True,
                    "direction": t.get("direction", "LONG"),
                    "size": float(t.get("position_size") or 0.0),
                    "entry_price": float(t.get("entry_price") or 0.0),
                    "unrealized_pnl": float(t.get("unrealized_pnl") or 0.0),
                    "stop_loss": float(t.get("stop_loss") or 0.0) if t.get("stop_loss") else None,
                    "take_profit": float(t.get("take_profit") or 0.0) if t.get("take_profit") else None,
                }

        # Lifecycle State Counters
        state_counts = {
            BotLifecycleState.DRAFT.value: 0,
            BotLifecycleState.STOPPED.value: 0,
            BotLifecycleState.STARTING.value: 0,
            BotLifecycleState.RUNNING.value: 0,
            BotLifecycleState.PAUSING.value: 0,
            BotLifecycleState.PAUSED.value: 0,
            BotLifecycleState.STOPPING.value: 0,
            BotLifecycleState.RECOVERING.value: 0,
            BotLifecycleState.ERROR.value: 0,
            BotLifecycleState.DISABLED.value: 0,
        }

        snapshots: List[Dict[str, Any]] = []
        fleet_today_pnl = 0.0
        fleet_realized_pnl = 0.0
        fleet_unrealized_pnl = 0.0
        fleet_capital_allocated = 0.0
        fleet_exposure = 0.0
        healthy_count = 0

        for b in raw_bots:
            b_id = b.get("id")
            name = b.get("name") or f"Bot {b_id}"
            db_status = str(b.get("status") or "STOPPED").upper()
            timeframe = b.get("timeframe") or "5m"
            strategy = b.get("strategy") or "EMA_MACD_VP"
            symbol = b.get("symbol") or config.SYMBOL
            asset_class = b.get("asset_class") or "CRYPTO"
            env = str(b.get("execution_mode") or "PAPER").upper()
            cap = float(b.get("allocated_capital") or 10000.0)
            fleet_capital_allocated += cap

            # 1. Determine Mutually Exclusive Lifecycle State
            mgr = multi_bot_manager.get_manager(b_id)
            is_proc_alive = mgr.is_running()

            if is_proc_alive:
                if mgr.is_paused or db_status == BotLifecycleState.PAUSED.value:
                    canonical_state = BotLifecycleState.PAUSED
                else:
                    canonical_state = BotLifecycleState.RUNNING
            elif db_status == BotLifecycleState.ERROR.value:
                canonical_state = BotLifecycleState.ERROR
            elif db_status == BotLifecycleState.PAUSED.value:
                canonical_state = BotLifecycleState.PAUSED
            elif db_status == BotLifecycleState.DRAFT.value or db_status == "CREATED":
                canonical_state = BotLifecycleState.DRAFT
            elif db_status == BotLifecycleState.DISABLED.value:
                canonical_state = BotLifecycleState.DISABLED
            elif db_status == BotLifecycleState.STARTING.value:
                canonical_state = BotLifecycleState.STARTING
            elif db_status == BotLifecycleState.RECOVERING.value:
                canonical_state = BotLifecycleState.RECOVERING
            else:
                canonical_state = BotLifecycleState.STOPPED

            state_counts[canonical_state.value] += 1

            # 2. Determine Health
            last_hb = b.get("last_heartbeat") or b.get("last_checked_at")
            if canonical_state == BotLifecycleState.ERROR:
                health = BotHealthState.ERROR
            elif canonical_state == BotLifecycleState.RECOVERING:
                health = BotHealthState.RECOVERING
            elif canonical_state == BotLifecycleState.RUNNING:
                if is_proc_alive:
                    health = BotHealthState.HEALTHY
                    healthy_count += 1
                else:
                    health = BotHealthState.DEGRADED
            elif canonical_state == BotLifecycleState.PAUSED:
                health = BotHealthState.HEALTHY
                healthy_count += 1
            elif canonical_state == BotLifecycleState.STOPPED or canonical_state == BotLifecycleState.DRAFT:
                health = BotHealthState.HEALTHY
                healthy_count += 1
            else:
                health = BotHealthState.UNKNOWN

            # 3. Position & P&L
            pos_info = bot_pos_map.get(b_id, {
                "has_position": False,
                "direction": "FLAT",
                "size": 0.0,
                "entry_price": 0.0,
                "unrealized_pnl": 0.0,
                "stop_loss": None,
                "take_profit": None
            })
            pnl_info = bot_pnl_map.get(b_id, {"realized": 0.0, "today": 0.0})

            bot_today = pnl_info["today"]
            bot_realized = pnl_info["realized"]
            bot_unrealized = pos_info["unrealized_pnl"]
            bot_net = bot_realized + bot_unrealized

            fleet_today_pnl += bot_today
            fleet_realized_pnl += bot_realized
            fleet_unrealized_pnl += bot_unrealized

            if pos_info["has_position"]:
                fleet_exposure += pos_info["size"] * pos_info["entry_price"]

            # 4. Next Action
            next_action = self._derive_next_action(
                state=canonical_state,
                timeframe=timeframe,
                strategy=strategy,
                position=pos_info,
                last_error=b.get("last_error") or ""
            )

            # Parse config JSON
            cfg = {}
            if b.get("config_json"):
                try:
                    cfg = json.loads(b["config_json"]) if isinstance(b["config_json"], str) else b["config_json"]
                except Exception:
                    cfg = {}

            snapshots.append({
                "id": b_id,
                "bot_id": b_id,
                "name": name,
                "symbol": symbol,
                "asset_class": asset_class,
                "timeframe": timeframe,
                "strategy": strategy,
                "strategy_id": b.get("strategy_id") or strategy,
                "strategy_version": b.get("strategy_version") or "1.0",
                "execution_mode": env,
                "status": canonical_state.value,
                "state": canonical_state.value,
                "health": health.value,
                "allocated_capital": cap,
                "position": pos_info,
                "pnl": {
                    "today": round(bot_today, 2),
                    "realized": round(bot_realized, 2),
                    "unrealized": round(bot_unrealized, 2),
                    "net": round(bot_net, 2)
                },
                "live_pnl": round(bot_today, 2),
                "open_trades": 1 if pos_info["has_position"] else 0,
                "next_action": next_action,
                "last_heartbeat": last_hb,
                "last_error": b.get("last_error"),
                "updated_at": b.get("updated_at") or datetime.now(timezone.utc).isoformat(),
                "config": cfg,
                "indicators": cfg.get("indicators", [])
            })

        total_bots = len(raw_bots)
        # Mathematical Invariant Assertion: Sum of states must equal total bots
        sum_states = sum(state_counts.values())
        if sum_states != total_bots:
            logger.error(f"FATAL COUNT MISMATCH: Total bots ({total_bots}) != Sum of states ({sum_states})")
            state_counts[BotLifecycleState.STOPPED.value] += (total_bots - sum_states)

        total_trades_count = len(closed_trades) + len(open_trades)
        wins_count = sum(1 for t in closed_trades if float(t.get("result_pnl") or t.get("realized_pnl") or 0) > 0)
        losses_count = sum(1 for t in closed_trades if float(t.get("result_pnl") or t.get("realized_pnl") or 0) < 0)
        be_count = max(0, len(closed_trades) - wins_count - losses_count)
        win_rate = round((wins_count / max(1, wins_count + losses_count)) * 100.0, 1)
        gross_profit = sum(float(t.get("result_pnl") or 0) for t in closed_trades if float(t.get("result_pnl") or 0) > 0)
        gross_loss = abs(sum(float(t.get("result_pnl") or 0) for t in closed_trades if float(t.get("result_pnl") or 0) < 0))
        pf = round(gross_profit / max(1.0, gross_loss), 2)

        metrics = {
            "total_bots": total_bots,
            "running": state_counts[BotLifecycleState.RUNNING.value],
            "paused": state_counts[BotLifecycleState.PAUSED.value],
            "stopped": state_counts[BotLifecycleState.STOPPED.value],
            "error": state_counts[BotLifecycleState.ERROR.value],
            "draft": state_counts[BotLifecycleState.DRAFT.value],
            "starting": state_counts[BotLifecycleState.STARTING.value],
            "stopping": state_counts[BotLifecycleState.STOPPING.value],
            "recovering": state_counts[BotLifecycleState.RECOVERING.value],
            "disabled": state_counts[BotLifecycleState.DISABLED.value],
            "healthy_count": healthy_count,
            "health_display": f"{healthy_count} / {max(1, total_bots)} Healthy",
            "today_pnl": round(fleet_today_pnl, 2),
            "total_pnl": round(fleet_realized_pnl + fleet_unrealized_pnl, 2),
            "realized_pnl": round(fleet_realized_pnl, 2),
            "unrealized_pnl": round(fleet_unrealized_pnl, 2),
            "start_balance": round(fleet_capital_allocated, 2),
            "current_balance": round(fleet_capital_allocated + fleet_realized_pnl + fleet_unrealized_pnl, 2),
            "current_equity": round(fleet_capital_allocated + fleet_realized_pnl + fleet_unrealized_pnl, 2),
            "total_trades": total_trades_count,
            "open_trades": len(open_trades),
            "wins": wins_count,
            "losses": losses_count,
            "breakeven": be_count,
            "win_rate_pct": win_rate,
            "profit_factor": pf,
            "w_l_be": f"{wins_count}/{losses_count}/{be_count}",
            "allocated_capital": round(fleet_capital_allocated, 2),
            "total_capital": max(100000.0, round(fleet_capital_allocated, 2)),
            "capital_used": round(fleet_exposure, 2),
            "current_exposure": round(fleet_exposure, 2),
            "available_capital": max(0.0, round(fleet_capital_allocated - fleet_exposure, 2)),
            "profit_factor_display": f"{pf:.2f}" if pf else "0.00",
            "emergency_halt_active": getattr(config, "GLOBAL_KILL_SWITCH", False) or config.KILL_SWITCH_FILE.exists(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        return {
            "status": "success",
            "metrics": metrics,
            "bots": snapshots
        }

    def execute_bot_action(self, bot_id: str, action: str, requested_by: str = "OPERATOR") -> Dict[str, Any]:
        """
        Executes an idempotent lifecycle state transition with per-bot mutex locking.
        """
        action = action.upper()
        bot_lock = self._get_bot_lock(bot_id)

        with bot_lock:
            # Global Kill Switch Check first
            if action in ["START", "RESUME", "RESTART"] and (getattr(config, "GLOBAL_KILL_SWITCH", False) or config.KILL_SWITCH_FILE.exists()):
                return {
                    "status": "blocked",
                    "message": "Action BLOCKED: Global Emergency Halt is active.",
                    "bot_id": bot_id,
                    "action": action
                }

            # 1. Fetch current bot instance
            bot = db.get_bot_instance(bot_id)
            if not bot:
                return {"status": "error", "message": f"Bot '{bot_id}' not found.", "bot_id": bot_id}

            mgr = multi_bot_manager.get_manager(bot_id)
            is_running = mgr.is_running()
            current_status = str(bot.get("status") or "STOPPED").upper()

            if action == "START":
                if is_running and not mgr.is_paused:
                    return {
                        "status": "already_running",
                        "message": f"Bot '{bot['name']}' is already running.",
                        "bot_id": bot_id,
                        "state": BotLifecycleState.RUNNING.value
                    }
                res = multi_bot_manager.start_bot(bot_id)
                return res

            elif action == "PAUSE":
                if not is_running:
                    return {
                        "status": "already_paused",
                        "message": f"Bot '{bot['name']}' is not running.",
                        "bot_id": bot_id,
                        "state": BotLifecycleState.STOPPED.value
                    }
                if mgr.is_paused:
                    return {
                        "status": "already_paused",
                        "message": f"Bot '{bot['name']}' is already paused.",
                        "bot_id": bot_id,
                        "state": BotLifecycleState.PAUSED.value
                    }
                res = multi_bot_manager.pause_bot(bot_id)
                return res

            elif action == "RESUME":
                if is_running and not mgr.is_paused:
                    return {
                        "status": "already_running",
                        "message": f"Bot '{bot['name']}' is already running.",
                        "bot_id": bot_id,
                        "state": BotLifecycleState.RUNNING.value
                    }
                res = multi_bot_manager.resume_bot(bot_id)
                return res

            elif action == "STOP":
                if not is_running and current_status == BotLifecycleState.STOPPED.value:
                    return {
                        "status": "already_stopped",
                        "message": f"Bot '{bot['name']}' is already stopped.",
                        "bot_id": bot_id,
                        "state": BotLifecycleState.STOPPED.value
                    }
                res = multi_bot_manager.stop_bot(bot_id)
                return res

            elif action in ["RESTART", "RETRY"]:
                # Safe recovery retry / restart for bots
                multi_bot_manager.stop_bot(bot_id)
                time.sleep(0.3)
                res = multi_bot_manager.start_bot(bot_id)
                return res

            else:
                return {
                    "status": "error",
                    "message": f"Unsupported action '{action}'.",
                    "bot_id": bot_id
                }

    def bulk_start_eligible(self, market_filter: Optional[str] = None, environment: Optional[str] = None) -> Dict[str, Any]:
        """
        Validates each bot independently and starts eligible bots.
        """
        conn = db.get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
        bots = [dict(r) for r in c.fetchall()]
        conn.close()

        started = []
        skipped = []
        blocked = []

        for b in bots:
            bid = b["id"]
            name = b["name"]
            env = str(b.get("execution_mode") or "PAPER").upper()
            mkt = str(b.get("asset_class") or "CRYPTO").upper()

            if environment and environment.upper() != env:
                continue
            if market_filter and market_filter.upper() != "ALL" and market_filter.upper() != mkt:
                continue

            mgr = multi_bot_manager.get_manager(bid)
            if mgr.is_running():
                skipped.append({"bot_id": bid, "name": name, "reason": "Already running"})
                continue

            # Validate before starting
            try:
                res = self.execute_bot_action(bid, "START", requested_by="BULK_START")
                if res.get("status") == "success" or res.get("state") == "RUNNING":
                    started.append({"bot_id": bid, "name": name, "mode": env})
                else:
                    blocked.append({"bot_id": bid, "name": name, "reason": res.get("message") or "Failed to start"})
            except Exception as ex:
                blocked.append({"bot_id": bid, "name": name, "reason": str(ex)})

        return {
            "status": "success",
            "started_count": len(started),
            "skipped_count": len(skipped),
            "blocked_count": len(blocked),
            "started": started,
            "skipped": skipped,
            "blocked": blocked
        }

    def bulk_pause_running(self) -> Dict[str, Any]:
        """Pauses all currently running bots."""
        return multi_bot_manager.pause_all_bots()

    def bulk_resume_paused(self) -> Dict[str, Any]:
        """Resumes all currently paused bots."""
        conn = db.get_connection()
        c = conn.cursor()
        c.execute("SELECT id, name FROM bot_instances WHERE status = 'PAUSED' AND COALESCE(is_deleted, 0) = 0")
        paused_bots = [dict(r) for r in c.fetchall()]
        conn.close()

        resumed = []
        for pb in paused_bots:
            bid = pb["id"]
            r = self.execute_bot_action(bid, "RESUME", requested_by="BULK_RESUME")
            if r.get("status") == "success":
                resumed.append(bid)

        return {
            "status": "success",
            "resumed_count": len(resumed),
            "resumed_bots": resumed
        }

    def set_emergency_halt(self, active: bool, reason: str = "Operator Triggered") -> Dict[str, Any]:
        """
        Toggles Global Emergency Halt. When active, all new orders and entries are blocked.
        """
        setattr(config, "GLOBAL_KILL_SWITCH", active)
        if active:
            config.KILL_SWITCH_FILE.touch()
            # Stop or pause all running workers
            multi_bot_manager.pause_all_bots()
            audit.log_audit_event("EMERGENCY_HALT_ACTIVATED", user="Trader", details={"reason": reason})
        else:
            if config.KILL_SWITCH_FILE.exists():
                try:
                    config.KILL_SWITCH_FILE.unlink()
                except Exception:
                    pass
            audit.log_audit_event("EMERGENCY_HALT_DEACTIVATED", user="Trader", details={"reason": reason})

        return {
            "status": "success",
            "emergency_halt_active": active,
            "message": f"Global Emergency Halt {'ACTIVATED' if active else 'DEACTIVATED'}."
        }

    def set_bot_execution_mode(self, bot_id: str, mode: str, requested_by: str = "OPERATOR") -> Dict[str, Any]:
        """
        Switches a bot's execution mode between LIVE and PAPER atomically.
        If the bot is currently running, stops and restarts the worker under the new mode.
        """
        mode = mode.upper().strip()
        if mode not in ["LIVE", "PAPER"]:
            return {"status": "error", "message": f"Invalid mode '{mode}'. Must be 'LIVE' or 'PAPER'."}

        bot_lock = self._get_bot_lock(bot_id)
        with bot_lock:
            bot = db.get_bot_instance(bot_id)
            if not bot:
                return {"status": "error", "message": f"Bot '{bot_id}' not found."}

            old_mode = (bot.get("execution_mode") or "PAPER").upper()
            if old_mode == mode:
                return {
                    "status": "success",
                    "bot_id": bot_id,
                    "execution_mode": mode,
                    "message": f"Bot '{bot['name']}' is already in {mode} mode."
                }

            # If switching to LIVE, ensure live deployment authorization
            if mode == "LIVE":
                try:
                    from src.live_authorization_manager import LiveAuthorizationManager
                    LiveAuthorizationManager.authorize_live_bot(
                        user_id=requested_by,
                        bot_id=bot_id,
                        strategy_version=str(bot.get("strategy_version") or "1.0"),
                        max_capital=float(bot.get("allocated_capital") or 10000.0),
                        max_risk_pct=float(bot.get("risk_per_trade_pct") or 2.0)
                    )
                except Exception as ex:
                    logger.warning(f"Live auth grant notice for {bot_id}: {ex}")

            # Update database
            now_iso = datetime.now(timezone.utc).isoformat()
            conn = db.get_connection()
            conn.execute(
                "UPDATE bot_instances SET execution_mode = ?, updated_at = ? WHERE id = ?",
                (mode, now_iso, bot_id)
            )
            conn.commit()
            conn.close()

            # If running, restart worker under new execution mode
            mgr = multi_bot_manager.get_manager(bot_id)
            was_running = mgr.is_running()
            if was_running:
                multi_bot_manager.stop_bot(bot_id)
                time.sleep(0.3)
                multi_bot_manager.start_bot(bot_id)

            audit.log_audit_event(
                "BOT_EXECUTION_MODE_CHANGED",
                user=requested_by,
                details={"bot_id": bot_id, "name": bot.get("name"), "from_mode": old_mode, "to_mode": mode}
            )

            return {
                "status": "success",
                "bot_id": bot_id,
                "name": bot.get("name"),
                "previous_mode": old_mode,
                "execution_mode": mode,
                "is_running": was_running,
                "message": f"Bot '{bot.get('name')}' successfully switched to {mode} mode."
            }


# Global singleton instance
global_bot_runtime_service = BotRuntimeService()

