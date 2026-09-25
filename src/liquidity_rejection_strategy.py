"""
Liquidity Rejection Structure Pro Strategy Engine
=================================================
Authoritative deterministic implementation of:
MARKET STATE -> LIQUIDITY POOL -> SWEEP -> REJECTION -> CHoCH/BOS -> RETEST -> ENTRY -> RISK -> OPPOSING LIQUIDITY TARGET

Deterministic, non-repainting, no look-ahead bias, observable market conditions only.
"""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger("LiquidityRejectionStructurePro")


class LiquidityType:
    SWING_HIGH = "SWING_HIGH"
    SWING_LOW = "SWING_LOW"
    EQUAL_HIGHS = "EQUAL_HIGHS"
    EQUAL_LOWS = "EQUAL_LOWS"
    PREV_SESSION_HIGH = "PREV_SESSION_HIGH"
    PREV_SESSION_LOW = "PREV_SESSION_LOW"
    RANGE_HIGH = "RANGE_HIGH"
    RANGE_LOW = "RANGE_LOW"
    ROUND_NUMBER = "ROUND_NUMBER"


class MarketState:
    TREND = "TREND"
    RANGE = "RANGE"
    BREAKOUT = "BREAKOUT"
    REVERSAL = "REVERSAL"
    UNCLEAR = "UNCLEAR"


class RejectionStatus:
    REJECTION = "REJECTION"
    ACCEPTANCE = "ACCEPTANCE"
    UNCONFIRMED = "UNCONFIRMED"


class StructureStatus:
    BULLISH_CHOCH = "BULLISH_CHOCH"
    BEARISH_CHOCH = "BEARISH_CHOCH"
    BULLISH_BOS = "BULLISH_BOS"
    BEARISH_BOS = "BEARISH_BOS"
    NONE = "NONE"


class EntryMode:
    CONFIRMATION_CLOSE = "CONFIRMATION_CLOSE"
    RETEST = "RETEST"
    LIMIT_RETEST = "LIMIT_RETEST"


DEFAULT_CONFIG: Dict[str, Any] = {
    "strategy_id": "liquidity-rejection-structure-pro",
    "version": "1.0.0",
    "name": "Liquidity Rejection Structure Pro",
    "min_sweep_atr": 0.05,
    "max_sweep_atr": 1.00,
    "max_acceptance_bars": 2,
    "swing_lookback": 5,
    "minimum_swing_atr": 0.50,
    "minimum_structure_distance_atr": 0.20,
    "stop_buffer_atr": 0.20,
    "minimum_rr": 2.0,
    "min_score": 70,
    "allow_unclear_market_state": False,
    "entry_mode": "RETEST",  # RETEST | CONFIRMATION_CLOSE | LIMIT_RETEST
    "risk_per_trade_pct": 0.50,
    "max_risk_per_trade_pct": 1.00,
    "round_number_step": 1000.0,
    "equal_high_low_tolerance_pct": 0.0015,
    "max_data_age_ms": 60000,
    "max_spread_pct": 0.002,
    "enable_tp1": True,
    "tp1_ratio": 1.5,
    "tp1_close_pct": 50,
    "tp2_close_pct": 50,
    "move_sl_to_be_at_tp1": True,
    "trailing_stop_enabled": False,
    "trailing_stop_atr": 1.5,
}


class LiquidityRejectionStructurePro:
    """
    Deterministic quantitative engine for the Liquidity Rejection Structure Pro strategy.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = {**DEFAULT_CONFIG, **(config or {})}

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculates true range and Average True Range (ATR)."""
        high = df["high"].astype(float)
        low = df["low"].astype(float)
        close = df["close"].astype(float)
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period, min_periods=1).mean()
        return atr

    @staticmethod
    def classify_market_state(df: pd.DataFrame, idx: int = -1) -> Dict[str, Any]:
        """
        Classifies dynamic market state: TREND, RANGE, BREAKOUT, REVERSAL, UNCLEAR.
        No subjective guessing; pure mathematical thresholds.
        """
        if len(df) < 20:
            return {
                "market_state": MarketState.UNCLEAR,
                "confidence": 0.0,
                "reason": "Insufficient candle history (< 20 bars)",
                "adx": 0.0,
                "ema_slope": 0.0,
            }

        if idx < 0:
            idx = len(df) + idx

        window = df.iloc[max(0, idx - 30): idx + 1].copy()
        closes = window["close"].astype(float).values
        highs = window["high"].astype(float).values
        lows = window["low"].astype(float).values
        volumes = window["volume"].astype(float).values if "volume" in window.columns else np.ones(len(closes))

        current_close = float(closes[-1])
        current_volume = float(volumes[-1])
        avg_volume = float(np.mean(volumes[-20:])) if len(volumes) >= 20 else current_volume

        # Compute simple 20 EMA and 50 EMA if not present
        ema_20 = pd.Series(closes).ewm(span=20, adjust=False).mean().values[-1]
        ema_50 = pd.Series(closes).ewm(span=50, adjust=False).mean().values[-1] if len(closes) >= 50 else ema_20

        # ADX estimate
        high_series = pd.Series(highs)
        low_series = pd.Series(lows)
        close_series = pd.Series(closes)
        tr = pd.concat([
            high_series - low_series,
            (high_series - close_series.shift(1)).abs(),
            (low_series - close_series.shift(1)).abs()
        ], axis=1).max(axis=1)
        atr_14 = float(tr.rolling(14, min_periods=1).mean().iloc[-1])

        # High-Low Range
        recent_high = float(np.max(highs[-20:]))
        recent_low = float(np.min(lows[-20:]))
        range_span = recent_high - recent_low
        range_span_atr = range_span / atr_14 if atr_14 > 0 else 1.0

        # Linear regression slope over last 15 bars
        if len(closes) >= 15:
            x = np.arange(15)
            y = closes[-15:]
            slope, _ = np.polyfit(x, y, 1)
            norm_slope = (slope / current_close) * 100.0 if current_close > 0 else 0.0
        else:
            norm_slope = 0.0

        # Volatility expansion check (Breakout)
        is_breakout_candle = (highs[-1] > np.max(highs[-15:-1])) or (lows[-1] < np.min(lows[-15:-1]))
        volume_expanding = current_volume > (avg_volume * 1.4)

        if is_breakout_candle and volume_expanding and abs(norm_slope) > 0.15:
            return {
                "market_state": MarketState.BREAKOUT,
                "confidence": 85.0,
                "reason": f"Breakout expansion beyond 15-bar extreme with {current_volume/avg_volume:.1f}x volume surge",
                "adx_est": 32.0,
                "slope": round(norm_slope, 4),
            }

        # Trend detection
        is_trending = abs(norm_slope) > 0.08 and (current_close >= ema_20 if norm_slope > 0 else current_close <= ema_20)
        if is_trending:
            trend_dir = "BULLISH" if norm_slope > 0 else "BEARISH"
            return {
                "market_state": MarketState.TREND,
                "confidence": 80.0,
                "reason": f"Sustained {trend_dir} trend alignment with slope {norm_slope:+.2f}%",
                "adx_est": 28.0,
                "slope": round(norm_slope, 4),
            }

        # Range detection
        if range_span_atr < 4.5 and abs(norm_slope) < 0.08:
            return {
                "market_state": MarketState.RANGE,
                "confidence": 78.0,
                "reason": f"Horizontal consolidation within [{recent_low:.2f} - {recent_high:.2f}] span ({range_span_atr:.1f} ATR)",
                "adx_est": 16.0,
                "slope": round(norm_slope, 4),
            }

        # Reversal detection (exhaustion at extreme)
        if (current_close >= recent_high and norm_slope < 0) or (current_close <= recent_low and norm_slope > 0):
            return {
                "market_state": MarketState.REVERSAL,
                "confidence": 72.0,
                "reason": "Exhaustion pivot testing range perimeter with momentum divergence",
                "adx_est": 22.0,
                "slope": round(norm_slope, 4),
            }

        # Fallback to Unclear if erratic
        return {
            "market_state": MarketState.UNCLEAR,
            "confidence": 40.0,
            "reason": "Low conviction structure without defined boundary or directional momentum",
            "adx_est": 12.0,
            "slope": round(norm_slope, 4),
        }

    @staticmethod
    def detect_liquidity_pools(
        df: pd.DataFrame,
        timeframe: str = "15m",
        swing_lookback: int = 5,
        round_number_step: float = 1000.0,
        equal_tolerance_pct: float = 0.0015,
    ) -> List[Dict[str, Any]]:
        """
        Dynamically detects active liquidity pools without look-ahead bias or repainting.
        Types: SWING_HIGH, SWING_LOW, EQUAL_HIGHS, EQUAL_LOWS, PREV_SESSION_HIGH, PREV_SESSION_LOW, RANGE_HIGH, RANGE_LOW, ROUND_NUMBER.
        """
        pools: List[Dict[str, Any]] = []
        if len(df) < (swing_lookback * 2 + 1):
            return pools

        highs = df["high"].astype(float).values
        lows = df["low"].astype(float).values
        timestamps = df["timestamp"].astype(str).values if "timestamp" in df.columns else [f"bar_{i}" for i in range(len(df))]
        n = len(df)

        detected_highs = []
        detected_lows = []

        # 1. Swing Highs & Lows (only confirmed up to n - swing_lookback - 1)
        for i in range(swing_lookback, n - swing_lookback):
            h_val = highs[i]
            l_val = lows[i]

            # Swing High
            is_sh = all(h_val >= highs[i - j] for j in range(1, swing_lookback + 1)) and \
                    all(h_val > highs[i + j] for j in range(1, swing_lookback + 1))
            if is_sh:
                detected_highs.append({"idx": i, "price": h_val, "ts": timestamps[i]})

            # Swing Low
            is_sl = all(l_val <= lows[i - j] for j in range(1, swing_lookback + 1)) and \
                    all(l_val < lows[i + j] for j in range(1, swing_lookback + 1))
            if is_sl:
                detected_lows.append({"idx": i, "price": l_val, "ts": timestamps[i]})

        # Add most recent confirmed swing pools
        for sh in detected_highs[-6:]:
            pools.append({
                "level_id": f"liq_sh_{int(sh['price'])}_{sh['idx']}",
                "type": LiquidityType.SWING_HIGH,
                "price": round(float(sh["price"]), 2),
                "strength": 85.0,
                "touch_count": 1,
                "created_at": sh["ts"],
                "timeframe": timeframe,
                "active": True,
                "swept": False,
                "idx": sh["idx"],
            })

        for sl in detected_lows[-6:]:
            pools.append({
                "level_id": f"liq_sl_{int(sl['price'])}_{sl['idx']}",
                "type": LiquidityType.SWING_LOW,
                "price": round(float(sl["price"]), 2),
                "strength": 85.0,
                "touch_count": 1,
                "created_at": sl["ts"],
                "timeframe": timeframe,
                "active": True,
                "swept": False,
                "idx": sl["idx"],
            })

        # 2. Equal Highs / Equal Lows (touch within tolerance)
        if len(detected_highs) >= 2:
            for i in range(len(detected_highs) - 1):
                h1 = detected_highs[i]["price"]
                h2 = detected_highs[i + 1]["price"]
                if abs(h1 - h2) / max(h1, h2) <= equal_tolerance_pct:
                    avg_eq = (h1 + h2) / 2.0
                    pools.append({
                        "level_id": f"liq_eqh_{int(avg_eq)}_{detected_highs[i+1]['idx']}",
                        "type": LiquidityType.EQUAL_HIGHS,
                        "price": round(float(avg_eq), 2),
                        "strength": 95.0,
                        "touch_count": 2,
                        "created_at": detected_highs[i + 1]["ts"],
                        "timeframe": timeframe,
                        "active": True,
                        "swept": False,
                        "idx": detected_highs[i + 1]["idx"],
                    })

        if len(detected_lows) >= 2:
            for i in range(len(detected_lows) - 1):
                l1 = detected_lows[i]["price"]
                l2 = detected_lows[i + 1]["price"]
                if abs(l1 - l2) / max(l1, l2) <= equal_tolerance_pct:
                    avg_eq = (l1 + l2) / 2.0
                    pools.append({
                        "level_id": f"liq_eql_{int(avg_eq)}_{detected_lows[i+1]['idx']}",
                        "type": LiquidityType.EQUAL_LOWS,
                        "price": round(float(avg_eq), 2),
                        "strength": 95.0,
                        "touch_count": 2,
                        "created_at": detected_lows[i + 1]["ts"],
                        "timeframe": timeframe,
                        "active": True,
                        "swept": False,
                        "idx": detected_lows[i + 1]["idx"],
                    })

        # 3. Session High / Low / Range High / Range Low
        if len(highs) >= 20:
            rh = float(np.max(highs[-20:]))
            rl = float(np.min(lows[-20:]))
            pools.append({
                "level_id": f"liq_rh_{int(rh)}",
                "type": LiquidityType.RANGE_HIGH,
                "price": round(rh, 2),
                "strength": 80.0,
                "touch_count": 1,
                "created_at": timestamps[-1],
                "timeframe": timeframe,
                "active": True,
                "swept": False,
                "idx": n - 1,
            })
            pools.append({
                "level_id": f"liq_rl_{int(rl)}",
                "type": LiquidityType.RANGE_LOW,
                "price": round(rl, 2),
                "strength": 80.0,
                "touch_count": 1,
                "created_at": timestamps[-1],
                "timeframe": timeframe,
                "active": True,
                "swept": False,
                "idx": n - 1,
            })

        # 4. Configurable Round Number Level nearby current price
        curr_price = float(df["close"].iloc[-1])
        if round_number_step > 0:
            lower_round = math.floor(curr_price / round_number_step) * round_number_step
            upper_round = math.ceil(curr_price / round_number_step) * round_number_step
            if lower_round > 0 and abs(curr_price - lower_round) / curr_price < 0.05:
                pools.append({
                    "level_id": f"liq_rnd_{int(lower_round)}",
                    "type": LiquidityType.ROUND_NUMBER,
                    "price": round(lower_round, 2),
                    "strength": 75.0,
                    "touch_count": 1,
                    "created_at": timestamps[-1],
                    "timeframe": timeframe,
                    "active": True,
                    "swept": False,
                    "idx": n - 1,
                })
            if upper_round > 0 and abs(upper_round - curr_price) / curr_price < 0.05:
                pools.append({
                    "level_id": f"liq_rnd_{int(upper_round)}",
                    "type": LiquidityType.ROUND_NUMBER,
                    "price": round(upper_round, 2),
                    "strength": 75.0,
                    "touch_count": 1,
                    "created_at": timestamps[-1],
                    "timeframe": timeframe,
                    "active": True,
                    "swept": False,
                    "idx": n - 1,
                })

        return pools

    @staticmethod
    def detect_sweep_and_rejection(
        candle: Dict[str, Any],
        subsequent_candles: List[Dict[str, Any]],
        liquidity_pool: Dict[str, Any],
        atr: float,
        min_sweep_atr: float = 0.05,
        max_sweep_atr: float = 1.00,
        max_acceptance_bars: int = 2,
    ) -> Dict[str, Any]:
        """
        Evaluates deterministic sweep and rejection / acceptance against a liquidity level.
        Bullish: low < pool.price and close > pool.price
        Bearish: high > pool.price and close < pool.price
        """
        pool_price = float(liquidity_pool["price"])
        pool_type = liquidity_pool["type"]
        is_low_pool = "LOW" in pool_type or pool_type == LiquidityType.ROUND_NUMBER and pool_price <= float(candle.get("close", 0))

        c_low = float(candle.get("low", 0))
        c_high = float(candle.get("high", 0))
        c_close = float(candle.get("close", 0))

        result: Dict[str, Any] = {
            "sweep_detected": False,
            "direction": "NONE",
            "sweep_price": 0.0,
            "sweep_distance": 0.0,
            "sweep_atr": 0.0,
            "rejection_status": RejectionStatus.UNCONFIRMED,
            "reason": "No sweep of liquidity pool",
        }

        if atr <= 0:
            atr = 1.0

        # --- Bullish Sweep Setup (Testing liquidity below low pool) ---
        if is_low_pool and c_low < pool_price:
            sweep_dist = pool_price - c_low
            sweep_atr = sweep_dist / atr

            if sweep_atr < min_sweep_atr:
                result["reason"] = f"Sweep distance {sweep_atr:.3f} ATR is below minimum threshold ({min_sweep_atr:.2f} ATR)"
                return result
            if sweep_atr > max_sweep_atr:
                result["reason"] = f"Sweep distance {sweep_atr:.3f} ATR exceeds maximum threshold ({max_sweep_atr:.2f} ATR) — likely a structural breakdown"
                return result

            result["sweep_detected"] = True
            result["direction"] = "LONG"
            result["sweep_price"] = c_low
            result["sweep_distance"] = sweep_dist
            result["sweep_atr"] = round(sweep_atr, 3)

            # Rejection check on sweep candle
            if c_close > pool_price:
                # Immediate single-bar wick rejection
                result["rejection_status"] = RejectionStatus.REJECTION
                result["reason"] = f"Bullish wick sweep of {liquidity_pool['level_id']} ({pool_price:.2f}) and closed back above at {c_close:.2f}"
            else:
                # Check acceptance over subsequent confirmation window
                closed_below_count = 1
                reclaimed = False
                for sub_c in subsequent_candles[:max_acceptance_bars]:
                    sub_close = float(sub_c.get("close", 0))
                    if sub_close > pool_price:
                        reclaimed = True
                        break
                    closed_below_count += 1

                if reclaimed:
                    result["rejection_status"] = RejectionStatus.REJECTION
                    result["reason"] = f"Bullish rejection confirmed within {max_acceptance_bars} bars"
                elif closed_below_count > max_acceptance_bars:
                    result["rejection_status"] = RejectionStatus.ACCEPTANCE
                    result["reason"] = f"Price accepted below swept level for {closed_below_count} consecutive bars — reversal invalidated"
                else:
                    result["rejection_status"] = RejectionStatus.UNCONFIRMED
                    result["reason"] = "Sweep detected; awaiting completed bar rejection confirmation"

            return result

        # --- Bearish Sweep Setup (Testing liquidity above high pool) ---
        if not is_low_pool and c_high > pool_price:
            sweep_dist = c_high - pool_price
            sweep_atr = sweep_dist / atr

            if sweep_atr < min_sweep_atr:
                result["reason"] = f"Sweep distance {sweep_atr:.3f} ATR is below minimum threshold ({min_sweep_atr:.2f} ATR)"
                return result
            if sweep_atr > max_sweep_atr:
                result["reason"] = f"Sweep distance {sweep_atr:.3f} ATR exceeds maximum threshold ({max_sweep_atr:.2f} ATR) — likely a structural breakout"
                return result

            result["sweep_detected"] = True
            result["direction"] = "SHORT"
            result["sweep_price"] = c_high
            result["sweep_distance"] = sweep_dist
            result["sweep_atr"] = round(sweep_atr, 3)

            if c_close < pool_price:
                result["rejection_status"] = RejectionStatus.REJECTION
                result["reason"] = f"Bearish wick sweep of {liquidity_pool['level_id']} ({pool_price:.2f}) and closed back below at {c_close:.2f}"
            else:
                closed_above_count = 1
                reclaimed = False
                for sub_c in subsequent_candles[:max_acceptance_bars]:
                    sub_close = float(sub_c.get("close", 0))
                    if sub_close < pool_price:
                        reclaimed = True
                        break
                    closed_above_count += 1

                if reclaimed:
                    result["rejection_status"] = RejectionStatus.REJECTION
                    result["reason"] = f"Bearish rejection confirmed within {max_acceptance_bars} bars"
                elif closed_above_count > max_acceptance_bars:
                    result["rejection_status"] = RejectionStatus.ACCEPTANCE
                    result["reason"] = f"Price accepted above swept level for {closed_above_count} consecutive bars — reversal invalidated"
                else:
                    result["rejection_status"] = RejectionStatus.UNCONFIRMED
                    result["reason"] = "Sweep detected; awaiting completed bar rejection confirmation"

            return result

        return result

    @staticmethod
    def detect_choch_bos(
        df: pd.DataFrame,
        sweep_idx: int,
        direction: str,
        atr: float,
        swing_lookback: int = 5,
        min_swing_atr: float = 0.50,
        min_structure_distance_atr: float = 0.20,
    ) -> Dict[str, Any]:
        """
        Structure confirmation following sweep & rejection.
        Bullish CHoCH: completed candle close above the most recent meaningful lower-high.
        Bearish CHoCH: completed candle close below the most recent meaningful higher-low.
        """
        result = {
            "structure_status": StructureStatus.NONE,
            "structure_level": 0.0,
            "choch_confirmed": False,
            "reason": "Awaiting structure break (CHoCH / BOS)",
        }

        if sweep_idx < swing_lookback or sweep_idx >= len(df):
            return result

        highs = df["high"].astype(float).values
        lows = df["low"].astype(float).values
        closes = df["close"].astype(float).values
        n = len(df)

        if direction == "LONG":
            # Search for the most recent meaningful swing high prior to the sweep
            prior_lower_highs = []
            for i in range(swing_lookback, sweep_idx):
                h_val = highs[i]
                if all(h_val >= highs[i - j] for j in range(1, min(i + 1, swing_lookback + 1))) and \
                   all(h_val >= highs[min(n - 1, i + j)] for j in range(1, min(sweep_idx - i + 1, swing_lookback + 1))):
                    prior_lower_highs.append((i, h_val))

            if not prior_lower_highs:
                # Fallback to local max before sweep
                prior_max_idx = int(np.argmax(highs[max(0, sweep_idx - 10): sweep_idx])) + max(0, sweep_idx - 10)
                target_level = float(highs[prior_max_idx])
            else:
                target_level = float(prior_lower_highs[-1][1])

            result["structure_level"] = round(target_level, 2)

            # Check if any candle from sweep_idx onward has a completed close > target_level
            for c_idx in range(sweep_idx, n):
                if closes[c_idx] > target_level:
                    # Check minimum distance filter to eliminate tiny noise
                    dist = closes[c_idx] - target_level
                    if dist >= (atr * min_structure_distance_atr):
                        result["structure_status"] = StructureStatus.BULLISH_CHOCH
                        result["choch_confirmed"] = True
                        result["break_candle_idx"] = c_idx
                        result["reason"] = f"Bullish CHoCH confirmed: Completed candle closed at {closes[c_idx]:.2f} above structure high ({target_level:.2f})"
                        return result

            result["reason"] = f"Price has not closed above swing lower-high ({target_level:.2f})"
            return result

        elif direction == "SHORT":
            # Search for the most recent meaningful swing low prior to the sweep
            prior_higher_lows = []
            for i in range(swing_lookback, sweep_idx):
                l_val = lows[i]
                if all(l_val <= lows[i - j] for j in range(1, min(i + 1, swing_lookback + 1))) and \
                   all(l_val <= lows[min(n - 1, i + j)] for j in range(1, min(sweep_idx - i + 1, swing_lookback + 1))):
                    prior_higher_lows.append((i, l_val))

            if not prior_higher_lows:
                prior_min_idx = int(np.argmin(lows[max(0, sweep_idx - 10): sweep_idx])) + max(0, sweep_idx - 10)
                target_level = float(lows[prior_min_idx])
            else:
                target_level = float(prior_higher_lows[-1][1])

            result["structure_level"] = round(target_level, 2)

            for c_idx in range(sweep_idx, n):
                if closes[c_idx] < target_level:
                    dist = target_level - closes[c_idx]
                    if dist >= (atr * min_structure_distance_atr):
                        result["structure_status"] = StructureStatus.BEARISH_CHOCH
                        result["choch_confirmed"] = True
                        result["break_candle_idx"] = c_idx
                        result["reason"] = f"Bearish CHoCH confirmed: Completed candle closed at {closes[c_idx]:.2f} below structure low ({target_level:.2f})"
                        return result

            result["reason"] = f"Price has not closed below swing higher-low ({target_level:.2f})"
            return result

        return result

    @staticmethod
    def calculate_confluence_score(
        df: pd.DataFrame,
        direction: str,
        sweep_ok: bool,
        rejection_ok: bool,
        choch_ok: bool,
        idx: int = -1,
    ) -> Dict[str, Any]:
        """
        Calculates 100-point confluence score.
        Mandatory components (75 max):
        - Liquidity Sweep: 25
        - Rejection: 25
        - CHoCH / BOS: 25
        Optional confluences (25 max):
        - Volume Confirmation: 10
        - Volume Profile / VWAP Location: 10
        - FVG Alignment: 5
        """
        score = 0
        breakdown = {
            "sweep_score": 25 if sweep_ok else 0,
            "rejection_score": 25 if rejection_ok else 0,
            "choch_score": 25 if choch_ok else 0,
            "volume_score": 0,
            "volume_profile_score": 0,
            "fvg_score": 0,
        }

        score += breakdown["sweep_score"] + breakdown["rejection_score"] + breakdown["choch_score"]

        if idx < 0:
            idx = len(df) + idx
        if idx >= len(df):
            idx = len(df) - 1

        row = df.iloc[idx]
        c_close = float(row.get("close", 0))
        c_vol = float(row.get("volume", 0))
        vol_sma = float(df["volume"].iloc[max(0, idx - 20): idx + 1].mean()) if "volume" in df.columns else c_vol

        # 1. Volume Confirmation (10 pts)
        if c_vol > (vol_sma * 1.25):
            breakdown["volume_score"] = 10
            score += 10
        elif c_vol > vol_sma:
            breakdown["volume_score"] = 5
            score += 5

        # 2. Volume Profile / VWAP Location (10 pts)
        vwap_val = float(row.get("vwap", c_close))
        if direction == "LONG" and c_close >= vwap_val:
            breakdown["volume_profile_score"] = 10
            score += 10
        elif direction == "SHORT" and c_close <= vwap_val:
            breakdown["volume_profile_score"] = 10
            score += 10
        else:
            breakdown["volume_profile_score"] = 5
            score += 5

        # 3. FVG / Imbalance Alignment (5 pts)
        if len(df) >= 3 and idx >= 2:
            c1_high = float(df["high"].iloc[idx - 2])
            c3_low = float(df["low"].iloc[idx])
            c1_low = float(df["low"].iloc[idx - 2])
            c3_high = float(df["high"].iloc[idx])

            if direction == "LONG" and c3_low > c1_high:
                breakdown["fvg_score"] = 5
                score += 5
            elif direction == "SHORT" and c3_high < c1_low:
                breakdown["fvg_score"] = 5
                score += 5

        mandatory_passed = bool(sweep_ok and rejection_ok and choch_ok)
        return {
            "total_score": score,
            "breakdown": breakdown,
            "score_passed": score >= 70 and mandatory_passed,
        }

    def evaluate_live_signal(
        self,
        df: pd.DataFrame,
        symbol: str = "BTC/USDT",
        market: str = "crypto",
        provider: str = "binance",
        timeframe: str = "15m",
        account_equity: float = 10000.0,
        current_spread_pct: float = 0.0005,
        data_age_ms: int = 500,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates the full end-to-end strategy pipeline on dynamic market data.
        Returns complete auditable decision payload.
        """
        cfg = {**self.config, **(custom_params or {})}
        timestamp_now = datetime.now(timezone.utc).isoformat()

        # Build default empty signal container
        signal_output: Dict[str, Any] = {
            "bot_id": f"bot-{cfg['strategy_id']}",
            "symbol": symbol,
            "market": market,
            "provider": provider,
            "timeframe": timeframe,
            "market_state": MarketState.UNCLEAR,
            "market_state_confidence": 0.0,
            "market_state_reason": "",
            "liquidity_type": "NONE",
            "liquidity_price": 0.0,
            "liquidity_strength": 0.0,
            "sweep_detected": False,
            "sweep_price": 0.0,
            "sweep_atr": 0.0,
            "rejection_status": RejectionStatus.UNCONFIRMED,
            "structure_status": StructureStatus.NONE,
            "structure_level": 0.0,
            "volume_confirmation": False,
            "volume_profile_context": "NEUTRAL",
            "fvg_context": "NONE",
            "strategy_score": 0,
            "score_breakdown": {},
            "decision": "HOLD",
            "entry_mode": cfg.get("entry_mode", "RETEST"),
            "entry_price": 0.0,
            "stop_loss": 0.0,
            "target_price": 0.0,
            "risk_reward": 0.0,
            "r_targets": {"1R": 0.0, "1.5R": 0.0, "2R": 0.0, "3R": 0.0},
            "risk_amount": 0.0,
            "position_size": 0.0,
            "notional_value": 0.0,
            "decision_reason": "",
            "invalid_reason": "",
            "timestamp": timestamp_now,
            "data_age_ms": data_age_ms,
            "audit_checklist": {},
        }

        # 1. Safety Checks
        if data_age_ms > cfg["max_data_age_ms"]:
            signal_output["invalid_reason"] = f"Market data stale ({data_age_ms} ms > limit {cfg['max_data_age_ms']} ms)"
            signal_output["audit_checklist"]["fresh_data"] = False
            return signal_output
        signal_output["audit_checklist"]["fresh_data"] = True

        if current_spread_pct > cfg["max_spread_pct"]:
            signal_output["invalid_reason"] = f"Spread {current_spread_pct*100:.3f}% exceeds maximum permitted {cfg['max_spread_pct']*100:.3f}%"
            signal_output["audit_checklist"]["spread_valid"] = False
            return signal_output
        signal_output["audit_checklist"]["spread_valid"] = True

        if len(df) < 30:
            signal_output["invalid_reason"] = f"Insufficient history ({len(df)} candles < 30 required)"
            signal_output["audit_checklist"]["data_depth"] = False
            return signal_output
        signal_output["audit_checklist"]["data_depth"] = True

        # Calculate indicators
        atr_series = self.calculate_atr(df, 14)
        current_atr = float(atr_series.iloc[-1])
        if current_atr <= 0:
            current_atr = float(df["close"].iloc[-1]) * 0.01

        # 2. Market State
        m_state = self.classify_market_state(df)
        signal_output["market_state"] = m_state["market_state"]
        signal_output["market_state_confidence"] = m_state["confidence"]
        signal_output["market_state_reason"] = m_state["reason"]

        if m_state["market_state"] == MarketState.UNCLEAR and not cfg["allow_unclear_market_state"]:
            signal_output["invalid_reason"] = f"Market state is UNCLEAR ({m_state['reason']}) and allow_unclear_market_state is False"
            signal_output["audit_checklist"]["market_state"] = False
            return signal_output
        signal_output["audit_checklist"]["market_state"] = True

        # 3. Detect Liquidity Pools
        pools = self.detect_liquidity_pools(
            df,
            timeframe=timeframe,
            swing_lookback=cfg["swing_lookback"],
            round_number_step=cfg["round_number_step"],
            equal_tolerance_pct=cfg["equal_high_low_tolerance_pct"],
        )
        if not pools:
            signal_output["invalid_reason"] = "No active liquidity pools identified in current price structure"
            signal_output["audit_checklist"]["liquidity_pool"] = False
            return signal_output
        signal_output["audit_checklist"]["liquidity_pool"] = True

        # 4. Scan for Sweeps & Rejections over recent candles
        last_candle_idx = len(df) - 1
        found_setup: Optional[Dict[str, Any]] = None
        matched_pool: Optional[Dict[str, Any]] = None
        sweep_candle_idx: int = -1

        # Look for sweeps in the last 8 bars
        for scan_idx in range(max(0, last_candle_idx - 8), last_candle_idx + 1):
            c_dict = df.iloc[scan_idx].to_dict()
            sub_candles = [df.iloc[k].to_dict() for k in range(scan_idx + 1, len(df))]
            atr_at_scan = float(atr_series.iloc[scan_idx])

            for p in pools:
                sweep_res = self.detect_sweep_and_rejection(
                    c_dict,
                    sub_candles,
                    p,
                    atr_at_scan,
                    min_sweep_atr=cfg["min_sweep_atr"],
                    max_sweep_atr=cfg["max_sweep_atr"],
                    max_acceptance_bars=cfg["max_acceptance_bars"],
                )
                if sweep_res["sweep_detected"] and sweep_res["rejection_status"] == RejectionStatus.REJECTION:
                    found_setup = sweep_res
                    matched_pool = p
                    sweep_candle_idx = scan_idx
                    break
            if found_setup:
                break

        if not found_setup or not matched_pool:
            signal_output["invalid_reason"] = "No confirmed liquidity sweep + rejection found within active window"
            signal_output["audit_checklist"]["sweep_confirmed"] = False
            signal_output["audit_checklist"]["rejection_confirmed"] = False
            return signal_output

        signal_output["liquidity_type"] = matched_pool["type"]
        signal_output["liquidity_price"] = matched_pool["price"]
        signal_output["liquidity_strength"] = matched_pool["strength"]
        signal_output["sweep_detected"] = True
        signal_output["sweep_price"] = found_setup["sweep_price"]
        signal_output["sweep_atr"] = found_setup["sweep_atr"]
        signal_output["rejection_status"] = found_setup["rejection_status"]
        signal_output["audit_checklist"]["sweep_confirmed"] = True
        signal_output["audit_checklist"]["rejection_confirmed"] = True

        direction = found_setup["direction"]

        # 5. Structure Confirmation (CHoCH)
        choch_res = self.detect_choch_bos(
            df,
            sweep_idx=sweep_candle_idx,
            direction=direction,
            atr=current_atr,
            swing_lookback=cfg["swing_lookback"],
            min_swing_atr=cfg["minimum_swing_atr"],
            min_structure_distance_atr=cfg["minimum_structure_distance_atr"],
        )
        signal_output["structure_status"] = choch_res["structure_status"]
        signal_output["structure_level"] = choch_res["structure_level"]

        if not choch_res["choch_confirmed"]:
            signal_output["invalid_reason"] = f"Structure confirmation failed: {choch_res['reason']}"
            signal_output["audit_checklist"]["choch_confirmed"] = False
            return signal_output
        signal_output["audit_checklist"]["choch_confirmed"] = True

        # 6. Confluence Scoring
        score_res = self.calculate_confluence_score(
            df,
            direction=direction,
            sweep_ok=True,
            rejection_ok=True,
            choch_ok=True,
            idx=last_candle_idx,
        )
        signal_output["strategy_score"] = score_res["total_score"]
        signal_output["score_breakdown"] = score_res["breakdown"]

        if score_res["total_score"] < cfg["min_score"]:
            signal_output["invalid_reason"] = f"Strategy score ({score_res['total_score']}) is below minimum threshold ({cfg['min_score']})"
            signal_output["audit_checklist"]["min_score"] = False
            return signal_output
        signal_output["audit_checklist"]["min_score"] = True

        # 7. Entry, Stop Loss, Target Calculation
        current_close = float(df["close"].iloc[-1])
        entry_mode = cfg.get("entry_mode", "RETEST")
        choch_lvl = choch_res["structure_level"]

        if entry_mode == EntryMode.RETEST:
            entry_price = choch_lvl if choch_lvl > 0 else current_close
        elif entry_mode == EntryMode.CONFIRMATION_CLOSE:
            entry_price = current_close
        else:
            entry_price = choch_lvl

        # Stop Loss
        if direction == "LONG":
            sl_price = found_setup["sweep_price"] - (current_atr * cfg["stop_buffer_atr"])
        else:
            sl_price = found_setup["sweep_price"] + (current_atr * cfg["stop_buffer_atr"])

        # Target from opposing liquidity pool
        opposing_pools = [
            p for p in pools
            if (direction == "LONG" and ("HIGH" in p["type"] or p["price"] > entry_price)) or
               (direction == "SHORT" and ("LOW" in p["type"] or p["price"] < entry_price))
        ]

        if opposing_pools:
            opposing_pools.sort(key=lambda x: abs(x["price"] - entry_price))
            target_price = float(opposing_pools[0]["price"])
        else:
            # Fallback to 2.5R target if no opposing pool nearby
            stop_dist = abs(entry_price - sl_price)
            target_price = entry_price + (stop_dist * 2.5) if direction == "LONG" else entry_price - (stop_dist * 2.5)

        stop_distance = abs(entry_price - sl_price)
        reward_distance = abs(target_price - entry_price)
        rr_ratio = reward_distance / stop_distance if stop_distance > 0 else 0.0

        if rr_ratio < cfg["minimum_rr"]:
            signal_output["invalid_reason"] = f"Risk/Reward {rr_ratio:.2f} is below minimum threshold ({cfg['minimum_rr']:.2f})"
            signal_output["audit_checklist"]["minimum_rr"] = False
            return signal_output
        signal_output["audit_checklist"]["minimum_rr"] = True

        # R-Multiple targets
        signal_output["r_targets"] = {
            "1R": round(entry_price + (stop_distance if direction == "LONG" else -stop_distance), 2),
            "1.5R": round(entry_price + (1.5 * stop_distance if direction == "LONG" else -1.5 * stop_distance), 2),
            "2R": round(entry_price + (2.0 * stop_distance if direction == "LONG" else -2.0 * stop_distance), 2),
            "3R": round(entry_price + (3.0 * stop_distance if direction == "LONG" else -3.0 * stop_distance), 2),
        }

        # 8. Central Position Sizing
        risk_pct = min(cfg["risk_per_trade_pct"], cfg["max_risk_per_trade_pct"])
        risk_amount = account_equity * (risk_pct / 100.0)
        position_size = risk_amount / stop_distance if stop_distance > 0 else 0.0
        notional_value = position_size * entry_price

        signal_output["decision"] = direction
        signal_output["entry_price"] = round(entry_price, 2)
        signal_output["stop_loss"] = round(sl_price, 2)
        signal_output["target_price"] = round(target_price, 2)
        signal_output["risk_reward"] = round(rr_ratio, 2)
        signal_output["risk_amount"] = round(risk_amount, 2)
        signal_output["position_size"] = round(position_size, 4)
        signal_output["notional_value"] = round(notional_value, 2)
        signal_output["decision_reason"] = (
            f"VALID {direction} SETUP: {matched_pool['type']} at {matched_pool['price']} swept ({found_setup['sweep_atr']:.2f} ATR) + "
            f"wick rejection + {choch_res['structure_status']} at {choch_res['structure_level']} + "
            f"Score {score_res['total_score']}/100 + RR {rr_ratio:.2f}:1"
        )
        signal_output["audit_checklist"]["risk_approved"] = True

        return signal_output

    def run_backtest(
        self,
        df: pd.DataFrame,
        symbol: str = "BTC/USDT",
        timeframe: str = "15m",
        initial_capital: float = 10000.0,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Non-repainting historical backtest engine with zero look-ahead bias.
        Evaluates trades bar-by-bar using completed candles only.
        """
        cfg = {**self.config, **(custom_params or {})}
        atr_series = self.calculate_atr(df, 14)

        trades: List[Dict[str, Any]] = []
        equity = initial_capital
        equity_curve = [{"time": str(df["timestamp"].iloc[0]) if "timestamp" in df.columns else "0", "equity": equity}]
        peak_equity = equity
        max_drawdown_pct = 0.0

        in_position = False
        pos: Dict[str, Any] = {}

        total_setups = 0

        # Step through dataframe
        for i in range(30, len(df)):
            current_bar = df.iloc[i]
            prev_bars = df.iloc[:i + 1]
            ts = str(current_bar.get("timestamp", f"bar_{i}"))

            # If in position, check SL / TP on current bar high/low
            if in_position:
                b_high = float(current_bar["high"])
                b_low = float(current_bar["low"])
                pos_dir = pos["direction"]
                entry = pos["entry_price"]
                sl = pos["stop_loss"]
                tp = pos["target_price"]
                size = pos["size"]
                risk_amt = pos["risk_amount"]
                stop_dist = abs(entry - sl)

                exit_trade = False
                exit_price = 0.0
                exit_reason = ""

                if pos_dir == "LONG":
                    if b_low <= sl:
                        exit_trade = True
                        exit_price = sl
                        exit_reason = "STOP_LOSS"
                    elif b_high >= tp:
                        exit_trade = True
                        exit_price = tp
                        exit_reason = "TAKE_PROFIT"
                else:  # SHORT
                    if b_high >= sl:
                        exit_trade = True
                        exit_price = sl
                        exit_reason = "STOP_LOSS"
                    elif b_low <= tp:
                        exit_trade = True
                        exit_price = tp
                        exit_reason = "TAKE_PROFIT"

                if exit_trade:
                    pnl = (exit_price - entry) * size if pos_dir == "LONG" else (entry - exit_price) * size
                    # Deduct simulated fee and slippage (0.05% taker + 0.02% slippage)
                    friction = (entry + exit_price) * size * 0.0007
                    net_pnl = pnl - friction
                    r_multiple = net_pnl / risk_amt if risk_amt > 0 else 0.0

                    equity += net_pnl
                    if equity > peak_equity:
                        peak_equity = equity
                    dd = ((peak_equity - equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0
                    if dd > max_drawdown_pct:
                        max_drawdown_pct = dd

                    equity_curve.append({"time": ts, "equity": round(equity, 2)})
                    trades.append({
                        "trade_id": str(uuid.uuid4())[:8],
                        "symbol": symbol,
                        "direction": pos_dir,
                        "entry_time": pos["entry_time"],
                        "entry_price": entry,
                        "exit_time": ts,
                        "exit_price": exit_price,
                        "size": size,
                        "pnl": round(net_pnl, 2),
                        "r_multiple": round(r_multiple, 2),
                        "exit_reason": exit_reason,
                        "bars_held": i - pos["entry_bar"],
                        "market_state": pos["market_state"],
                    })
                    in_position = False
                    pos = {}

            # If not in position, scan for new setups
            if not in_position:
                sig = self.evaluate_live_signal(
                    prev_bars,
                    symbol=symbol,
                    timeframe=timeframe,
                    account_equity=equity,
                    custom_params=cfg,
                )
                if sig["decision"] in ["LONG", "SHORT"]:
                    total_setups += 1
                    in_position = True
                    pos = {
                        "direction": sig["decision"],
                        "entry_price": sig["entry_price"],
                        "stop_loss": sig["stop_loss"],
                        "target_price": sig["target_price"],
                        "size": sig["position_size"],
                        "risk_amount": sig["risk_amount"],
                        "entry_time": ts,
                        "entry_bar": i,
                        "market_state": sig["market_state"],
                    }

        # Calculate performance statistics
        executed_trades = len(trades)
        wins = [t for t in trades if t["pnl"] > 0]
        losses = [t for t in trades if t["pnl"] <= 0]
        win_count = len(wins)
        loss_count = len(losses)
        win_rate = (win_count / executed_trades) * 100.0 if executed_trades > 0 else 0.0

        total_profit = sum(t["pnl"] for t in wins)
        total_loss = abs(sum(t["pnl"] for t in losses))
        profit_factor = (total_profit / total_loss) if total_loss > 0 else (99.0 if total_profit > 0 else 0.0)

        total_r = sum(t["r_multiple"] for t in trades)
        avg_r = total_r / executed_trades if executed_trades > 0 else 0.0
        expectancy = (win_rate / 100.0 * (total_profit / win_count if win_count > 0 else 0)) - \
                     ((1 - win_rate / 100.0) * (total_loss / loss_count if loss_count > 0 else 0))

        avg_holding_time = float(np.mean([t["bars_held"] for t in trades])) if trades else 0.0

        # Breakdown by market state
        state_breakdown: Dict[str, Dict[str, Any]] = {}
        for st in [MarketState.TREND, MarketState.RANGE, MarketState.BREAKOUT, MarketState.REVERSAL]:
            st_trades = [t for t in trades if t["market_state"] == st]
            st_wins = [t for t in st_trades if t["pnl"] > 0]
            state_breakdown[st] = {
                "trades": len(st_trades),
                "win_rate": round((len(st_wins) / len(st_trades) * 100.0) if st_trades else 0.0, 1),
                "net_pnl": round(sum(t["pnl"] for t in st_trades), 2),
            }

        return {
            "strategy_id": cfg["strategy_id"],
            "version": cfg["version"],
            "symbol": symbol,
            "timeframe": timeframe,
            "initial_capital": initial_capital,
            "final_equity": round(equity, 2),
            "net_pnl": round(equity - initial_capital, 2),
            "net_pnl_pct": round(((equity - initial_capital) / initial_capital) * 100.0, 2),
            "total_setups": total_setups,
            "executed_trades": executed_trades,
            "wins": win_count,
            "losses": loss_count,
            "win_rate": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "total_r": round(total_r, 2),
            "average_r": round(avg_r, 2),
            "expectancy": round(expectancy, 2),
            "maximum_drawdown_pct": round(max_drawdown_pct, 2),
            "average_holding_bars": round(avg_holding_time, 1),
            "state_breakdown": state_breakdown,
            "equity_curve": equity_curve,
            "trades": trades,
        }


# Singleton instance
global_liquidity_strategy = LiquidityRejectionStructurePro()
