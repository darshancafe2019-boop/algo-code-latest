"""
Comprehensive Test Suite for Options Contract Resolution, Expiration Validation,
and Bot Start Safety Guards.

Tests all required error and success paths:
1. Rejection of generic categories ('BTC-OPTIONS', 'ETH-OPTIONS', 'NIFTY-OPTIONS')
2. Rejection of expired options contracts ('BTC-230101-20000-C')
3. Rejection of invalid strike prices ('BTC-260925-0-C')
4. Rejection of unconfigured options providers
5. Resolution of valid Binance Crypto Options ('BTC-260925-70000-C')
6. Resolution of valid Indian NSE Options ('NIFTY 24400 CE')
7. BotProcessManager pre-start gate rejection of generic 'BTC-OPTIONS'
8. BotProcessManager pre-start gate approval of valid 'BTC-260925-70000-C'
"""

import os
import pytest
from datetime import datetime, timezone
from src.instrument_resolver import (
    global_instrument_resolver,
    InstrumentResolver,
    ResolutionStatus,
)
from src.process_manager import BotProcessManager
import src.db as db


class TestOptionsContractResolution:
    """Test suite covering contract resolution and validation rules."""

    def test_generic_btc_options_category_rejection(self):
        """1. Never treat 'BTC-OPTIONS' as an executable contract."""
        res = global_instrument_resolver.resolve("BTC-OPTIONS")
        assert not res.is_valid
        assert res.status == ResolutionStatus.CATEGORY_ONLY
        assert res.error_code == "INSTRUMENT_CATEGORY_NOT_EXECUTABLE"
        assert "generic asset category" in res.reason.lower()
        assert len(res.candidate_symbols) > 0

    def test_generic_eth_and_nifty_categories_rejection(self):
        """Verify ETH-OPTIONS and NIFTY-OPTIONS generic categories are rejected."""
        res_eth = global_instrument_resolver.resolve("ETH-OPTIONS")
        assert not res_eth.is_valid
        assert res_eth.error_code == "INSTRUMENT_CATEGORY_NOT_EXECUTABLE"

        res_nifty = global_instrument_resolver.resolve("NIFTY-OPTIONS")
        assert not res_nifty.is_valid
        assert res_nifty.error_code == "INSTRUMENT_CATEGORY_NOT_EXECUTABLE"

    def test_expired_options_contract_rejection(self):
        """2. Validate that expired contracts (e.g. from 2023) are deterministically rejected."""
        # 230101 = January 1, 2023 (definitely expired)
        res = global_instrument_resolver.resolve("BTC-230101-20000-C")
        assert not res.is_valid
        assert res.error_code == "EXPIRED_OPTIONS_CONTRACT"
        assert "expired" in res.reason.lower()

    def test_invalid_strike_price_rejection(self):
        """3. Validate that negative or zero strike prices are rejected."""
        res_zero = global_instrument_resolver.resolve("BTC-260925-0-C")
        assert not res_zero.is_valid
        assert res_zero.error_code == "INVALID_STRIKE_PRICE"

        res_neg = global_instrument_resolver.resolve("BTC-260925--5000-C")
        assert not res_neg.is_valid

    def test_missing_options_provider_rejection(self, monkeypatch):
        """4. Verify missing provider handling when unconfigured."""
        # Clear provider env keys
        monkeypatch.delenv("DERIBIT_API_KEY", raising=False)
        monkeypatch.delenv("DERIBIT_CLIENT_ID", raising=False)
        monkeypatch.delenv("UPSTOX_API_KEY", raising=False)
        monkeypatch.delenv("BINANCE_API_KEY", raising=False)

        res = global_instrument_resolver.resolve("BTC-260925-70000-C", provider="deribit_options")
        assert not res.is_valid
        assert res.error_code == "OPTIONS_PROVIDER_NOT_CONFIGURED"
        assert "not configured" in res.reason.lower()

    def test_valid_binance_btc_option_resolution(self):
        """5. Verify resolution of a valid, future-dated BTC Call option."""
        res = global_instrument_resolver.resolve("BTC-260925-70000-C")
        assert res.is_valid
        assert res.status == ResolutionStatus.RESOLVED
        assert res.error_code == "SUCCESS"
        inst = res.instrument
        assert inst is not None
        assert inst.base_asset == "BTC"
        assert inst.strike == 70000.0
        assert inst.option_type == "CALL"
        assert inst.expiry == "2026-09-25"
        assert inst.tradable is True

    def test_valid_nse_nifty_option_resolution(self):
        """6. Verify resolution of a valid Indian NSE Nifty option strike."""
        res = global_instrument_resolver.resolve("NIFTY 24400 CE")
        assert res.is_valid
        assert res.status == ResolutionStatus.RESOLVED
        assert res.error_code == "SUCCESS"
        inst = res.instrument
        assert inst is not None
        assert inst.base_asset == "NIFTY"
        assert inst.strike == 24400.0
        assert inst.option_type == "CALL"
        assert inst.lot_size == 50.0

    def test_process_manager_rejects_bot_with_btc_options_category(self, monkeypatch):
        """7. Verify BotProcessManager refuses to start a bot configured with BTC-OPTIONS category."""
        bot_id = "test-bad-opt-bot-1"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Seed test bot with bad category symbol in DB
        db.safe_execute(
            """
            INSERT OR REPLACE INTO bot_instances (
                id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PAPER', 'STOPPED', 10000, ?, ?)
            """,
            (bot_id, "Bad Options Bot", "BTC-OPTIONS", "CRYPTO_OPTIONS", "1h", "MOMENTUM_TEST", now_iso, now_iso)
        )

        mgr = BotProcessManager(bot_id=bot_id)
        pre = mgr.validate_pre_flight_start()
        
        assert pre["valid"] is False
        assert "generic category" in pre["reason"].lower()
        assert "INSTRUMENT_CATEGORY_NOT_EXECUTABLE" in pre["reason"]

        start_res = mgr.start_bot()
        assert start_res["status"] == "error"
        assert "Pre-start validation rejected" in start_res["message"]

        # Cleanup
        db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))

    def test_process_manager_allows_bot_with_valid_option_contract(self, monkeypatch):
        """8. Verify BotProcessManager pre-flight passes with a real dated strike contract."""
        bot_id = "test-good-opt-bot-1"
        now_iso = datetime.now(timezone.utc).isoformat()
        valid_contract = "BTC-260925-70000-C"

        db.safe_execute(
            """
            INSERT OR REPLACE INTO bot_instances (
                id, name, symbol, asset_class, timeframe, strategy, execution_mode, status, allocated_capital, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PAPER', 'STOPPED', 10000, ?, ?)
            """,
            (bot_id, "Valid Options Bot", valid_contract, "CRYPTO_OPTIONS", "1h", "MOMENTUM_TEST", now_iso, now_iso)
        )

        mgr = BotProcessManager(bot_id=bot_id)
        pre = mgr.validate_pre_flight_start()

        assert pre["valid"] is True
        assert pre["bot_info"]["symbol"] == valid_contract

        # Cleanup
        db.safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
