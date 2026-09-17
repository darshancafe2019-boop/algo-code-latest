"""
Upstox V3 Protobuf Market Data Normalizer
=========================================
Normalizes Upstox V3 decoded Protobuf feeds (LTPC, Full, Option Greeks, Full D30) into canonical MarketTick & NormalizedQuote.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.adapters.base import NormalizedQuote
from src.upstox_service import global_upstox_service

logger = logging.getLogger("Normalizer.Upstox")


class UpstoxNormalizer:
    """Normalizes Upstox V3 Protobuf feeds into canonical MarketTick & NormalizedQuote."""

    @staticmethod
    def normalize_feed(
        instrument_key: str,
        feed_data: Dict[str, Any],
        symbol_name: str = "",
        received_at: Optional[str] = None
    ) -> Optional[MarketTick]:
        """
        Takes decoded Upstox V3 feed payload for a single instrument key and converts to MarketTick.
        """
        if not feed_data or not isinstance(feed_data, dict):
            return None

        # LTP extraction
        ltp_val = feed_data.get("ltp")
        if ltp_val is None:
            ltp_val = feed_data.get("last_price")
        if ltp_val is None:
            return None

        try:
            ltp = float(ltp_val)
        except (ValueError, TypeError):
            return None

        if ltp < 0:
            return None

        # Determine canonical symbol
        sym = global_upstox_service.resolve_canonical_symbol(symbol_name or instrument_key)
        if not sym:
            sym = symbol_name or instrument_key
            if "|" in sym:
                sym = sym.split("|")[-1]
            sym = sym.replace("Nifty 50", "NIFTY").replace("Nifty Bank", "BANKNIFTY")

        # Exchange
        exchange = "NSE"
        if "BSE" in instrument_key:
            exchange = "BSE"
        elif "MCX" in instrument_key:
            exchange = "MCX"

        # Segment & Asset Type
        segment = "EQUITY"
        asset_type = "SPOT"
        underlying = None

        if "NSE_INDEX" in instrument_key or sym in ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "INDIA VIX"]:
            segment = "INDEX"
            asset_type = "INDEX"
        elif "NSE_FO" in instrument_key:
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

        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Timestamp parsing
        raw_ltt = feed_data.get("ltt")
        event_time_iso = now_iso
        raw_ts = None
        if raw_ltt:
            try:
                raw_ts = int(raw_ltt)
                if raw_ts < 10000000000:
                    event_time_iso = datetime.fromtimestamp(raw_ts, timezone.utc).isoformat()
                else:
                    event_time_iso = datetime.fromtimestamp(raw_ts / 1000.0, timezone.utc).isoformat()
            except Exception:
                event_time_iso = now_iso

        # OHLC & Volume
        ohlc = feed_data.get("ohlc") or {}
        open_p = ohlc.get("open")
        high_p = ohlc.get("high")
        low_p = ohlc.get("low")
        close_p = feed_data.get("cp") or feed_data.get("close") or ohlc.get("close")
        vol = feed_data.get("v") or feed_data.get("volume") or ohlc.get("vol")
        oi = feed_data.get("oi")
        
        # Greeks
        greeks = feed_data.get("greeks") or {}
        iv = greeks.get("iv") or feed_data.get("iv")
        delta = greeks.get("delta")
        gamma = greeks.get("gamma")
        theta = greeks.get("theta")
        vega = greeks.get("vega")
        rho = greeks.get("rho")

        # Top of book
        bid_p = feed_data.get("bid")
        ask_p = feed_data.get("ask")
        bid_q = feed_data.get("bid_qty")
        ask_q = feed_data.get("ask_qty")
        depth = feed_data.get("depth")

        return MarketTick(
            provider="upstox",
            providerInstrumentId=instrument_key,
            internalInstrumentId=f"INDIA:{exchange}:{sym}",
            exchange=exchange,
            segment=segment,
            symbol=sym,
            underlying=underlying,
            assetType=asset_type,
            timestamp=event_time_iso,
            receivedAt=received_at or now_iso,
            rawProviderTimestamp=raw_ts,
            ltp=ltp,
            ltq=feed_data.get("ltq"),
            previousClose=float(close_p) if close_p is not None else None,
            open=float(open_p) if open_p is not None else None,
            high=float(high_p) if high_p is not None else None,
            low=float(low_p) if low_p is not None else None,
            close=float(close_p) if close_p is not None else None,
            volume=float(vol) if vol is not None else None,
            bidPrice=float(bid_p) if bid_p is not None else None,
            bidQuantity=float(bid_q) if bid_q is not None else None,
            askPrice=float(ask_p) if ask_p is not None else None,
            askQuantity=float(ask_q) if ask_q is not None else None,
            openInterest=float(oi) if oi is not None else None,
            iv=float(iv) if iv is not None else None,
            delta=float(delta) if delta is not None else None,
            gamma=float(gamma) if gamma is not None else None,
            theta=float(theta) if theta is not None else None,
            vega=float(vega) if vega is not None else None,
            rho=float(rho) if rho is not None else None,
            marketDepth=depth,
            dataMode="FULL_QUOTE" if open_p is not None or greeks else "LTP",
            feedStatus="LIVE",
        )

    @staticmethod
    def to_normalized_quote(tick: MarketTick) -> NormalizedQuote:
        chg_pct = None
        if tick.ltp is not None and tick.previousClose and tick.previousClose > 0:
            chg_pct = round(((tick.ltp - tick.previousClose) / tick.previousClose) * 100.0, 2)

        greeks_dict = None
        if tick.delta is not None or tick.iv is not None:
            greeks_dict = {
                "iv": tick.iv,
                "delta": tick.delta,
                "gamma": tick.gamma,
                "theta": tick.theta,
                "vega": tick.vega,
                "rho": tick.rho,
            }

        return NormalizedQuote(
            symbol=tick.symbol,
            exchange=tick.exchange,
            provider="upstox_ws",
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
            iv=tick.iv,
            greeks=greeks_dict,
            depth=tick.marketDepth,
            event_timestamp=tick.timestamp,
            received_timestamp=tick.receivedAt,
            data_mode=tick.dataMode,
            status=tick.feedStatus,
        )


def normalize_upstox_feed(instrument_key: str, feed_data: Dict[str, Any], symbol_name: str = "", received_at: Optional[str] = None) -> Optional[MarketTick]:
    return UpstoxNormalizer.normalize_feed(instrument_key, feed_data, symbol_name, received_at)


def normalize_upstox_depth(depth_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return None
