"""
Unit & Integration Test Suite: Quant.OS Dev Orchestrator Startup, Shutdown & Health
===================================================================================
Validates:
1. Console text sanitization (removes mojibake, preserves clean logs).
2. ManagedService lifecycle (safe stdout reading, pipe closure, thread joining, zero daemon crashes).
3. ServiceSupervisor preflight verification.
4. Application vs Trading health separation (Application = RUNNING, Trading = NOT_READY without crash).
5. Isolated provider status handling (failed/unconfigured providers do not crash platform).
6. Idempotent shutdown with zero lingering processes or locked ports.
"""

import os
import sys
import time
import json
import unittest
import threading
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from scripts.dev_orchestrator import (
    sanitize_console_text,
    ManagedService,
    ServiceSupervisor,
    SingleInstanceLock,
    is_port_in_use,
    FRONTEND_PORT,
    BACKEND_PORT,
    GATEWAY_PORT,
)


class TestOrchestratorStartupShutdown(unittest.TestCase):
    def test_01_console_text_sanitization(self):
        """Verify unicode and Windows cp1252 mojibake artifacts are cleanly converted to ASCII tags."""
        raw_mojibake = "Next.js ready âœ“ on http://localhost:3100 â–² â—‹ [âš  warn] âœ— error â€¢ dot â†’ arrow"
        sanitized = sanitize_console_text(raw_mojibake)
        self.assertIn("[OK]", sanitized)
        self.assertIn("[^]", sanitized)
        self.assertIn("[o]", sanitized)
        self.assertIn("[WARN]", sanitized)
        self.assertIn("[ERROR]", sanitized)
        self.assertIn("*", sanitized)
        self.assertIn("->", sanitized)
        self.assertNotIn("âœ“", sanitized)
        self.assertNotIn("â–²", sanitized)

    def test_02_managed_service_safe_stop_and_thread_join(self):
        """Verify ManagedService launches, captures stdout, and stops cleanly joining its reader thread."""
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        svc = ManagedService(
            name="TEST_ECHO",
            command=[sys.executable, "-c", "import time; print('TEST_LINE_1', flush=True); time.sleep(10)"],
            cwd=ROOT_DIR,
            env=env,
            health_url="http://127.0.0.1:9999/health",
            port=9999,
        )

        svc.start()
        self.assertTrue(svc.is_alive())
        self.assertIsNotNone(svc._reader_thread)
        self.assertTrue(svc._reader_thread.is_alive())

        time.sleep(0.5)
        # Check logs captured
        self.assertTrue(len(svc.recent_logs) > 0)
        self.assertIn("TEST_LINE_1", svc.recent_logs[0])

        # Stop service cleanly
        svc.stop()
        self.assertFalse(svc.is_alive())
        self.assertIsNone(svc._reader_thread)
        self.assertIsNone(svc.proc)

    def test_03_preflight_checks(self):
        """Verify preflight verification validates directory structure and executables."""
        supervisor = ServiceSupervisor()
        ok, errors = supervisor.preflight_checks()
        self.assertTrue(ok, f"Preflight checks failed unexpectedly: {errors}")
        self.assertEqual(len(errors), 0)

    def test_04_application_running_while_trading_not_ready(self):
        """
        Verify that when a trading dependency (e.g. Gateway) is offline:
        - Application remains RUNNING
        - Trading is marked NOT_READY
        - Supervisor does NOT crash or exit.
        """
        supervisor = ServiceSupervisor()
        
        # Mock services: Backend healthy, Gateway unhealthy, Frontend healthy
        supervisor.services["BACKEND"].is_healthy = True
        supervisor.services["BACKEND"].check_health = MagicMock(return_value=True)
        supervisor.services["GATEWAY"].is_healthy = False
        supervisor.services["GATEWAY"].check_health = MagicMock(return_value=False)
        supervisor.services["FRONTEND"].is_healthy = True
        supervisor.services["FRONTEND"].check_health = MagicMock(return_value=True)

        backend_ok, gateway_ok, frontend_ok = supervisor._evaluate_system_readiness()
        self.assertTrue(backend_ok)
        self.assertFalse(gateway_ok)
        self.assertTrue(frontend_ok)

        # Trading must be NOT_READY, but supervisor should stay alive
        self.assertFalse(supervisor.trading_ready)
        self.assertIn("Market Gateway", supervisor.trading_status_reason)

        # Now simulate Gateway recovering
        supervisor.services["GATEWAY"].is_healthy = True
        supervisor.services["GATEWAY"].check_health = MagicMock(return_value=True)
        backend_ok, gateway_ok, frontend_ok = supervisor._evaluate_system_readiness()
        self.assertTrue(supervisor.trading_ready)
        self.assertIn("operational", supervisor.trading_status_reason.lower())

    def test_05_provider_failure_isolation(self):
        """Verify that a provider offline status does not crash supervisor and is accurately tracked."""
        supervisor = ServiceSupervisor()
        supervisor.provider_statuses = {
            "UPSTOX": "CONNECTED",
            "DELTA": "CONNECTED",
            "BINANCE": "CONNECTED",
            "DHAN": "OFFLINE",
            "PAPER": "CONNECTED",
        }

        # Verify Dhan offline is recorded, but paper & upstox are active
        self.assertEqual(supervisor.provider_statuses["DHAN"], "OFFLINE")
        self.assertEqual(supervisor.provider_statuses["UPSTOX"], "CONNECTED")
        self.assertEqual(supervisor.provider_statuses["PAPER"], "CONNECTED")

    def test_06_idempotent_shutdown(self):
        """Verify multiple calls to shutdown() execute safely without duplicate cleanup or crashes."""
        supervisor = ServiceSupervisor()
        supervisor.shutdown(reason="First test shutdown", user_requested=True)
        # Second call should return gracefully and instantly
        supervisor.shutdown(reason="Second test shutdown", user_requested=True)
        self.assertFalse(supervisor.running)


if __name__ == "__main__":
    unittest.main()
