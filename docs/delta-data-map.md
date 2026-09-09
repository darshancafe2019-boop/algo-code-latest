# Delta Exchange Live Data & Architecture Map

Comprehensive inventory and data pipeline map for Delta Exchange India & Global derivatives within Quant.OS.

---

## 1. Delta Exchange Data Source Matrix

| DATA | SOURCE | ENDPOINT / CHANNEL | CURRENT FILE | STATUS | LIVE / REST | USED BY |
|---|---|---|---|---|---|---|
| **Option Catalogue** | Delta REST | `GET /v2/products` | `src/delta_options_client.py` | Active | REST (Cached 60s) | `DeltaOptionsService`, SQLite `delta_contracts` |
| **Active Tickers** | Delta REST | `GET /v2/tickers` | `src/delta_options_client.py` | Active | REST (Snapshot / Fallback) | `DeltaOptionsService`, Option Chain REST Sync |
| **Spot Indices** | Delta REST | `GET /v2/indices` | `src/delta_options_client.py` | Active | REST (Snapshot) | Underlyings Spot Price, ATM Strike Detector |
| **L2 Orderbook Snapshot** | Delta REST | `GET /v2/l2orderbook/{symbol}` | `src/delta_exchange_adapter.py` | Active | REST (Snapshot / Recovery) | L2 Orderbook Initial State & Reconnect |
| **Historical Trades** | Delta REST | `GET /v2/trades/{symbol}` | `src/delta_exchange_adapter.py` | Active | REST (Initial state) | Trade Flow & Imbalance Analyzer |
| **Candlestick History** | Delta REST | `GET /v2/history/candles` | `src/delta_options_client.py` | Active | REST (Historical) | Multi-Timeframe Strategy Engine |
| **Live Tickers & Greeks** | Delta Public WS | `ticker` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Real-time Option Chain, Greeks, Strike Ladder |
| **Top-of-Book L1 Quotes** | Delta Public WS | `ob_l1` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Spread, Mid-price, L1 Bid/Ask Imbalance |
| **L2 Depth (Top 15-20)** | Delta Public WS | `ob_l2` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Depth visualization, Orderbook Heatmap |
| **L2 Incremental Updates** | Delta Public WS | `ob_updates` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Full Orderbook Engine, Depth Rebalancing |
| **Real-time Public Trades** | Delta Public WS | `trades` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Tape, Large Trade Alerts, Flow Imbalance |
| **Mark Price Stream** | Delta Public WS | `mark_price` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Risk Engine, Margin & Liquidation Calculation |
| **Spot Price Stream** | Delta Public WS | `spot_price` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | ATM Strike Center, Basis Calculation |
| **Spot 30m TWAP** | Delta Public WS | `spot_30mtwap_price` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Settlement Reference Price |
| **Funding Rate Stream** | Delta Public WS | `funding_rate` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Perpetual Futures Basis Arbitrage |
| **Live Candlesticks** | Delta Public WS | `candlesticks` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Real-time Charting (1m, 3m, 5m, 15m, 1h, 1d) |
| **System Status** | Delta Public WS | `system_status` | `market_data_gateway/adapters/delta_options_ws.py` | Active | Live WebSocket | Exchange Health Monitor, Circuit Breaker |
| **Account Balances** | Delta Private REST | `GET /v2/wallet/balances` | `src/delta_exchange_adapter.py` | Active (Authenticated) | REST (Server-Side) | Margin & Capital Intelligence |
| **Open Orders** | Delta Private REST | `GET /v2/orders` | `src/delta_exchange_adapter.py` | Active (Authenticated) | REST (Server-Side) | Portfolio & Open Order Monitor |
| **Open Positions** | Delta Private REST | `GET /v2/positions` | `src/delta_exchange_adapter.py` | Active (Authenticated) | REST (Server-Side) | Risk Engine, Active Position Cockpit |
| **Order Placement** | Delta Private REST | `POST /v2/orders` | `src/delta_exchange_adapter.py` | Active (Authenticated) | REST (Server-Side) | Order Routing & Execution Engine |
| **Order Cancellation** | Delta Private REST | `DELETE /v2/orders` | `src/delta_exchange_adapter.py` | Active (Authenticated) | REST (Server-Side) | Risk Lockout & Emergency Exit |

---

## 2. Public WebSocket URL & Channel Specifications

- **Primary WebSocket URL**: `wss://public-socket.india.delta.exchange`
- **Fallback URL**: `wss://socket.india.delta.exchange`
- **Heartbeat Requirement**: Periodic `{"type": "ping"}` every 25 seconds; expects `{"type": "pong"}` response.
- **Subscription Format**:
  ```json
  {
    "type": "subscribe",
    "payload": {
      "channels": [
        {
          "name": "ticker",
          "symbols": ["BTCUSD", "ETHUSD", "BTC-250926"]
        },
        {
          "name": "trades",
          "symbols": ["BTCUSD", "ETHUSD"]
        },
        {
          "name": "ob_l2",
          "symbols": ["BTCUSD"]
        }
      ]
    }
  }
  ```

---

## 3. Data Flow Architecture

```
                 DELTA EXCHANGE PUBLIC / PRIVATE APIs
                 ┌───────────────────────────────────┐
                 │ • REST API: /v2/products, /v2/... │
                 │ • WEBSOCKET: wss://public-socket..│
                 └─────────────────┬─────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ DeltaRateLimiter  │
                         │ Circuit Breaker   │
                         └─────────┬─────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
        ┌──────────▼──────────┐         ┌──────────▼──────────┐
        │ DeltaOptionsClient  │         │ DeltaWebSocketMgr   │
        │ (REST Snapshot &    │         │ (Live Streaming     │
        │  Static Catalogue)  │         │  11 Channels)       │
        └──────────┬──────────┘         └──────────┬──────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                   ┌───────────────▼───────────────┐
                   │  DeltaOptionsService Engine   │
                   │  • Validated Option Ladders   │
                   │  • PCR, Max Pain, Walls       │
                   │  • Strict Null for Unquoted   │
                   └───────────────┬───────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ Market Gateway WS │
                         │ (ws://:5051/ws)   │
                         │ Backend /api/...  │
                         └─────────┬─────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
        ┌──────────▼──────────┐         ┌──────────▼──────────┐
        │ Frontend Terminal & │         │ Strategy Engine &   │
        │ Option Chain UI     │         │ Risk Gatekeeper     │
        │ (Clean / No $0.00)  │         │ (Fail-Closed Mode)  │
        └─────────────────────┘         └─────────────────────┘
```

---

## 4. Option Chain Normalization & Null Handling Rules

1. **Unquoted Strikes / Missing Values**:
   - `last_price`: `null` (Renders as `—`)
   - `best_bid` / `best_ask`: `null` (Renders as `—`)
   - `bid_size` / `ask_size`: `null` (Renders as `—`)
   - `mark_iv`: `null` (Renders as `—`)
   - `delta` / `gamma` / `theta` / `vega`: `null` (Renders as `—`)
   - `volume` / `open_interest`: `null` or `0` depending on exchange reporting
   - **CRITICAL**: Never substitute `$0.00` or arbitrary constant numbers for missing contract values.

2. **Metric Derivations**:
   - **Call Wall**: Strike price containing the maximum Open Interest among all active Call options.
   - **Put Wall**: Strike price containing the maximum Open Interest among all active Put options.
   - **Max Pain**: Strike price minimizing total monetary buyer payout.
   - **PCR (OI)**: Ratio of total Put Open Interest to total Call Open Interest.
   - **PCR (Volume)**: Ratio of total Put Volume to total Call Volume.
   - **ATM Strike**: Nearest listed strike to current live Underlying Spot Index.
