"""
Upstox V3 Real Market Data Diagnostic Tool
===========================================
Authoritative live connectivity verification suite for Upstox API V3.
Performs real HTTP and WebSocket validation without fake data or simulated mocks.

Usage:
    python scripts/test_upstox_live.py
    python scripts/test_upstox_live.py --symbol NIFTY
    python scripts/test_upstox_live.py --symbols NIFTY,BANKNIFTY,RELIANCE
"""

import sys
import os
import json
import time
import asyncio
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

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


def check_configuration():
    print("\n" + "=" * 65)
    print("TEST 1 — Configuration Check")
    print("=" * 65)
    
    cid = os.getenv("UPSTOX_CLIENT_ID") or getattr(config, "UPSTOX_CLIENT_ID", "")
    token = os.getenv("UPSTOX_ACCESS_TOKEN") or getattr(config, "UPSTOX_ACCESS_TOKEN", "")
    uri = os.getenv("UPSTOX_REDIRECT_URI") or getattr(config, "UPSTOX_REDIRECT_URI", "")
    mode = os.getenv("TRADING_MODE") or getattr(config, "TRADING_MODE", "PAPER")

    print(f"  UPSTOX_CLIENT_ID:      {'PRESENT' if bool(cid and len(cid) > 3) else 'MISSING'}")
    print(f"  UPSTOX_ACCESS_TOKEN:    {'PRESENT' if bool(token and len(token) > 10) else 'MISSING'}")
    print(f"  UPSTOX_REDIRECT_URI:   {'PRESENT' if bool(uri) else 'MISSING'}")
    print(f"  TRADING_MODE:          {mode} (Safety guard active)")
    print(f"  WEBSOCKETS_LIB:        {'INSTALLED' if WS_AVAILABLE else 'MISSING'}")
    
    is_open = is_indian_market_open()
    now_utc = datetime.now(timezone.utc)
    print(f"  CURRENT_TIME_UTC:      {now_utc.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  INDIAN_MARKET_STATUS:  {'OPEN (Regular Session)' if is_open else 'CLOSED (Session: Mon-Fri 09:15-15:30 IST)'}")
    
    return bool(token and len(token) > 10)


def check_authentication(service: UpstoxService) -> Tuple[bool, Optional[str]]:
    print("\n" + "=" * 65)
    print("TEST 2 — Upstox V3 Market Feed Authorization")
    print("=" * 65)

    if not service.is_authenticated:
        print("  AUTHENTICATION: FAIL")
        print("  Reason: UPSTOX_ACCESS_TOKEN is missing or not configured.")
        print("\n  [!] WHAT IS REQUIRED TO ENABLE LIVE DATA:")
        print("      1. Create a developer app at https://developer.upstox.com")
        print("      2. Generate an Access Token using OAuth2")
        print("      3. Add your token to .env: UPSTOX_ACCESS_TOKEN=<your_token>")
        return False, None

    auth_res = service.authorize_market_data_feed()
    if auth_res.get("success"):
        ws_url = auth_res.get("authorized_redirect_uri")
        print("  AUTHENTICATION: PASS")
        print("  Authorized WebSocket endpoint obtained successfully.")
        return True, ws_url
    else:
        err = auth_res.get("error", "UNKNOWN_ERROR")
        msg = auth_res.get("message", "No details")
        print(f"  AUTHENTICATION: FAIL")
        print(f"  Reason: {err} — {msg}")
        return False, None


def check_instrument_resolution(symbols: List[str], service: UpstoxService) -> Dict[str, str]:
    print("\n" + "=" * 65)
    print("TEST 3 — Instrument Resolution")
    print("=" * 65)
    
    resolved = {}
    all_ok = True
    for sym in symbols:
        ik = service.resolve_instrument_key(sym)
        if ik:
            print(f"  {sym:<12} -> {ik}")
            resolved[sym] = ik
        else:
            print(f"  {sym:<12} -> RESOLUTION: FAIL (Key not found in official catalog)")
            all_ok = False
            
    print(f"  Resolution Status:     {'ALL_RESOLVED' if all_ok else 'PARTIAL_FAIL'}")
    return resolved


async def run_live_websocket_test(ws_url: str, instrument_keys: List[str], max_wait_sec: float = 8.0):
    print("\n" + "=" * 65)
    print("TEST 4 — Real WebSocket Connection")
    print("=" * 65)
    print("  WEBSOCKET: CONNECTING...")
    
    try:
        async with websockets.connect(
            ws_url,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        ) as ws:
            print("  WEBSOCKET: CONNECTED")
            
            print("\n" + "=" * 65)
            print("TEST 5 — Subscription Request")
            print("=" * 65)
            
            sub_payload = {
                "guid": f"diag_{int(time.time())}",
                "method": "sub",
                "data": {
                    "mode": "ltpc",
                    "instrumentKeys": instrument_keys,
                }
            }
            await ws.send(json.dumps(sub_payload))
            print(f"  Sent V3 ltpc subscription for {len(instrument_keys)} instruments:")
            for ik in instrument_keys[:5]:
                print(f"    - {ik}")
            if len(instrument_keys) > 5:
                print(f"    ... and {len(instrument_keys) - 5} more")

            print("\n" + "=" * 65)
            print("TEST 6 & 7 — Real Binary Message & Protobuf Decoding")
            print("=" * 65)
            
            bytes_received_total = 0
            messages_received = 0
            ticks_decoded = 0
            start_time = time.time()
            is_open = is_indian_market_open()
            
            while (time.time() - start_time) < max_wait_sec:
                try:
                    raw_msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    messages_received += 1
                    
                    if isinstance(raw_msg, bytes):
                        bytes_received_total += len(raw_msg)
                        decoded = decode_market_data_feed(raw_msg)
                        if decoded and "feeds" in decoded:
                            for ik, f in decoded["feeds"].items():
                                ltp = f.get("ltp", 0.0)
                                if ltp > 0:
                                    ticks_decoded += 1
                                    print(f"  [TICK #{ticks_decoded}] {ik}")
                                    print(f"    LTP:         ₹{ltp:,.2f}")
                                    print(f"    LTT:         {f.get('ltt', 0)}")
                                    print(f"    CP:          ₹{f.get('cp', 0.0):,.2f}")
                                    print(f"    RECEIVED_AT: {datetime.now(timezone.utc).isoformat()}")
                    elif isinstance(raw_msg, str):
                        print(f"  [TEXT MSG] {raw_msg}")
                        
                    if ticks_decoded >= 3:
                        break
                except asyncio.TimeoutError:
                    if not is_open:
                        print("  [INFO] Timeout waiting for binary frames. Market is currently CLOSED.")
                        break
                    continue

            print("\n" + "=" * 65)
            print("TEST 8 — Diagnostic Summary")
            print("=" * 65)
            print(f"  BINARY MESSAGE RECEIVED: {'YES' if bytes_received_total > 0 else 'NO'}")
            print(f"  MESSAGE_BYTES:           {bytes_received_total} bytes")
            print(f"  MESSAGES_COUNT:          {messages_received}")
            print(f"  TICKS_DECODED:           {ticks_decoded}")
            
            if ticks_decoded > 0:
                print("  FEED_QUALITY:            LIVE_STREAMING (Real market ticks verified)")
            elif bytes_received_total > 0:
                print("  FEED_QUALITY:            INITIAL_FEED_RECEIVED")
            elif not is_open:
                print("  FEED_QUALITY:            MARKET_CLOSED (Socket & Auth OK, ticks inactive until market opens)")
            else:
                print("  FEED_QUALITY:            NO_TICKS_RECEIVED")

    except Exception as e:
        print(f"  WEBSOCKET ERROR: {e}")


def main():
    parser = argparse.ArgumentParser(description="Upstox V3 Real Market Data Diagnostic Tool")
    parser.add_argument("--symbol", type=str, help="Single symbol to test (e.g. NIFTY, RELIANCE)")
    parser.add_argument("--symbols", type=str, help="Comma-separated symbols to test (e.g. NIFTY,BANKNIFTY,RELIANCE)")
    args = parser.parse_args()

    symbols = ["NIFTY", "BANKNIFTY", "INDIA VIX", "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "SBIN", "BHARTIARTL"]
    if args.symbol:
        symbols = [args.symbol.strip().upper()]
    elif args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]

    print("\n" + "#" * 65)
    print("# QUANT.OS UPSTOX V3 REAL LIVE MARKET CONNECTIVITY DIAGNOSTIC")
    print("#" * 65)

    has_token = check_configuration()
    service = UpstoxService()
    
    auth_ok, ws_url = check_authentication(service)
    resolved_keys = check_instrument_resolution(symbols, service)

    if auth_ok and ws_url and resolved_keys:
        if WS_AVAILABLE:
            asyncio.run(run_live_websocket_test(ws_url, list(resolved_keys.values())))
        else:
            print("\n  [!] Cannot run WebSocket test: 'websockets' library is not installed.")
    else:
        print("\n" + "=" * 65)
        print("DIAGNOSTIC VERDICT: PREREQUISITES REQUIRED")
        print("=" * 65)
        if not has_token:
            print("  Status: WAITING_FOR_CREDENTIALS")
            print("  Live Indian data feed requires valid UPSTOX_ACCESS_TOKEN.")
        else:
            print("  Status: AUTHENTICATION_FAILED")
            print("  Please verify your API key and token permissions.")

    print("\n" + "#" * 65)
    print("# DIAGNOSTIC FINISHED (NO MOCK OR FAKE DATA GENERATED)")
    print("#" * 65 + "\n")


if __name__ == "__main__":
    main()
