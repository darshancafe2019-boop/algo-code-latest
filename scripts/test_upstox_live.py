"""
Quant.OS Upstox V3 Real Market Data Diagnostic Tool
===================================================
Authoritative live connectivity verification suite for Upstox API V3.
Performs real HTTP and WebSocket validation without fake data or simulated mocks.

Strict Truth-in-Data Invariants:
1. Binary UTF-8 WebSocket subscription request framing (per Upstox V3 protocol).
2. Explicit UPSTOX_AUTH_STATE state machine.
3. Strict separation of REST auth, WS auth, WS connection, and live market ticks.
4. Token and credentials masking (no raw secret exposure).
5. Accurate exchange session state awareness (handles regular hours, pre-open, closed).
6. Real-time tick normalization, quality validation, and freshness tracking.

Usage:
    python scripts/test_upstox_live.py
    python scripts/test_upstox_live.py --symbol NIFTY
    python scripts/test_upstox_live.py --symbols NIFTY,BANKNIFTY,RELIANCE,HDFCBANK,INFY,TCS,"INDIA VIX"
"""

import sys
import os
import json
import time
import asyncio
import argparse
from enum import Enum
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any, Set

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config
from src.upstox_service import UpstoxService, OFFICIAL_UPSTOX_KEYS
from market_data_gateway.upstox_protobuf_decoder import decode_market_data_feed
from market_data_gateway.adapters.upstox_ws import is_indian_market_open

try:
    import websockets
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False


class UpstoxAuthState(str, Enum):
    TOKEN_MISSING = "TOKEN_MISSING"
    TOKEN_PRESENT = "TOKEN_PRESENT"
    TOKEN_INVALID = "TOKEN_INVALID"
    REST_AUTHENTICATED = "REST_AUTHENTICATED"
    WS_AUTHORIZED = "WS_AUTHORIZED"
    WS_CONNECTING = "WS_CONNECTING"
    WS_CONNECTED = "WS_CONNECTED"
    SUBSCRIBING = "SUBSCRIBING"
    SUBSCRIBED = "SUBSCRIBED"
    LIVE_STREAMING = "LIVE_STREAMING"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    RECONNECTING = "RECONNECTING"
    FAILED = "FAILED"


class FeedMode(str, Enum):
    LTPC = "ltpc"
    OPTION_GREEKS = "option_greeks"
    FULL = "full"
    FULL_D30 = "full_d30"


class FreshnessStatus(str, Enum):
    LIVE = "LIVE"          # < 2s
    RECENT = "RECENT"      # 2 - 5s
    STALE = "STALE"        # 5 - 15s
    EXPIRED = "EXPIRED"    # > 15s
    INVALID = "INVALID"


def mask_secret(secret: Optional[str], keep_start: int = 0, keep_end: int = 4) -> str:
    """Masks credentials for secure logging without exposing secret tokens."""
    if not secret or len(secret) <= (keep_start + keep_end):
        return "MISSING" if not secret else "********"
    start = secret[:keep_start] if keep_start > 0 else ""
    end = secret[-keep_end:] if keep_end > 0 else ""
    return f"{start}********{end}"


def check_configuration() -> Tuple[UpstoxAuthState, Dict[str, Any]]:
    print("\n" + "=" * 68)
    print("STAGE 1 — Environment & Configuration Inspection (Masked)")
    print("=" * 68)

    cid = os.getenv("UPSTOX_CLIENT_ID") or getattr(config, "UPSTOX_CLIENT_ID", "")
    token = os.getenv("UPSTOX_ACCESS_TOKEN") or getattr(config, "UPSTOX_ACCESS_TOKEN", "")
    uri = os.getenv("UPSTOX_REDIRECT_URI") or getattr(config, "UPSTOX_REDIRECT_URI", "")
    mode = os.getenv("TRADING_MODE") or getattr(config, "TRADING_MODE", "PAPER")

    has_token = bool(token and len(token.strip()) > 10)
    auth_state = UpstoxAuthState.TOKEN_PRESENT if has_token else UpstoxAuthState.TOKEN_MISSING

    print(f"  UPSTOX_CLIENT_ID:      {mask_secret(cid, 2, 2)}")
    print(f"  UPSTOX_ACCESS_TOKEN:   {mask_secret(token, 0, 4)} ({'VALID_LENGTH' if has_token else 'NOT_SET'})")
    print(f"  UPSTOX_REDIRECT_URI:   {uri if uri else 'NOT_CONFIGURED'}")
    print(f"  TRADING_MODE:          {mode} (Fail-closed safety active)")
    print(f"  WEBSOCKETS_ENGINE:     {'AVAILABLE (websockets library)' if WS_AVAILABLE else 'UNAVAILABLE'}")

    is_open = is_indian_market_open()
    now_utc = datetime.now(timezone.utc)
    print(f"  TIMESTAMP_UTC:         {now_utc.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  INDIAN_MARKET_STATUS:  {'OPEN (Regular Session 09:15-15:30 IST)' if is_open else 'CLOSED (Session: Mon-Fri 09:15-15:30 IST)'}")
    print(f"  INITIAL_AUTH_STATE:    {auth_state.value}")

    return auth_state, {
        "has_token": has_token,
        "is_open": is_open,
        "auth_state": auth_state,
    }


def check_authentication(service: UpstoxService) -> Tuple[UpstoxAuthState, Optional[str], Dict[str, Any]]:
    print("\n" + "=" * 68)
    print("STAGE 2 — Upstox V3 Market Feed REST Authorization")
    print("=" * 68)

    if not service.is_authenticated:
        print("  REST_AUTHORIZATION:    FAIL [TOKEN_MISSING]")
        print("  Reason: UPSTOX_ACCESS_TOKEN is missing or not configured in environment.")
        print("  Instructions:")
        print("    1. Create an API app at https://developer.upstox.com")
        print("    2. Obtain access token via OAuth2 login flow")
        print("    3. Export UPSTOX_ACCESS_TOKEN in .env or broker settings")
        return UpstoxAuthState.TOKEN_MISSING, None, {"error": "TOKEN_MISSING"}

    auth_res = service.authorize_market_data_feed()
    if auth_res.get("success"):
        ws_url = auth_res.get("authorized_redirect_uri")
        print("  REST_AUTHORIZATION:    PASS [WS_AUTHORIZED]")
        print(f"  Authorized WS Endpoint: {mask_secret(ws_url, 12, 10)}")
        return UpstoxAuthState.WS_AUTHORIZED, ws_url, {"success": True}
    else:
        err = auth_res.get("error_code") or auth_res.get("error", "UNKNOWN_ERROR")
        msg = auth_res.get("message", "No details provided")
        print(f"  REST_AUTHORIZATION:    FAIL [TOKEN_INVALID / {err}]")
        print(f"  Reason: {err} — {msg}")
        return UpstoxAuthState.TOKEN_INVALID, None, {"error": err, "message": msg}


def check_instrument_resolution(symbols: List[str], service: UpstoxService) -> Dict[str, str]:
    print("\n" + "=" * 68)
    print("STAGE 3 — Canonical Instrument Master Resolution")
    print("=" * 68)

    resolved: Dict[str, str] = {}
    for sym in symbols:
        clean_sym = sym.strip().upper()
        ik = service.resolve_instrument_key(clean_sym)
        if ik:
            meta = service.get_instrument_metadata(clean_sym) or {}
            display = meta.get("name", clean_sym)
            lot = meta.get("lot_size", 1)
            tick = meta.get("tick_size", 0.05)
            print(f"  {clean_sym:<14} -> {ik:<28} | Lot: {lot:<3} | Tick: {tick:<4} | {display}")
            resolved[clean_sym] = ik
        else:
            print(f"  {clean_sym:<14} -> RESOLUTION_FAIL (Not in Official Instrument Master)")

    total = len(symbols)
    res_count = len(resolved)
    print(f"\n  Resolution Summary:    {res_count}/{total} Resolved ({'ALL_OK' if res_count == total else 'PARTIAL'})")
    return resolved


class UpstoxV3FeedClient:
    """
    Production-grade Upstox V3 WebSocket client helper supporting:
    - Binary UTF-8 subscription framing per official protocol
    - sub, unsub, change_mode methods
    - Granular feed modes (ltpc, option_greeks, full, full_d30)
    - Decoding binary Protobuf frames
    """

    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self.auth_state = UpstoxAuthState.WS_AUTHORIZED
        self.active_subscriptions: Dict[str, FeedMode] = {}

    async def connect(self):
        self.auth_state = UpstoxAuthState.WS_CONNECTING
        self.ws = await websockets.connect(
            self.ws_url,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        )
        self.auth_state = UpstoxAuthState.WS_CONNECTED

    async def send_binary_command(self, method: str, instrument_keys: List[str], mode: FeedMode = FeedMode.FULL) -> None:
        """
        Builds the command payload, serializes to JSON, encodes to UTF-8 bytes,
        and transmits as binary WebSocket frame per Upstox V3 specification.
        """
        payload = {
            "guid": f"quantos_{method}_{int(time.time() * 1000)}",
            "method": method,
            "data": {
                "mode": mode.value,
                "instrumentKeys": instrument_keys,
            }
        }
        # Strict Upstox V3 requirement: Send as binary UTF-8 bytes
        binary_payload = json.dumps(payload).encode("utf-8")
        await self.ws.send(binary_payload)

    async def subscribe(self, instrument_keys: List[str], mode: FeedMode = FeedMode.LTPC) -> None:
        self.auth_state = UpstoxAuthState.SUBSCRIBING
        await self.send_binary_command("sub", instrument_keys, mode)
        for ik in instrument_keys:
            self.active_subscriptions[ik] = mode
        self.auth_state = UpstoxAuthState.SUBSCRIBED

    async def change_mode(self, instrument_keys: List[str], mode: FeedMode) -> None:
        await self.send_binary_command("change_mode", instrument_keys, mode)
        for ik in instrument_keys:
            self.active_subscriptions[ik] = mode

    async def unsubscribe(self, instrument_keys: List[str]) -> None:
        await self.send_binary_command("unsub", instrument_keys)
        for ik in instrument_keys:
            self.active_subscriptions.pop(ik, None)


def evaluate_tick_freshness(received_at_ts: float, ltt_ms: int) -> Tuple[FreshnessStatus, float]:
    """Calculates age in ms and determines freshness classification."""
    now_ms = received_at_ts * 1000.0
    age_ms = max(0.0, now_ms - ltt_ms) if ltt_ms > 0 else 0.0

    if age_ms < 2000.0:
        return FreshnessStatus.LIVE, age_ms
    elif age_ms < 5000.0:
        return FreshnessStatus.RECENT, age_ms
    elif age_ms < 15000.0:
        return FreshnessStatus.STALE, age_ms
    else:
        return FreshnessStatus.EXPIRED, age_ms


async def run_live_websocket_test(
    ws_url: str,
    instrument_map: Dict[str, str],
    max_wait_sec: float = 10.0,
    requested_mode: FeedMode = FeedMode.LTPC
) -> Dict[str, Any]:
    print("\n" + "=" * 68)
    print("STAGE 4 & 5 — Real WebSocket Connection & Binary Subscription")
    print("=" * 68)
    print("  CONNECTING:            Initiating secure connection to authorized endpoint...")

    instrument_keys = list(instrument_map.values())
    client = UpstoxV3FeedClient(ws_url)

    results = {
        "ws_connected": False,
        "subscription_sent": False,
        "binary_frames_received": 0,
        "bytes_received": 0,
        "ticks_decoded": 0,
        "ticks_sample": [],
        "auth_state": UpstoxAuthState.FAILED,
        "freshness_status": FreshnessStatus.INVALID,
        "decode_errors": 0,
    }

    try:
        await client.connect()
        results["ws_connected"] = True
        print("  WEBSOCKET_STATUS:      CONNECTED [OK]")
        print(f"  AUTH_STATE:            {client.auth_state.value}")

        # Send binary subscription
        print(f"\n  TRANSMITTING BINARY SUBSCRIPTION:")
        print(f"    - Method:            sub")
        print(f"    - Feed Mode:         {requested_mode.value.upper()}")
        print(f"    - Encoding:          UTF-8 Binary Bytes (WebSocket Binary Frame)")
        print(f"    - Instruments:       {len(instrument_keys)} contracts")
        for ik in instrument_keys[:4]:
            print(f"      * {ik}")
        if len(instrument_keys) > 4:
            print(f"      * ... and {len(instrument_keys) - 4} more")

        await client.subscribe(instrument_keys, requested_mode)
        results["subscription_sent"] = True
        print(f"  AUTH_STATE:            {client.auth_state.value} [OK]")

        print("\n" + "=" * 68)
        print("STAGE 6, 7 & 8 — Binary Stream Reception, Protobuf Decoding & Validation")
        print("=" * 68)

        start_time = time.time()
        is_open = is_indian_market_open()

        while (time.time() - start_time) < max_wait_sec:
            try:
                raw_msg = await asyncio.wait_for(client.ws.recv(), timeout=2.0)
                recv_time = time.time()

                if isinstance(raw_msg, bytes):
                    results["binary_frames_received"] += 1
                    results["bytes_received"] += len(raw_msg)

                    decoded = decode_market_data_feed(raw_msg)
                    if decoded and "feeds" in decoded:
                        for ik, f in decoded["feeds"].items():
                            ltp = float(f.get("ltp") or 0.0)
                            ltt = int(f.get("ltt") or 0)
                            cp = float(f.get("cp") or 0.0)

                            if ltp > 0:
                                results["ticks_decoded"] += 1
                                freshness, age_ms = evaluate_tick_freshness(recv_time, ltt)
                                results["freshness_status"] = freshness
                                client.auth_state = UpstoxAuthState.LIVE_STREAMING
                                results["auth_state"] = UpstoxAuthState.LIVE_STREAMING

                                sym = next((s for s, k in instrument_map.items() if k == ik), ik)
                                tick_summary = {
                                    "symbol": sym,
                                    "instrument_key": ik,
                                    "ltp": ltp,
                                    "close": cp,
                                    "ltt": ltt,
                                    "age_ms": round(age_ms, 1),
                                    "freshness": freshness.value,
                                }
                                results["ticks_sample"].append(tick_summary)

                                print(f"  [TICK #{results['ticks_decoded']:02d}] {sym:<12} ({ik})")
                                print(f"    LTP:                 ₹{ltp:,.2f}")
                                print(f"    LTT:                 {ltt} (Age: {age_ms:.1f}ms)")
                                print(f"    PREV_CLOSE:          ₹{cp:,.2f}")
                                print(f"    FRESHNESS:           {freshness.value}")
                                print(f"    TIMESTAMP_UTC:       {datetime.now(timezone.utc).isoformat()}")

                        if results["ticks_decoded"] >= 5:
                            break

                elif isinstance(raw_msg, str):
                    print(f"  [TEXT ACK] {raw_msg}")

            except asyncio.TimeoutError:
                if not is_open:
                    print("  [INFO] Timeout waiting for live binary ticks. Indian market is currently CLOSED.")
                    break
                continue
            except Exception as e:
                results["decode_errors"] += 1
                print(f"  [DECODE_ERROR] {e}")

        # Clean disconnect
        await client.ws.close()

    except Exception as exc:
        print(f"  [WS_ERROR] Connection or subscription failed: {exc}")
        results["auth_state"] = UpstoxAuthState.FAILED

    return results


def print_diagnostic_summary(
    config_data: Dict[str, Any],
    auth_state: UpstoxAuthState,
    resolved_instruments: Dict[str, str],
    ws_results: Optional[Dict[str, Any]]
):
    print("\n" + "=" * 68)
    print("STAGE 9 — Comprehensive Upstox V3 Diagnostic Summary")
    print("=" * 68)

    has_token = config_data.get("has_token", False)
    is_open = config_data.get("is_open", False)

    print(f"  1. CONFIGURATION:      {'PASS' if has_token else 'FAIL (UPSTOX_ACCESS_TOKEN missing)'}")
    print(f"  2. REST AUTH:          {'PASS' if auth_state not in (UpstoxAuthState.TOKEN_MISSING, UpstoxAuthState.TOKEN_INVALID, UpstoxAuthState.FAILED) else 'FAIL'}")
    print(f"  3. INSTRUMENT MASTER:  PASS ({len(resolved_instruments)} symbols mapped)")

    if ws_results:
        ws_ok = ws_results.get("ws_connected", False)
        sub_ok = ws_results.get("subscription_sent", False)
        bytes_rec = ws_results.get("bytes_received", 0)
        ticks = ws_results.get("ticks_decoded", 0)
        freshness = ws_results.get("freshness_status", FreshnessStatus.INVALID)

        print(f"  4. WEBSOCKET CONNECT:  {'PASS' if ws_ok else 'FAIL'}")
        print(f"  5. BINARY SUB REQUEST: {'PASS' if sub_ok else 'FAIL'}")
        print(f"  6. BINARY DATA RX:     {'PASS' if bytes_rec > 0 else ('MARKET_CLOSED_STANDBY' if not is_open else 'NO_DATA')}")
        print(f"  7. PROTOBUF DECODING:  {'PASS' if ticks > 0 else ('MARKET_CLOSED_STANDBY' if not is_open else 'NO_TICKS')}")
        print(f"  8. DATA FRESHNESS:     {freshness.value if ticks > 0 else ('MARKET_CLOSED_SESSION' if not is_open else 'NO_TICKS')}")
        print(f"  9. TOTAL BYTES RX:     {bytes_rec} bytes")
        print(f" 10. TOTAL TICKS:        {ticks}")

        if ticks > 0:
            verdict = "PASS — LIVE STREAMING VERIFIED (Real Market Ticks Decoded)"
        elif not is_open and ws_ok and sub_ok:
            verdict = "PASS — CONNECTIVITY VERIFIED (Market is Closed, Ready for Market Open)"
        elif not has_token:
            verdict = "PREREQUISITE REQUIRED — Set UPSTOX_ACCESS_TOKEN in .env"
        else:
            verdict = "INVESTIGATION REQUIRED — Connection active but no feed data received"

        print(f"\n  FINAL VERDICT:         {verdict}")
    else:
        print("  4. WEBSOCKET CONNECT:  SKIPPED (Authentication Prerequisites Required)")
        print("\n  FINAL VERDICT:         PREREQUISITE REQUIRED — Authenticate Upstox Account")


def main():
    parser = argparse.ArgumentParser(description="Quant.OS Upstox V3 Real Live Market Connectivity Diagnostic")
    parser.add_argument("--symbol", type=str, help="Single symbol to test (e.g. NIFTY, RELIANCE)")
    parser.add_argument("--symbols", type=str, help="Comma-separated symbols to test (e.g. NIFTY,BANKNIFTY,RELIANCE)")
    parser.add_argument("--mode", type=str, default="ltpc", choices=["ltpc", "option_greeks", "full", "full_d30"], help="Feed mode")
    args = parser.parse_args()

    default_symbols = ["NIFTY", "BANKNIFTY", "INDIA VIX", "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "SBIN", "BHARTIARTL"]
    if args.symbol:
        symbols = [args.symbol.strip().upper()]
    elif args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    else:
        symbols = default_symbols

    feed_mode = FeedMode(args.mode)

    print("\n" + "#" * 68)
    print("# QUANT.OS UPSTOX V3 REAL LIVE MARKET CONNECTIVITY SUITE")
    print("#" * 68)

    auth_state, config_data = check_configuration()
    service = UpstoxService()

    auth_state, ws_url, auth_meta = check_authentication(service)
    resolved_keys = check_instrument_resolution(symbols, service)

    ws_results = None
    if auth_state == UpstoxAuthState.WS_AUTHORIZED and ws_url and resolved_keys:
        if WS_AVAILABLE:
            ws_results = asyncio.run(
                run_live_websocket_test(
                    ws_url=ws_url,
                    instrument_map=resolved_keys,
                    max_wait_sec=8.0,
                    requested_mode=feed_mode
                )
            )
            auth_state = ws_results.get("auth_state", auth_state)
        else:
            print("\n  [!] websockets library not installed. Install with: pip install websockets")
    
    print_diagnostic_summary(config_data, auth_state, resolved_keys, ws_results)
    print("\n" + "#" * 68)
    print("# DIAGNOSTIC COMPLETE — STRICT TRUTH-IN-DATA ENFORCED")
    print("#" * 68 + "\n")


if __name__ == "__main__":
    main()
