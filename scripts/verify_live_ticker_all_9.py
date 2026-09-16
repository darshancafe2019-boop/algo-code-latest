import asyncio
import json
import os
import sys

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from market_data_gateway.gateway import MarketDataGateway

async def run_verify():
    gw = MarketDataGateway()
    await gw.startup()
    symbols = ["NIFTY", "BANKNIFTY", "GOLD", "SBIN", "HDFCBANK", "BTC", "AAPL", "NVDA", "TSLA"]
    
    # Subscribe all symbols so WebSocket adapters start emitting live ticks
    for sym in symbols:
        gw.subscription_registry.subscribe(sym, reason="LIVE_MARKET_TEST")
        
    await asyncio.sleep(2.5)

    print("\n" + "="*50)
    print("      LIVE TICKER ALL 9 INSTRUMENTS VERIFICATION REPORT")
    print("="*50 + "\n")
    
    for sym in symbols:
        class DummyURL:
            query = {"symbol": sym}
        class DummyReq:
            rel_url = DummyURL()
            
        resp = await gw.handle_ltp(DummyReq())
        data = json.loads(resp.text)
        
        ok = data.get("ok", False)
        price = float(data.get("price") or 0.0)
        source = str(data.get("source") or ("US" if sym in ("AAPL", "NVDA", "TSLA") else "DHAN")).upper()
        if sym in ("AAPL", "NVDA", "TSLA") and not ok:
            source = "US"
        resolved = str(data.get("symbol") or sym)
        status = data.get("status", "")
        code = data.get("code", "None") if not ok else "None"
        
        live_price_received = "YES" if ok and price > 0 else "NO"
        is_stale = "YES" if status == "STALE" else "NO"
        ts = data.get("timestamp") or data.get("received_at") or "-"
        
        print(f"Symbol: {sym}")
        print(f"Source: {source}")
        print(f"Resolved instrument: {resolved}")
        print(f"Live price received: {live_price_received} (Price: {price})")
        print(f"Timestamp: {ts}")
        print(f"Stale: {is_stale}")
        print(f"Error: {code}")
        print("-" * 50)
        
    await gw.shutdown()

if __name__ == "__main__":
    asyncio.run(run_verify())
