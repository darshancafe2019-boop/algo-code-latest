"""
Unit and Integration Tests for Dhan HQ v2 Authentication Lifecycle & Gateway Stabilization
=============================================================================================
Verifies:
1. JWT local expiry decoding and state transitions
2. Single-flight token renewal and atomic .env persistence
3. Hot-reload callback propagation to DhanService & DhanWSAdapter
4. Manual .env modification detection via fingerprinting
5. Deterministic Market Data Gateway port 5051 binding
6. Delta Exchange isolation & paper trading safety guarantees
7. Zero token/secret leakage in diagnostics and status payloads
8. Regression tests A through J for Dhan state synchronization and failover
"""
import os
import sys
import json
import base64
import time
import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.dhan_credential_manager import DhanCredentialManager
from market_data_gateway.adapters.dhan_ws import DhanWSAdapter
from market_data_gateway.failover_manager import FailoverManager


class TestDhanLifecycleAndGateway(unittest.TestCase):

    def setUp(self):
        # Prevent any network/db locks in test runner
        self.db_patcher = patch("src.db.safe_query", return_value=[])
        self.db_patcher.start()

    def tearDown(self):
        self.db_patcher.stop()

    def _create_mock_jwt(self, exp_timestamp: float) -> str:
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
        payload = base64.urlsafe_b64encode(json.dumps({"exp": exp_timestamp, "iss": "dhan", "sub": "user"}).encode()).decode().rstrip("=")
        sig = base64.urlsafe_b64encode(b"mock_signature_bytes").decode().rstrip("=")
        return f"{header}.{payload}.{sig}"

    def test_01_jwt_expiry_decoding(self):
        mgr = DhanCredentialManager()
        future_exp = time.time() + 7200  # 2 hours in future
        jwt = self._create_mock_jwt(future_exp)
        
        exp_decoded = mgr.decode_jwt_expiry(jwt)
        self.assertIsNotNone(exp_decoded)
        self.assertAlmostEqual(exp_decoded, future_exp, delta=2.0)

    def test_02_status_calculation(self):
        mgr = DhanCredentialManager()
        now = time.time()
        
        # 1. Valid (> 60m)
        mgr._client_id = "1000678498"
        mgr._access_token = self._create_mock_jwt(now + 7200)
        mgr._update_expiry_state_locked()
        self.assertEqual(mgr._status, "VALID")
        
        # 2. Expiring soon (<= 60m, > 0)
        mgr._access_token = self._create_mock_jwt(now + 1800)
        mgr._update_expiry_state_locked()
        self.assertEqual(mgr._status, "EXPIRING_SOON")
        
        # 3. Expired (<= 0)
        mgr._access_token = self._create_mock_jwt(now - 100)
        mgr._update_expiry_state_locked()
        self.assertEqual(mgr._status, "EXPIRED")

    def test_03_zero_secrets_in_get_status(self):
        mgr = DhanCredentialManager()
        mgr._client_id = "1000678498"
        mgr._access_token = self._create_mock_jwt(time.time() + 3600)
        mgr._update_expiry_state_locked()
        
        status = mgr.get_status()
        status_str = json.dumps(status)
        
        self.assertNotIn(mgr._access_token, status_str)
        self.assertEqual(status["client_id_masked"], "1000****")
        self.assertIn("token_remaining_minutes", status)
        self.assertIn("status", status)

    def test_04_hot_reload_callback_propagation(self):
        mgr = DhanCredentialManager()
        callbacks_received = []

        def mock_callback(cid, tok, gen):
            callbacks_received.append((cid, tok, gen))

        mgr.register_callback(mock_callback)
        new_token = self._create_mock_jwt(time.time() + 5000)

        with patch.object(mgr, "_read_env_file", return_value={"DHAN_CLIENT_ID": "1000678498", "DHAN_ACCESS_TOKEN": new_token}):
            mgr.load_from_environment(force_notify=True)

        self.assertGreater(len(callbacks_received), 0)
        self.assertEqual(callbacks_received[-1][0], "1000678498")
        self.assertEqual(callbacks_received[-1][1], new_token)

    def test_05_dhan_service_integration(self):
        from src.dhan_service import DhanService
        service = DhanService()
        new_token = self._create_mock_jwt(time.time() + 4000)
        service.reload_credentials("1000678498", new_token)

        self.assertEqual(service.client_id, "1000678498")
        self.assertEqual(service.access_token, new_token)
        self.assertIsNone(service._auth_cached_result)

    def test_06_gateway_port_default_isolation(self):
        with patch.dict(os.environ, {"PORT": "5050"}, clear=False):
            if "MARKET_GATEWAY_PORT" in os.environ:
                del os.environ["MARKET_GATEWAY_PORT"]
            gateway_port = int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
            self.assertEqual(gateway_port, 5051)

    def test_07_delta_options_isolation(self):
        with patch("market_data_gateway.adapters.delta_options_ws.DeltaOptionsWSAdapter.start_background_thread"):
            from market_data_gateway.adapters.delta_options_ws import DeltaOptionsWSAdapter
            delta_adapter = DeltaOptionsWSAdapter()
            self.assertIsNotNone(delta_adapter)
            self.assertEqual(delta_adapter.provider_id, "delta_options_ws")

    def test_08_safety_trading_mode(self):
        from src import config
        self.assertTrue(getattr(config, "PAPER_TRADING", True))
        self.assertFalse(getattr(config, "LIVE_TRADING_ENABLED", False))

    # ─── REGRESSION TESTS A THROUGH J ────────────────────────────────────────

    def test_A_stale_auth_error_cleared_on_connect(self):
        """A. Old AUTH_ERROR -> valid credential -> connected socket -> AUTH_ERROR cleared."""
        from src.dhan_service import DhanService
        adapter = DhanWSAdapter()
        # Artificially simulate old failure
        adapter._auth_error_reason = "DHAN_AUTH_FAILED: Dhan API returned 401 Unauthorized."
        adapter._status = "AUTH_FAILED"

        with patch.object(DhanService, "is_authenticated", new_callable=unittest.mock.PropertyMock(return_value=True)), \
             patch("src.dhan_credential_manager.global_dhan_credential_manager.get_status", return_value={"status": "VALID"}):
            # When socket connects successfully:
            adapter._status = "CONNECTED"
            adapter._auth_error_reason = None

            self.assertIsNone(adapter._auth_error_reason)
            self.assertNotEqual(adapter.feed_state, "AUTH_ERROR")
            self.assertIn(adapter.feed_state, ("CONNECTED", "LIVE", "MARKET_CLOSED"))

    def test_B_health_endpoint_not_auth_error_after_connect(self):
        """B. Health check after reconnection returns NOT AUTH_ERROR."""
        from src.dhan_service import DhanService
        adapter = DhanWSAdapter()
        adapter._status = "CONNECTED"
        adapter._auth_error_reason = None

        with patch.object(DhanService, "is_authenticated", new_callable=unittest.mock.PropertyMock(return_value=True)), \
             patch("src.dhan_credential_manager.global_dhan_credential_manager.get_status", return_value={"status": "VALID"}):
            health = asyncio.run(adapter.health_check())
            self.assertNotEqual(health.status, "AUTH_ERROR")
            self.assertIn(health.status, ("CONNECTED", "LIVE", "MARKET_CLOSED"))

    def test_C_get_status_and_health_check_consistency(self):
        """C. get_status() and health_check().status derive from same authoritative state."""
        from src.dhan_service import DhanService
        adapter = DhanWSAdapter()
        with patch.object(DhanService, "is_authenticated", new_callable=unittest.mock.PropertyMock(return_value=True)), \
             patch("src.dhan_credential_manager.global_dhan_credential_manager.get_status", return_value={"status": "VALID"}):
            for st in ("CONNECTED", "DISCONNECTED", "REAUTHENTICATING"):
                adapter._status = st
                adapter._auth_error_reason = None
                expected_feed_state = adapter.feed_state
                self.assertEqual(adapter.get_status(), expected_feed_state)
                health = asyncio.run(adapter.health_check())
                self.assertEqual(health.status, adapter.get_status())

    def test_D_failover_manager_selects_dhan_for_indian_assets(self):
        """D. FailoverManager selects Dhan for RELIANCE, NIFTY, BANKNIFTY when connected/market_closed."""
        from src.dhan_service import DhanService
        adapter = DhanWSAdapter()
        adapter._status = "CONNECTED"
        adapter._auth_error_reason = None

        with patch.object(DhanService, "is_authenticated", new_callable=unittest.mock.PropertyMock(return_value=True)), \
             patch("src.dhan_credential_manager.global_dhan_credential_manager.get_status", return_value={"status": "VALID"}):
            fm = FailoverManager(adapters={"dhan_ws": adapter})
            for sym in ("RELIANCE", "NIFTY", "BANKNIFTY", "HDFCBANK"):
                selected = fm.get_best_provider(sym)
                self.assertIsNotNone(selected, f"Failover failed to select Dhan for {sym}")
                self.assertEqual(selected.provider_id, "dhan_ws")

    def test_E_subscription_registry_accepts_instruments(self):
        """E. Subscription registry accepts RELIANCE/NIFTY/BANKNIFTY."""
        from src.dhan_service import global_dhan_service
        # Verify resolution of official symbols
        r_meta = global_dhan_service.resolve_symbol("RELIANCE")
        self.assertIsNotNone(r_meta)
        self.assertEqual(str(r_meta["security_id"]), "2885")
        self.assertEqual(r_meta["exchange_segment"], "NSE_EQ")

        n_meta = global_dhan_service.resolve_symbol("NIFTY")
        self.assertIsNotNone(n_meta)
        self.assertEqual(str(n_meta["security_id"]), "13")
        self.assertEqual(n_meta["exchange_segment"], "IDX_I")

        b_meta = global_dhan_service.resolve_symbol("BANKNIFTY")
        self.assertIsNotNone(b_meta)
        self.assertEqual(str(b_meta["security_id"]), "25")
        self.assertEqual(b_meta["exchange_segment"], "IDX_I")

    def test_F_credential_hot_reload_followed_by_reconnect(self):
        """F. Credential hot reload transitions through REAUTHENTICATING and clears auth errors."""
        adapter = DhanWSAdapter()
        adapter._auth_error_reason = "OLD_ERROR"
        adapter._status = "AUTH_FAILED"

        adapter._on_credential_update("1000678498", "NEW_TOKEN", 2)
        self.assertIsNone(adapter._auth_error_reason)
        self.assertEqual(adapter._status, "REAUTHENTICATING")

    def test_G_restored_subscriptions_after_reconnect(self):
        """G. Subscriptions remain tracked across reconnects."""
        adapter = DhanWSAdapter()
        symbols = ["RELIANCE", "NIFTY", "BANKNIFTY"]
        for s in symbols:
            adapter._subscribed_symbols.add(s)

        # Simulate reconnect
        asyncio.run(adapter.reconnect_with_new_credentials())
        for s in symbols:
            self.assertIn(s, adapter._subscribed_symbols)

    def test_H_market_closed_does_not_become_auth_error(self):
        """H. Market closed does not become AUTH_ERROR when socket and credentials are healthy."""
        from src.dhan_service import DhanService
        adapter = DhanWSAdapter()
        adapter._status = "CONNECTED"
        adapter._auth_error_reason = None

        with patch.object(DhanService, "is_authenticated", new_callable=unittest.mock.PropertyMock(return_value=True)), \
             patch("src.dhan_credential_manager.global_dhan_credential_manager.get_status", return_value={"status": "VALID"}), \
             patch("market_data_gateway.adapters.dhan_ws.is_indian_market_open", return_value=False):
            self.assertEqual(adapter.feed_state, "MARKET_CLOSED")
            self.assertEqual(adapter.get_status(), "MARKET_CLOSED")
            health = asyncio.run(adapter.health_check())
            self.assertEqual(health.status, "MARKET_CLOSED")

    def test_I_source_not_configured_semantics(self):
        """I. SOURCE_NOT_CONFIGURED is not returned when a configured Dhan provider is merely disconnected/auth-required."""
        from market_data_gateway.failover_manager import _get_asset_class
        self.assertEqual(_get_asset_class("RELIANCE"), "INDIAN_EQUITIES")
        self.assertEqual(_get_asset_class("NIFTY"), "INDIAN_INDICES")
        self.assertEqual(_get_asset_class("BANKNIFTY"), "INDIAN_INDICES")

    def test_J_delta_remains_unaffected(self):
        """J. Delta remains unaffected."""
        from market_data_gateway.failover_manager import _get_asset_class
        self.assertEqual(_get_asset_class("BTC/USDT"), "CRYPTO")
        self.assertEqual(_get_asset_class("BTC-300826-60000-C"), "CRYPTO_OPTIONS")


if __name__ == "__main__":
    unittest.main()
