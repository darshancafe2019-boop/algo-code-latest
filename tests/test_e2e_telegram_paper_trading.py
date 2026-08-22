"""
End-to-End Simulation & Paper Trading Verification for Telegram Alert System
=============================================================================
Simulates complete real-world Paper Trading lifecycle with full Telegram Alert verification:
1. BOT START (BOT_STARTED alert)
2. STRATEGY CONFLUENCE (BUY_SIGNAL alert)
3. ORDER EXECUTION & FILL (ORDER_FILLED alert)
4. STOP LOSS EXIT (STOP_LOSS alert)
5. TAKE PROFIT EXIT (TAKE_PROFIT alert)
6. RISK ENGINE GATING (RISK_BLOCKED alert)
7. BOT STOP (BOT_STOPPED alert)
8. REST API CONTRACTS (/api/notifications/telegram/*)
"""

import time
import json
import unittest
from unittest.mock import patch, MagicMock

import dashboard
from src import config, db
from src.telegram_service import global_telegram_service, TelegramService


class TestE2ETelegramPaperTrading(unittest.TestCase):
    def setUp(self):
        self.app = dashboard.app.test_client()
        self.app.testing = True
        global_telegram_service.rate_limit_sec = 0.01
        db.init_db()

    def test_01_api_health_and_settings_contract(self):
        """Validates /api/notifications/telegram/health and /settings endpoints."""
        # 1. Health check
        res = self.app.get("/api/notifications/telegram/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn("health", data)
        self.assertIn("status", data["health"])
        self.assertIn("queue_size", data["health"])

        # 2. Get settings
        res = self.app.get("/api/notifications/telegram/settings")
        self.assertEqual(res.status_code, 200)
        settings_data = res.get_json()
        self.assertTrue(settings_data["settings"]["trade_signals"])

        # 3. Update settings
        res = self.app.post(
            "/api/notifications/telegram/settings",
            data=json.dumps({"settings": {"trade_signals": True, "stop_loss": True}}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        updated_data = res.get_json()
        self.assertTrue(updated_data["settings"]["stop_loss"])

    def test_02_api_test_endpoint_sanitization(self):
        """Validates that /api/notifications/telegram/test never exposes raw token."""
        with patch.object(global_telegram_service, "test_connection", return_value={
            "status": "success",
            "message": "Telegram test message delivered.",
            "telegram_status": "CONNECTED",
            "bot_username": "AlgoBot"
        }):
            res = self.app.post(
                "/api/notifications/telegram/test",
                data=json.dumps({"bot_name": "Paper Scalper"}),
                content_type="application/json"
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["status"], "success")
            self.assertNotIn("TELEGRAM_BOT_TOKEN", str(data))
            if config.TELEGRAM_BOT_TOKEN:
                self.assertNotIn(config.TELEGRAM_BOT_TOKEN, str(data))

    def test_03_full_paper_trading_lifecycle_alerts(self):
        """
        Executes end-to-end simulated Paper Trading flow:
        BOT START -> SIGNAL -> FILL -> STOP LOSS -> TAKE PROFIT -> RISK BLOCK -> BOT STOP
        """
        test_bot_id = f"test_e2e_bot_{int(time.time())}"
        symbol = "BTC/USDT"

        # 1. BOT_STARTED
        event_start = global_telegram_service.send_bot_alert(
            bot_name="Alpha BTC Scalper",
            status_event="BOT_STARTED",
            symbol=symbol,
            strategy="EMA_MACD_VP",
            timeframe="5m",
            mode="PAPER",
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_start))

        # 2. BUY SIGNAL
        event_sig = global_telegram_service.send_trade_alert(
            bot_name="Alpha BTC Scalper",
            symbol=symbol,
            timeframe="5m",
            side="BUY",
            entry_price=65400.0,
            quantity=0.01,
            sl_price=64800.0,
            tp_price=66500.0,
            strategy="EMA + RSI + MACD",
            risk_level="SAFE",
            mode="PAPER",
            bot_id=test_bot_id,
            confluence_pct=84.0
        )
        self.assertTrue(bool(event_sig))

        # 3. ORDER_FILLED
        event_fill = global_telegram_service.send_order_alert(
            event_type="ORDER_FILLED",
            bot_name="Alpha BTC Scalper",
            symbol=symbol,
            side="BUY",
            quantity=0.01,
            price=65400.0,
            order_id="PAPER_ORD_98214",
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_fill))

        # 4. STOP_LOSS
        event_sl = global_telegram_service.send_stop_loss_alert(
            bot_name="Alpha BTC Scalper",
            symbol=symbol,
            entry_price=65400.0,
            exit_price=64800.0,
            pnl=-6.0,
            reason="Trailing ATR Stop Hit",
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_sl))

        # 5. TAKE_PROFIT
        event_tp = global_telegram_service.send_take_profit_alert(
            bot_name="Alpha BTC Scalper",
            symbol=symbol,
            entry_price=65400.0,
            exit_price=66500.0,
            pnl=11.0,
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_tp))

        # 6. RISK_BLOCKED
        event_risk = global_telegram_service.send_risk_alert(
            bot_name="Alpha BTC Scalper",
            signal="BUY BTC/USDT",
            reason="Max single asset concentration limit (30.0%) reached.",
            risk_type="RISK_BLOCKED",
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_risk))

        # 7. BOT_STOPPED
        event_stop = global_telegram_service.send_bot_alert(
            bot_name="Alpha BTC Scalper",
            status_event="BOT_STOPPED",
            symbol=symbol,
            strategy="EMA_MACD_VP",
            timeframe="5m",
            mode="PAPER",
            bot_id=test_bot_id
        )
        self.assertTrue(bool(event_stop))

        # Allow worker thread to process queues
        time.sleep(0.3)

        # 8. Check delivery logs in database
        logs = db.get_telegram_logs(limit=20)
        self.assertGreaterEqual(len(logs), 1)

    def test_04_quick_trade_triggers_telegram_alert(self):
        """Validates that executing a quick trade automatically fires ORDER_FILLED alert."""
        with patch.object(global_telegram_service, "send_order_alert") as mock_alert:
            res = self.app.post(
                "/api/quick-trade/execute",
                data=json.dumps({
                    "symbol": "BTC/USDT",
                    "direction": "LONG",
                    "order_type": "MARKET",
                    "quantity": 0.005,
                    "price": 65000.0,
                    "stop_loss": 64000.0,
                    "take_profit": 67000.0,
                    "mode": "PAPER",
                    "bot_id": "test-qt-bot"
                }),
                content_type="application/json"
            )
            self.assertEqual(res.status_code, 200)
            mock_alert.assert_called_once()
            args, kwargs = mock_alert.call_args
            self.assertEqual(kwargs.get("event_type"), "ORDER_FILLED")
            self.assertEqual(kwargs.get("symbol"), "BTC/USDT")
            self.assertEqual(kwargs.get("side"), "LONG")


if __name__ == "__main__":
    unittest.main()
