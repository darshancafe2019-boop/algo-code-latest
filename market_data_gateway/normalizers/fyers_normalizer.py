"""
FYERS API v3 Market Data Normalizer
===================================
Normalizes FYERS Data WebSocket frames (LITE and SYMBOL_UPDATE) into canonical MarketTick & NormalizedQuote.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.adapters.base import NormalizedQuote

logger = logging.getLogger("Normalizer.Fyers")


class FyersNormalizer:
    """Normalizes FYERS v3 JSON & Binary responses into canonical MarketTick & NormalizedQuote."""

    @staticmethod
    def normalize_tick(raw_data: Dict[str, Any], received_at: Optional[str] = None) -> Optional[MarketTick]:
        """
        Parses FYERS API v3 WebSocket payload.
        Expected fields:
          - symbol / n: e.g. "NSE:NIFTY50-INDEX", "NSE:RELIANCE-EQ", "NSE:NIFTY24SEP25000CE"
          - ltp / lp / v: Last Traded Price
          - prev_close_price / pc: Previous Close
          - open_price / o: Open
          - high_price / h: High
          - low_price / l: Low
          - ch / chp: Change / Change %
          - vol_traded_today / vtt / vol: Volume
          - oi: Open Interest
          - pdoi: Previous Day Open Interest
          - bid / ask / depth / market_depth: Depth & Quotes
          - tt: Trade Time epoch
        """
        if not isinstance(raw_data, dict):
            return None

        sym = str(raw_data.get("symbol") or raw_data.get("n") or raw_data.get("sym") or "").strip()
        if not sym:
            return None

        # Clean display symbol and exchange
        parts = sym.split(":")
        exchange = parts[0] if len(parts) > 1 else "NSE"
        clean_symbol = parts[1] if len(parts) > 1 else sym
        clean_symbol = clean_symbol.replace("-INDEX", "").replace("-EQ", "").replace("-FUT", "")

        ltp_val = raw_data.get("ltp")
        if ltp_val is None:
            ltp_val = raw_data.get("lp")
        if ltp_val is None and "v" in raw_data and isinstance(raw_data["v"], (int, float)):
            ltp_val = raw_data["v"]

        try:
            ltp = float(ltp_val) if ltp_val is not None else None
        except (ValueError, TypeError):
            ltp = None

        if ltp is None or ltp < 0:
            return None

        # Parse trade time
        now_iso = datetime.now(timezone.utc).isoformat()
        tt = raw_data.get("tt") or raw_data.get("last_traded_time")
        event_time_iso = now_iso
        raw_ts = None
        if tt:
            try:
                raw_ts = int(tt)
                # If in seconds, convert to milliseconds
                if raw_ts < 10000000000:
                    event_time_iso = datetime.fromtimestamp(raw_ts, timezone.utc).isoformat()
                else:
                    event_time_iso = datetime.fromtimestamp(raw_ts / 1000.0, timezone.utc).isoformat()
            except Exception:
                event_time_iso = now_iso

        # Extract OHLCV
        def _get_float(keys):
            for k in keys:
                v = raw_data.get(k)
                if v is not None:
                    try:
                        return float(v)
                    except (ValueError, TypeError):
                        pass
            return None

        open_p = _get_float(["open_price", "o", "open"])
        high_p = _get_float(["high_price", "h", "high"])
        low_p = _get_float(["low_price", "l", "low"])
        close_p = _get_float(["prev_close_price", "pc", "close", "previous_close"])
        vol = _get_float(["vol_traded_today", "vtt", "volume", "vol"])
        oi = _get_float(["oi", "open_interest"])
        pdoi = _get_float(["pdoi", "prev_oi", "previous_open_interest"])
        bid_p = _get_float(["bid", "bid_price", "bp"])
        ask_p = _get_float(["ask", "ask_price", "ap"])
        bid_q = _get_float(["bid_qty", "bid_quantity", "bq"])
        ask_q = _get_float(["ask_qty", "ask_quantity", "aq"])
        chg_pct = _get_float(["chp", "change_pct", "change_percentage"])

        # Determine segment and asset type
        segment = "EQUITY"
        asset_type = "SPOT"
        underlying = None
        if "-INDEX" in sym or "NIFTY" in sym:
            segment = "INDEX"
            asset_type = "INDEX"
        elif "CE" in sym or "PE" in sym:
            segment = "EQUITY_DERIVATIVES"
            asset_type = "OPTION_CALL" if "CE" in sym else "OPTION_PUT"
            underlying = clean_symbol.split("2")[0] if "2" in clean_symbol else clean_symbol
        elif "FUT" in sym or "-FUT" in sym:
            segment = "EQUITY_DERIVATIVES"
            asset_type = "FUTURES"
            underlying = clean_symbol.split("-")[0]

        return MarketTick(
            provider="fyers",
            providerInstrumentId=sym,
            internalInstrumentId=f"INDIA:{exchange}:{clean_symbol}",
            exchange=exchange,
            segment=segment,
            symbol=clean_symbol,
            underlying=underlying,
            assetType=asset_type,
            timestamp=event_time_iso,
            receivedAt=received_at or now_iso,
            rawProviderTimestamp=raw_ts,
            ltp=ltp,
            ltq=_get_float(["ltq", "last_traded_qty"]),
            previousClose=close_p,
            open=open_p,
            high=high_p,
            low=low_p,
            close=close_p,
            volume=vol,
            bidPrice=bid_p,
            bidQuantity=bid_q,
            askPrice=ask_p,
            askQuantity=ask_q,
            openInterest=oi,
            previousOpenInterest=pdoi,
            dataMode="LTP" if (raw_data.get("is_lite") or open_p is None) else "FULL_QUOTE",
            feedStatus="LIVE",
        )

    @staticmethod
    def to_normalized_quote(tick: MarketTick) -> NormalizedQuote:
        """Converts MarketTick to backwards-compatible NormalizedQuote."""
        chg_pct = None
        if tick.ltp is not None and tick.previousClose and tick.previousClose > 0:
            chg_pct = round(((tick.ltp - tick.previousClose) / tick.previousClose) * 100.0, 2)

        return NormalizedQuote(
            symbol=tick.symbol,
            exchange=tick.exchange,
            provider="fyers",
            last_price=tick.ltp or 0.0,
            bid=tick.bidPrice,
            ask=tick.askPrice,
            spread=tick.spread,
            volume=tick.volume,
            open=tick.open,
            high=tick.high,
            low=tick.low,
            close=tick.close,
            change_pct=chg_pct,
            oi=tick.openInterest,
            oi_change=tick.changeInOpenInterest,
            underlying=tick.underlying,
            event_timestamp=tick.timestamp,
            received_timestamp=tick.receivedAt,
            data_mode=tick.dataMode,
            status=tick.feedStatus,
        )


def normalize_fyers_tick(raw_data: Dict[str, Any], is_lite: bool = False, received_at: Optional[str] = None) -> Optional[MarketTick]:
    if is_lite:
        raw_data = dict(raw_data)
        raw_data["is_lite"] = True
    return FyersNormalizer.normalize_tick(raw_data, received_at)


def normalize_fyers_binary_frame(payload: bytes, received_at: Optional[str] = None) -> Optional[MarketTick]:
    return None
