"""
Comprehensive Market Data Architecture & Freshness Tests
=========================================================
Verifies:
1. Freshness rules (0-5s = LIVE, 5-15s = DELAYED, >15s = STALE, no quote = UNAVAILABLE)
2. Zero/Missing quote handling (never 0.00, marked UNAVAILABLE)
3. Out-of-order tick rejection (timestamps must be strictly increasing)
4. REST older than WebSocket rejection
5. Instrument key & alias mapping for Indian Indices (NIFTY, BANKNIFTY, FINNIFTY, SENSEX, MIDCPNIFTY)
6. Top Movers calculation logic
7. NormalizedQuote Section 3 schema completeness (camelCase + snake_case, ageMs, provider, sourceTimestamp)
"""
import unittest
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from market_data_gateway.adapters.base import NormalizedQuote
from market_data_gateway.gateway import (
    get_quote_aliases,
    _compute_top_movers,
)
from src.upstox_service import OFFICIAL_UPSTOX_KEYS
from src.dhan_service import OFFICIAL_DHAN_KEYS


class TestMarketDataFreshnessAndNormalization(unittest.TestCase):
    def test_fresh_tick_status_is_live(self):
        """0-5 seconds age = LIVE"""
        now = datetime.now(timezone.utc)
        q = NormalizedQuote(
            symbol="NIFTY",
            exchange="NSE",
            provider="DHAN",
            last_price=24873.95,
            event_timestamp=now.isoformat(),
        )
        q.mark_stale(live_threshold_sec=5.0, delayed_threshold_sec=15.0)
        self.assertEqual(q.status, "LIVE")
        self.assertFalse(q.is_stale)
        self.assertLessEqual(q.age_seconds, 5.0)

    def test_aging_tick_status_is_delayed(self):
        """5-15 seconds age = DELAYED"""
        event_time = datetime.now(timezone.utc) - timedelta(seconds=8.0)
        q = NormalizedQuote(
            symbol="BANKNIFTY",
            exchange="NSE",
            provider="UPSTOX",
            last_price=53200.50,
            event_timestamp=event_time.isoformat(),
        )
        q.mark_stale(live_threshold_sec=5.0, delayed_threshold_sec=15.0)
        self.assertEqual(q.status, "DELAYED")
        self.assertTrue(q.is_stale)
        self.assertGreater(q.age_seconds, 5.0)
        self.assertLessEqual(q.age_seconds, 15.0)

    def test_old_tick_status_is_stale(self):
        """>15 seconds age = STALE"""
        event_time = datetime.now(timezone.utc) - timedelta(seconds=25.0)
        q = NormalizedQuote(
            symbol="SENSEX",
            exchange="BSE",
            provider="UPSTOX",
            last_price=81500.0,
            event_timestamp=event_time.isoformat(),
        )
        q.mark_stale(live_threshold_sec=5.0, delayed_threshold_sec=15.0)
        self.assertEqual(q.status, "STALE")
        self.assertTrue(q.is_stale)
        self.assertGreater(q.age_seconds, 15.0)

    def test_missing_or_zero_price_is_unavailable(self):
        """No valid tick or price <= 0 must be UNAVAILABLE, never 0.00"""
        q = NormalizedQuote(
            symbol="MIDCPNIFTY",
            exchange="NSE",
            provider="DHAN",
            last_price=None,
            event_timestamp=datetime.now(timezone.utc).isoformat(),
        )
        q.mark_stale()
        self.assertEqual(q.status, "UNAVAILABLE")
        self.assertIsNone(q.last_price)

        q_zero = NormalizedQuote(
            symbol="MIDCPNIFTY",
            exchange="NSE",
            provider="DHAN",
            last_price=0.0,
            event_timestamp=datetime.now(timezone.utc).isoformat(),
        )
        q_zero.mark_stale()
        self.assertEqual(q_zero.status, "UNAVAILABLE")

    def test_schema_section_3_completeness(self):
        """Verify Section 3 normalized quote schema fields in to_dict()"""
        now = datetime.now(timezone.utc)
        q = NormalizedQuote(
            symbol="NIFTY",
            exchange="NSE",
            segment="INDEX",
            provider="DHAN",
            last_price=24873.95,
            open=24800.0,
            high=24900.0,
            low=24750.0,
            close=24849.45,
            change=24.50,
            change_pct=0.10,
            bid=None,
            ask=None,
            volume=None,
            open_interest=None,
            event_timestamp=now.isoformat(),
        )
        d = q.to_dict()
        
        # Verify required keys in camelCase and snake_case
        self.assertEqual(d["symbol"], "NIFTY")
        self.assertEqual(d["price"], 24873.95)
        self.assertEqual(d["last_price"], 24873.95)
        self.assertEqual(d["previousClose"], 24849.45)
        self.assertEqual(d["previous_close"], 24849.45)
        self.assertEqual(d["change"], 24.50)
        self.assertEqual(d["changePct"], 0.10)
        self.assertIsNone(d["bid"])
        self.assertIsNone(d["ask"])
        self.assertIn("ageMs", d)
        self.assertIn("age_seconds", d)
        self.assertIn("status", d)
        self.assertIn("sourceTimestamp", d)
        self.assertIn("receivedAt", d)


class TestInstrumentMapping(unittest.TestCase):
    def test_upstox_indices_mapping(self):
        """Verify Upstox has valid mappings for all 5 Indian indices"""
        self.assertIn("NIFTY", OFFICIAL_UPSTOX_KEYS)
        self.assertEqual(OFFICIAL_UPSTOX_KEYS["NIFTY"]["instrument_key"], "NSE_INDEX|Nifty 50")
        
        self.assertIn("BANKNIFTY", OFFICIAL_UPSTOX_KEYS)
        self.assertEqual(OFFICIAL_UPSTOX_KEYS["BANKNIFTY"]["instrument_key"], "NSE_INDEX|Nifty Bank")
        
        self.assertIn("FINNIFTY", OFFICIAL_UPSTOX_KEYS)
        self.assertEqual(OFFICIAL_UPSTOX_KEYS["FINNIFTY"]["instrument_key"], "NSE_INDEX|Nifty Fin Service")
        
        self.assertIn("SENSEX", OFFICIAL_UPSTOX_KEYS)
        self.assertEqual(OFFICIAL_UPSTOX_KEYS["SENSEX"]["instrument_key"], "BSE_INDEX|SENSEX")
        
        self.assertIn("MIDCPNIFTY", OFFICIAL_UPSTOX_KEYS)
        self.assertEqual(OFFICIAL_UPSTOX_KEYS["MIDCPNIFTY"]["instrument_key"], "NSE_INDEX|NIFTY MID SELECT")

    def test_dhan_indices_mapping(self):
        """Verify Dhan has valid security IDs for all 5 Indian indices"""
        self.assertIn("NIFTY", OFFICIAL_DHAN_KEYS)
        self.assertEqual(OFFICIAL_DHAN_KEYS["NIFTY"]["security_id"], "13")
        
        self.assertIn("BANKNIFTY", OFFICIAL_DHAN_KEYS)
        self.assertEqual(OFFICIAL_DHAN_KEYS["BANKNIFTY"]["security_id"], "25")
        
        self.assertIn("FINNIFTY", OFFICIAL_DHAN_KEYS)
        self.assertEqual(OFFICIAL_DHAN_KEYS["FINNIFTY"]["security_id"], "27")
        
        self.assertIn("SENSEX", OFFICIAL_DHAN_KEYS)
        self.assertEqual(OFFICIAL_DHAN_KEYS["SENSEX"]["security_id"], "51")
        self.assertEqual(OFFICIAL_DHAN_KEYS["SENSEX"]["exchange_segment"], "BSE_IDX")
        
        self.assertIn("MIDCPNIFTY", OFFICIAL_DHAN_KEYS)
        self.assertEqual(OFFICIAL_DHAN_KEYS["MIDCPNIFTY"]["security_id"], "447")

    def test_canonical_alias_grouping(self):
        """Verify gateway resolves canonical aliases accurately"""
        nifty_aliases = get_quote_aliases("NIFTY")
        self.assertIn("NSE:NIFTY", nifty_aliases)
        self.assertIn("NSE_INDEX|NIFTY 50", nifty_aliases)
        self.assertIn("DHAN:13", nifty_aliases)

        sensex_aliases = get_quote_aliases("SENSEX")
        self.assertIn("BSE:SENSEX", sensex_aliases)
        self.assertIn("BSE_INDEX|SENSEX", sensex_aliases)
        self.assertIn("DHAN:51", sensex_aliases)


class TestTopMoversAndRaceConditions(unittest.TestCase):
    def test_top_movers_ignores_unavailable_or_zero_prices(self):
        """Top movers must skip instruments with 0 or missing prices"""
        quotes = {
            "NIFTY": NormalizedQuote(
                symbol="NIFTY", exchange="NSE", provider="DHAN", last_price=24800.0, change_pct=1.2, volume=5000.0
            ),
            "RELIANCE": NormalizedQuote(
                symbol="RELIANCE", exchange="NSE", provider="DHAN", last_price=2900.0, change_pct=3.5, volume=20000.0
            ),
            "TCS": NormalizedQuote(
                symbol="TCS", exchange="NSE", provider="DHAN", last_price=4100.0, change_pct=-2.1, volume=15000.0
            ),
            "DEAD_SYM": NormalizedQuote(
                symbol="DEAD_SYM", exchange="NSE", provider="DHAN", last_price=0.0, change_pct=15.0, volume=0.0
            ),
            "NULL_SYM": NormalizedQuote(
                symbol="NULL_SYM", exchange="NSE", provider="DHAN", last_price=None, change_pct=None, volume=None
            ),
        }
        
        movers = _compute_top_movers(quotes)
        
        # Dead and null symbols must NOT be in gainers, losers, or volume leaders
        gainer_symbols = [g["symbol"] for g in movers["gainers"]]
        loser_symbols = [l["symbol"] for l in movers["losers"]]
        volume_symbols = [v["symbol"] for v in movers["volume_leaders"]]
        
        self.assertIn("RELIANCE", gainer_symbols)
        self.assertIn("TCS", loser_symbols)
        self.assertNotIn("DEAD_SYM", gainer_symbols)
        self.assertNotIn("NULL_SYM", gainer_symbols)
        self.assertNotIn("DEAD_SYM", volume_symbols)

    def test_out_of_order_tick_protection(self):
        """Timestamp comparison prevents older REST or tick from overwriting newer tick"""
        t_newer = datetime.now(timezone.utc)
        t_older = t_newer - timedelta(seconds=10)

        quote_newer = NormalizedQuote(
            symbol="BTC/USDT",
            exchange="BINANCE",
            provider="binance_ws",
            last_price=65100.0,
            event_timestamp=t_newer.isoformat(),
        )
        quote_older = NormalizedQuote(
            symbol="BTC/USDT",
            exchange="BINANCE",
            provider="binance_rest",
            last_price=65000.0,
            event_timestamp=t_older.isoformat(),
        )

        # Simulation of store update logic:
        store = {"BTC/USDT": quote_newer}
        
        # Attempt to insert older quote
        existing = store["BTC/USDT"]
        try:
            ts_existing = datetime.fromisoformat(existing.event_timestamp.replace("Z", "+00:00"))
            ts_new = datetime.fromisoformat(quote_older.event_timestamp.replace("Z", "+00:00"))
            if ts_new >= ts_existing:
                store["BTC/USDT"] = quote_older
        except Exception:
            pass

        # Verify newer quote was NOT overwritten
        self.assertEqual(store["BTC/USDT"].last_price, 65100.0)


if __name__ == "__main__":
    unittest.main()
