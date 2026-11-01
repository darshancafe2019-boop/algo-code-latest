import urllib.request
import urllib.error
import time
import sys
import os

frontend_base = os.getenv("FRONTEND_URL", "https://prismatic-crisp-399e2a.netlify.app").rstrip("/")

endpoints = [
    ('Backend /api/health/live', 'https://algo-code-latest.onrender.com/api/health/live', False),
    ('Backend /api/health/ready', 'https://algo-code-latest.onrender.com/api/health/ready', False),
    ('Backend /api/market/providers/health', 'https://algo-code-latest.onrender.com/api/market/providers/health', False),
    ('Frontend /api/health/live', f'{frontend_base}/api/health/live', False),
    ('Frontend /api/health/ready', f'{frontend_base}/api/health/ready', False),
    ('Frontend /api/v2/system/health', f'{frontend_base}/api/v2/system/health', False),
    ('Frontend /api/v2/portfolio', f'{frontend_base}/api/v2/portfolio?environment=PAPER', False),
    ('Frontend /api/v2/positions', f'{frontend_base}/api/v2/positions?environment=PAPER', False),
    ('Frontend /api/v2/orders', f'{frontend_base}/api/v2/orders?environment=PAPER', False),
    ('Frontend /api/v2/capital/ledger', f'{frontend_base}/api/v2/capital/ledger?environment=PAPER', False),
    ('Frontend /api/market/providers', f'{frontend_base}/api/market/providers', False),
    ('Frontend /api/market/health', f'{frontend_base}/api/market/health', False),
    ('Frontend /api/market-data/stream', f'{frontend_base}/api/market-data/stream?symbols=NSE:NIFTY50', True),
    ('Frontend /api/stream/portfolio', f'{frontend_base}/api/stream/portfolio?mode=PAPER', True),
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

