import sys
import os
import subprocess
import time
import threading
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from src import config
from src.audit import log_audit_event, log_notification

logger = logging.getLogger("ProcessManager")

def _is_protected_pid(pid: int) -> bool:
    """Returns True if the PID belongs to the supervisor, backend, gateway, frontend, self or parent."""
    if not pid or pid <= 0 or pid == os.getpid():
        return True
    try:
        if hasattr(os, "getppid") and pid == os.getppid():
            return True
    except Exception:
        pass

    # Check runtime state file
    state_file = config.BASE_DIR / "quantos_runtime_state.json"
    if state_file.exists():
        try:
            import json
            data = json.loads(state_file.read_text(encoding="utf-8"))
            if pid == data.get("supervisor_pid"):
                return True
            if pid in data.get("protected_pids", []):
                return True
            for svc_pid in data.get("services", {}).values():
                if pid == svc_pid:
                    return True
        except Exception:
            pass
    return False


def _is_live_runner_process(pid: int, bot_id: Optional[str] = None) -> bool:
    """Verifies that the target PID is actually a python live_runner bot process."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            wmic_out = subprocess.check_output(
                ["wmic", "process", "where", f"processid={pid}", "get", "commandline,name", "/format:csv"],
                text=True,
                stderr=subprocess.DEVNULL
            ).lower()
            if "live_runner.py" not in wmic_out:
                return False
            if bot_id and bot_id.lower() not in wmic_out:
                return False
            return True
        except Exception:
            return False
    return True


def kill_process_by_pid(pid: int, bot_id: Optional[str] = None):
    """Safely terminate ONLY verified live_runner bot worker processes by PID."""
    if _is_protected_pid(pid):
        logger.warning(f"[SAFETY] Refusing to kill protected system process (PID: {pid}).")
        return

    if not _is_live_runner_process(pid, bot_id):
        logger.warning(f"[SAFETY] PID {pid} is not a verified live_runner bot process. Skipping kill.")
        return

    try:
        if os.name == 'nt':
            import ctypes
            PROCESS_TERMINATE = 0x0001
            handle = ctypes.windll.kernel32.OpenProcess(PROCESS_TERMINATE, False, pid)
            if handle:
                ctypes.windll.kernel32.TerminateProcess(handle, 1)
                ctypes.windll.kernel32.CloseHandle(handle)
        else:
            import signal
            os.kill(pid, signal.SIGKILL)
        logger.info(f"Terminated bot worker process (PID: {pid}).")
    except Exception as e:
        logger.warning(f"Could not kill bot process {pid}: {e}")


def get_bot_pid_file(bot_id: str) -> Path:
    data_dir = config.BASE_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / f"bot_{bot_id}.pid"


def cleanup_orphan_bot_process(bot_id: str):
    pid_file = get_bot_pid_file(bot_id)
    if pid_file.exists():
        try:
            content = pid_file.read_text().strip()
            if content.isdigit():
                pid = int(content)
                kill_process_by_pid(pid, bot_id=bot_id)
        except Exception as e:
            logger.warning(f"Error cleaning up orphan process for bot {bot_id}: {e}")
        finally:
            try:
                pid_file.unlink(missing_ok=True)
            except Exception:
                pass

# ---------------------------------------------------------------------------
# AUTHORITATIVE BOT LIFECYCLE STATES
# ---------------------------------------------------------------------------
BOT_STATE_CREATED = "CREATED"
BOT_STATE_STARTING = "STARTING"
BOT_STATE_RUNNING = "RUNNING"
BOT_STATE_PAUSING = "PAUSING"
BOT_STATE_PAUSED = "PAUSED"
BOT_STATE_RESUMING = "RESUMING"
BOT_STATE_STOPPING = "STOPPING"
BOT_STATE_STOPPED = "STOPPED"
BOT_STATE_ERROR = "ERROR"
BOT_STATE_RECOVERING = "RECOVERING"
BOT_STATE_HALTED = "TRADING HALTED"

VALID_BOT_STATES = {
    BOT_STATE_CREATED,
    BOT_STATE_STARTING,
    BOT_STATE_RUNNING,
    BOT_STATE_PAUSING,
    BOT_STATE_PAUSED,
    BOT_STATE_RESUMING,
    BOT_STATE_STOPPING,
    BOT_STATE_STOPPED,
    BOT_STATE_ERROR,
    BOT_STATE_RECOVERING,
    BOT_STATE_HALTED
}

class BotProcessManager:
    """Manages the background execution of live_runner.py for a specific bot instance."""

    def __init__(self, bot_id: str = "bot-1"):
        self.bot_id = bot_id
        self.process: Optional[subprocess.Popen] = None
        self.log_file_handle = None
        self.start_time: Optional[datetime] = None
        self.is_paused: bool = False
        self.status_state: str = BOT_STATE_STOPPED
        self.last_error: str = ""

    def start_bot(self) -> Dict[str, Any]:
        """Start the live runner process cleanly with state-machine & idempotency validation."""
        # Fast live check
        if self.is_running():
            self.status_state = BOT_STATE_RUNNING
            return {
                "status": "already_running",
                "message": f"Bot '{self.bot_id}' is already running.",
                "pid": self.process.pid if self.process else None
            }

    def validate_pre_flight_start(self) -> Dict[str, Any]:
        """Validates all pre-start conditions before spawning bot process."""
        import src.db as db
        if config.KILL_SWITCH_FILE.exists():
            return {"valid": False, "reason": "Emergency Kill Switch is ACTIVE. Deactivate kill switch first."}

        bot_info = db.get_bot_instance(self.bot_id)
        if not bot_info:
            return {"valid": False, "reason": f"Bot definition '{self.bot_id}' not found in database."}

        mode = (bot_info.get("execution_mode") or "PAPER").upper()
        if mode == "LIVE" and not getattr(config, "LIVE_TRADING_ENABLED", False):
            return {"valid": False, "reason": "LIVE trading is disabled on server. Set LIVE_TRADING_ENABLED=True on server to permit real capital execution."}

        # Canonical Instrument Resolution Gate
        symbol = bot_info.get("symbol", "")
        asset_class = (bot_info.get("asset_class") or "").upper()
        from src.instrument_resolver import global_instrument_resolver

        # Direct Category Label Check (e.g. BTC-OPTIONS cannot be started directly)
        clean_sym = symbol.strip().upper()
        if clean_sym in global_instrument_resolver.CATEGORY_LABELS:
            return {
                "valid": False,
                "reason": f"Cannot start bot: Symbol '{clean_sym}' is a generic category, not an executable contract. Please select a specific dated contract from the Options Contract Selector (Code: INSTRUMENT_CATEGORY_NOT_EXECUTABLE)."
            }

        res = global_instrument_resolver.resolve(symbol, asset_class=asset_class)
        if not res.is_valid:
            return {
                "valid": False,
                "reason": f"Cannot start bot: Symbol '{symbol}' failed canonical resolution: {res.reason} (Code: {res.error_code}). Suggested: {res.suggested_action}"
            }

        existing_lease = db.get_bot_worker_lease(self.bot_id)
        if existing_lease:
            exp_str = existing_lease.get("lease_expires_at", "")
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    if exp_dt > datetime.now(timezone.utc):
                        pid = existing_lease.get("process_pid")
                        if pid and pid != (self.process.pid if self.process else None):
                            try:
                                import os
                                os.kill(int(pid), 0)
                                return {"valid": False, "reason": f"Active worker lease held by running process PID {pid}."}
                            except Exception:
                                pass
                except Exception:
                    pass

        return {"valid": True, "bot_info": bot_info}

    def start_bot(self) -> Dict[str, Any]:
        """Start the live runner process cleanly with state-machine & idempotency validation."""
        import src.db as db

        # Fast live check
        if self.is_running():
            self.status_state = BOT_STATE_RUNNING
            return {
                "status": "already_running",
                "message": f"Bot '{self.bot_id}' is already running.",
                "pid": self.process.pid if self.process else None
            }

        # 1. Pre-flight verification gate
        pre = self.validate_pre_flight_start()
        if not pre.get("valid"):
            return {
                "status": "error",
                "message": f"Pre-start validation rejected: {pre.get('reason')}"
            }

        # Clean up any existing dead process file for this bot instance first
        cleanup_orphan_bot_process(self.bot_id)

        self.status_state = BOT_STATE_STARTING

        try:
            python_executable = sys.executable
            runner_path = config.BASE_DIR / "src" / "live_runner.py"
            
            log_dir = config.BASE_DIR / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            bot_log_file = log_dir / f"bot_{self.bot_id}.log"
            self.log_file_handle = open(bot_log_file, "ab", buffering=0)

            creation_flags = 0
            if sys.platform == "win32":
                creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

            # Spawn process with --bot_id and unbuffered output redirected to log file in an isolated process group
            self.process = subprocess.Popen(
                [python_executable, "-u", str(runner_path), "--bot_id", self.bot_id],
                cwd=str(config.BASE_DIR),
                stdout=self.log_file_handle,
                stderr=self.log_file_handle,
                creationflags=creation_flags
            )

            now_utc = datetime.now(timezone.utc)
            self.start_time = now_utc
            self.is_paused = False
            self.status_state = BOT_STATE_RUNNING
            self.last_error = ""

            # Acquire exclusive worker lease
            lease_token = db.acquire_bot_worker_lease(
                bot_id=self.bot_id,
                worker_id=f"worker-{self.bot_id}-{self.process.pid}",
                process_pid=self.process.pid,
                duration_sec=60
            )

            # Save PID to file for single instance enforcement
            try:
                get_bot_pid_file(self.bot_id).write_text(str(self.process.pid))
            except Exception as pe:
                logger.warning(f"Failed to write PID file for bot {self.bot_id}: {pe}")

            # Persist RUNNING state to DB
            try:
                from src.db import get_connection
                conn = get_connection()
                conn.execute(
                    "UPDATE bot_instances SET status = 'RUNNING', desired_state = 'RUNNING', started_at = ?, stopped_at = NULL, process_id = ?, lease_token = ? WHERE id = ?",
                    (now_utc.isoformat(), str(self.process.pid), lease_token or '', self.bot_id)
                )
                conn.commit()
                conn.close()
            except Exception as dbe:
                logger.warning(f"Could not update bot_instances status for {self.bot_id}: {dbe}")

            log_audit_event(action="BOT_START", user="Trader", details={"bot_id": self.bot_id, "pid": self.process.pid})
            log_notification("INFO", "Bot Control", f"Bot {self.bot_id} started (PID {self.process.pid}).", bot_id=self.bot_id)
            
            try:
                from src.telegram_service import global_telegram_service
                from src.db import get_bot_instance
                bot_info = get_bot_instance(self.bot_id) or {}
                global_telegram_service.send_bot_alert(
                    bot_name=bot_info.get("name", f"Bot {self.bot_id}"),
                    status_event="BOT_STARTED",
                    symbol=bot_info.get("symbol", config.SYMBOL),
                    strategy=bot_info.get("strategy", "EMA_MACD_VP"),
                    timeframe=bot_info.get("timeframe", "15m"),
                    mode=bot_info.get("execution_mode", config.TRADING_MODE),
                    bot_id=self.bot_id
                )
            except Exception as tg_e:
                logger.debug("Failed sending BOT_STARTED alert: %s", tg_e)

            return {
                "status": "success",
                "message": f"Bot {self.bot_id} started successfully (PID: {self.process.pid}).",
                "pid": self.process.pid,
                "state": BOT_STATE_RUNNING
            }
        except Exception as e:
            self.status_state = BOT_STATE_ERROR
            self.last_error = str(e)
            logger.error(f"Failed to start bot process {self.bot_id}: {e}")
            log_notification("ERROR", "Bot Control", f"Failed to start bot {self.bot_id}: {e}", bot_id=self.bot_id)
            try:
                from src.telegram_service import global_telegram_service
                global_telegram_service.send_bot_alert(
                    bot_name=f"Bot {self.bot_id}",
                    status_event="BOT_ERROR",
                    reason=str(e),
                    bot_id=self.bot_id
                )
            except Exception:
                pass
            return {"status": "error", "message": str(e), "state": BOT_STATE_ERROR}

    def stop_bot(self) -> Dict[str, Any]:
        """Stop the live runner process cleanly with strict idempotency."""
        if not self.is_running() and self.status_state == BOT_STATE_STOPPED:
            return {"status": "already_stopped", "message": f"Bot '{self.bot_id}' is already stopped.", "state": BOT_STATE_STOPPED}
        self.status_state = BOT_STATE_STOPPING
        try:
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                self.process = None

            if self.log_file_handle:
                try:
                    self.log_file_handle.close()
                except Exception:
                    pass
                self.log_file_handle = None

            cleanup_orphan_bot_process(self.bot_id)

            self.status_state = BOT_STATE_STOPPED
            self.is_paused = False
            self.start_time = None

            # Release worker lease and persist STOPPED state to DB
            try:
                import src.db as db
                db.release_bot_worker_lease(self.bot_id)
                now_iso = datetime.now(timezone.utc).isoformat()
                from src.db import get_connection
                conn = get_connection()
                conn.execute(
                    "UPDATE bot_instances SET status = 'STOPPED', desired_state = 'STOPPED', stopped_at = ?, process_id = '', lease_token = '' WHERE id = ?",
                    (now_iso, self.bot_id)
                )
                conn.commit()
                conn.close()
            except Exception as e:
                logger.warning(f"Error updating DB on stop_bot for {self.bot_id}: {e}")

            log_audit_event(action="BOT_STOP", user="Trader", details={"bot_id": self.bot_id})
            log_notification("INFO", "Bot Control", f"Bot {self.bot_id} stopped.", bot_id=self.bot_id)

            try:
                from src.telegram_service import global_telegram_service
                from src.db import get_bot_instance
                bot_info = get_bot_instance(self.bot_id) or {}
                global_telegram_service.send_bot_alert(
                    bot_name=bot_info.get("name", f"Bot {self.bot_id}"),
                    status_event="BOT_STOPPED",
                    symbol=bot_info.get("symbol", config.SYMBOL),
                    strategy=bot_info.get("strategy", "EMA_MACD_VP"),
                    timeframe=bot_info.get("timeframe", "15m"),
                    mode=bot_info.get("execution_mode", config.TRADING_MODE),
                    bot_id=self.bot_id
                )
            except Exception as tg_e:
                logger.debug("Failed sending BOT_STOPPED alert: %s", tg_e)

            return {"status": "success", "message": f"Bot {self.bot_id} stopped successfully.", "state": BOT_STATE_STOPPED}
        except Exception as e:
            self.status_state = BOT_STATE_ERROR
            self.last_error = str(e)
            logger.error(f"Error stopping bot process {self.bot_id}: {e}")
            return {"status": "error", "message": str(e), "state": BOT_STATE_ERROR}

    def restart_bot(self) -> Dict[str, Any]:
        """Stop if running and start worker process cleanly."""
        self.stop_bot()
        time.sleep(0.1)
        res = self.start_bot()
        return {
            "status": "success",
            "message": f"Bot '{self.bot_id}' restarted successfully.",
            "pid": res.get("pid"),
            "state": BOT_STATE_RUNNING
        }

    def pause_bot(self) -> Dict[str, Any]:
        """Pause trading bot evaluation cycles."""
        if not self.is_running():
            return {"status": "error", "message": "Bot is not running and cannot be paused."}

        self.status_state = BOT_STATE_PAUSING
        self.is_paused = True
        self.status_state = BOT_STATE_PAUSED

        # Persist PAUSED state to DB
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            from src.db import get_connection
            conn = get_connection()
            conn.execute(
                "UPDATE bot_instances SET status = 'PAUSED', paused_at = ? WHERE id = ?",
                (now_iso, self.bot_id)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        log_audit_event(action="BOT_PAUSE", user="Trader", details={"bot_id": self.bot_id})
        log_notification("INFO", "Bot Control", f"Bot {self.bot_id} execution paused.", bot_id=self.bot_id)

        try:
            from src.telegram_service import global_telegram_service
            from src.db import get_bot_instance
            bot_info = get_bot_instance(self.bot_id) or {}
            global_telegram_service.send_bot_alert(
                bot_name=bot_info.get("name", f"Bot {self.bot_id}"),
                status_event="BOT_PAUSED",
                symbol=bot_info.get("symbol", config.SYMBOL),
                strategy=bot_info.get("strategy", "EMA_MACD_VP"),
                timeframe=bot_info.get("timeframe", "15m"),
                mode=bot_info.get("execution_mode", config.TRADING_MODE),
                bot_id=self.bot_id
            )
        except Exception as tg_e:
            logger.debug("Failed sending BOT_PAUSED alert: %s", tg_e)

        return {"status": "success", "message": f"Bot {self.bot_id} execution paused.", "state": BOT_STATE_PAUSED}

    def resume_bot(self) -> Dict[str, Any]:
        """Resume trading bot execution cycles."""
        if config.KILL_SWITCH_FILE.exists():
            return {"status": "error", "message": "Cannot resume: 🔴 TRADING HALTED via Emergency Kill Switch."}
        if self.status_state != BOT_STATE_PAUSED:
            return {"status": "error", "message": "Bot is not paused and cannot be resumed."}

        self.status_state = BOT_STATE_RESUMING
        self.is_paused = False
        self.status_state = BOT_STATE_RUNNING

        # Persist RUNNING state to DB
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            from src.db import get_connection
            conn = get_connection()
            conn.execute(
                "UPDATE bot_instances SET status = 'RUNNING', resumed_at = ? WHERE id = ?",
                (now_iso, self.bot_id)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        log_audit_event(action="BOT_RESUME", user="Trader", details={"bot_id": self.bot_id})
        log_notification("INFO", "Bot Control", f"Bot {self.bot_id} execution resumed.", bot_id=self.bot_id)

        try:
            from src.telegram_service import global_telegram_service
            from src.db import get_bot_instance
            bot_info = get_bot_instance(self.bot_id) or {}
            global_telegram_service.send_bot_alert(
                bot_name=bot_info.get("name", f"Bot {self.bot_id}"),
                status_event="BOT_STARTED",
                symbol=bot_info.get("symbol", config.SYMBOL),
                strategy=bot_info.get("strategy", "EMA_MACD_VP"),
                timeframe=bot_info.get("timeframe", "15m"),
                mode=bot_info.get("execution_mode", config.TRADING_MODE),
                reason="Bot resumed from pause",
                bot_id=self.bot_id
            )
        except Exception as tg_e:
            logger.debug("Failed sending BOT_STARTED (resumed) alert: %s", tg_e)

        return {"status": "success", "message": f"Bot {self.bot_id} execution resumed.", "state": BOT_STATE_RUNNING}


    def trigger_kill_switch(self) -> Dict[str, Any]:
        """Activate Kill Switch: cancel pending orders, close active positions, stop process, and lock execution."""
        try:
            config.KILL_SWITCH_FILE.touch(exist_ok=True)
            self.stop_bot()
            self.status_state = BOT_STATE_HALTED

            # Emergency position exit and pending order cancellation in DB
            from src.db import close_all_open_positions_and_cancel_orders
            halt_res = close_all_open_positions_and_cancel_orders("TRADING HALTED: Emergency Kill Switch Triggered")

            log_audit_event(action="KILL_SWITCH_ACTIVATED", user="Trader", details={"reason": "Manual Kill Switch Triggered", "closed_positions": halt_res.get("closed_positions", 0)})
            log_notification("ERROR", "Kill Switch", f"🔴 TRADING HALTED! Bot stopped, {halt_res.get('closed_positions', 0)} open position(s) closed & pending orders cancelled.")
            return {"status": "success", "message": f"🔴 TRADING HALTED. All trading stopped, {halt_res.get('closed_positions', 0)} open position(s) closed, pipeline locked."}
        except Exception as e:
            logger.error(f"Failed to activate kill switch: {e}")
            return {"status": "error", "message": str(e)}

    def deactivate_kill_switch(self) -> Dict[str, Any]:
        """Deactivate Kill Switch flag and unlock execution pipeline."""
        try:
            if config.KILL_SWITCH_FILE.exists():
                config.KILL_SWITCH_FILE.unlink()
            if self.status_state == BOT_STATE_HALTED:
                self.status_state = BOT_STATE_STOPPED
            try:
                from src.db import get_connection
                conn = get_connection()
                conn.execute("UPDATE bot_instances SET status = 'STOPPED' WHERE status = 'HALTED'")
                conn.commit()
                conn.close()
            except Exception:
                pass
            log_audit_event(action="KILL_SWITCH_DEACTIVATED", user="Trader")
            log_notification("INFO", "Kill Switch", "Kill switch deactivated. Trading system unlocked.")
            return {"status": "success", "message": "Kill switch deactivated. System unlocked."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def is_running(self) -> bool:
        """Lightweight check if process is active via handle or PID file without database writes."""
        alive = False
        if self.process is not None:
            poll = self.process.poll()
            if poll is None:
                alive = True
            else:
                self.process = None

        if not alive:
            pid_file = get_bot_pid_file(self.bot_id)
            if pid_file.exists():
                try:
                    pid = int(pid_file.read_text().strip())
                    if os.name == 'nt':
                        import ctypes
                        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
                        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
                        if handle:
                            alive = True
                            ctypes.windll.kernel32.CloseHandle(handle)
                    else:
                        os.kill(pid, 0)
                        alive = True
                except Exception:
                    alive = False

                if not alive:
                    try:
                        pid_file.unlink(missing_ok=True)
                    except Exception:
                        pass

        if not alive and self.status_state == BOT_STATE_RUNNING:
            self.status_state = BOT_STATE_STOPPED

        return alive

    def get_status(self) -> Dict[str, Any]:
        """Return authoritative bot status and server-calculated uptime."""
        running = self.is_running()
        uptime_seconds = 0
        uptime_formatted = "0m 0s"
        db_status = BOT_STATE_STOPPED

        # Authoritative uptime calculation from server DB timestamps
        try:
            from src.db import safe_query_one
            b = safe_query_one("SELECT started_at, paused_at, resumed_at, stopped_at, status, last_heartbeat, last_scan_at FROM bot_instances WHERE id = ?", (self.bot_id,))
            if b and b.get("started_at"):
                db_status = b.get("status") or "STOPPED"
                st_str = b["started_at"].replace("Z", "+00:00")
                st = datetime.fromisoformat(st_str)
                if st.tzinfo is None:
                    st = st.replace(tzinfo=timezone.utc)
                now_utc = datetime.now(timezone.utc)
                
                if db_status in ["RUNNING", "PAUSED"] and running:
                    uptime_seconds = max(0, int((now_utc - st).total_seconds()))
                elif b.get("stopped_at"):
                    stop_str = b["stopped_at"].replace("Z", "+00:00")
                    try:
                        stop_dt = datetime.fromisoformat(stop_str)
                        if stop_dt.tzinfo is None:
                            stop_dt = stop_dt.replace(tzinfo=timezone.utc)
                        uptime_seconds = max(0, int((stop_dt - st).total_seconds()))
                    except Exception:
                        uptime_seconds = 0
        except Exception:
            if running and self.start_time:
                delta = datetime.now(timezone.utc) - self.start_time
                uptime_seconds = max(0, int(delta.total_seconds()))

        hours, remainder = divmod(uptime_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours > 0:
            uptime_formatted = f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0 or seconds > 0:
            uptime_formatted = f"{minutes}m {seconds}s"
        else:
            uptime_formatted = "0m 0s"

        kill_switch_active = config.KILL_SWITCH_FILE.exists()

        state = self.status_state
        if kill_switch_active:
            state = BOT_STATE_HALTED
        elif not running and state not in [BOT_STATE_PAUSED, BOT_STATE_ERROR, BOT_STATE_CREATED]:
            state = db_status if db_status in [BOT_STATE_RUNNING, BOT_STATE_PAUSED] else BOT_STATE_STOPPED

        is_running_flag = running or (state == BOT_STATE_RUNNING) or (db_status == BOT_STATE_RUNNING)
        is_paused_flag = self.is_paused or (state == BOT_STATE_PAUSED) or (db_status == BOT_STATE_PAUSED)

        return {
            "status": state,
            "is_running": is_running_flag,
            "is_paused": is_paused_flag,
            "kill_switch_active": kill_switch_active,
            "uptime_seconds": uptime_seconds,
            "uptime_formatted": uptime_formatted,
            "pid": self.process.pid if self.process else None,
            "last_error": self.last_error
        }



class MultiBotManager:
    """Manages multi-instance bot processes and links with database bot_instances."""

    def __init__(self):
        self.managers: Dict[str, BotProcessManager] = {}
        self._lock = threading.Lock()
        try:
            from src.db import reconcile_startup_bot_states
            reconcile_startup_bot_states()
        except Exception as e:
            logger.warning(f"Startup bot state reconciliation notice: {e}")

    def execute_idempotent_command(
        self,
        command_id: str,
        bot_id: str,
        action: str,
        requested_by: str = "OPERATOR",
        expected_state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a bot lifecycle command with strict idempotency and state machine validation.
        """
        import src.db as db
        action = (action or "").upper()

        # 1. Idempotency Check: Did we already process this exact command_id?
        if command_id:
            existing = db.get_bot_command(command_id)
            if existing:
                if existing.get("status") in ["EXECUTED", "REJECTED"]:
                    return {
                        "status": "already_executed",
                        "command_id": command_id,
                        "bot_id": bot_id,
                        "action": action,
                        "result": existing.get("result_msg"),
                        "message": f"Idempotent duplicate: Command was already processed with status '{existing.get('status')}'."
                    }
                elif existing.get("status") == "VALIDATING":
                    return {
                        "status": "in_progress",
                        "command_id": command_id,
                        "message": "Command is currently executing."
                    }

        # 2. Record command in DB as VALIDATING
        if command_id:
            db.create_bot_command({
                "command_id": command_id,
                "bot_id": bot_id,
                "requested_action": action,
                "requested_by": requested_by,
                "expected_state": expected_state or "",
                "status": "VALIDATING"
            })

        # 3. State-Machine & Action Execution
        res = {}
        if action == "START":
            res = self.start_bot(bot_id)
        elif action == "PAUSE":
            res = self.pause_bot(bot_id)
        elif action == "RESUME":
            res = self.resume_bot(bot_id)
        elif action == "STOP":
            res = self.stop_bot(bot_id)
        elif action == "RESTART":
            res = self.restart_bot(bot_id)
        elif action == "KILL":
            res = self.trigger_kill_switch(bot_id)
        elif action == "DEACTIVATE_KILL":
            res = self.deactivate_kill_switch(bot_id)
        else:
            res = {"status": "error", "message": f"Unsupported bot command action: '{action}'"}

        # 4. Update command status in DB
        cmd_status = "EXECUTED" if res.get("status") in ["success", "already_running"] else "REJECTED"
        if command_id:
            db.update_bot_command(command_id, cmd_status, result_msg=res.get("message", ""))

        res["command_id"] = command_id
        return res

    def get_manager(self, bot_id: str = "bot-1") -> BotProcessManager:
        if bot_id not in self.managers:
            self.managers[bot_id] = BotProcessManager(bot_id=bot_id)
        return self.managers[bot_id]

    def start_bot(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.start_bot()
        if res.get("status") in ["success", "already_running"]:
            self._update_db_status(bot_id, BOT_STATE_RUNNING, pid=res.get("pid"))
        elif res.get("status") == "error":
            self._update_db_status(bot_id, BOT_STATE_ERROR, error=res.get("message"))
        return res

    def is_bot_running(self, bot_id: str = "bot-1") -> bool:
        """Check if the given bot instance process is currently running."""
        mgr = self.get_manager(bot_id)
        return mgr.is_running()

    def stop_bot(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.stop_bot()
        self._update_db_status(bot_id, BOT_STATE_STOPPED)
        return res

    def pause_bot(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.pause_bot()
        if res.get("status") == "success":
            self._update_db_status(bot_id, BOT_STATE_PAUSED)
        return res

    def resume_bot(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.resume_bot()
        if res.get("status") == "success":
            self._update_db_status(bot_id, BOT_STATE_RUNNING)
        return res

    def restart_bot(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.restart_bot()
        if res.get("status") in ["success", "already_running"]:
            self._update_db_status(bot_id, BOT_STATE_RUNNING, pid=res.get("pid"))
        return res

    def trigger_kill_switch(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.trigger_kill_switch()
        self._update_db_status(bot_id, "HALTED")
        return res

    def deactivate_kill_switch(self, bot_id: str = "bot-1") -> Dict[str, Any]:
        mgr = self.get_manager(bot_id)
        res = mgr.deactivate_kill_switch()
        self._update_db_status(bot_id, BOT_STATE_STOPPED)
        return res

    def start_all_bots(self) -> Dict[str, Any]:
        """
        Safely validate and start all configured bot instances in the database.
        """
        if config.KILL_SWITCH_FILE.exists():
            return {"status": "error", "message": "Kill switch is active."}

        try:
            from src.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
            bots = [dict(r) for r in cursor.fetchall()]
            conn.close()
        except Exception as e:
            return {"status": "error", "message": f"DB Error: {e}"}

        started_list = []
        skipped_list = []
        for bot in bots:
            bot_id = bot["id"]
            mode = (bot.get("execution_mode") or "PAPER").upper()

            # Pre-flight check: If live trading disabled globally, skip live bots
            if mode == "LIVE":
                if not getattr(config, "LIVE_TRADING_ENABLED", False):
                    skipped_list.append(bot_id)
                    continue

            res = self.start_bot(bot_id)
            if res.get("status") in ["success", "already_running"]:
                started_list.append(bot_id)
            else:
                skipped_list.append(bot_id)

        return {
            "status": "success",
            "started_count": len(started_list),
            "skipped_count": len(skipped_list),
            "started": started_list,
            "skipped": skipped_list
        }


    def pause_all_bots(self) -> Dict[str, Any]:
        """Pauses all currently running bot instances."""
        try:
            from src.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM bot_instances WHERE status = 'RUNNING' AND COALESCE(is_deleted, 0) = 0")
            running_bots = [dict(r) for r in cursor.fetchall()]
            conn.close()
        except Exception as e:
            return {"status": "error", "message": str(e)}

        paused = []
        for b in running_bots:
            res = self.pause_bot(b["id"])
            if res.get("status") == "success":
                paused.append(b["name"])

        return {"status": "success", "message": f"Paused {len(paused)} bot(s).", "count": len(paused)}

    def stop_all_bots(self) -> Dict[str, Any]:
        """Stops all running and paused bot instances."""
        with self._lock:
            managers = list(self.managers.values())
        for mgr in managers:
            try:
                mgr.stop_bot()
            except Exception:
                pass

        try:
            from src.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM bot_instances WHERE status IN ('RUNNING', 'PAUSED') AND COALESCE(is_deleted, 0) = 0")
            active_bots = [dict(r) for r in cursor.fetchall()]
            conn.close()
        except Exception as e:
            return {"status": "error", "message": str(e)}

        stopped = []
        for b in active_bots:
            res = self.stop_bot(b["id"])
            if res.get("status") == "success":
                stopped.append(b["name"])

        return {"status": "success", "message": f"Stopped {len(stopped)} bot(s).", "count": len(stopped)}

    def execute_group_action(self, group_name: str, action: str) -> Dict[str, Any]:
        """Execute a bulk START, PAUSE, RESUME, or STOP action for all bots in a named group."""
        action = (action or "").upper()
        if action not in ["START", "PAUSE", "RESUME", "STOP"]:
            return {"status": "error", "message": f"Unsupported group action: {action}"}

        if action in ["START", "RESUME"] and config.KILL_SWITCH_FILE.exists():
            return {"status": "error", "message": "Cannot start/resume group bots: 🔴 TRADING HALTED via Emergency Kill Switch."}

        try:
            from src.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bot_instances WHERE group_name = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY id ASC", (group_name,))
            bots = [dict(r) for r in cursor.fetchall()]
            conn.close()
        except Exception as e:
            return {"status": "error", "message": f"Failed to fetch bots for group '{group_name}': {e}"}

        results = []
        for b in bots:
            b_id = b["id"]
            b_name = b.get("name") or b_id
            mgr = self.get_manager(b_id)

            if action == "START":
                if mgr.is_running():
                    results.append({"bot_id": b_id, "name": b_name, "status": "ALREADY_RUNNING", "message": "Already running"})
                else:
                    res = self.start_bot(b_id)
                    results.append({"bot_id": b_id, "name": b_name, "status": "STARTED" if res.get("status") == "success" else "ERROR", "message": res.get("message", "")})
            elif action == "PAUSE":
                if mgr.status_state == BOT_STATE_PAUSED:
                    results.append({"bot_id": b_id, "name": b_name, "status": "ALREADY_PAUSED", "message": "Already paused"})
                else:
                    res = self.pause_bot(b_id)
                    results.append({"bot_id": b_id, "name": b_name, "status": "PAUSED" if res.get("status") == "success" else "ERROR", "message": res.get("message", "")})
            elif action == "RESUME":
                if mgr.status_state != BOT_STATE_PAUSED:
                    results.append({"bot_id": b_id, "name": b_name, "status": "SKIPPED", "message": "Not paused"})
                else:
                    res = self.resume_bot(b_id)
                    results.append({"bot_id": b_id, "name": b_name, "status": "RESUMED" if res.get("status") == "success" else "ERROR", "message": res.get("message", "")})
            elif action == "STOP":
                if not mgr.is_running() and mgr.status_state == BOT_STATE_STOPPED:
                    results.append({"bot_id": b_id, "name": b_name, "status": "ALREADY_STOPPED", "message": "Already stopped"})
                else:
                    res = self.stop_bot(b_id)
                    results.append({"bot_id": b_id, "name": b_name, "status": "STOPPED" if res.get("status") == "success" else "ERROR", "message": res.get("message", "")})

        success_count = sum(1 for r in results if r["status"] in ["STARTED", "PAUSED", "RESUMED", "STOPPED"])
        return {
            "status": "success",
            "group_name": group_name,
            "action": action,
            "message": f"Group '{group_name}' {action} executed: {success_count}/{len(results)} updated.",
            "total_bots": len(results),
            "results": results
        }

    control_group_bots = execute_group_action

    def _update_db_status(self, bot_id: str, status: str, pid: Optional[int] = None, error: Optional[str] = None) -> None:

        try:
            from src.db import get_connection
            conn = get_connection()
            c = conn.cursor()
            now_str = datetime.now(timezone.utc).isoformat()

            if status == BOT_STATE_RUNNING:
                c.execute("""
                    UPDATE bot_instances 
                    SET status = 'RUNNING', 
                        started_at = COALESCE(started_at, ?), 
                        last_heartbeat = ?,
                        process_id = COALESCE(?, process_id),
                        last_error = ''
                    WHERE id = ?
                """, (now_str, now_str, str(pid) if pid else None, bot_id))
            elif status == BOT_STATE_PAUSED:
                c.execute("UPDATE bot_instances SET status = 'PAUSED', paused_at = ? WHERE id = ?", (now_str, bot_id))
            elif status == BOT_STATE_STOPPED:
                c.execute("UPDATE bot_instances SET status = 'STOPPED', stopped_at = ?, process_id = '' WHERE id = ?", (now_str, bot_id))
            elif status == BOT_STATE_ERROR:
                c.execute("UPDATE bot_instances SET status = 'ERROR', last_error = ? WHERE id = ?", (error or "Runtime error", bot_id))
            else:
                c.execute("UPDATE bot_instances SET status = ? WHERE id = ?", (status, bot_id))

            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to update db status for bot {bot_id}: {e}")


class BotWatchdog(threading.Thread):
    """Background watchdog thread that detects stalled bot instances and delegates to SelfHealingManager."""
    def __init__(self, check_interval_sec: int = 30, stall_threshold_sec: int = 900):
        super().__init__(daemon=True, name="BotWatchdogThread")
        self.check_interval = check_interval_sec
        self.stall_threshold = stall_threshold_sec
        self._running = True

    def run(self):
        logger.info("BotWatchdog thread started.")
        while self._running:
            try:
                self._check_stalled_bots()
            except Exception as e:
                logger.error(f"Error in BotWatchdog loop: {e}")
            time.sleep(self.check_interval)

    def _check_stalled_bots(self):
        from src.db import get_connection, log_bot_activity
        from src.self_healing_manager import global_self_healing_manager
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, timeframe, status, last_checked_at FROM bot_instances WHERE status IN ('RUNNING', 'PAUSED') AND COALESCE(is_deleted, 0) = 0")
            rows = cursor.fetchall()
            conn.close()

            now_utc = datetime.now(timezone.utc)
            
            for r in rows:
                bot_id = r['id']
                b_name = r['name']
                tf_str = r['timeframe'] or '5m'
                last_checked_str = r['last_checked_at']
                
                if not last_checked_str:
                    continue

                try:
                    last_dt = datetime.fromisoformat(last_checked_str.replace("Z", "+00:00"))
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                    seconds_ago = int((now_utc - last_dt).total_seconds())
                except Exception:
                    continue

                from src.indicators import get_timeframe_minutes
                tf_mins = get_timeframe_minutes(tf_str)
                dynamic_stall_threshold = max(600, int(tf_mins * 60 * 2.5))
                effective_threshold = self.stall_threshold if self.stall_threshold != 900 else dynamic_stall_threshold

                if seconds_ago > effective_threshold:
                    log_bot_activity(bot_id, "STALLED_RECOVERY", f"Watchdog detected stall — attempting automatic restart for '{b_name}'.")

                    def _recovery_cb():
                        multi_bot_manager.stop_bot(bot_id)
                        time.sleep(0.5)
                        return multi_bot_manager.start_bot(bot_id)

                    def _on_exhausted_cb():
                        try:
                            conn2 = get_connection()
                            conn2.execute("UPDATE bot_instances SET status = 'ERROR', last_error = 'Auto-recovery exhausted. Manual restart required.' WHERE id = ?", (bot_id,))
                            conn2.commit()
                            conn2.close()
                        except Exception:
                            pass

                    recovery_res = global_self_healing_manager.execute_safe_recovery(
                        entity_id=bot_id,
                        entity_type="BOT",
                        failure_reason=f"Stalled for {seconds_ago}s (> {effective_threshold}s threshold)",
                        recovery_callback=_recovery_cb,
                        on_exhausted_callback=_on_exhausted_cb
                    )
                    
                    if recovery_res.get("status") == "success":
                        log_bot_activity(bot_id, "RESTART_SUCCESS", f"Watchdog auto-recovered bot instance '{b_name}'.")
                    elif recovery_res.get("status") == "exhausted":
                        log_bot_activity(bot_id, "RESTART_EXHAUSTED", f"Auto-recovery exhausted for '{b_name}'. Bot marked ERROR.")
        except Exception as e:
            logger.error(f"Watchdog check failed: {e}")


bot_manager = BotProcessManager()
multi_bot_manager = MultiBotManager()

_watchdog_lock = threading.Lock()
_watchdog_instance: Optional[BotWatchdog] = None


def get_watchdog() -> BotWatchdog:
    global _watchdog_instance
    with _watchdog_lock:
        if _watchdog_instance is None or not _watchdog_instance.is_alive():
            _watchdog_instance = BotWatchdog(check_interval_sec=30, stall_threshold_sec=900)
            _watchdog_instance.start()
        return _watchdog_instance


def start_watchdog_thread():
    """Start the background watchdog thread once."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return
    get_watchdog()
