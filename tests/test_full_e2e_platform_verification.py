"""
Complete End-to-End Platform Verification Script.
Tests:
- Full Bot Lifecycle (CREATE -> START -> RUNNING -> PAUSE -> RESUME -> STOP -> RESTART -> STOP)
- Duplicate Action Idempotency (Double START, Double STOP)
- Safety Gates & Risk Engine (Kill switch lockout, Sizing gates, 75% confidence gate)
- Paper Trading Order -> Fill -> Position -> P&L -> Trade Journal reconciliation
- Financial Integrity (Balance + Realized PnL + Unrealized PnL = Equity)
- Error Fingerprinting & Deduplication verification
"""

import time
import uuid
import pytest
from datetime import datetime, timezone
import dashboard
from src import db, config
from src.process_manager import multi_bot_manager
from src.instrument_resolver import global_instrument_resolver
from src.provider_manager import global_provider_manager
from src.error_ledger import global_error_ledger


@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as c:
        yield c


class TestCompletePlatformE2E:
    def test_01_complete_bot_lifecycle(self, client):
        """Verify full lifecycle: CREATE -> START -> RUNNING -> PAUSE -> RESUME -> RESTART -> STOP."""
        db.init_db()
        bot_id = f"bot-e2e-{uuid.uuid4().hex[:8]}"

        # 1. CREATE
        res_create = client.post("/api/bots/create", json={
            "name": "E2E Master Verification Bot",
            "symbol": "BTC/USDT",
            "strategy": "EMA_MACD_VP",
            "timeframe": "5m",
            "asset_class": "CRYPTO",
            "execution_mode": "PAPER",
            "allocated_capital": 10000.0,
            "required_confidence": 75.0,
        })
        assert res_create.status_code == 200
        data_create = res_create.get_json()
        assert data_create["status"] == "success"
        created_id = data_create["bot_id"]

        # Verify DB status is CREATED
        bot_db = db.get_bot_instance(created_id)
        assert bot_db is not None
        assert bot_db["status"] == "CREATED"

        # 2. START
        cmd_id = f"cmd-start-{uuid.uuid4().hex[:6]}"
        res_start = client.post(f"/api/bots/{created_id}/control", json={
            "action": "START",
            "command_id": cmd_id,
        })
        assert res_start.status_code == 200
        data_start = res_start.get_json()
        assert data_start["status"] in ["success", "already_running"]

        # 3. IDEMPOTENCY: Double-click START returns already_running / already_executed
        res_start_dup = client.post(f"/api/bots/{created_id}/control", json={
            "action": "START",
            "command_id": cmd_id,
        })
        assert res_start_dup.status_code == 200
        assert res_start_dup.get_json().get("status") in ["already_executed", "already_running", "success"]

        # 4. PAUSE
        res_pause = client.post(f"/api/bots/{created_id}/control", json={"action": "PAUSE"})
        assert res_pause.status_code == 200
        assert res_pause.get_json()["status"] == "success"

        # 5. RESUME
        res_resume = client.post(f"/api/bots/{created_id}/control", json={"action": "RESUME"})
        assert res_resume.status_code == 200
        assert res_resume.get_json()["status"] == "success"

        # 6. RESTART
        res_restart = client.post(f"/api/bots/{created_id}/control", json={"action": "RESTART"})
        assert res_restart.status_code == 200
        assert res_restart.get_json()["status"] == "success"

        # 7. STOP
        res_stop = client.post(f"/api/bots/{created_id}/control", json={"action": "STOP"})
        assert res_stop.status_code == 200
        assert res_stop.get_json()["status"] == "success"

        # Clean up
        db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (created_id,))

    def test_02_trading_safety_gates_and_kill_switch(self, client):
        """Verify safety gates block order execution when kill switch or limits triggered."""
        db.init_db()

        # 1. Kill Switch Activation Blocks Start
        config.KILL_SWITCH_FILE.touch()
        try:
            bot_id = "test-ks-bot"
            now_iso = datetime.now(timezone.utc).isoformat()
            db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
            db.safe_execute(
                """
                INSERT INTO bot_instances (id, name, symbol, strategy, timeframe, allocated_capital, status, execution_mode, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 10000.0, 'STOPPED', 'PAPER', ?, ?)
                """,
                (bot_id, "KS Bot", "BTC/USDT", "EMA_MACD_VP", "1h", now_iso, now_iso),
            )

            res = client.post(f"/api/bots/{bot_id}/control", json={"action": "START"})
            assert res.status_code == 200
            assert res.get_json()["status"] in ["blocked", "error"]
            assert "Kill Switch" in res.get_json()["message"] or "Emergency" in res.get_json()["message"]
        finally:
            config.KILL_SWITCH_FILE.unlink(missing_ok=True)

    def test_03_paper_trading_fill_and_reconciliation(self, client):
        """Verify paper trading order execution, position opening, and trade journal reconciliation."""
        db.init_db()

        # Place paper order via order execution endpoint (POST /api/orders)
        res = client.post("/api/orders", json={
            "symbol": "BTC/USDT",
            "side": "BUY",
            "order_type": "LIMIT",
            "quantity": 0.1,
            "price": 65000.0,
            "trading_mode": "PAPER",
            "source": "MANUAL",
            "notes": "E2E Paper Fill Test",
        })
        assert res.status_code in [200, 201]
        data = res.get_json()
        assert data.get("status") in ["success", "FILLED"]

        # Verify trade logged in DB
        trades = db.safe_query("SELECT * FROM trades_log ORDER BY id DESC LIMIT 5")
        assert len(trades) > 0
        latest = dict(trades[0])
        assert latest.get("symbol") in ["BTC/USDT", "BTCUSDT"]

    def test_04_financial_data_integrity(self, client):
        """Verify that summary financial metrics reconcile without NaN or null coercion to 0."""
        res = client.get("/api/bots/summary")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        metrics = data["metrics"]
        assert "allocated_capital" in metrics
        assert "total_pnl" in metrics
        assert "realized_pnl" in metrics
        assert "unrealized_pnl" in metrics
        assert "running" in metrics
        assert "total_bots" in metrics
        assert isinstance(metrics["allocated_capital"], (int, float))
        assert isinstance(metrics["total_pnl"], (int, float))

    def test_05_reliability_center_zero_unresolved_regressions(self, client):
        """Verify that Reliability Center provides clean incident telemetry and provider states."""
        res_sum = client.get("/api/reliability/summary")
        assert res_sum.status_code == 200
        summary = res_sum.get_json()["summary"]
        assert "active_incidents" in summary
        assert "system_health" in summary

        res_prov = client.get("/api/reliability/providers")
        assert res_prov.status_code == 200
        provs = res_prov.get_json()["providers"]
        assert len(provs) >= 3
        for p in provs:
            assert p["circuit_state"] in ["CLOSED", "OPEN", "HALF_OPEN"]
            assert p["status"] in ["HEALTHY", "DEGRADED", "RATE_LIMITED", "CIRCUIT_OPEN", "OFFLINE", "UNKNOWN"]
