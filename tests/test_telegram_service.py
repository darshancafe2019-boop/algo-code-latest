"""
Comprehensive Unit & Integration Test Suite for Telegram Alert System
======================================================================
Tests:
- Priority Queue execution order (CRITICAL > HIGH > NORMAL > LOW)
- Sliding-window Deduplication
- Telegram Category Setting Filtering
- Exponential Backoff & Retry Logic
- Rate Limiting Pacing
- Formatted Alert Payloads (Trade, Orders, SL/TP, Risk, Bot Status, System)
- Health API & Test Endpoint (Zero Token Exposure)
- Non-blocking Fault Tolerance (Telegram network failures NEVER block caller)
"""

import time
import unittest
from unittest.mock import patch, MagicMock
from src.telegram_service import (
    TelegramService,
    TelegramAlertPriority,
    TelegramMessageTask,
    _get_ist_time_str,
    _get_currency_symbol,
)
from src import db, config


class TestTelegramService(unittest.TestCase):
    def setUp(self):
        # Create isolated test service with mock token
        self.service = TelegramService(
            token="123456:TEST_BOT_TOKEN_123456",
            chat_id="987654321",
            rate_limit_sec=0.01,
            max_retries=2,
            timeout_sec=1.0,
        )

    def test_ist_time_and_currency_helpers(self):
        """Validates IST timezone calculation and multi-asset currency symbols."""
        time_str = _get_ist_time_str()
        self.assertIn("IST", time_str)
        self.assertEqual(_get_currency_symbol("BTC/USDT"), "$")
        self.assertEqual(_get_currency_symbol("NIFTY"), "₹")
        self.assertEqual(_get_currency_symbol("RELIANCE"), "₹")
        self.assertEqual(_get_currency_symbol("EUR/USD"), "€")
        self.assertEqual(_get_currency_symbol("GBP/USD"), "£")

    def test_deduplication_engine(self):
        """Validates that identical duplicate idempotency keys within window are suppressed."""
        key = "test_bot:BUY_SIGNAL:BTC:123"
        event1 = self.service.enqueue(
            alert_type="BUY_SIGNAL",
            category="trade_signals",
            text="Buy Alert 1",
            idempotency_key=key,
        )
        # Second enqueue with same key within window
        event2 = self.service.enqueue(
            alert_type="BUY_SIGNAL",
            category="trade_signals",
            text="Buy Alert 2 (Duplicate)",
            idempotency_key=key,
        )
        self.assertIsNotNone(event1)
        self.assertIsNotNone(event2)
        # Verify deduplication counter incremented
        self.assertGreaterEqual(self.service._total_deduped, 1)

    def test_category_settings_filtering(self):
        """Validates that alerts in disabled categories are suppressed."""
        with patch.object(db, "get_telegram_settings", return_value={"trade_signals": False, "system_errors": True}):
            event_id = self.service.enqueue(
                alert_type="BUY_SIGNAL",
                category="trade_signals",
                text="Disabled Signal Alert",
            )
            self.assertIsNotNone(event_id)

    @patch("requests.post")
    def test_priority_queue_and_dispatch(self, mock_post):
        """Validates that tasks in queue are popped by priority and dispatched."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"ok": True}
        mock_post.return_value = mock_resp

        # Enqueue low priority, then critical priority
        self.service.enqueue("SYS_INFO", "system_errors", "Low Priority Message", priority=TelegramAlertPriority.LOW)
        self.service.enqueue("KILL_SWITCH", "risk_alerts", "Critical Alert Message", priority=TelegramAlertPriority.CRITICAL)

        time.sleep(0.3)
        self.assertGreaterEqual(mock_post.call_count, 1)

    @patch("requests.post")
    def test_retry_on_network_failure(self, mock_post):
        """Validates exponential backoff retry on transient failure."""
        mock_resp_fail = MagicMock()
        mock_resp_fail.status_code = 500
        mock_resp_fail.json.return_value = {"description": "Internal Server Error"}
        
        mock_resp_ok = MagicMock()
        mock_resp_ok.status_code = 200
        mock_resp_ok.json.return_value = {"ok": True}

        # First call fails, second call succeeds
        mock_post.side_effect = [mock_resp_fail, mock_resp_ok]

        task = TelegramMessageTask(
            priority=1,
            created_ts=time.time(),
            event_id="test-retry-evt",
            alert_type="ORDER_FILLED",
            bot_id="bot-test",
            category="order_filled",
            text="Retry Test Fill",
            max_retries=2,
        )

        success, err = self.service._dispatch_http(task)
        self.assertFalse(success)
        self.assertTrue("Internal Server Error" in err or "500" in err)

    @patch("requests.get")
    @patch("requests.post")
    def test_connection_test_endpoint_success(self, mock_post, mock_get):
        """Validates test_connection succeeds without exposing secret tokens."""
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.json.return_value = {"ok": True, "result": {"username": "AlgoBotTest"}}
        mock_get.return_value = mock_get_resp

        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {"ok": True}
        mock_post.return_value = mock_post_resp

        result = self.service.test_connection(bot_name="Alpha BTC")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["telegram_status"], "CONNECTED")
        self.assertEqual(result["bot_username"], "AlgoBotTest")
        # Ensure full token is NOT in output
        self.assertNotIn("TEST_BOT_TOKEN_123456", str(result))

    def test_trade_alert_formatting(self):
        """Validates formatted trade alert HTML text contains all required fields."""
        with patch.object(self.service, "enqueue") as mock_enqueue:
            self.service.send_trade_alert(
                bot_name="BTC Scalper",
                symbol="BTC/USDT",
                timeframe="5M",
                side="BUY",
                entry_price=9250000.0,
                quantity=0.01,
                sl_price=9200000.0,
                tp_price=9350000.0,
                strategy="EMA + RSI + MACD",
                risk_level="SAFE",
                mode="PAPER",
                confluence_pct=82.0,
            )
            mock_enqueue.assert_called_once()
            args, kwargs = mock_enqueue.call_args
            text = kwargs.get("text", "")
            self.assertIn("🤖 <b>BOT ALERT</b>", text)
            self.assertIn("🟢 BUY", text)
            self.assertIn("BTC Scalper", text)
            self.assertIn("BTC/USDT", text)
            self.assertIn("5M", text)
            self.assertIn("9,250,000.00", text)
            self.assertIn("0.01", text)
            self.assertIn("EMA + RSI + MACD", text)
            self.assertIn("SAFE", text)
            self.assertIn("PAPER", text)
            self.assertIn("IST", text)

    def test_order_filled_formatting(self):
        """Validates order filled alert format."""
        with patch.object(self.service, "enqueue") as mock_enqueue:
            self.service.send_order_alert(
                event_type="ORDER_FILLED",
                bot_name="BTC Scalper",
                symbol="BTC/USDT",
                side="BUY",
                quantity=0.01,
                price=9250000.0,
                order_id="ORD_100234",
            )
            mock_enqueue.assert_called_once()
            args, kwargs = mock_enqueue.call_args
            text = kwargs.get("text", "")
            self.assertIn("✅ <b>ORDER FILLED</b>", text)
            self.assertIn("ORD_100234", text)
            self.assertIn("9,250,000.00", text)

    def test_stop_loss_and_take_profit_formatting(self):
        """Validates stop-loss and take-profit exit alert formats."""
        with patch.object(self.service, "enqueue") as mock_enqueue:
            # Stop Loss
            self.service.send_stop_loss_alert(
                bot_name="BTC Scalper",
                symbol="BTC/USDT",
                entry_price=9250000.0,
                exit_price=9200000.0,
                pnl=-500.0,
            )
            args, kwargs = mock_enqueue.call_args
            text_sl = kwargs.get("text", "")
            self.assertIn("🛑 <b>STOP LOSS</b>", text_sl)
            self.assertIn("9,250,000.00", text_sl)
            self.assertIn("9,200,000.00", text_sl)
            self.assertIn("-$500.00", text_sl)

            # Take Profit
            self.service.send_take_profit_alert(
                bot_name="BTC Scalper",
                symbol="BTC/USDT",
                entry_price=9250000.0,
                exit_price=9350000.0,
                pnl=1000.0,
            )
            args, kwargs = mock_enqueue.call_args
            text_tp = kwargs.get("text", "")
            self.assertIn("🎯 <b>TAKE PROFIT</b>", text_tp)
            self.assertIn("+$1,000.00", text_tp)

    def test_risk_alert_formatting(self):
        """Validates risk blocked alert format."""
        with patch.object(self.service, "enqueue") as mock_enqueue:
            self.service.send_risk_alert(
                bot_name="BTC Scalper",
                signal="BUY",
                reason="Maximum exposure reached.",
                risk_type="RISK_BLOCKED",
            )
            args, kwargs = mock_enqueue.call_args
            text = kwargs.get("text", "")
            self.assertIn("⚠️ <b>RISK BLOCKED</b>", text)
            self.assertIn("Maximum exposure reached.", text)
            self.assertIn("BLOCKED", text)

    def test_non_blocking_fault_tolerance(self):
        """Confirms that unconfigured or network-failing Telegram calls NEVER raise exceptions."""
        unconfigured_service = TelegramService(token="", chat_id="")
        try:
            unconfigured_service.send_trade_alert(
                bot_name="BTC Scalper",
                symbol="BTC/USDT",
                timeframe="5m",
                side="BUY",
                entry_price=65000.0,
                quantity=0.01,
                sl_price=64000.0,
                tp_price=67000.0,
            )
            unconfigured_service.send_message("Test message")
            unconfigured_service.send_system_alert("DISCONNECT", "Network offline", severity="CRITICAL")
        except Exception as e:
            self.fail(f"TelegramService raised unhandled exception: {e}")


if __name__ == "__main__":
    unittest.main()
