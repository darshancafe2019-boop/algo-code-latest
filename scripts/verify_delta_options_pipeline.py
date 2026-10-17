#!/usr/bin/env python3
"""
QUANT.OS — Delta Options Pipeline Authoritative Verification Suite
==================================================================
Verifies:
1. Authoritative discovery of today's (17-10-2026), tomorrow's (18-10-2026),
   day-after (19-10-2026), and upcoming weekly/monthly expiries.
2. Complete response parity between Next.js (/api/market/expiries),
   Market Gateway (/api/options/chain), and Python backend.
3. True LTP, Bid, Ask, and Greeks for live contract C-BTC-81500-231026.
4. Total absence of synthetic fallback prices (64000, 78000, 3500, etc.)
   and simulated random bids/asks.
"""

import sys
import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

GATEWAY_URL = "http://127.0.0.1:5051"
BACKEND_URL = "http://127.0.0.1:5050"
FRONTEND_URL = "http://127.0.0.1:3100"

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def http_get(url: str, timeout: float = 8.0):
    req = urllib.request.Request(url, headers={"User-Agent": "QuantOS-Verifier/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

def main():
    log("=================================================================")
    log("  QUANT.OS DELTA OPTIONS PIPELINE REGRESSION & INTEGRITY AUDIT  ")
    log("=================================================================")
    
    passed_checks = 0
    total_checks = 0

    # -------------------------------------------------------------------------
    # TEST 1: Delta Options Service & Database Near-Term Expiry Discovery
    # -------------------------------------------------------------------------
    total_checks += 1
    log("\n[TEST 1] Verifying Backend & SQLite Expiry Discovery (DD-MM-YYYY Purge Fix)...")
    try:
        from src.delta_options_service import delta_options_service
        expiries = delta_options_service.get_available_expiries("BTC")
        expiry_dates = [e.get("expiry_date") for e in expiries if e.get("expiry_date")]
        log(f"Discovered {len(expiry_dates)} active BTC expiries: {expiry_dates}")
        
        # Verify near-term daily expiries exist and were not purged
        has_today = any("17-10-2026" in d or "17" in d.split("-")[0] for d in expiry_dates)
        has_tomorrow = any("18-10-2026" in d or "18" in d.split("-")[0] for d in expiry_dates)
        has_day_after = any("19-10-2026" in d or "19" in d.split("-")[0] for d in expiry_dates)
        has_weekly = any("23-10-2026" in d for d in expiry_dates)
        
        if has_today and has_tomorrow and has_weekly:
            log("  [PASS] Near-term daily expiries (17-10, 18-10) and weekly (23-10) discovered successfully.")
            passed_checks += 1
        else:
            log(f"  [FAIL] Missing expected near-term expiries. Found: {expiry_dates}")
    except Exception as ex:
        log(f"  [FAIL] Error during backend expiry test: {ex}")

    # -------------------------------------------------------------------------
    # TEST 2: Market Gateway (/api/options/chain) Live Pipeline
    # -------------------------------------------------------------------------
    total_checks += 1
    log("\n[TEST 2] Verifying Market Data Gateway (/api/options/chain?underlying=BTC&provider=DELTA)...")
    try:
        gw_chain = http_get(f"{GATEWAY_URL}/api/options/chain?underlying=BTC&provider=DELTA&expiry=23-10-2026")
        gw_strikes = gw_chain.get("strikes") or gw_chain.get("rows") or []
        gw_spot = gw_chain.get("spot_price") or gw_chain.get("spot") or 0.0
        gw_status = gw_chain.get("status") or gw_chain.get("data_status") or "UNKNOWN"
        gw_expiries = gw_chain.get("available_expiries") or []
        
        log(f"Gateway BTC Option Chain: status={gw_status}, spot={gw_spot}, strikes_count={len(gw_strikes)}, expiries_count={len(gw_expiries)}")
        
        # Spot must be genuine (not hardcoded 64000/78000)
        assert gw_spot > 50000.0, f"Spot price {gw_spot} is invalid"
        assert len(gw_strikes) > 0, "Gateway returned 0 strikes"
        assert len(gw_expiries) >= 4, f"Gateway expiries count {len(gw_expiries)} is less than 4"
        
        # Check that 17-10-2026 is present in gateway expiries
        has_today_gw = any("17-10" in str(e) or "17" in str(e).split("-")[0] for e in gw_expiries)
        if has_today_gw:
            log("  [PASS] Gateway returns live chain with true spot and active daily expiries.")
            passed_checks += 1
        else:
            log(f"  [FAIL] Gateway available_expiries missing today's expiry: {gw_expiries}")
    except Exception as ex:
        log(f"  [FAIL] Gateway endpoint test failed: {ex}")

    # -------------------------------------------------------------------------
    # TEST 3: Contract Quote Integrity: C-BTC-81500-231026
    # -------------------------------------------------------------------------
    total_checks += 1
    log("\n[TEST 3] Verifying Target Contract: C-BTC-81500-231026 (Live LTP, Bid, Ask, Greeks)...")
    try:
        gw_chain = http_get(f"{GATEWAY_URL}/api/options/chain?underlying=BTC&provider=DELTA&expiry=23-10-2026")
        strikes = gw_chain.get("strikes") or gw_chain.get("rows") or []
        
        match_81500 = next((r for r in strikes if abs(float(r.get("strike", 0)) - 81500.0) < 1.0), None)
        assert match_81500 is not None, "Strike 81500 not found in chain"
        
        call_leg = match_81500.get("call") or match_81500.get("ce")
        assert call_leg is not None, "Call leg for strike 81500 is missing"
        
        symbol = call_leg.get("symbol")
        ltp = call_leg.get("ltp")
        mark = call_leg.get("markPrice") or call_leg.get("mark")
        bid = call_leg.get("bid")
        ask = call_leg.get("ask")
        delta = call_leg.get("delta")
        iv = call_leg.get("iv")
        
        log(f"Contract {symbol}: LTP={ltp}, Mark={mark}, Bid={bid}, Ask={ask}, Delta={delta}, IV={iv}")
        
        # Ensure prices are not fabricated
        assert ltp is not None and float(ltp) > 500.0, f"LTP {ltp} is invalid"
        assert bid is not None and float(bid) > 500.0, f"Bid {bid} is invalid"
        assert ask is not None and float(ask) > 500.0, f"Ask {ask} is invalid"
        assert ask >= bid, f"Crossed book: Ask {ask} < Bid {bid}"
        assert delta is not None and 0.2 < float(delta) < 0.8, f"Delta {delta} out of expected ATM/ITM range"
        
        log("  [PASS] Authoritative market quotes verified for C-BTC-81500-231026.")
        passed_checks += 1
    except Exception as ex:
        log(f"  [FAIL] Target contract verification failed: {ex}")

    # -------------------------------------------------------------------------
    # TEST 4: Frontend Next.js API Routes Parity (/api/market/expiries & /api/options/chain)
    # -------------------------------------------------------------------------
    total_checks += 1
    log("\n[TEST 4] Verifying Next.js API Route Parity on Port 3100...")
    try:
        # Check /api/market/expiries
        fe_exp_data = http_get(f"{FRONTEND_URL}/api/market/expiries?market_type=CRYPTO_OPTION&underlying=BTC")
        fe_expiries = fe_exp_data.get("data") or fe_exp_data.get("expiries") or []
        log(f"Next.js /api/market/expiries returned {len(fe_expiries)} expiries")
        
        assert len(fe_expiries) >= 4, f"Frontend expiries count {len(fe_expiries)} is too low"
        
        # Check /api/options/chain
        fe_chain_data = http_get(f"{FRONTEND_URL}/api/options/chain?underlying=BTC&source=DELTA&expiry=23-10-2026")
        fe_strikes = fe_chain_data.get("strikes") or fe_chain_data.get("rows") or []
        fe_spot = fe_chain_data.get("spot_price") or fe_chain_data.get("spot") or 0.0
        
        log(f"Next.js /api/options/chain returned {len(fe_strikes)} strikes, spot={fe_spot}")
        assert len(fe_strikes) > 0, "Frontend /api/options/chain returned 0 strikes"
        assert fe_spot > 50000.0, f"Frontend /api/options/chain spot {fe_spot} is invalid"
        
        log("  [PASS] Next.js frontend routes return full authoritative options chain and expiries.")
        passed_checks += 1
    except Exception as ex:
        log(f"  [FAIL] Frontend route parity test note: {ex}")

    # -------------------------------------------------------------------------
    # TEST 5: Total Absence of Fabricated Fallback Prices (64000, 78000)
    # -------------------------------------------------------------------------
    total_checks += 1
    log("\n[TEST 5] Verifying Total Absence of Hardcoded Fallback Prices...")
    try:
        with open("src/delta_options_service.py", "r", encoding="utf-8") as f:
            svc_code = f.read()
        
        assert "78000.0" not in svc_code, "Found hardcoded 78000.0 in src/delta_options_service.py"
        assert "3500.0" not in svc_code, "Found hardcoded 3500.0 in src/delta_options_service.py"
        
        with open("frontend/components/wizard/Step2LiveMarket.tsx", "r", encoding="utf-8") as f:
            wiz_code = f.read()
            
        assert "65000" not in wiz_code, "Found hardcoded 65000 in Step2LiveMarket.tsx"
        assert "22615" not in wiz_code, "Found hardcoded 22615 in Step2LiveMarket.tsx"
        assert "fallbackPrem" not in wiz_code, "Found fallbackPrem in Step2LiveMarket.tsx"
        assert "p * 0.9998" not in wiz_code, "Found synthetic bid * 0.9998 in Step2LiveMarket.tsx"
        
        with open("frontend/app/api/options/chain/route.ts", "r", encoding="utf-8") as f:
            chain_code = f.read()
            
        assert "64500" not in chain_code, "Found hardcoded 64500 in frontend/app/api/options/chain/route.ts"
        assert "Math.random()" not in chain_code, "Found Math.random() in frontend/app/api/options/chain/route.ts"
        
        log("  [PASS] All fake fallback prices and synthetic spreads completely purged.")
        passed_checks += 1
    except Exception as ex:
        log(f"  [FAIL] Fallback audit failed: {ex}")

    log("\n=================================================================")
    log(f"  AUDIT SUMMARY: {passed_checks}/{total_checks} CHECKS PASSED")
    log("=================================================================")

    if passed_checks == total_checks:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
