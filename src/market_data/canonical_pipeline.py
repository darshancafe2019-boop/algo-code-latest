"""
QUANT.OS Canonical Market Data Pipeline
=========================================
Single authoritative quote validation, freshness evaluation, alias resolution,
and trade-safety engine across all market data endpoints.

Enforces:
- CanonicalQuote schema
- Fail-closed trade safety (is_tradeable = True ONLY when LIVE + VALIDATED)
- Strict non-fabrication of timestamps and prices
- Centralized freshness states: LIVE, DELAYED, STALE, UNKNOWN, INVALID, NO_DATA
"""

from __future__ import annotations

import os
import math
import time
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union

logger = logging.getLogger("CanonicalMarketDataPipeline")

# ─── Central Freshness Configuration ──────────────────────────────────────────
# Thresholds with environment overrides
def get_stale_threshold_sec() -> float:
    try:
        return float(os.environ.get("STALE_THRESHOLD_SEC", "5.0"))
    except (ValueError, TypeError):
        return 5.0

def get_delayed_threshold_sec() -> float:
    try:
        return float(os.environ.get("DELAYED_THRESHOLD_SEC", "15.0"))
    except (ValueError, TypeError):
        return 15.0

# Freshness States
STATE_LIVE = "LIVE"
STATE_DELAYED = "DELAYED"
STATE_STALE = "STALE"
STATE_UNKNOWN = "UNKNOWN"
STATE_INVALID = "INVALID"
STATE_NO_DATA = "NO_DATA"

# Data Quality States
QUALITY_VALIDATED = "VALIDATED"
QUALITY_RAW = "RAW"
QUALITY_SUSPECT = "SUSPECT"
QUALITY_REJECTED = "REJECTED"


@dataclass
class CanonicalQuote:
    """Universal Canonical Market Quote Data Model."""
    symbol: str
    exchange: str
    ltp: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: Optional[float] = None
    oi: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    change_pct: Optional[float] = None
    provider: str = "UNKNOWN"
    exchange_timestamp: Optional[int] = None      # ms epoch from source exchange
    received_timestamp: Optional[int] = None      # ms epoch when ingested by system
    age_ms: int = 0
    freshness: str = STATE_UNKNOWN
    data_quality: str = QUALITY_RAW
    is_tradeable: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─── Central Symbol Alias Resolution ─────────────────────────────────────────

def resolve_symbol_aliases(raw_symbol: Optional[str]) -> List[str]:
    """
    Centralized alias resolution for indices, equities, and crypto pairs.
    Returns deduplicated list of lookup aliases preserving lookup priority.
    """
    if not raw_symbol or not isinstance(raw_symbol, str) or not raw_symbol.strip():
        return []

    sym = raw_symbol.strip()
    norm = sym.upper()

    aliases: List[str] = [sym]
    if norm != sym:
        aliases.append(norm)

    # Index Mappings
    if norm in ("NIFTY", "NIFTY 50", "NSE:NIFTY", "NSE_INDEX|NIFTY 50"):
        canonical_set = ["NIFTY", "NIFTY 50", "NSE:NIFTY", "NSE_INDEX|Nifty 50", "^NSEI"]
        for c in canonical_set:
            if c not in aliases:
                aliases.append(c)
    elif norm in ("BANKNIFTY", "BANK NIFTY", "NSE:BANKNIFTY", "NSE_INDEX|NIFTY BANK"):
        canonical_set = ["BANKNIFTY", "BANK NIFTY", "NSE:BANKNIFTY", "NSE_INDEX|Nifty Bank", "^NSEBANK"]
        for c in canonical_set:
            if c not in aliases:
                aliases.append(c)
    elif norm in ("FINNIFTY", "FIN NIFTY", "NSE:FINNIFTY"):
        canonical_set = ["FINNIFTY", "FIN NIFTY", "NSE:FINNIFTY", "NIFTY_FIN_SERVICE.NS"]
        for c in canonical_set:
            if c not in aliases:
                aliases.append(c)
    elif norm in ("MIDCPNIFTY", "MIDCAP NIFTY", "NSE:MIDCPNIFTY"):
        canonical_set = ["MIDCPNIFTY", "MIDCAP NIFTY", "NSE:MIDCPNIFTY", "^NSEMDCP50"]
        for c in canonical_set:
            if c not in aliases:
                aliases.append(c)

    # Crypto / Currency Separators
    if "/" in norm:
        clean = norm.replace("/", "")
        if clean not in aliases:
            aliases.append(clean)
        hyphen = norm.replace("/", "-")
        if hyphen not in aliases:
            aliases.append(hyphen)
    elif "-" in norm:
        slash = norm.replace("-", "/")
        if slash not in aliases:
            aliases.append(slash)
        clean = norm.replace("-", "")
        if clean not in aliases:
            aliases.append(clean)
    else:
        # Common crypto pairings
        for quote in ["USDT", "USDC", "USD", "INR"]:
            if norm.endswith(quote) and len(norm) > len(quote):
                base = norm[:-len(quote)]
                pair = f"{base}/{quote}"
                if pair not in aliases:
                    aliases.append(pair)
                break
        # Single coin shorthand e.g. "BTC" -> "BTC/USDT", "ETH" -> "ETH/USDT"
        if norm in ("BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK"):
            pair = f"{norm}/USDT"
            if pair not in aliases:
                aliases.append(pair)

    # Deduplicate while preserving order
    seen = set()
    result = []
    for a in aliases:
        if a not in seen:
            seen.add(a)
            result.append(a)
    return result


# ─── Canonical Validation & Freshness Engine ─────────────────────────────────

def evaluate_quote_freshness(
    timestamp_val: Optional[Union[int, float, str, datetime]],
    current_time_sec: Optional[float] = None
) -> Tuple[str, int, Optional[int]]:
    """
    Evaluates quote age and freshness state according to institutional rules:
    - 0 to 5.0 seconds = LIVE
    - 5.0 to 15.0 seconds = DELAYED
    - > 15.0 seconds = STALE
    - Missing / None = UNKNOWN
    - Malformed / Negative = INVALID

    Returns: (freshness_state, age_ms, parsed_timestamp_ms)
    """
    if timestamp_val is None:
        return STATE_UNKNOWN, 0, None

    now_sec = current_time_sec if current_time_sec is not None else time.time()
    ts_sec: Optional[float] = None

    if isinstance(timestamp_val, datetime):
        if timestamp_val.tzinfo is None:
            ts_sec = timestamp_val.replace(tzinfo=timezone.utc).timestamp()
        else:
            ts_sec = timestamp_val.timestamp()
    elif isinstance(timestamp_val, (int, float)):
        # Check if NaN / Inf
        if math.isnan(timestamp_val) or math.isinf(timestamp_val):
            return STATE_INVALID, 0, None
        if timestamp_val <= 0:
            return STATE_INVALID, 0, None
        # Heuristic: if > 1e11, it is in milliseconds
        ts_sec = float(timestamp_val) / 1000.0 if timestamp_val > 1e11 else float(timestamp_val)
    elif isinstance(timestamp_val, str):
        s = timestamp_val.strip()
        if not s:
            return STATE_UNKNOWN, 0, None
        # Try numeric parse
        try:
            val_num = float(s)
            if math.isnan(val_num) or math.isinf(val_num) or val_num <= 0:
                return STATE_INVALID, 0, None
            ts_sec = val_num / 1000.0 if val_num > 1e11 else val_num
        except ValueError:
            # Try ISO parse
            try:
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                ts_sec = dt.timestamp()
            except Exception:
                return STATE_INVALID, 0, None
    else:
        return STATE_INVALID, 0, None

    if ts_sec is None or ts_sec <= 0:
        return STATE_INVALID, 0, None

    age_sec = now_sec - ts_sec
    age_ms = max(0, int(age_sec * 1000.0))
    ts_ms = int(ts_sec * 1000.0)

    stale_limit = get_stale_threshold_sec()
    delayed_limit = get_delayed_threshold_sec()

    if age_sec < 0:
        # Clock skew tolerance up to 2 seconds into future
        if abs(age_sec) <= 2.0:
            return STATE_LIVE, 0, ts_ms
        return STATE_INVALID, 0, ts_ms

    if age_sec <= stale_limit:
        return STATE_LIVE, age_ms, ts_ms
    elif age_sec <= delayed_limit:
        return STATE_DELAYED, age_ms, ts_ms
    else:
        return STATE_STALE, age_ms, ts_ms


def validate_canonical_quote(
    raw_data: Any,
    symbol: str,
    default_exchange: str = "UNKNOWN",
    default_provider: str = "UNKNOWN",
    current_time_sec: Optional[float] = None
) -> Tuple[bool, Optional[CanonicalQuote], Optional[str]]:
    """
    Validates any incoming dictionary or object against the CanonicalQuote invariants.
    Strictly rejects:
    - None price
    - Zero price
    - Negative price
    - NaN
    - Infinity
    - Missing/invalid timestamp for trade safety
    Never fabricates missing values.
    """
    if not raw_data:
        return False, None, "EMPTY_DATA"

    # Extract raw fields
    if isinstance(raw_data, dict):
        d = raw_data
    else:
        d = getattr(raw_data, "__dict__", {})

    # Extract price
    price_candidates = [
        d.get("ltp"), d.get("price"), d.get("last_price"), d.get("lastPrice"),
        d.get("last"), getattr(raw_data, "ltp", None), getattr(raw_data, "price", None),
        getattr(raw_data, "last_price", None)
    ]
    raw_price = None
    for c in price_candidates:
        if c is not None:
            raw_price = c
            break

    if raw_price is None:
        return False, None, "MISSING_PRICE"

    try:
        price_val = float(raw_price)
    except (ValueError, TypeError):
        return False, None, "INVALID_PRICE_TYPE"

    if math.isnan(price_val):
        return False, None, "NAN_PRICE"
    if math.isinf(price_val):
        return False, None, "INFINITY_PRICE"
    if price_val <= 0.0:
        return False, None, "NON_POSITIVE_PRICE"

    # Extract timestamps
    raw_ts = (
        d.get("exchange_timestamp") or d.get("timestamp") or
        d.get("event_timestamp") or d.get("source_timestamp") or
        getattr(raw_data, "exchange_timestamp", None) or
        getattr(raw_data, "timestamp", None)
    )

    freshness_state, age_ms, parsed_ts_ms = evaluate_quote_freshness(raw_ts, current_time_sec=current_time_sec)

    def _sanitize_float(val: Any) -> Optional[float]:
        if val is None:
            return None
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return None
            return f
        except (ValueError, TypeError):
            return None

    bid_val = _sanitize_float(d.get("bid", getattr(raw_data, "bid", None)))
    ask_val = _sanitize_float(d.get("ask", getattr(raw_data, "ask", None)))
    vol_val = _sanitize_float(d.get("volume", getattr(raw_data, "volume", None)))
    oi_val = _sanitize_float(d.get("oi", d.get("open_interest", getattr(raw_data, "oi", None))))
    open_val = _sanitize_float(d.get("open", getattr(raw_data, "open", None)))
    high_val = _sanitize_float(d.get("high", getattr(raw_data, "high", None)))
    low_val = _sanitize_float(d.get("low", getattr(raw_data, "low", None)))
    close_val = _sanitize_float(d.get("close", d.get("previous_close", getattr(raw_data, "close", None))))
    pct_val = _sanitize_float(d.get("change_pct", getattr(raw_data, "change_pct", None)))

    exchange_val = str(d.get("exchange", getattr(raw_data, "exchange", default_exchange)) or default_exchange)
    provider_val = str(d.get("provider", d.get("source", getattr(raw_data, "provider", default_provider))) or default_provider).upper()

    recv_ts = d.get("received_timestamp", getattr(raw_data, "received_timestamp", None))
    _, _, recv_ts_ms = evaluate_quote_freshness(recv_ts, current_time_sec=current_time_sec)

    # Determine data quality
    if freshness_state in (STATE_INVALID, STATE_UNKNOWN):
        quality = QUALITY_REJECTED if freshness_state == STATE_INVALID else QUALITY_SUSPECT
    else:
        quality = QUALITY_VALIDATED

    # Institutional Trade Safety Invariant:
    # is_tradeable = True ONLY when:
    # 1. price is valid (>0, non-NaN, non-Inf)
    # 2. timestamp is valid and present
    # 3. freshness == LIVE (<= 5s)
    # 4. data_quality == VALIDATED
    # 5. provider is healthy / not UNAVAILABLE
    is_tradeable = (
        price_val > 0.0 and
        parsed_ts_ms is not None and
        freshness_state == STATE_LIVE and
        quality == QUALITY_VALIDATED and
        provider_val not in ("UNAVAILABLE", "NONE", "UNKNOWN_PROVIDER")
    )

    quote = CanonicalQuote(
        symbol=symbol,
        exchange=exchange_val,
        ltp=price_val,
        bid=bid_val,
        ask=ask_val,
        volume=vol_val,
        oi=oi_val,
        open=open_val,
        high=high_val,
        low=low_val,
        close=close_val,
        change_pct=pct_val,
        provider=provider_val,
        exchange_timestamp=parsed_ts_ms,
        received_timestamp=recv_ts_ms,
        age_ms=age_ms,
        freshness=freshness_state,
        data_quality=quality,
        is_tradeable=is_tradeable,
    )

    return True, quote, None


# ─── Unified Quote Resolver ──────────────────────────────────────────────────

def resolve_canonical_quote(
    symbol: str,
    gateway_port: Optional[int] = None,
    timeout_sec: float = 2.5
) -> Tuple[int, Dict[str, Any]]:
    """
    Centralized resolver used by /api/market-data/ltp, /api/market/quote, /api/markets/quote.
    
    Probe sequence:
    1. Market Data Gateway (:5051)
       - Validates MARKET_GATEWAY_SECRET presence (fail-closed if missing).
       - Explicit urllib handling (HTTPError, URLError, Timeout, JSON error).
    2. Central Market Cache (global_market_cache) with symbol aliases.
    3. Ticker Service (get_ticker_service()) with real source timestamp extraction.
    4. Return structured NO_DATA when unquoted without synthesizing fake quotes.

    Returns: (http_status_code, json_response_dict)
    """
    if not symbol or not symbol.strip():
        return 400, {
            "ok": False,
            "status": "error",
            "code": "INVALID_SYMBOL",
            "symbol": "",
            "message": "Symbol query parameter is required."
        }

    clean_symbol = symbol.strip()
    aliases = resolve_symbol_aliases(clean_symbol)

    # ─── Step 1 (Fast Path): Probe Central Market Cache In-Memory ─────────────
    from src.market_data.cache_engine import global_market_cache

    for a in aliases:
        cached = global_market_cache.get_quote(a) or global_market_cache.get(a)
        if cached:
            valid, cq, err = validate_canonical_quote(
                cached,
                symbol=clean_symbol,
                default_provider="CENTRAL_CACHE"
            )
            if valid and cq and cq.freshness in (STATE_LIVE, STATE_DELAYED):
                return 200, {
                    "ok": True,
                    "status": "success",
                    "symbol": cq.symbol,
                    "price": cq.ltp,
                    "ltp": cq.ltp,
                    "previous_close": cq.close or cq.open,
                    "open": cq.open,
                    "high": cq.high,
                    "low": cq.low,
                    "close": cq.close,
                    "change_pct": cq.change_pct,
                    "source": cq.provider,
                    "provider": cq.provider,
                    "status_display": cq.freshness,
                    "freshness": cq.freshness,
                    "timestamp": cq.exchange_timestamp,
                    "ageMs": cq.age_ms,
                    "bid": cq.bid,
                    "ask": cq.ask,
                    "volume": cq.volume,
                    "oi": cq.oi,
                    "data_quality": cq.data_quality,
                    "is_tradeable": cq.is_tradeable,
                    "canonical_quote": cq.to_dict()
                }

    # ─── Step 2 (Fast Path): Probe Ticker Service In-Memory ───────────────────
    from src.ticker_service import get_ticker_service
    ticker_svc = get_ticker_service()
    if ticker_svc:
        try:
            ticker_info = ticker_svc.get_ticker(clean_symbol)
            if ticker_info and (ticker_info.get("last") or ticker_info.get("price")):
                valid, cq, err = validate_canonical_quote(
                    ticker_info,
                    symbol=clean_symbol,
                    default_provider=ticker_info.get("provider", "TICKER_SERVICE")
                )
                if valid and cq and cq.freshness in (STATE_LIVE, STATE_DELAYED):
                    return 200, {
                        "ok": True,
                        "status": "success",
                        "symbol": cq.symbol,
                        "price": cq.ltp,
                        "ltp": cq.ltp,
                        "previous_close": cq.close or cq.open,
                        "open": cq.open,
                        "high": cq.high,
                        "low": cq.low,
                        "close": cq.close,
                        "change_pct": cq.change_pct,
                        "source": cq.provider,
                        "provider": cq.provider,
                        "status_display": cq.freshness,
                        "freshness": cq.freshness,
                        "timestamp": cq.exchange_timestamp,
                        "ageMs": cq.age_ms,
                        "bid": cq.bid,
                        "ask": cq.ask,
                        "volume": cq.volume,
                        "oi": cq.oi,
                        "data_quality": cq.data_quality,
                        "is_tradeable": cq.is_tradeable,
                        "canonical_quote": cq.to_dict()
                    }
        except Exception as e:
            logger.debug("Ticker service probe exception for %s: %s", clean_symbol, e)

    # ─── Step 3: Probe Gateway :5051 (Network Fallback) ───────────────────────
    gw_secret = os.environ.get("MARKET_GATEWAY_SECRET", "").strip()
    if gw_secret:
        port = gateway_port or int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
        gateway_url = f"http://127.0.0.1:{port}/ltp?symbol={urllib.parse.quote(clean_symbol, safe='')}"

        try:
            req = urllib.request.Request(
                gateway_url,
                headers={
                    "X-Gateway-Secret": gw_secret,
                    "Accept": "application/json",
                }
            )
            probe_timeout = min(timeout_sec, 0.4)
            with urllib.request.urlopen(req, timeout=probe_timeout) as resp:
                if resp.status == 200:
                    raw_bytes = resp.read()
                    try:
                        gw_data = json.loads(raw_bytes.decode("utf-8"))
                        if gw_data.get("ok") and (gw_data.get("price") or gw_data.get("ltp")):
                            valid, cq, err = validate_canonical_quote(
                                gw_data,
                                symbol=clean_symbol,
                                default_exchange=gw_data.get("exchange", "UNKNOWN"),
                                default_provider=gw_data.get("source", "GATEWAY")
                            )
                            if valid and cq:
                                return 200, {
                                    "ok": True,
                                    "status": "success",
                                    "symbol": cq.symbol,
                                    "price": cq.ltp,
                                    "ltp": cq.ltp,
                                    "previous_close": cq.close or cq.open,
                                    "open": cq.open,
                                    "high": cq.high,
                                    "low": cq.low,
                                    "close": cq.close,
                                    "change_pct": cq.change_pct,
                                    "source": cq.provider,
                                    "provider": cq.provider,
                                    "status_display": cq.freshness,
                                    "freshness": cq.freshness,
                                    "timestamp": cq.exchange_timestamp,
                                    "ageMs": cq.age_ms,
                                    "bid": cq.bid,
                                    "ask": cq.ask,
                                    "volume": cq.volume,
                                    "oi": cq.oi,
                                    "data_quality": cq.data_quality,
                                    "is_tradeable": cq.is_tradeable,
                                    "canonical_quote": cq.to_dict()
                                }
                    except (ValueError, UnicodeDecodeError) as json_err:
                        logger.debug("Gateway :%d returned invalid JSON for %s: %s", port, clean_symbol, json_err)
        except urllib.error.HTTPError as http_err:
            try:
                err_body = json.loads(http_err.read().decode("utf-8"))
                if http_err.code in (401, 403):
                    return http_err.code, {
                        "ok": False,
                        "status": "error",
                        "code": "GATEWAY_AUTH_FAILURE",
                        "symbol": clean_symbol,
                        "message": "Gateway authentication rejected.",
                        "details": err_body
                    }
            except Exception:
                pass
        except (urllib.error.URLError, TimeoutError, ConnectionRefusedError, OSError) as net_err:
            logger.debug("Gateway probe note for %s (%s)", clean_symbol, net_err)

    # ─── Step 4: Return any known cached quote (even if stale) as fallback ────
    for a in aliases:
        cached = global_market_cache.get_quote(a) or global_market_cache.get(a)
        if cached:
            valid, cq, err = validate_canonical_quote(
                cached,
                symbol=clean_symbol,
                default_provider="CENTRAL_CACHE"
            )
            if valid and cq:
                return 200, {
                    "ok": True,
                    "status": "success",
                    "symbol": cq.symbol,
                    "price": cq.ltp,
                    "ltp": cq.ltp,
                    "previous_close": cq.close or cq.open,
                    "open": cq.open,
                    "high": cq.high,
                    "low": cq.low,
                    "close": cq.close,
                    "change_pct": cq.change_pct,
                    "source": cq.provider,
                    "provider": cq.provider,
                    "status_display": cq.freshness,
                    "freshness": cq.freshness,
                    "timestamp": cq.exchange_timestamp,
                    "ageMs": cq.age_ms,
                    "bid": cq.bid,
                    "ask": cq.ask,
                    "volume": cq.volume,
                    "oi": cq.oi,
                    "data_quality": cq.data_quality,
                    "is_tradeable": cq.is_tradeable,
                    "canonical_quote": cq.to_dict()
                }

    # ─── Step 5: Strict No-Data Response ─────────────────────────────────────
    return 404, {
        "ok": False,
        "status": "no_data",
        "code": "INSTRUMENT_NOT_FOUND",
        "symbol": clean_symbol,
        "source": "UNAVAILABLE",
        "freshness": STATE_NO_DATA,
        "data_quality": QUALITY_REJECTED,
        "is_tradeable": False,
        "message": f"No authoritative market data quote available for {clean_symbol}."
    }
