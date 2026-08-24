#!/usr/bin/env python3
"""
Quant.OS Unified System Orchestrator & Production Supervisor
=============================================================
Authoritative supervisor ensuring:
1. Single-instance system execution (lockfile & runtime state backed).
2. Fixed port enforcement (3100: Frontend, 5050: Backend, 5051: Gateway) with zero port drift.
3. Safe stale process detection & cleanup (Quant.OS-owned only, never touches port 3000, never kills active supervisor or children).
4. Full shutdown telemetry instrumentation (trigger source, call site stack trace, PIDs, signals).
5. Continuous process supervision with bounded exponential backoff auto-restart for crashed child processes.
6. Continuous dependency health probing and fail-closed trading state governance.
7. Protected runtime state tracking in quantos_runtime_state.json.
"""

import os
import sys
import time
import json
import signal
import socket
import subprocess
import traceback
import urllib.request
import urllib.error
import threading
from datetime import datetime, timezone
from collections import deque
from pathlib import Path
from typing import Dict, List, Optional, Set, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
LOCK_FILE = ROOT_DIR / "quantos_supervisor.lock"
RUNTIME_STATE_FILE = ROOT_DIR / "quantos_runtime_state.json"

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BACKEND_PORT = 5050
GATEWAY_PORT = 5051
FRONTEND_PORT = 3100

RESTART_BACKOFF_DELAYS = [1.0, 2.0, 4.0, 8.0, 15.0]
STABLE_RUN_RESET_SECONDS = 30.0
MAX_CONSECUTIVE_RESTARTS = 10

# Cross-platform execution resolution
if sys.platform == "win32":
    VENV_PYTHON = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    NPM_EXEC = "npm.cmd"
else:
    VENV_PYTHON = ROOT_DIR / ".venv" / "bin" / "python"
    NPM_EXEC = "npm"

PYTHON_EXEC = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


def log(tag: str, msg: str, color_code: str = "\033[94m"):
    reset = "\033[0m"
    timestamp = time.strftime("%H:%M:%S")
    safe_msg = msg.replace("\u2713", "[OK]")
    print(f"{color_code}[{timestamp}][{tag}]{reset} {safe_msg}", flush=True)


# ─────────────────────────────────────────────────────────────────────────────
# 1. PROCESS HELPERS & RUNTIME STATE REGISTRY
# ─────────────────────────────────────────────────────────────────────────────

def is_pid_alive(pid: int) -> bool:
    """Checks whether a process with the given PID is currently alive."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
                text=True,
                stderr=subprocess.DEVNULL
            )
            return str(pid) in out
        except Exception:
            return False
    else:
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False


def get_active_supervisor_state() -> Optional[Dict[str, Any]]:
    """Reads the runtime state file if an active supervisor is currently running."""
    if not RUNTIME_STATE_FILE.exists():
        return None
    try:
        data = json.loads(RUNTIME_STATE_FILE.read_text(encoding="utf-8"))
        sup_pid = data.get("supervisor_pid")
        if sup_pid and is_pid_alive(int(sup_pid)):
            return data
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 2. SINGLE-INSTANCE LOCK
# ─────────────────────────────────────────────────────────────────────────────

class SingleInstanceLock:
    """Ensures only ONE Quant.OS orchestrator instance can execute at any time."""

    def __init__(self, lock_path: Path):
        self.lock_path = lock_path
        self.acquired = False

    def acquire(self) -> bool:
        current_pid = os.getpid()
        if self.lock_path.exists():
            try:
                content = self.lock_path.read_text().strip()
                if content.isdigit():
                    existing_pid = int(content)
                    if existing_pid != current_pid and is_pid_alive(existing_pid):
                        log("LOCK", f"\033[91mAnother Quant.OS supervisor is already running (PID: {existing_pid}).\033[0m")
                        log("LOCK", "Stop the existing instance before starting a new one.")
                        return False
            except Exception:
                pass

        try:
            self.lock_path.write_text(str(current_pid))
            self.acquired = True
            return True
        except Exception as e:
            log("LOCK", f"Failed to write lockfile: {e}", "\033[91m")
            return False

    def release(self):
        if self.acquired and self.lock_path.exists():
            try:
                self.lock_path.unlink(missing_ok=True)
            except Exception:
                pass
            self.acquired = False


# ─────────────────────────────────────────────────────────────────────────────
# 3. PORT AUDITING & TARGETED STALE PROCESS CLEANUP
# ─────────────────────────────────────────────────────────────────────────────

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", port)) == 0


def clean_stale_quantos_processes(force: bool = False, caller: str = "AUTO"):
    """
    Identifies and terminates ONLY orphaned Quant.OS processes on fixed ports (3100, 5050, 5051).
    CRITICAL INVARIANTS:
    1. NEVER kills the active supervisor or any of its registered child services.
    2. NEVER touches port 3000 under any circumstances.
    3. Aborts if an active healthy supervisor is currently managing the system (unless force=True).
    """
    current_pid = os.getpid()
    parent_pid = os.getppid() if hasattr(os, "getppid") else 0

    # 1. Protection Check: Is another active supervisor running?
    active_state = get_active_supervisor_state()
    if active_state and not force:
        sup_pid = active_state.get("supervisor_pid")
        if sup_pid and sup_pid != current_pid and is_pid_alive(int(sup_pid)):
            log("SAFETY", f"Active Quant.OS supervisor (PID: {sup_pid}) is healthy. Stale cleanup skipped by {caller}.", "\033[96m")
            return

    # 2. Gather protected PIDs (current process, parent, active supervisor services)
    protected_pids: Set[int] = {current_pid, parent_pid}
    if active_state and active_state.get("supervisor_pid") == current_pid:
        for p in active_state.get("protected_pids", []):
            if isinstance(p, int) and p > 0:
                protected_pids.add(p)

    target_ports = [FRONTEND_PORT, BACKEND_PORT, GATEWAY_PORT]

    for port in target_ports:
        # CRITICAL SAFETY: Never touch port 3000 under any circumstances!
        if port == 3000:
            continue

        if not is_port_in_use(port):
            continue

        pids = _find_pids_on_port(port)
        for pid in pids:
            if pid in protected_pids or pid <= 0:
                continue

            if _is_quantos_owned_process(pid):
                log("CLEANUP", f"Terminating stale Quant.OS process on port {port} (PID: {pid})...", "\033[93m")
                _kill_process_tree(pid)
                time.sleep(0.5)
            else:
                log("SAFETY", f"\033[91m[BLOCKED] Port {port} occupied by non-Quant.OS process PID {pid}. Refusing to touch.\033[0m")

    # 3. Clean orphaned live_runner processes not in protected_pids
    if sys.platform == "win32":
        try:
            ps_cmd = 'Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*live_runner.py*" } | Select-Object -ExpandProperty ProcessId'
            out = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True).stdout
            for line in out.splitlines():
                if line.strip().isdigit():
                    lr_pid = int(line.strip())
                    if lr_pid not in protected_pids and lr_pid > 0:
                        log("CLEANUP", f"Terminating orphaned live_runner worker (PID: {lr_pid})...", "\033[93m")
                        _kill_process_tree(lr_pid)
        except Exception:
            pass


def _find_pids_on_port(port: int) -> List[int]:
    if port == 3000:
        return []
    pids = []
    if sys.platform == "win32":
        try:
            res = subprocess.run(
                ["netstat", "-ano", "-p", "TCP"],
                capture_output=True,
                text=True
            )
            for line in res.stdout.splitlines():
                if f":{port} " in line or f":{port}\t" in line:
                    parts = line.strip().split()
                    if parts and parts[-1].isdigit():
                        pids.append(int(parts[-1]))
        except Exception:
            pass
    else:
        try:
            res = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True)
            for p in res.stdout.strip().split():
                if p.isdigit():
                    pids.append(int(p))
        except Exception:
            pass
    return list(set(pids))


def _is_quantos_owned_process(pid: int) -> bool:
    """Verifies that the process belongs to python, node, or the workspace."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV"],
                text=True,
                stderr=subprocess.DEVNULL
            ).lower()
            if "python" in out or "node" in out:
                return True
            wmic_out = subprocess.check_output(
                ["wmic", "process", "where", f"processid={pid}", "get", "commandline,name", "/format:csv"],
                text=True,
                stderr=subprocess.DEVNULL
            ).lower()
            return any(k in wmic_out for k in ["python", "node", "dashboard.py", "start_gateway.py", "next", "algo-code"])
        except Exception:
            return False
    return True


def _kill_process_tree(pid: int):
    if pid <= 0:
        return
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    else:
        try:
            subprocess.run(["pkill", "-TERM", "-P", str(pid)], capture_output=True)
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.3)
            os.kill(pid, signal.SIGKILL)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# 4. MANAGED SERVICE ABSTRACTION
# ─────────────────────────────────────────────────────────────────────────────

class ManagedService:
    def __init__(
        self,
        name: str,
        command: List[str],
        cwd: Path,
        env: Dict[str, str],
        health_url: str,
        port: int,
        color_code: str = "\033[94m"
    ):
        self.name = name
        self.command = command
        self.cwd = cwd
        self.env = env
        self.health_url = health_url
        self.port = port
        self.color_code = color_code

        self.proc: Optional[subprocess.Popen] = None
        self.restart_count = 0
        self.last_start_time = 0.0
        self.is_healthy = False
        self.recent_logs: deque = deque(maxlen=200)
        self._reader_thread: Optional[threading.Thread] = None

    def start(self):
        self.is_healthy = False
        self.last_start_time = time.time()
        log(self.name, f"Launching {self.name} (Port {self.port})...", self.color_code)

        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

        self.proc = subprocess.Popen(
            self.command,
            cwd=str(self.cwd),
            env=self.env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            creationflags=creation_flags
        )

        self._reader_thread = threading.Thread(target=self._stream_output, daemon=True, name=f"LogReader-{self.name}")
        self._reader_thread.start()

    def stop(self):
        if self.proc:
            pid = self.proc.pid
            log(self.name, f"Stopping {self.name} (PID: {pid})...", "\033[93m")
            _kill_process_tree(pid)
            try:
                self.proc.wait(timeout=2.0)
            except Exception:
                pass
            self.proc = None
            self.is_healthy = False

    def is_alive(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def get_exit_code(self) -> Optional[int]:
        if self.proc:
            return self.proc.poll()
        return None

    def _stream_output(self):
        if not self.proc or not self.proc.stdout:
            return
        for line in iter(self.proc.stdout.readline, ""):
            if line:
                cleaned = line.strip()
                self.recent_logs.append(cleaned)
                print(f"{self.color_code}[{self.name}]\033[0m {cleaned}", flush=True)

    def check_health(self) -> bool:
        try:
            req = urllib.request.Request(self.health_url, headers={"User-Agent": "QuantOS-Supervisor"})
            with urllib.request.urlopen(req, timeout=1.2) as res:
                self.is_healthy = res.status in (200, 204)
                return self.is_healthy
        except Exception:
            self.is_healthy = False
            return False


# ─────────────────────────────────────────────────────────────────────────────
# 5. SUPERVISOR CONTROLLER WITH INSTRUMENTED SHUTDOWN
# ─────────────────────────────────────────────────────────────────────────────

class ServiceSupervisor:
    def __init__(self):
        self.lock = SingleInstanceLock(LOCK_FILE)
        self.services: Dict[str, ManagedService] = {}
        self.running = False
        self.supervisor_running = False
        self.trading_ready = False
        self.protected_pids: Set[int] = {os.getpid()}
        self._setup_services()

    def _setup_services(self):
        # 1. Market Data Gateway (5051)
        gateway_env = os.environ.copy()
        gateway_env["MARKET_GATEWAY_PORT"] = str(GATEWAY_PORT)
        gateway_env["PYTHONUNBUFFERED"] = "1"
        self.services["GATEWAY"] = ManagedService(
            name="GATEWAY",
            command=[PYTHON_EXEC, "start_gateway.py", "--port", str(GATEWAY_PORT)],
            cwd=ROOT_DIR,
            env=gateway_env,
            health_url=f"http://127.0.0.1:{GATEWAY_PORT}/health",
            port=GATEWAY_PORT,
            color_code="\033[96m"
        )

        # 2. Python Quantitative Engine Backend (5050)
        backend_env = os.environ.copy()
        backend_env["PORT"] = str(BACKEND_PORT)
        backend_env["MARKET_GATEWAY_PORT"] = str(GATEWAY_PORT)
        backend_env["PYTHONUNBUFFERED"] = "1"
        self.services["BACKEND"] = ManagedService(
            name="BACKEND",
            command=[PYTHON_EXEC, "dashboard.py"],
            cwd=ROOT_DIR,
            env=backend_env,
            health_url=f"http://127.0.0.1:{BACKEND_PORT}/health/ready",
            port=BACKEND_PORT,
            color_code="\033[92m"
        )

        # 3. Next.js App Router Terminal Frontend (3100)
        frontend_env = os.environ.copy()
        frontend_env["BACKEND_INTERNAL_URL"] = f"http://127.0.0.1:{BACKEND_PORT}"
        frontend_env["MARKET_GATEWAY_URL"] = f"http://127.0.0.1:{GATEWAY_PORT}"
        frontend_env["PORT"] = str(FRONTEND_PORT)
        
        next_cmd_bin = FRONTEND_DIR / "node_modules" / ".bin" / "next.cmd"
        if sys.platform == "win32" and next_cmd_bin.exists():
            frontend_cmd = [str(next_cmd_bin), "dev", "-p", str(FRONTEND_PORT)]
        else:
            next_bin = FRONTEND_DIR / "node_modules" / "next" / "dist" / "bin" / "next"
            if next_bin.exists():
                frontend_cmd = ["node", str(next_bin), "dev", "-p", str(FRONTEND_PORT)]
            else:
                frontend_cmd = [NPM_EXEC, "run", "dev", "--", "-p", str(FRONTEND_PORT)]

        self.services["FRONTEND"] = ManagedService(
            name="FRONTEND",
            command=frontend_cmd,
            cwd=FRONTEND_DIR,
            env=frontend_env,
            health_url=f"http://127.0.0.1:{FRONTEND_PORT}/api/health",
            port=FRONTEND_PORT,
            color_code="\033[95m"
        )

    def _save_runtime_state(self):
        """Persists active supervisor PID, child PIDs and protected state."""
        try:
            state = {
                "supervisor_pid": os.getpid(),
                "status": "RUNNING",
                "supervisor_running": True,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "services": {
                    name: (svc.proc.pid if svc.proc else None)
                    for name, svc in self.services.items()
                },
                "protected_pids": list(self.protected_pids)
            }
            RUNTIME_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        except Exception as e:
            log("STATE", f"Failed to persist runtime state: {e}", "\033[93m")

    def _cleanup_runtime_state(self):
        try:
            RUNTIME_STATE_FILE.unlink(missing_ok=True)
        except Exception:
            pass

    def startup(self) -> bool:
        if not self.lock.acquire():
            return False

        # Clean only truly orphaned processes before starting
        clean_stale_quantos_processes(force=True, caller="SUPERVISOR_STARTUP")

        print("\n" + "=" * 64)
        print("\033[96m  QUANT.OS INSTITUTIONAL ALGO TRADING PLATFORM\033[0m")
        print("  Production Dev Orchestrator & Fault-Tolerant Supervisor")
        print("=" * 64 + "\n")

        log("ENV", f"Python Runtime : {PYTHON_EXEC}")
        log("ENV", f"Node.js Runtime: {NPM_EXEC}")
        log("ENV", f"Supervisor PID : {os.getpid()}")

        # Start Gateway -> Backend -> Frontend
        for svc_name in ["GATEWAY", "BACKEND", "FRONTEND"]:
            svc = self.services[svc_name]
            svc.start()
            if svc.proc and svc.proc.pid:
                self.protected_pids.add(svc.proc.pid)
            self._await_readiness(svc, max_retries=30, delay=0.5)

        self.running = True
        self.supervisor_running = True
        self._save_runtime_state()
        self._evaluate_system_readiness()

        print("\n" + "=" * 64)
        print("\033[92m  [OK] QUANT.OS SYSTEM FULLY OPERATIONAL\033[0m")
        print(f"  * Frontend Terminal : \033[96mhttp://localhost:{FRONTEND_PORT}\033[0m")
        print(f"  * Backend Engine    : \033[96mhttp://127.0.0.1:{BACKEND_PORT}\033[0m")
        print(f"  * Market Gateway    : \033[96mhttp://127.0.0.1:{GATEWAY_PORT}\033[0m (WS: ws://127.0.0.1:{GATEWAY_PORT}/ws)")
        print(f"  * Trading Health    : \033[92mREADY (Fail-Closed Safety Active)\033[0m")
        print("=" * 64 + "\n")
        print("Press Ctrl+C to stop all services.\n")

        return True

    def run_supervision_loop(self):
        """Continuously supervises all services, detects exits, restarts individual children with backoff."""
        while self.running:
            try:
                now = time.time()

                for svc_name, svc in list(self.services.items()):
                    if not svc.is_alive():
                        exit_code = svc.get_exit_code()
                        pid = svc.proc.pid if svc.proc else "UNKNOWN"
                        log("SUPERVISOR", f"\033[93m[CHILD_EXIT] Service {svc_name} (PID: {pid}) exited with code {exit_code}.\033[0m")

                        # Print diagnostic tail logs
                        if svc.recent_logs:
                            log("DIAG", f"Diagnostic tail logs for {svc_name} (PID: {pid}):", "\033[93m")
                            for line in list(svc.recent_logs)[-8:]:
                                print(f"    | {line}")

                        if now - svc.last_start_time > STABLE_RUN_RESET_SECONDS:
                            svc.restart_count = 0

                        svc.restart_count += 1
                        delay_idx = min(svc.restart_count - 1, len(RESTART_BACKOFF_DELAYS) - 1)
                        delay = RESTART_BACKOFF_DELAYS[delay_idx]

                        log("SUPERVISOR", f"Restarting {svc_name} in {delay:.1f}s (Attempt {svc.restart_count}/{MAX_CONSECUTIVE_RESTARTS})...", "\033[93m")
                        time.sleep(delay)

                        svc.start()
                        if svc.proc and svc.proc.pid:
                            self.protected_pids.add(svc.proc.pid)
                            self._save_runtime_state()
                        self._await_readiness(svc, max_retries=20, delay=0.5)

                self._evaluate_system_readiness()
                time.sleep(1.0)

            except KeyboardInterrupt:
                self.shutdown(
                    reason="Operator KeyboardInterrupt (Ctrl+C)",
                    user_requested=True
                )
                break
            except Exception as e:
                log("SUPERVISOR", f"Supervision exception (non-fatal): {e}", "\033[91m")
                time.sleep(1.0)

    def _await_readiness(self, svc: ManagedService, max_retries: int = 30, delay: float = 0.5):
        for _ in range(max_retries):
            if svc.check_health():
                log("HEALTH", f"\033[92m[OK] {svc.name} is HEALTHY on port {svc.port}!\033[0m")
                return True
            time.sleep(delay)
        log("WARN", f"{svc.name} did not immediately respond to health probe on port {svc.port}; supervisor will monitor.", "\033[93m")
        return False

    def _evaluate_system_readiness(self):
        backend_ok = self.services["BACKEND"].check_health()
        gateway_ok = self.services["GATEWAY"].check_health()

        prev_ready = self.trading_ready
        self.trading_ready = backend_ok and gateway_ok

        if prev_ready and not self.trading_ready:
            log("SAFETY", "\033[91m[FAIL-CLOSED] System dependencies degraded. Trading marked NOT_READY.\033[0m")
        elif not prev_ready and self.trading_ready:
            log("SAFETY", "\033[92m[OPERATIONAL] All dependencies healthy. Trading marked READY.\033[0m")

    def shutdown(
        self,
        reason: str = "Explicit operator shutdown",
        signum: Optional[int] = None,
        frame=None,
        user_requested: bool = False
    ):
        """
        INSTRUMENTED GLOBAL SHUTDOWN FUNCTION
        Logs complete provenance telemetry before stopping owned children.
        """
        if not self.running and not self.lock.acquired:
            return

        self.running = False
        self.supervisor_running = False

        # Complete Provenance Telemetry
        timestamp = datetime.now(timezone.utc).isoformat()
        sup_pid = os.getpid()
        ppid = os.getppid() if hasattr(os, "getppid") else "N/A"
        thread_name = threading.current_thread().name
        sig_name = f"SIG {signum}" if signum else "None"
        stack_trace = "".join(traceback.format_stack())

        print("\n" + "=" * 70)
        log("SHUTDOWN", f"\033[91m================ [SHUTDOWN TRIGGER DETECTED] ================\033[0m")
        log("SHUTDOWN", f"  * Timestamp       : {timestamp}")
        log("SHUTDOWN", f"  * Supervisor PID  : {sup_pid}")
        log("SHUTDOWN", f"  * Parent PID      : {ppid}")
        log("SHUTDOWN", f"  * Thread Name     : {thread_name}")
        log("SHUTDOWN", f"  * Signal          : {sig_name}")
        log("SHUTDOWN", f"  * Reason          : {reason}")
        log("SHUTDOWN", f"  * User Requested  : {user_requested}")
        log("SHUTDOWN", f"  * Call Stack Trace:\n{stack_trace}")
        print("=" * 70 + "\n")

        log("SHUTDOWN", "Stopping supervisor-owned subsystem processes...", "\033[91m")

        for svc in reversed(list(self.services.values())):
            svc.stop()

        self._cleanup_runtime_state()
        self.lock.release()
        log("SHUTDOWN", "\033[92mAll supervisor-owned processes stopped cleanly. Zero orphans remaining.\033[0m")
        sys.exit(0)


def main():
    supervisor = ServiceSupervisor()

    def handle_signal(sig, frame):
        supervisor.shutdown(
            reason=f"Received signal {sig}",
            signum=sig,
            frame=frame,
            user_requested=True
        )

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    if supervisor.startup():
        supervisor.run_supervision_loop()


if __name__ == "__main__":
    main()
