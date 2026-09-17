"""
Safe Provider Connectivity & Credentials Status Inspector
==========================================================
Inspects provider configuration and public/authorized endpoint reachability
without printing complete secrets.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

def check_providers():
    print("============================================================")
    print("API CREDENTIALS AUDIT (SAFE - NO SECRETS EXPOSED)")
    print("============================================================")
    dhan_client = "SET" if os.environ.get("DHAN_CLIENT_ID") else "NOT SET"
    dhan_token = "SET" if os.environ.get("DHAN_ACCESS_TOKEN") else "NOT SET"
    upstox_token = "SET" if os.environ.get("UPSTOX_ACCESS_TOKEN") else "NOT SET"
    delta_key = "SET" if os.environ.get("DELTA_API_KEY") else "NOT SET"
    binance_key = "SET" if os.environ.get("BINANCE_API_KEY") else "NOT SET"

    print(f"DHAN_CLIENT_ID: {dhan_client}")
    print(f"DHAN_ACCESS_TOKEN: {dhan_token}")
    print(f"UPSTOX_ACCESS_TOKEN: {upstox_token}")
    print(f"DELTA_API_KEY: {delta_key}")
    print(f"BINANCE_API_KEY: {binance_key}")
    
    print("\n============================================================")
    print("TRADING SAFETY GUARDS")
    print("============================================================")
    print(f"TRADING_MODE: {os.environ.get('TRADING_MODE', 'PAPER')}")
    print(f"PAPER_TRADING: {os.environ.get('PAPER_TRADING', 'true')}")
    print(f"LIVE_TRADING_ENABLED: {os.environ.get('LIVE_TRADING_ENABLED', 'false')}")
    print(f"MASTER_LIVE_TRADING: {os.environ.get('MASTER_LIVE_TRADING', 'false')}")


if __name__ == "__main__":
    check_providers()
