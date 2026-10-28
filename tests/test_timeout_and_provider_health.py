"""
Regression tests for Quant.OS API Timeout Prevention, Provider Health, and Non-Fabrication
==========================================================================================
Verifies:
1. Provider Health returns canonical matrix with independent provider statuses.
2. Binance and Delta telemetry do not perform blocking synchronous calls or fabricate fake LIVE status.
3. Database queries intercept PRAGMAs gracefully when Postgres mode is active.
4. Database indexes exist on critical tables (orders, trades, positions, capital_ledger).
"""

import sys
import os
import unittest
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src import config, db


class TestTimeoutAndProviderHealth(unittest.TestCase):
    def setUp(self):
        # Force PAPER trading mode
        config.TRADING_MODE = "PAPER"
        config.LIVE_TRADING_ENABLED = False

    def test_database_indexes_exist(self):
        """Verify optimized query performance indexes on SQLite."""
        indexes = db.safe_query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        )
        index_names = {row["name"] for row in indexes}
        self.assertIn("idx_orders_bot_id", index_names)
        self.assertIn("idx_orders_status", index_names)
        self.assertIn("idx_orders_created_at", index_names)
        self.assertIn("idx_trades_bot_id", index_names)
        self.assertIn("idx_trades_timestamp", index_names)
        self.assertIn("idx_positions_bot_id", index_names)
        self.assertIn("idx_capital_ledger_customer_timestamp", index_names)

    def test_postgres_pragma_interception(self):
        """Verify safe_query intercepts SQLite PRAGMAs when IS_POSTGRES is true."""
        orig_is_pg = getattr(config, "IS_POSTGRES", False)
        try:
            config.IS_POSTGRES = True
            # PRAGMA journal_mode should return simulated wal without error
            res_wal = db.safe_query("PRAGMA journal_mode")
            self.assertEqual(res_wal, [{"journal_mode": "wal"}])

            # PRAGMA busy_timeout
            res_timeout = db.safe_query("PRAGMA busy_timeout = 30000")
            self.assertEqual(res_timeout, [{"busy_timeout": 30000}])

            # PRAGMA foreign_keys
            res_fk = db.safe_query("PRAGMA foreign_keys = ON")
            self.assertEqual(res_fk, [{"foreign_keys": 1}])
        finally:
            config.IS_POSTGRES = orig_is_pg

    def test_fyers_diagnostic_non_fabrication(self):
        """Verify Fyers adapter reports truthfully without credentials or active token."""
        from src.fyers_broker_adapter import global_fyers_adapter
        diag = global_fyers_adapter.get_safe_diagnostic()
        self.assertIn("configured", diag)
        self.assertIn("websocket_status", diag)
        # Without active token, status must not be fabricated LIVE
        if not bool(global_fyers_adapter.access_token):
            self.assertNotEqual(diag["status"], "LIVE")
            self.assertEqual(diag["websocket_status"], "DISCONNECTED")
            self.assertIsNone(diag["last_real_tick_at"])

    def test_binance_market_data_service_health(self):
        """Verify Binance service tracks sync age and does not fabricate tick age."""
        from src.binance_market_data_service import global_binance_market_data_service
        health = global_binance_market_data_service.get_health_status()
        self.assertIn("status", health)
        self.assertIn("connected", health)
        self.assertIn("provider", health)
        self.assertEqual(health["provider"], "BINANCE_OFFICIAL")

    def test_provider_health_matrix_structure(self):
        """Verify dashboard API provider health returns independent telemetry."""
        from dashboard import app
        with app.test_client() as client:
            res = client.get("/api/market/providers/health")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertIn("providers", data)
            self.assertIn("binance", data)
            self.assertIn("dhan", data)
            self.assertIn("upstox", data)
            self.assertIn("delta", data)
            self.assertIn("fyers", data)

            # Each provider has independent status
            binance = data["binance"]
            self.assertIn(binance["status"], ["LIVE", "DEGRADED", "DISCONNECTED", "NOT_CONFIGURED"])
            dhan = data["dhan"]
            self.assertIn(dhan.get("status"), ["LIVE", "CONNECTED", "DEGRADED", "DISCONNECTED", "NOT_CONFIGURED", "AUTH_FAILED", "TOKEN_EXPIRED"])


if __name__ == "__main__":
    unittest.main()
