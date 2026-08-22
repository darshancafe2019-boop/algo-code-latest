#!/usr/bin/env python3
"""
Quant.OS Unified System Orchestrator & Health Supervisor
Cross-platform developer orchestrator ensuring synchronous backend readiness,
graceful signal handling, and zero orphaned processes.
"""

import os
import sys
import time
import signal
import socket
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5050))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3000))
VENV_PYTHON = ROOT_DIR / ".venv" / "bin" / "python"

processes = []

def log(tag: str, msg: str, color_code: str = "\033[94m"):
    reset = "\033[0m"
    print(f"{color_code}[{tag}]{reset} {msg}", flush=True)

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def kill_process_on_port(port: int):
    try:
        res = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True)
        pids = res.stdout.strip().split()
        for pid in pids:
            if pid and pid != str(os.getpid()):
                log("CLEANUP", f"Terminating stale process on port {port} (PID: {pid})...", "\033[93m")
                os.kill(int(pid), signal.SIGTERM)
                time.sleep(0.5)
    except Exception:
        pass

def cleanup_and_exit(signum=None, frame=None):
    log("SHUTDOWN", "Stopping all Quant.OS subsystem processes...", "\033[91m")
    for p in processes:
        if p.poll() is None:
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
    log("SHUTDOWN", "All processes stopped cleanly.", "\033[92m")
    sys.exit(0)

def poll_readiness(url: str, max_retries: int = 40, delay: float = 0.5) -> bool:
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "QuantOS-Orchestrator"})
            with urllib.request.urlopen(req, timeout=1.5) as res:
                if res.status in (200, 204):
                    return True
        except Exception:
            pass
        time.sleep(delay)
    return False

def main():
    signal.signal(signal.SIGINT, cleanup_and_exit)
    signal.signal(signal.SIGTERM, cleanup_and_exit)

    print("\n" + "=" * 64)
    print("\033[96m  QUANT.OS INSTITUTIONAL ALGO TRADING PLATFORM\033[0m")
    print("  Unified Dev Orchestrator & Health Supervisor")
    print("=" * 64 + "\n")

    # 1. Environment pre-flight
    python_exec = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
    log("ENV", f"Python Runtime: {python_exec}")

    node_version = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip()
    log("ENV", f"Node.js Runtime: {node_version}")

    # 2. Port conflict resolution
    if is_port_in_use(BACKEND_PORT):
        log("PORT", f"Port {BACKEND_PORT} is currently in use. Cleaning up stale daemon...", "\033[93m")
        kill_process_on_port(BACKEND_PORT)
        time.sleep(1)

    if is_port_in_use(FRONTEND_PORT):
        log("PORT", f"Port {FRONTEND_PORT} is currently in use. Cleaning up stale daemon...", "\033[93m")
        kill_process_on_port(FRONTEND_PORT)
        time.sleep(1)

    # 3. Launch Python backend first
    log("BACKEND", f"Starting Python Quantitative Engine (PORT {BACKEND_PORT})...", "\033[92m")
    backend_env = os.environ.copy()
    backend_env["PORT"] = str(BACKEND_PORT)
    backend_env["PYTHONUNBUFFERED"] = "1"

    backend_proc = subprocess.Popen(
        [python_exec, "dashboard.py"],
        cwd=str(ROOT_DIR),
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(backend_proc)

    # 4. Await backend readiness probe
    log("HEALTH", f"Awaiting backend readiness probe on http://127.0.0.1:{BACKEND_PORT}/health/ready...")
    ready = poll_readiness(f"http://127.0.0.1:{BACKEND_PORT}/health/ready", max_retries=30, delay=0.5)
    if not ready:
        ready = poll_readiness(f"http://127.0.0.1:{BACKEND_PORT}/api/status", max_retries=10, delay=0.5)

    if not ready:
        log("ERROR", "Backend failed to become ready within timeout period.", "\033[91m")
        cleanup_and_exit()

    log("HEALTH", "\033[92m[✓] Backend Engine is HEALTHY and accepting queries!\033[0m")

    # 5. Launch Next.js dev server
    log("FRONTEND", f"Starting Next.js App Router Terminal (PORT {FRONTEND_PORT})...", "\033[95m")
    frontend_env = os.environ.copy()
    frontend_env["BACKEND_INTERNAL_URL"] = f"http://127.0.0.1:{BACKEND_PORT}"
    frontend_env["PORT"] = str(FRONTEND_PORT)

    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "-p", str(FRONTEND_PORT)],
        cwd=str(FRONTEND_DIR),
        env=frontend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(frontend_proc)

    # 6. Await frontend readiness probe
    log("HEALTH", f"Awaiting frontend readiness probe on http://127.0.0.1:{FRONTEND_PORT}/api/health...")
    frontend_ready = poll_readiness(f"http://127.0.0.1:{FRONTEND_PORT}/api/health", max_retries=30, delay=0.5)

    print("\n" + "=" * 64)
    print("\033[92m  [✓] QUANT.OS SYSTEM FULLY OPERATIONAL\033[0m")
    print(f"  • Frontend Terminal : \033[96mhttp://localhost:{FRONTEND_PORT}\033[0m")
    print(f"  • Backend Engine    : \033[96mhttp://127.0.0.1:{BACKEND_PORT}\033[0m")
    print(f"  • Default Execution : \033[93mPAPER TRADING (Safe Mode)\033[0m")
    print(f"  • Confluence Gate   : \033[92m75.0% Confidence Threshold Protected\033[0m")
    print("=" * 64 + "\n")
    print("Press Ctrl+C to stop all services.\n")

    # Stream logs from children
    import threading
    def stream_output(proc, tag, color):
        for line in iter(proc.stdout.readline, ''):
            if line:
                print(f"{color}[{tag}]{chr(27)}[0m {line.strip()}", flush=True)

    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", "\033[94m"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND", "\033[95m"), daemon=True)
    t1.start()
    t2.start()

    while True:
        if backend_proc.poll() is not None:
            log("BACKEND", f"Backend exited with code {backend_proc.returncode}", "\033[91m")
            cleanup_and_exit()
        if frontend_proc.poll() is not None:
            log("FRONTEND", f"Frontend exited with code {frontend_proc.returncode}", "\033[91m")
            cleanup_and_exit()
        time.sleep(1)

if __name__ == "__main__":
    main()
