# Quant.OS Live Market-Data Feed Architecture

A high-performance, modular, multi-broker market data pipeline supporting real-time streaming, normalization, caching, deduplication, and failover across **Dhan**, **Delta Exchange**, **FYERS**, and **Upstox**.

---

## 1. Architectural Overview & Data Flow

Quant.OS enforces a strict unidirectional pipeline where **no broker WebSocket connections or API credentials are ever exposed to the client-side Next.js browser**.

```
FYERS API v3 WebSocket  ──┐
                         ├──► FYERS Adapter  ──► FYERS Normalizer  ──┐
Upstox V3 Protobuf WS   ──┤                                           │
                         ├──► Upstox Adapter ──► Upstox Normalizer ──┤
Dhan HQ Binary WS       ──┤                                           │
                         ├──► Dhan Adapter   ──► Dhan Normalizer   ──┼──► MARKET DATA GATEWAY (5051)
Delta Exchange WS       ──┘                                           │    ├─ Subscription Planner & Manager
                         ├──► Delta Adapter  ──► Delta Normalizer  ──┘    ├─ Stale Data Detector (<1500ms)
                                                                           ├─ In-Memory Latest-Tick Cache
                                                                           └─ Failover Manager
                                                                                   │
                                                                       ┌───────────┴───────────┐
                                                                       │                       │
                                                             Next.js BFF Proxy           Internal Bus
                                                             (/api/market-data/*)      (Strategy / Bot)
                                                                       │                       │
                                                             ┌─────────┴─────────┐     ┌───────┴───────┐
                                                             │ React Hooks (SSE) │     │ Alpha Bot     │
                                                             │ - useMarketData   │     │ Scalper       │
                                                             │ - useQuote        │     │ Indicator     │
                                                             │ - useOptionChain  │     │ Engine        │
                                                             │ - useMarketDepth  │     │ Risk Manager  │
                                                             │ - useOptionGreeks │     │ P&L Ledger    │
                                                             │ - useFeedStatus   │     └───────────────┘
                                                             └───────────────────┘
```

---

## 2. Provider Separation & Adapters

All market data feeds adhere to the canonical `BaseProviderAdapter` interface:

| Provider | Protocol / Feed Mode | Default Endpoint | Max Subscriptions | Auth Model |
| :--- | :--- | :--- | :--- | :--- |
| **FYERS** | JSON/Binary WebSocket (API v3) | `wss://socket.fyers.in/service/v3/data/feed` | 5,000 | Token `{app_id}:{access_token}` |
| **Upstox** | Protobuf Binary WebSocket (V3) | `wss://wsfeeder-api.upstox.com/market-data-feeder/v3` | 5,000 | Bearer OAuth access token |
| **Dhan** | Binary / JSON WebSocket (HQ v2) | `wss://feed.dhan.co` | 5,000 | Client ID + Access Token |
| **Delta** | JSON L2 Orderbook & Tickers | `wss://cdn.delta.exchange/websocket` | 10,000 | Public / API Key & Secret |
| **Simulation** | Synthetic In-Memory Generator | Internal loop (100ms interval) | Unlimited | No credentials required |

---

## 3. Normalized MarketTick Schema

All raw provider frames are normalized into the authoritative `MarketTick` model:

```python
@dataclass
class MarketTick:
    # Routing & Identity
    provider: str                             # "dhan", "delta", "fyers", "upstox", "simulation"
    providerInstrumentId: str                 # Raw symbol (e.g. "NSE:NIFTY50-INDEX", "NSE_INDEX|Nifty 50")
    internalInstrumentId: str                 # Internal canonical ID (e.g. "INDIA:NSE:INDEX:NIFTY")
    exchange: str                             # "NSE", "BSE", "BINANCE", "DELTA_INDIA", "MCX"
    segment: str                              # "EQUITY", "EQUITY_DERIVATIVES", "INDEX", "CRYPTO"
    symbol: str                               # Canonical display symbol ("NIFTY", "RELIANCE", "BTC/USDT")
    underlying: Optional[str] = None          # Underlying asset ("NIFTY", "BTC")
    assetType: str = "SPOT"                   # "SPOT", "INDEX", "FUTURES", "OPTION_CALL", "OPTION_PUT"

    # Timestamps
    timestamp: Optional[str] = None           # ISO-8601 provider timestamp
    receivedAt: Optional[str] = None          # ISO-8601 gateway receipt timestamp
    rawProviderTimestamp: Optional[int] = None # Epoch milliseconds

    # Price & Trades
    ltp: Optional[float] = None               # Last Traded Price
    ltq: Optional[float] = None               # Last Traded Quantity
    previousClose: Optional[float] = None     # Previous Session Close

    # OHLC Bar
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

    # Volume & Liquidity
    volume: Optional[float] = None

    # Top of Book (BBO)
    bidPrice: Optional[float] = None
    bidQuantity: Optional[float] = None
    askPrice: Optional[float] = None
    askQuantity: Optional[float] = None
    spread: Optional[float] = None

    # Derivatives & Greeks
    openInterest: Optional[float] = None
    previousOpenInterest: Optional[float] = None
    changeInOpenInterest: Optional[float] = None
    iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    rho: Optional[float] = None

    # Depth & Integrity
    marketDepth: Optional[Dict[str, Any]] = None
    dataMode: str = "LTP"                     # "LTP", "FULL_QUOTE", "OPTION_GREEKS", "SIMULATION"
    sequence: Optional[int] = None
    feedStatus: str = "LIVE"                  # "LIVE", "FRESH", "STALE", "DISCONNECTED"
```

---

## 4. Central Subscription Manager & Priority Hierarchy

The `SubscriptionPlanner` guarantees that provider connection limits are never exceeded while dynamically serving active demands:

```
Priority 1: Active Trading Strategy  ───► (Highest priority, preempts lower)
Priority 2: Open Positions
Priority 3: Option Chain View
Priority 4: User Watchlist
Priority 5: Visible Markets Table
Priority 6: Background / Analytics    ───► (Lowest priority, first to be evicted)
```

Dynamic subscriptions (`subscribe` / `unsubscribe`) operate **without tearing down the active WebSocket connection**.

---

## 5. Stale Data Detection & Quality Safeguards

Every incoming tick is checked by the `StaleDetector` and `TickDeduplicator`:
- **LIVE**: $\text{age} \le 1,500\text{ ms}$
- **FRESH**: $1,500\text{ ms} < \text{age} \le 10,000\text{ ms}$
- **STALE**: $10,000\text{ ms} < \text{age} \le 30,000\text{ ms}$
- **DISCONNECTED**: $\text{age} > 30,000\text{ ms}$

### Safeguards:
1. **Out-of-Order Drop**: A tick with an older exchange timestamp will never overwrite a newer tick in the cache.
2. **Deduplication**: Identical sequence/timestamp frames are silently deduplicated.
3. **Value Rejection**: Non-positive prices, negative volumes, and crossed bid/ask markets are rejected before entering the cache.

---

## 6. Frontend Integration Hooks

The Next.js frontend interacts exclusively through clean React hooks backed by SSE / WebSocket streaming:

```typescript
import {
  useMarketData,
  useQuote,
  useOptionChain,
  useMarketDepth,
  useOptionGreeks,
  useFeedStatus,
} from "@/hooks/useMarketData";

// 1. Subscribe to batch quotes with single connection multiplexing
const { quotes, getPrice } = useMarketData(["NIFTY", "RELIANCE", "BTC/USDT"]);

// 2. Real-time option contract analytics & Greeks
const { data: greeks } = useOptionGreeks("NSE:NIFTY24OCT24600CE");

// 3. Provider Health Matrix
const { data: feedStatus } = useFeedStatus();
```

---

## 7. Operational Commands

### Start Gateway & Orchestrator
```bash
# Start all subsystems (Gateway: 5051, Backend: 5050, Frontend: 3100)
.venv/bin/python scripts/dev_orchestrator.py
```

### Run Market Data Test Suite
```bash
# Run the complete live feed architecture tests
.venv/bin/pytest tests/test_live_feed_architecture.py tests/test_market_gateway.py
```

### Inspect Health & Telemetry
```bash
# Comprehensive provider matrix
curl -s http://localhost:5051/api/market-data/health | jq

# Gateway throughput and latency metrics
curl -s http://localhost:5051/metrics | jq

# Single-symbol authoritative LTP
curl -s "http://localhost:5051/ltp?symbol=NIFTY" | jq
```
