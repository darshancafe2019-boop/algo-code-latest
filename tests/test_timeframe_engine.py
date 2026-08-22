"""
Comprehensive Automated Tests for Multi-Timeframe Trading Engine.

Validates:
1. Canonical timeframe parsing (standard and custom intervals).
2. Provider capability detection (direct, aggregated, unsupported).
3. Resampling and UTC boundary alignment.
4. Closed-candle protection (is_closed boolean integrity).
5. REST API endpoints (/api/timeframes, /api/candles, /api/strategy/multi-timeframe, /api/quick-trade).
6. Natural language timeframe command parsing.
"""

import pytest
import pandas as pd
from datetime import datetime, timezone, timedelta
from src.candle_engine import candle_engine, parse_timeframe, STANDARD_TIMEFRAMES
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestCanonicalTimeframesAndParsing:
    """Test suite for canonical timeframe parsing and metadata."""

    def test_01_standard_timeframes_catalog(self):
        assert len(STANDARD_TIMEFRAMES) >= 28
        values = [tf.value for tf in STANDARD_TIMEFRAMES]
        assert "1s" in values
        assert "5s" in values
        assert "1m" in values
        assert "5m" in values
        assert "15m" in values
        assert "1h" in values
        assert "4h" in values
        assert "1d" in values
        assert "1w" in values
        assert "1M" in values

    def test_02_parse_standard_timeframes(self):
        tf_5m = parse_timeframe("5m")
        assert tf_5m.value == "5m"
        assert tf_5m.label == "5M"
        assert tf_5m.seconds == 300
        assert tf_5m.category == "minute"

        tf_1h = parse_timeframe("1h")
        assert tf_1h.value == "1h"
        assert tf_1h.label == "1H"
        assert tf_1h.seconds == 3600
        assert tf_1h.category == "hour"

        tf_1d = parse_timeframe("1D")
        assert tf_1d.value == "1d"
        assert tf_1d.label == "1D"
        assert tf_1d.seconds == 86400
        assert tf_1d.category == "day"

    def test_03_parse_custom_timeframes(self):
        tf_7m = parse_timeframe("7m")
        assert tf_7m.value == "7m"
        assert tf_7m.label == "7M"
        assert tf_7m.seconds == 420
        assert tf_7m.category == "minute"
        assert tf_7m.is_standard is False

        tf_25m = parse_timeframe("25min")
        assert tf_25m.value == "25m"
        assert tf_25m.seconds == 1500

        tf_90m = parse_timeframe("90m")
        assert tf_90m.value == "90m"
        assert tf_90m.seconds == 5400

        tf_45s = parse_timeframe("45s")
        assert tf_45s.value == "45s"
        assert tf_45s.seconds == 45
        assert tf_45s.category == "second"

    def test_04_provider_capabilities_detection(self):
        # Binance native
        status_1m = candle_engine.get_timeframe_support_status("1m", "ccxt_binance")
        assert status_1m["status"] == "DIRECT"
        assert status_1m["is_supported"] is True

        status_5m = candle_engine.get_timeframe_support_status("5m", "ccxt_binance")
        assert status_5m["status"] == "DIRECT"

        # Binance synthetic aggregated (e.g. 2m, 7m, 45m)
        status_7m = candle_engine.get_timeframe_support_status("7m", "ccxt_binance")
        assert status_7m["status"] == "AGGREGATED"
        assert status_7m["is_supported"] is True

        status_45m = candle_engine.get_timeframe_support_status("45m", "ccxt_binance")
        assert status_45m["status"] == "AGGREGATED"
        assert status_45m["is_supported"] is True


class TestCandleResamplingAndClosedProtection:
    """Test suite for candle resampling and closed-candle protection."""

    def test_01_resample_1m_to_5m(self):
        base_ts = datetime(2026, 8, 18, 10, 0, tzinfo=timezone.utc)
        records = []
        for i in range(15): # 15 1-minute candles
            ts = base_ts + timedelta(minutes=i)
            records.append({
                "timestamp": ts,
                "open": 64000.0 + i * 10,
                "high": 64000.0 + i * 10 + 5,
                "low": 64000.0 + i * 10 - 5,
                "close": 64000.0 + i * 10 + 2,
                "volume": 10.0
            })

        df_1m = pd.DataFrame(records)
        df_5m = candle_engine.resample_candles(df_1m, target_seconds=300)

        assert len(df_5m) == 3 # 15 min / 5 min = 3 candles
        # First 5m candle: open is first open, high is max high, low is min low, close is last close, volume is sum
        first_5m = df_5m.iloc[0]
        assert first_5m["open"] == 64000.0
        assert first_5m["volume"] == 50.0 # 5 * 10.0
        assert "is_closed" in df_5m.columns

    def test_02_closed_candle_protection_flag(self):
        now_dt = datetime.now(timezone.utc)
        # Historical candle (closed)
        closed_ts = now_dt - timedelta(minutes=30)
        # Ongoing candle (forming)
        forming_ts = now_dt - timedelta(seconds=10)

        df = pd.DataFrame([
            {"timestamp": closed_ts, "open": 64000.0, "high": 64050.0, "low": 63950.0, "close": 64020.0, "volume": 100.0},
            {"timestamp": forming_ts, "open": 64020.0, "high": 64080.0, "low": 64010.0, "close": 64060.0, "volume": 20.0},
        ])

        cleaned = candle_engine.validate_and_clean_candles(df, timeframe_seconds=300) # 5m = 300s
        assert bool(cleaned.iloc[0]["is_closed"]) is True
        assert bool(cleaned.iloc[1]["is_closed"]) is False


class TestMultiTimeframeRestApiEndpoints:
    """Test suite for multi-timeframe REST API contracts."""

    def test_01_api_timeframes(self, client):
        res = client.get("/api/timeframes")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "timeframes" in data
        assert "categories" in data
        assert "toolbar_presets" in data
        assert "capabilities" in data

    def test_02_api_timeframes_capabilities(self, client):
        res = client.get("/api/timeframes/capabilities?provider=ccxt_binance&symbol=BTC/USDT")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["provider"] == "ccxt_binance"
        assert len(data["capabilities"]) > 0

    def test_03_api_candles_standard_and_synthetic(self, client):
        # Test 5m (Direct)
        res_5m = client.get("/api/candles?symbol=BTC/USDT&timeframe=5m&limit=50")
        assert res_5m.status_code == 200
        data_5m = res_5m.get_json()
        assert data_5m["status"] in ["success", "warning"]
        assert len(data_5m["candles"]) > 0
        assert "is_closed" in data_5m["candles"][0]

        # Test 7m (Synthetic)
        res_7m = client.get("/api/candles?symbol=BTC/USDT&timeframe=7m&limit=30")
        assert res_7m.status_code == 200
        data_7m = res_7m.get_json()
        assert data_7m["label"] == "7M"
        assert len(data_7m["candles"]) > 0

    def test_04_api_strategy_multi_timeframe(self, client):
        res = client.get("/api/strategy/multi-timeframe?symbol=BTC/USDT&entry_tf=5m&confirm_tf=15m&trend_tf=1h&higher_tf=4h")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "overall_signal" in data
        assert "overall_confidence_pct" in data
        assert len(data["tiers"]) == 4

        roles = [t["role"] for t in data["tiers"]]
        assert "ENTRY" in roles
        assert "CONFIRMATION" in roles
        assert "TREND" in roles
        assert "HIGHER_TF" in roles

    def test_05_api_quick_trade_estimate_and_execute(self, client):
        # 1. Estimate
        est_res = client.post(
            "/api/quick-trade/estimate",
            json={
                "symbol": "BTC/USDT",
                "direction": "LONG",
                "quantity": 0.05,
                "price": 64000.0,
                "leverage": 5.0,
                "stop_loss": 63000.0,
                "take_profit": 66000.0
            }
        )
        assert est_res.status_code == 200
        est_data = est_res.get_json()
        assert est_data["status"] == "success"
        assert est_data["required_margin"] == 640.0 # (0.05 * 64000) / 5
        assert est_data["stop_loss_risk"] == 50.0 # 0.05 * 1000
        assert est_data["take_profit_potential"] == 100.0 # 0.05 * 2000
        assert est_data["risk_reward_ratio"] == 2.0
        assert est_data["can_execute"] is True

        # 2. Execute Paper Trade
        exec_res = client.post(
            "/api/quick-trade/execute",
            json={
                "symbol": "BTC/USDT",
                "direction": "LONG",
                "quantity": 0.05,
                "price": 64000.0,
                "stop_loss": 63000.0,
                "take_profit": 66000.0,
                "mode": "PAPER",
                "bot_id": "bot-1"
            }
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.get_json()
        assert exec_data["status"] == "success"
        assert exec_data["mode"] == "PAPER"
        assert "trade_id" in exec_data

    def test_06_natural_language_timeframe_commands(self, client):
        # 1. Switch to 1m
        res1 = client.post("/api/ai/command", json={"prompt": "Show BTC 1 minute"})
        assert res1.status_code == 200
        data1 = res1.get_json()
        assert data1["command_type"] == "TIMEFRAME_SWITCH"
        assert data1["parameters"]["timeframe"] == "1m"

        # 2. Configure 1 hour confirmation
        res2 = client.post("/api/ai/command", json={"prompt": "Use 1 hour confirmation"})
        assert res2.status_code == 200
        data2 = res2.get_json()
        assert data2["command_type"] == "MULTI_TIMEFRAME_CONFIG"
        assert data2["parameters"]["timeframe"] == "1h"

        # 3. Configure 4 hour trend
        res3 = client.post("/api/ai/command", json={"prompt": "Use 4 hour trend"})
        assert res3.status_code == 200
        data3 = res3.get_json()
        assert data3["command_type"] == "MULTI_TIMEFRAME_CONFIG"
        assert data3["parameters"]["timeframe"] == "4h"
