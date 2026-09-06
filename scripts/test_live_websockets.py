import asyncio
import json
import urllib.request
import ssl
import websockets

async def test_binance_ws():
    url = "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker"
    print(f"\n--- Testing Binance Spot WebSocket: {url} ---")
    async with websockets.connect(url, ping_interval=20) as ws:
        for i in range(3):
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(msg)
            stream = data.get("stream")
            tick = data.get("data", {})
            print(f"Binance WS tick {i+1}: stream={stream}, symbol={tick.get('s')}, c={tick.get('c')}, v={tick.get('v')}")

async def test_delta_ws():
    url = "wss://public-socket.india.delta.exchange"
    print(f"\n--- Testing Delta India WebSocket: {url} ---")
    async with websockets.connect(url, ping_interval=20) as ws:
        sub_msg = {
            "type": "subscribe",
            "payload": {
                "channels": [
                    {"name": "ticker", "symbols": ["BTCUSD", "ETHUSD"]}
                ]
            }
        }
        await ws.send(json.dumps(sub_msg))
        print("Delta subscription sent.")
        for i in range(4):
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(msg)
            msg_type = data.get("type")
            symbol = data.get("symbol")
            mark = data.get("mark_price")
            close = data.get("close")
            print(f"Delta WS msg {i+1}: type={msg_type}, symbol={symbol}, mark={mark}, close={close}")

async def main():
    await test_binance_ws()
    await test_delta_ws()

if __name__ == "__main__":
    asyncio.run(main())
