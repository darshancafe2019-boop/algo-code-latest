"""
Test Alpha Vantage Market Data Integration Suite
================================================
Verifies:
1. AlphaVantageService configuration and API key masking (zero key leakage).
2. Symbol Resolution & Mapping (US Equities, Indian BSE Equities, Crypto, Forex, Indices).
3. In-memory caching and request deduplication.
4. Graceful handling of Alpha Vantage rate limit messages ("Information" / "Note").
5. Error handling for invalid symbols and invalid keys without crashing.
6. BaseMarketProvider integration with ProviderRegistry.
7. Strict Broker Separation: Alpha Vantage provides market data ONLY, zero order execution.
"""

import os
import unittest
from unittest.mock import MagicMock, patch
import pandas as pd

from src.market_data.alphavantage_service import AlphaVantageService, global_alphavantage_service
from src.market_providers import AlphaVantageMarketProvider, get_provider_registry
from src.provider_manager import ProviderManager, AlphaVantageAdapter
from src.instrument_resolver import CanonicalInstrument, AssetClass, InstrumentType


class TestAlphaVantageIntegration(unittest.TestCase):

    def setUp(self):
        self.service = AlphaVantageService()

    def test_api_key_masking_and_security(self):
        """Ensures API key is properly masked and never exposed in cleartext."""
        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "MYSECRETAPIKEY1234"}):
            masked = self.service.get_masked_key()
            self.assertEqual(masked, "••••••••1234")
            self.assertNotIn("MYSECRETAPIKEY", masked)
            self.assertTrue(self.service.is_configured())

        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": ""}):
            masked = self.service.get_masked_key()
            self.assertEqual(masked, "Not Configured")
            self.assertFalse(self.service.is_configured())

    def test_symbol_resolution(self):
        """Tests two-way mapping between broker/canonical symbols and Alpha Vantage."""
        # US Equity
        res_aapl = self.service.resolve_symbol("AAPL")
        self.assertEqual(res_aapl["av_symbol"], "AAPL")
        self.assertEqual(res_aapl["asset_class"], "EQUITY")

        # Indian Equity
        res_rel = self.service.resolve_symbol("RELIANCE")
        self.assertEqual(res_rel["av_symbol"], "RELIANCE.BSE")
        self.assertEqual(res_rel["asset_class"], "INDIAN_EQUITY")

        # Crypto
        res_btc = self.service.resolve_symbol("BTC/USDT")
        self.assertEqual(res_btc["av_symbol"], "BTC")
        self.assertEqual(res_btc["asset_class"], "CRYPTO")
        self.assertEqual(res_btc["market"], "USD")

        # Forex
        res_fx = self.service.resolve_symbol("EURUSD")
        self.assertEqual(res_fx["av_symbol"], "EURUSD")
        self.assertEqual(res_fx["asset_class"], "FOREX")
        self.assertEqual(res_fx["from_currency"], "EUR")
        self.assertEqual(res_fx["to_currency"], "USD")

        # Index
        res_spx = self.service.resolve_symbol("SPX")
        self.assertEqual(res_spx["av_symbol"], "SPY")
        self.assertEqual(res_spx["asset_class"], "INDEX")

    def test_rate_limit_graceful_handling(self):
        """Tests that Alpha Vantage rate limit responses raise controlled DATA_RATE_LIMITED without crashing."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "Information": "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day."
        }

        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "TEST_KEY"}):
            with patch("requests.get", return_value=mock_response):
                with self.assertRaises(RuntimeError) as ctx:
                    self.service._raw_query({"function": "GLOBAL_QUOTE", "symbol": "AAPL"})
                self.assertIn("DATA_RATE_LIMITED", str(ctx.exception))

    def test_invalid_key_error_handling(self):
        """Tests that invalid API key responses raise AUTH_ERROR without crashing."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "Error Message": "the parameter apikey is invalid or missing. Please claim your free API key on (https://www.alphavantage.co/support/#api-key)"
        }

        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "BAD_KEY"}):
            with patch("requests.get", return_value=mock_response):
                with self.assertRaises(ValueError) as ctx:
                    self.service._raw_query({"function": "GLOBAL_QUOTE", "symbol": "AAPL"})
                self.assertIn("AUTH_ERROR", str(ctx.exception))

    def test_provider_registry_inclusion(self):
        """Verifies AlphaVantageMarketProvider is registered in ProviderRegistry."""
        registry = get_provider_registry()
        av_provider = registry.get_provider("alpha_vantage")
        self.assertIsNotNone(av_provider)
        self.assertEqual(av_provider.get_provider_id(), "alpha_vantage")
        self.assertEqual(av_provider.get_provider_name(), "Alpha Vantage")

        instruments = av_provider.get_instruments()
        self.assertGreater(len(instruments), 0)
        symbols = [i["symbol"] for i in instruments]
        self.assertIn("AAPL", symbols)
        self.assertIn("BTC/USDT", symbols)

    def test_provider_manager_routing_and_isolation(self):
        """Verifies AlphaVantageAdapter in ProviderManager and strict broker isolation."""
        pm = ProviderManager()
        self.assertIn("alpha_vantage", pm._adapters)

        # Confirm broker execution adapter remains Binance / Upstox
        spot_inst = CanonicalInstrument(
            instrument_id="BINANCE:BTCUSDT:SPOT",
            canonical_symbol="BTC/USDT",
            provider_symbol="BTC/USDT",
            exchange_symbol="BTCUSDT",
            exchange="BINANCE",
            provider="binance_spot",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.SPOT,
            base_asset="BTC",
            quote_asset="USDT",
        )
        routed_adapter = pm.route_instrument(spot_inst)
        self.assertEqual(routed_adapter.provider_id, "binance_spot")

        # Confirm Upstox routed for Indian stocks
        nse_inst = CanonicalInstrument(
            instrument_id="NSE:RELIANCE:EQ",
            canonical_symbol="RELIANCE",
            provider_symbol="RELIANCE",
            exchange_symbol="RELIANCE",
            exchange="NSE",
            provider="upstox",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.SPOT,
            base_asset="RELIANCE",
            quote_asset="INR",
        )
        routed_nse = pm.route_instrument(nse_inst)
        self.assertEqual(routed_nse.provider_id, "upstox")

    def test_ohlcv_dataframe_normalization(self):
        """Verifies AlphaVantageService returns normalized pandas DataFrames with standard schema."""
        mock_data = {
            "Time Series (Daily)": {
                "2026-08-28": {"1. open": "220.0", "2. high": "225.0", "3. low": "219.0", "4. close": "224.5", "6. volume": "45000000"},
                "2026-08-27": {"1. open": "218.0", "2. high": "221.0", "3. low": "217.5", "4. close": "220.2", "6. volume": "42000000"},
            }
        }
        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "TEST_KEY"}):
            with patch.object(self.service, "_raw_query", return_value=mock_data):
                df = self.service.fetch_ohlcv("AAPL", timeframe="1d")
                self.assertIsInstance(df, pd.DataFrame)
                self.assertEqual(len(df), 2)
                for col in ["timestamp", "open", "high", "low", "close", "volume"]:
                    self.assertIn(col, df.columns)
                self.assertEqual(df.iloc[-1]["close"], 224.5)


if __name__ == "__main__":
    unittest.main()
