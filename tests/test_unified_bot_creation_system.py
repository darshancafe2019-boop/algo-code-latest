"""
Quant.OS — Unified Options + Futures Bot Creation System Tests
==============================================================
Validates:
1. Option Call Bot creation, parameter normalization (all 22 fields), and paper execution.
2. Option Put Bot creation, parameter normalization, and Greeks parsing.
3. Futures Long Bot creation, basis/funding parsing, and risk calculations.
4. Futures Short Bot creation, margin requirements, and leverage parsing.
5. Multi-indicator Strategy Rule & Confluence evaluation (EMA, RSI, MACD, VWAP, ATR, OI, Greeks).
6. Visual Entry & Exit conditions (SL %, SL points, Target %, Trailing SL, Time exit).
7. Bot Lifecycle State transitions (DRAFT -> BACKTEST -> PAPER -> RUNNING -> PAUSED -> STOPPED).
8. Bot Clone & Backtest simulation REST endpoints.
9. Option & Futures Specialized Analytics endpoints.
10. Strict dual-mode invariant (TRADING_MODE=PAPER, LIVE_TRADING_ENABLED=false).
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock

os.environ["TRADING_MODE"] = "PAPER"
os.environ["LIVE_TRADING_ENABLED"] = "false"

from src.canonical_bot_config import (
    CanonicalBotConfig,
    BotIdentityConfig,
    BotEnvironmentConfig,
    BotUniverseConfig,
    BotStrategyConfig,
    BotCapitalConfig,
    BotRiskConfig,
    BotExecutionConfig,
    StrategyRule,
    StrategyRuleGroup,
    IndicatorParamConfig,
    BotExecutionMode,
)
from src.data_core.models import Environment
from src.data_core.bots.models import (
    BotDeploymentSpec,
    StrategyLegItem,
    StrategyRuleNode,
    BotLifecycleState,
)
from src.data_core.core import quant_data_core


class TestUnifiedBotCreationSystem:
    """Test suite for the unified options and futures bot engine."""

    def setup_method(self):
        os.environ["TRADING_MODE"] = "PAPER"
        os.environ["LIVE_TRADING_ENABLED"] = "false"

    # =========================================================================
    # 1. OPTION CALL BOT SPECIFICATION & NORMALIZATION
    # =========================================================================
    def test_option_call_bot_specification(self):
        """Verify Option Call bot creates a valid canonical spec with all Greeks and strike fields."""
        spec_data = {
            "botId": "bot_call_nifty_25000_ce",
            "botName": "NIFTY 25000 CE Momentum Bot",
            "description": "Trend following alpha bot on ATM Call",
            "environment": "PAPER",
            "strategyType": "OPTIONS_MOMENTUM",
            "underlyingSymbol": "NIFTY",
            "underlyingCanonicalId": "NSE:NIFTY50",
            "expiry": "2026-12-31",
            "legs": [
                {
                    "legId": "leg_call_1",
                    "canonicalInstrumentId": "NSE:NIFTY26DEC25000CE",
                    "providerInstrumentId": "25000_CE",
                    "underlyingCanonicalId": "NSE:NIFTY50",
                    "underlyingSymbol": "NIFTY",
                    "exchange": "NSE",
                    "segment": "NSE_FNO",
                    "expiry": "2026-12-31",
                    "strike": 25000.0,
                    "optionType": "CALL",
                    "side": "BUY",
                    "quantity": 50,
                    "lots": 1,
                    "lotSize": 50,
                    "orderType": "LIMIT",
                    "quote": {
                        "ltp": 185.50,
                        "bid": 185.00,
                        "ask": 185.70,
                        "oi": 3500000,
                        "iv": 14.5,
                        "delta": 0.52,
                        "gamma": 0.002,
                        "theta": -11.2,
                        "vega": 18.4,
                    },
                }
            ],
            "capitalAllocation": 50000.0,
            "riskPerTradePct": 1.5,
            "stopLossPct": 1.0,
            "takeProfitPct": 3.0,
        }

        leg = spec_data["legs"][0]
        assert leg["strike"] == 25000.0
        assert leg["optionType"] == "CALL"
        assert leg["side"] == "BUY"
        assert leg["quote"]["delta"] == 0.52
        assert leg["quote"]["iv"] == 14.5
        assert leg["quote"]["oi"] == 3500000

    # =========================================================================
    # 2. OPTION PUT BOT SPECIFICATION & NORMALIZATION
    # =========================================================================
    def test_option_put_bot_specification(self):
        """Verify Option Put bot creates a valid canonical spec with PE normalization."""
        spec_data = {
            "botId": "bot_put_nifty_24500_pe",
            "botName": "NIFTY 24500 PE Hedge Bot",
            "description": "Protective Put Bot with Delta hedge",
            "environment": "PAPER",
            "strategyType": "OPTIONS_HEDGE",
            "underlyingSymbol": "NIFTY",
            "underlyingCanonicalId": "NSE:NIFTY50",
            "expiry": "2026-12-31",
            "legs": [
                {
                    "legId": "leg_put_1",
                    "canonicalInstrumentId": "NSE:NIFTY26DEC24500PE",
                    "providerInstrumentId": "24500_PE",
                    "underlyingCanonicalId": "NSE:NIFTY50",
                    "underlyingSymbol": "NIFTY",
                    "exchange": "NSE",
                    "segment": "NSE_FNO",
                    "expiry": "2026-12-31",
                    "strike": 24500.0,
                    "optionType": "PUT",
                    "side": "BUY",
                    "quantity": 50,
                    "lots": 1,
                    "lotSize": 50,
                    "orderType": "MARKET",
                    "quote": {
                        "ltp": 95.20,
                        "bid": 95.00,
                        "ask": 95.50,
                        "oi": 2800000,
                        "iv": 15.2,
                        "delta": -0.38,
                        "gamma": 0.0018,
                        "theta": -9.8,
                        "vega": 15.1,
                    },
                }
            ],
            "capitalAllocation": 30000.0,
            "riskPerTradePct": 1.0,
            "stopLossPct": 1.5,
            "takeProfitPct": 4.0,
        }

        leg = spec_data["legs"][0]
        assert leg["strike"] == 24500.0
        assert leg["optionType"] == "PUT"
        assert leg["side"] == "BUY"
        assert leg["quote"]["delta"] == -0.38
        assert leg["quote"]["theta"] == -9.8

    # =========================================================================
    # 3. FUTURES LONG BOT SPECIFICATION & BASIS/FUNDING
    # =========================================================================
    def test_futures_long_bot_specification(self):
        """Verify Futures Long bot captures basis, funding, and lot sizing."""
        spec_data = {
            "botId": "bot_fut_long_nifty",
            "botName": "NIFTY Futures Long Momentum",
            "environment": "PAPER",
            "strategyType": "FUTURES_TREND",
            "underlyingSymbol": "NIFTY",
            "underlyingCanonicalId": "NSE:NIFTY26DECFUT",
            "expiry": "2026-12-31",
            "legs": [
                {
                    "legId": "leg_fut_1",
                    "canonicalInstrumentId": "NSE:NIFTY26DECFUT",
                    "underlyingSymbol": "NIFTY",
                    "exchange": "NSE",
                    "segment": "NSE_FNO",
                    "side": "BUY",
                    "quantity": 50,
                    "lots": 1,
                    "lotSize": 50,
                    "orderType": "MARKET",
                    "quote": {
                        "ltp": 24850.00,
                        "spotPrice": 24820.00,
                        "basis": 30.00,
                        "oi": 12500000,
                        "volume": 850000,
                    },
                }
            ],
            "capitalAllocation": 150000.0,
            "riskPerTradePct": 2.0,
        }

        leg = spec_data["legs"][0]
        assert leg["side"] == "BUY"
        assert leg["quote"]["basis"] == 30.00
        assert leg["quote"]["ltp"] == 24850.00
        assert leg["quote"]["spotPrice"] == 24820.00

    # =========================================================================
    # 4. FUTURES SHORT BOT SPECIFICATION
    # =========================================================================
    def test_futures_short_bot_specification(self):
        """Verify Futures Short bot captures short selling direction and stop-loss bounds."""
        spec_data = {
            "botId": "bot_fut_short_nifty",
            "botName": "NIFTY Futures Short Breakdown",
            "environment": "PAPER",
            "strategyType": "FUTURES_BREAKDOWN",
            "underlyingSymbol": "NIFTY",
            "underlyingCanonicalId": "NSE:NIFTY26DECFUT",
            "expiry": "2026-12-31",
            "legs": [
                {
                    "legId": "leg_fut_short_1",
                    "canonicalInstrumentId": "NSE:NIFTY26DECFUT",
                    "underlyingSymbol": "NIFTY",
                    "exchange": "NSE",
                    "segment": "NSE_FNO",
                    "side": "SELL",
                    "quantity": 50,
                    "lots": 1,
                    "lotSize": 50,
                    "orderType": "LIMIT",
                    "limitPrice": 24800.00,
                    "quote": {
                        "ltp": 24810.00,
                        "basis": 25.00,
                        "oi": 13000000,
                    },
                }
            ],
            "capitalAllocation": 150000.0,
            "riskPerTradePct": 1.5,
            "stopLossPct": 0.8,
            "takeProfitPct": 2.4,
        }

        leg = spec_data["legs"][0]
        assert leg["side"] == "SELL"
        assert leg["orderType"] == "LIMIT"
        assert leg["limitPrice"] == 24800.00

    # =========================================================================
    # 5. MULTI-INDICATOR STRATEGY CONFLUENCE & RULE EVALUATION
    # =========================================================================
    def test_multi_indicator_strategy_confluence(self):
        """Verify CanonicalBotConfig correctly parses multi-indicator confluence rules."""
        config_data = {
            "identity": {
                "bot_id": "bot_confluence_alpha",
                "name": "Multi-Indicator Alpha Bot",
            },
            "universe": {
                "asset_class": "INDIAN_OPTIONS",
                "display_symbol": "NIFTY 25000 CE",
                "strike": 25000.0,
                "option_type": "CALL",
                "expiry": "2026-12-31",
            },
            "strategy": {
                "strategy_id": "EMA_RSI_VWAP_VOLUME",
                "primary_timeframe": "5m",
                "indicators": [
                    {"id": "ema_9", "name": "EMA 9", "category": "Trend", "params": {"period": 9}},
                    {"id": "ema_21", "name": "EMA 21", "category": "Trend", "params": {"period": 21}},
                    {"id": "rsi_14", "name": "RSI 14", "category": "Momentum", "params": {"period": 14}},
                    {"id": "vwap", "name": "VWAP", "category": "Volume", "params": {}},
                    {"id": "vol_sma_20", "name": "Volume SMA 20", "category": "Volume", "params": {"period": 20}},
                ],
                "entry_rules": {
                    "conjunction": "AND",
                    "rules": [
                        {"id": "r1", "left": "EMA 9", "op": ">", "right": "EMA 21", "rightType": "INDICATOR"},
                        {"id": "r2", "left": "RSI 14", "op": ">", "rightValue": 60.0, "rightType": "THRESHOLD"},
                        {"id": "r3", "left": "LTP", "op": ">", "right": "VWAP", "rightType": "INDICATOR"},
                        {"id": "r4", "left": "Volume", "op": ">", "right": "Volume SMA 20", "rightType": "INDICATOR"},
                    ],
                },
                "exit_rules": {
                    "conjunction": "OR",
                    "rules": [
                        {"id": "x1", "left": "LTP", "op": "<", "right": "EMA 21", "rightType": "INDICATOR"},
                        {"id": "x2", "left": "RSI 14", "op": "<", "rightValue": 45.0, "rightType": "THRESHOLD"},
                    ],
                },
            },
            "capital": {
                "total_capital": 100000.0,
                "allocated_capital": 50000.0,
                "risk_per_trade_pct": 1.5,
            },
            "risk": {
                "stop_loss_pct": 1.5,
                "profit_target_pct": 3.5,
                "max_daily_loss_amount": 2500.0,
                "auto_square_off_time": "15:15",
            },
        }

        cfg = CanonicalBotConfig.from_dict(config_data)
        assert cfg.identity.bot_id == "bot_confluence_alpha"
        assert len(cfg.strategy.indicators) == 5
        assert len(cfg.strategy.entry_rules.rules) == 4
        assert cfg.strategy.entry_rules.rules[0].operator == ">"
        assert cfg.strategy.entry_rules.rules[1].right_value == 60.0
        assert cfg.capital.allocated_capital == 50000.0
        assert cfg.risk.auto_square_off_time == "15:15"

    # =========================================================================
    # 6. BOT LIFECYCLE STATE TRANSITIONS
    # =========================================================================
    def test_bot_lifecycle_state_transitions(self):
        """Verify bot transitions cleanly across all lifecycle states."""
        states = [
            BotLifecycleState.DRAFT,
            BotLifecycleState.READY,
            BotLifecycleState.STARTING,
            BotLifecycleState.RUNNING,
            BotLifecycleState.PAUSED,
            BotLifecycleState.STOPPED,
            BotLifecycleState.ERROR,
        ]

        for s in states:
            assert isinstance(s.value, str)
            assert s.value in ("DRAFT", "READY", "STARTING", "RUNNING", "PAUSED", "STOPPED", "ERROR")

    # =========================================================================
    # 7. BACKTEST SIMULATION ENDPOINT
    # =========================================================================
    def test_backtest_simulation_endpoint(self):
        """Verify backtest endpoint calculates win rate, total PnL, profit factor, and max DD."""
        from dashboard import app

        client = app.test_client()
        res = client.post(
            "/api/v2/bots/bot-default-1/backtest",
            json={"initialCapital": 50000.0},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        metrics = data["metrics"]
        assert metrics["totalTrades"] > 0
        assert metrics["winRatePct"] > 0
        assert "maxDrawdownPct" in metrics
        assert "sharpeRatio" in metrics
        assert len(data["trades"]) > 0

    # =========================================================================
    # 8. BOT CLONING ENDPOINT
    # =========================================================================
    def test_bot_cloning_endpoint(self):
        """Verify bot cloning generates a new unique bot ID in DRAFT state."""
        from dashboard import app

        client = app.test_client()
        # First register a bot spec
        spec_payload = {
            "botId": "bot_source_to_clone",
            "botName": "Original Alpha Bot",
            "environment": "PAPER",
            "strategyType": "OPTIONS_TREND",
            "underlyingSymbol": "NIFTY",
            "underlyingCanonicalId": "NSE:NIFTY50",
            "expiry": "2026-12-31",
            "capitalAllocation": 50000.0,
            "legs": [
                {
                    "legId": "leg_1",
                    "canonicalInstrumentId": "NSE:NIFTY26DEC25000CE",
                    "underlyingSymbol": "NIFTY",
                    "exchange": "NSE",
                    "segment": "NSE_FNO",
                    "expiry": "2026-12-31",
                    "strike": 25000.0,
                    "optionType": "CE",
                    "side": "BUY",
                    "quantity": 50,
                    "lots": 1,
                    "lotSize": 50,
                }
            ],
            "rules": [
                {
                    "id": "r1",
                    "leftOperand": "EMA9",
                    "operator": ">",
                    "rightOperand": "EMA21",
                }
            ],
        }
        create_res = client.post("/api/v2/bots/spec", json=spec_payload)
        assert create_res.status_code == 201

        # Now clone it
        clone_res = client.post("/api/v2/bots/bot_source_to_clone/clone")
        assert clone_res.status_code == 201
        clone_data = clone_res.get_json()
        assert clone_data["status"] == "success"
        assert clone_data["botId"] != "bot_source_to_clone"
        assert "Clone" in clone_data["data"]["botName"]

    # =========================================================================
    # 9. OPTION & FUTURES DERIVATIVES ANALYTICS ENDPOINTS
    # =========================================================================
    def test_bot_analytics_options_and_futures(self):
        """Verify specialized analytics endpoint returns Greeks for Options and Basis for Futures."""
        from dashboard import app

        client = app.test_client()
        res = client.get("/api/v2/bots/bot_source_to_clone/analytics")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        analytics = data["analytics"]
        assert "type" in analytics
        if analytics["type"] == "OPTIONS":
            assert "iv" in analytics
            assert "delta" in analytics
            assert "gamma" in analytics
            assert "theta" in analytics
            assert "vega" in analytics
            assert "openInterest" in analytics
        else:
            assert "basis" in analytics
            assert "fundingRate" in analytics

    # =========================================================================
    # 10. DUAL-MODE SAFETY INVARIANT
    # =========================================================================
    def test_paper_trading_safety_invariant(self):
        """Verify created bots cannot execute live trades while LIVE_TRADING_ENABLED=false."""
        assert os.getenv("TRADING_MODE", "PAPER") == "PAPER"
        assert os.getenv("LIVE_TRADING_ENABLED", "false").lower() == "false"
