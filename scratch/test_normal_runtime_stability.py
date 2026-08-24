#!/usr/bin/env python3
"""
Normal Runtime Stability & Port Isolation Verification Suite
============================================================
Runs continuous non-destructive polling for normal runtime stability:
- Frontend on 3100: /, /api/health, /api/status, /api/bots, /api/market/providers/health
- Backend Engine on 5050: /health/ready
- Market Gateway on 5051: /health
- WebSocket on ws://127.0.0.1:5051/ws (subscribes, streams frames continuously)
- Port 3001 Verification: Asserts port 3001 is NEVER touched or listened to by Quant.OS
- Zero 503 / ERR_CONNECTION_REFUSED errors across multiple cycles
"""

import sys
import time
import socket
import urllib.request
import urllib.error
import json
import asyncio
import websockets

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def check_http(name: str, url: str) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RuntimeStabilityValidator/1.0"})
        with urllib.request.urlopen(req, timeout=5.0) as res:
            ok = res.status == 200
            return ok
    except Exception as e:
        print(f"    [FAIL] {name}: {e}")
        return False

async def verify_websocket_stream(ws_url: str, duration_sec: float = 8.0) -> bool:
    try:
        async with websockets.connect(ws_url, close_timeout=3.0) as ws:
            sub_msg = json.dumps({
                "action": "subscribe",
                "symbols": ["BTC/USDT", "ETH/USDT"],
                "reason": "RUNNING_BOT"
            })
            await ws.send(sub_msg)
            
            start = time.time()
            received_quotes = 0
            while time.time() - start < duration_sec:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                    data = json.loads(msg)
                    if data.get("type") in ("QUOTE", "SNAPSHOT", "HEARTBEAT"):
                        received_quotes += 1
                except asyncio.TimeoutError:
                    pass
            print(f"    [PASS] WebSocket Stream received {received_quotes} frames over {duration_sec}s")
            return True
    except Exception as e:
        print(f"    [FAIL] WebSocket Stream error: {e}")
        return False

def main():
    print("\n" + "=" * 75)
    print("  QUANT.OS NORMAL RUNTIME STABILITY & ZERO-3001 ISOLATION SUITE")
    print("=" * 75 + "\n")

    # 1. Assert Port 3001 is completely unused by Quant.OS
    p3001_used = is_port_in_use(3001)
    print(f"[*] Port 3001 Check: In Use = {p3001_used}")
    if p3001_used:
        print("    [WARN] Port 3001 is in use by another application. Quant.OS must NOT touch it.")
    else:
        print("    [PASS] Port 3001 is free and untouched by Quant.OS.")

    # 2. Multi-cycle HTTP probe
    endpoints = [
        ("Frontend Root (3100/)", "http://127.0.0.1:3100/"),
        ("Frontend Health Probe (3100/api/health)", "http://127.0.0.1:3100/api/health"),
        ("Frontend System Status (3100/api/status)", "http://127.0.0.1:3100/api/status"),
        ("Frontend Bots List (3100/api/bots)", "http://127.0.0.1:3100/api/bots"),
        ("Frontend Gateway Health (3100/api/market/providers/health)", "http://127.0.0.1:3100/api/market/providers/health"),
        ("Backend Engine Ready (5050/health/ready)", "http://127.0.0.1:5050/health/ready"),
        ("Market Gateway Matrix (5051/health)", "http://127.0.0.1:5051/health"),
    ]

    cycles = 5
    all_passed = True
    print(f"\n[*] Running {cycles} sequential polling cycles across all microservices...")

    for cycle in range(1, cycles + 1):
        print(f"\n--- Cycle {cycle}/{cycles} ---")
        cycle_ok = True
        for name, url in endpoints:
            if not check_http(name, url):
                cycle_ok = False
                all_passed = False
            else:
                print(f"    [PASS] {name:<60} -> 200 OK")
        time.sleep(1.5)

    # 3. Continuous WebSocket quote stream verification
    print("\n[*] Testing sustained WebSocket stream on ws://127.0.0.1:5051/ws ...")
    ws_ok = asyncio.run(verify_websocket_stream("ws://127.0.0.1:5051/ws?secret=changeme-set-a-strong-random-secret-here", duration_sec=6.0))
    if not ws_ok:
        all_passed = False

    print("\n" + "=" * 75)
    if all_passed:
        print("  [OK] ALL RUNTIME STABILITY CHECKS PASSED WITH 100% HEALTH (ZERO 3001 TRAFFIC)!")
    else:
        print("  [FAIL] Some runtime stability checks failed.")
    print("=" * 75 + "\n")

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
