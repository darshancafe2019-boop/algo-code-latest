"""
Unit Tests for GatewayClient Resilience & Safety
=================================================
Verifies strict fail-closed trading-data safety, thread-safety,
HTTP status handling, JSON decoding resilience, and URL configuration.
"""
import concurrent.futures
import json
import math
import os
import unittest
from unittest.mock import MagicMock, patch

import requests

from market_data_gateway.gateway_client import GatewayClient, STALE_THRESHOLD_SEC


class TestGatewayClientResilience(unittest.TestCase):

    def setUp(self):
        self.client = GatewayClient(base_url="http://mock-gateway:5051", timeout=1.0)

    # 1. Gateway Availability & Thread-Safe Caching
    def test_gateway_available_and_unavailable(self):
        with patch.object(requests, "get") as mock_get:
            mock_get.return_value.status_code = 200
            self.assertTrue(self.client.is_gateway_available())

            # Cached within 5s window
            self.assertTrue(self.client.is_gateway_available())
            self.assertEqual(mock_get.call_count, 1)

            # Invalidate cache
            self.client._last_availability_check = 0.0
            mock_get.return_value.status_code = 500
            self.assertFalse(self.client.is_gateway_available())

    def test_gateway_availability_concurrent_thread_safety(self):
        """Verify concurrent threads do not race or corrupt availability state."""
        with patch.object(requests, "get") as mock_get:
            mock_get.return_value.status_code = 200

            def check():
                return self.client.is_gateway_available()

            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(lambda _: check(), range(50)))

            self.assertTrue(all(results))

    # 2. Valid Real-Time Quote (Safe)
    def test_valid_realtime_quote_safe(self):
        mock_quote = {
            "symbol": "BTC/USDT",
            "last_price": 68000.0,
            "age_seconds": 1.2,
            "data_mode": "REAL_TIME",
            "is_stale": False,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("BTC/USDT")
            self.assertTrue(is_safe)
            self.assertEqual(reason, "")
            self.assertAlmostEqual(age, 1.2)

    def test_valid_live_mode_quote_safe(self):
        mock_quote = {
            "symbol": "NIFTY",
            "last_price": 24500.0,
            "age_seconds": 0.5,
            "data_mode": "LIVE",
            "is_stale": False,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("NIFTY")
            self.assertTrue(is_safe)
            self.assertEqual(reason, "")

    # 3. Missing Quote & Gateway Unavailable
    def test_missing_quote_gateway_unavailable_fails_closed(self):
        with patch.object(self.client, "get_quote", return_value=None), \
             patch.object(self.client, "is_gateway_available", return_value=False):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("ETH/USDT")
            self.assertFalse(is_safe)
            self.assertIn("GATEWAY_UNAVAILABLE", reason)
            self.assertEqual(age, 9999.0)

    def test_missing_quote_gateway_available_returns_no_data(self):
        with patch.object(self.client, "get_quote", return_value=None), \
             patch.object(self.client, "is_gateway_available", return_value=True):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("SOL/USDT")
            self.assertFalse(is_safe)
            self.assertIn("NO_DATA", reason)
            self.assertEqual(age, 9999.0)

    # 4. Stale Quote
    def test_stale_flag_rejects_trading(self):
        mock_quote = {
            "symbol": "BTC/USDT",
            "last_price": 68000.0,
            "age_seconds": 2.0,
            "data_mode": "REAL_TIME",
            "is_stale": True,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("BTC/USDT")
            self.assertFalse(is_safe)
            self.assertIn("STALE_DATA", reason)

    def test_stale_age_exceeding_threshold_rejects_trading(self):
        mock_quote = {
            "symbol": "BTC/USDT",
            "last_price": 68000.0,
            "age_seconds": 12.5,
            "data_mode": "REAL_TIME",
            "is_stale": False,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("BTC/USDT")
            self.assertFalse(is_safe)
            self.assertIn("STALE_DATA", reason)

    # 5. EOD, Cached, Delayed Modes
    def test_eod_and_cached_and_delayed_rejected(self):
        for mode in ("EOD", "CACHED", "DELAYED"):
            mock_quote = {
                "symbol": "RELIANCE",
                "last_price": 2800.0,
                "age_seconds": 1.0,
                "data_mode": mode,
                "is_stale": False,
            }
            with patch.object(self.client, "get_quote", return_value=mock_quote):
                is_safe, reason, age = self.client.is_symbol_safe_for_trading("RELIANCE")
                self.assertFalse(is_safe)
                self.assertIn("DELAYED_DATA_ONLY", reason)

    # 6. Simulated & Unknown Modes
    def test_simulated_mode_rejected(self):
        mock_quote = {
            "symbol": "PAPER_BTC",
            "last_price": 68000.0,
            "age_seconds": 0.5,
            "data_mode": "SIMULATED",
            "is_stale": False,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("PAPER_BTC")
            self.assertFalse(is_safe)
            self.assertIn("SIMULATED_DATA", reason)

    def test_unknown_or_custom_mode_rejected(self):
        mock_quote = {
            "symbol": "BTC/USDT",
            "last_price": 68000.0,
            "age_seconds": 0.5,
            "data_mode": "EXPERIMENTAL_STREAM",
            "is_stale": False,
        }
        with patch.object(self.client, "get_quote", return_value=mock_quote):
            is_safe, reason, age = self.client.is_symbol_safe_for_trading("BTC/USDT")
            self.assertFalse(is_safe)
            self.assertIn("UNVERIFIED_DATA_MODE", reason)

    # 7. Missing, Malformed, Negative, NaN, Inf Age
    def test_invalid_age_types_rejected(self):
        invalid_ages = [None, "fast", [1.0], {"age": 1}, True, False, -0.5, float("nan"), float("inf"), float("-inf")]
        for bad_age in invalid_ages:
            mock_quote = {
                "symbol": "BTC/USDT",
                "last_price": 68000.0,
                "age_seconds": bad_age,
                "data_mode": "REAL_TIME",
                "is_stale": False,
            }
            with patch.object(self.client, "get_quote", return_value=mock_quote):
                is_safe, reason, age = self.client.is_symbol_safe_for_trading("BTC/USDT")
                self.assertFalse(is_safe, f"Failed to reject invalid age: {bad_age!r}")
                self.assertIn("INVALID_AGE", reason)
                self.assertEqual(age, 9999.0)

    # 8. HTTP 500, Timeout, and Network Errors
    def test_snapshot_http_500_handled_gracefully(self):
        with patch.object(requests, "get") as mock_get:
            mock_get.return_value.status_code = 500
            result = self.client.get_snapshot(["BTC/USDT"])
            self.assertEqual(result, {})

    def test_snapshot_timeout_handled_gracefully(self):
        with patch.object(requests, "get", side_effect=requests.exceptions.Timeout("Timed out")):
            result = self.client.get_snapshot(["BTC/USDT"])
            self.assertEqual(result, {})

    # 9. Malformed JSON Response
    def test_snapshot_malformed_json_handled_gracefully(self):
        with patch.object(requests, "get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.side_effect = ValueError("Invalid JSON")
            mock_get.return_value = mock_resp

            result = self.client.get_snapshot(["BTC/USDT"])
            self.assertEqual(result, {})

    # 10. Provider Health Parsing
    def test_provider_health_status_and_json_safety(self):
        with patch.object(requests, "get") as mock_get:
            # Success
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"providers": [{"name": "upstox", "status": "CONNECTED"}]}
            mock_get.return_value = mock_resp
            health = self.client.get_provider_health()
            self.assertEqual(len(health), 1)
            self.assertEqual(health[0]["name"], "upstox")

            # Error code 503
            mock_get.return_value.status_code = 503
            self.assertEqual(self.client.get_provider_health(), [])

    # 11. Subscribe and Unsubscribe HTTP Status & Error Handling
    def test_subscribe_and_unsubscribe_status_codes(self):
        with patch.object(requests, "post") as mock_post:
            # 200 OK
            mock_post.return_value.status_code = 200
            self.assertTrue(self.client.subscribe(["BTC/USDT"]))
            self.assertTrue(self.client.unsubscribe(["BTC/USDT"]))

            # 500 Internal Error
            mock_post.return_value.status_code = 500
            self.assertFalse(self.client.subscribe(["BTC/USDT"]))
            self.assertFalse(self.client.unsubscribe(["BTC/USDT"]))

            # Network exception
            mock_post.side_effect = requests.exceptions.ConnectionError("Offline")
            self.assertFalse(self.client.subscribe(["BTC/USDT"]))
            self.assertFalse(self.client.unsubscribe(["BTC/USDT"]))


if __name__ == "__main__":
    unittest.main()

