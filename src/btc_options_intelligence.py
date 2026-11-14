"""Evidence-first BTC options scanner. Analysis only; never places orders."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Tuple
from datetime import datetime, timezone


WEIGHTS = {
    "price_structure": 20,
    "options_activity": 20,
    "oi_change": 20,
    "futures": 15,
    "iv_greeks": 10,
    "liquidity_volume": 15,
}


def _num(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        result = float(value)
        return result if result == result and abs(result) != float("inf") else None
    except (TypeError, ValueError):
        return None


def _rows(chain: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    rows = chain.get("strikes") or chain.get("rows") or []
    for row in rows:
        if isinstance(row, dict):
            yield row


def _legs(chains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = []
    for chain in chains:
        for row in _rows(chain):
            for side in ("call", "put"):
                leg = row.get(side)
                if isinstance(leg, dict):
                    item = dict(leg)
                    item.setdefault("option_type", side.upper())
                    item.setdefault("strike", row.get("strike"))
                    item.setdefault("expiry", chain.get("selected_expiry") or chain.get("expiry"))
                    result.append(item)
    return result


def _candle_direction(candles: List[Dict[str, Any]]) -> Optional[int]:
    valid = [c for c in candles if _num(c.get("close")) is not None]
    if len(valid) < 3:
        return None
    closes = [_num(c.get("close")) for c in valid[-8:]]
    if closes[-1] > closes[0] and closes[-1] > closes[-2]:
        return 1
    if closes[-1] < closes[0] and closes[-1] < closes[-2]:
        return -1
    return 0


def _component(score_long: Optional[float], score_short: Optional[float]) -> Tuple[float, float, bool]:
    if score_long is None or score_short is None:
        return 0.0, 0.0, False
    return max(0.0, min(1.0, score_long)), max(0.0, min(1.0, score_short)), True


def analyse_btc_options(
    chains: List[Dict[str, Any]],
    candles: Dict[str, List[Dict[str, Any]]],
    futures: Dict[str, Any],
    paper_capital: Optional[float] = None,
    risk_fraction: float = 0.005,
) -> Dict[str, Any]:
    """Return independent bullish/bearish scores with explicit data coverage."""
    legs = _legs(chains)
    long_parts: Dict[str, Optional[float]] = {k: None for k in WEIGHTS}
    short_parts: Dict[str, Optional[float]] = {k: None for k in WEIGHTS}
    evidence: List[str] = []
    missing: List[str] = []

    # Price structure: use 1h + 15m regime and 5m setup direction.
    d1h = _candle_direction(candles.get("1h", []))
    d15 = _candle_direction(candles.get("15m", []))
    d5 = _candle_direction(candles.get("5m", []))
    dirs = [d for d in (d1h, d15, d5) if d is not None]
    if len(dirs) >= 2:
        bullish = sum(d == 1 for d in dirs) / len(dirs)
        bearish = sum(d == -1 for d in dirs) / len(dirs)
        long_parts["price_structure"], short_parts["price_structure"] = bullish, bearish
        evidence.append(f"Price direction available on {len(dirs)} of 3 timeframes (1h/15m/5m).")
    else:
        missing.append("Price structure: need at least two valid 1h/15m/5m candle sets.")

    # Options activity: only directional if exchange-side aggressor fields exist.
    call_buy = call_sell = put_buy = put_sell = 0.0
    flow_seen = False
    for leg in legs:
        typ = str(leg.get("option_type", "")).upper()
        buy = _num(leg.get("taker_buy_volume") or leg.get("aggressive_buy_volume"))
        sell = _num(leg.get("taker_sell_volume") or leg.get("aggressive_sell_volume"))
        if buy is None or sell is None:
            continue
        flow_seen = True
        if typ == "CALL":
            call_buy += buy
            call_sell += sell
        elif typ == "PUT":
            put_buy += buy
            put_sell += sell
    if flow_seen:
        denom = max(call_buy + call_sell + put_buy + put_sell, 1e-12)
        bull_flow = (call_buy + put_sell) / denom
        bear_flow = (put_buy + call_sell) / denom
        long_parts["options_activity"], short_parts["options_activity"] = bull_flow, bear_flow
        evidence.append("Directional option taker-flow fields were present.")
    else:
        missing.append("Options activity: no aggressor-side call/put volume in current chain snapshot; total volume is not a substitute.")

    # OI change: require explicit prior-vs-current or exchange-provided COI fields.
    call_coi = put_coi = 0.0
    coi_seen = False
    for leg in legs:
        change = _num(leg.get("oi_change") or leg.get("change_in_open_interest") or leg.get("coi"))
        if change is None:
            continue
        coi_seen = True
        if str(leg.get("option_type", "")).upper() == "CALL":
            call_coi += change
        elif str(leg.get("option_type", "")).upper() == "PUT":
            put_coi += change
    if coi_seen:
        scale = max(abs(call_coi) + abs(put_coi), 1e-12)
        long_parts["oi_change"] = max(0.0, call_coi - put_coi) / scale
        short_parts["oi_change"] = max(0.0, put_coi - call_coi) / scale
        evidence.append("Strike-wise OI change fields were available.")
    else:
        missing.append("OI/COI: current OI may be present, but no comparable prior snapshot/change is available.")

    # Futures: use trend, OI change and funding only when supplied.
    f_oi_change = _num(futures.get("open_interest_change_pct"))
    funding = _num(futures.get("funding_rate"))
    if f_oi_change is not None and funding is not None:
        # Funding is contextual, not a standalone directional signal.
        oi_bull = 1.0 if f_oi_change > 0 else 0.0 if f_oi_change < 0 else 0.5
        funding_bull = 0.5 if funding == 0 else (0.35 if funding > 0 else 0.65)
        long_parts["futures"] = (oi_bull + funding_bull) / 2
        short_parts["futures"] = 1.0 - long_parts["futures"]
        evidence.append("Futures OI change and funding rate were available.")
    else:
        missing.append("Futures: need OI change and funding; a single OI snapshot is insufficient.")

    # Greeks/IV: coverage and quote availability, not directional inference.
    iv_values = [_num(x.get("iv") or x.get("mark_iv")) for x in legs]
    greek_values = [_num(x.get("delta")) for x in legs]
    iv_count = sum(v is not None for v in iv_values)
    greek_count = sum(v is not None for v in greek_values)
    if legs and iv_count and greek_count:
        # Neutral contribution: this category measures usable data, not bias.
        long_parts["iv_greeks"] = short_parts["iv_greeks"] = 0.5
        evidence.append(f"IV and Delta available for {iv_count} and {greek_count} contracts respectively.")
    else:
        missing.append("IV/Greeks: insufficient valid contract-level IV and Delta values.")

    # Liquidity: bid/ask quality and volume coverage.
    spreads = []
    for leg in legs:
        bid, ask = _num(leg.get("best_bid") or leg.get("bid")), _num(leg.get("best_ask") or leg.get("ask"))
        if bid is not None and ask is not None and bid > 0 and ask >= bid:
            mid = (bid + ask) / 2
            spreads.append((ask - bid) / mid if mid > 0 else None)
    spreads = [x for x in spreads if x is not None]
    if spreads:
        quality = max(0.0, min(1.0, 1.0 - (sum(spreads) / len(spreads)) / 0.10))
        long_parts["liquidity_volume"] = short_parts["liquidity_volume"] = quality
        evidence.append(f"Bid/ask spread quality computed from {len(spreads)} quoted contracts.")
    else:
        missing.append("Liquidity: no valid two-sided bid/ask quotes.")

    def score(parts: Dict[str, Optional[float]]) -> Dict[str, Any]:
        available_weight = sum(WEIGHTS[k] for k, v in parts.items() if v is not None)
        points = sum(WEIGHTS[k] * (v or 0.0) for k, v in parts.items())
        return {
            "score": round(points, 1),
            "coverage_pct": round(available_weight, 1),
            "components": {
                k: {"weight": WEIGHTS[k], "fraction": None if v is None else round(v, 3),
                    "points": None if v is None else round(WEIGHTS[k] * v, 2)}
                for k, v in parts.items()
            },
        }

    bull, bear = score(long_parts), score(short_parts)
    # A candidate cannot be promoted if essential evidence categories are absent.
    essential = all(long_parts[k] is not None for k in ("price_structure", "options_activity", "oi_change", "futures"))
    direction = "BULLISH" if bull["score"] > bear["score"] else "BEARISH" if bear["score"] > bull["score"] else "MIXED"
    validated = essential and max(bull["score"], bear["score"]) >= 65
    decision = ("BUY CALL – PAPER" if direction == "BULLISH" else "BUY PUT – PAPER") if validated else "WAIT FOR CONFIRMATION"

    risk_budget = None
    capital = _num(paper_capital)
    if capital is not None and capital > 0:
        risk_budget = round(capital * max(0.0, min(risk_fraction, 0.005)), 2)

    activity = []
    for leg in legs:
        activity.append({
            "symbol": leg.get("symbol"), "expiry": leg.get("expiry"),
            "strike": _num(leg.get("strike") or leg.get("strike_price")),
            "side": leg.get("option_type"), "volume": _num(leg.get("volume")),
            "open_interest": _num(leg.get("open_interest") or leg.get("oi")),
            "iv": _num(leg.get("iv") or leg.get("mark_iv")),
            "delta": _num(leg.get("delta")),
            "bid": _num(leg.get("best_bid") or leg.get("bid")),
            "ask": _num(leg.get("best_ask") or leg.get("ask")),
        })
    activity.sort(key=lambda x: x["volume"] if x["volume"] is not None else -1, reverse=True)

    return {
        "scanner": "BTC_OPTIONS_INTELLIGENCE",
        "mode": "PAPER",
        "live_execution_enabled": False,
        "underlying": "BTC",
        "directional_bias": direction,
        "bullish": bull,
        "bearish": bear,
        "decision": decision,
        "validated_setup": bool(validated),
        "risk_budget": risk_budget,
        "risk_fraction": min(max(risk_fraction, 0.0), 0.005),
        "expiry_count": len(chains),
        "contract_count": len(legs),
        "highest_volume_contracts": activity[:20],
        "evidence": evidence,
        "missing_data": missing,
        "data_timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Research and paper-trading analysis only. No order is created or sent.",
    }
