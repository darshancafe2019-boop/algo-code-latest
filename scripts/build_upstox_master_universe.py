"""
Build and Cache Official Upstox 5000+ Indian Stock Instrument Master
====================================================================
Downloads official daily instrument files directly from Upstox CDN:
- NSE Equities: https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz
- BSE Equities: https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz

Caches cleaned, normalized, and indexed instrument records into data/upstox_equity_master.json
"""

import gzip
import json
import logging
import os
import ssl
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Set

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BuildUpstoxMaster")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = DATA_DIR / "upstox_equity_master.json"

NSE_CDN_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz"
BSE_CDN_URL = "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz"


def fetch_and_decompress(url: str) -> List[Dict[str, Any]]:
    logger.info(f"Downloading master from: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw_data = resp.read()
        decompressed = gzip.decompress(raw_data)
        data = json.loads(decompressed.decode("utf-8"))
        logger.info(f"Downloaded {len(data)} total records from {url}")
        return data


def build_equity_master() -> List[Dict[str, Any]]:
    nse_raw = fetch_and_decompress(NSE_CDN_URL)
    bse_raw = fetch_and_decompress(BSE_CDN_URL)

    seen_symbols: Set[str] = set()
    cleaned_equities: List[Dict[str, Any]] = []

    # 1. Process NSE Equities first (Primary Liquidity)
    for item in nse_raw:
        segment = item.get("segment")
        if segment != "NSE_EQ":
            continue

        inst_type = item.get("instrument_type")
        # Keep standard equities, SME, and ETF
        if inst_type not in ["EQUITY", "EQ", "NORMAL", "BE", "SM", "ST", "ETF", None]:
            continue

        sym = (item.get("trading_symbol") or "").strip().upper()
        if not sym or sym in seen_symbols:
            continue

        # Skip bond / G-sec series if any
        if sym.endswith("-GB") or sym.endswith("-GS") or sym.startswith("SDL ") or sym.startswith("GS "):
            continue

        name = (item.get("name") or sym).strip()
        isin = (item.get("isin") or "").strip()
        key = (item.get("instrument_key") or f"NSE_EQ|{isin or sym}").strip()
        lot_size = float(item.get("lot_size", 1) or 1)
        tick_size = float(item.get("tick_size", 0.05) or 0.05)
        token = str(item.get("exchange_token") or "")

        seen_symbols.add(sym)
        cleaned_equities.append({
            "symbol": sym,
            "trading_symbol": sym,
            "company_name": name,
            "exchange": "NSE",
            "segment": "NSE_EQ",
            "instrument_key": key,
            "isin": isin,
            "exchange_token": token,
            "lot_size": lot_size,
            "tick_size": tick_size,
            "asset_class": "Indian Equities",
            "instrument_type": "EQUITY",
            "currency": "INR",
            "is_tradable": True,
        })

    logger.info(f"Indexed {len(cleaned_equities)} unique NSE Equities")

    # 2. Process BSE Equities to reach 5000+ total Indian Equities
    bse_added = 0
    for item in bse_raw:
        segment = item.get("segment")
        if segment != "BSE_EQ":
            continue

        inst_type = item.get("instrument_type")
        if inst_type not in ["EQUITY", "EQ", "NORMAL", "A", "B", "T", "X", "XT", "Z", None]:
            continue

        sym = (item.get("trading_symbol") or "").strip().upper()
        if not sym or sym in seen_symbols:
            continue

        if sym.endswith("-GB") or sym.endswith("-GS") or sym.startswith("SDL "):
            continue

        name = (item.get("name") or sym).strip()
        isin = (item.get("isin") or "").strip()
        key = (item.get("instrument_key") or f"BSE_EQ|{isin or sym}").strip()
        lot_size = float(item.get("lot_size", 1) or 1)
        tick_size = float(item.get("tick_size", 0.05) or 0.05)
        token = str(item.get("exchange_token") or "")

        seen_symbols.add(sym)
        cleaned_equities.append({
            "symbol": sym,
            "trading_symbol": sym,
            "company_name": name,
            "exchange": "BSE",
            "segment": "BSE_EQ",
            "instrument_key": key,
            "isin": isin,
            "exchange_token": token,
            "lot_size": lot_size,
            "tick_size": tick_size,
            "asset_class": "Indian Equities",
            "instrument_type": "EQUITY",
            "currency": "INR",
            "is_tradable": True,
        })
        bse_added += 1

    logger.info(f"Added {bse_added} BSE Equities. Total Indian Stocks in Master: {len(cleaned_equities)}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_equities, f, indent=2)

    logger.info(f"Saved master file to: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size / 1024 / 1024:.2f} MB)")
    return cleaned_equities


if __name__ == "__main__":
    equities = build_equity_master()
    print(f"\n[DONE] Built Upstox Indian Equity Master with {len(equities)} companies/stocks!")
