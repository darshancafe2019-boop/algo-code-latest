"""
Stock Market Data Normalization
===============================
Standardizes raw quotes from all connected providers into the canonical
NormalizedStockQuote model with unit-safe volume and turnover.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from market_data.stocks.models import NormalizedStockQuote
from market_data.common.decimals import to_decimal, calculate_pct_change, calculate_spread


class StockQuoteNormalizer:
    """Normalizes raw exchange / broker feeds into clean Stock Quotes."""

    USD_INR_RATE = 87.50 # Standard normalization reference

    @classmethod
    def normalize_quote(
        cls,
        raw: Dict[str, Any],
        instrument_id: str,
        symbol: str,
        exchange: str,
        currency: str,
        provider: str = "upstox",
        avg_volume_30d: Optional[float] = None
    ) -> NormalizedStockQuote:
        """Normalizes a raw equity price payload."""
        now_utc = datetime.now(timezone.utc).isoformat()
        
        last_price = float(raw.get("last_price") or raw.get("ltp") or raw.get("last") or raw.get("close") or 0.0)
        open_price = float(raw["open"]) if raw.get("open") is not None else None
        high_price = float(raw["high"]) if raw.get("high") is not None else None
        low_price = float(raw["low"]) if raw.get("low") is not None else None
        prev_close = float(raw["previous_close"]) if raw.get("previous_close") is not None else (float(raw["close"]) if raw.get("close") is not None else None)

        # Calculate exact percentage and absolute change using Decimal logic
        change_pct = raw.get("change_pct") or raw.get("change_percent") or raw.get("percent_change")
        if change_pct is not None:
            change_pct = float(change_pct)
        elif last_price and prev_close:
            change_pct = calculate_pct_change(last_price, prev_close)

        change_abs = raw.get("change_abs") or raw.get("change")
        if change_abs is not None:
            change_abs = float(change_abs)
        elif last_price and prev_close:
            change_abs = round(last_price - prev_close, 4)

        bid = float(raw["bid"]) if raw.get("bid") is not None else None
        ask = float(raw["ask"]) if raw.get("ask") is not None else None
        spread = calculate_spread(bid, ask) if bid is not None and ask is not None else None

        # Share volume vs Turnover
        vol_shares = float(raw.get("volume") or raw.get("volume_shares") or raw.get("vol") or 0.0)
        
        # Calculate Relative Volume
        rel_vol = None
        if avg_volume_30d and avg_volume_30d > 0 and vol_shares > 0:
            rel_vol = round(vol_shares / avg_volume_30d, 2)

        # Turnover calculations
        turnover_quote = raw.get("turnover") or raw.get("turnover_quote") or (last_price * vol_shares if last_price and vol_shares else None)
        if turnover_quote is not None:
            turnover_quote = float(turnover_quote)

        # Multi-currency normalization
        turnover_usd = None
        turnover_inr = None
        if turnover_quote is not None:
            if currency.upper() == "INR":
                turnover_inr = turnover_quote
                turnover_usd = round(turnover_quote / cls.USD_INR_RATE, 2)
            elif currency.upper() == "USD":
                turnover_usd = turnover_quote
                turnover_inr = round(turnover_quote * cls.USD_INR_RATE, 2)

        # 52W High / Low
        high_52w = float(raw["high_52w"]) if raw.get("high_52w") is not None else None
        low_52w = float(raw["low_52w"]) if raw.get("low_52w") is not None else None
        market_cap = float(raw["market_cap"]) if raw.get("market_cap") is not None else None
        vwap = float(raw["vwap"]) if raw.get("vwap") is not None else None

        # Status and quality
        market_status = raw.get("market_status") or "REGULAR"
        data_quality = raw.get("data_quality") or "LIVE"
        exchange_ts = raw.get("timestamp_exchange") or raw.get("timestamp") or now_utc

        return NormalizedStockQuote(
            instrument_id=instrument_id,
            symbol=symbol,
            exchange=exchange,
            currency=currency,
            last_price=last_price,
            open_price=open_price,
            high_price=high_price,
            low_price=low_price,
            previous_close=prev_close,
            change_abs=change_abs,
            change_pct=change_pct,
            bid=bid,
            ask=ask,
            bid_size=raw.get("bid_size"),
            ask_size=raw.get("ask_size"),
            spread=spread,
            volume_shares=vol_shares,
            average_volume_30d=avg_volume_30d,
            relative_volume=rel_vol,
            turnover_quote_currency=turnover_quote,
            turnover_usd=turnover_usd,
            turnover_inr=turnover_inr,
            vwap=vwap,
            market_cap=market_cap,
            high_52w=high_52w,
            low_52w=low_52w,
            market_status=market_status,
            provider=provider,
            timestamp_exchange=exchange_ts,
            timestamp_received=now_utc,
            data_age_ms=float(raw.get("data_age_ms") or 0.0),
            data_quality=data_quality,
        )
