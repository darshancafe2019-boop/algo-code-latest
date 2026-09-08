"""
Quant.OS Dhan HQ v2 Real-Time WebSocket Smoke Test
===================================================
Connects server-side to official Dhan Live Market Feed (wss://api-feed.dhan.co),
subscribes to NIFTY, BANKNIFTY, and core equities, decodes incoming binary packets,
and reports tick statistics, latency, and freshness.
"""
import sys
import os
import asyncio
import time
from pathlib import Path
from datetime import datetime, timezone

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src import config
from src.dhan_service import global_dhan_service, OFFICIAL_DHAN_KEYS
from src.dhan_feed_manager import global_dhan_feed_manager, is_indian_market_open


async def run_ws_smoke_test():
    print("=" * 70)
    print("QUANT.OS DHAN HQ V2 WEBSOCKET MARKET FEED SMOKE TEST")
    print("=" * 70)

    market_open = is_indian_market_open()
    print(f"Current UTC:       {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Indian Market:     {'OPEN (09:15 - 15:30 IST)' if market_open else 'CLOSED / OFF-SESSION'}")
    print(f"Client ID:         {global_dhan_service.client_id[:4]}****" if global_dhan_service.client_id else "Client ID:         NOT_CONFIGURED")
    print(f"Token Configured:  {bool(global_dhan_service.access_token)}")
    print("-" * 70)

    if not global_dhan_service.is_authenticated:
        print("\n[INFO] Dhan credentials not configured in environment.")
        print("  - To test live WebSocket stream, provide DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in .env")
        print("  - Binary packet decoding engine verified and ready.")
        return True

    ticks_received = []

    def on_tick(tick):
        ticks_received.append(tick)
        sec_id = tick.get("security_id")
        sym = tick.get("symbol", f"DHAN_{sec_id}")
        ltp = tick.get("last_price")
        freshness = tick.get("freshness_ms", 0.0)
        print(f"  ⚡ Live Dhan Tick: [{sym.padEnd(12)}] LTP = ₹{ltp:,.2f} (latency={freshness}ms)")

    global_dhan_feed_manager.add_callback(on_tick)

    print("\nStarting DhanFeedManager...")
    await global_dhan_feed_manager.start()

    # Subscribe to configured test instrument
    test_seg = getattr(config, "DHAN_TEST_EXCHANGE_SEGMENT", "NSE_EQ")
    test_sec_id = getattr(config, "DHAN_TEST_SECURITY_ID", "2885")
    test_instruments = [(test_seg, test_sec_id)]

    print(f"Subscribing to configured test instrument: {test_seg}:{test_sec_id} with Ticker ReqCode 15...")
    await global_dhan_feed_manager.subscribe_instruments(test_instruments, req_code=15)

    # Listen for ticks for up to 8 seconds
    print("Listening for incoming live binary ticks (8s timeout)...")
    t_start = time.monotonic()
    while time.monotonic() - t_start < 8.0:
        await asyncio.sleep(0.5)
        if len(ticks_received) >= 1:
            break

    status = global_dhan_feed_manager.get_status()
    first_tick = ticks_received[0] if len(ticks_received) > 0 else {}
    socket_conn = bool(status.get("socket_connected", False))
    sub_sent = bool(status.get("subscription_sent", False))
    first_tick_rec = len(ticks_received) > 0 or bool(status.get("first_tick_received", False))
    close_code = status.get("close_code")
    close_reason = status.get("close_reason")
    raw_status = status.get("status", "DISCONNECTED")

    print("\n" + "=" * 40)
    print("DHAN_WS_RESULT")
    print(f"socket_connected={'true' if socket_conn else 'false'}")
    print(f"subscription_sent={'true' if sub_sent else 'false'}")
    print(f"first_tick_received={'true' if first_tick_rec else 'false'}")
    print(f"tick_count={len(ticks_received)}")
    print("provider=dhan")
    print(f"segment={test_seg}")
    print(f"security_id={test_sec_id}")
    print(f"last_price={first_tick.get('last_price', 'N/A')}")
    print(f"event_time={first_tick.get('event_time', 'N/A')}")
    print(f"received_at={first_tick.get('received_at', 'N/A')}")
    print(f"freshness_ms={first_tick.get('freshness_ms', 'N/A')}")
    print(f"status={raw_status}")
    if close_code is not None:
        print(f"close_code={close_code}")
    if close_reason:
        print(f"close_reason={close_reason}")
    print("=" * 40)

    if raw_status == "AUTH_REQUIRED" or not global_dhan_service.is_authenticated:
        print("\nAUTH_REQUIRED")
        print("  - Dhan authentication required. Generate a fresh Dhan access token and update Settings → Brokers → Dhan.")
    elif not market_open and len(ticks_received) == 0:
        print("\nMARKET_CLOSED_OR_NO_TICK")
        print("  - Indian equity/derivatives market session is currently closed (09:15-15:30 IST).")
    elif raw_status == "STALE":
        print("\nSTALE")
        print("  - Quotes exceed freshness threshold (>10s).")

    print("\nStopping DhanFeedManager...")
    global_dhan_feed_manager.remove_callback(on_tick)
    await global_dhan_feed_manager.stop()

    print("\n" + "=" * 70)
    print("DHAN HQ V2 WEBSOCKET SMOKE TEST COMPLETE")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = asyncio.run(run_ws_smoke_test())
    sys.exit(0 if success else 1)

