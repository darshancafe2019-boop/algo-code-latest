import urllib.request
import json

print("Testing Quant.OS Service Stack...")

# 1. Frontend 3100
try:
    with urllib.request.urlopen("http://localhost:3100", timeout=5) as resp:
        print(f"[OK] Frontend (Port 3100): Status {resp.status} - Online & Serving")
except Exception as e:
    print(f"[ERR] Frontend (Port 3100): {e}")

# 2. Backend 5050
try:
    with urllib.request.urlopen("http://127.0.0.1:5050/health/live", timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"[OK] Backend (Port 5050): Status {resp.status} - {data}")
except Exception as e:
    print(f"[ERR] Backend (Port 5050): {e}")

# 3. Delta Exchange API
try:
    with urllib.request.urlopen("http://127.0.0.1:5050/api/delta/status", timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"[OK] Delta Exchange API: {data.get('brokerName')} ({data.get('network')}) - Latency: {data.get('latencyMs')}ms")
except Exception as e:
    print(f"[ERR] Delta Exchange API: {e}")
