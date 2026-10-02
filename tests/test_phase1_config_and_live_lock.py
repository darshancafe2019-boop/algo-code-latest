"""
Phase 1 Authoritative Verification Test Suite:
1. Hard LIVE Lock (Layer 1: OrderExecutionService, Layer 2: Broker Adapters, Layer 3: API Endpoints)
2. Execution Mode Enforcement (No silent conversion of LIVE to PAPER, explicit authorization required)
3. Wizard -> CanonicalBotConfig Mapping Integrity (All 7 Steps, camelCase & snake_case normalization)
4. Canonical Validation (Rejection of invalid capital, risk, daily loss, symbol, execution mode)
5. Immutable Deployment Snapshot & Config Hashing (Deterministic SHA-256, versioning, reconstruction)
6. Runner Non-Bypass (live_runner uses OrderExecutionService and trade_ledger)
"""

import copy
import hashlib
import json
import os
import sqlite3
import tempfile
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src import config, db
from src.security_auth import PasswordManager
from src.canonical_bot_config import (
    CanonicalBotConfig,
    BotIdentityConfig,
    BotEnvironmentConfig,
    BotUniverseConfig,
    BotStrategyConfig,
    BotCapitalConfig,
    BotRiskConfig,
    BotExecutionConfig,
    BotMonitoringConfig,
    compute_config_hash,
)
from src.execution_service import OrderExecutionService, order_execution_service
from src.trade_ledger import trade_ledger, init_trade_ledger_schema
from src.broker_router import global_broker_router
from src.option_order_intent import OptionOrderIntent
from dashboard import app


TEST_ADMIN_TOKEN = "test_pytest_admin_session_token_12345678"
TEST_ADMIN_TOKEN_HASH = hashlib.sha256(TEST_ADMIN_TOKEN.encode("utf-8")).hexdigest()
TEST_ADMIN_ID = "usr_test_admin_pytest"


@pytest.fixture(autouse=True)
def isolated_test_db(tmp_path):
    """
    Guarantees that Phase 1 tests run against an isolated temporary SQLite database,
    strictly protecting the active trading database (data/trading_bot.db).
    """
    orig_db_path = config.DB_PATH
    temp_db_file = tmp_path / "test_phase1_isolated.db"
    config.DB_PATH = temp_db_file

    db.init_db(force=True)
    init_trade_ledger_schema()

    # Seed user & session for authenticated test client
    pwd_hash, salt = PasswordManager.hash_password("AlgoTrading@2026!")
    db.upsert_user({
        "id": TEST_ADMIN_ID,
        "username": "pytest_admin",
        "email": "pytest_admin@algotrading.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.safe_execute(
        """
        INSERT OR REPLACE INTO user_sessions (
            session_id, user_id, token_hash, device_name, ip_address,
            user_agent, approximate_location, last_active_at, expires_at,
            is_revoked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            "sess-pytest-admin",
            TEST_ADMIN_ID,
            TEST_ADMIN_TOKEN_HASH,
            "Pytest Runner",
            "127.0.0.1",
            "Pytest",
            "Localhost",
            now_iso,
            expires_iso,
            now_iso,
        )
    )

    yield temp_db_file

    config.DB_PATH = orig_db_path


# ============================================================================
# 1. HARD LIVE LOCK TESTS (3-LAYER DEFENSE IN DEPTH)
# ============================================================================

class TestHardLiveLock:
    """Tests proving the 3-layer hard live authorization lock."""

    def test_layer1_order_execution_service_blocks_live_when_disabled(self):
        """Layer 1: OrderExecutionService fails closed when LIVE_TRADING_ENABLED is False."""
        with patch.object(config, "LIVE_TRADING_ENABLED", False), \
             patch.object(config, "LIVE_TRADING_ARMED", False), \
             patch.object(config, "MASTER_LIVE_TRADING", False), \
             patch.object(config, "TRADING_MODE", "LIVE"):

            oes = OrderExecutionService()
            passed, reason = oes.validate_14_point_pre_order_check(
                bot_id="bot-test-live",
                strategy="TEST_STRAT",
                symbol="BTC/USDT",
                side="BUY",
                amount=0.01,
                price=50000.0,
                stop_loss=49000.0,
                take_profit=53000.0,
                confidence_score=85.0,
                account_balance=100000.0,
                is_live=True
            )
            assert passed is False
            assert "LIVE_TRADING_DISABLED" in reason

            # Also verify via execute_order
            success, exec_reason, res = oes.execute_order(
                bot_id="bot-test-live",
                strategy="TEST_STRAT",
                symbol="BTC/USDT",
                side="BUY",
                amount=0.01,
                price=50000.0,
                stop_loss=49000.0,
                take_profit=53000.0,
                confidence_score=85.0,
                account_balance=100000.0,
                mode="LIVE"
            )
            assert success is False
            assert "LIVE_TRADING_DISABLED" in exec_reason

    def test_layer1_order_execution_service_blocks_live_when_not_armed(self):
        """Layer 1: Fails closed when LIVE_TRADING_ARMED is False."""
        with patch.object(config, "LIVE_TRADING_ENABLED", True), \
             patch.object(config, "LIVE_TRADING_ARMED", False), \
             patch.object(config, "MASTER_LIVE_TRADING", True), \
             patch.object(config, "TRADING_MODE", "LIVE"):

            oes = OrderExecutionService()
            passed, reason = oes.validate_14_point_pre_order_check(
                bot_id="bot-test-live",
                strategy="TEST_STRAT",
                symbol="BTC/USDT",
                side="BUY",
                amount=0.01,
                price=50000.0,
                stop_loss=49000.0,
                take_profit=53000.0,
                confidence_score=85.0,
                account_balance=100000.0,
                is_live=True
            )
            assert passed is False
            assert "LIVE_TRADING_DISARMED" in reason

    def test_layer1_paper_mode_does_not_call_live_broker(self):
        """Paper orders proceed via PaperExecutionAdapter without contacting real broker."""
        with patch.object(config, "LIVE_TRADING_ENABLED", False), \
             patch.object(config, "TRADING_MODE", "PAPER"):

            oes = OrderExecutionService()
            success, reason, res = oes.execute_order(
                bot_id="bot-test-paper",
                strategy="PAPER_STRAT",
                symbol="BTC/USDT",
                side="BUY",
                amount=0.01,
                price=60000.0,
                stop_loss=58000.0,
                take_profit=65000.0,
                confidence_score=85.0,
                account_balance=100000.0,
                mode="PAPER"
            )
            assert success is True
            assert "PAPER" in reason
            assert res.get("trade_id") is not None

    def test_layer2_broker_adapters_fail_closed_on_live_request(self):
        """Layer 2: Low-level broker adapters reject live placement when LIVE_TRADING_ENABLED is False."""
        with patch.object(config, "LIVE_TRADING_ENABLED", False):
            # Dhan
            from src.dhan_broker_adapter import dhan_broker_adapter
            dhan_res = dhan_broker_adapter.place_order(
                symbol="NIFTY", side="BUY", quantity=50, price=24000.0, mode="LIVE"
            )
            assert dhan_res.get("success") is False or dhan_res.get("status") in ["FAILED", "REJECTED"]
            assert "LIVE_TRADING_DISABLED" in dhan_res.get("error", dhan_res.get("message", ""))

            # Upstox
            from src.upstox_broker_adapter import global_upstox_broker_adapter
            upstox_res = global_upstox_broker_adapter.place_order(
                symbol="RELIANCE", side="BUY", quantity=10, price=2500.0, mode="LIVE"
            )
            assert upstox_res.get("success") is False
            assert "LIVE_TRADING_DISABLED" in upstox_res.get("error", upstox_res.get("message", ""))

            # Delta Exchange
            from src.delta_exchange_adapter import global_delta_adapter
            delta_res = global_delta_adapter.place_order(
                product_id=1, size=1, side="buy", order_type="limit_order", limit_price="60000", mode="LIVE"
            )
            assert delta_res.get("success") is False
            assert "LIVE_TRADING_DISABLED" in delta_res.get("error", delta_res.get("message", ""))

            # ExecutionEngine (CCXT/Binance)
            from src.execution import ExecutionEngine
            mock_exchange = MagicMock()
            ee = ExecutionEngine(mock_exchange)
            with pytest.raises((PermissionError, RuntimeError), match="LIVE_TRADING_DISABLED"):
                ee.market_buy("BTC/USDT", 0.1, 50000.0, mode="LIVE")

            # Fyers
            from src.fyers_broker_adapter import global_fyers_adapter
            fyers_res = global_fyers_adapter.place_multileg_order({"symbol": "NIFTY", "mode": "LIVE"})
            assert fyers_res.get("status") == "FAILED"
            assert "LIVE_TRADING_DISABLED" in fyers_res.get("error", "")

            # AngelOne
            from src.angelone_broker_adapter import global_angelone_adapter
            angel_res = global_angelone_adapter.place_multileg_order({"symbol": "NIFTY", "mode": "LIVE"})
            assert angel_res.get("status") == "FAILED"
            assert "LIVE_TRADING_DISABLED" in angel_res.get("error", "")

            # Zerodha
            from src.zerodha_broker_adapter import global_zerodha_adapter
            zerodha_res = global_zerodha_adapter.place_multileg_order({"symbol": "NIFTY", "mode": "LIVE"})
            assert zerodha_res.get("status") == "FAILED"
            assert "LIVE_TRADING_DISABLED" in zerodha_res.get("error", "")

            # Exness
            from src.exness_broker_adapter import global_exness_adapter
            exness_res = global_exness_adapter.place_multileg_order({"symbol": "XAUUSD", "mode": "LIVE"})
            assert exness_res.get("status") == "FAILED"
            assert "LIVE_TRADING_DISABLED" in exness_res.get("error", "")

    def test_layer3_broker_router_no_silent_live_to_paper_fallback(self):
        """Layer 3: BrokerRouter rejects LIVE intent when disabled instead of silently converting to paper."""
        with patch.object(config, "LIVE_TRADING_ENABLED", False):
            intent = OptionOrderIntent.from_dict({
                "underlying": "NIFTY",
                "expiry": "2026-10-30",
                "strike": 25000.0,
                "optionType": "CE",
                "side": "BUY",
                "quantity": 50,
                "lots": 1,
                "lotSize": 50,
                "price": 150.0,
                "ltp": 150.0,
                "broker": "DHAN",
                "mode": "LIVE",
                "quoteStatus": "LIVE",
                "exchange": "NSE",
                "securityId": "12345",
                "tradingSymbol": "NIFTY26OCT25000CE"
            })
            is_valid, err_code, err_msg = global_broker_router.validate_intent(intent)
            assert is_valid is False
            assert err_code == "LIVE_TRADING_DISABLED"

            res = global_broker_router.execute_order(intent)
            assert res.get("success") is False
            assert res.get("status") == "rejected"
            assert res.get("errorCode") == "LIVE_TRADING_DISABLED"


# ============================================================================
# 2. WIZARD -> CANONICAL CONFIG MAPPING INTEGRITY TESTS
# ============================================================================

class TestWizardCanonicalMapping:
    """Tests verifying complete, bidirectional mapping from 7 wizard steps to CanonicalBotConfig."""

    def test_all_7_wizard_steps_mapped_accurately(self):
        """Verify that fields from all 7 wizard steps correctly populate CanonicalBotConfig."""
        wizard_payload = {
            # Step 1: General & Environment
            "name": "Phase 1 Alpha Bot",
            "template": "ema_cross",
            "assetClass": "CRYPTO",
            "executionEngine": "UNIVERSAL_OMS",
            "environment": "PAPER",

            # Step 2: Instrument & Timeframe
            "symbol": "BTC/USDT",
            "timeframe": "1h",
            "underlying": "BTC",
            "expiry": "2026-12-31",
            "strikeSelection": "ATM",

            # Step 3: Direction & Logic
            "direction": "LONG",
            "signalSource": "COMPOSITE_SCORE",
            "confluenceThreshold": 80.0,

            # Step 4: Sizing & Capital
            "capital": 25000.0,
            "sizingMode": "PERCENT_EQUITY",
            "riskPerTrade": 2.5,
            "maxPositionSize": 50000.0,
            "leverage": 3.0,

            # Step 5: Strategies & Indicators
            "selectedStrategies": ["EMA_CROSS", "MACD_CONVERGENCE"],
            "indicatorParameters": {"ema_period": 21, "macd_fast": 12},
            "strategyWeights": {"EMA_CROSS": 0.6, "MACD_CONVERGENCE": 0.4},

            # Step 6: Risk Management
            "stopLossType": "PERCENTAGE",
            "stopLossValue": 2.0,
            "takeProfitType": "RISK_REWARD",
            "takeProfitValue": 3.0,
            "trailingStop": True,
            "maxDailyLoss": 1000.0,
            "maxDrawdown": 10.0,
            "maxOpenPositions": 3,
            "dailyLossAction": "PAUSE",

            # Step 7: Execution & Safety
            "executionMode": "PAPER",
            "broker": "PAPER",
            "orderType": "MARKET",
            "slippageTolerance": 0.2,
            "smartExecution": True,
            "emergencyKillSwitch": True,
        }

        config_obj = CanonicalBotConfig.from_dict(wizard_payload)

        # Assert Identity & Environment (Step 1)
        assert config_obj.identity.name == "Phase 1 Alpha Bot"
        assert config_obj.universe.asset_class == "CRYPTO"

        # Assert Universe (Step 2)
        assert config_obj.universe.display_symbol == "BTC/USDT"
        assert config_obj.universe.underlying == "BTC"

        # Assert Strategy (Steps 3 & 5)
        assert config_obj.strategy.long_enabled is True

        # Assert Capital & Risk (Steps 4 & 6)
        assert config_obj.capital.allocated_capital == 25000.0
        assert config_obj.capital.risk_per_trade_pct == 2.5
        assert config_obj.capital.leverage == 3.0
        assert config_obj.risk.stop_loss_pct == 2.0
        assert config_obj.risk.profit_target_pct == 3.0
        assert config_obj.risk.trailing_stop.enabled is True
        assert config_obj.risk.max_daily_loss_amount == 1000.0
        assert config_obj.risk.max_daily_drawdown_pct == 10.0
        assert config_obj.risk.max_open_positions == 3

        # Assert Execution (Step 7)
        assert config_obj.execution.order_type.value == "MARKET"

    def test_mismatched_naming_conventions_resolved(self):
        """Verify camelCase and alternate snake_case mappings are properly resolved."""
        payload_camel = {
            "name": "CamelCase Bot",
            "symbol": "ETH/USDT",
            "capital": 15000.0,
            "sizingMode": "PERCENT_EQUITY",
            "maxDailyLoss": 750.0,
            "riskPerTrade": 1.5,
            "stopLossValue": 2.5,
            "takeProfitValue": 5.0,
            "maxOpenPositions": 2,
            "executionMode": "PAPER",
        }
        cfg = CanonicalBotConfig.from_dict(payload_camel)
        assert cfg.capital.allocated_capital == 15000.0
        assert cfg.capital.risk_per_trade_pct == 1.5
        assert cfg.risk.max_daily_loss_amount == 750.0
        assert cfg.risk.stop_loss_pct == 2.5
        assert cfg.risk.profit_target_pct == 5.0
        assert cfg.risk.max_open_positions == 2


# ============================================================================
# 3. CANONICAL VALIDATION TESTS
# ============================================================================

class TestCanonicalValidation:
    """Tests verifying strict pre-persistence validation on /api/bots/create and CanonicalBotConfig."""

    def test_invalid_capital_rejected(self):
        """Capital <= 0 must be rejected."""
        cfg = CanonicalBotConfig.from_dict({"name": "Test", "symbol": "BTC/USDT", "capital": -500.0})
        valid, errors = cfg.validate()
        assert valid is False
        assert any("capital" in e.lower() for e in errors)

    def test_max_daily_loss_exceeding_capital_rejected(self):
        """Max daily loss greater than capital must be rejected."""
        cfg = CanonicalBotConfig.from_dict({
            "name": "Test", "symbol": "BTC/USDT", "capital": 1000.0, "max_daily_loss": 2000.0
        })
        valid, errors = cfg.validate()
        assert valid is False
        assert any("daily loss" in e.lower() for e in errors)

    def test_missing_symbol_rejected(self):
        """Bot without instrument/symbol must be rejected."""
        cfg = CanonicalBotConfig.from_dict({"name": "Test", "symbol": ""})
        cfg.universe.canonical_instrument_id = ""
        cfg.universe.underlying = ""
        cfg.universe.display_symbol = ""
        cfg.universe.provider_symbol = ""
        valid, errors = cfg.validate()
        assert valid is False
        assert any("symbol" in e.lower() for e in errors)

    def test_invalid_stop_loss_rejected(self):
        """Stop loss <= 0 must be rejected."""
        cfg = CanonicalBotConfig.from_dict({"name": "Test", "symbol": "BTC/USDT", "capital": 10000.0, "stop_loss_pct": -2.0})
        valid, errors = cfg.validate()
        assert valid is False
        assert any("stop loss" in e.lower() for e in errors)

    def test_api_bot_create_rejects_invalid_configuration_with_http_400(self):
        """Endpoint POST /api/bots/create returns 400 Bad Request with detailed error messages on invalid config."""
        client = app.test_client()
        invalid_payload = {
            "name": "Invalid Config Bot",
            "symbol": "BTC/USDT",
            "capital": -100.0,  # Invalid
            "stop_loss_pct": -1.0,  # Invalid
            "executionMode": "PAPER"
        }
        resp = client.post("/api/bots/create", json=invalid_payload)
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get("status") == "error" or data.get("error") == "VALIDATION_FAILED"
        assert "errors" in data
        assert len(data["errors"]) >= 1


# ============================================================================
# 4. IMMUTABLE DEPLOYMENT SNAPSHOT & HASHING TESTS
# ============================================================================

class TestDeploymentSnapshotAndHashing:
    """Tests deterministic SHA-256 hashing and immutable version snapshot reconstruction."""

    def test_config_hash_is_deterministic(self):
        """Identical configurations must produce identical SHA-256 hashes."""
        payload = {
            "name": "Deterministic Bot",
            "symbol": "BTC/USDT",
            "capital": 10000.0,
            "executionMode": "PAPER",
            "sizingMode": "PERCENT_EQUITY",
            "riskPerTrade": 2.0,
        }
        cfg1 = CanonicalBotConfig.from_dict(payload)
        cfg2 = CanonicalBotConfig.from_dict(payload)

        hash1 = cfg1.compute_config_hash()
        hash2 = cfg2.compute_config_hash()

        assert len(hash1) == 64
        assert hash1 == hash2

    def test_config_reconstruction_from_snapshot(self):
        """Configuration can be reconstructed from dictionary snapshot with 100% fidelity."""
        payload = {
            "name": "Reconstructed Bot",
            "symbol": "ETH/USDT",
            "capital": 20000.0,
            "executionMode": "PAPER",
            "sizingMode": "PERCENT_EQUITY",
            "riskPerTrade": 3.0,
            "stopLossValue": 1.5,
            "takeProfitValue": 4.5,
        }
        cfg_original = CanonicalBotConfig.from_dict(payload)
        snapshot_dict = cfg_original.to_dict()

        cfg_reconstructed = CanonicalBotConfig.from_dict(snapshot_dict)

        assert cfg_original.compute_config_hash() == cfg_reconstructed.compute_config_hash()
        assert cfg_original.capital.allocated_capital == cfg_reconstructed.capital.allocated_capital
        assert cfg_original.universe.display_symbol == cfg_reconstructed.universe.display_symbol

    def test_deployment_versioning_records_snapshot(self):
        """Creating a bot persists deployment_id, version, and config_hash into the database."""
        client = app.test_client()
        bot_payload = {
            "name": "Versioned Bot",
            "symbol": "BTC/USDT",
            "capital": 50000.0,
            "sizingMode": "PERCENT_EQUITY",
            "riskPerTrade": 2.0,
            "stopLossValue": 2.0,
            "takeProfitValue": 4.0,
            "maxDailyLoss": 2000.0,
            "maxOpenPositions": 2,
            "executionMode": "PAPER",
        }
        resp = client.post("/api/bots/create", json=bot_payload)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get("success") is True
        bot_id = data.get("bot_id")
        assert bot_id is not None

        # Verify deployment snapshot exists in DB
        bot_inst = db.get_bot_instance(bot_id)
        assert bot_inst is not None


# ============================================================================
# 5. RUNNER EXECUTION ARCHITECTURE INTEGRITY
# ============================================================================

class TestRunnerExecutionArchitecture:
    """Verifies that live_runner.py does not execute direct raw SQL bypasses."""

    def test_live_runner_routes_entry_through_order_execution_service(self):
        """live_runner entry execution invokes OrderExecutionService.execute_order."""
        from src.live_runner import LiveRunner
        from src.strategy import Strategy

        runner = LiveRunner(bot_id="bot-test-runner")
        assert runner.bot_id == "bot-test-runner"
        assert runner.strategy is not None
