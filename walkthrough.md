# Production-Grade Market Data Architecture & Upstox V3 Upgrade Walkthrough

## Executive Summary
We have performed a complete, production-grade audit and upgrade of the market-data architecture across **Upstox V3**, **Dhan**, **Delta Exchange**, and **Binance**, strictly enforcing the **Zero Fake Data Policy**.

The platform now uses a single, authoritative, validated, low-latency market-data architecture with strict truth-in-data guarantees:
- **No Fabricated Market Depth / Multipliers**: Removed all `ltp * 0.9995` (bid) and `ltp * 1.0005` (ask) synthetic generation.
- **No Default OI Zero**: Missing open interest remains `null` / `undefined` (`—` in UI).
- **No Fabricated OHLC**: Open, High, Low never fall back to `LTP`.
- **Truthful PCR & Max Pain**: Computed strictly from valid positive strike OI; returns `null` if insufficient data (never defaults to 1.00 or $75,600).
- **Upstox V3 Full Protocol**: Protobuf decoding for `ltpc`, `option_greeks`, `full`, and `full_d30` modes, with 5-level market depth and full Greek fields (`iv`, `delta`, `gamma`, `theta`, `vega`, `rho`).
- **Universal Exchange Session Engine**: Replaced hardcoded `09:15–15:30` with `ExchangeSessionEngine` supporting NSE, BSE, MCX, 24/7/365 Crypto, and US markets (NYSE/NASDAQ).
- **Centralized Subscription Manager**: Reference-counted multi-subscriber tracking with mode hierarchy aggregation (`ltpc` < `option_greeks` < `full` < `full_d30`).
- **Telemetry & Health Engine**: Decoupled message arrival timestamps from valid market tick timestamps; tracks decode errors, unknown instruments, and latency without false `LIVE` statuses.

---

## Key Root Causes Diagnosed and Repaired

### 1. Fabricated Bid/Ask and Synthetic Spreads
- **Files**: `market_data_gateway/adapters/upstox_ws.py`, `src/ticker_service.py`, `src/market_data/futures_engine.py`, `src/market_providers.py`
- **Problem**: When depth was unsupplied by the provider, code manufactured artificial bid/ask spreads (`ltp * 0.9995`, `ltp * 1.0005`), high/low multiples (`* 1.015`, `* 0.985`), and volume multipliers (`* 2.5`, `* 1.8`).
- **Fix**: Replaced all synthetic calculations with authentic provider values. Unquoted fields default to `None` / `undefined`.

### 2. Defaulting Missing Open Interest to 0.0
- **Files**: `market_data_gateway/upstox_protobuf_decoder.py`, `market_data_gateway/adapters/upstox_ws.py`, `src/market_data/schemas.py`
- **Problem**: Protobuf fields were initialized to `0.0`. Missing open interest appeared as `0`, corrupting PCR, Max Pain, and options analytics.
- **Fix**: Initialized all decoded fields to `None`. Schema dataclasses (`NormalizedQuote`, `MarketQuote`, `FuturesQuote`) now type `oi: Optional[float] = None`.

### 3. Fallback to LTP for OHLC and Previous Close
- **Files**: `market_data_gateway/adapters/upstox_ws.py`, `frontend/lib/market-data/providers/upstox/upstox-provider.ts`
- **Problem**: `open = ltp`, `high = ltp`, `low = ltp`, and `prevClose = ltp` were used when candles or close were unquoted, generating fake 0.00% changes.
- **Fix**: Missing OHLC and close values remain `None` / `undefined`. `change` and `change_pct` are calculated only when a valid, positive provider close is present.

### 4. False LIVE Status on Socket Connection
- **Files**: `market_data_gateway/adapters/upstox_ws.py`, `frontend/lib/market-data/health.ts`
- **Problem**: A connected WebSocket frame marked the entire provider adapter `LIVE` even if 0 valid ticks were parsed.
- **Fix**: Separated connection states (`CONNECTED`, `CONNECTED_NO_VALID_DATA`, `LIVE`, `STALE`, `MARKET_CLOSED`). Separate timestamps are maintained for `lastSocketMessageAt`, `lastBinaryMessageAt`, `lastDecodedMessageAt`, `lastValidTickAt`, `lastValidDepthAt`, and `lastValidGreeksAt`.

### 5. Silent Protobuf Decoder Errors
- **Files**: `market_data_gateway/upstox_protobuf_decoder.py`, `market_data_gateway/adapters/upstox_ws.py`
- **Problem**: Decoding exceptions were logged only at `DEBUG` level and swallowed.
- **Fix**: Added explicit telemetry metrics (`decode_successes`, `decode_errors`, `invalid_messages`, `unknown_instruments`) exposed via provider health and diagnostics APIs.

### 6. Pandas Missing Import in `get_history()`
- **Files**: `market_data_gateway/adapters/upstox_ws.py`
- **Problem**: `get_history()` referenced `pd.to_datetime()` without importing `pandas`, causing runtime crashes.
- **Fix**: Added safe pandas handling with fallback conversion for raw dictionary records.

---

## Verification Results

### Unit Tests
- **Command**: `npm run test:market-data-unit`
- **Result**: **All Passed (100%)**
  - LTP parsed accurately
  - Open/High/Low strictly undefined when unquoted (NO `open=ltp`)
  - Previous close strictly undefined when unquoted (NO fallback to LTP)
  - Bid/Ask strictly undefined when unquoted (NO `ltp*0.9995` / `ltp*1.0005`)
  - OI strictly undefined when unquoted (NO default 0)
  - Full tick LTP, OHLC, Close, Change, ChangePct, Bid, Ask, OI, Volume exact match
  - PCR strictly `null` on missing contracts/OI; exact Put OI / Call OI ratio on valid strikes
  - Max Pain strictly `null` on missing contracts; exact minimum total payout strike on valid strikes

### Multi-Broker Integration Tests
- **Command**: `npm run test:market-data-integration`
- **Result**: **All Passed (100%)**
  - Upstox, Dhan, Delta provider adapters registered
  - Truthful health reporting (`DISCONNECTED` / `LIVE` / `STALE`)
  - Reference-counted subscriptions and mode tracking

### Delta Options Live Audit
- **Command**: `npm run test:options-live`
- **Result**: **22 Passed, 0 Failed**
  - Delta REST reachable (India endpoint)
  - 5 active future expiries discovered
  - Real contracts and strike ladder populated
  - Nulls strictly preserved for unquoted bid, ask, LTP, OI, IV

### Upstox Live Diagnostic Tool
- **Command**: `python scripts/test_upstox_live.py`
- **Result**: **Executed Successfully**
  - Environment inspection & token validation (masked credentials)
  - Correct detection of token expiration (`UDAPI100050`)
  - Canonical Instrument Master resolved 10/10 symbols (NIFTY, BANKNIFTY, INDIA VIX, RELIANCE, HDFCBANK, ICICIBANK, INFY, TCS, SBIN, BHARTIARTL)
  - Safe fail-closed handling without retry storm

### Core Engine Tests
- **Command**: `npm run test:market-data`
- **Result**: **24/24 Passed (100%)**

### Code Quality & Types
- **Command**: `npm run lint` -> **✔ No ESLint warnings or errors**
- **Command**: `npm run typecheck` -> **✔ 0 TypeScript compilation errors**
