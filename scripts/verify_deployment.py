import urllib.request
import urllib.error
import time
import sys

endpoints = [
    ('Backend /api/health/live', 'https://algo-code-latest.onrender.com/api/health/live', False),
    ('Backend /api/health/ready', 'https://algo-code-latest.onrender.com/api/health/ready', False),
    ('Backend /api/market/providers/health', 'https://algo-code-latest.onrender.com/api/market/providers/health', False),
    ('Frontend /api/health/live', 'https://algo-code-latest.vercel.app/api/health/live', False),
    ('Frontend /api/health/ready', 'https://algo-code-latest.vercel.app/api/health/ready', False),
    ('Frontend /api/v2/system/health', 'https://algo-code-latest.vercel.app/api/v2/system/health', False),
    ('Frontend /api/v2/portfolio', 'https://algo-code-latest.vercel.app/api/v2/portfolio?environment=PAPER', False),
    ('Frontend /api/v2/positions', 'https://algo-code-latest.vercel.app/api/v2/positions?environment=PAPER', False),
    ('Frontend /api/v2/orders', 'https://algo-code-latest.vercel.app/api/v2/orders?environment=PAPER', False),
    ('Frontend /api/v2/capital/ledger', 'https://algo-code-latest.vercel.app/api/v2/capital/ledger?environment=PAPER', False),
    ('Frontend /api/market/providers', 'https://algo-code-latest.vercel.app/api/market/providers', False),
    ('Frontend /api/market/health', 'https://algo-code-latest.vercel.app/api/market/health', False),
    ('Frontend /api/market-data/stream', 'https://algo-code-latest.vercel.app/api/market-data/stream?symbols=NSE:NIFTY50', True),
    ('Frontend /api/stream/portfolio', 'https://algo-code-latest.vercel.app/api/stream/portfolio?mode=PAPER', True),
]

print("Starting deployed endpoint verification...\n", flush=True)

for label, url, is_stream in endpoints:
    t0 = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'QuantOS-Verifier/1.0',
                'Accept': 'text/event-stream' if is_stream else '*/*'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            elapsed_ms = round((time.time() - t0) * 1000)
            sample = ""
            if is_stream:
                # Read just the first chunk
                raw = res.readline()
                sample = raw.decode('utf-8', errors='replace').strip()
            else:
                raw = res.read(150)
                sample = raw.decode('utf-8', errors='replace').replace('\n', ' ')
            print(f"[HTTP {res.status:3d}] [{elapsed_ms:4d}ms] {label:<35} -> {sample[:80]}", flush=True)
    except urllib.error.HTTPError as e:
        elapsed_ms = round((time.time() - t0) * 1000)
        sample = e.read(150).decode('utf-8', errors='replace').replace('\n', ' ')
        print(f"[HTTP {e.code:3d}] [{elapsed_ms:4d}ms] {label:<35} -> {sample[:80]}", flush=True)
    except Exception as e:
        elapsed_ms = round((time.time() - t0) * 1000)
        print(f"[ERR   ] [{elapsed_ms:4d}ms] {label:<35} -> {type(e).__name__}: {e}", flush=True)

print("\nDeployed endpoint verification complete.", flush=True)

