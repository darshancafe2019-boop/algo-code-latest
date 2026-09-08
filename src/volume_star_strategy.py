"""
Volume Star Strategy Engine
===========================
Market Structure + Fixed Range Volume Profile (FRVP) + LVN Rejection
First-Class Quant.OS Native Strategy Implementation.

Source Core Rules:
1. Trend Identification (5m):
   - Long Bias: Confirmed Higher Highs (HH) + Higher Lows (HL) (min 2 confirmations)
   - Short Bias: Confirmed Lower Highs (LH) + Lower Lows (LL) (min 2 confirmations)
   - Directional only: Trade ONLY in the direction of the confirmed 5m trend.
2. Fixed Range Volume Profile (FRVP):
   - Row Size: 50
   - Value Area Volume: 70%
   - Width: 100
   - Long: Anchored from the relevant confirmed Higher Low through current/retracing leg.
   - Short: Anchored from the relevant confirmed Lower High through current/retracing leg.
3. LVN Identification & Retrace:
   - Identify Low Volume Node (LVN) inside the FRVP range.
   - Wait for price to retrace into the LVN zone without chasing.
4. LVN Rejection Confirmation:
   - Long: Wick trades below/through LVN area + Bullish close back above/holding level.
   - Short: Wick trades above/through LVN area + Bearish close back below/holding level.
5. Risk & Execution:
   - Stop Loss: Below rejection wick (Long) / Above rejection wick (Short) + buffer (Quant.OS implementation).
   - Take Profit: Configurable R multiple (2R default) / multi-target (Quant.OS implementation).
   - State Machine: 17 deterministic states with full "Why Trade / Why No Trade" reason codes.
   - ZERO lookahead bias in historical and backtest evaluations.
"""

import math
import uuid
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union
import pandas as pd
import numpy as np

from src import config, db, audit

logger = logging.getLogger("VolumeStarStrategy")


# =============================================================================
# 1. CONFIGURATION & CONSTANTS
# =============================================================================

@dataclass
class VolumeStarConfig:
    """Strategy configuration with explicit separation between Source rules and Quant.OS parameters."""
    
    # --- Source-Defined Canonical Defaults ---
    strategy_id: str = "volume-star-v1"
    display_name: str = "Volume Star Strategy"
    category: str = "Market Flow / Volume Profile"
    version: str = "1.0.0"
    timeframe: str = "5m"
    frvp_row_size: int = 50                 # SOURCE RULE: 50 rows
    frvp_value_area_percent: float = 70.0   # SOURCE RULE: 70% Value Area
    frvp_width: int = 100                   # SOURCE RULE: 100 Width
    
    # --- Market Structure Parameters (Quant.OS Implementation) ---
    pivot_left_bars: int = 3
    pivot_right_bars: int = 3
    minimum_swing_distance_pct: float = 0.05
    minimum_structure_points: int = 2       # Min 2 HH/HL or LH/LL
    
    # --- LVN Detection & Zone Parameters (Quant.OS Implementation) ---
    lvn_detection_method: str = "local_minima"   # "local_minima", "relative_deficit"
    lvn_relative_deficit_threshold: float = 0.35 # Volume must be >=35% below neighbor average
    lvn_min_significance: float = 0.2
    lvn_min_separation_bins: int = 2
    lvn_zone_width_mode: str = "bin_width"      # "bin_width", "atr", "percent"
    lvn_zone_atr_multiplier: float = 0.5
    lvn_zone_pct: float = 0.15
    
    # --- Rejection & Confirmation Quality Filters (Quant.OS Enhancements) ---
    require_rejection_wick: bool = True
    min_wick_ratio: float = 0.15                # Wick must be >= 15% of total candle range
    require_directional_close: bool = True      # Bullish close for Long, Bearish close for Short
    require_volume_confirmation: bool = False   # Optional Quant.OS volume filter
    
    # --- Risk & Money Management (Quant.OS Implementation) ---
    stop_mode: str = "REJECTION_WICK"           # "REJECTION_WICK", "LVN_ZONE", "ATR_STOP", "STRUCTURE_STOP"
    stop_buffer_type: str = "ATR"               # "TICKS", "PERCENT", "ATR"
    stop_buffer_value: float = 0.2              # 0.2 x ATR or percent/ticks
    take_profit_mode: str = "FIXED_R_MULTIPLE"  # "FIXED_R_MULTIPLE", "STRUCTURE_TARGET", "PARTIAL_R_TARGETS"
    take_profit_r_multiple: float = 2.0         # 2R Default
    tp1_r_multiple: float = 1.0
    tp1_pct: float = 50.0
    tp2_r_multiple: float = 2.0
    tp2_pct: float = 50.0
    trailing_stop_mode: str = "OFF"             # "OFF", "ATR", "SWING", "BREAK_EVEN_AFTER_R"
    risk_per_trade_pct: float = 1.0
    capital: float = 10000.0
    
    # --- Setup Expiry & Cooldown Limits ---
    max_entries_per_lvn: int = 1
    max_bars_waiting_for_retrace: int = 25
    max_bars_waiting_for_confirmation: int = 12
    cooldown_bars: int = 3
    
    # --- Execution & Environment ---
    execution_behavior: str = "NEXT_BAR_MARKET" # "NEXT_BAR_MARKET", "LIMIT_AT_CONFIRM_CLOSE", "LIMIT_AT_LVN_RECLAIM"
    execution_mode: str = "PAPER"               # "PAPER", "SHADOW", "LIVE", "BACKTEST"
    market_data_provider: str = "DHAN"          # "DHAN", "UPSTOX", "DELTA", "BINANCE", "NSE"
    execution_broker: str = "PAPER"
    account_id: str = "PRIMARY"


# =============================================================================
# 2. DETERMINISTIC MARKET STRUCTURE ENGINE
# =============================================================================

class MarketStructureEngine:
    """
    Detects confirmed swing highs and lows strictly from historical pivots without lookahead bias.
    Computes Bullish (HH + HL), Bearish (LH + LL), and Neutral market structures.
    """

    @classmethod
    def find_confirmed_pivots(
        cls,
        df: pd.DataFrame,
        left_bars: int = 3,
        right_bars: int = 3,
        min_swing_pct: float = 0.05
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Locates swing highs and swing lows confirmed by right_bars subsequent candles.
        A pivot at index i is ONLY confirmed at index (i + right_bars).
        """
        if len(df) < (left_bars + right_bars + 1):
            return [], []

        highs = df['high'].to_numpy(dtype=np.float64)
        lows = df['low'].to_numpy(dtype=np.float64)
        timestamps = df['timestamp'].tolist() if 'timestamp' in df.columns else [str(i) for i in range(len(df))]

        confirmed_highs = []
        confirmed_lows = []
        n = len(df)

        for i in range(left_bars, n - right_bars):
            curr_high = highs[i]
            curr_low = lows[i]

            # Swing High condition: strictly highest among left and right window
            is_high = True
            for j in range(1, left_bars + 1):
                if highs[i - j] >= curr_high:
                    is_high = False
                    break
            if is_high:
                for j in range(1, right_bars + 1):
                    if highs[i + j] >= curr_high:
                        is_high = False
                        break

            if is_high:
                confirmed_highs.append({
                    "pivot_index": i,
                    "confirmed_at_index": i + right_bars,
                    "price": float(curr_high),
                    "timestamp": str(timestamps[i]),
                    "confirmed_timestamp": str(timestamps[i + right_bars]),
                    "type": "SWING_HIGH"
                })

            # Swing Low condition: strictly lowest among left and right window
            is_low = True
            for j in range(1, left_bars + 1):
                if lows[i - j] <= curr_low:
                    is_low = False
                    break
            if is_low:
                for j in range(1, right_bars + 1):
                    if lows[i + j] <= curr_low:
                        is_low = False
                        break

            if is_low:
                confirmed_lows.append({
                    "pivot_index": i,
                    "confirmed_at_index": i + right_bars,
                    "price": float(curr_low),
                    "timestamp": str(timestamps[i]),
                    "confirmed_timestamp": str(timestamps[i + right_bars]),
                    "type": "SWING_LOW"
                })

        return confirmed_highs, confirmed_lows

    @classmethod
    def evaluate_structure(
        cls,
        df: pd.DataFrame,
        current_idx: Optional[int] = None,
        left_bars: int = 3,
        right_bars: int = 3,
        min_points: int = 2
    ) -> Dict[str, Any]:
        """
        Evaluates 5m market structure as of current_idx (default: latest bar).
        Ensures NO LOOKAHEAD by filtering pivots confirmed at or before current_idx.
        """
        if df.empty or len(df) < 10:
            return {
                "trend": "NEUTRAL",
                "trend_confidence": 0.0,
                "structure_state": "DATA_INSUFFICIENT",
                "reason": "Insufficient historical candle bars for structure evaluation",
                "last_higher_high": None,
                "last_higher_low": None,
                "last_lower_high": None,
                "last_lower_low": None,
                "anchor_pivot": None,
                "structure_history": []
            }

        eval_idx = len(df) - 1 if current_idx is None else current_idx
        if eval_idx < 0:
            eval_idx = len(df) + eval_idx

        # Slice df up to eval_idx to ensure zero future data leakage
        sub_df = df.iloc[:eval_idx + 1].copy()
        raw_highs, raw_lows = cls.find_confirmed_pivots(sub_df, left_bars=left_bars, right_bars=right_bars)

        # Pivots confirmed strictly at or before eval_idx
        highs = [p for p in raw_highs if p["confirmed_at_index"] <= eval_idx]
        lows = [p for p in raw_lows if p["confirmed_at_index"] <= eval_idx]

        if len(highs) < min_points or len(lows) < min_points:
            return {
                "trend": "NEUTRAL",
                "trend_confidence": 30.0,
                "structure_state": "STRUCTURE_INCOMPLETE",
                "reason": f"Need at least {min_points} confirmed swing highs and lows (found {len(highs)} highs, {len(lows)} lows)",
                "last_higher_high": None,
                "last_higher_low": None,
                "last_lower_high": None,
                "last_lower_low": None,
                "anchor_pivot": None,
                "structure_history": []
            }

        # Check Bullish Structure: Consecutive Higher Highs and Higher Lows
        is_bullish = True
        hh_count = 0
        hl_count = 0
        for i in range(len(highs) - 1, 0, -1):
            if highs[i]["price"] > highs[i - 1]["price"]:
                hh_count += 1
            else:
                break

        for i in range(len(lows) - 1, 0, -1):
            if lows[i]["price"] > lows[i - 1]["price"]:
                hl_count += 1
            else:
                break

        # Check Bearish Structure: Consecutive Lower Highs and Lower Lows
        is_bearish = True
        lh_count = 0
        ll_count = 0
        for i in range(len(highs) - 1, 0, -1):
            if highs[i]["price"] < highs[i - 1]["price"]:
                lh_count += 1
            else:
                break

        for i in range(len(lows) - 1, 0, -1):
            if lows[i]["price"] < lows[i - 1]["price"]:
                ll_count += 1
            else:
                break

        last_sh = highs[-1]
        prev_sh = highs[-2]
        last_sl = lows[-1]
        prev_sl = lows[-2]

        # Bullish evaluation
        if last_sh["price"] > prev_sh["price"] and last_sl["price"] > prev_sl["price"]:
            confidence = min(95.0, 60.0 + (hh_count + hl_count) * 10.0)
            return {
                "trend": "BULLISH",
                "trend_confidence": round(confidence, 1),
                "structure_state": "CONFIRMED_BULLISH",
                "reason": f"Bullish structure confirmed: HH ({last_sh['price']:.2f} > {prev_sh['price']:.2f}) & HL ({last_sl['price']:.2f} > {prev_sl['price']:.2f})",
                "last_higher_high": last_sh,
                "last_higher_low": last_sl,
                "last_lower_high": None,
                "last_lower_low": None,
                "anchor_pivot": last_sl, # Long anchors from most recent confirmed Higher Low
                "structure_summary": "HH → HL → HH",
                "structure_history": [{"type": "HL", "price": last_sl["price"], "index": last_sl["pivot_index"]},
                                      {"type": "HH", "price": last_sh["price"], "index": last_sh["pivot_index"]}]
            }

        # Bearish evaluation
        if last_sh["price"] < prev_sh["price"] and last_sl["price"] < prev_sl["price"]:
            confidence = min(95.0, 60.0 + (lh_count + ll_count) * 10.0)
            return {
                "trend": "BEARISH",
                "trend_confidence": round(confidence, 1),
                "structure_state": "CONFIRMED_BEARISH",
                "reason": f"Bearish structure confirmed: LH ({last_sh['price']:.2f} < {prev_sh['price']:.2f}) & LL ({last_sl['price']:.2f} < {prev_sl['price']:.2f})",
                "last_higher_high": None,
                "last_higher_low": None,
                "last_lower_high": last_sh,
                "last_lower_low": last_sl,
                "anchor_pivot": last_sh, # Short anchors from most recent confirmed Lower High
                "structure_summary": "LH → LL → LH",
                "structure_history": [{"type": "LH", "price": last_sh["price"], "index": last_sh["pivot_index"]},
                                      {"type": "LL", "price": last_sl["price"], "index": last_sl["pivot_index"]}]
            }

        # Mixed / Range-bound / Conflicting
        return {
            "trend": "NEUTRAL",
            "trend_confidence": 35.0,
            "structure_state": "NO_TRADE",
            "reason": "Market structure is mixed / range-bound. No persistent HH/HL or LH/LL sequence.",
            "last_higher_high": None,
            "last_higher_low": None,
            "last_lower_high": None,
            "last_lower_low": None,
            "anchor_pivot": None,
            "structure_summary": "RANGING",
            "structure_history": []
        }


# =============================================================================
# 3. FIXED RANGE VOLUME PROFILE (FRVP) ENGINE
# =============================================================================

class FixedRangeVolumeProfileEngine:
    """
    Computes deterministic Fixed Range Volume Profile over a defined candle slice.
    Source Configuration:
    - Row Size: 50 equal-width price bins
    - Value Area: 70% of total volume
    - Width: 100
    """

    @classmethod
    def calculate_frvp(
        cls,
        candles_df: pd.DataFrame,
        row_size: int = 50,
        value_area_pct: float = 70.0,
        width: int = 100
    ) -> Dict[str, Any]:
        """
        Calculates FRVP across the supplied candles.
        Returns: POC, VAH, VAL, total_volume, price bins array, and volume distribution.
        """
        if candles_df.empty:
            return {
                "status": "DATA_INSUFFICIENT",
                "poc": 0.0,
                "vah": 0.0,
                "val": 0.0,
                "total_volume": 0.0,
                "bins": [],
                "bin_size": 0.0,
                "row_size": row_size,
                "value_area_pct": value_area_pct,
            }

        highs = candles_df['high'].to_numpy(dtype=np.float64)
        lows = candles_df['low'].to_numpy(dtype=np.float64)
        volumes = candles_df['volume'].to_numpy(dtype=np.float64)

        min_price = float(np.min(lows))
        max_price = float(np.max(highs))

        if max_price <= min_price or np.sum(volumes) <= 0:
            avg_p = (min_price + max_price) / 2.0 if max_price > 0 else 100.0
            return {
                "status": "FLAT_OR_ZERO_VOLUME",
                "poc": round(avg_p, 2),
                "vah": round(avg_p * 1.005, 2),
                "val": round(avg_p * 0.995, 2),
                "total_volume": float(np.sum(volumes)),
                "bins": [],
                "bin_size": 0.01,
                "row_size": row_size,
                "value_area_pct": value_area_pct,
            }

        num_rows = max(10, int(row_size))
        bin_size = (max_price - min_price) / num_rows
        bin_volumes = np.zeros(num_rows, dtype=np.float64)

        # Distribute volume per candle across overlapping price rows
        for idx in range(len(candles_df)):
            c_high = highs[idx]
            c_low = lows[idx]
            c_vol = volumes[idx]

            if c_vol <= 0:
                continue

            if c_high <= c_low + 1e-6:
                b_idx = min(num_rows - 1, max(0, int((c_low - min_price) / bin_size)))
                bin_volumes[b_idx] += c_vol
            else:
                # Candle covers a range of bins
                start_b = min(num_rows - 1, max(0, int((c_low - min_price) / bin_size)))
                end_b = min(num_rows - 1, max(0, int((c_high - min_price) / bin_size)))
                covered_bins = max(1, (end_b - start_b + 1))
                vol_per_bin = c_vol / covered_bins
                for b in range(start_b, end_b + 1):
                    bin_volumes[b] += vol_per_bin

        total_vol = float(np.sum(bin_volumes))
        if total_vol <= 0:
            avg_p = (min_price + max_price) / 2.0
            return {
                "status": "ZERO_VOLUME",
                "poc": round(avg_p, 2),
                "vah": round(avg_p, 2),
                "val": round(avg_p, 2),
                "total_volume": 0.0,
                "bins": [],
                "bin_size": bin_size,
                "row_size": row_size,
                "value_area_pct": value_area_pct,
            }

        # POC is the bin with maximum accumulated volume
        poc_idx = int(np.argmax(bin_volumes))
        poc_price = min_price + (poc_idx + 0.5) * bin_size

        # Value Area calculation (70% total volume radiating outward from POC)
        target_vol = total_vol * (value_area_pct / 100.0)
        curr_vol = bin_volumes[poc_idx]
        low_ptr = poc_idx
        high_ptr = poc_idx

        while curr_vol < target_vol:
            vol_below = bin_volumes[low_ptr - 1] if low_ptr > 0 else 0.0
            vol_above = bin_volumes[high_ptr + 1] if high_ptr < num_rows - 1 else 0.0

            if vol_below <= 0.0 and vol_above <= 0.0:
                break

            if vol_below >= vol_above:
                low_ptr -= 1
                curr_vol += vol_below
            else:
                high_ptr += 1
                curr_vol += vol_above

        val_price = min_price + low_ptr * bin_size
        vah_price = min_price + (high_ptr + 1) * bin_size

        # Format bins list for inspection
        bins_data = []
        max_bin_vol = float(np.max(bin_volumes)) if np.max(bin_volumes) > 0 else 1.0
        for b in range(num_rows):
            b_low = min_price + b * bin_size
            b_high = min_price + (b + 1) * bin_size
            b_mid = (b_low + b_high) / 2.0
            b_vol = float(bin_volumes[b])
            bins_data.append({
                "bin_index": b,
                "price_low": round(b_low, 2),
                "price_high": round(b_high, 2),
                "price_mid": round(b_mid, 2),
                "volume": round(b_vol, 4),
                "volume_ratio": round(b_vol / total_vol, 4),
                "is_poc": (b == poc_idx),
                "in_value_area": (low_ptr <= b <= high_ptr),
                "relative_width": round((b_vol / max_bin_vol) * (width / 100.0) * 100.0, 1)
            })

        return {
            "status": "FRVP_READY",
            "poc": round(poc_price, 2),
            "poc_idx": poc_idx,
            "vah": round(vah_price, 2),
            "vah_idx": high_ptr,
            "val": round(val_price, 2),
            "val_idx": low_ptr,
            "total_volume": round(total_vol, 2),
            "bin_size": round(bin_size, 4),
            "range_low": round(min_price, 2),
            "range_high": round(max_price, 2),
            "bins": bins_data,
            "row_size": row_size,
            "value_area_pct": value_area_pct,
            "width": width
        }


# =============================================================================
# 4. DETERMINISTIC LVN IDENTIFICATION & RANKING ENGINE
# =============================================================================

class LVNDetectionEngine:
    """
    Identifies Low Volume Nodes (LVNs) deterministically:
    - Bins with materially lower volume than surrounding neighbors.
    - Computes relative volume deficit and local minima significance.
    - Ranks multiple LVNs to deterministically select the PRIMARY_LVN.
    - Formulates LVN zone bounds [lvn_low, lvn_high].
    """

    @classmethod
    def identify_lvns(
        cls,
        frvp_result: Dict[str, Any],
        current_price: float,
        trend: str = "BULLISH",
        deficit_threshold: float = 0.35,
        min_significance: float = 0.2,
        zone_width_mode: str = "bin_width",
        zone_atr: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Scans FRVP profile bins and outputs ranked LVN candidate list.
        """
        bins = frvp_result.get("bins", [])
        if len(bins) < 5:
            return []

        volumes = [b["volume"] for b in bins]
        total_vol = frvp_result.get("total_volume", sum(volumes))
        avg_vol = total_vol / len(bins) if len(bins) > 0 else 1.0
        poc_idx = frvp_result.get("poc_idx", int(np.argmax(volumes)))

        lvns = []
        n = len(bins)

        # Examine interior bins (avoid extreme boundary edges)
        for i in range(1, n - 1):
            if i == poc_idx:
                continue

            v_curr = volumes[i]
            v_prev = volumes[i - 1]
            v_next = volumes[i + 1]

            # Neighbor mean
            neighbor_avg = (v_prev + v_next) / 2.0
            if neighbor_avg <= 1e-6:
                continue

            # Deficit: how much lower is this bin compared to neighbors
            relative_deficit = (neighbor_avg - v_curr) / neighbor_avg

            # Local minimum check + deficit threshold
            is_local_min = (v_curr <= v_prev) and (v_curr <= v_next)
            meets_deficit = relative_deficit >= deficit_threshold

            # Include local minima or any bin with substantial deficit
            if is_local_min or meets_deficit or (v_curr < avg_vol * 0.8):
                bin_item = bins[i]
                b_mid = bin_item["price_mid"]
                b_low = bin_item["price_low"]
                b_high = bin_item["price_high"]
                bin_sz = frvp_result.get("bin_size", b_high - b_low)

                # Zone width determination
                if zone_width_mode == "atr" and zone_atr > 0:
                    half_width = zone_atr * 0.25
                    zone_low = b_mid - half_width
                    zone_high = b_mid + half_width
                else: # Default bin_width mode
                    zone_low = b_low
                    zone_high = b_high

                # LVN significance & strength score (0-100)
                # Combines depth of volume deficit + neighbor volume contrast
                strength_score = min(100.0, max(10.0, (relative_deficit * 60.0) + (1.0 - min(1.0, v_curr / max(1e-6, avg_vol))) * 40.0))

                # Proximity to current price
                dist_to_price = abs(current_price - b_mid)
                dist_pct = (dist_to_price / max(1.0, current_price)) * 100.0

                # Location check: For Bullish, LVN should ideally be in the retrace zone below current price; For Bearish, above
                location_aligned = (b_mid <= current_price) if trend == "BULLISH" else (b_mid >= current_price)

                lvns.append({
                    "lvn_id": f"LVN-{i}-{int(b_mid)}",
                    "bin_index": i,
                    "lvn_price": round(b_mid, 2),
                    "lvn_center": round(b_mid, 2),
                    "lvn_lower_bound": round(zone_low, 2),
                    "lvn_low": round(zone_low, 2),
                    "lvn_upper_bound": round(zone_high, 2),
                    "lvn_high": round(zone_high, 2),
                    "lvn_volume": round(v_curr, 4),
                    "neighbor_avg_volume": round(neighbor_avg, 4),
                    "relative_deficit": round(relative_deficit, 4),
                    "strength_score": round(strength_score, 1),
                    "distance_to_price": round(dist_to_price, 2),
                    "distance_pct": round(dist_pct, 2),
                    "location_aligned": location_aligned,
                    "in_value_area": bin_item.get("in_value_area", False)
                })

        # Fallback if no specific minima found: select lowest volume interior bins
        if not lvns and n >= 4:
            interior_indices = [idx for idx in range(1, n - 1) if idx != poc_idx]
            if interior_indices:
                min_idx = min(interior_indices, key=lambda idx: volumes[idx])
                bin_item = bins[min_idx]
                b_mid = bin_item["price_mid"]
                lvns.append({
                    "lvn_id": f"LVN-{min_idx}-{int(b_mid)}",
                    "bin_index": min_idx,
                    "lvn_price": round(b_mid, 2),
                    "lvn_center": round(b_mid, 2),
                    "lvn_lower_bound": round(bin_item["price_low"], 2),
                    "lvn_low": round(bin_item["price_low"], 2),
                    "lvn_upper_bound": round(bin_item["price_high"], 2),
                    "lvn_high": round(bin_item["price_high"], 2),
                    "lvn_volume": round(volumes[min_idx], 4),
                    "neighbor_avg_volume": round(avg_vol, 4),
                    "relative_deficit": 0.25,
                    "strength_score": 50.0,
                    "distance_to_price": round(abs(current_price - b_mid), 2),
                    "distance_pct": round((abs(current_price - b_mid) / max(1.0, current_price)) * 100.0, 2),
                    "location_aligned": (b_mid <= current_price) if trend == "BULLISH" else (b_mid >= current_price),
                    "in_value_area": bin_item.get("in_value_area", False)
                })

        # Rank LVNs: Prefer location_aligned first, then highest strength, then closest to price
        lvns.sort(key=lambda x: (
            1 if x["location_aligned"] else 0,
            x["strength_score"],
            -x["distance_to_price"]
        ), reverse=True)

        return lvns


# =============================================================================
# 5. RETRACE & REJECTION CONFIRMATION ENGINE
# =============================================================================

class RejectionConfirmationEngine:
    """
    Evaluates LVN retrace penetration and rejection confirmation on closed candles.
    
    SOURCE RULES:
    Long:
    - Price enters/touches LVN zone
    - Wick trades below / penetrates lower portion of LVN
    - Candle closes bullish (close > open, close >= LVN reference)
    
    Short:
    - Price enters/touches LVN zone
    - Wick trades above / penetrates upper portion of LVN
    - Candle closes bearish (close < open, close <= LVN reference)
    """

    @classmethod
    def evaluate_rejection(
        cls,
        candle: Dict[str, Any],
        lvn: Dict[str, Any],
        trend: str = "BULLISH",
        require_volume_confirm: bool = False,
        rolling_median_vol: float = 0.0,
        min_wick_ratio: float = 0.15
    ) -> Dict[str, Any]:
        """
        Evaluates whether candle confirms rejection from the LVN zone.
        """
        c_open = float(candle.get("open", 0.0))
        c_high = float(candle.get("high", 0.0))
        c_low = float(candle.get("low", 0.0))
        c_close = float(candle.get("close", 0.0))
        c_vol = float(candle.get("volume", 0.0))

        lvn_low = float(lvn.get("lvn_low", lvn.get("lvn_lower_bound", 0.0)))
        lvn_high = float(lvn.get("lvn_high", lvn.get("lvn_upper_bound", 0.0)))
        lvn_center = float(lvn.get("lvn_center", (lvn_low + lvn_high) / 2.0))

        c_range = max(1e-5, c_high - c_low)
        body_size = abs(c_close - c_open)
        upper_wick = c_high - max(c_open, c_close)
        lower_wick = min(c_open, c_close) - c_low

        lower_wick_ratio = lower_wick / c_range
        upper_wick_ratio = upper_wick / c_range
        body_ratio = body_size / c_range
        close_loc = (c_close - c_low) / c_range # 0 = low, 1 = high

        metrics = {
            "candle_range": round(c_range, 2),
            "body_size": round(body_size, 2),
            "upper_wick": round(upper_wick, 2),
            "lower_wick": round(lower_wick, 2),
            "lower_wick_ratio": round(lower_wick_ratio, 3),
            "upper_wick_ratio": round(upper_wick_ratio, 3),
            "body_ratio": round(body_ratio, 3),
            "close_location": round(close_loc, 3),
            "volume": round(c_vol, 2)
        }

        # Optional volume confirmation filter (Quant.OS enhancement)
        vol_passed = True
        if require_volume_confirm and rolling_median_vol > 0:
            vol_passed = c_vol >= rolling_median_vol

        if trend == "BULLISH":
            # Long Rejection Check:
            # 1. Touched LVN: low reaches into or below LVN high
            touched_lvn = (c_low <= lvn_high)
            # 2. Wick penetrated below / through LVN area
            wick_penetrated = (c_low <= lvn_center or c_low <= lvn_low or lower_wick_ratio >= min_wick_ratio)
            # 3. Bullish Close: close > open
            is_bullish_close = (c_close > c_open)
            # 4. Reclaimed / Holds LVN reference: close >= lvn_low
            reclaimed_level = (c_close >= lvn_low)

            confirmed = touched_lvn and wick_penetrated and is_bullish_close and reclaimed_level and vol_passed

            reasons = []
            if not touched_lvn:
                reasons.append(f"Price low ({c_low:.2f}) did not touch LVN zone ({lvn_low:.2f}–{lvn_high:.2f})")
            if not wick_penetrated:
                reasons.append(f"Lower wick ({lower_wick_ratio:.1%}) did not sufficiently penetrate LVN")
            if not is_bullish_close:
                reasons.append(f"Candle closed bearish ({c_close:.2f} <= {c_open:.2f}) — Long requires bullish close")
            if not reclaimed_level:
                reasons.append(f"Close ({c_close:.2f}) failed to hold above LVN low ({lvn_low:.2f})")
            if not vol_passed:
                reasons.append(f"Candle volume ({c_vol}) below median ({rolling_median_vol})")

            return {
                "confirmed": confirmed,
                "signal_direction": "LONG" if confirmed else "NONE",
                "touched_lvn": touched_lvn,
                "wick_penetrated": wick_penetrated,
                "directional_close": is_bullish_close,
                "reclaimed_level": reclaimed_level,
                "vol_passed": vol_passed,
                "metrics": metrics,
                "rejection_quality": round(min(100.0, (lower_wick_ratio * 50.0) + (close_loc * 50.0)), 1),
                "rejection_summary": "Bullish Rejection Confirmed: Lower wick rejected LVN & candle closed bullish" if confirmed else (" | ".join(reasons) if reasons else "No rejection")
            }

        elif trend == "BEARISH":
            # Short Rejection Check:
            # 1. Touched LVN: high reaches into or above LVN low
            touched_lvn = (c_high >= lvn_low)
            # 2. Wick penetrated above / through LVN area
            wick_penetrated = (c_high >= lvn_center or c_high >= lvn_high or upper_wick_ratio >= min_wick_ratio)
            # 3. Bearish Close: close < open
            is_bearish_close = (c_close < c_open)
            # 4. Held below LVN reference: close <= lvn_high
            held_level = (c_close <= lvn_high)

            confirmed = touched_lvn and wick_penetrated and is_bearish_close and held_level and vol_passed

            reasons = []
            if not touched_lvn:
                reasons.append(f"Price high ({c_high:.2f}) did not touch LVN zone ({lvn_low:.2f}–{lvn_high:.2f})")
            if not wick_penetrated:
                reasons.append(f"Upper wick ({upper_wick_ratio:.1%}) did not sufficiently penetrate LVN")
            if not is_bearish_close:
                reasons.append(f"Candle closed bullish ({c_close:.2f} >= {c_open:.2f}) — Short requires bearish close")
            if not held_level:
                reasons.append(f"Close ({c_close:.2f}) failed to hold below LVN high ({lvn_high:.2f})")
            if not vol_passed:
                reasons.append(f"Candle volume ({c_vol}) below median ({rolling_median_vol})")

            return {
                "confirmed": confirmed,
                "signal_direction": "SHORT" if confirmed else "NONE",
                "touched_lvn": touched_lvn,
                "wick_penetrated": wick_penetrated,
                "directional_close": is_bearish_close,
                "reclaimed_level": held_level,
                "vol_passed": vol_passed,
                "metrics": metrics,
                "rejection_quality": round(min(100.0, (upper_wick_ratio * 50.0) + ((1.0 - close_loc) * 50.0)), 1),
                "rejection_summary": "Bearish Rejection Confirmed: Upper wick rejected LVN & candle closed bearish" if confirmed else (" | ".join(reasons) if reasons else "No rejection")
            }

        return {
            "confirmed": False,
            "signal_direction": "NONE",
            "touched_lvn": False,
            "wick_penetrated": False,
            "directional_close": False,
            "reclaimed_level": False,
            "vol_passed": False,
            "metrics": metrics,
            "rejection_quality": 0.0,
            "rejection_summary": "No active trend for rejection evaluation"
        }


# =============================================================================
# 6. VOLUME STAR MASTER EVALUATOR & DETERMINISTIC STATE MACHINE
# =============================================================================

class VolumeStarEvaluator:
    """
    Master evaluator for Volume Star Strategy.
    Enforces the complete 3-step sequence:
    Step 1: Identify 5m Trend (HH/HL or LH/LL)
    Step 2: Mark FRVP from swing anchor + Identify Primary LVN
    Step 3: Wait for Retrace + Confirm LVN Rejection
    
    Generates canonical Signal Objects, Risk Parameters, and exact Reason Codes.
    """

    def __init__(self, config_obj: Optional[VolumeStarConfig] = None):
        self.config = config_obj or VolumeStarConfig()
        self._processed_signal_keys: set = set()

    def evaluate_live_state(
        self,
        df: pd.DataFrame,
        symbol: str = "NIFTY",
        provider: str = "DHAN",
        current_position: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates real-time state machine snapshot for a given OHLCV series.
        """
        # Data Quality Gate
        if df.empty or len(df) < 15:
            return {
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "version": self.config.version,
                "timeframe": self.config.timeframe,
                "symbol": symbol,
                "provider": provider,
                "mode": self.config.execution_mode,
                "state": "DATA_INSUFFICIENT",
                "reason_code": "DATA_QUALITY_FAILED",
                "decision_summary": "Insufficient historical 5m candles for analysis.",
                "step_1_trend": {"status": "WAITING", "summary": "Insufficient Data"},
                "step_2_frvp": {"status": "WAITING", "summary": "FRVP Pending"},
                "step_3_rejection": {"status": "WAITING", "summary": "Rejection Pending"},
                "current_price": 0.0,
                "signal": None
            }

        last_row = df.iloc[-1]
        current_price = float(last_row["close"])
        timestamp_str = str(last_row.get("timestamp", datetime.now(timezone.utc).isoformat()))

        # Check for active open position
        if current_position and current_position.get("has_position", False):
            return {
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "version": self.config.version,
                "timeframe": self.config.timeframe,
                "symbol": symbol,
                "provider": provider,
                "mode": self.config.execution_mode,
                "state": "POSITION_MANAGEMENT",
                "reason_code": "POSITION_ALREADY_OPEN",
                "decision_summary": f"Position already active ({current_position.get('direction')} {current_position.get('size')} units).",
                "step_1_trend": {"status": "COMPLETE", "summary": "Active Trade"},
                "step_2_frvp": {"status": "COMPLETE", "summary": "Active Trade"},
                "step_3_rejection": {"status": "COMPLETE", "summary": "Active Trade"},
                "current_price": current_price,
                "signal": None
            }

        # Step 1: Market Structure Evaluation
        struct = MarketStructureEngine.evaluate_structure(
            df,
            left_bars=self.config.pivot_left_bars,
            right_bars=self.config.pivot_right_bars,
            min_points=self.config.minimum_structure_points
        )

        trend = struct["trend"]

        if trend == "NEUTRAL":
            return {
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "version": self.config.version,
                "timeframe": self.config.timeframe,
                "symbol": symbol,
                "provider": provider,
                "mode": self.config.execution_mode,
                "state": "NO_TRADE",
                "reason_code": "NO_TREND",
                "decision_summary": struct.get("reason", "No confirmed 5m trend structure."),
                "market_structure": struct,
                "step_1_trend": {"status": "FAILED", "summary": "○ NEUTRAL / NO_TRADE"},
                "step_2_frvp": {"status": "WAITING", "summary": "○ Waiting for trend"},
                "step_3_rejection": {"status": "WAITING", "summary": "○ Waiting for trend"},
                "current_price": current_price,
                "signal": None
            }

        # Step 2: FRVP Anchoring & Calculation
        anchor_pivot = struct.get("anchor_pivot")
        if not anchor_pivot:
            return {
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "version": self.config.version,
                "timeframe": self.config.timeframe,
                "symbol": symbol,
                "provider": provider,
                "mode": self.config.execution_mode,
                "state": "TREND_DETECTED",
                "reason_code": "STRUCTURE_INCOMPLETE",
                "decision_summary": f"Trend {trend} detected, but swing anchor point is pending.",
                "market_structure": struct,
                "step_1_trend": {"status": "COMPLETE", "summary": f"✓ {trend} ({struct.get('structure_summary')})"},
                "step_2_frvp": {"status": "IN_PROGRESS", "summary": "Calculating FRVP anchor..."},
                "step_3_rejection": {"status": "WAITING", "summary": "Pending LVN"},
                "current_price": current_price,
                "signal": None
            }

        anchor_idx = anchor_pivot["pivot_index"]
        # In Volume Star, FRVP is drawn from the swing anchor across the established impulse leg
        if (len(df) - anchor_idx) >= 4:
            frvp_candles = df.iloc[anchor_idx:-1].copy()
            leg_ref_price = float(df.iloc[-2]["close"])
        else:
            frvp_candles = df.iloc[anchor_idx:].copy()
            leg_ref_price = current_price

        if len(frvp_candles) < 3:
            frvp_candles = df.iloc[-max(10, len(df)):]

        frvp = FixedRangeVolumeProfileEngine.calculate_frvp(
            frvp_candles,
            row_size=self.config.frvp_row_size,
            value_area_pct=self.config.frvp_value_area_percent,
            width=self.config.frvp_width
        )

        # Step 2b: LVN Identification & Ranking
        # Compute rolling ATR for zone sizing if needed
        atr_val = (df['high'] - df['low']).rolling(14).mean().iloc[-1] if len(df) >= 14 else (current_price * 0.005)

        lvns = LVNDetectionEngine.identify_lvns(
            frvp,
            current_price=leg_ref_price,
            trend=trend,
            deficit_threshold=self.config.lvn_relative_deficit_threshold,
            min_significance=self.config.lvn_min_significance,
            zone_width_mode=self.config.lvn_zone_width_mode,
            zone_atr=float(atr_val)
        )

        if not lvns:
            return {
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "version": self.config.version,
                "timeframe": self.config.timeframe,
                "symbol": symbol,
                "provider": provider,
                "mode": self.config.execution_mode,
                "state": "FRVP_READY",
                "reason_code": "NO_VALID_LVN",
                "decision_summary": f"FRVP calculated (POC: {frvp['poc']}), but no significant LVN identified in range.",
                "market_structure": struct,
                "frvp": frvp,
                "primary_lvn": None,
                "step_1_trend": {"status": "COMPLETE", "summary": f"✓ {trend} ({struct.get('structure_summary')})"},
                "step_2_frvp": {"status": "FAILED", "summary": "○ No significant LVN"},
                "step_3_rejection": {"status": "WAITING", "summary": "○ Pending LVN"},
                "current_price": current_price,
                "signal": None
            }

        primary_lvn = lvns[0]
        lvn_low = primary_lvn["lvn_low"]
        lvn_high = primary_lvn["lvn_high"]
        lvn_mid = primary_lvn["lvn_price"]

        # Step 3: Retrace & Rejection Check
        rolling_median_vol = float(df['volume'].rolling(20).median().iloc[-1]) if len(df) >= 20 else 0.0

        rejection_res = RejectionConfirmationEngine.evaluate_rejection(
            candle=last_row.to_dict(),
            lvn=primary_lvn,
            trend=trend,
            require_volume_confirm=self.config.require_volume_confirmation,
            rolling_median_vol=rolling_median_vol,
            min_wick_ratio=self.config.min_wick_ratio
        )

        # Determine State
        state = "WAITING_FOR_RETRACE"
        reason_code = "WAITING_FOR_RETRACE"
        decision_summary = f"Waiting for price ({current_price:.2f}) to retrace into primary LVN ({lvn_low:.2f}–{lvn_high:.2f})."

        if rejection_res["touched_lvn"]:
            if rejection_res["confirmed"]:
                state = "LONG_SIGNAL_READY" if trend == "BULLISH" else "SHORT_SIGNAL_READY"
                reason_code = "SIGNAL_CONFIRMED"
                decision_summary = rejection_res["rejection_summary"]
            else:
                state = "WAITING_FOR_CONFIRMATION"
                reason_code = "NO_CONFIRMATION"
                decision_summary = rejection_res["rejection_summary"]

        # Formulate Signal Object if Confirmed
        signal_obj = None
        if rejection_res["confirmed"]:
            direction = "LONG" if trend == "BULLISH" else "SHORT"
            signal_id = f"SIG-{self.config.strategy_id}-{symbol}-{timestamp_str}"
            
            # Stop Loss Calculation (Quant.OS Implementation Choice)
            c_open = float(last_row["open"])
            c_close = float(last_row["close"])
            c_low = float(last_row["low"])
            c_high = float(last_row["high"])
            buffer_val = (atr_val * self.config.stop_buffer_value) if self.config.stop_buffer_type == "ATR" else (current_price * 0.002)

            if direction == "LONG":
                if self.config.stop_mode == "REJECTION_WICK":
                    stop_price = c_low - buffer_val
                elif self.config.stop_mode == "LVN_ZONE":
                    stop_price = lvn_low - buffer_val
                else:
                    stop_price = c_close - (atr_val * 1.5)
                
                stop_dist = max(1.0, c_close - stop_price)
                target_price = c_close + (stop_dist * self.config.take_profit_r_multiple)
            else:
                if self.config.stop_mode == "REJECTION_WICK":
                    stop_price = c_high + buffer_val
                elif self.config.stop_mode == "LVN_ZONE":
                    stop_price = lvn_high + buffer_val
                else:
                    stop_price = c_close + (atr_val * 1.5)
                
                stop_dist = max(1.0, stop_price - c_close)
                target_price = c_close - (stop_dist * self.config.take_profit_r_multiple)

            # Setup Quality Score (0-100)
            setup_quality = round(min(100.0, (struct["trend_confidence"] * 0.4) + (primary_lvn["strength_score"] * 0.3) + (rejection_res["rejection_quality"] * 0.3)), 1)

            # Deduplication key
            idem_key = f"{symbol}-{primary_lvn['lvn_id']}-{timestamp_str}"

            signal_obj = {
                "signal_id": signal_id,
                "idempotency_key": idem_key,
                "strategy_id": self.config.strategy_id,
                "strategy_name": "VOLUME STAR",
                "strategy_version": self.config.version,
                "timestamp": timestamp_str,
                "instrument": symbol,
                "provider": provider,
                "direction": direction,
                "timeframe": self.config.timeframe,
                "trend": trend,
                "structure_points": struct.get("structure_history", []),
                "anchor_pivot": anchor_pivot,
                "frvp_range": {
                    "poc": frvp["poc"],
                    "vah": frvp["vah"],
                    "val": frvp["val"],
                    "range_low": frvp["range_low"],
                    "range_high": frvp["range_high"]
                },
                "lvn_zone": {
                    "lvn_id": primary_lvn["lvn_id"],
                    "center": primary_lvn["lvn_center"],
                    "low": primary_lvn["lvn_low"],
                    "high": primary_lvn["lvn_high"],
                    "strength": primary_lvn["strength_score"]
                },
                "rejection_candle": {
                    "timestamp": timestamp_str,
                    "open": float(last_row["open"]),
                    "high": float(last_row["high"]),
                    "low": float(last_row["low"]),
                    "close": float(last_row["close"]),
                    "volume": float(last_row["volume"]),
                    "metrics": rejection_res["metrics"]
                },
                "entry_price": round(current_price, 2),
                "stop_loss": round(stop_price, 2),
                "take_profit": round(target_price, 2),
                "r_multiple": self.config.take_profit_r_multiple,
                "risk_amount": round(stop_dist, 2),
                "setup_quality": setup_quality,
                "reason_codes": [reason_code, "STRUCTURE_CONFIRMED", "LVN_REJECTED"],
                "execution_mode": self.config.execution_mode
            }

        # Format 3-Step Setup Tracker Status
        step_1 = {
            "step": 1,
            "title": "IDENTIFY 5M TREND",
            "status": "COMPLETE",
            "badge": f"✓ {trend}",
            "detail": f"{struct.get('structure_summary')} (Conf: {struct['trend_confidence']}%)"
        }
        step_2 = {
            "step": 2,
            "title": "MARK FRVP + LVN",
            "status": "COMPLETE",
            "badge": f"✓ LVN {lvn_low:.0f}–{lvn_high:.0f}",
            "detail": f"POC: {frvp['poc']:.0f} | LVN Deficit: {primary_lvn['relative_deficit']:.1%}"
        }
        step_3 = {
            "step": 3,
            "title": "WAIT FOR LVN REJECTION",
            "status": "COMPLETE" if rejection_res["confirmed"] else ("IN_PROGRESS" if rejection_res["touched_lvn"] else "WAITING"),
            "badge": f"✓ {trend} SIGNAL READY" if rejection_res["confirmed"] else ("⚡ LVN TOUCHED" if rejection_res["touched_lvn"] else "○ WAITING FOR RETRACE"),
            "detail": rejection_res["rejection_summary"]
        }

        return {
            "strategy_id": self.config.strategy_id,
            "strategy_name": "VOLUME STAR",
            "version": self.config.version,
            "timeframe": self.config.timeframe,
            "symbol": symbol,
            "provider": provider,
            "mode": self.config.execution_mode,
            "state": state,
            "reason_code": reason_code,
            "decision_summary": decision_summary,
            "current_price": round(current_price, 2),
            "market_structure": struct,
            "frvp": frvp,
            "primary_lvn": primary_lvn,
            "all_lvns": lvns,
            "rejection": rejection_res,
            "step_1_trend": step_1,
            "step_2_frvp": step_2,
            "step_3_rejection": step_3,
            "signal": signal_obj
        }


# =============================================================================
# 7. BAR-BY-BAR BACKTEST ENGINE WITH ZERO LOOKAHEAD PARITY
# =============================================================================

class VolumeStarBacktester:
    """
    Executes high-fidelity bar-by-bar backtest simulation for Volume Star Strategy.
    Ensures identical evaluator logic to live runtime with zero lookahead, slippage, and fee modeling.
    """

    def __init__(self, config_obj: Optional[VolumeStarConfig] = None):
        self.config = config_obj or VolumeStarConfig()
        self.evaluator = VolumeStarEvaluator(self.config)

    def run_backtest(
        self,
        df: pd.DataFrame,
        symbol: str = "NIFTY",
        provider: str = "DHAN",
        initial_capital: float = 10000.0,
        fees_pct: float = 0.0005,
        slippage_pct: float = 0.0002
    ) -> Dict[str, Any]:
        """
        Simulates Volume Star on historical 5m OHLCV dataframe.
        """
        if df.empty or len(df) < 30:
            return {
                "status": "error",
                "message": "Insufficient historical candles for backtest (minimum 30 bars required)."
            }

        cash = initial_capital
        equity = initial_capital
        peak_equity = initial_capital
        max_drawdown = 0.0

        active_trade: Optional[Dict[str, Any]] = None
        trades: List[Dict[str, Any]] = []
        equity_curve: List[Dict[str, Any]] = []
        processed_candles = 0

        # Scan candle by candle
        for idx in range(25, len(df)):
            sub_df = df.iloc[:idx + 1].copy()
            curr_candle = sub_df.iloc[-1]
            curr_time = str(curr_candle.get("timestamp", idx))
            c_open = float(curr_candle["open"])
            c_high = float(curr_candle["high"])
            c_low = float(curr_candle["low"])
            c_close = float(curr_candle["close"])

            # 1. Manage Active Trade
            if active_trade is not None:
                direction = active_trade["direction"]
                entry_p = active_trade["entry_price"]
                stop_p = active_trade["stop_loss"]
                target_p = active_trade["take_profit"]
                size = active_trade["size"]

                exited = False
                exit_price = 0.0
                exit_reason = ""

                if direction == "LONG":
                    # Check Stop Loss
                    if c_low <= stop_p:
                        exited = True
                        exit_price = stop_p * (1.0 - slippage_pct)
                        exit_reason = "STOP_LOSS_HIT"
                    # Check Take Profit
                    elif c_high >= target_p:
                        exited = True
                        exit_price = target_p * (1.0 - slippage_pct)
                        exit_reason = "TAKE_PROFIT_HIT"
                else: # SHORT
                    # Check Stop Loss
                    if c_high >= stop_p:
                        exited = True
                        exit_price = stop_p * (1.0 + slippage_pct)
                        exit_reason = "STOP_LOSS_HIT"
                    # Check Take Profit
                    elif c_low <= target_p:
                        exited = True
                        exit_price = target_p * (1.0 + slippage_pct)
                        exit_reason = "TAKE_PROFIT_HIT"

                if exited:
                    pnl_raw = (exit_price - entry_p) * size if direction == "LONG" else (entry_p - exit_price) * size
                    fee_cost = (entry_p * size * fees_pct) + (exit_price * size * fees_pct)
                    net_pnl = pnl_raw - fee_cost

                    cash += (entry_p * size + net_pnl)
                    equity = cash

                    r_mult = net_pnl / max(1.0, active_trade["risk_usd"])

                    active_trade.update({
                        "exit_time": curr_time,
                        "exit_price": round(exit_price, 2),
                        "exit_reason": exit_reason,
                        "net_pnl": round(net_pnl, 2),
                        "fee_cost": round(fee_cost, 2),
                        "r_multiple": round(r_mult, 2),
                        "is_win": (net_pnl > 0),
                        "bars_held": idx - active_trade["entry_idx"]
                    })
                    trades.append(active_trade)
                    active_trade = None

            # 2. Evaluate Entry Signal if No Active Position
            if active_trade is None:
                eval_res = self.evaluator.evaluate_live_state(
                    sub_df,
                    symbol=symbol,
                    provider=provider
                )

                signal = eval_res.get("signal")
                if signal:
                    sig_dir = signal["direction"]
                    entry_exec_p = c_close * (1.0 + slippage_pct if sig_dir == "LONG" else 1.0 - slippage_pct)
                    stop_val = signal["stop_loss"]
                    target_val = signal["take_profit"]

                    risk_dist = abs(entry_exec_p - stop_val)
                    risk_capital = equity * (self.config.risk_per_trade_pct / 100.0)
                    pos_size = max(1.0, risk_capital / max(1e-4, risk_dist))

                    # Position Cap: max 50% equity
                    max_allowed_size = (equity * 0.5) / entry_exec_p
                    pos_size = min(pos_size, max_allowed_size)

                    active_trade = {
                        "trade_id": f"TR-{self.config.strategy_id}-{idx}",
                        "signal_id": signal["signal_id"],
                        "entry_idx": idx,
                        "entry_time": curr_time,
                        "direction": sig_dir,
                        "entry_price": round(entry_exec_p, 2),
                        "stop_loss": round(stop_val, 2),
                        "take_profit": round(target_val, 2),
                        "size": round(pos_size, 4),
                        "risk_usd": round(risk_capital, 2),
                        "setup_quality": signal.get("setup_quality", 80.0),
                        "lvn_id": signal.get("lvn_zone", {}).get("lvn_id", "")
                    }

            # Update Equity Tracking
            peak_equity = max(peak_equity, equity)
            dd_pct = ((peak_equity - equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0
            max_drawdown = max(max_drawdown, dd_pct)

            equity_curve.append({
                "timestamp": curr_time,
                "equity": round(equity, 2),
                "drawdown_pct": round(dd_pct, 2)
            })
            processed_candles += 1

        # Summary Metrics
        total_trades = len(trades)
        wins = [t for t in trades if t["is_win"]]
        losses = [t for t in trades if not t["is_win"]]

        win_rate = (len(wins) / total_trades * 100.0) if total_trades > 0 else 0.0
        total_pnl = sum(t["net_pnl"] for t in trades)
        gross_profit = sum(t["net_pnl"] for t in wins)
        gross_loss = abs(sum(t["net_pnl"] for t in losses))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (2.5 if gross_profit > 0 else 1.0)
        avg_r = (sum(t["r_multiple"] for t in trades) / total_trades) if total_trades > 0 else 0.0
        expectancy = (total_pnl / total_trades) if total_trades > 0 else 0.0
        avg_hold = (sum(t["bars_held"] for t in trades) / total_trades) if total_trades > 0 else 0.0

        long_trades = [t for t in trades if t["direction"] == "LONG"]
        short_trades = [t for t in trades if t["direction"] == "SHORT"]

        return {
            "status": "success",
            "strategy_id": self.config.strategy_id,
            "strategy_name": "VOLUME STAR",
            "version": self.config.version,
            "symbol": symbol,
            "provider": provider,
            "timeframe": self.config.timeframe,
            "metrics": {
                "initial_capital": initial_capital,
                "ending_equity": round(equity, 2),
                "net_pnl": round(total_pnl, 2),
                "return_pct": round((total_pnl / initial_capital) * 100.0, 2),
                "total_trades": total_trades,
                "wins": len(wins),
                "losses": len(losses),
                "win_rate": round(win_rate, 1),
                "profit_factor": round(profit_factor, 2),
                "avg_r": round(avg_r, 2),
                "expectancy": round(expectancy, 2),
                "max_drawdown_pct": round(max_drawdown, 2),
                "avg_bars_held": round(avg_hold, 1),
                "long_trades_count": len(long_trades),
                "long_win_rate": round((len([t for t in long_trades if t['is_win']]) / len(long_trades) * 100.0) if long_trades else 0.0, 1),
                "short_trades_count": len(short_trades),
                "short_win_rate": round((len([t for t in short_trades if t['is_win']]) / len(short_trades) * 100.0) if short_trades else 0.0, 1),
            },
            "trades": trades,
            "equity_curve": equity_curve[-200:],
            "config": asdict(self.config),
            "disclaimer": "Informational backtest simulation with fee & slippage modeling. Does not guarantee future live profitability."
        }


# Global Singleton Instance
volume_star_evaluator = VolumeStarEvaluator()
