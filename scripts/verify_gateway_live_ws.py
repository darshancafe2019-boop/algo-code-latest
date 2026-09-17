import asyncio
import json
import websockets
import time

async def test_live_gateway_stream():
    uri = "ws://127.0.0.1:5051/ws"
    print(f"Connecting to Gateway WebSocket: {uri}...")
    
    async with websockets.connect(uri) as ws:
        print("Connected to Gateway WS.")
        
        # Subscribe to Binance BTC/USDT (both canonical and raw)
        sub_msg = {
            "action": "subscribe",
            "symbols": ["BINANCE:BTC/USDT", "BTC/USDT", "ETH/USDT"],
            "reason": "VERIFICATION_TEST"
        }
        await ws.send(json.dumps(sub_msg))
        print(f"Sent subscription request: {sub_msg}")
        
        received_quotes = []
        start_time = time.time()
        
        # Listen for up to 10 seconds for real ticks
        while time.time() - start_time < 10 and len(received_quotes) < 5:
            try:
                msg_raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
                msg = json.loads(msg_raw)
                msg_type = msg.get("type")
                if msg_type == "QUOTE":
                    q = msg.get("data", {})
                    received_quotes.append(q)
                    print(f"🎯 [RECEIVED LIVE QUOTE] Symbol: {q.get('symbol')} | Provider: {q.get('provider')} | Exchange: {q.get('exchange')} | LTP: {q.get('last_price')} | Latency: {q.get('feed_latency_ms')}ms | Age: {q.get('age_seconds')}s")
                elif msg_type == "HEARTBEAT":
                    print(f"💓 [HEARTBEAT] {msg.get('timestamp')}")
            except asyncio.TimeoutError:
                print("Waiting for next tick...")
                
        print(f"\nTotal live quotes received in test: {len(received_quotes)}")
        if len(received_quotes) > 0:
            for q in received_quotes:
                assert q.get("provider") in ("binance_ws", "binance", "delta_options_ws", "delta"), f"Unexpected provider: {q.get('provider')}"
                assert float(q.get("last_price", 0)) > 0, "Price must be > 0"
            print("✅ End-to-end WebSocket live tick verification PASSED!")
            return True
        else:
            print("⚠️ No live quotes received in 10s window (check internet connectivity to Binance stream).")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_live_gateway_stream())
    if not success:
        exit(1)
