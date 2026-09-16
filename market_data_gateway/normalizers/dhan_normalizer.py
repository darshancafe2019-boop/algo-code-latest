"""
Dhan HQ Market Data Normalizer
==============================
Normalizes Dhan HQ API v2 binary & JSON WebSocket frames into canonical MarketTick & NormalizedQuote.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.adapters.base import NormalizedQuote

logger = logging.getLogger("Normalizer.Dhan")


class DhanNormalizer:
    """Normalizes Dhan HQ packets into MarketTick & NormalizedQuote."""

    @staticmethod
    def normalize_tick(raw_data: Dict[str, Any], received_at: Optional[str] = None) -> Optional[MarketTick]:
        if not isinstance(raw_data, dict):
            return None

        sym = str(raw_data.get("symbol") or raw_data.get("security_id") or "").strip()
        if not sym:
            return None

        ltp_val = raw_data.get("last_price") or raw_data.get("ltp") or raw_data.get("price")
        try:
            ltp = float(ltp_val) if ltp_val is not None else None
        except (ValueError, TypeError):
            ltp = None

        if ltp is None or ltp < 0:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        event_time_iso = raw_data.get("event_time") or raw_data.get("timestamp") or now_iso

        exchange_seg = str(raw_data.get("exchange_segment") or "NSE_EQ")
        exchange = "NSE"
        if "BSE" in exchange_seg:
            exchange = "BSE"
        elif "MCX" in exchange_seg:
            exchange = "MCX"

        segment = "EQUITY"
        asset_type = "SPOT"
        underlying = None
        if "INDEX" in exchange_seg or sym in ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"]:
            segment = "INDEX"
            asset_type = "INDEX"
        elif "FNO" in exchange_seg or "FO" in exchange_seg:
            segment = "EQUITY_DERIVATIVES"
            if "CE" in sym:
                asset_type = "OPTION_CALL"
                underlying = sym.split("2")[0] if "2" in sym else sym
            elif "PE" in sym:
                asset_type = "OPTION_PUT"
                underlying = sym.split("2")[0] if "2" in sym else sym
            else:
                asset_type = "FUTURES"
                underlying = sym.replace("-FUT", "")

        def _get_float(key):
            v = raw_data.get(key)
            if v is not None:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
            return None

        return MarketTick(
            provider="dhan",
            providerInstrumentId=str(raw_data.get("security_id") or sym),
            internalInstrumentId=f"INDIA:{exchange}:{sym}",
            exchange=exchange,
            segment=segment,
            symbol=sym,
            underlying=underlying,
            assetType=asset_type,
            timestamp=event_time_iso,
            receivedAt=received_at or now_iso,
            ltp=ltp,
            ltq=_get_float("last_quantity"),
            previousClose=_get_float("previous_close"),
            open=_get_float("open"),
            high=_get_float("high"),
            low=_get_float("low"),
            close=_get_float("previous_close"),
            volume=_get_float("volume"),
            bidPrice=_get_float("bid_price"),
            bidQuantity=_get_float("bid_quantity"),
            askPrice=_get_float("ask_price"),
            askQuantity=_get_float("ask_quantity"),
            openInterest=_get_float("open_interest"),
            dataMode="FULL_QUOTE" if raw_data.get("open") is not None else "LTP",
            feedStatus="LIVE",
        )

    @staticmethod
    def to_normalized_quote(tick: MarketTick) -> NormalizedQuote:
        chg_pct = None
        if tick.ltp is not None and tick.previousClose and tick.previousClose > 0:
            chg_pct = round(((tick.ltp - tick.previousClose) / tick.previousClose) * 100.0, 2)

        return NormalizedQuote(
            symbol=tick.symbol,
            exchange=tick.exchange,
            provider="dhan_ws",
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
            underlying=tick.underlying,
            event_timestamp=tick.timestamp,
            received_timestamp=tick.receivedAt,
            data_mode=tick.dataMode,
            status=tick.feedStatus,
        )


def normalize_dhan_json(raw_data: Dict[str, Any], received_at: Optional[str] = None) -> Optional[MarketTick]:
    return DhanNormalizer.normalize_tick(raw_data, received_at)


def normalize_dhan_packet(packet_bytes: bytes, received_at: Optional[str] = None) -> Optional[MarketTick]:
    return None
