"""
Test Gateway WebSocket Token Authentication Contract
=====================================================
Verifies:
1. Invalid token receives HTTP 403 Forbidden.
2. Expired token receives HTTP 403 Forbidden.
3. Valid short-lived token receives HTTP 101 Switching Protocols.
4. Server-to-server X-Gateway-Secret header receives HTTP 101 Switching Protocols.
"""
import asyncio
import hashlib
import hmac
import os
import sys
import time

# Ensure repository root is in sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

os.environ["APP_ENV"] = "production"
os.environ["MARKET_GATEWAY_SECRET"] = "test-super-secret-key-32chars!"
os.environ["AUTH_SESSION_SECRET"] = "test-session-secret-must-be-long-enough-32bytes!"
os.environ["AUTH_TOTP_ENCRYPTION_KEY"] = "z0k2l4v6x8b1d3f5h7j9l1n3p5r7t9v1"

from aiohttp import web, WSServerHandshakeError
from aiohttp.test_utils import TestServer, TestClient

import market_data_gateway.gateway as gw
from market_data_gateway.gateway import create_app, verify_gateway_token

SECRET = "test-super-secret-key-32chars!"
gw.GATEWAY_SECRET = SECRET


def make_token(user_id: str, ttl_sec: int, secret: str = SECRET) -> str:
    expires_at = int(time.time()) + ttl_sec
    payload = f"{user_id}:{expires_at}"
    sig = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


async def run_tests():
    print("=" * 70)
    print("GATEWAY WEBSOCKET AUTHENTICATION VERIFICATION TEST")
    print("=" * 70)

    # 1. Pure unit tests on verify_gateway_token
    print("\n--- 1. Testing verify_gateway_token unit logic ---")
    valid_tok = make_token("trader_01", 60)
    ok, uid, err = verify_gateway_token(valid_tok, SECRET)
    assert ok is True and uid == "trader_01", f"Expected valid token, got ok={ok}, uid={uid}, err={err}"
    print("  [PASS] Valid token parsed and verified successfully")

    expired_tok = make_token("trader_01", -10)
    ok, uid, err = verify_gateway_token(expired_tok, SECRET)
    assert ok is False and err == "Gateway token expired", f"Expected expired, got ok={ok}, err={err}"
    print("  [PASS] Expired token correctly rejected ('Gateway token expired')")

    bad_sig_tok = make_token("trader_01", 60, secret="wrong-secret")
    ok, uid, err = verify_gateway_token(bad_sig_tok, SECRET)
    assert ok is False and err == "Invalid gateway token signature", f"Expected bad sig, got ok={ok}, err={err}"
    print("  [PASS] Tampered/invalid signature correctly rejected ('Invalid gateway token signature')")

    malformed_tok = "not-a-token"
    ok, uid, err = verify_gateway_token(malformed_tok, SECRET)
    assert ok is False, f"Expected reject on malformed, got ok={ok}"
    print("  [PASS] Malformed token rejected ('Invalid gateway token format')")

    # 2. Integration tests against aiohttp Web application
    print("\n--- 2. Testing HTTP / WS Handshake against /ws ---")
    app, gateway = create_app()
    server = TestServer(app)
    client = TestClient(server)
    await client.start_server()

    try:
        # Case A: Invalid token -> HTTP 403 Forbidden
        print("\n[Case A] Connecting with INVALID token: ?token=invalid_user:12345:badhash...")
        try:
            ws = await client.ws_connect("/ws?token=invalid_user:12345:badhash")
            await ws.close()
            assert False, "Expected 403 Forbidden on invalid token, but connection succeeded"
        except WSServerHandshakeError as e:
            print(f"  Handshake error status: HTTP {e.status} ({e.message})")
            assert e.status == 403, f"Expected HTTP 403, got {e.status}"
            print("  [PASS] Invalid token received HTTP 403 Forbidden as expected!")

        # Case B: Expired token -> HTTP 403 Forbidden
        print("\n[Case B] Connecting with EXPIRED token (TTL = -60s)...")
        exp_token = make_token("alice_exp", -60)
        try:
            ws = await client.ws_connect(f"/ws?token={exp_token}")
            await ws.close()
            assert False, "Expected 403 Forbidden on expired token, but connection succeeded"
        except WSServerHandshakeError as e:
            print(f"  Handshake error status: HTTP {e.status} ({e.message})")
            assert e.status == 403, f"Expected HTTP 403, got {e.status}"
            print("  [PASS] Expired token received HTTP 403 Forbidden as expected!")

        # Case C: Valid short-lived token -> HTTP 101 Switching Protocols
        print("\n[Case C] Connecting with VALID short-lived token (TTL = +60s)...")
        val_token = make_token("bob_live", 60)
        ws = await client.ws_connect(f"/ws?token={val_token}")
        print("  WebSocket handshake succeeded! Connection state:", ws.closed is False)
        # Verify initial handshake message
        msg = await ws.receive_json(timeout=5.0)
        print("  Initial message received from gateway:", msg.get("type"))
        assert msg.get("type") == "GATEWAY_READY", f"Unexpected message: {msg}"
        await ws.close()
        print("  [PASS] Valid short-lived token received HTTP 101 Switching Protocols and GATEWAY_READY!")

        # Case D: Server-to-server static secret header -> HTTP 101 Switching Protocols
        print("\n[Case D] Connecting with X-Gateway-Secret header...")
        ws_hdr = await client.ws_connect("/ws", headers={"X-Gateway-Secret": SECRET})
        msg_hdr = await ws_hdr.receive_json(timeout=5.0)
        assert msg_hdr.get("type") == "GATEWAY_READY", f"Unexpected message: {msg_hdr}"
        await ws_hdr.close()
        print("  [PASS] X-Gateway-Secret header received HTTP 101 Switching Protocols and GATEWAY_READY!")

        print("\n" + "=" * 70)
        print("ALL GATEWAY AUTHENTICATION CONTRACT TESTS PASSED!")
        print("=" * 70)
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(run_tests())
