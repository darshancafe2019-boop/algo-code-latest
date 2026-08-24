import urllib.request
import urllib.error
import re
import sys

def probe():
    print("--- 1. Probing Root http://127.0.0.1:3100/ ---")
    try:
        req = urllib.request.Request("http://127.0.0.1:3100/", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")
            print(f"Root HTML: HTTP {resp.status} (Length: {len(html)} bytes)")

            # Extract script src and css href
            scripts = re.findall(r'src="(/_next/[^"]+)"', html)
            css = re.findall(r'href="(/_next/[^"]+)"', html)
            all_assets = set(scripts + css)
            print(f"\nFound {len(all_assets)} Next.js static asset URLs in root HTML:")
            for asset in sorted(all_assets):
                try:
                    a_req = urllib.request.Request(f"http://127.0.0.1:3100{asset}", headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(a_req, timeout=5) as a_resp:
                        content = a_resp.read()
                        print(f"  [HTTP {a_resp.status}] {asset} ({len(content)} bytes)")
                except urllib.error.HTTPError as he:
                    print(f"  [HTTP {he.code} ERROR] {asset} -> {he.reason}")
                except Exception as e:
                    print(f"  [ERROR] {asset} -> {e}")

    except Exception as err:
        print(f"Failed to fetch root: {err}")

    print("\n--- 2. Probing /api/health ---")
    try:
        req = urllib.request.Request("http://127.0.0.1:3100/api/health", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"Health: HTTP {resp.status} -> {resp.read().decode('utf-8')[:200]}")
    except Exception as e:
        print(f"Health check error: {e}")

    print("\n--- 3. Probing Common Next.js Asset Paths ---")
    common_paths = [
        "/_next/static/css/app/layout.css",
        "/_next/static/chunks/main-app.js",
        "/_next/static/chunks/app-pages-internals.js",
        "/_next/static/chunks/app/layout.js",
        "/_next/static/chunks/webpack.js",
    ]
    for cp in common_paths:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:3100{cp}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                print(f"  [HTTP {resp.status}] {cp} ({len(resp.read())} bytes)")
        except urllib.error.HTTPError as he:
            print(f"  [HTTP {he.code} ERROR] {cp} -> {he.reason}")
        except Exception as e:
            print(f"  [ERROR] {cp} -> {e}")

if __name__ == "__main__":
    probe()
