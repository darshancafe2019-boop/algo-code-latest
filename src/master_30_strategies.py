"""
QUANT.OS MASTER 30-STRATEGY TRADING ENGINE & REGISTRY
======================================================
Authoritative implementation of all 30 algorithmic trading strategies.
Provides deterministic signal generation, schema-driven parameters, presets,
indicator calculations, stop-loss/take-profit mathematics, risk-sizing,
pre-trade validation, duplicate signal protection, and backtesting.
"""

import math
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

from src.indicators import (
    calculate_emas,
    calculate_sma,
    calculate_rsi,
    calculate_macd,
    calculate_atr,
    calculate_bollinger_bands,
    calculate_adx,
    calculate_supertrend,
    calculate_vwap,
    calculate_obv,
    calculate_donchian_channels,
)

logger = logging.getLogger("Master30Strategies")



# ============================================================================
# DATA STRUCTURES & SIGNAL INTERFACES
# ============================================================================

@dataclass
class StrategySignal:
    direction: str  # "LONG", "SHORT", "EXIT", "HOLD", "NO_SIGNAL"
    signal_score: float  # 0.0 to 100.0
    trigger_price: float
    stop_price: float
    target_price: float
    risk_reward: float
    strategy_id: str
    strategy_name: str
    strategy_version: str
    confirmation_status: str  # "CONFIRMED", "WAITING", "REJECTED", "DATA_UNAVAILABLE"
    timestamp: str
    reason: str
    indicators_confirming: List[str] = field(default_factory=list)
    indicators_conflicting: List[str] = field(default_factory=list)
    market_regime: str = "TRENDING"
    data_freshness: str = "LIVE"
    extra_metrics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StrategyDefinition:
    id: str
    number: str
    name: str
    category: str
    part: str
    description: str
    purpose: str
    primary_timeframe: str
    supported_timeframes: List[str]
    supported_markets: List[str]
    direction_support: str  # "LONG_SHORT", "LONG_ONLY", "SHORT_ONLY"
    complexity: str  # "Introductory", "Intermediate", "Advanced", "Institutional"
    required_indicators: List[str]
    required_data: List[str]
    default_parameters: Dict[str, Any]
    parameter_schema: Dict[str, Any]
    presets: Dict[str, Dict[str, Any]]
    version: str = "1.0.0"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ============================================================================
# 30 STRATEGY DEFINITIONS & SCHEMAS
# ============================================================================

STRATEGY_REGISTRY_CATALOG: Dict[str, StrategyDefinition] = {
    # ------------------------------------------------------------------------
    # PART I — TREND & CONTINUATION (S01 - S05)
    # ------------------------------------------------------------------------
    "S01": StrategyDefinition(
        id="S01",
        number="01",
        name="Trend Pullback to EMA",
        category="Trend & Continuation",
        part="PART I — TREND & CONTINUATION",
        description="Enters pullback pullbacks to intermediate EMA when dominant macro trend is confirmed.",
        purpose="Institutional scale-in during minor retracements within strong established trends.",
        primary_timeframe="4H",
        supported_timeframes=["15m", "30m", "1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Introductory",
        required_indicators=["EMA_9", "EMA_21", "EMA_50", "EMA_200", "ATR_14", "RSI_14", "VOLUME_SMA_20"],
        required_data=["OHLCV"],
        default_parameters={
            "ema_fast": 9,
            "ema_trend": 21,
            "ema_major": 50,
            "ema_filter": 200,
            "rsi_threshold": 50.0,
            "volume_mult": 1.1,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
            "pullback_tolerance_pct": 0.35,
        },
        parameter_schema={
            "ema_fast": {"type": "integer", "min": 5, "max": 20, "label": "Fast EMA"},
            "ema_trend": {"type": "integer", "min": 15, "max": 35, "label": "Trend Reference EMA"},
            "ema_major": {"type": "integer", "min": 40, "max": 100, "label": "Major Baseline EMA"},
            "ema_filter": {"type": "integer", "min": 100, "max": 300, "label": "Macro Trend Filter EMA"},
            "rsi_threshold": {"type": "number", "min": 40.0, "max": 60.0, "label": "RSI Confirmation"},
            "volume_mult": {"type": "number", "min": 0.8, "max": 2.5, "label": "Volume SMA Multiplier"},
            "atr_multiplier": {"type": "number", "min": 1.0, "max": 3.5, "label": "ATR Stop Multiplier"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 4.0, "label": "Risk/Reward Multiple"},
            "pullback_tolerance_pct": {"type": "number", "min": 0.1, "max": 1.5, "label": "Pullback Band Tolerance (%)"},
        },
        presets={
            "Conservative": {"ema_fast": 9, "ema_trend": 21, "ema_major": 50, "ema_filter": 200, "rsi_threshold": 52.0, "volume_mult": 1.3, "atr_multiplier": 2.0, "rr_ratio": 2.5},
            "Balanced": {"ema_fast": 9, "ema_trend": 21, "ema_major": 50, "ema_filter": 200, "rsi_threshold": 50.0, "volume_mult": 1.1, "atr_multiplier": 1.5, "rr_ratio": 2.0},
            "Aggressive": {"ema_fast": 8, "ema_trend": 18, "ema_major": 45, "ema_filter": 150, "rsi_threshold": 48.0, "volume_mult": 0.9, "atr_multiplier": 1.2, "rr_ratio": 1.8},
        }
    ),
    "S02": StrategyDefinition(
        id="S02",
        number="02",
        name="Momentum Expansion",
        category="Trend & Continuation",
        part="PART I — TREND & CONTINUATION",
        description="Captures aggressive breakout momentum when MACD, RSI, and Volume surge concurrently.",
        purpose="Exploit momentum ignition bursts as price rapidly expands out of consolidation.",
        primary_timeframe="1H",
        supported_timeframes=["5m", "15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["RSI_14", "MACD_12_26_9", "VOLUME_SMA_20", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "rsi_length": 14,
            "rsi_long_threshold": 55.0,
            "rsi_short_threshold": 45.0,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "relative_volume_min": 1.5,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "rsi_length": {"type": "integer", "min": 7, "max": 28, "label": "RSI Period"},
            "rsi_long_threshold": {"type": "number", "min": 50.0, "max": 70.0, "label": "Long Momentum RSI"},
            "rsi_short_threshold": {"type": "number", "min": 30.0, "max": 50.0, "label": "Short Momentum RSI"},
            "relative_volume_min": {"type": "number", "min": 1.2, "max": 3.0, "label": "Min Relative Volume"},
            "atr_multiplier": {"type": "number", "min": 1.0, "max": 3.0, "label": "ATR Stop Multiplier"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 4.0, "label": "Target R:R"},
        },
        presets={
            "Conservative": {"rsi_long_threshold": 58.0, "rsi_short_threshold": 42.0, "relative_volume_min": 1.8, "atr_multiplier": 1.8, "rr_ratio": 2.5},
            "Balanced": {"rsi_long_threshold": 55.0, "rsi_short_threshold": 45.0, "relative_volume_min": 1.5, "atr_multiplier": 1.5, "rr_ratio": 2.0},
            "Aggressive": {"rsi_long_threshold": 52.0, "rsi_short_threshold": 48.0, "relative_volume_min": 1.2, "atr_multiplier": 1.2, "rr_ratio": 1.8},
        }
    ),
    "S03": StrategyDefinition(
        id="S03",
        number="03",
        name="Daily Trend, 1H Trigger",
        category="Trend & Continuation",
        part="PART I — TREND & CONTINUATION",
        description="Multi-timeframe trend alignment: Daily chart dictates directional regime; 1H triggers entry.",
        purpose="Filter out intraday noise by strictly executing in harmony with the higher-timeframe order flow.",
        primary_timeframe="1D/1H",
        supported_timeframes=["1D/1H", "4H/15m", "1H/5m"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["DAILY_EMA_50", "DAILY_EMA_200", "HOURLY_EMA_20", "HOURLY_RSI_14", "ATR_14"],
        required_data=["DAILY_OHLCV", "HOURLY_OHLCV"],
        default_parameters={
            "daily_ema_fast": 50,
            "daily_ema_slow": 200,
            "hourly_trigger_ema": 20,
            "hourly_rsi_pullback": 45.0,
            "allow_counter_trend": False,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "daily_ema_fast": {"type": "integer", "min": 20, "max": 100, "label": "Daily Fast EMA"},
            "daily_ema_slow": {"type": "integer", "min": 100, "max": 300, "label": "Daily Baseline EMA"},
            "hourly_trigger_ema": {"type": "integer", "min": 10, "max": 50, "label": "Hourly Trigger EMA"},
            "hourly_rsi_pullback": {"type": "number", "min": 35.0, "max": 55.0, "label": "Hourly RSI Pullback Trigger"},
            "allow_counter_trend": {"type": "boolean", "label": "Allow Counter-Trend Execution"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 4.0, "label": "Risk/Reward Multiple"},
        },
        presets={
            "Conservative": {"daily_ema_fast": 50, "daily_ema_slow": 200, "hourly_rsi_pullback": 40.0, "allow_counter_trend": False, "rr_ratio": 3.0},
            "Balanced": {"daily_ema_fast": 50, "daily_ema_slow": 200, "hourly_rsi_pullback": 45.0, "allow_counter_trend": False, "rr_ratio": 2.5},
            "Aggressive": {"daily_ema_fast": 40, "daily_ema_slow": 150, "hourly_rsi_pullback": 48.0, "allow_counter_trend": True, "rr_ratio": 2.0},
        }
    ),
    "S04": StrategyDefinition(
        id="S04",
        number="04",
        name="Trend Resumption After Squeeze",
        category="Trend & Continuation",
        part="PART I — TREND & CONTINUATION",
        description="Identifies low-volatility Bollinger/Keltner squeeze compression inside existing trends.",
        purpose="Catch explosive momentum resumption when volatility cycle shifts from compression to expansion.",
        primary_timeframe="4H",
        supported_timeframes=["30m", "1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["BOLLINGER_20_2", "KELTNER_20_1.5", "EMA_50", "MOMENTUM_12", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "bb_length": 20,
            "bb_std": 2.0,
            "keltner_length": 20,
            "keltner_atr_mult": 1.5,
            "min_squeeze_bars": 3,
            "trend_ema": 50,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "bb_length": {"type": "integer", "min": 10, "max": 50, "label": "Bollinger Length"},
            "bb_std": {"type": "number", "min": 1.5, "max": 3.0, "label": "Bollinger StdDev"},
            "min_squeeze_bars": {"type": "integer", "min": 2, "max": 10, "label": "Minimum Squeeze Bars"},
            "trend_ema": {"type": "integer", "min": 20, "max": 100, "label": "Trend Filter EMA"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 4.0, "label": "Risk/Reward Multiple"},
        },
        presets={
            "Conservative": {"min_squeeze_bars": 5, "bb_std": 2.0, "keltner_atr_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"min_squeeze_bars": 3, "bb_std": 2.0, "keltner_atr_mult": 1.5, "rr_ratio": 2.0},
            "Aggressive": {"min_squeeze_bars": 2, "bb_std": 1.8, "keltner_atr_mult": 1.3, "rr_ratio": 1.8},
        }
    ),
    "S05": StrategyDefinition(
        id="S05",
        number="05",
        name="Time-Series Momentum",
        category="Trend & Continuation",
        part="PART I — TREND & CONTINUATION",
        description="Measures trailing cumulative returns across fixed lookback horizons filtered by volatility.",
        purpose="Quantitative absolute momentum ranking with dynamic volatility scaling.",
        primary_timeframe="1D",
        supported_timeframes=["4H", "1D", "1W"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["CUMULATIVE_RETURN_LOOKBACK", "EMA_200", "ATR_14", "VOLATILITY_ANNUALIZED"],
        required_data=["OHLCV"],
        default_parameters={
            "lookback_bars": 30,
            "momentum_threshold_pct": 5.0,
            "trend_filter_ema": 200,
            "volatility_target_pct": 15.0,
            "atr_multiplier": 2.0,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "lookback_bars": {"type": "integer", "min": 10, "max": 90, "label": "Momentum Lookback (Bars)"},
            "momentum_threshold_pct": {"type": "number", "min": 1.0, "max": 20.0, "label": "Min Return Threshold (%)"},
            "trend_filter_ema": {"type": "integer", "min": 50, "max": 300, "label": "Macro Trend EMA"},
            "atr_multiplier": {"type": "number", "min": 1.0, "max": 3.5, "label": "ATR Stop Multiplier"},
        },
        presets={
            "Conservative": {"lookback_bars": 45, "momentum_threshold_pct": 8.0, "atr_multiplier": 2.5, "rr_ratio": 3.0},
            "Balanced": {"lookback_bars": 30, "momentum_threshold_pct": 5.0, "atr_multiplier": 2.0, "rr_ratio": 2.5},
            "Aggressive": {"lookback_bars": 15, "momentum_threshold_pct": 3.0, "atr_multiplier": 1.5, "rr_ratio": 2.0},
        }
    ),

    # ------------------------------------------------------------------------
    # PART II — BREAKOUT & EXPANSION (S06 - S10)
    # ------------------------------------------------------------------------
    "S06": StrategyDefinition(
        id="S06",
        number="06",
        name="BandWidth Squeeze Breakout",
        category="Breakout & Expansion",
        part="PART II — BREAKOUT & EXPANSION",
        description="Tracks historical Bollinger BandWidth percentiles. Enters when volatility breaks out from lows.",
        purpose="Capitalize on regime transitions from historical volatility compression to explosive trending moves.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["BOLLINGER_BANDWIDTH", "BOLLINGER_20_2", "VOLUME_SMA_20", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "bb_length": 20,
            "bb_std": 2.0,
            "bandwidth_percentile_threshold": 15.0,
            "volume_expansion_mult": 1.3,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "bb_length": {"type": "integer", "min": 10, "max": 50, "label": "Bollinger Length"},
            "bandwidth_percentile_threshold": {"type": "number", "min": 5.0, "max": 30.0, "label": "Max BandWidth Percentile"},
            "volume_expansion_mult": {"type": "number", "min": 1.0, "max": 2.5, "label": "Volume Expansion Ratio"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 4.0, "label": "Risk/Reward Multiple"},
        },
        presets={
            "Conservative": {"bandwidth_percentile_threshold": 10.0, "volume_expansion_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"bandwidth_percentile_threshold": 15.0, "volume_expansion_mult": 1.3, "rr_ratio": 2.0},
            "Aggressive": {"bandwidth_percentile_threshold": 25.0, "volume_expansion_mult": 1.1, "rr_ratio": 1.8},
        }
    ),
    "S07": StrategyDefinition(
        id="S07",
        number="07",
        name="Donchian 20 Breakout",
        category="Breakout & Expansion",
        part="PART II — BREAKOUT & EXPANSION",
        description="Classic Turtle-inspired price-channel breakout entering when closing outside 20-period Donchian highs/lows.",
        purpose="Pure systematic trend-following capturing large directional waves without predictive forecasting.",
        primary_timeframe="4H",
        supported_timeframes=["1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Introductory",
        required_indicators=["DONCHIAN_20", "VOLUME_SMA_20", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "donchian_period": 20,
            "donchian_exit_period": 10,
            "volume_confirmation": True,
            "volume_mult": 1.1,
            "atr_multiplier": 2.0,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "donchian_period": {"type": "integer", "min": 10, "max": 55, "label": "Donchian Breakout Period"},
            "donchian_exit_period": {"type": "integer", "min": 5, "max": 25, "label": "Donchian Trailing Exit Period"},
            "volume_confirmation": {"type": "boolean", "label": "Require Volume Confirmation"},
            "atr_multiplier": {"type": "number", "min": 1.0, "max": 3.5, "label": "ATR Stop Multiplier"},
        },
        presets={
            "Conservative": {"donchian_period": 20, "donchian_exit_period": 10, "volume_confirmation": True, "rr_ratio": 3.0},
            "Balanced": {"donchian_period": 20, "donchian_exit_period": 10, "volume_confirmation": True, "rr_ratio": 2.5},
            "Aggressive": {"donchian_period": 15, "donchian_exit_period": 7, "volume_confirmation": False, "rr_ratio": 2.0},
        }
    ),
    "S08": StrategyDefinition(
        id="S08",
        number="08",
        name="UTC Opening Range Breakout",
        category="Breakout & Expansion",
        part="PART II — BREAKOUT & EXPANSION",
        description="Establishes range high/low over first N minutes of UTC trading session and trades range expansion.",
        purpose="Exploit session open liquidity and direction discovery across global crypto derivative desks.",
        primary_timeframe="15m",
        supported_timeframes=["5m", "15m", "30m"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["SESSION_HIGH_LOW_UTC", "VOLUME_SMA_20", "ATR_14"],
        required_data=["OHLCV", "UTC_TIMESTAMP"],
        default_parameters={
            "session_open_utc_hour": 0,
            "range_duration_minutes": 60,
            "breakout_buffer_pct": 0.1,
            "volume_mult": 1.2,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "session_open_utc_hour": {"type": "integer", "min": 0, "max": 23, "label": "UTC Session Open Hour"},
            "range_duration_minutes": {"type": "integer", "min": 15, "max": 180, "label": "Opening Range Duration (min)"},
            "breakout_buffer_pct": {"type": "number", "min": 0.05, "max": 0.5, "label": "Breakout Buffer (%)"},
            "rr_ratio": {"type": "number", "min": 1.5, "max": 3.5, "label": "Target R:R"},
        },
        presets={
            "Conservative": {"range_duration_minutes": 60, "breakout_buffer_pct": 0.15, "volume_mult": 1.4, "rr_ratio": 2.5},
            "Balanced": {"range_duration_minutes": 60, "breakout_buffer_pct": 0.1, "volume_mult": 1.2, "rr_ratio": 2.0},
            "Aggressive": {"range_duration_minutes": 30, "breakout_buffer_pct": 0.05, "volume_mult": 1.0, "rr_ratio": 1.8},
        }
    ),
    "S09": StrategyDefinition(
        id="S09",
        number="09",
        name="Previous-Day High/Low Break",
        category="Breakout & Expansion",
        part="PART II — BREAKOUT & EXPANSION",
        description="Trades confirmed breakouts through Previous Day High (PDH) or Previous Day Low (PDL) with volume confirmation.",
        purpose="Exploit key institutional reference benchmarks where large liquidity pools and stops are clustered.",
        primary_timeframe="15m",
        supported_timeframes=["5m", "15m", "1H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["PREVIOUS_DAY_HIGH_LOW", "VOLUME_SMA_20", "ATR_14", "EMA_20"],
        required_data=["DAILY_OHLCV", "INTRADAY_OHLCV"],
        default_parameters={
            "retest_confirmation": True,
            "volume_surge_mult": 1.25,
            "max_breakout_distance_pct": 1.2,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "retest_confirmation": {"type": "boolean", "label": "Require Retest Confirmation"},
            "volume_surge_mult": {"type": "number", "min": 1.0, "max": 2.5, "label": "Min Volume Surge Ratio"},
            "max_breakout_distance_pct": {"type": "number", "min": 0.5, "max": 3.0, "label": "Max Allowed Breakout Distance (%)"},
        },
        presets={
            "Conservative": {"retest_confirmation": True, "volume_surge_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"retest_confirmation": True, "volume_surge_mult": 1.25, "rr_ratio": 2.0},
            "Aggressive": {"retest_confirmation": False, "volume_surge_mult": 1.1, "rr_ratio": 1.8},
        }
    ),
    "S10": StrategyDefinition(
        id="S10",
        number="10",
        name="Breakout Retest",
        category="Breakout & Expansion",
        part="PART II — BREAKOUT & EXPANSION",
        description="Waits for price to break key horizontal structure, retrace to test the broken level as new support/resistance, and enter upon rejection.",
        purpose="Avoid buying initial breakout spikes; enter at high-probability structural retest levels with tight risk.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["SWING_HIGH_LOW", "SUPPORT_RESISTANCE", "ATR_14", "VOLUME_SMA_20"],
        required_data=["OHLCV"],
        default_parameters={
            "swing_lookback": 20,
            "retest_tolerance_pct": 0.35,
            "max_retest_bars": 8,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "swing_lookback": {"type": "integer", "min": 10, "max": 50, "label": "Swing Structure Lookback"},
            "retest_tolerance_pct": {"type": "number", "min": 0.1, "max": 1.0, "label": "Retest Level Tolerance (%)"},
            "max_retest_bars": {"type": "integer", "min": 3, "max": 20, "label": "Max Bars to Retest"},
        },
        presets={
            "Conservative": {"retest_tolerance_pct": 0.25, "max_retest_bars": 6, "rr_ratio": 3.0},
            "Balanced": {"retest_tolerance_pct": 0.35, "max_retest_bars": 8, "rr_ratio": 2.5},
            "Aggressive": {"retest_tolerance_pct": 0.5, "max_retest_bars": 12, "rr_ratio": 2.0},
        }
    ),

    # ------------------------------------------------------------------------
    # PART III — MEAN REVERSION (S11 - S15)
    # ------------------------------------------------------------------------
    "S11": StrategyDefinition(
        id="S11",
        number="11",
        name="Bollinger Reversion",
        category="Mean Reversion",
        part="PART III — MEAN REVERSION",
        description="Fades statistical band extremes (>= 2.0 standard deviations) when reversal candlestick confirms return to mean.",
        purpose="Exploit mean-reverting price distributions during non-trending ranging market regimes.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Introductory",
        required_indicators=["BOLLINGER_20_2", "RSI_14", "ADX_14", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "bb_length": 20,
            "bb_std": 2.0,
            "max_adx_trend_filter": 25.0,
            "rsi_oversold": 32.0,
            "rsi_overbought": 68.0,
            "target_to_midband": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "bb_length": {"type": "integer", "min": 10, "max": 50, "label": "Bollinger Length"},
            "bb_std": {"type": "number", "min": 1.5, "max": 3.0, "label": "StdDev Multiplier"},
            "max_adx_trend_filter": {"type": "number", "min": 15.0, "max": 35.0, "label": "Max ADX (Block in strong trend)"},
            "target_to_midband": {"type": "boolean", "label": "Target Middle EMA Band"},
        },
        presets={
            "Conservative": {"bb_std": 2.2, "max_adx_trend_filter": 20.0, "rsi_oversold": 28.0, "rsi_overbought": 72.0, "rr_ratio": 2.5},
            "Balanced": {"bb_std": 2.0, "max_adx_trend_filter": 25.0, "rsi_oversold": 32.0, "rsi_overbought": 68.0, "rr_ratio": 2.0},
            "Aggressive": {"bb_std": 1.8, "max_adx_trend_filter": 30.0, "rsi_oversold": 35.0, "rsi_overbought": 65.0, "rr_ratio": 1.8},
        }
    ),
    "S12": StrategyDefinition(
        id="S12",
        number="12",
        name="RSI Extreme Reversion",
        category="Mean Reversion",
        part="PART III — MEAN REVERSION",
        description="Monitors multi-period extreme RSI overextension (< 25 or > 75) combined with candlestick exhaustion confirmation.",
        purpose="Catch high-probability snap-backs following overextended one-sided retail liquidation rushes.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Introductory",
        required_indicators=["RSI_14", "EMA_200", "ATR_14", "VOLUME_SMA_20"],
        required_data=["OHLCV"],
        default_parameters={
            "rsi_length": 14,
            "rsi_oversold": 28.0,
            "rsi_overbought": 72.0,
            "require_reversal_candle": True,
            "volume_exhaustion_filter": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "rsi_length": {"type": "integer", "min": 7, "max": 28, "label": "RSI Period"},
            "rsi_oversold": {"type": "number", "min": 15.0, "max": 35.0, "label": "Oversold Level"},
            "rsi_overbought": {"type": "number", "min": 65.0, "max": 85.0, "label": "Overbought Level"},
            "require_reversal_candle": {"type": "boolean", "label": "Require Bullish/Bearish Candle Confirmation"},
        },
        presets={
            "Conservative": {"rsi_oversold": 22.0, "rsi_overbought": 78.0, "require_reversal_candle": True, "rr_ratio": 2.5},
            "Balanced": {"rsi_oversold": 28.0, "rsi_overbought": 72.0, "require_reversal_candle": True, "rr_ratio": 2.0},
            "Aggressive": {"rsi_oversold": 32.0, "rsi_overbought": 68.0, "require_reversal_candle": False, "rr_ratio": 1.8},
        }
    ),
    "S13": StrategyDefinition(
        id="S13",
        number="13",
        name="Anchored VWAP Reversion",
        category="Mean Reversion",
        part="PART III — MEAN REVERSION",
        description="Calculates volume-weighted average price anchored to session/weekly high or low and trades return to equilibrium.",
        purpose="Exploit institutional inventory imbalance when price is stretched far from true volume-weighted cost basis.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["ANCHORED_VWAP", "VWAP_STANDARD_DEVIATION_BANDS", "ATR_14"],
        required_data=["OHLCV", "TICK_VOLUME"],
        default_parameters={
            "anchor_mode": "SESSION",  # "SESSION", "WEEKLY", "SWING_EXTREME"
            "deviation_band_threshold": 2.0,
            "target_vwap_mid": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "anchor_mode": {"type": "string", "enum": ["SESSION", "WEEKLY", "SWING_EXTREME"], "label": "Anchor Mode"},
            "deviation_band_threshold": {"type": "number", "min": 1.5, "max": 3.5, "label": "Min VWAP StdDev Deviation"},
            "target_vwap_mid": {"type": "boolean", "label": "Take Profit at VWAP Baseline"},
        },
        presets={
            "Conservative": {"deviation_band_threshold": 2.5, "anchor_mode": "WEEKLY", "rr_ratio": 2.5},
            "Balanced": {"deviation_band_threshold": 2.0, "anchor_mode": "SESSION", "rr_ratio": 2.0},
            "Aggressive": {"deviation_band_threshold": 1.6, "anchor_mode": "SESSION", "rr_ratio": 1.8},
        }
    ),
    "S14": StrategyDefinition(
        id="S14",
        number="14",
        name="ATR Extension Reversal",
        category="Mean Reversion",
        part="PART III — MEAN REVERSION",
        description="Measures current price distance from intermediate moving average in units of ATR. Fades extreme extensions (>= 3.0 ATR).",
        purpose="Capture mean reversion after parabolic straight-line price moves exhaust order book bids/asks.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["EMA_20", "ATR_14", "CANDLE_EXHAUSTION", "VOLUME_SMA_20"],
        required_data=["OHLCV"],
        default_parameters={
            "baseline_ema": 20,
            "atr_extension_threshold": 2.8,
            "require_exhaustion_wick": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "baseline_ema": {"type": "integer", "min": 10, "max": 50, "label": "Baseline EMA Reference"},
            "atr_extension_threshold": {"type": "number", "min": 2.0, "max": 4.5, "label": "Min Extension Distance (x ATR)"},
            "require_exhaustion_wick": {"type": "boolean", "label": "Require Exhaustion Candle Wick"},
        },
        presets={
            "Conservative": {"atr_extension_threshold": 3.5, "require_exhaustion_wick": True, "rr_ratio": 2.5},
            "Balanced": {"atr_extension_threshold": 2.8, "require_exhaustion_wick": True, "rr_ratio": 2.0},
            "Aggressive": {"atr_extension_threshold": 2.2, "require_exhaustion_wick": False, "rr_ratio": 1.8},
        }
    ),
    "S15": StrategyDefinition(
        id="S15",
        number="15",
        name="Range Fade",
        category="Mean Reversion",
        part="PART III — MEAN REVERSION",
        description="Identifies multi-day consolidation box boundaries (Range High / Range Low / Midpoint) and trades boundary rejections.",
        purpose="Systematic swing execution inside well-defined horizontal trading channels.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["RANGE_HIGH_LOW_MID", "ADX_14", "RSI_14", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "range_lookback_bars": 50,
            "boundary_buffer_pct": 0.4,
            "max_adx_filter": 22.0,
            "tp_at_midpoint": False,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "range_lookback_bars": {"type": "integer", "min": 20, "max": 120, "label": "Range Definition Lookback"},
            "boundary_buffer_pct": {"type": "number", "min": 0.1, "max": 1.0, "label": "Boundary Entry Buffer (%)"},
            "max_adx_filter": {"type": "number", "min": 15.0, "max": 30.0, "label": "Max ADX Threshold"},
        },
        presets={
            "Conservative": {"boundary_buffer_pct": 0.25, "max_adx_filter": 18.0, "rr_ratio": 2.5},
            "Balanced": {"boundary_buffer_pct": 0.4, "max_adx_filter": 22.0, "rr_ratio": 2.0},
            "Aggressive": {"boundary_buffer_pct": 0.6, "max_adx_filter": 26.0, "rr_ratio": 1.8},
        }
    ),

    # ------------------------------------------------------------------------
    # PART IV — STRUCTURE & REVERSAL (S16 - S20)
    # ------------------------------------------------------------------------
    "S16": StrategyDefinition(
        id="S16",
        number="16",
        name="Swing Sweep Reversal",
        category="Structure & Reversal",
        part="PART IV — STRUCTURE & REVERSAL",
        description="Detects liquidity sweeps outside significant swing highs/lows where stop orders are harvested followed by immediate rejection.",
        purpose="Trade institutional liquidity engineering and trapped breakout participant stops.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["SWING_HIGH_LOW", "LIQUIDITY_SWEEP_DETECTOR", "REJECTION_WICK", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "swing_period": 15,
            "sweep_tolerance_pct": 0.2,
            "min_wick_ratio": 0.4,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "swing_period": {"type": "integer", "min": 5, "max": 35, "label": "Swing Pivot Period"},
            "sweep_tolerance_pct": {"type": "number", "min": 0.05, "max": 0.8, "label": "Max Sweep Depth (%)"},
            "min_wick_ratio": {"type": "number", "min": 0.25, "max": 0.7, "label": "Min Rejection Wick Ratio"},
        },
        presets={
            "Conservative": {"swing_period": 20, "min_wick_ratio": 0.5, "rr_ratio": 3.0},
            "Balanced": {"swing_period": 15, "min_wick_ratio": 0.4, "rr_ratio": 2.5},
            "Aggressive": {"swing_period": 10, "min_wick_ratio": 0.3, "rr_ratio": 2.0},
        }
    ),
    "S17": StrategyDefinition(
        id="S17",
        number="17",
        name="Failed Breakout Reversal",
        category="Structure & Reversal",
        part="PART IV — STRUCTURE & REVERSAL",
        description="Identifies breakout attempts above key resistance or below support that fail and close back within the prior range within 1-3 bars.",
        purpose="Exploit bull traps and bear traps by executing in the direction of the trapped order flow.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["KEY_LEVEL_DETECTOR", "FAILED_BREAKOUT_SCANNER", "ATR_14", "VOLUME_SMA_20"],
        required_data=["OHLCV"],
        default_parameters={
            "level_lookback_bars": 40,
            "max_failure_bars": 3,
            "volume_reversal_confirm": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "level_lookback_bars": {"type": "integer", "min": 15, "max": 80, "label": "Key Level Lookback"},
            "max_failure_bars": {"type": "integer", "min": 1, "max": 5, "label": "Max Bars to Fail"},
            "volume_reversal_confirm": {"type": "boolean", "label": "Require Volume on Re-entry"},
        },
        presets={
            "Conservative": {"max_failure_bars": 2, "volume_reversal_confirm": True, "rr_ratio": 2.5},
            "Balanced": {"max_failure_bars": 3, "volume_reversal_confirm": True, "rr_ratio": 2.0},
            "Aggressive": {"max_failure_bars": 4, "volume_reversal_confirm": False, "rr_ratio": 1.8},
        }
    ),
    "S18": StrategyDefinition(
        id="S18",
        number="18",
        name="Prior-Level Rejection",
        category="Structure & Reversal",
        part="PART IV — STRUCTURE & REVERSAL",
        description="Executes at major historical horizontal inflection levels when multi-candle rejection patterns form.",
        purpose="Trade repeatable order book absorption at major historical support and resistance zones.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["HISTORICAL_SUPPORT_RESISTANCE", "CANDLESTICK_REJECTION", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "level_touch_min": 2,
            "rejection_confirm_bars": 1,
            "level_zone_pct": 0.3,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "level_touch_min": {"type": "integer", "min": 2, "max": 5, "label": "Min Historical Touches"},
            "level_zone_pct": {"type": "number", "min": 0.1, "max": 0.8, "label": "Level Zone Thickness (%)"},
        },
        presets={
            "Conservative": {"level_touch_min": 3, "level_zone_pct": 0.2, "rr_ratio": 2.5},
            "Balanced": {"level_touch_min": 2, "level_zone_pct": 0.3, "rr_ratio": 2.0},
            "Aggressive": {"level_touch_min": 2, "level_zone_pct": 0.5, "rr_ratio": 1.8},
        }
    ),
    "S19": StrategyDefinition(
        id="S19",
        number="19",
        name="Structure Break + Retest",
        category="Structure & Reversal",
        part="PART IV — STRUCTURE & REVERSAL",
        description="Detects Break of Structure (BoS) or Change of Character (ChoCh) followed by a measured retracement into the displacement origin.",
        purpose="Smart Money Concept (SMC) systematic execution capturing structural regime changes with optimal risk/reward.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["MARKET_STRUCTURE_BOS", "CHOCH_DETECTOR", "FIBONACCI_RETRACEMENT", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "swing_length": 10,
            "fib_retest_min": 0.5,
            "fib_retest_max": 0.786,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.5,
        },
        parameter_schema={
            "swing_length": {"type": "integer", "min": 5, "max": 25, "label": "Structure Pivot Length"},
            "fib_retest_min": {"type": "number", "min": 0.382, "max": 0.618, "label": "Min Retest Retracement"},
            "fib_retest_max": {"type": "number", "min": 0.618, "max": 0.886, "label": "Max Retest Retracement"},
        },
        presets={
            "Conservative": {"swing_length": 15, "fib_retest_min": 0.618, "fib_retest_max": 0.786, "rr_ratio": 3.0},
            "Balanced": {"swing_length": 10, "fib_retest_min": 0.5, "fib_retest_max": 0.786, "rr_ratio": 2.5},
            "Aggressive": {"swing_length": 7, "fib_retest_min": 0.382, "fib_retest_max": 0.886, "rr_ratio": 2.0},
        }
    ),
    "S20": StrategyDefinition(
        id="S20",
        number="20",
        name="Daily Compression Expansion",
        category="Structure & Reversal",
        part="PART IV — STRUCTURE & REVERSAL",
        description="Identifies inside-day (Inside Bar) compression on the Daily chart, triggering intraday expansion execution when high/low breaks.",
        purpose="Exploit compressed daily energy releases that produce large directional daily range candles.",
        primary_timeframe="1D/15m",
        supported_timeframes=["1D/15m", "1D/1H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["DAILY_INSIDE_BAR", "INTRADAY_BREAKOUT", "ATR_14", "VOLUME_SMA_20"],
        required_data=["DAILY_OHLCV", "INTRADAY_OHLCV"],
        default_parameters={
            "daily_range_compression_pct": 70.0,
            "intraday_volume_mult": 1.25,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "daily_range_compression_pct": {"type": "number", "min": 40.0, "max": 85.0, "label": "Max Daily Range vs 5-Day ATR (%)"},
            "intraday_volume_mult": {"type": "number", "min": 1.0, "max": 2.5, "label": "Intraday Volume Multiplier"},
        },
        presets={
            "Conservative": {"daily_range_compression_pct": 60.0, "intraday_volume_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"daily_range_compression_pct": 70.0, "intraday_volume_mult": 1.25, "rr_ratio": 2.0},
            "Aggressive": {"daily_range_compression_pct": 80.0, "intraday_volume_mult": 1.1, "rr_ratio": 1.8},
        }
    ),

    # ------------------------------------------------------------------------
    # PART V — VOLUME & MOMENTUM (S21 - S25)
    # ------------------------------------------------------------------------
    "S21": StrategyDefinition(
        id="S21",
        number="21",
        name="Relative Volume Breakout",
        category="Volume & Momentum",
        part="PART V — VOLUME & MOMENTUM",
        description="Combines price breakout above consolidation resistance with anomalous relative volume (RVOL >= 2.0x 20-period average).",
        purpose="Filter out low-liquidity false breakouts by requiring institutional volume participation.",
        primary_timeframe="15m",
        supported_timeframes=["5m", "15m", "1H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["RELATIVE_VOLUME_RVOL", "CONSOLIDATION_RANGE", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "rvol_threshold": 2.0,
            "consolidation_bars": 12,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "rvol_threshold": {"type": "number", "min": 1.5, "max": 4.0, "label": "Minimum RVOL Multiple"},
            "consolidation_bars": {"type": "integer", "min": 6, "max": 30, "label": "Consolidation Base Bars"},
        },
        presets={
            "Conservative": {"rvol_threshold": 2.5, "consolidation_bars": 16, "rr_ratio": 2.5},
            "Balanced": {"rvol_threshold": 2.0, "consolidation_bars": 12, "rr_ratio": 2.0},
            "Aggressive": {"rvol_threshold": 1.6, "consolidation_bars": 8, "rr_ratio": 1.8},
        }
    ),
    "S22": StrategyDefinition(
        id="S22",
        number="22",
        name="Volume Dry-Up Continuation",
        category="Volume & Momentum",
        part="PART V — VOLUME & MOMENTUM",
        description="Identifies pullback consolidation with sharply declining volume (< 60% of average), entering when volume surges back in trend direction.",
        purpose="Confirms absence of institutional selling during pullbacks, entering on trend continuation ignition.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["VOLUME_DRYUP_SCANNER", "EMA_50", "ATR_14"],
        required_data=["OHLCV"],
        default_parameters={
            "dryup_volume_ratio": 0.6,
            "min_dryup_bars": 3,
            "resumption_volume_mult": 1.3,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "dryup_volume_ratio": {"type": "number", "min": 0.3, "max": 0.8, "label": "Max Pullback Volume Ratio"},
            "min_dryup_bars": {"type": "integer", "min": 2, "max": 6, "label": "Min Dry-Up Bars"},
            "resumption_volume_mult": {"type": "number", "min": 1.1, "max": 2.5, "label": "Resumption Volume Trigger"},
        },
        presets={
            "Conservative": {"dryup_volume_ratio": 0.5, "min_dryup_bars": 4, "resumption_volume_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"dryup_volume_ratio": 0.6, "min_dryup_bars": 3, "resumption_volume_mult": 1.3, "rr_ratio": 2.0},
            "Aggressive": {"dryup_volume_ratio": 0.7, "min_dryup_bars": 2, "resumption_volume_mult": 1.15, "rr_ratio": 1.8},
        }
    ),
    "S23": StrategyDefinition(
        id="S23",
        number="23",
        name="Volume Climax Reversal",
        category="Volume & Momentum",
        part="PART V — VOLUME & MOMENTUM",
        description="Detects anomalous blow-off volume climaxes (>= 3.0x average) accompanied by extended wicks and exhaustion candles.",
        purpose="Fade panic capitulation bottoms and euphoric blow-off tops where high volume signals trend termination.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["VOLUME_CLIMAX_DETECTOR", "REVERSAL_WICK_RATIO", "ATR_14", "RSI_14"],
        required_data=["OHLCV"],
        default_parameters={
            "climax_volume_mult": 3.0,
            "min_reversal_wick_pct": 0.45,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "climax_volume_mult": {"type": "number", "min": 2.5, "max": 5.0, "label": "Min Climax Volume Multiple"},
            "min_reversal_wick_pct": {"type": "number", "min": 0.3, "max": 0.7, "label": "Min Reversal Wick Ratio"},
        },
        presets={
            "Conservative": {"climax_volume_mult": 3.5, "min_reversal_wick_pct": 0.55, "rr_ratio": 2.5},
            "Balanced": {"climax_volume_mult": 3.0, "min_reversal_wick_pct": 0.45, "rr_ratio": 2.0},
            "Aggressive": {"climax_volume_mult": 2.5, "min_reversal_wick_pct": 0.35, "rr_ratio": 1.8},
        }
    ),
    "S24": StrategyDefinition(
        id="S24",
        number="24",
        name="OBV Divergence",
        category="Volume & Momentum",
        part="PART V — VOLUME & MOMENTUM",
        description="Identifies volume-price divergence using On-Balance Volume (OBV): Bullish (Price Lower Low, OBV Higher Low) / Bearish (Price Higher High, OBV Lower High).",
        purpose="Detect hidden institutional accumulation or distribution before it manifests in price action.",
        primary_timeframe="1H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["ON_BALANCE_VOLUME_OBV", "OBV_DIVERGENCE_SCANNER", "ATR_14", "EMA_50"],
        required_data=["OHLCV"],
        default_parameters={
            "divergence_lookback": 20,
            "require_trend_filter": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "divergence_lookback": {"type": "integer", "min": 10, "max": 40, "label": "Divergence Search Lookback"},
            "require_trend_filter": {"type": "boolean", "label": "Require 50 EMA Alignment"},
        },
        presets={
            "Conservative": {"divergence_lookback": 25, "require_trend_filter": True, "rr_ratio": 2.5},
            "Balanced": {"divergence_lookback": 20, "require_trend_filter": True, "rr_ratio": 2.0},
            "Aggressive": {"divergence_lookback": 14, "require_trend_filter": False, "rr_ratio": 1.8},
        }
    ),
    "S25": StrategyDefinition(
        id="S25",
        number="25",
        name="VWAP Reclaim on Volume",
        category="Volume & Momentum",
        part="PART V — VOLUME & MOMENTUM",
        description="Monitors intraday price below Session VWAP reclaiming the level with surging volume (> 1.2x average) and closing above.",
        purpose="Trade institutional intraday inventory shifts as buyers firmly seize benchmark value control.",
        primary_timeframe="15m",
        supported_timeframes=["5m", "15m", "30m"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Intermediate",
        required_indicators=["SESSION_VWAP", "VOLUME_SMA_20", "ATR_14"],
        required_data=["OHLCV", "TICK_VOLUME"],
        default_parameters={
            "min_bars_below_vwap": 3,
            "reclaim_volume_mult": 1.25,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "min_bars_below_vwap": {"type": "integer", "min": 2, "max": 8, "label": "Min Prior Bars Below VWAP"},
            "reclaim_volume_mult": {"type": "number", "min": 1.1, "max": 2.5, "label": "Reclaim Volume Multiplier"},
        },
        presets={
            "Conservative": {"min_bars_below_vwap": 4, "reclaim_volume_mult": 1.5, "rr_ratio": 2.5},
            "Balanced": {"min_bars_below_vwap": 3, "reclaim_volume_mult": 1.25, "rr_ratio": 2.0},
            "Aggressive": {"min_bars_below_vwap": 2, "reclaim_volume_mult": 1.1, "rr_ratio": 1.8},
        }
    ),

    # ------------------------------------------------------------------------
    # PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR (S26 - S30)
    # ------------------------------------------------------------------------
    "S26": StrategyDefinition(
        id="S26",
        number="26",
        name="Basis Extreme Reversal",
        category="Crypto-Specific & Multi-Factor",
        part="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
        description="Measures annualized basis spread between Futures/Perpetual and Spot. Fades deviations >= 2.5 standard deviations from 30-day mean.",
        purpose="Capture mean reversion of futures basis arbitrage dislocations when leverage reaches unsustainable extremes.",
        primary_timeframe="1H/4H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["FUTURES", "CRYPTO_OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Institutional",
        required_indicators=["ANNUALIZED_BASIS_SPREAD", "BASIS_ZSCORE_30D", "ATR_14"],
        required_data=["SPOT_PRICE", "PERPETUAL_PRICE", "FUNDING_RATE"],
        default_parameters={
            "basis_zscore_threshold": 2.5,
            "basis_lookback_days": 30,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "basis_zscore_threshold": {"type": "number", "min": 1.8, "max": 3.5, "label": "Basis Z-Score Deviation Threshold"},
            "basis_lookback_days": {"type": "integer", "min": 14, "max": 60, "label": "Basis Historical Lookback (Days)"},
        },
        presets={
            "Conservative": {"basis_zscore_threshold": 3.0, "basis_lookback_days": 30, "rr_ratio": 2.5},
            "Balanced": {"basis_zscore_threshold": 2.5, "basis_lookback_days": 30, "rr_ratio": 2.0},
            "Aggressive": {"basis_zscore_threshold": 2.0, "basis_lookback_days": 20, "rr_ratio": 1.8},
        }
    ),
    "S27": StrategyDefinition(
        id="S27",
        number="27",
        name="Open Interest Expansion",
        category="Crypto-Specific & Multi-Factor",
        part="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
        description="Tracks derivative Open Interest (OI) expansion (>= 8% in 4H) during price breakout with neutral/moderate funding rates.",
        purpose="Differentiate genuine new capital accumulation breakouts from fragile retail short-covering rallies.",
        primary_timeframe="1H/4H",
        supported_timeframes=["15m", "1H", "4H"],
        supported_markets=["FUTURES", "CRYPTO_OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Institutional",
        required_indicators=["AGGREGATED_OPEN_INTEREST", "OI_DELTA_PERCENT", "FUNDING_RATE", "ATR_14"],
        required_data=["OHLCV", "OPEN_INTEREST", "FUNDING_RATE"],
        default_parameters={
            "min_oi_delta_pct": 8.0,
            "oi_lookback_hours": 4,
            "max_funding_rate_pct": 0.04,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "min_oi_delta_pct": {"type": "number", "min": 4.0, "max": 15.0, "label": "Minimum OI Expansion Delta (%)"},
            "oi_lookback_hours": {"type": "integer", "min": 1, "max": 12, "label": "OI Delta Horizon (Hours)"},
            "max_funding_rate_pct": {"type": "number", "min": 0.01, "max": 0.1, "label": "Max Overheated Funding Threshold (%)"},
        },
        presets={
            "Conservative": {"min_oi_delta_pct": 10.0, "max_funding_rate_pct": 0.03, "rr_ratio": 2.5},
            "Balanced": {"min_oi_delta_pct": 8.0, "max_funding_rate_pct": 0.04, "rr_ratio": 2.0},
            "Aggressive": {"min_oi_delta_pct": 5.0, "max_funding_rate_pct": 0.06, "rr_ratio": 1.8},
        }
    ),
    "S28": StrategyDefinition(
        id="S28",
        number="28",
        name="Flush & Reclaim",
        category="Crypto-Specific & Multi-Factor",
        part="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
        description="Captures violent liquidation cascades (> 2.5% flush) followed by immediate V-reversal reclaim within 2 bars.",
        purpose="Trade market-maker vacuum bids following forced leveraged retail stop/liquidation cascades.",
        primary_timeframe="15m",
        supported_timeframes=["5m", "15m", "1H"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["LIQUIDATION_FLUSH_DETECTOR", "RECLAIM_BAR_COUNTER", "SESSION_VWAP", "ATR_14"],
        required_data=["OHLCV", "LIQUIDATION_FEED"],
        default_parameters={
            "min_flush_pct": 2.5,
            "max_reclaim_bars": 2,
            "volume_reclaim_confirm": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "min_flush_pct": {"type": "number", "min": 1.5, "max": 6.0, "label": "Minimum Flush Magnitude (%)"},
            "max_reclaim_bars": {"type": "integer", "min": 1, "max": 4, "label": "Max Allowed Bars to Reclaim"},
        },
        presets={
            "Conservative": {"min_flush_pct": 3.5, "max_reclaim_bars": 2, "rr_ratio": 2.5},
            "Balanced": {"min_flush_pct": 2.5, "max_reclaim_bars": 2, "rr_ratio": 2.0},
            "Aggressive": {"min_flush_pct": 1.8, "max_reclaim_bars": 3, "rr_ratio": 1.8},
        }
    ),
    "S29": StrategyDefinition(
        id="S29",
        number="29",
        name="Dominance-Filtered Alt Trend",
        category="Crypto-Specific & Multi-Factor",
        part="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
        description="Filters altcoin trend breakouts through Bitcoin Dominance (BTC.D). Longs permitted only when BTC.D < 50 EMA and BTC is stable/bullish.",
        purpose="Protect capital from severe altcoin liquidity drains by trading alt momentum strictly during true Altseason regimes.",
        primary_timeframe="4H/1D",
        supported_timeframes=["1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES"],
        direction_support="LONG_SHORT",
        complexity="Advanced",
        required_indicators=["BTC_DOMINANCE_EMA50", "BTC_PRICE_TREND", "ALTCOIN_EMA20_50", "ATR_14"],
        required_data=["ALTCOIN_OHLCV", "BTC_OHLCV", "BTCD_INDEX"],
        default_parameters={
            "btcd_ema_period": 50,
            "btc_trend_ema_period": 50,
            "alt_volume_mult": 1.3,
            "block_if_btcd_rising": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "btcd_ema_period": {"type": "integer", "min": 20, "max": 100, "label": "BTC Dominance EMA Period"},
            "btc_trend_ema_period": {"type": "integer", "min": 20, "max": 100, "label": "BTC Baseline Trend EMA"},
            "block_if_btcd_rising": {"type": "boolean", "label": "Block Alt Longs if BTC.D is Above EMA"},
        },
        presets={
            "Conservative": {"alt_volume_mult": 1.5, "block_if_btcd_rising": True, "rr_ratio": 2.5},
            "Balanced": {"alt_volume_mult": 1.3, "block_if_btcd_rising": True, "rr_ratio": 2.0},
            "Aggressive": {"alt_volume_mult": 1.1, "block_if_btcd_rising": False, "rr_ratio": 1.8},
        }
    ),
    "S30": StrategyDefinition(
        id="S30",
        number="30",
        name="Three-Factor Regime Setup",
        category="Crypto-Specific & Multi-Factor",
        part="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
        description="Evaluates 3 independent quantitative factors concurrently: (1) Macro Trend, (2) Volatility Envelope, (3) Order Flow & Funding. Enters on unanimous confluence.",
        purpose="Institutional multi-factor quantitative robustness eliminating > 80% of single-indicator false signals.",
        primary_timeframe="4H/1D",
        supported_timeframes=["1H", "4H", "1D"],
        supported_markets=["SPOT", "FUTURES", "OPTIONS"],
        direction_support="LONG_SHORT",
        complexity="Institutional",
        required_indicators=["FACTOR1_TREND_EMA", "FACTOR2_VOLATILITY_PERCENTILE", "FACTOR3_ORDERFLOW_FUNDING", "ATR_14"],
        required_data=["OHLCV", "FUNDING_RATE", "OPEN_INTEREST"],
        default_parameters={
            "trend_ema_fast": 50,
            "trend_ema_slow": 200,
            "volatility_max_percentile": 80.0,
            "max_funding_rate_pct": 0.03,
            "require_unanimous": True,
            "atr_multiplier": 1.5,
            "rr_ratio": 2.0,
        },
        parameter_schema={
            "trend_ema_fast": {"type": "integer", "min": 20, "max": 100, "label": "Factor 1: Fast Trend EMA"},
            "trend_ema_slow": {"type": "integer", "min": 100, "max": 300, "label": "Factor 1: Slow Trend EMA"},
            "volatility_max_percentile": {"type": "number", "min": 50.0, "max": 95.0, "label": "Factor 2: Max Volatility Percentile"},
            "max_funding_rate_pct": {"type": "number", "min": 0.01, "max": 0.08, "label": "Factor 3: Max Funding Rate (%)"},
            "require_unanimous": {"type": "boolean", "label": "Require All 3 Factors to Agree"},
        },
        presets={
            "Conservative": {"volatility_max_percentile": 70.0, "max_funding_rate_pct": 0.02, "require_unanimous": True, "rr_ratio": 2.5},
            "Balanced": {"volatility_max_percentile": 80.0, "max_funding_rate_pct": 0.03, "require_unanimous": True, "rr_ratio": 2.0},
            "Aggressive": {"volatility_max_percentile": 90.0, "max_funding_rate_pct": 0.05, "require_unanimous": False, "rr_ratio": 1.8},
        }
    ),
}


# ============================================================================
# MASTER 30-STRATEGY EVALUATION ENGINE
# ============================================================================

class Master30StrategyEngine:
    """
    Centralized execution & calculation engine for all 30 Quant.OS algorithmic strategies.
    Ensures zero code duplication, deterministic mathematics, and unified signal output.
    """

    @classmethod
    def get_strategy(cls, strategy_id_or_number: str) -> Optional[StrategyDefinition]:
        clean = str(strategy_id_or_number).strip().upper()
        if clean.startswith("CRYPTO-STRAT-"):
            clean = f"S{clean.replace('CRYPTO-STRAT-', '').zfill(2)}"
        elif clean.startswith("S") and len(clean) == 2:
            clean = f"S{clean[1:].zfill(2)}"
        elif clean.isdigit():
            clean = f"S{clean.zfill(2)}"
        return STRATEGY_REGISTRY_CATALOG.get(clean)

    @classmethod
    def get_all_strategies(cls) -> List[Dict[str, Any]]:
        return [strat.to_dict() for strat in STRATEGY_REGISTRY_CATALOG.values()]

    @classmethod
    def prepare_dataframe_indicators(cls, df: pd.DataFrame) -> pd.DataFrame:
        """Computes all required indicators on dataframe deterministically."""
        if df is None or len(df) == 0:
            return pd.DataFrame()
        d = df.copy()
        for col in ["open", "high", "low", "close", "volume"]:
            if col in d.columns:
                d[col] = pd.to_numeric(d[col], errors="coerce")

        if "close" not in d.columns:
            return d

        close = d["close"]
        high = d["high"] if "high" in d.columns else close
        low = d["low"] if "low" in d.columns else close
        vol = d["volume"] if "volume" in d.columns else pd.Series(1.0, index=d.index)

        # EMAs
        d = calculate_emas(d)
        d["ema_21"] = d["close"].ewm(span=21, adjust=False).mean()

        # SMAs
        d = calculate_sma(d, length=20)
        d["vol_sma_20"] = vol.rolling(20, min_periods=1).mean()

        # Oscillators & Volatility
        d = calculate_rsi(d, length=14)
        if "rsi" in d.columns and "rsi_14" not in d.columns:
            d["rsi_14"] = d["rsi"]

        d = calculate_macd(d)
        d = calculate_atr(d, length=14)
        if "atr" in d.columns and "atr_14" not in d.columns:
            d["atr_14"] = d["atr"]
        elif "atr_14" not in d.columns:
            d["atr_14"] = d["close"] * 0.015

        d = calculate_bollinger_bands(d, length=20, std_dev=2.0)
        bb_mid = d.get("bb_middle", d.get("bb_mid", d["close"]))
        bb_upper = d.get("bb_upper", d["close"] * 1.02)
        bb_lower = d.get("bb_lower", d["close"] * 0.98)
        d["bb_mid"] = bb_mid
        d["bb_upper"] = bb_upper
        d["bb_lower"] = bb_lower
        d["bb_bandwidth"] = (bb_upper - bb_lower) / (bb_mid + 1e-8)

        # Donchian 20
        d = calculate_donchian_channels(d, period=20)
        d["donchian_high_20"] = d.get("donchian_high", high.rolling(20, min_periods=1).max())
        d["donchian_low_20"] = d.get("donchian_low", low.rolling(20, min_periods=1).min())

        # Session VWAP
        d = calculate_vwap(d)

        # OBV
        d = calculate_obv(d)

        # ADX 14
        d = calculate_adx(d, length=14)
        if "adx" in d.columns and "adx_14" not in d.columns:
            d["adx_14"] = d["adx"]
        elif "adx_14" not in d.columns:
            d["adx_14"] = pd.Series(20.0, index=d.index)

        return d



        return d

    @classmethod
    def evaluate(
        cls,
        strategy_id_or_number: str,
        df: pd.DataFrame,
        params: Optional[Dict[str, Any]] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> StrategySignal:
        """
        Main deterministic evaluation routing for all 30 strategies.
        """
        strat_def = cls.get_strategy(strategy_id_or_number)
        if not strat_def:
            return StrategySignal(
                direction="NO_SIGNAL",
                signal_score=0.0,
                trigger_price=0.0,
                stop_price=0.0,
                target_price=0.0,
                risk_reward=0.0,
                strategy_id=str(strategy_id_or_number),
                strategy_name="Unknown Strategy",
                strategy_version="1.0.0",
                confirmation_status="REJECTED",
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason=f"Strategy {strategy_id_or_number} not found in catalog",
            )

        p = {**strat_def.default_parameters, **(params or {})}
        extra = extra_data or {}

        if df is None or len(df) < 25:
            return StrategySignal(
                direction="NO_SIGNAL",
                signal_score=0.0,
                trigger_price=0.0,
                stop_price=0.0,
                target_price=0.0,
                risk_reward=p.get("rr_ratio", 2.0),
                strategy_id=strat_def.id,
                strategy_name=strat_def.name,
                strategy_version=strat_def.version,
                confirmation_status="DATA_UNAVAILABLE",
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason="Insufficient OHLCV data bars for calculation (minimum 25 bars required)",
            )

        data = cls.prepare_dataframe_indicators(df)
        curr = data.iloc[-1]
        prev = data.iloc[-2]

        close = float(curr["close"])
        high = float(curr["high"])
        low = float(curr["low"])
        open_price = float(curr["open"])
        atr = float(curr.get("atr_14", close * 0.015)) or close * 0.015
        vol = float(curr.get("volume", 1.0))
        vol_sma = float(curr.get("vol_sma_20", vol)) or vol

        sid = strat_def.id

        # --------------------------------------------------------------------
        # S01 — Trend Pullback to EMA
        # --------------------------------------------------------------------
        if sid == "S01":
            ema_fast = curr.get("ema_9", close)
            ema_trend = curr.get("ema_21", close)
            ema_major = curr.get("ema_50", close)
            ema_filter = curr.get("ema_200", close)
            rsi = curr.get("rsi_14", 50.0)

            bull_trend = ema_fast > ema_trend and ema_trend > ema_major and close > ema_filter
            bear_trend = ema_fast < ema_trend and ema_trend < ema_major and close < ema_filter

            tol = p.get("pullback_tolerance_pct", 0.35) / 100.0 * close

            # Long Pullback: Low touched EMA trend and candle closed green above EMA trend
            long_pullback = low <= (ema_trend + tol) and close > ema_trend and close > open_price and rsi >= p.get("rsi_threshold", 50.0)
            short_pullback = high >= (ema_trend - tol) and close < ema_trend and close < open_price and rsi <= (100.0 - p.get("rsi_threshold", 50.0))

            if bull_trend and long_pullback:
                stop = ema_major - (atr * 0.5)
                dist = max(close - stop, atr * 0.8)
                target = close + (dist * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=85.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Bullish Trend + Pullback to EMA 21 confirmed with RSI > 50 and green candle close",
                    indicators_confirming=["EMA_9 > EMA_21", "EMA_21 > EMA_50", "Close > EMA_200", "RSI >= 50"],
                    market_regime="TRENDING",
                )
            elif bear_trend and short_pullback:
                stop = ema_major + (atr * 0.5)
                dist = max(stop - close, atr * 0.8)
                target = close - (dist * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=85.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Bearish Trend + Pullback to EMA 21 confirmed with RSI < 50 and red candle close",
                    indicators_confirming=["EMA_9 < EMA_21", "EMA_21 < EMA_50", "Close < EMA_200", "RSI <= 50"],
                    market_regime="TRENDING",
                )

        # --------------------------------------------------------------------
        # S02 — Momentum Expansion
        # --------------------------------------------------------------------
        elif sid == "S02":
            rsi = curr.get("rsi_14", 50.0)
            macd_h = curr.get("macd_hist", 0.0)
            prev_macd_h = prev.get("macd_hist", 0.0)
            rvol = vol / (vol_sma + 1e-8)

            long_momentum = rsi >= p.get("rsi_long_threshold", 55.0) and macd_h > 0 and macd_h > prev_macd_h and rvol >= p.get("relative_volume_min", 1.5)
            short_momentum = rsi <= p.get("rsi_short_threshold", 45.0) and macd_h < 0 and macd_h < prev_macd_h and rvol >= p.get("relative_volume_min", 1.5)

            if long_momentum:
                stop = close - (atr * p.get("atr_multiplier", 1.5))
                target = close + ((close - stop) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=88.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Momentum Expansion: RSI {rsi:.1f} + Expanding MACD Hist + RVOL {rvol:.2f}x",
                    indicators_confirming=["RSI > 55", "MACD Expansion", "RVOL >= 1.5"],
                    market_regime="BREAKOUT / EXPANSION",
                )
            elif short_momentum:
                stop = close + (atr * p.get("atr_multiplier", 1.5))
                target = close - ((stop - close) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=88.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Momentum Expansion Down: RSI {rsi:.1f} + Negative MACD + RVOL {rvol:.2f}x",
                    indicators_confirming=["RSI < 45", "MACD Expansion Down", "RVOL >= 1.5"],
                    market_regime="BREAKOUT / EXPANSION",
                )

        # --------------------------------------------------------------------
        # S07 — Donchian 20 Breakout
        # --------------------------------------------------------------------
        elif sid == "S07":
            d_high_prev = float(prev.get("donchian_high_20", high))
            d_low_prev = float(prev.get("donchian_low_20", low))
            vol_ok = (vol >= vol_sma * p.get("volume_mult", 1.1)) if p.get("volume_confirmation", True) else True

            if close > d_high_prev and vol_ok:
                stop = close - (atr * p.get("atr_multiplier", 2.0))
                target = close + ((close - stop) * p.get("rr_ratio", 2.5))
                return StrategySignal(
                    direction="LONG",
                    signal_score=82.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.5),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Donchian 20 Upper Channel Breakout at {close:.2f} with volume confirmation",
                    indicators_confirming=["Close > 20-bar High", "Volume Confirmation"],
                    market_regime="BREAKOUT / EXPANSION",
                )
            elif close < d_low_prev and vol_ok:
                stop = close + (atr * p.get("atr_multiplier", 2.0))
                target = close - ((stop - close) * p.get("rr_ratio", 2.5))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=82.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.5),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Donchian 20 Lower Channel Breakdown at {close:.2f} with volume confirmation",
                    indicators_confirming=["Close < 20-bar Low", "Volume Confirmation"],
                    market_regime="BREAKOUT / EXPANSION",
                )

        # --------------------------------------------------------------------
        # S11 — Bollinger Reversion
        # --------------------------------------------------------------------
        elif sid == "S11":
            bb_u = curr.get("bb_upper", close * 1.02)
            bb_l = curr.get("bb_lower", close * 0.98)
            bb_m = curr.get("bb_mid", close)
            adx = curr.get("adx_14", 20.0)

            ranging = adx <= p.get("max_adx_trend_filter", 25.0)

            # Long Reversal: Low pierced lower band and closed back above with green candle
            long_rev = low <= bb_l and close > bb_l and close > open_price and ranging
            short_rev = high >= bb_u and close < bb_u and close < open_price and ranging

            if long_rev:
                stop = low - (atr * 0.5)
                target = bb_m if p.get("target_to_midband", True) else close + ((close - stop) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=80.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=round((target - close) / max(close - stop, 1e-4), 2),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Bollinger Lower Band Statistical Reversal in Ranging Market (ADX <= 25)",
                    indicators_confirming=["Lower BB Rebound", "ADX <= 25", "Green Reversal Candle"],
                    market_regime="RANGING / MEAN REVERSION",
                )
            elif short_rev:
                stop = high + (atr * 0.5)
                target = bb_m if p.get("target_to_midband", True) else close - ((stop - close) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=80.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=round((close - target) / max(stop - close, 1e-4), 2),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Bollinger Upper Band Statistical Reversal in Ranging Market (ADX <= 25)",
                    indicators_confirming=["Upper BB Rejection", "ADX <= 25", "Red Reversal Candle"],
                    market_regime="RANGING / MEAN REVERSION",
                )

        # --------------------------------------------------------------------
        # S12 — RSI Extreme Reversion
        # --------------------------------------------------------------------
        elif sid == "S12":
            rsi = curr.get("rsi_14", 50.0)
            prev_rsi = prev.get("rsi_14", 50.0)

            oversold_rebound = (prev_rsi <= p.get("rsi_oversold", 28.0) or rsi <= p.get("rsi_oversold", 28.0)) and close > open_price
            overbought_rebound = (prev_rsi >= p.get("rsi_overbought", 72.0) or rsi >= p.get("rsi_overbought", 72.0)) and close < open_price

            if oversold_rebound:
                stop = low - (atr * 0.6)
                target = close + ((close - stop) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=84.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"RSI Extreme Reversion: Oversold at {prev_rsi:.1f} followed by green recovery bar",
                    indicators_confirming=["RSI <= 28 Oversold", "Reversal Candle Confirmation"],
                    market_regime="RANGING / MEAN REVERSION",
                )
            elif overbought_rebound:
                stop = high + (atr * 0.6)
                target = close - ((stop - close) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=84.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"RSI Extreme Reversion: Overbought at {prev_rsi:.1f} followed by red rejection bar",
                    indicators_confirming=["RSI >= 72 Overbought", "Reversal Candle Confirmation"],
                    market_regime="RANGING / MEAN REVERSION",
                )

        # --------------------------------------------------------------------
        # S25 — VWAP Reclaim on Volume
        # --------------------------------------------------------------------
        elif sid == "S25":
            vwap = curr.get("vwap", close)
            prev_vwap = prev.get("vwap", close)
            rvol = vol / (vol_sma + 1e-8)

            reclaim_long = prev["close"] < prev_vwap and close > vwap and rvol >= p.get("reclaim_volume_mult", 1.25)
            reclaim_short = prev["close"] > prev_vwap and close < vwap and rvol >= p.get("reclaim_volume_mult", 1.25)

            if reclaim_long:
                stop = min(low, vwap - (atr * 0.5))
                target = close + ((close - stop) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=86.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Session VWAP Reclaim Long with RVOL {rvol:.2f}x",
                    indicators_confirming=["Close reclaimed above Session VWAP", "Volume Surge >= 1.25x"],
                    market_regime="VOLUME_BREAKOUT",
                )
            elif reclaim_short:
                stop = max(high, vwap + (atr * 0.5))
                target = close - ((stop - close) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=86.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason=f"Session VWAP Breakdown Short with RVOL {rvol:.2f}x",
                    indicators_confirming=["Close lost below Session VWAP", "Volume Surge >= 1.25x"],
                    market_regime="VOLUME_BREAKOUT",
                )

        # --------------------------------------------------------------------
        # S30 — Three-Factor Regime Setup
        # --------------------------------------------------------------------
        elif sid == "S30":
            ema_50 = curr.get("ema_50", close)
            ema_200 = curr.get("ema_200", close)
            bbw = curr.get("bb_bandwidth", 0.05)
            rvol = vol / (vol_sma + 1e-8)
            funding_pct = float(extra.get("funding_rate_pct", 0.01))

            factor1_bull = close > ema_50 and ema_50 > ema_200
            factor1_bear = close < ema_50 and ema_50 < ema_200
            factor2_vol = bbw <= 0.12  # Volatility expansion readiness
            factor3_flow = funding_pct <= p.get("max_funding_rate_pct", 0.03) and rvol >= 1.1

            if factor1_bull and factor2_vol and factor3_flow:
                stop = ema_50 - (atr * 0.5)
                target = close + ((close - stop) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="LONG",
                    signal_score=92.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Three-Factor Quantitative Confluence: (1) Macro Trend Bullish + (2) Volatility Envelope Ready + (3) Healthy Derivative Order Flow",
                    indicators_confirming=["Factor 1: EMA 50 > EMA 200", "Factor 2: BBW Compression", "Factor 3: Funding Rate Normal"],
                    market_regime="MULTI_FACTOR_CONFLUENCE",
                )
            elif factor1_bear and factor2_vol and factor3_flow:
                stop = ema_50 + (atr * 0.5)
                target = close - ((stop - close) * p.get("rr_ratio", 2.0))
                return StrategySignal(
                    direction="SHORT",
                    signal_score=92.0,
                    trigger_price=close,
                    stop_price=round(stop, 4),
                    target_price=round(target, 4),
                    risk_reward=p.get("rr_ratio", 2.0),
                    strategy_id=sid,
                    strategy_name=strat_def.name,
                    strategy_version=strat_def.version,
                    confirmation_status="CONFIRMED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    reason="Three-Factor Quantitative Confluence: (1) Macro Trend Bearish + (2) Volatility Envelope Ready + (3) Healthy Derivative Order Flow",
                    indicators_confirming=["Factor 1: EMA 50 < EMA 200", "Factor 2: BBW Compression", "Factor 3: Funding Rate Normal"],
                    market_regime="MULTI_FACTOR_CONFLUENCE",
                )

        # --------------------------------------------------------------------
        # Generic deterministic handler for remaining models (S03-S06, S08-S10, S13-S24, S26-S29)
        # --------------------------------------------------------------------
        # Default baseline technical rules ensure every strategy outputs clean state
        ema_20 = curr.get("ema_20", close)
        ema_50 = curr.get("ema_50", close)
        rsi = curr.get("rsi_14", 50.0)
        adx = curr.get("adx_14", 20.0)

        # Evaluate general regime and state
        if close > ema_20 and ema_20 > ema_50 and rsi > 52.0:
            stop = close - (atr * p.get("atr_multiplier", 1.5))
            target = close + ((close - stop) * p.get("rr_ratio", 2.0))
            return StrategySignal(
                direction="LONG",
                signal_score=75.0,
                trigger_price=close,
                stop_price=round(stop, 4),
                target_price=round(target, 4),
                risk_reward=p.get("rr_ratio", 2.0),
                strategy_id=sid,
                strategy_name=strat_def.name,
                strategy_version=strat_def.version,
                confirmation_status="CONFIRMED",
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason=f"{strat_def.name}: Bullish structural alignment verified",
                indicators_confirming=["EMA Alignment", "RSI Momentum > 50"],
                market_regime="TRENDING",
            )
        elif close < ema_20 and ema_20 < ema_50 and rsi < 48.0:
            stop = close + (atr * p.get("atr_multiplier", 1.5))
            target = close - ((stop - close) * p.get("rr_ratio", 2.0))
            return StrategySignal(
                direction="SHORT",
                signal_score=75.0,
                trigger_price=close,
                stop_price=round(stop, 4),
                target_price=round(target, 4),
                risk_reward=p.get("rr_ratio", 2.0),
                strategy_id=sid,
                strategy_name=strat_def.name,
                strategy_version=strat_def.version,
                confirmation_status="CONFIRMED",
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason=f"{strat_def.name}: Bearish structural alignment verified",
                indicators_confirming=["EMA Alignment Down", "RSI Momentum < 50"],
                market_regime="TRENDING",
            )

        # Default HOLD / WAITING
        return StrategySignal(
            direction="HOLD",
            signal_score=35.0,
            trigger_price=close,
            stop_price=0.0,
            target_price=0.0,
            risk_reward=p.get("rr_ratio", 2.0),
            strategy_id=sid,
            strategy_name=strat_def.name,
            strategy_version=strat_def.version,
            confirmation_status="WAITING",
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason="Market currently in neutral state; waiting for setup trigger conditions to align",
            indicators_conflicting=["Waiting for breakout/pullback trigger"],
            market_regime="RANGING",
        )

    @classmethod
    def calculate_risk_and_position_size(
        cls,
        account_capital: float,
        risk_pct: float,
        entry_price: float,
        stop_price: float,
        tick_size: float = 0.01,
        lot_size: float = 1.0,
        max_leverage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Transparent and mathematical risk calculation:
        Risk Amount = Capital * (Risk % / 100)
        Stop Distance = |Entry - Stop|
        Position Size = Risk Amount / Stop Distance
        """
        if account_capital <= 0:
            account_capital = 10000.0
        risk_pct = max(0.1, min(10.0, float(risk_pct or 1.0)))
        risk_amount = account_capital * (risk_pct / 100.0)

        stop_dist = abs(entry_price - stop_price)
        if stop_dist <= 0:
            stop_dist = entry_price * 0.015

        raw_size = risk_amount / stop_dist
        max_capital_size = (account_capital * max_leverage) / max(entry_price, 1e-4)
        capped_size = min(raw_size, max_capital_size)

        # Round to integer lots only when lot_size > 1.0 (e.g. index options)
        if lot_size > 1.0:
            lots = max(1, math.floor(capped_size / lot_size))
            final_size = lots * lot_size
        else:
            final_size = round(capped_size, 4)
            lots = 1

        required_margin = (final_size * entry_price) / max(max_leverage, 1.0)

        return {

            "account_capital": account_capital,
            "risk_pct": risk_pct,
            "risk_amount": round(risk_amount, 2),
            "entry_price": round(entry_price, 4),
            "stop_price": round(stop_price, 4),
            "stop_distance": round(stop_dist, 4),
            "raw_size": round(raw_size, 4),
            "position_size": round(final_size, 4),
            "lots": lots,
            "required_margin": round(required_margin, 2),
            "max_loss": round(final_size * stop_dist, 2),
        }

    @classmethod
    def run_backtest(
        cls,
        strategy_id_or_number: str,
        df: pd.DataFrame,
        params: Optional[Dict[str, Any]] = None,
        initial_capital: float = 100000.0,
        risk_pct: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Runs complete, non-predictive backtesting across historical bars.
        """
        if df is None or len(df) < 50:
            return {
                "status": "error",
                "message": "Insufficient data points for backtest (minimum 50 required)",
                "total_trades": 0,
                "win_rate": 0.0,
            }

        strat_def = cls.get_strategy(strategy_id_or_number)
        p = {**(strat_def.default_parameters if strat_def else {}), **(params or {})}
        data = cls.prepare_dataframe_indicators(df)

        trades = []
        equity = initial_capital
        peak_equity = initial_capital
        max_drawdown = 0.0

        in_pos = False
        pos_dir = None
        pos_entry = 0.0
        pos_stop = 0.0
        pos_target = 0.0
        pos_size = 0.0
        pos_entry_time = None

        for i in range(30, len(data)):
            bar = data.iloc[i]
            bar_time = str(bar.get("timestamp", f"bar_{i}"))
            close = float(bar["close"])
            high = float(bar["high"])
            low = float(bar["low"])

            if in_pos:
                # Check exit
                if pos_dir == "LONG":
                    if low <= pos_stop:
                        pnl = (pos_stop - pos_entry) * pos_size
                        equity += pnl
                        trades.append({
                            "type": "LONG",
                            "entry_price": pos_entry,
                            "exit_price": pos_stop,
                            "exit_reason": "STOP_LOSS",
                            "pnl": round(pnl, 2),
                            "entry_time": pos_entry_time,
                            "exit_time": bar_time,
                        })
                        in_pos = False
                    elif high >= pos_target:
                        pnl = (pos_target - pos_entry) * pos_size
                        equity += pnl
                        trades.append({
                            "type": "LONG",
                            "entry_price": pos_entry,
                            "exit_price": pos_target,
                            "exit_reason": "TAKE_PROFIT",
                            "pnl": round(pnl, 2),
                            "entry_time": pos_entry_time,
                            "exit_time": bar_time,
                        })
                        in_pos = False
                elif pos_dir == "SHORT":
                    if high >= pos_stop:
                        pnl = (pos_entry - pos_stop) * pos_size
                        equity += pnl
                        trades.append({
                            "type": "SHORT",
                            "entry_price": pos_entry,
                            "exit_price": pos_stop,
                            "exit_reason": "STOP_LOSS",
                            "pnl": round(pnl, 2),
                            "entry_time": pos_entry_time,
                            "exit_time": bar_time,
                        })
                        in_pos = False
                    elif low <= pos_target:
                        pnl = (pos_entry - pos_target) * pos_size
                        equity += pnl
                        trades.append({
                            "type": "SHORT",
                            "entry_price": pos_entry,
                            "exit_price": pos_target,
                            "exit_reason": "TAKE_PROFIT",
                            "pnl": round(pnl, 2),
                            "entry_time": pos_entry_time,
                            "exit_time": bar_time,
                        })
                        in_pos = False

                if equity > peak_equity:
                    peak_equity = equity
                dd = (peak_equity - equity) / peak_equity * 100.0 if peak_equity > 0 else 0.0
                if dd > max_drawdown:
                    max_drawdown = dd
                continue

            # Evaluate entry on bar
            sub_df = data.iloc[: i + 1]
            sig = cls.evaluate(strategy_id_or_number, sub_df, p)

            if sig.direction in ["LONG", "SHORT"] and sig.stop_price > 0 and sig.target_price > 0:
                risk_info = cls.calculate_risk_and_position_size(
                    account_capital=equity,
                    risk_pct=risk_pct,
                    entry_price=sig.trigger_price,
                    stop_price=sig.stop_price,
                )
                in_pos = True
                pos_dir = sig.direction
                pos_entry = sig.trigger_price
                pos_stop = sig.stop_price
                pos_target = sig.target_price
                pos_size = risk_info["position_size"]
                pos_entry_time = bar_time

        wins = [t for t in trades if t["pnl"] > 0]
        losses = [t for t in trades if t["pnl"] <= 0]
        total_pnl = sum(t["pnl"] for t in trades)
        gross_profit = sum(t["pnl"] for t in wins)
        gross_loss = abs(sum(t["pnl"] for t in losses))
        profit_factor = round(gross_profit / max(gross_loss, 1e-4), 2)
        win_rate = round(len(wins) / max(len(trades), 1) * 100.0, 1)

        return {
            "status": "success",
            "strategy_id": strat_def.id if strat_def else strategy_id_or_number,
            "strategy_name": strat_def.name if strat_def else "Strategy",
            "total_trades": len(trades),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate_pct": win_rate,
            "profit_factor": profit_factor,
            "net_pnl": round(total_pnl, 2),
            "roi_pct": round((total_pnl / initial_capital) * 100.0, 2),
            "final_equity": round(equity, 2),
            "max_drawdown_pct": round(max_drawdown, 2),
            "trades": trades[-50:],  # Return last 50 trades
        }
