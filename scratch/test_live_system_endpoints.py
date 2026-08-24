#!/usr/bin/env python3
"""
Verify Live System Endpoints on Port 3100
=========================================
Checks:
- Frontend port 3100: /api/health, /api/status, /api/bots, /api/market/providers/health
- Backend port 5050: /health/ready
- Gateway port 5051: /health
- WebSocket on ws://127.0.0.1:5051/ws
"""

import sys
import time
import urllib.request
import urllib.error
import asyncio
import websockets

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def test_http_endpoint(name: str, url: str, expected_status: int = 200) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Port3100Validator/1.0"})
        with urllib.request.urlopen(req, timeout=5.0) as res:
            ok = res.status == expected_status
            print(f"  [{'PASS' if ok else 'FAIL'}] {name:<45} -> HTTP {res.status}")
            return ok
    except Exception as e:
        print(f"  [FAIL] {name:<45} -> Error: {e}")
        return False

async def test_ws_endpoint(ws_url: str) -> bool:
    try:
        async with websockets.connect(ws_url, close_timeout=3.0) as ws:
            await ws.send('{"action":"subscribe","symbols":["BTC/USDT"],"reason":"PORT_3100_TEST"}')
            print(f"  [PASS] {'WebSocket Stream (ws://127.0.0.1:5051/ws)':<45} -> CONNECTED")
            return True
    except Exception as e:
        print(f"  [FAIL] {'WebSocket Stream (ws://127.0.0.1:5051/ws)':<45} -> Error: {e}")
        return False

def main():
    print("\n" + "=" * 70)
    print("  VERIFYING QUANT.OS ON PORT 3100 & BACKEND 5050 & GATEWAY 5051")
    print("=" * 70 + "\n")

    endpoints = [
        ("Frontend Health Probe (/api/health)", "http://127.0.0.1:3100/api/health"),
        ("Frontend System Status (/api/status)", "http://127.0.0.1:3100/api/status"),
        ("Frontend Bots List (/api/bots)", "http://127.0.0.1:3100/api/bots"),
        ("Frontend Gateway Proxy (/api/market/providers/health)", "http://127.0.0.1:3100/api/market/providers/health"),
        ("Backend Ready Probe (/health/ready)", "http://127.0.0.1:5050/health/ready"),
        ("Gateway Health Matrix (/health)", "http://127.0.0.1:5051/health"),
    ]

    all_passed = True
    for name, url in endpoints:
        if not test_http_endpoint(name, url):
            all_passed = False

    ws_ok = asyncio.run(test_ws_endpoint("ws://127.0.0.1:5051/ws?secret=changeme-set-a-strong-random-secret-here"))
    if not ws_ok:
        all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("  [OK] ALL LIVE ENDPOINTS ON PORT 3100 & 5050 & 5051 ARE HEALTHY!")
    else:
        print("  [WARN] Some endpoints did not return expected status.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
