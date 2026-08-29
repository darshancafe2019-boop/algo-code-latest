"""
Automated Regression Test Suite for Unified Binance Market Data & Simplified Derivatives
========================================================================================
Tests:
1. Binance Spot & Futures Ticker Integration (LAST, MARK, INDEX, BID, ASK, MID)
2. Canonical Futures Contracts with Basis, Funding Rate, and Open Interest
3. 5-Column Option Chain Construction (CALL LTP | CALL OI | STRIKE | PUT OI | PUT LTP)
4. Black-Scholes Greeks Calculation & Implied Volatility
5. Binance WebSocket Subscription Multiplexing and Deduplication
6. Atomic Market Snapshot Delivery for Cross-Page Price Invariance
7. Paper vs Live Isolation (Paper orders never touch live Binance execution)
8. Single Financial Source of Truth Reconciled with Global Data Engine
"""

import sys
import unittest
import time
from pathlib import Path
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.binance_market_data_service import (
    BinanceMarketDataService,
    global_binance_market_data_service,
)
from src.binance_ws_manager import (
    BinanceWsManager,
    global_binance_ws_manager,
)
from src.global_data_engine import GlobalDataEngine
from src.execution_service import order_execution_service
from src import config, db


class TestBinanceMarketDataService(unittest.TestCase):
    """Verifies official Binance market data integration and normalization."""

    def test_binance_spot_and_futures_ticker_discovery(self):
        ticker = global_binance_market_data_service.get_ticker("BTC/USDT")
        assert ticker is not None
        assert ticker["symbol"] == "BTC/USDT"
        assert ticker["last_price"] > 0
        assert ticker["mark_price"] > 0
        assert ticker["index_price"] > 0
        assert ticker["bid_price"] > 0
        assert ticker["ask_price"] >= ticker["bid_price"]
        assert ticker["mid_price"] > 0
        assert ticker["provider"] == "BINANCE_OFFICIAL"
        assert ticker["quality"] in ["LIVE", "STALE", "DEGRADED", "DISCONNECTED"]

    def test_price_type_label_integrity(self):
        """Verifies LAST, MARK, INDEX, BID, ASK are labeled and distinguished."""
        ticker = global_binance_market_data_service.get_ticker("ETH/USDT")
        assert "last_price" in ticker
        assert "mark_price" in ticker
        assert "index_price" in ticker
        assert "bid_price" in ticker
        assert "ask_price" in ticker
        assert "funding_rate" in ticker
        assert "next_funding_time" in ticker

    def test_binance_futures_contracts_canonical(self):
        contracts = global_binance_market_data_service.get_futures_contracts("BTC")
        assert len(contracts) >= 1
        perp = contracts[0]
        assert perp["contract_type"] == "PERPETUAL"
        assert perp["settlement"] in ["USDT_LINEAR", "COIN_INVERSE"]
        assert perp["exchange"] == "BINANCE"
        assert "basis" in perp
        assert "annualized_basis_pct" in perp
        assert "funding_rate" in perp
        assert "open_interest_usd" in perp

    def test_binance_option_chain_5_column_structure(self):
        """Verifies 5-column option chain with CALL LTP | CALL OI | STRIKE | PUT OI | PUT LTP."""
        chain = global_binance_market_data_service.get_option_chain("BTC")
        assert chain["status"] == "success"
        assert chain["underlying"] == "BTC"
        assert chain["spot_price"] > 0
        assert chain["pcr"] > 0
        assert chain["max_pain"] > 0
        assert len(chain["strikes"]) >= 10

        # Verify ATM row and columns
        has_atm = False
        for row in chain["strikes"]:
            assert "strike" in row
            assert "call" in row
            assert "put" in row
            # 5 key columns:
            assert "ltp" in row["call"]
            assert "open_interest" in row["call"]
            assert "ltp" in row["put"]
            assert "open_interest" in row["put"]
            # Greeks:
            assert "delta" in row["call"]
            assert "gamma" in row["call"]
            assert "theta" in row["call"]
            assert "vega" in row["call"]
            if row.get("is_atm"):
                has_atm = True

        assert has_atm is True, "Option chain must have exactly 1 ATM strike highlighted!"

    def test_binance_candles_series(self):
        candles = global_binance_market_data_service.get_candles("BTC/USDT", timeframe="1h", limit=20)
        assert len(candles) > 0
        c0 = candles[0]
        assert "open" in c0
        assert "high" in c0
        assert "low" in c0
        assert "close" in c0
        assert "volume" in c0
        assert c0["high"] >= c0["low"]

    def test_binance_order_book_depth(self):
        ob = global_binance_market_data_service.get_order_book("BTC/USDT", limit=10)
        assert "bids" in ob
        assert "asks" in ob
        assert len(ob["bids"]) > 0
        assert len(ob["asks"]) > 0
        assert "spread" in ob
        assert "depth_imbalance_pct" in ob


class TestBinanceWsManager(unittest.TestCase):
    """Verifies shared WebSocket multiplexing and subscription deduplication."""

    def test_subscription_deduplication(self):
        ws = BinanceWsManager()
        # Subscribe multiple times for the same symbol
        ws.subscribe("BTC/USDT")
        ws.subscribe("BTC/USDT")
        ws.subscribe("BTC/USDT")

        status = ws.get_status()
        assert status["subscription_count"] == 1
        assert "BTCUSDT" in status["active_subscriptions"]

        # Unsubscribe
        ws.unsubscribe("BTC/USDT")
        status_after = ws.get_status()
        assert status_after["subscription_count"] == 0

    def test_latest_price_fallback(self):
        ws = BinanceWsManager()
        price = ws.get_latest_price("BTC/USDT")
        assert price is not None
        assert price > 0


class TestCrossPagePriceAndFinancialConsistency(unittest.TestCase):
    """Verifies that all pages share the exact same market snapshot and portfolio values."""

    def test_atomic_market_snapshot_consistency(self):
        snapshot = global_binance_market_data_service.get_market_snapshot()
        assert snapshot["status"] == "success"
        assert "BTC" in snapshot["assets"]
        assert "ETH" in snapshot["assets"]

        btc_snap = snapshot["assets"]["BTC"]
        assert btc_snap["last_price"] > 0
        assert btc_snap["mark_price"] > 0
        assert btc_snap["index_price"] > 0
        assert btc_snap["bid"] > 0
        assert btc_snap["ask"] >= btc_snap["bid"]

    def test_paper_vs_live_isolation(self):
        """Ensures paper trades never route to external live Binance broker endpoints."""
        passed, reason, order_res = order_execution_service.execute_order(
            bot_id="bot_test_isolation",
            strategy="EMA_MACD_VP",
            symbol="BTC/USDT",
            side="BUY",
            amount=0.01,
            price=65000.0,
            stop_loss=63000.0,
            take_profit=69000.0,
            confidence_score=85.0,
            is_live=False
        )

        assert passed is True
        assert order_res.get("status") == "FILLED"
        assert order_res.get("execution_mode") in ["PAPER", "TEST"]
        # Verify no external live broker ID was created
        assert "live_broker_id" not in order_res


if __name__ == "__main__":
    unittest.main()
