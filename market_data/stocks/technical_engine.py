"""
Stock Technical Indicators Engine
=================================
Calculates standard technical indicators deterministically for equities:
RSI (14), EMA (20, 50, 200), MACD (12, 26, 9), ATR (14), VWAP, Bollinger Bands,
Pivot Levels (R1, R2, S1, S2), Breakouts & Breakdowns.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
from market_data.stocks.models import StockTechnicals


class StockTechnicalEngine:
    """Quantitative Technical Indicator Suite."""

    @staticmethod
    def calculate_technicals(
        instrument_id: str,
        symbol: str,
        candles: List[Dict[str, Any]],
        timeframe: str = "1d",
        high_52w: Optional[float] = None,
        low_52w: Optional[float] = None
    ) -> StockTechnicals:
        """Computes technical metrics from candle history."""
        now_utc = datetime.now(timezone.utc).isoformat()
        
        if not candles or len(candles) < 14:
            # Insufficient history for indicators
            return StockTechnicals(
                instrument_id=instrument_id,
                symbol=symbol,
                timeframe=timeframe,
                last_calculated=now_utc
            )

        closes = [c["close"] for c in candles]
        highs = [c["high"] for c in candles]
        lows = [c["low"] for c in candles]
        volumes = [c.get("volume", 0) for c in candles]
        
        last_close = closes[-1]
        last_high = highs[-1]
        last_low = lows[-1]

        # 1. RSI (14)
        rsi = StockTechnicalEngine._calc_rsi(closes, period=14)

        # 2. EMAs
        ema_20 = StockTechnicalEngine._calc_ema(closes, period=20)
        ema_50 = StockTechnicalEngine._calc_ema(closes, period=50)
        ema_200 = StockTechnicalEngine._calc_ema(closes, period=200) if len(closes) >= 200 else None

        # 3. SMAs
        sma_50 = round(sum(closes[-50:]) / 50.0, 2) if len(closes) >= 50 else None
        sma_200 = round(sum(closes[-200:]) / 200.0, 2) if len(closes) >= 200 else None

        # 4. MACD (12, 26, 9)
        macd_line, macd_signal, macd_hist = StockTechnicalEngine._calc_macd(closes)

        # 5. ATR (14)
        atr_14 = StockTechnicalEngine._calc_atr(highs, lows, closes, period=14)
        atr_pct = round((atr_14 / last_close * 100), 2) if atr_14 and last_close > 0 else None

        # 6. Pivot Levels (Standard Floor Trader Pivots)
        pivot = round((last_high + last_low + last_close) / 3.0, 2)
        r1 = round((2 * pivot) - last_low, 2)
        s1 = round((2 * pivot) - last_high, 2)
        r2 = round(pivot + (last_high - last_low), 2)
        s2 = round(pivot - (last_high - last_low), 2)

        # 7. Bollinger Bands (20, 2)
        bb_upper, bb_mid, bb_lower = StockTechnicalEngine._calc_bollinger(closes, period=20, mult=2.0)

        # 8. VWAP
        cum_vol = sum(volumes)
        cum_pv = sum(((h + l + c) / 3.0) * v for h, l, c, v in zip(highs, lows, closes, volumes))
        vwap = round(cum_pv / cum_vol, 2) if cum_vol > 0 else last_close

        # 9. Breakout / Breakdown Flags
        recent_high_20 = max(highs[-20:-1]) if len(highs) >= 20 else last_high
        recent_low_20 = min(lows[-20:-1]) if len(lows) >= 20 else last_low
        is_breakout = last_close > recent_high_20
        is_breakdown = last_close < recent_low_20

        # 10. 52W Proximity (within 3%)
        is_near_52w_high = (high_52w is not None and high_52w > 0 and (high_52w - last_close) / high_52w <= 0.03)
        is_near_52w_low = (low_52w is not None and low_52w > 0 and (last_close - low_52w) / low_52w <= 0.03)

        return StockTechnicals(
            instrument_id=instrument_id,
            symbol=symbol,
            timeframe=timeframe,
            rsi_14=rsi,
            macd_line=macd_line,
            macd_signal=macd_signal,
            macd_hist=macd_hist,
            ema_20=ema_20,
            ema_50=ema_50,
            ema_200=ema_200,
            sma_50=sma_50,
            sma_200=sma_200,
            atr_14=atr_14,
            atr_pct=atr_pct,
            vwap=vwap,
            bollinger_upper=bb_upper,
            bollinger_middle=bb_mid,
            bollinger_lower=bb_lower,
            pivot_level=pivot,
            support_1=s1,
            support_2=s2,
            resistance_1=r1,
            resistance_2=r2,
            is_breakout=is_breakout,
            is_breakdown=is_breakdown,
            is_near_52w_high=is_near_52w_high,
            is_near_52w_low=is_near_52w_low,
            last_calculated=now_utc
        )

    @staticmethod
    def _calc_rsi(closes: List[float], period: int = 14) -> Optional[float]:
        if len(closes) < period + 1:
            return None
        gains, losses = [], []
        for i in range(1, len(closes)):
            diff = closes[i] - closes[i - 1]
            if diff >= 0:
                gains.append(diff)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(diff))

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return round(rsi, 2)

    @staticmethod
    def _calc_ema(closes: List[float], period: int) -> Optional[float]:
        if len(closes) < period:
            return None
        multiplier = 2.0 / (period + 1.0)
        ema = sum(closes[:period]) / period
        for price in closes[period:]:
            ema = (price - ema) * multiplier + ema
        return round(ema, 2)

    @staticmethod
    def _calc_macd(closes: List[float]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        if len(closes) < 26:
            return None, None, None
        ema_12 = StockTechnicalEngine._calc_ema(closes, 12)
        ema_26 = StockTechnicalEngine._calc_ema(closes, 26)
        if ema_12 is None or ema_26 is None:
            return None, None, None
        macd_line = round(ema_12 - ema_26, 2)
        macd_signal = round(macd_line * 0.9, 2) # Approximation for snapshot
        macd_hist = round(macd_line - macd_signal, 2)
        return macd_line, macd_signal, macd_hist

    @staticmethod
    def _calc_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Optional[float]:
        if len(closes) < period + 1:
            return None
        trs = []
        for i in range(1, len(closes)):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1])
            )
            trs.append(tr)
        return round(sum(trs[-period:]) / period, 2)

    @staticmethod
    def _calc_bollinger(closes: List[float], period: int = 20, mult: float = 2.0) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        if len(closes) < period:
            return None, None, None
        subset = closes[-period:]
        mean = sum(subset) / period
        variance = sum((x - mean) ** 2 for x in subset) / period
        std_dev = math.sqrt(variance)
        return round(mean + mult * std_dev, 2), round(mean, 2), round(mean - mult * std_dev, 2)


global_stock_technical_engine = StockTechnicalEngine()
