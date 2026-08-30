"""
Stock Quantitative Analysis Engine
==================================
Calculates explainable, deterministic multi-factor scores and directional bias for equities.
Never generates arbitrary 'Bullish' labels: every analysis provides timeframe, indicators used,
confidence level based on data completeness, and plain-English reasoning.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import time
from market_data.stocks.models import (
    NormalizedStockQuote,
    StockTechnicals,
    StockFundamentals,
    StockAnalysisResult,
)


class StockAnalysisEngine:
    """Quantitative Scoring & Directional Bias Engine."""

    @classmethod
    def analyze_stock(
        cls,
        instrument_id: str,
        symbol: str,
        quote: Optional[NormalizedStockQuote],
        technicals: Optional[StockTechnicals],
        fundamentals: Optional[StockFundamentals] = None,
        timeframe: str = "1d"
    ) -> StockAnalysisResult:
        """Computes comprehensive quantitative analysis."""
        start_t = time.perf_counter()
        now_utc = datetime.now(timezone.utc).isoformat()
        
        indicators_used: List[str] = []
        reasons: List[str] = []
        warnings: List[str] = []
        data_points = 0

        # Base default scores
        tech_score = 50.0
        mom_score = 50.0
        liq_score = 50.0
        risk_score = 50.0
        fund_score = None
        confidence = 60.0

        if not quote:
            warnings.append("Live quote data unavailable")
            return StockAnalysisResult(
                instrument_id=instrument_id,
                symbol=symbol,
                timeframe=timeframe,
                directional_bias="NEUTRAL",
                overall_score=50.0,
                confidence_score=20.0,
                summary_explanation="Insufficient data to compute directional analysis.",
                missing_input_warnings=warnings,
                calculated_at=now_utc
            )

        data_points += 4 # LTP, OHLC, Volume
        price = quote.last_price
        change_pct = quote.change_pct or 0.0

        # 1. Momentum & Price Action Scoring
        if change_pct > 3.0:
            mom_score = 85.0
            reasons.append(f"Strong upward 24h momentum (+{change_pct:.2f}%)")
        elif change_pct > 1.0:
            mom_score = 70.0
            reasons.append(f"Positive 24h price momentum (+{change_pct:.2f}%)")
        elif change_pct < -3.0:
            mom_score = 20.0
            reasons.append(f"Sharp 24h decline ({change_pct:.2f}%)")
        elif change_pct < -1.0:
            mom_score = 35.0
            reasons.append(f"Negative 24h price momentum ({change_pct:.2f}%)")
        else:
            mom_score = 50.0
            reasons.append("Price consolidating within neutral 24h band")

        # 2. Liquidity Scoring
        rel_vol = quote.relative_volume or 1.0
        if rel_vol >= 2.0:
            liq_score = 90.0
            reasons.append(f"Surging trading volume ({rel_vol:.1f}x of 30D average)")
        elif rel_vol >= 1.2:
            liq_score = 75.0
            reasons.append("Above-average trading volume participation")
        elif rel_vol < 0.6:
            liq_score = 35.0
            reasons.append("Light volume / low market participation")
        else:
            liq_score = 60.0

        # 3. Technical Indicator Confluence
        if technicals:
            t_points = 0
            score_acc = 50.0

            # RSI evaluation
            if technicals.rsi_14 is not None:
                data_points += 1
                indicators_used.append(f"RSI(14)={technicals.rsi_14:.1f}")
                if technicals.rsi_14 >= 75.0:
                    score_acc -= 10.0
                    reasons.append(f"RSI overbought ({technicals.rsi_14:.1f})")
                elif technicals.rsi_14 >= 55.0:
                    score_acc += 15.0
                    reasons.append(f"Healthy RSI bullish zone ({technicals.rsi_14:.1f})")
                elif technicals.rsi_14 <= 30.0:
                    score_acc -= 15.0
                    reasons.append(f"RSI in oversold territory ({technicals.rsi_14:.1f})")
                elif technicals.rsi_14 <= 45.0:
                    score_acc -= 10.0

            # Moving Average Positioning
            if technicals.ema_20 and technicals.ema_50:
                data_points += 2
                indicators_used.append("EMA(20,50)")
                if price > technicals.ema_20 and technicals.ema_20 > technicals.ema_50:
                    score_acc += 18.0
                    reasons.append("Bullish moving average alignment (Price > EMA 20 > EMA 50)")
                elif price < technicals.ema_20 and technicals.ema_20 < technicals.ema_50:
                    score_acc -= 18.0
                    reasons.append("Bearish moving average alignment (Price < EMA 20 < EMA 50)")

            # MACD Histogram
            if technicals.macd_hist is not None:
                data_points += 1
                indicators_used.append(f"MACD-Hist({technicals.macd_hist:.2f})")
                if technicals.macd_hist > 0:
                    score_acc += 12.0
                    reasons.append("Positive MACD momentum histogram")
                else:
                    score_acc -= 12.0
                    reasons.append("Negative MACD momentum divergence")

            # Breakout flags
            if technicals.is_breakout:
                score_acc += 15.0
                reasons.append("20-period price breakout to the upside")
            elif technicals.is_breakdown:
                score_acc -= 15.0
                reasons.append("20-period price breakdown below support")

            tech_score = max(10.0, min(95.0, score_acc))
            confidence += 15.0

        # 4. Fundamental Quality Check
        if fundamentals and fundamentals.pe_ratio is not None:
            data_points += 3
            indicators_used.append("Fundamentals(PE,ROE)")
            f_score = 50.0
            if fundamentals.roe_pct and fundamentals.roe_pct > 15.0:
                f_score += 20.0
            if fundamentals.debt_to_equity is not None and fundamentals.debt_to_equity < 0.5:
                f_score += 15.0
            fund_score = max(20.0, min(95.0, f_score))
            confidence += 10.0
        else:
            warnings.append("Fundamental filings not active or unverified")

        # 5. Composite Weighted Overall Score
        if fund_score is not None:
            overall = (tech_score * 0.45) + (mom_score * 0.25) + (liq_score * 0.15) + (fund_score * 0.15)
        else:
            overall = (tech_score * 0.55) + (mom_score * 0.30) + (liq_score * 0.15)

        overall = round(max(5.0, min(98.0, overall)), 1)
        confidence = round(min(95.0, confidence), 1)

        # 6. Directional Bias Mapping
        if overall >= 75.0:
            bias = "STRONG_BULLISH"
        elif overall >= 60.0:
            bias = "BULLISH"
        elif overall <= 30.0:
            bias = "STRONG_BEARISH"
        elif overall <= 42.0:
            bias = "BEARISH"
        else:
            bias = "NEUTRAL"

        latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
        summary_text = f"{bias.replace('_', ' ').title()} · {overall:.0f}/100 ({timeframe.upper()}). " + ". ".join(reasons[:3]) + "."

        return StockAnalysisResult(
            instrument_id=instrument_id,
            symbol=symbol,
            timeframe=timeframe,
            directional_bias=bias,
            overall_score=overall,
            technical_score=round(tech_score, 1),
            fundamental_score=round(fund_score, 1) if fund_score is not None else None,
            liquidity_score=round(liq_score, 1),
            momentum_score=round(mom_score, 1),
            risk_score=round(risk_score, 1),
            confidence_score=confidence,
            summary_explanation=summary_text,
            indicators_used=indicators_used,
            data_points_used=data_points,
            missing_input_warnings=warnings,
            data_timestamp=quote.timestamp_exchange or now_utc,
            calculated_at=now_utc,
            calculation_latency_ms=latency_ms,
        )


global_stock_analysis_engine = StockAnalysisEngine()
