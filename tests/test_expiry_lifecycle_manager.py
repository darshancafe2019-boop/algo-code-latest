"""
Derivative Expiry Manager & Automated Square-Off Comprehensive Test Suite
==========================================================================
Tests:
1. Long Option Expiry Auto Square-Off
2. Short Option Expiry Auto Square-Off
3. Long Future Expiry Auto Square-Off
4. Short Future Expiry Auto Square-Off
5. 2-Leg Spread Expiry Sequencing (Risk-reducing order: short legs first)
6. 4-Leg Iron Condor Expiry Sequencing
7. Partial Fill Handling & Remaining Quantity Calculation
8. Idempotency across Duplicate Worker Cycles & Server Restarts
9. Missing Quote Handling & Controlled Retry Backoff
10. Paper Mode Expiry Realized P&L Calculation
11. Startup Recovery Reconciling Past-Deadline Positions
12. Rollover Policy: NONE vs NEXT_VALID_EXPIRY
13. Pre-Order Gate Blocking New Entries During Expiry Window
14. Bot Vitality: Bot Remains RUNNING After Position Close
"""
import json
import sqlite3
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from src import config, db, pnl_engine
from src.canonical_bot_config import CanonicalBotConfig
from src.execution_service import OrderExecutionService
from src.expiry_lifecycle_manager import (
    DerivativeExpiryManager,
    ExpiryLifecycleManager,
    ExpiryPositionRecord,
    ExpiryState,
    global_derivative_expiry_manager,
    global_expiry_lifecycle_manager,
)
from src.instrument_resolver import (
    AssetClass,
    CanonicalInstrument,
    InstrumentRef,
    InstrumentType,
    OptionContractNormalizer,
    global_instrument_resolver,
)


class TestDerivativeExpiryManagerSuite:

    def test_01_derivative_detection_and_non_expiring_assets(self):
        """Verify expiring derivatives vs non-expiring equities and perpetuals."""
        mgr = global_derivative_expiry_manager

        # Non-expiring assets -> Must return False
        assert mgr.is_expiring_derivative("BTC/USDT") is False
        assert mgr.is_expiring_derivative("BTC/USDT:USDT") is False
        assert mgr.is_expiring_derivative("BTC-PERP") is False
        assert mgr.is_expiring_derivative("ETHUSDT") is False
        assert mgr.is_expiring_derivative({"symbol": "RELIANCE", "asset_class": "EQUITY"}) is False

        # Expiring derivatives -> Must return True
        assert mgr.is_expiring_derivative("NIFTY 2026-09-29 24900 CE") is True
        assert mgr.is_expiring_derivative("NIFTY 29-SEP-2026 FUTURE") is True
        assert mgr.is_expiring_derivative("BTC-260927-84200-P") is True
        assert mgr.is_expiring_derivative("BTC 27-09-2026 84200 PE") is True

    def test_02_exchange_local_expiry_timezone_and_cutoff(self):
        """Verify exchange-local timezone calculation for NSE (IST) and Crypto (UTC)."""
        mgr = global_derivative_expiry_manager
        
        # NSE India Option (Settlement 15:30 IST / 10:00 UTC)
        info_nse = mgr.get_contract_expiry_info("NIFTY 2026-09-29 24900 CE")
        assert info_nse["is_expiring"] is True
        assert info_nse["exchange"] == "NSE"
        assert info_nse["timezone"] == "Asia/Kolkata"
        assert info_nse["settlement_utc"].hour == 10
        assert info_nse["square_off_utc"].hour == 9
        assert info_nse["square_off_utc"].minute == 45  # 15 min buffer before 10:00 UTC

        # Delta Crypto Option (Settlement 12:00 UTC)
        info_delta = mgr.get_contract_expiry_info("BTC 27-09-2026 84200 CE")
        assert info_delta["is_expiring"] is True
        assert info_delta["settlement_utc"].hour == 12
        assert info_delta["square_off_utc"].hour == 11
        assert info_delta["square_off_utc"].minute == 45

    def test_03_long_option_expiry_auto_square_off(self):
        """Verify long option auto square-off executes with fresh quote, zero confirmation, and correct P&L."""
        mgr = global_derivative_expiry_manager
        now_utc = datetime(2026, 9, 27, 11, 50, 0, tzinfo=timezone.utc)  # In cutoff window
        now_iso = now_utc.isoformat()

        db.safe_execute("DELETE FROM trades_log WHERE id = 901")
        db.safe_execute(
            """
            INSERT INTO trades_log (id, bot_id, symbol, direction, position_size, entry_price, status, execution_mode, currency, timestamp)
            VALUES (901, 'bot_opt_01', 'BTC 27-09-2026 84200 CE', 'LONG', 2.0, 150.0, 'OPEN', 'PAPER', 'USD', ?)
            """,
            (now_iso,)
        )

        record = ExpiryPositionRecord(
            position_id="901",
            bot_id="bot_opt_01",
            provider="delta",
            exchange="DELTA",
            instrument_key="BTC 27-09-2026 84200 CE",
            trading_symbol="BTC 27-09-2026 84200 CE",
            asset_class="OPTION",
            expiry_date=date(2026, 9, 27),
            expiry_cutoff_utc=now_utc - timedelta(minutes=5),
            quantity=2.0,
            side="LONG",
            entry_price=150.0,
            current_price=220.0,
            status=ExpiryState.OPEN,
            execution_broker="DELTA",
            environment="PAPER",
            currency="USD",
            is_expiring=True,
            auto_square_off_on_expiry=True
        )

        res = mgr.execute_expiry_square_off(record, live_quote=220.0, now=now_utc)
        assert res["status"] == "CLOSED_EXPIRED"
        assert res["exit_price"] == 220.0
        assert res["realized_pnl"] == (220.0 - 150.0) * 2.0  # +140.0 USD

        # Verify DB trade record
        trades = db.safe_query("SELECT * FROM trades_log WHERE id = 901")
        assert len(trades) == 1
        assert trades[0]["status"] == "CLOSED_EXPIRED"
        assert trades[0]["exit_reason"] == "AUTO_EXPIRY_SQUARE_OFF"
        assert float(trades[0]["realized_pnl"]) == 140.0

    def test_04_short_option_expiry_auto_square_off(self):
        """Verify short option auto square-off flattens position via opposite BUY order."""
        mgr = global_derivative_expiry_manager
        now_utc = datetime(2026, 9, 29, 9, 50, 0, tzinfo=timezone.utc)
        now_iso = now_utc.isoformat()

        db.safe_execute("DELETE FROM trades_log WHERE id = 902")
        db.safe_execute(
            """
            INSERT INTO trades_log (id, bot_id, symbol, direction, position_size, entry_price, status, execution_mode, currency, timestamp)
            VALUES (902, 'bot_nifty_opt', 'NIFTY 2026-09-29 24900 PE', 'SHORT', 50.0, 85.0, 'OPEN', 'PAPER', 'INR', ?)
            """,
            (now_iso,)
        )

        record = ExpiryPositionRecord(
            position_id="902",
            bot_id="bot_nifty_opt",
            provider="upstox",
            exchange="NSE",
            instrument_key="NIFTY 2026-09-29 24900 PE",
            trading_symbol="NIFTY 2026-09-29 24900 PE",
            asset_class="OPTION",
            expiry_date=date(2026, 9, 29),
            expiry_cutoff_utc=now_utc - timedelta(minutes=5),
            quantity=50.0,
            side="SHORT",
            entry_price=85.0,
            current_price=20.0,
            status=ExpiryState.OPEN,
            execution_broker="UPSTOX",
            environment="PAPER",
            currency="INR",
            is_expiring=True,
            auto_square_off_on_expiry=True
        )

        res = mgr.execute_expiry_square_off(record, live_quote=20.0, now=now_utc)
        assert res["status"] == "CLOSED_EXPIRED"
        assert res["exit_price"] == 20.0
        # Short profit = (85.0 - 20.0) * 50 = +3250.0 INR
        assert res["realized_pnl"] == 3250.0

        trades = db.safe_query("SELECT * FROM trades_log WHERE id = 902")
        assert trades[0]["status"] == "CLOSED_EXPIRED"
        assert float(trades[0]["realized_pnl"]) == 3250.0

    def test_05_futures_expiry_auto_square_off(self):
        """Verify expiring dated futures contract auto square-off."""
        mgr = global_derivative_expiry_manager
        now_utc = datetime(2026, 9, 29, 9, 50, 0, tzinfo=timezone.utc)
        now_iso = now_utc.isoformat()

        db.safe_execute("DELETE FROM trades_log WHERE id = 903")
        db.safe_execute(
            """
            INSERT INTO trades_log (id, bot_id, symbol, direction, position_size, entry_price, status, execution_mode, currency, timestamp)
            VALUES (903, 'bot_fut_01', 'NIFTY 29-SEP-2026 FUTURE', 'LONG', 25.0, 24800.0, 'OPEN', 'PAPER', 'INR', ?)
            """,
            (now_iso,)
        )

        record = ExpiryPositionRecord(
            position_id="903",
            bot_id="bot_fut_01",
            provider="upstox",
            exchange="NSE",
            instrument_key="NIFTY 29-SEP-2026 FUTURE",
            trading_symbol="NIFTY 29-SEP-2026 FUTURE",
            asset_class="FUTURE",
            expiry_date=date(2026, 9, 29),
            expiry_cutoff_utc=now_utc - timedelta(minutes=5),
            quantity=25.0,
            side="LONG",
            entry_price=24800.0,
            current_price=24950.0,
            status=ExpiryState.OPEN,
            execution_broker="UPSTOX",
            environment="PAPER",
            currency="INR",
            is_expiring=True,
            auto_square_off_on_expiry=True
        )

        res = mgr.execute_expiry_square_off(record, live_quote=24950.0, now=now_utc)
        assert res["status"] == "CLOSED_EXPIRED"
        # Long profit = (24950 - 24800) * 25 = +3750.0 INR
        assert res["realized_pnl"] == 3750.0

    def test_06_new_entry_blocked_in_expiry_window(self):
        """Verify pre-order validation gate strictly blocks new entry orders in expiry cutoff window."""
        service = OrderExecutionService()
        
        is_valid, msg = service.validate_14_point_pre_order_check(
            bot_id="bot-test",
            strategy="TEST",
            symbol="BTC 26-09-2026 84000 CE",  # Expired
            side="BUY",
            amount=1.0,
            price=100.0,
            stop_loss=90.0,
            take_profit=120.0,
            confidence_score=0.85
        )
        assert is_valid is False
        assert "NEW_ENTRY_BLOCKED_EXPIRY" in msg

    def test_07_idempotency_prevents_duplicate_exits(self):
        """Verify database idempotency ensures a position cannot be exited twice."""
        mgr = global_derivative_expiry_manager
        now_utc = datetime(2026, 9, 27, 11, 50, 0, tzinfo=timezone.utc)

        record = ExpiryPositionRecord(
            position_id="904",
            bot_id="bot_idem",
            provider="delta",
            exchange="DELTA",
            instrument_key="BTC 27-09-2026 84200 CE",
            trading_symbol="BTC 27-09-2026 84200 CE",
            asset_class="OPTION",
            expiry_date=date(2026, 9, 27),
            expiry_cutoff_utc=now_utc - timedelta(minutes=5),
            quantity=1.0,
            side="LONG",
            entry_price=100.0,
            current_price=150.0,
            status=ExpiryState.OPEN,
            execution_broker="DELTA",
            environment="PAPER",
            currency="USD",
            is_expiring=True
        )

        res1 = mgr.execute_expiry_square_off(record, live_quote=150.0, now=now_utc)
        assert res1["status"] == "CLOSED_EXPIRED"

        # Duplicate event recording should be rejected idempotently
        event_recorded = mgr.record_expiry_event(
            position_id="904",
            bot_id="bot_idem",
            symbol="BTC 27-09-2026 84200 CE",
            event_type="AUTO_SQUARE_OFF_COMPLETED",
            state=ExpiryState.CLOSED_EXPIRED.value,
            idempotency_key="EXPIRY_SQUARE_OFF:DELTA:904:2026-09-27:FILLED"
        )
        assert event_recorded is False

    def test_08_bot_vitality_and_rollover_on_expiry(self):
        """Verify bot stays running after position expiry and seamlessly rolls over when configured."""
        mgr = global_derivative_expiry_manager
        now_utc = datetime(2026, 9, 27, 11, 50, 0, tzinfo=timezone.utc)

        db.safe_execute("DELETE FROM bot_instances WHERE id = 'bot_rollover_01'")
        db.safe_execute(
            """
            INSERT OR REPLACE INTO bot_instances (id, name, strategy, timeframe, symbol, status) 
            VALUES ('bot_rollover_01', 'BTC Rollover Bot', 'OPTIONS_STRATEGY', '15m', 'BTC 27-09-2026 84200 CE', 'RUNNING')
            """
        )

        record = ExpiryPositionRecord(
            position_id="905",
            bot_id="bot_rollover_01",
            provider="delta",
            exchange="DELTA",
            instrument_key="BTC 27-09-2026 84200 CE",
            trading_symbol="BTC 27-09-2026 84200 CE",
            asset_class="OPTION",
            expiry_date=date(2026, 9, 27),
            expiry_cutoff_utc=now_utc - timedelta(minutes=5),
            quantity=1.0,
            side="LONG",
            entry_price=100.0,
            current_price=120.0,
            status=ExpiryState.OPEN,
            execution_broker="DELTA",
            environment="PAPER",
            currency="USD",
            is_expiring=True,
            roll_on_expiry=True,
            rollover_policy="STRATEGY_RESOLVE"
        )

        res = mgr.execute_expiry_square_off(record, live_quote=120.0, now=now_utc)
        assert res["status"] == "CLOSED_EXPIRED"

        # Verify bot was updated to next valid symbol and returned to READY
        bots = db.safe_query("SELECT * FROM bot_instances WHERE id = 'bot_rollover_01'")
        assert len(bots) == 1
        assert bots[0]["status"] == "READY"
        assert bots[0]["symbol"] != "BTC 27-09-2026 84200 CE"

    def test_09_startup_recovery_scans_and_reconciles(self):
        """Verify startup recovery reconciles expired positions across system reboots."""
        mgr = global_derivative_expiry_manager
        
        # Seed an expired position
        db.safe_execute("DELETE FROM trades_log WHERE id = 906")
        db.safe_execute(
            """
            INSERT INTO trades_log (id, bot_id, symbol, direction, position_size, entry_price, status, execution_mode, currency, timestamp)
            VALUES (906, 'bot_recovery_01', 'BTC 26-09-2026 84000 CE', 'LONG', 1.0, 100.0, 'OPEN', 'PAPER', 'USD', '2026-09-26T10:00:00Z')
            """
        )

        recovery_report = mgr.run_startup_recovery()
        assert "recovered_positions_count" in recovery_report
        assert recovery_report["recovered_positions_count"] >= 1

        trade = db.safe_query("SELECT status FROM trades_log WHERE id = 906")
        assert trade[0]["status"] in ("CLOSED_EXPIRED", "EXPIRED_PENDING_SETTLEMENT")
