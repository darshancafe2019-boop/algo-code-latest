import unittest

from src.btc_options_intelligence import analyse_btc_options


def candles(direction=1):
    base = [100, 101, 102, 103, 104]
    if direction < 0:
        base = [104, 103, 102, 101, 100]
    return [{"open": x - 0.2, "high": x + 0.5, "low": x - 0.5, "close": x, "volume": 10} for x in base]


class BTCOptionsIntelligenceTests(unittest.TestCase):
    def test_missing_data_fails_closed(self):
        result = analyse_btc_options([], {}, {})
        self.assertEqual(result["decision"], "WAIT FOR CONFIRMATION")
        self.assertFalse(result["validated_setup"])
        self.assertEqual(result["mode"], "PAPER")
        self.assertFalse(result["live_execution_enabled"])
        self.assertTrue(result["missing_data"])

    def test_both_directions_are_scored(self):
        result = analyse_btc_options(
            chains=[{"expiry": "30-12-2026", "strikes": []}],
            candles={"1h": candles(1), "15m": candles(1), "5m": candles(1)},
            futures={"open_interest_change_pct": 1.2, "funding_rate": 0.0001},
        )
        self.assertIn("score", result["bullish"])
        self.assertIn("score", result["bearish"])
        self.assertEqual(result["mode"], "PAPER")
        self.assertFalse(result["live_execution_enabled"])

    def test_risk_budget_is_capped_at_half_percent(self):
        result = analyse_btc_options([], {}, {}, paper_capital=100000, risk_fraction=0.02)
        self.assertEqual(result["risk_budget"], 500.0)
        self.assertEqual(result["risk_fraction"], 0.005)


if __name__ == "__main__":
    unittest.main()
