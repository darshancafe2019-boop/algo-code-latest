"""
Delta Exchange Market Data Normalizer
=====================================
Normalizes Delta Exchange India tickers, L2 depth, trades, and Greeks into canonical MarketTick & NormalizedQuote.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.adapters.base import NormalizedQuote

logger = logging.getLogger("Normalizer.Delta")


class DeltaNormalizer:
    """Normalizes Delta Exchange WebSocket & REST packets into MarketTick & NormalizedQuote."""

    @staticmethod
    def normalize_ticker(raw_data: Dict[str, Any], received_at: Optional[str] = None) -> Optional[MarketTick]:
        if not isinstance(raw_data, dict):
            return None

        sym = str(raw_data.get("symbol") or "").strip()
        if not sym:
            return None

        # Price extraction (mark_price or close or last_price)
        ltp_val = raw_data.get("close") or raw_data.get("mark_price") or raw_data.get("last_price") or raw_data.get("price")
        try:
            ltp = float(ltp_val) if ltp_val is not None else None
        except (ValueError, TypeError):
            ltp = None

        if ltp is None or ltp < 0:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        raw_ts = raw_data.get("timestamp")
        event_time_iso = now_iso
        if raw_ts:
            try:
                ts_int = int(raw_ts)
                if ts_int < 10000000000:
                    event_time_iso = datetime.fromtimestamp(ts_int, timezone.utc).isoformat()
                else:
                    event_time_iso = datetime.fromtimestamp(ts_int / 1000.0, timezone.utc).isoformat()
            except Exception:
                event_time_iso = now_iso

        def _get_float(k):
            v = raw_data.get(k)
            if v is not None:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
            return None

        quotes = raw_data.get("quotes") or {}
        bid_p = _get_float("best_bid") or (float(quotes.get("best_bid")) if quotes.get("best_bid") else None)
        ask_p = _get_float("best_ask") or (float(quotes.get("best_ask")) if quotes.get("best_ask") else None)

        greeks = raw_data.get("greeks") or {}
        iv = _get_float("mark_iv") or (float(greeks.get("implied_volatility")) if greeks.get("implied_volatility") else None)

        # Asset classification
        segment = "CRYPTO_PERPETUAL"
        asset_type = "FUTURES"
        underlying = sym.split("-")[0] if "-" in sym else sym.replace("USDT", "")

        if "-C-" in sym or sym.startswith("C-"):
            segment = "CRYPTO_OPTIONS"
            asset_type = "OPTION_CALL"
        elif "-P-" in sym or sym.startswith("P-"):
            segment = "CRYPTO_OPTIONS"
            asset_type = "OPTION_PUT"

        return MarketTick(
            provider="delta",
            providerInstrumentId=sym,
            internalInstrumentId=f"CRYPTO:DELTA:{sym}",
            exchange="DELTA_INDIA",
            segment=segment,
            symbol=sym,
            underlying=underlying,
            assetType=asset_type,
            timestamp=event_time_iso,
            receivedAt=received_at or now_iso,
            rawProviderTimestamp=raw_ts,
            ltp=ltp,
            previousClose=_get_float("open"),
            open=_get_float("open"),
            high=_get_float("high"),
            low=_get_float("low"),
            close=ltp,
            volume=_get_float("volume"),
            bidPrice=bid_p,
            askPrice=ask_p,
            openInterest=_get_float("open_interest"),
            iv=iv,
            delta=float(greeks.get("delta")) if greeks.get("delta") is not None else None,
            gamma=float(greeks.get("gamma")) if greeks.get("gamma") is not None else None,
            theta=float(greeks.get("theta")) if greeks.get("theta") is not None else None,
            vega=float(greeks.get("vega")) if greeks.get("vega") is not None else None,
            rho=float(greeks.get("rho")) if greeks.get("rho") is not None else None,
            dataMode="FULL_QUOTE",
            feedStatus="LIVE",
        )


def normalize_delta_ticker(raw_data: Dict[str, Any], received_at: Optional[str] = None) -> Optional[MarketTick]:
    return DeltaNormalizer.normalize_ticker(raw_data, received_at)


def normalize_delta_l2_depth(raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return None
