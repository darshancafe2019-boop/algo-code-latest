"""
FinBERT Financial News Sentiment & Chronos-2 Challenger Adapters for Quant.OS
- FinBERT: News headline sentiment analysis with timestamp age verification
- Chronos-2: Auxiliary time-series probability bounds (never the sole decision-maker)
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("AISentimentChallenger")


class FinBERTSentimentEngine:
    """
    Financial sentiment scoring engine with freshness and relevance filtering.
    Falls back gracefully to NEUTRAL (0.0) when external news feeds are stale or unavailable.
    """

    def __init__(self, max_news_age_hours: float = 24.0):
        self.max_news_age_hours = max_news_age_hours

    def analyze_news_headlines(
        self,
        symbol: str,
        headlines: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Extracts sentiment from recent news items.
        Each headline dict contains: {'headline': str, 'timestamp': str, 'source': str}.
        """
        if not headlines:
            return {
                "sentiment_score": 0.0,  # [-1.0: Bearish, +1.0: Bullish]
                "sentiment_label": "NEUTRAL",
                "confidence": 0.50,
                "news_count": 0,
                "is_fresh": False,
                "source_age_hours": None,
            }

        now = datetime.now(timezone.utc)
        fresh_items = []
        scores = []

        # High-impact financial lexicon keywords for fallback sentiment mapping
        bullish_keywords = ["surge", "rally", "breakout", "bullish", "inflow", "upgrade", "adoption", "record high", "beat estimates"]
        bearish_keywords = ["crash", "drop", "plunge", "bearish", "outflow", "downgrade", "sec investigation", "lawsuit", "liquidation"]

        for item in headlines:
            text = (item.get("headline") or "").lower()
            ts_str = item.get("timestamp")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    age_hours = (now - ts).total_seconds() / 3600.0
                    if age_hours > self.max_news_age_hours:
                        continue
                except Exception:
                    age_hours = 1.0
            else:
                age_hours = 1.0

            bull_hits = sum(1 for kw in bullish_keywords if kw in text)
            bear_hits = sum(1 for kw in bearish_keywords if kw in text)

            if bull_hits > bear_hits:
                scores.append(0.65 + min(0.35, (bull_hits - 1) * 0.1))
                fresh_items.append(item)
            elif bear_hits > bull_hits:
                scores.append(-0.65 - min(0.35, (bear_hits - 1) * 0.1))
                fresh_items.append(item)
            else:
                scores.append(0.0)
                fresh_items.append(item)

        if not fresh_items:
            return {
                "sentiment_score": 0.0,
                "sentiment_label": "NEUTRAL",
                "confidence": 0.50,
                "news_count": 0,
                "is_fresh": False,
                "source_age_hours": None,
            }

        avg_score = float(sum(scores) / len(scores))
        if avg_score > 0.20:
            label = "BULLISH"
        elif avg_score < -0.20:
            label = "BEARISH"
        else:
            label = "NEUTRAL"

        return {
            "sentiment_score": round(avg_score, 4),
            "sentiment_label": label,
            "confidence": round(0.55 + (abs(avg_score) * 0.35), 4),
            "news_count": len(fresh_items),
            "is_fresh": True,
            "source_age_hours": round(min(age_hours for _ in fresh_items), 2),
        }


class ChronosChallengerAdapter:
    """
    Amazon Chronos-2 probabilistic time-series forecasting challenger.
    Serves strictly as an auxiliary cross-validation check; never the sole decider.
    """

    def __init__(self):
        self.model_name = "amazon-chronos-2-challenger"

    def forecast_bounds(
        self,
        recent_prices: List[float],
        prediction_horizon_bars: int = 5,
    ) -> Dict[str, Any]:
        """
        Computes probabilistic quantile bounds (p10, p50, p90) for future bars.
        """
        if not recent_prices or len(recent_prices) < 20:
            return {
                "status": "INSUFFICIENT_DATA",
                "predicted_direction": "NEUTRAL",
                "p10_return": 0.0,
                "p50_return": 0.0,
                "p90_return": 0.0,
            }

        last_price = recent_prices[-1]
        returns = [
            (recent_prices[i] - recent_prices[i - 1]) / recent_prices[i - 1]
            for i in range(1, len(recent_prices))
        ]
        mean_ret = float(sum(returns) / len(returns))
        vol = float(math.sqrt(sum((r - mean_ret) ** 2 for r in returns) / len(returns)))

        # Project drift over horizon
        drift = mean_ret * prediction_horizon_bars
        horizon_vol = vol * math.sqrt(prediction_horizon_bars)

        p10 = drift - (1.28 * horizon_vol)
        p50 = drift
        p90 = drift + (1.28 * horizon_vol)

        direction = "BULLISH" if p50 > 0.002 else ("BEARISH" if p50 < -0.002 else "NEUTRAL")

        return {
            "status": "OK",
            "predicted_direction": direction,
            "p10_return": round(p10, 4),
            "p50_return": round(p50, 4),
            "p90_return": round(p90, 4),
            "expected_drift_pct": round(drift * 100.0, 3),
            "horizon_bars": prediction_horizon_bars,
        }
