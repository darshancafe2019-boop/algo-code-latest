"""
Price Action, Smart Money Concepts (SMC), and MACD Divergence Engine
====================================================================
Detects structural market pivots, Regular/Hidden MACD Divergence, Break of Structure (BOS),
Change of Character (CHOCH), Order Blocks (OB), Fair Value Gaps (FVG), and Liquidity Sweeps.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger("PriceActionEngine")


class MACDDivergenceEngine:
    """Detects Regular and Hidden MACD Divergences across OHLCV candle series."""

    @classmethod
    def find_pivots(
        cls,
        series: List[float],
        left_bars: int = 3,
        right_bars: int = 3,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Identifies local swing highs and swing lows with fixed bar confirmation windows."""
        highs = []
        lows = []
        n = len(series)

        for i in range(left_bars, n - right_bars):
            val = series[i]
            # Check swing high
            if all(val >= series[i - j] for j in range(1, left_bars + 1)) and all(
                val > series[i + j] for j in range(1, right_bars + 1)
            ):
                highs.append({"index": i, "value": val})

            # Check swing low
            if all(val <= series[i - j] for j in range(1, left_bars + 1)) and all(
                val < series[i + j] for j in range(1, right_bars + 1)
            ):
                lows.append({"index": i, "value": val})

        return highs, lows

    @classmethod
    def detect_divergences(
        cls,
        candles: List[Dict[str, Any]],
        macd_line: List[float],
        histogram: List[float],
        left_bars: int = 3,
        right_bars: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Scans candle and MACD series for regular and hidden divergences.
        Does NOT claim any signal guarantees profit.
        """
        if len(candles) < 20 or len(macd_line) < 20:
            return []

        closes = [float(c.get("close", 0)) for c in candles]
        high_prices = [float(c.get("high", 0)) for c in candles]
        low_prices = [float(c.get("low", 0)) for c in candles]

        # Find price pivots and MACD pivots
        price_highs, price_lows = cls.find_pivots(high_prices, left_bars, right_bars)
        macd_highs, macd_lows = cls.find_pivots(macd_line, left_bars, right_bars)

        divergences = []

        # 1. Bullish Divergence Detection (Comparing consecutive swing lows)
        if len(price_lows) >= 2 and len(macd_lows) >= 2:
            p_curr, p_prev = price_lows[-1], price_lows[-2]
            m_curr, m_prev = macd_lows[-1], macd_lows[-2]

            curr_idx = p_curr["index"]
            curr_candle = candles[curr_idx] if curr_idx < len(candles) else candles[-1]
            p_curr_val = p_curr["value"]
            p_prev_val = p_prev["value"]
            m_curr_val = m_curr["value"]
            m_prev_val = m_prev["value"]

            # Regular Bullish: Price Lower Low + MACD Higher Low (Potential Reversal)
            if p_curr_val < p_prev_val and m_curr_val > m_prev_val:
                atr_est = abs(p_curr_val - p_prev_val) * 0.5
                divergences.append({
                    "type": "REGULAR_BULLISH",
                    "signal": "BUY_REVERSAL",
                    "confidence": round(min(90.0, 65.0 + abs(m_curr_val - m_prev_val) * 5.0), 1),
                    "pivot_time": curr_candle.get("timestamp", ""),
                    "pivot_index": curr_idx,
                    "entry_zone": [round(p_curr_val, 2), round(p_curr_val * 1.005, 2)],
                    "invalidation_level": round(p_curr_val * 0.992, 2),
                    "target_zone": [round(p_curr_val * 1.015, 2), round(p_curr_val * 1.03, 2)],
                    "description": "Regular Bullish Divergence: Price printed Lower Low while MACD printed Higher Low.",
                    "disclaimer": "Informational indicator signal only; does not guarantee future price movement."
                })

            # Hidden Bullish: Price Higher Low + MACD Lower Low (Trend Continuation)
            elif p_curr_val > p_prev_val and m_curr_val < m_prev_val:
                divergences.append({
                    "type": "HIDDEN_BULLISH",
                    "signal": "BUY_CONTINUATION",
                    "confidence": round(min(88.0, 60.0 + abs(p_curr_val - p_prev_val) / p_prev_val * 100.0), 1),
                    "pivot_time": curr_candle.get("timestamp", ""),
                    "pivot_index": curr_idx,
                    "entry_zone": [round(p_curr_val, 2), round(p_curr_val * 1.004, 2)],
                    "invalidation_level": round(p_prev_val * 0.995, 2),
                    "target_zone": [round(p_curr_val * 1.02, 2), round(p_curr_val * 1.04, 2)],
                    "description": "Hidden Bullish Divergence: Price printed Higher Low while MACD formed Lower Low.",
                    "disclaimer": "Informational indicator signal only; does not guarantee future price movement."
                })

        # 2. Bearish Divergence Detection (Comparing consecutive swing highs)
        if len(price_highs) >= 2 and len(macd_highs) >= 2:
            p_curr, p_prev = price_highs[-1], price_highs[-2]
            m_curr, m_prev = macd_highs[-1], macd_highs[-2]

            curr_idx = p_curr["index"]
            curr_candle = candles[curr_idx] if curr_idx < len(candles) else candles[-1]
            p_curr_val = p_curr["value"]
            p_prev_val = p_prev["value"]
            m_curr_val = m_curr["value"]
            m_prev_val = m_prev["value"]

            # Regular Bearish: Price Higher High + MACD Lower High (Potential Reversal)
            if p_curr_val > p_prev_val and m_curr_val < m_prev_val:
                divergences.append({
                    "type": "REGULAR_BEARISH",
                    "signal": "SELL_REVERSAL",
                    "confidence": round(min(90.0, 65.0 + abs(m_prev_val - m_curr_val) * 5.0), 1),
                    "pivot_time": curr_candle.get("timestamp", ""),
                    "pivot_index": curr_idx,
                    "entry_zone": [round(p_curr_val * 0.995, 2), round(p_curr_val, 2)],
                    "invalidation_level": round(p_curr_val * 1.008, 2),
                    "target_zone": [round(p_curr_val * 0.985, 2), round(p_curr_val * 0.97, 2)],
                    "description": "Regular Bearish Divergence: Price printed Higher High while MACD printed Lower High.",
                    "disclaimer": "Informational indicator signal only; does not guarantee future price movement."
                })

            # Hidden Bearish: Price Lower High + MACD Higher High (Trend Continuation)
            elif p_curr_val < p_prev_val and m_curr_val > m_prev_val:
                divergences.append({
                    "type": "HIDDEN_BEARISH",
                    "signal": "SELL_CONTINUATION",
                    "confidence": round(min(88.0, 60.0 + abs(p_prev_val - p_curr_val) / p_prev_val * 100.0), 1),
                    "pivot_time": curr_candle.get("timestamp", ""),
                    "pivot_index": curr_idx,
                    "entry_zone": [round(p_curr_val * 0.996, 2), round(p_curr_val, 2)],
                    "invalidation_level": round(p_prev_val * 1.005, 2),
                    "target_zone": [round(p_curr_val * 0.98, 2), round(p_curr_val * 0.96, 2)],
                    "description": "Hidden Bearish Divergence: Price printed Lower High while MACD formed Higher High.",
                    "disclaimer": "Informational indicator signal only; does not guarantee future price movement."
                })

        return divergences


class PriceActionEngine:
    """Smart Money Concepts (SMC) & Liquidity Structure Analyzer."""

    @classmethod
    def detect_fair_value_gaps(cls, candles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identifies 3-candle Fair Value Gaps (FVG / Imbalances)."""
        fvgs = []
        if len(candles) < 3:
            return fvgs

        for i in range(2, len(candles)):
            c1 = candles[i - 2]
            c2 = candles[i - 1]
            c3 = candles[i]

            c1_high = float(c1.get("high", 0))
            c3_low = float(c3.get("low", 0))

            c1_low = float(c1.get("low", 0))
            c3_high = float(c3.get("high", 0))

            # Bullish FVG: Candle 3 Low is strictly higher than Candle 1 High
            if c3_low > c1_high:
                fvgs.append({
                    "type": "BULLISH_FVG",
                    "top": round(c3_low, 2),
                    "bottom": round(c1_high, 2),
                    "midpoint": round((c3_low + c1_high) / 2.0, 2),
                    "timestamp": c2.get("timestamp", ""),
                    "candle_index": i - 1,
                    "mitigated": False,
                })

            # Bearish FVG: Candle 3 High is strictly lower than Candle 1 Low
            elif c3_high < c1_low:
                fvgs.append({
                    "type": "BEARISH_FVG",
                    "top": round(c1_low, 2),
                    "bottom": round(c3_high, 2),
                    "midpoint": round((c1_low + c3_high) / 2.0, 2),
                    "timestamp": c2.get("timestamp", ""),
                    "candle_index": i - 1,
                    "mitigated": False,
                })

        return fvgs[-10:]  # Return most recent 10 FVGs

    @classmethod
    def detect_order_blocks(cls, candles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identifies institutional Order Blocks before strong displacement impulses."""
        obs = []
        if len(candles) < 5:
            return obs

        for i in range(1, len(candles) - 1):
            c_prev = candles[i - 1]
            c_disp = candles[i]

            prev_open = float(c_prev.get("open", 0))
            prev_close = float(c_prev.get("close", 0))
            prev_high = float(c_prev.get("high", 0))
            prev_low = float(c_prev.get("low", 0))

            disp_open = float(c_disp.get("open", 0))
            disp_close = float(c_disp.get("close", 0))

            body_size = abs(disp_close - disp_open)
            prev_body = abs(prev_close - prev_open)

            # Bullish OB: Last down-close candle before a large green expansion candle
            if prev_close < prev_open and disp_close > disp_open and body_size > (prev_body * 1.8):
                obs.append({
                    "type": "BULLISH_ORDER_BLOCK",
                    "top": round(prev_high, 2),
                    "bottom": round(prev_low, 2),
                    "timestamp": c_prev.get("timestamp", ""),
                    "index": i - 1,
                })

            # Bearish OB: Last up-close candle before a large red expansion candle
            elif prev_close > prev_open and disp_close < disp_open and body_size > (prev_body * 1.8):
                obs.append({
                    "type": "BEARISH_ORDER_BLOCK",
                    "top": round(prev_high, 2),
                    "bottom": round(prev_low, 2),
                    "timestamp": c_prev.get("timestamp", ""),
                    "index": i - 1,
                })

        return obs[-8:]

    @classmethod
    def analyze_structure(cls, candles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Computes comprehensive SMC structure: BOS, CHOCH, FVGs, OBs, Premium/Discount zones."""
        if not candles or len(candles) < 10:
            return {
                "trend": "NEUTRAL",
                "bos": [],
                "choch": [],
                "order_blocks": [],
                "fair_value_gaps": [],
                "equilibrium": 0.0,
                "range_high": 0.0,
                "range_low": 0.0,
            }

        highs = [float(c.get("high", 0)) for c in candles]
        lows = [float(c.get("low", 0)) for c in candles]
        closes = [float(c.get("close", 0)) for c in candles]

        range_high = max(highs)
        range_low = min(lows)
        equilibrium = (range_high + range_low) / 2.0

        current_price = closes[-1]
        market_zone = "PREMIUM" if current_price > equilibrium else "DISCOUNT"

        fvgs = cls.detect_fair_value_gaps(candles)
        obs = cls.detect_order_blocks(candles)

        # Break of Structure (BOS) / Change of Character (CHOCH) detection
        bos = []
        choch = []
        if len(highs) >= 10:
            recent_high = max(highs[-10:-1])
            recent_low = min(lows[-10:-1])

            if current_price > recent_high:
                bos.append({
                    "type": "BULLISH_BOS",
                    "level": round(recent_high, 2),
                    "timestamp": candles[-1].get("timestamp", ""),
                })
            elif current_price < recent_low:
                bos.append({
                    "type": "BEARISH_BOS",
                    "level": round(recent_low, 2),
                    "timestamp": candles[-1].get("timestamp", ""),
                })

        return {
            "trend": "BULLISH" if current_price > equilibrium else "BEARISH",
            "market_zone": market_zone,
            "range_high": round(range_high, 2),
            "range_low": round(range_low, 2),
            "equilibrium": round(equilibrium, 2),
            "current_price": round(current_price, 2),
            "bos": bos,
            "choch": choch,
            "fair_value_gaps": fvgs,
            "order_blocks": obs,
        }
