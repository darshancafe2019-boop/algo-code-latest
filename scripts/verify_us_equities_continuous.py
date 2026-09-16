import asyncio
import json
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from market_data_gateway.gateway import MarketDataGateway

async def run_verify():
    print("\n" + "="*60)
    print("      VERIFYING CONTINUOUS LIVE UPDATES FOR AAPL, NVDA, TSLA")
    print("="*60 + "\n")
    
    gw = MarketDataGateway()
    await gw.startup()
    
    us_symbols = ["AAPL", "NVDA", "TSLA"]
    
    # Subscribe to US symbols on the Gateway
    for sym in us_symbols:
        gw.subscription_registry.subscribe(sym, reason="LIVE_MARKET_TEST")
        
    print("Subscribed to symbols:", us_symbols)
    print("Collecting continuous market ticks over 8 seconds...\n")
    
    updates_seen = {sym: [] for sym in us_symbols}
    
    start_t = time.time()
    while time.time() - start_t < 8.0:
        await asyncio.sleep(1.0)
        for sym in us_symbols:
            if sym in gw._quote_cache:
                q = gw._quote_cache[sym]
                updates_seen[sym].append((q.last_price, q.received_timestamp, q.provider, q.data_mode))
                
    print("-" * 60)
    for sym in us_symbols:
        ticks = updates_seen[sym]
        print(f"Symbol: {sym}")
        print(f"Total Ticks Received: {len(ticks)}")
        if ticks:
            last_p, last_ts, provider, mode = ticks[-1]
            first_p, first_ts, _, _ = ticks[0]
            print(f"Provider: {provider.upper()}")
            print(f"Data Mode: {mode}")
            print(f"Initial Price & Time : ${first_p} @ {first_ts}")
            print(f"Latest Price & Time  : ${last_p} @ {last_ts}")
            is_updating = len(ticks) >= 2 and (ticks[-1][1] != ticks[0][1] or ticks[-1][0] != ticks[0][0])
            print(f"Continuous Updates   : {'PASS (Updating continuously)' if is_updating else 'SINGLE SNAPSHOT'}")
        else:
            adapter = gw.failover.get_best_provider(sym)
            status = adapter.get_status() if adapter else "NO_ADAPTER"
            print(f"Status: {status} (CONFIG REQUIRED - No active API key)")
        print("-" * 60)
        
    await gw.shutdown()

if __name__ == "__main__":
    asyncio.run(run_verify())
