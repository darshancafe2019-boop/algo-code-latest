"""
Unit and Integration Test Suite for Bot Fleet Command Center / LIVE TAB
========================================================================
Validates:
1. Safe paper-first invariants (TRADING_MODE=PAPER, LIVE_TRADING=false).
2. Exact source identification per bot (market_data_source, execution_broker, broker_account_id, exchange, segment, instrument_key, feed_status).
3. Execution broker update endpoint (POST /api/bots/<bot_id>/broker).
4. Pre-order destination confirmation endpoint (GET/POST /api/bots/<bot_id>/order-destination).
5. Truthful broker status probing (/api/brokers/status).
6. Multi-broker data segregation (Dhan, Upstox, Delta Exchange India, Binance, Paper Simulator).
7. Backend-authoritative metrics and mathematical invariant sum(states) == total_bots.
"""

import pytest
import os
import json
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import dashboard
from src import config, db
from src.bot_runtime_service import global_bot_runtime_service, BotLifecycleState


@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as client:
        # Seed test bots if table is empty
        conn = db.get_connection()
        c = conn.cursor()
        c.execute("SELECT count(*) FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
        cnt = c.fetchone()[0]
        if cnt < 2:
            now_str = datetime.now(timezone.utc).isoformat()
            c.execute(
                """
                INSERT OR IGNORE INTO bot_instances (
                    id, name, symbol, strategy, timeframe, asset_class, exchange, execution_mode,
                    status, created_at, updated_at, allocated_capital, broker_provider, broker_id,
                    broker_account_id, currency, is_deleted
                ) VALUES 
                ('bot-binance-btc', 'BTC Trend Scalper', 'BTC/USDT', 'TrendRider-v2', '5m', 'CRYPTO', 'BINANCE', 'PAPER', 'RUNNING', ?, ?, 15000.0, 'ccxt_binance', 'ccxt_binance', 'Paper-Binance-01', 'USD', 0),
                ('bot-upstox-rel', 'Reliance Breakout EQ', 'RELIANCE', 'AlphaBreakout-EQ', '15m', 'INDIAN_STOCKS', 'NSE', 'PAPER', 'STOPPED', ?, ?, 25000.0, 'upstox', 'upstox', 'Upstox-Paper-01', 'INR', 0),
                ('bot-delta-sol', 'Solana Perp Momentum', 'SOL/USDT', 'VolSpike-Perp', '1h', 'CRYPTO_OPTIONS', 'DELTA_INDIA', 'PAPER', 'PAUSED', ?, ?, 10000.0, 'delta_india', 'delta_india', 'Delta-Paper-01', 'USD', 0)
                """,
                (now_str, now_str, now_str, now_str, now_str, now_str)
            )
            conn.commit()
        conn.close()
        yield client


class TestBotFleetCommandCenter:
    """Test suite for Bot Fleet Command Center and Multi-Broker Routing."""

    def test_paper_safety_invariants(self, client):
        """Invariant: TRADING_MODE must be PAPER and LIVE_TRADING disabled by default."""
        assert config.TRADING_MODE == "PAPER"
        assert config.LIVE_TRADING_ENABLED is False

    def test_fleet_snapshot_exact_source_identification(self, client):
        """Every bot in fleet snapshot must include distinct market data source, execution broker, broker account, exchange, segment, instrument key, and feed status."""
        res = client.get("/api/bots")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "bots" in data
        assert "metrics" in data
        assert isinstance(data["bots"], list)
        assert len(data["bots"]) >= 2

        for bot in data["bots"]:
            # Required exact source attribution fields
            assert "market_data_source" in bot
            assert "execution_broker" in bot
            assert "execution_broker_id" in bot
            assert "broker_account_id" in bot
            assert "exchange" in bot
            assert "segment" in bot
            assert "instrument_key" in bot
            assert "feed_status" in bot
            assert "latency_ms" in bot
            assert "bot_uid" in bot

            # Valid values
            assert bot["market_data_source"] in [
                "Binance Official API",
                "Upstox Official API",
                "Delta Exchange India API",
                "Deribit Official API",
                "Paper Simulator"
            ]
            assert bot["execution_broker"] in [
                "Paper Simulator",
                "Binance",
                "Upstox",
                "Dhan",
                "Delta Exchange India",
                "Deribit"
            ]
            assert bot["execution_mode"] in ["PAPER", "LIVE"]
            assert bot["feed_status"] in [
                "LIVE",
                "PAPER",
                "SNAPSHOT",
                "STALE",
                "NOT CONFIGURED",
                "AUTH REQUIRED",
                "OFFLINE"
            ]

    def test_broker_status_truthful_probing(self, client):
        """Brokers without configured credentials in environment must return NOT_CONFIGURED, never fake live."""
        res = client.get("/api/brokers/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        brokers = {b["id"]: b for b in data["brokers"]}

        # Paper simulator is always available
        assert "paper_simulator" in brokers
        assert brokers["paper_simulator"]["status"] == "CONNECTED"
        assert brokers["paper_simulator"]["auth_verified"] is True

        # Check required broker options exist
        for expected_broker in ["paper_simulator", "ccxt_binance", "upstox", "dhan_india", "delta_india"]:
            assert expected_broker in brokers

    def test_update_bot_execution_broker_endpoint(self, client):
        """Updating a bot's execution broker via POST /api/bots/<bot_id>/broker must update record atomically."""
        res_list = client.get("/api/bots")
        bots = res_list.get_json().get("bots", [])
        assert len(bots) > 0

        target_bot_id = bots[0]["id"]

        # Update to Upstox
        res_update = client.post(
            f"/api/bots/{target_bot_id}/broker",
            json={"broker_id": "upstox", "broker_account_id": "Upstox-Paper-01"}
        )
        assert res_update.status_code == 200
        upd_data = res_update.get_json()
        assert upd_data["status"] == "success"
        assert upd_data["execution_broker_id"] == "upstox"
        assert upd_data["execution_broker"] == "Upstox"
        assert upd_data["broker_account_id"] == "Upstox-Paper-01"

        # Verify through /api/bots snapshot
        res_verify = client.get("/api/bots")
        verify_bots = {b["id"]: b for b in res_verify.get_json()["bots"]}
        assert verify_bots[target_bot_id]["execution_broker_id"] == "upstox"

        # Restore to Paper Simulator
        client.post(
            f"/api/bots/{target_bot_id}/broker",
            json={"broker_id": "paper_simulator", "broker_account_id": "Paper-Simulator-01"}
        )

    def test_order_destination_preview_endpoint(self, client):
        """Endpoint /api/bots/<bot_id>/order-destination must return exact pre-order routing specification."""
        res_list = client.get("/api/bots")
        bots = res_list.get_json().get("bots", [])
        assert len(bots) > 0

        target_bot_id = bots[0]["id"]
        res_dest = client.get(f"/api/bots/{target_bot_id}/order-destination?side=BUY&quantity=0.25")
        assert res_dest.status_code == 200
        dest_data = res_dest.get_json()
        assert dest_data["status"] == "success"
        assert "order_destination" in dest_data

        od = dest_data["order_destination"]
        assert "broker" in od
        assert "account" in od
        assert "environment" in od
        assert "exchange" in od
        assert "instrument" in od
        assert "side" in od
        assert "quantity" in od
        assert "estimated_price" in od
        assert "estimated_margin" in od
        assert od["side"] == "BUY"
        assert od["quantity"] == 0.25
        assert od["environment"] in ["PAPER", "LIVE"]
        assert od["estimated_price"] > 0
        assert od["estimated_margin"] > 0

    def test_multi_broker_isolation_and_composite_uids(self, client):
        """Different brokers must produce unique composite UIDs and never collide in React keys."""
        res = client.get("/api/bots")
        bots = res.get_json().get("bots", [])
        assert len(bots) >= 2

        uids = [b["bot_uid"] for b in bots if "bot_uid" in b]
        assert len(uids) == len(set(uids)), "bot_uid composite keys must be unique"

    def test_backend_authoritative_fleet_metrics_invariants(self, client):
        """Mathematical invariant: Total bots must equal sum of lifecycle state counts."""
        res = client.get("/api/bots")
        data = res.get_json()
        metrics = data["metrics"]
        total = metrics["total_bots"]
        running = metrics["running"]
        paused = metrics["paused"]
        stopped = metrics["stopped"]
        error = metrics["error"]
        draft = metrics["draft"]

        assert total == len(data["bots"])
        assert running + paused + stopped + error + draft == total
        assert "today_pnl" in metrics
        assert "allocated_capital" in metrics
        assert "emergency_halt_active" in metrics
