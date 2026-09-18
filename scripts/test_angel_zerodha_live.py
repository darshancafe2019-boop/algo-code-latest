"""
Diagnostic test script for Angel One SmartAPI and Zerodha Kite Connect credentials.
"""
import urllib.request
import urllib.error
import json
import hashlib

ANGEL_API_KEY = "vWV7mMfq"
ZERODHA_API_KEY = "3et9e1s3cd6k9ss9"
ZERODHA_API_SECRET = "4j0fv6skn99h17e6ndmd6obvxsy230x5"

def test_angel_one():
    print("\n--- 1. TESTING ANGEL ONE SMARTAPI ---")
    url = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "00:00:00:00:00:00",
        "X-PrivateKey": ANGEL_API_KEY,
        "User-Agent": "QuantOS/1.0",
    }
    # Test probe with probe body
    body = json.dumps({
        "clientcode": "TEST_PROBE",
        "password": "0000",
        "totp": "000000"
    }).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Angel One Response: {data}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"Angel One HTTP {e.code}: {err_body}")
    except Exception as e:
        print(f"Angel One Connection Error: {e}")

def test_zerodha():
    print("\n--- 2. TESTING ZERODHA KITE CONNECT ---")
    # Test 1: Check login URL / API Key validity
    login_url = f"https://kite.zerodha.com/connect/login?v=3&api_key={ZERODHA_API_KEY}"
    print(f"Zerodha Login URL: {login_url}")
    req = urllib.request.Request(login_url, headers={"User-Agent": "Mozilla/5.0"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Zerodha Login Page Reachable: HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"Zerodha Login HTTP {e.code}")
    except Exception as e:
        print(f"Zerodha Login Error: {e}")

    # Test 2: Test session token exchange endpoint format
    session_url = "https://api.kite.trade/session/token"
    # Checksum computation standard: SHA256(api_key + request_token + api_secret)
    dummy_req_token = "dummy_request_token"
    raw_str = f"{ZERODHA_API_KEY}{dummy_req_token}{ZERODHA_API_SECRET}"
    checksum = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    data = urllib.parse.urlencode({
        "api_key": ZERODHA_API_KEY,
        "request_token": dummy_req_token,
        "checksum": checksum,
    }).encode("utf-8")

    req = urllib.request.Request(session_url, data=data, headers={
        "X-Kite-Version": "3",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "QuantOS/1.0",
    }, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Zerodha Token Response: {resp.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"Zerodha Token Endpoint Response: HTTP {e.code} -> {err_body}")
    except Exception as e:
        print(f"Zerodha Token Error: {e}")

if __name__ == "__main__":
    test_angel_one()
    test_zerodha()
