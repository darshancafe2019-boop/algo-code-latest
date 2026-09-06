"""
Automated Test Suite: Quant.OS Live Market Data Monitoring & Provider Telemetry
================================================================================
Comprehensive verification covering:
1. Exact source identification & broker-wise segregation.
2. Safe PAPER mode invariants (TRADING_MODE=PAPER, LIVE_TRADING=false).
3. Truthful unconfigured provider status detection (no fake live statuses).
4. Dynamic 4 status cards telemetry generation (Feed, Stale, Cache, Stream).
5. Stale lockout protection behavior.
6. Thread-locked idempotent feed synchronization.
7. Zero credential leakage verification.
8. Flask API endpoints contract validation (/api/market-health, /api/system/providers, etc.).
"""

import os
import json
import pytest
import threading
from datetime import datetime, timezone

from src.market_data.live_market_data_service import (
    LiveMarketDataService,
    global_live_market_data_service,
)
from src.market_data.cache_engine import global_market_cache
from src.market_data.stale_protection import global_stale_protection


@pytest.fixture
def service():
    return LiveMarketDataService()


@pytest.fixture
def app_client():
    from dashboard import app
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestLiveMarketDataMonitoring:
    """Test suite for live market-data monitoring and telemetry."""

    def test_provider_matrix_exact_source_identification(self, service):
        """Verify each provider has exact source identification and strict segregation."""
        matrix = service.probe_providers()
        assert len(matrix) >= 5

        provider_ids = [p["provider_id"] for p in matrix]
        assert "dhan" in provider_ids
        assert "upstox" in provider_ids
        assert "delta_india" in provider_ids
        assert "binance" in provider_ids
        assert "paper_simulator" in provider_ids

        # Verify exact sources
        dhan = next(p for p in matrix if p["provider_id"] == "dhan")
        assert dhan["exact_source"] == "Dhan HQ API v2"
        assert dhan["broker_account"] == "ba_dhan_primary"
        assert dhan["category"] == "INDIA"

        binance = next(p for p in matrix if p["provider_id"] == "binance")
        assert "Binance Public REST & WebSocket Stream" in binance["exact_source"]
        assert binance["broker_account"] == "ba_binance_public"
        assert binance["category"] == "CRYPTO"

        delta = next(p for p in matrix if p["provider_id"] == "delta_india")
        assert "Delta India REST & Public WebSocket" in delta["exact_source"]
        assert delta["broker_account"] == "ba_delta_primary"
        assert delta["category"] == "CRYPTO"

    def test_safe_paper_mode_invariants(self, service):
        """Verify all providers operate under PAPER environment by default."""
        matrix = service.probe_providers()
        for p in matrix:
            assert p["environment"] == "PAPER", f"Provider {p['provider_id']} must be in PAPER mode"

    def test_truthful_unconfigured_statuses(self, service):
        """Verify unconfigured/unauthenticated providers do not show fake CONNECTED or LIVE status."""
        matrix = service.probe_providers()

        # Deribit should be NOT_CONFIGURED if no credentials in env
        deribit = next(p for p in matrix if p["provider_id"] == "deribit")
        if not (os.getenv("DERIBIT_API_KEY") or os.getenv("DERIBIT_CLIENT_ID")):
            assert deribit["status"] == "NOT_CONFIGURED"
            assert deribit["error_details"] is not None

        # OANDA should be NOT_CONFIGURED if no credentials in env
        oanda = next(p for p in matrix if p["provider_id"] == "oanda")
        if not (os.getenv("OANDA_API_KEY") or os.getenv("OANDA_ACCOUNT_ID")):
            assert oanda["status"] == "NOT_CONFIGURED"
            assert oanda["error_details"] is not None

    def test_provider_capability_integrity(self, service):
        """Verify capability flags match actual provider capabilities (no mock options for Binance spot/futures)."""
        matrix = service.probe_providers()

        binance = next(p for p in matrix if p["provider_id"] == "binance")
        assert binance["options"] is False
        assert binance["futures"] is True
        assert binance["spot"] is True

        delta = next(p for p in matrix if p["provider_id"] == "delta_india")
        assert delta["options"] is True
        assert delta["futures"] is True

        oanda = next(p for p in matrix if p["provider_id"] == "oanda")
        assert oanda["options"] is False
        assert oanda["futures"] is False
        assert oanda["spot"] is True

    def test_top_status_cards_telemetry_structure(self, service):
        """Verify dynamic 4 status cards telemetry contains all required metric fields."""
        telemetry = service.get_telemetry_summary()
        assert telemetry["status"] == "success"
        assert "timestamp" in telemetry

        # 1. Feed Status Card
        feed = telemetry["feed_health"]
        assert "is_feed_live" in feed
        assert "connected_providers_count" in feed
        assert "total_providers_count" in feed
        assert "active_streams_count" in feed
        assert "latency_ms" in feed
        assert "status" in feed

        # 2. Stale Lockout Card
        stale = telemetry["stale_protection"]
        assert "is_system_stale" in stale
        assert "stale_threshold_sec" in stale
        assert "lockout_status" in stale
        assert "signals_blocked" in stale
        assert "orders_blocked" in stale

        # 3. Cache Layer Card
        cache = telemetry["cache"]
        assert "driver" in cache
        assert "cached_keys_count" in cache
        assert "hit_ratio_pct" in cache
        assert "hits_count" in cache

        # 4. Stream Engine Card
        stream = telemetry["stream_engine"]
        assert "engine_status" in stream
        assert "active_websockets_count" in stream
        assert "reconnect_count" in stream
        assert "sse_status" in stream

    def test_stale_lockout_trigger(self, service):
        """Verify that when a stream is stale, lockout triggers safely."""
        import time
        # Record tick 30 seconds ago
        global_stale_protection._feed_last_active["BTCUSDT"] = time.time() - 30.0

        telemetry = service.get_telemetry_summary()
        stale = telemetry["stale_protection"]
        assert stale["is_system_stale"] is True
        assert stale["lockout_status"] == "TRIGGERED"
        assert stale["signals_blocked"] is True
        assert stale["orders_blocked"] is True

        # Clean up
        global_stale_protection._feed_last_active.pop("BTCUSDT", None)

    def test_idempotent_feed_sync(self, service):
        """Verify feed synchronization is idempotent and thread-safe."""
        results = []

        def run_sync():
            res = service.sync_feeds(force=True)
            results.append(res)

        threads = [threading.Thread(target=run_sync) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(results) == 5
        success_count = sum(1 for r in results if r["status"] == "success")
        in_progress_count = sum(1 for r in results if r["status"] == "in_progress")
        assert success_count >= 1
        assert success_count + in_progress_count == 5

    def test_no_credential_leakage(self, service):
        """Verify no secret tokens or passwords exist in telemetry or matrix output."""
        matrix = service.probe_providers()
        matrix_str = json.dumps(matrix)

        # Check for token-like substrings or secret keywords
        assert "password" not in matrix_str.lower()
        assert "secret_key" not in matrix_str.lower()
        assert "access_token" not in matrix_str.lower()

    def test_flask_endpoints(self, app_client):
        """Verify all dashboard live market data endpoints return valid HTTP 200 JSON."""
        # 1. Market health telemetry
        res = app_client.get("/api/market-health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "feed_health" in data
        assert "stale_protection" in data

        # 2. Market live telemetry alias
        res_alias = app_client.get("/api/market/live/telemetry")
        assert res_alias.status_code == 200

        # 3. System providers matrix
        res_prov = app_client.get("/api/system/providers")
        assert res_prov.status_code == 200
        prov_data = res_prov.get_json()
        assert prov_data["status"] == "success"
        assert len(prov_data["providers"]) >= 5

        # 4. Providers matrix alias
        res_mat = app_client.get("/api/market/providers/matrix")
        assert res_mat.status_code == 200

        # 5. Live sync POST
        res_sync = app_client.post("/api/market/live/sync", json={"force": True})
        assert res_sync.status_code == 200
        sync_data = res_sync.get_json()
        assert sync_data["status"] in ("success", "in_progress")

        # 6. Live diagnostics GET
        res_diag = app_client.get("/api/market/live/diagnostics")
        assert res_diag.status_code == 200
        diag_data = res_diag.get_json()
        assert diag_data["status"] == "success"
        assert "diagnostics" in diag_data


def time_ms_ago(seconds_ago: float) -> int:
    import time
    return int((time.time() - seconds_ago) * 1000)
