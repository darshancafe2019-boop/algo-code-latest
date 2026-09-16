"""
Universal Instrument Resolver
=============================
Maps canonical internal instruments (NIFTY, RELIANCE, BTC, option legs)
to exact provider-specific identifiers across Dhan, Delta, FYERS, and Upstox.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, Optional, Any

logger = logging.getLogger("Subscriptions.Resolver")


@dataclass
class ResolvedInstrument:
    canonical_symbol: str
    display_name: str
    asset_class: str                      # "INDIAN_EQUITIES", "INDIAN_INDICES", "CRYPTO", "OPTIONS", "FUTURES"
    exchange: str                         # "NSE", "BSE", "BINANCE", "DELTA_INDIA", "MCX"
    dhan_security_id: Optional[str] = None
    dhan_exchange_segment: Optional[str] = None
    delta_symbol: Optional[str] = None
    fyers_symbol: Optional[str] = None
    upstox_instrument_key: Optional[str] = None
    lot_size: int = 1
    tick_size: float = 0.05
    multiplier: float = 1.0


# Core Master Mappings for High-Frequency Instruments
MASTER_INSTRUMENTS: Dict[str, Dict[str, Any]] = {
    # ── Indian Indices ────────────────────────────────────────────────────────
    "NIFTY": {
        "display_name": "NIFTY 50",
        "asset_class": "INDIAN_INDICES",
        "exchange": "NSE",
        "dhan_security_id": "13",
        "dhan_exchange_segment": "IDX_I",
        "fyers_symbol": "NSE:NIFTY50-INDEX",
        "upstox_instrument_key": "NSE_INDEX|Nifty 50",
        "lot_size": 25,
        "tick_size": 0.05,
    },
    "BANKNIFTY": {
        "display_name": "NIFTY Bank",
        "asset_class": "INDIAN_INDICES",
        "exchange": "NSE",
        "dhan_security_id": "25",
        "dhan_exchange_segment": "IDX_I",
        "fyers_symbol": "NSE:NIFTYBANK-INDEX",
        "upstox_instrument_key": "NSE_INDEX|Nifty Bank",
        "lot_size": 15,
        "tick_size": 0.05,
    },
    "FINNIFTY": {
        "display_name": "NIFTY Financial Services",
        "asset_class": "INDIAN_INDICES",
        "exchange": "NSE",
        "dhan_security_id": "27",
        "dhan_exchange_segment": "IDX_I",
        "fyers_symbol": "NSE:FINNIFTY-INDEX",
        "upstox_instrument_key": "NSE_INDEX|Nifty Fin Service",
        "lot_size": 25,
        "tick_size": 0.05,
    },
    "MIDCPNIFTY": {
        "display_name": "NIFTY Midcap Select",
        "asset_class": "INDIAN_INDICES",
        "exchange": "NSE",
        "dhan_security_id": "44",
        "dhan_exchange_segment": "IDX_I",
        "fyers_symbol": "NSE:MIDCPNIFTY-INDEX",
        "upstox_instrument_key": "NSE_INDEX|NIFTY MID SELECT",
        "lot_size": 50,
        "tick_size": 0.05,
    },
    "INDIA VIX": {
        "display_name": "India VIX",
        "asset_class": "INDIAN_INDICES",
        "exchange": "NSE",
        "dhan_security_id": "1000",
        "dhan_exchange_segment": "IDX_I",
        "fyers_symbol": "NSE:INDIAVIX-INDEX",
        "upstox_instrument_key": "NSE_INDEX|India VIX",
        "lot_size": 1,
        "tick_size": 0.01,
    },
    # ── Indian Equities ───────────────────────────────────────────────────────
    "RELIANCE": {
        "display_name": "Reliance Industries Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "2885",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:RELIANCE-EQ",
        "upstox_instrument_key": "NSE_EQ|INE002A01018",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "TCS": {
        "display_name": "Tata Consultancy Services Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "11536",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:TCS-EQ",
        "upstox_instrument_key": "NSE_EQ|INE467B01029",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "HDFCBANK": {
        "display_name": "HDFC Bank Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "1333",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:HDFCBANK-EQ",
        "upstox_instrument_key": "NSE_EQ|INE040A01034",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "INFY": {
        "display_name": "Infosys Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "1594",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:INFY-EQ",
        "upstox_instrument_key": "NSE_EQ|INE009A01021",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "ICICIBANK": {
        "display_name": "ICICI Bank Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "4963",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:ICICIBANK-EQ",
        "upstox_instrument_key": "NSE_EQ|INE090A01021",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "SBIN": {
        "display_name": "State Bank of India",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "3045",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:SBIN-EQ",
        "upstox_instrument_key": "NSE_EQ|INE062A01020",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    "BHARTIARTL": {
        "display_name": "Bharti Airtel Limited",
        "asset_class": "INDIAN_EQUITIES",
        "exchange": "NSE",
        "dhan_security_id": "10604",
        "dhan_exchange_segment": "NSE_EQ",
        "fyers_symbol": "NSE:BHARTIARTL-EQ",
        "upstox_instrument_key": "NSE_EQ|INE397D01024",
        "lot_size": 1,
        "tick_size": 0.05,
    },
    # ── Crypto Perpetuals & Options ──────────────────────────────────────────
    "BTC/USDT": {
        "display_name": "Bitcoin / Tether USDT",
        "asset_class": "CRYPTO",
        "exchange": "BINANCE",
        "delta_symbol": "BTCUSDT",
        "lot_size": 1,
        "tick_size": 0.1,
    },
    "ETH/USDT": {
        "display_name": "Ethereum / Tether USDT",
        "asset_class": "CRYPTO",
        "exchange": "BINANCE",
        "delta_symbol": "ETHUSDT",
        "lot_size": 1,
        "tick_size": 0.01,
    },
    "SOL/USDT": {
        "display_name": "Solana / Tether USDT",
        "asset_class": "CRYPTO",
        "exchange": "BINANCE",
        "delta_symbol": "SOLUSDT",
        "lot_size": 1,
        "tick_size": 0.01,
    },
}


class InstrumentResolver:
    """Authoritative instrument resolver across all connected market data providers."""

    @staticmethod
    def resolve(symbol: str, provider: Optional[str] = None) -> Any:
        clean = symbol.strip().upper()
        clean = clean.replace("NSE:", "").replace("BSE:", "").replace("-EQ", "").replace("-INDEX", "")

        if clean in MASTER_INSTRUMENTS:
            meta = MASTER_INSTRUMENTS[clean]
            res = ResolvedInstrument(
                canonical_symbol=clean,
                display_name=meta.get("display_name", clean),
                asset_class=meta.get("asset_class", "INDIAN_EQUITIES"),
                exchange=meta.get("exchange", "NSE"),
                dhan_security_id=meta.get("dhan_security_id"),
                dhan_exchange_segment=meta.get("dhan_exchange_segment"),
                delta_symbol=meta.get("delta_symbol"),
                fyers_symbol=meta.get("fyers_symbol", f"NSE:{clean}-EQ"),
                upstox_instrument_key=meta.get("upstox_instrument_key"),
                lot_size=meta.get("lot_size", 1),
                tick_size=meta.get("tick_size", 0.05),
            )
        else:
            is_crypto = "/" in clean or "USDT" in clean or "BTC" in clean or "ETH" in clean or "SOL" in clean
            if is_crypto:
                delta_sym = clean.replace("/", "")
                if delta_sym in ("BTC", "ETH", "SOL", "XRP"):
                    delta_sym = f"{delta_sym}USD"
                res = ResolvedInstrument(
                    canonical_symbol=clean,
                    display_name=clean,
                    asset_class="CRYPTO",
                    exchange="DELTA_INDIA" if ("-C-" in clean or "-P-" in clean) else "BINANCE",
                    delta_symbol=delta_sym,
                )
            else:
                res = ResolvedInstrument(
                    canonical_symbol=clean,
                    display_name=clean,
                    asset_class="INDIAN_EQUITIES",
                    exchange="NSE",
                    fyers_symbol=f"NSE:{clean}-EQ",
                    upstox_instrument_key=f"NSE_EQ|{clean}",
                )

        if provider:
            prov = provider.lower()
            if prov == "fyers":
                return res.fyers_symbol or f"NSE:{res.canonical_symbol}-EQ"
            elif prov == "upstox":
                return res.upstox_instrument_key or res.canonical_symbol
            elif prov == "dhan":
                return res.dhan_security_id or res.canonical_symbol
            elif prov in ["delta", "delta_options"]:
                return res.delta_symbol or res.canonical_symbol
            return res.canonical_symbol

        return res

    @staticmethod
    def get_provider_symbol(symbol: str, provider: str) -> str:
        resolved = InstrumentResolver.resolve(symbol)
        prov = provider.lower()
        if prov == "fyers":
            return resolved.fyers_symbol or f"NSE:{resolved.canonical_symbol}-EQ"
        elif prov == "upstox":
            return resolved.upstox_instrument_key or resolved.canonical_symbol
        elif prov == "dhan":
            return resolved.dhan_security_id or resolved.canonical_symbol
        elif prov in ["delta", "delta_options"]:
            return resolved.delta_symbol or resolved.canonical_symbol
        return resolved.canonical_symbol


global_instrument_resolver = InstrumentResolver()
