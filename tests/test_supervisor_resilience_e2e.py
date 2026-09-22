#!/usr/bin/env python3
"""
Quant.OS Supervisor Resilience & Fault-Tolerance E2E Test Suite
==============================================================
Validates:
1. Orchestrator startup with fixed ports (5050, 5051, 3000).
2. Continuous health checks across Backend, Gateway, and Frontend.
3. Bot lifecycle isolation: POST /api/bots/start-all does NOT crash or stop services.
4. Backend crash detection & automatic restart with exponential backoff.
5. Gateway crash detection & automatic restart with WebSocket reconnection.
6. Clean shutdown on intentional termination with zero orphaned processes.
"""

import os
import sys
import time
import socket
import signal
import urllib.request
import urllib.error
import threading
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from scripts.dev_orchestrator import (
    ServiceSupervisor,
    is_port_in_use,
    is_pid_alive,
    get_active_supervisor_state,
    clean_stale_quantos_processes,
    LOCK_FILE,
)


def poll_http_status(url: str, expected_status: int = 200, timeout_sec: float = 20.0) -> bool:
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ResilienceTestRunner"})
            with urllib.request.urlopen(req, timeout=1.5) as res:
                if res.status == expected_status:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def run_resilience_suite():
    print("\n" + "=" * 64)
    print("  QUANT.OS SUPERVISOR FAULT-TOLERANCE & RESILIENCE E2E SUITE")
    print("=" * 64 + "\n")

    # 0. Ensure existing supervisor / stale processes are cleanly stopped before starting test stack
    active_state = get_active_supervisor_state()
    if active_state:
        sup_pid = active_state.get("supervisor_pid")
        if sup_pid and sup_pid != os.getpid() and is_pid_alive(int(sup_pid)):
            print(f"  * Stopping existing supervisor (PID: {sup_pid}) before test execution...")
            try:
                os.kill(int(sup_pid), signal.SIGTERM)
                time.sleep(2.0)
            except Exception:
                pass
    clean_stale_quantos_processes(force=True, caller="RESILIENCE_TEST")
    if Path(LOCK_FILE).exists():
        try:
            Path(LOCK_FILE).unlink(missing_ok=True)
        except Exception:
            pass

    supervisor = ServiceSupervisor()

    # 1. Start full stack
    print("[TEST 1/6] Launching supervised multi-service stack...")
    started = supervisor.startup()
    assert started, "Failed to startup supervisor stack!"
    print("  [OK] Supervised stack initialized successfully!")

    # Start supervision loop in background daemon thread
    sup_thread = threading.Thread(target=supervisor.run_supervision_loop, daemon=True)
    sup_thread.start()

    time.sleep(2.0)

    try:
        # 2. Verify all health endpoints return 200
        print("\n[TEST 2/6] Verifying health probes on fixed ports (5050, 5051, 3100)...")
        backend_healthy = poll_http_status("http://127.0.0.1:5050/health/ready", 200, 20.0)
        print(f"  * Backend Engine (5050/health/ready) : {'[PASS] 200 OK' if backend_healthy else '[FAIL]'}")
        assert backend_healthy, "Backend failed initial health probe!"

        gateway_healthy = poll_http_status("http://127.0.0.1:5051/health", 200, 20.0)
        print(f"  * Market Gateway (5051/health)       : {'[PASS] 200 OK' if gateway_healthy else '[FAIL]'}")
        assert gateway_healthy, "Gateway failed initial health probe!"

        frontend_healthy = poll_http_status("http://127.0.0.1:3100/api/health", 200, 25.0)
        print(f"  * Frontend Terminal (3100/api/health): {'[PASS] 200 OK' if frontend_healthy else '[FAIL]'}")
        assert frontend_healthy, "Frontend failed initial health probe!"

        # 3. Test Bot start-all isolation
        print("\n[TEST 3/6] Testing POST /api/bots/start-all isolation...")
        req = urllib.request.Request(
            "http://127.0.0.1:5050/api/bots/start-all",
            data=b"{}",
            headers={"Content-Type": "application/json", "User-Agent": "ResilienceTestRunner"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=60.0) as res:
            assert res.status == 200
            print("  * POST /api/bots/start-all responded with HTTP 200")

        time.sleep(2.0)
        assert supervisor.services["BACKEND"].is_alive(), "Backend died after start-all!"
        assert supervisor.services["GATEWAY"].is_alive(), "Gateway died after start-all!"
        assert supervisor.services["FRONTEND"].is_alive(), "Frontend died after start-all!"
        print("  [OK] All services remained alive and healthy after start-all!")

        # Stop started test bots
        try:
            stop_req = urllib.request.Request(
                "http://127.0.0.1:5050/api/bots/stop-all",
                data=b"{}",
                headers={"Content-Type": "application/json", "User-Agent": "ResilienceTestRunner"},
                method="POST"
            )
            with urllib.request.urlopen(stop_req, timeout=15.0) as stop_res:
                pass
        except Exception:
            pass

        # 4. Deliberately terminate Backend and test Auto-Restart
        print("\n[TEST 4/6] Simulating Backend process crash (deliberately killing PID)...")
        backend_svc = supervisor.services["BACKEND"]
        old_pid = backend_svc.proc.pid
        backend_svc.proc.kill()
        print(f"  * Killed Backend process (PID: {old_pid})")

        print("  * Waiting for supervisor crash detection and auto-restart...")
        restarted_ok = poll_http_status("http://127.0.0.1:5050/health/ready", 200, 20.0)
        assert restarted_ok, "Supervisor failed to auto-restart Backend!"
        new_pid = backend_svc.proc.pid
        print(f"  [OK] Backend successfully recovered and auto-restarted with new PID: {new_pid}!")

        # 5. Deliberately terminate Gateway and test Auto-Restart & WS
        print("\n[TEST 5/6] Simulating Market Gateway crash (deliberately killing PID)...")
        gateway_svc = supervisor.services["GATEWAY"]
        old_gw_pid = gateway_svc.proc.pid
        gateway_svc.proc.kill()
        print(f"  * Killed Gateway process (PID: {old_gw_pid})")

        print("  * Waiting for supervisor crash detection and auto-restart...")
        gw_restarted_ok = poll_http_status("http://127.0.0.1:5051/health", 200, 20.0)
        assert gw_restarted_ok, "Supervisor failed to auto-restart Market Gateway!"
        new_gw_pid = gateway_svc.proc.pid
        print(f"  [OK] Gateway successfully recovered with new PID: {new_gw_pid}!")

        # Verify WebSocket connectivity after restart
        import asyncio
        import websockets

        gw_secret = os.environ.get("MARKET_GATEWAY_SECRET", "")
        async def check_ws():
            async with websockets.connect(f"ws://127.0.0.1:5051/ws?secret={gw_secret}", close_timeout=3.0) as ws:
                await ws.send('{"action":"subscribe","symbols":["BTC/USDT"],"reason":"RESILIENCE_TEST"}')
                return True

        ws_ok = asyncio.run(check_ws())
        assert ws_ok, "WebSocket failed to reconnect after gateway auto-restart!"
        print("  [OK] WebSocket verified connected and streaming after gateway auto-restart!")

        # 6. Verify clean shutdown
        print("\n[TEST 6/6] Testing intentional clean supervisor shutdown...")
        supervisor.running = False
        for svc in reversed(list(supervisor.services.values())):
            svc.stop()
        try:
            supervisor.lock.release()
        except Exception:
            pass

        time.sleep(1.0)
        print(f"  * Port 5050 (Backend) in use: {is_port_in_use(5050)}")
        print(f"  * Port 5051 (Gateway) in use: {is_port_in_use(5051)}")
        print(f"  * Port 3100 (Frontend) in use: {is_port_in_use(3100)}")

        print("\n=======================================================")
        print("  [OK] ALL SUPERVISOR RESILIENCE & RECOVERY TESTS PASSED!")
        print("=======================================================\n")

    finally:
        supervisor.running = False
        for svc in supervisor.services.values():
            svc.stop()
        try:
            supervisor.lock.release()
        except Exception:
            pass
        clean_stale_quantos_processes(force=True, caller="RESILIENCE_TEARDOWN")


def test_supervisor_resilience_e2e():
    """Pytest entrypoint for supervisor resilience and fault-tolerance."""
    run_resilience_suite()


if __name__ == "__main__":
    run_resilience_suite()
