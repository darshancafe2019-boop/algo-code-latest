"""
Automated Test Suite for Canonical Instrument Resolution, Provider Routing,
Circuit Breakers, Error Fingerprinting, and System Reliability Center.
"""

import pytest
import ccxt
from src.instrument_resolver import (
    InstrumentResolver,
    ResolutionStatus,
    AssetClass,
    InstrumentType,
    global_instrument_resolver,
)
from src.provider_manager import (
    ProviderManager,
    CircuitBreaker,
    CircuitState,
    ProviderStatus,
    global_provider_manager,
)
from src.error_ledger import (
    ErrorLedger,
    ErrorCategory,
    ErrorSeverity,
    IncidentStatus,
    global_error_ledger,
)
from src import db
import dashboard


@pytest.fixture
def client():
    dashboard.app.config["TESTING"] = True
    with dashboard.app.test_client() as client:
        yield client


class TestCanonicalInstrumentResolution:
    def test_01_btc_options_category_rejection(self):
        """Verify that generic category label 'BTC-OPTIONS' is rejected deterministically."""
        res = global_instrument_resolver.resolve("BTC-OPTIONS")
        assert res.is_valid is False
        assert res.status == ResolutionStatus.CATEGORY_ONLY
        assert res.error_code == "INSTRUMENT_CATEGORY_NOT_EXECUTABLE"
        assert "not an executable contract" in res.reason
        assert len(res.candidate_symbols) > 0

    def test_02_category_labels_rejection(self):
        """Verify ETH-OPTIONS, CRYPTO-OPTIONS, and NIFTY-OPTIONS are rejected."""
        for sym in ["ETH-OPTIONS", "CRYPTO-OPTIONS", "NIFTY-OPTIONS", "BTC-FUTURES"]:
            res = global_instrument_resolver.resolve(sym)
            assert res.is_valid is False
            assert res.status == ResolutionStatus.CATEGORY_ONLY

    def test_03_valid_spot_resolution(self):
        """Verify BTC/USDT resolves to Binance Spot."""
        res = global_instrument_resolver.resolve("BTC/USDT")
        assert res.is_valid is True
        assert res.status == ResolutionStatus.RESOLVED
        assert res.instrument is not None
        assert res.instrument.instrument_id == "BINANCE:BTCUSDT:SPOT"
        assert res.instrument.provider == "binance_spot"
        assert res.instrument.instrument_type == InstrumentType.SPOT
        assert res.instrument.base_asset == "BTC"
        assert res.instrument.quote_asset == "USDT"

    def test_04_alias_and_futures_resolution(self):
        """Verify BTC-PERP and BTC/USDT:USDT resolve to Binance Futures."""
        res_perp = global_instrument_resolver.resolve("BTC-PERP")
        assert res_perp.is_valid is True
        assert res_perp.instrument.instrument_type == InstrumentType.PERPETUAL
        assert res_perp.instrument.provider == "binance_futures"

        res_direct = global_instrument_resolver.resolve("BTC/USDT:USDT")
        assert res_direct.is_valid is True
        assert res_direct.instrument.instrument_id == "BINANCE:BTCUSDT:PERPETUAL"

    def test_05_options_contract_resolution(self):
        """Verify formatted dated option contract resolves with strike and call/put."""
        res = global_instrument_resolver.resolve("BTC-260327-70000-C")
        assert res.is_valid is True
        assert res.instrument.instrument_type == InstrumentType.OPTION
        assert res.instrument.strike == 70000.0
        assert res.instrument.option_type == "CALL"
        assert res.instrument.provider == "deribit_options"

    def test_06_ambiguous_symbol_rejection(self):
        """Verify generic queries like 'BTC' return AMBIGUOUS with suggestions."""
        res = global_instrument_resolver.resolve("BTC")
        assert res.is_valid is False
        assert res.status == ResolutionStatus.AMBIGUOUS
        assert len(res.candidate_symbols) >= 2


class TestProviderRoutingAndCircuitBreaker:
    def test_07_circuit_breaker_trip_and_half_open(self):
        """Verify circuit breaker trips to OPEN after threshold failures and probes HALF_OPEN."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=0.1)
        assert cb.state == CircuitState.CLOSED
        assert cb.can_attempt() is True

        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.CLOSED

        # 3rd failure trips the breaker
        tripped = cb.record_failure()
        assert tripped is True
        assert cb.state == CircuitState.OPEN
        assert cb.can_attempt() is False

        # Wait for recovery timeout
        import time
        time.sleep(0.15)
        assert cb.can_attempt() is True
        assert cb.state == CircuitState.HALF_OPEN

        # Success resets to CLOSED
        cb.record_success()
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_08_unsupported_options_execution_error(self):
        """Verify fetching options without configured options provider throws clean NotSupported."""
        pm = ProviderManager()
        with pytest.raises(ccxt.NotSupported) as exc_info:
            pm.fetch_ohlcv_safe("BTC-260327-70000-C", "1h")
        assert "OPTIONS EXECUTION UNSUPPORTED" in str(exc_info.value)

    def test_09_invalid_symbol_fails_before_provider_request(self):
        """Verify unresolvable symbol is blocked before any exchange adapter request."""
        pm = ProviderManager()
        with pytest.raises(ValueError) as exc_info:
            pm.fetch_ohlcv_safe("BTC-OPTIONS", "1h")
        assert "INSTRUMENT_RESOLUTION_FAILED" in str(exc_info.value)


class TestErrorLedgerAndIncidentDeduplication:
    def test_10_error_fingerprinting_and_deduplication(self):
        """Verify 15 duplicate errors aggregate to 1 incident with occurrence_count = 15."""
        db.init_db()
        exc = Exception("binance does not have market symbol BTC-OPTIONS")
        bot_id = "test-dedup-bot-99"

        first_inc = global_error_ledger.record_incident(
            exc=exc,
            bot_id=bot_id,
            symbol="BTC-OPTIONS",
            operation="process_cycle",
            stack_trace="Traceback...",
        )
        assert first_inc["id"] > 0
        inc_id = first_inc["id"]

        # Simulate 14 more duplicate runner cycles
        for _ in range(14):
            res = global_error_ledger.record_incident(
                exc=exc,
                bot_id=bot_id,
                symbol="BTC-OPTIONS",
                operation="process_cycle",
                stack_trace="Traceback...",
            )
            assert res["action"] == "DEDUPLICATED_INCREMENT"
            assert res["id"] == inc_id

        # Query from DB
        row = db.get_incident_by_id(inc_id)
        assert row is not None
        assert row["occurrence_count"] >= 15
        assert row["error_code"] == "INSTRUMENT_NOT_FOUND"
        assert row["is_retryable"] == 0
        assert "generic asset category" in row["root_cause"]

    def test_11_exception_classification(self):
        """Verify classification of various exception types."""
        # 1. Bad Symbol
        code, cat, sev, retryable, plain, root, rec = ErrorLedger.classify_exception(
            ccxt.BadSymbol("binance does not have market symbol BTC-OPTIONS"),
            symbol_query="BTC-OPTIONS"
        )
        assert code == "INSTRUMENT_NOT_FOUND"
        assert retryable is False
        assert sev == ErrorSeverity.ERROR

        # 2. Rate Limit
        code, cat, sev, retryable, plain, root, rec = ErrorLedger.classify_exception(
            ccxt.RateLimitExceeded("429 Too Many Requests")
        )
        assert code == "PROVIDER_RATE_LIMIT"
        assert retryable is True
        assert sev == ErrorSeverity.WARNING

        # 3. Network Error
        code, cat, sev, retryable, plain, root, rec = ErrorLedger.classify_exception(
            ccxt.NetworkError("Connection timed out")
        )
        assert code == "PROVIDER_CONNECTIVITY"
        assert retryable is True


class TestProcessManagerPreflightGate:
    def test_12_process_manager_blocks_invalid_symbol_start(self):
        """Verify ProcessManager refuses to start a bot configured with BTC-OPTIONS."""
        db.init_db()
        bot_id = "test-bad-symbol-bot"
        db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
        now_iso = "2026-08-20T12:00:00Z"
        db.safe_execute(
            """
            INSERT INTO bot_instances (id, name, symbol, strategy, timeframe, allocated_capital, status, execution_mode, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 10000.0, 'STOPPED', 'PAPER', ?, ?)
            """,
            (bot_id, "Bad Symbol Bot", "BTC-OPTIONS", "OPTIONS", "1h", now_iso, now_iso),
        )

        from src.process_manager import BotProcessManager
        mgr = BotProcessManager(bot_id)
        pre = mgr.validate_pre_flight_start()
        assert pre["valid"] is False
        assert "failed canonical resolution" in pre["reason"]


class TestReliabilityRestAPIs:
    def test_13_reliability_incidents_api(self, client):
        """Test GET /api/reliability/incidents, /summary, /providers, and POST /action."""
        # 1. Summary
        res_sum = client.get("/api/reliability/summary")
        assert res_sum.status_code == 200
        data_sum = res_sum.get_json()
        assert data_sum["status"] == "success"
        assert "active_incidents" in data_sum["summary"]

        # 2. Providers
        res_prov = client.get("/api/reliability/providers")
        assert res_prov.status_code == 200
        data_prov = res_prov.get_json()
        assert data_prov["status"] == "success"
        assert len(data_prov["providers"]) >= 3

        # 3. Incidents
        res_inc = client.get("/api/reliability/incidents?limit=10")
        assert res_inc.status_code == 200
        data_inc = res_inc.get_json()
        assert data_inc["status"] == "success"
        assert "incidents" in data_inc

        # 4. Action
        if data_inc["incidents"]:
            first_id = data_inc["incidents"][0]["id"]
            res_act = client.post(
                "/api/reliability/action",
                json={"incident_id": first_id, "action": "ACKNOWLEDGE"}
            )
            assert res_act.status_code == 200
            assert res_act.get_json()["new_status"] == "ACKNOWLEDGED"
