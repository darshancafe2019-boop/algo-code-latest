import urllib.request
import json
import asyncio
import websockets

def test_rest():
    print("=== Testing Delta India REST ===")
    symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'XRPUSD', 'PEPEUSD', 'SHIBUSD', '1000PEPEUSD', '1000SHIBUSD', 'BTC_INR', 'ETH_INR']
    for sym in symbols:
        try:
            req = urllib.request.Request(f'https://api.india.delta.exchange/v2/tickers/{sym}', headers={'User-Agent': 'QuantOS/1.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                r = data.get('result', {})
                print(f"{sym}: type={r.get('contract_type')}, mark={r.get('mark_price')}, spot={r.get('spot_price')}, close={r.get('close')}, oi={r.get('oi')}")
        except Exception as e:
            print(f"{sym}: not found ({e})")

async def test_ws():
    print("\n=== Testing Delta India WebSocket ===")
    url = "wss://public-socket.india.delta.exchange"
    try:
        from src.ssl_util import get_ssl_context
        ssl_ctx = get_ssl_context()
    except Exception:
        ssl_ctx = None

    async with websockets.connect(url, ssl=ssl_ctx, ping_interval=20, ping_timeout=10) as ws:
        print("Connected to", url)
        # Subscribe to ticker, ob_l1, mark_price, funding_rate for BTCUSD and ETHUSD
        sub = {
            "type": "subscribe",
            "payload": {
                "channels": [
                    {"name": "ticker", "symbols": ["BTCUSD", "ETHUSD"]},
                    {"name": "ob_l1", "symbols": ["BTCUSD", "ETHUSD"]},
                    {"name": "mark_price", "symbols": ["BTCUSD", "ETHUSD"]},
                    {"name": "funding_rate", "symbols": ["BTCUSD", "ETHUSD"]},
                ]
            }
        }
        await ws.send(json.dumps(sub))
        print("Sent subscription payload")
        
        # Read first 10 messages
        for i in range(15):
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(msg)
            print(f"WS Msg {i+1}: type={data.get('type')}, symbol={data.get('symbol') or data.get('s')}, keys={list(data.keys())}")
            if data.get('type') in ('ticker', 'v2/ticker', 'ob_l1', 'mark_price', 'funding_rate'):
                print("   Data preview:", str(data)[:200])

if __name__ == "__main__":
    test_rest()
    asyncio.run(test_ws())
