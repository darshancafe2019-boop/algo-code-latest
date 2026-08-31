# Quant.OS — Complete System Architecture, Codebase Structure & Operations Manual

---

## 1. Executive Summary & Technology Stack

**Quant.OS** is an institutional-grade, multi-asset algorithmic trading, market intelligence, and risk orchestration platform designed for real-time execution across global markets (Indian Equities/Derivatives, US Stocks, Global Crypto, Forex, and Options).

### Core Technology Stack

| Layer | Technologies Used | Primary Responsibilities |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Zustand, React Query | Command Center UI, Charts, Screener, Strategy Studio, Risk Forensics, Bot Operations |
| **Backend API** | Python 3.10+, Flask, Flask-CORS, Pytest, SQLite3, Protobuf, Multi-threading | REST Endpoints, Event Streams (SSE), Strategy Execution, Indicator Pipelines, Portfolio Tracking |
| **Market Data Gateway** | Python AsyncIO, WebSockets, REST, Protobuf Decoder, Upstox SDK, CCXT, Delta API | Low-latency live feeds, Tick distribution, Failover handling, Normalization |
| **Database & Cache** | SQLite (`trading_platform.db`, `trading_bot.db`), Thread-Safe In-Memory TTL Caches | Instrument master catalogs, Trade logs, Bot configurations, Risk limits, User preferences |
| **Orchestration** | Python Process Manager, Watchdog, `run_system.py`, `dev_orchestrator.py` | Multi-process supervisor, Subprocess health checks, Auto-restarts, Graceful kill-switches |

---

## 2. Master Codebase Directory & File Structure Map

```
algo-code-main/
│
├── .env.example                         # Environment variables template
├── dashboard.py                         # Master Flask Backend (Port 5050) & Blueprint Integrator
├── run_system.py                        # Unified Single-Command Startup Runner (Backend + Gateway + Frontend)
├── requirements.txt                     # Python dependencies
├── trading_platform.db                  # Primary SQLite database (Market Universe, Bots, Trades)
│
├── src/                                 # CORE PYTHON BACKEND ENGINES & SERVICES
│   ├── config.py                        # Centralized system configurations & environment loading
│   ├── db.py                            # SQLite database schema, connections, and transactional queries
│   ├── process_manager.py               # Process supervisor and worker manager
│   ├── bot_runtime_service.py           # Bot lifecycle engine (spawn, run, pause, terminate)
│   ├── live_runner.py                   # Live algorithmic trade execution engine
│   ├── universal_risk_engine.py         # Real-time risk rules, drawdowns, position size limits
│   ├── trade_ledger.py                  # Immutable order & trade accounting ledger
│   ├── trade_journal_service.py         # Trade journal logs, notes, tags, and analytics
│   ├── intelligence_engine.py           # Multi-timeframe confluence and signal detection
│   ├── indicators.py                    # 50+ technical indicator implementations (RSI, EMA, MACD, etc.)
│   ├── indicator_schema.py              # Technical indicator contracts & parameter schemas
│   ├── option_chain_engine.py           # Options Greeks calculation (Black-Scholes Delta, Gamma, Theta, IV)
│   ├── delta_options_client.py          # Delta Exchange Crypto Options API client
│   ├── delta_options_service.py         # Delta Options feed processor and strategy integration
│   ├── upstox_service.py                # Upstox API integration for Indian Equities & F&O
│   ├── upstox_broker_adapter.py         # Upstox broker order placement and account adapter
│   ├── binance_market_data_service.py   # Binance Spot and USDT-M Futures real-time feed
│   ├── crypto_derivatives_provider.py   # Crypto perpetuals, funding rates, and open interest
│   ├── market_universe.py               # Multi-asset catalog resolution and master universe
│   ├── instrument_resolver.py           # Canonical symbol resolver ({provider}:{exchange}:{symbol})
│   ├── market_session_service.py        # Global exchange market hours (NSE, BSE, NASDAQ, NYSE, MCX)
│   ├── alert_engine.py                  # Real-time alerts, triggers, and notification routing
│   ├── telegram_service.py              # Telegram bot notifications and interactive alert controls
│   ├── audit.py                         # System security, access logs, and anomaly detection
│   └── security_auth.py                 # API authentication, session keys, and permissions
│
├── market_data/                         # MODULAR MARKET DATA ARCHITECTURE
│   ├── common/                          # Reusable provider abstractions and math utilities
│   │   ├── provider_interfaces.py       # Base provider contracts and capabilities enum
│   │   ├── capability_registry.py       # Global provider feature mapping
│   │   ├── canonical_ids.py             # Canonical ID resolution ({provider}:{exchange}:{key})
│   │   ├── decimals.py                  # Decimal-safe price, return, and spread math
│   │   ├── timestamps.py                # ISO-8601 UTC utilities and staleness checking
│   │   ├── errors.py                    # Standard domain error taxonomy
│   │   └── health.py                    # Provider latency and connection tracking
│   │
│   └── stocks/                          # DEDICATED PURE EQUITIES MODULE (NSE, BSE, NASDAQ, NYSE)
│       ├── enums.py                     # Enums for Region, Exchange, MarketCap, TrendDirection, Quality
│       ├── models.py                    # NormalizedStockQuote, StockFundamentals, StockTechnicals, Analysis
│       ├── schemas.py                   # Standard API response envelopes
│       ├── taxonomy.py                  # Pure equity classifier (rejects derivatives/crypto leaks)
│       ├── instrument_master.py         # Multi-index in-memory stock catalog
│       ├── provider_registry.py         # Stock-specific provider manager
│       ├── discovery_engine.py          # Multi-exchange baseline stock discovery
│       ├── normalization.py             # Quote normalizer (currency, share vol vs turnover)
│       ├── quote_engine.py              # Real-time snapshot generator
│       ├── historical_engine.py         # Multi-timeframe OHLCV historical candle engine
│       ├── fundamentals_engine.py       # Valuation multiples (P/E, P/B, EPS, ROE, Debt/Equity)
│       ├── technical_engine.py          # RSI, EMA, MACD, ATR, VWAP, Pivot Support/Resistance
│       ├── session_engine.py            # Market session state (IST / EST)
│       ├── corporate_actions.py         # Stock splits and dividend tracker
│       ├── analysis_engine.py           # Explainable quantitative score (0-100) & English reasoning
│       ├── data_quality.py              # Anomaly detection & feed freshness verification
│       ├── cache.py                     # Thread-safe TTL cache
│       ├── ranking_engine.py            # Top gainers, losers, most active, relative volume
│       ├── filter_engine.py             # Multi-parameter screener filter engine
│       ├── screener_engine.py           # Paginated & sorted stock screener
│       ├── repository.py                # SQLite persistence for favorites & saved screens
│       ├── routes.py                    # Flask blueprint `/api/market-data/stocks`
│       ├── tasks.py                     # Background worker for feed updates
│       └── tests/                       # Complete Pytest test suite (12 passed tests)
│
├── market_data_gateway/                 # LOW-LATENCY REAL-TIME STREAMING GATEWAY (Port 5051)
│   ├── gateway.py                       # WebSocket Gateway Server (SSE & WS broadcaster)
│   ├── subscription_registry.py         # Client tick subscriptions
│   ├── failover_manager.py              # Automatic provider failover and reconnects
│   ├── candle_store.py                  # In-memory real-time candle aggregators
│   ├── upstox_protobuf_decoder.py       # Binary Protobuf tick decoder for Upstox Feed
│   └── adapters/                        # Live provider adapters (Upstox WS, Delta WS, Binance WS)
│
├── frontend/                            # NEXT.JS 14 FRONTEND WEB APPLICATION (Port 3100)
│   ├── app/                             # Next.js App Router Pages
│   │   ├── page.tsx                     # Landing / Quick redirect
│   │   ├── dashboard/page.tsx           # Command Center overview (KPIs, active bots, quick actions)
│   │   ├── markets/page.tsx             # Upgraded Multi-Asset & Stocks Universe Screener
│   │   ├── charts/page.tsx              # Pro TradingView Interactive Charting Station
│   │   ├── bots/page.tsx                # Bot Fleet Manager (status, logs, P&L, controls)
│   │   ├── strategies/page.tsx          # Strategy Studio & Logic Builder
│   │   ├── options/page.tsx             # Options Command Center & Matrix
│   │   ├── crypto/page.tsx              # Crypto Futures & Spot Terminal
│   │   ├── risk/page.tsx                # Universal Risk Engine & Forensics
│   │   ├── positions/page.tsx           # Active Positions & Paper Trading Portfolio
│   │   ├── orders/page.tsx              # Order History & Execution Audit
│   │   ├── trade-journal/page.tsx       # Trade Journal & Performance Analytics
│   │   ├── alerts/page.tsx              # Alerts & Incident Monitoring
│   │   ├── settings/page.tsx            # API Credentials & System Configuration
│   │   └── api/[...path]/route.ts       # Reverse proxy routing frontend `/api/*` to Flask `5050`
│   │
│   ├── src/features/markets/stocks/     # MODULAR FRONTEND STOCKS UNIVERSE FEATURE
│   │   ├── types/stocks.ts              # TypeScript interfaces matching backend models
│   │   ├── api/stocks-api.ts            # Typed HTTP fetcher client
│   │   ├── api/stocks-stream.ts         # SSE live tick streaming client
│   │   ├── state/stocks-store.ts        # Zustand store (drawers, columns, favorites, filters)
│   │   ├── hooks/use-stocks.ts          # React Query screener hook
│   │   ├── hooks/use-stock-filters.ts   # URL query synchronization hook
│   │   ├── hooks/use-stock-details.ts   # Instrument telemetry & analytics hook
│   │   ├── utils/formatting.ts          # INR/USD currency & Lakhs/Crores/Millions notation
│   │   ├── utils/stock-colors.ts        # Semantic colors & trend badges
│   │   └── components/                  # UI Components:
│   │       ├── StocksUniverseView.tsx   # Master feature orchestrator
│   │       ├── StocksHeader.tsx         # KPI Banner (Discovered, Live, Latency)
│   │       ├── StocksToolbar.tsx        # Market chips, search, column & preset triggers
│   │       ├── StocksTable.tsx          # Virtualized sorted table
│   │       ├── StockRow.tsx             # Table row with live price ticks & trend badge
│   │       ├── StockDetailsDrawer.tsx   # 6-tab sliding drawer container
│   │       ├── StockOverview.tsx        # OHLC, 52W range, Volume vs Turnover
│   │       ├── StockChart.tsx           # Lightweight SVG interactive price chart
│   │       ├── StockAnalysis.tsx        # Explainable score (0-100) & English rationale
│   │       ├── StockFundamentals.tsx    # P/E, P/B, ROE, Debt/Equity (clean `—` states)
│   │       ├── StockTechnicals.tsx      # RSI, EMA, MACD, Pivot levels
│   │       ├── StockDataQuality.tsx     # Feed diagnostics, latency & freshness
│   │       ├── StockFiltersDrawer.tsx   # 10 collapsible filter categories
│   │       ├── ColumnManager.tsx        # Column visibility manager
│   │       ├── SavedScreens.tsx         # 1-click screener presets
│   │       └── EmptyErrorStates.tsx     # Graceful empty/offline states
│   │
│   ├── components/                      # Global Reusable Components
│   │   ├── layout/                      # Navigation, Command Bar, Sidebar
│   │   ├── market-universe/             # Multi-asset tables and modal inspectors
│   │   ├── options/                     # Option Chain Matrix, Greeks ladders
│   │   ├── crypto/                      # Crypto futures strips, order builder
│   │   └── ErrorBoundary.tsx            # Global crash recovery boundary
│   │
│   └── package.json                     # Frontend scripts and dependencies
│
├── scripts/                             # SYSTEM & TEST SCRIPTS
│   ├── dev_orchestrator.py              # Multi-process development supervisor
│   └── test_stocks_universe_browser.js  # Automated real Chrome browser verification
│
└── tests/                               # INTEGRATION & BACKEND PYTEST SUITES
```

---

## 3. Database Schemas & Data Models

### 3.1 Primary Database (`trading_platform.db`)

#### 1. `instruments` (Master Catalog)
- `instrument_id` (TEXT PRIMARY KEY) — Canonical ID (`{provider}:{exchange}:{symbol}`)
- `symbol` (TEXT) — Trading ticker symbol (e.g., `RELIANCE`, `AAPL`, `BTCUSDT`)
- `company_name` (TEXT) — Full corporate or token name
- `asset_class` (TEXT) — `STOCKS`, `CRYPTO`, `FUTURES`, `OPTIONS`, `FOREX`, `INDICES`
- `exchange` (TEXT) — `NSE`, `BSE`, `NASDAQ`, `NYSE`, `BINANCE`, `DELTA`
- `currency` (TEXT) — `INR`, `USD`, `USDT`, `EUR`, `GBP`
- `lot_size` (INTEGER) — Minimum contract or order increment
- `tick_size` (REAL) — Minimum price tick variation
- `isin` (TEXT) — International Securities Identification Number
- `is_fno_enabled` (BOOLEAN) — Whether derivatives trading is enabled

#### 2. `bots` (Trading Bot Instances)
- `bot_id` (TEXT PRIMARY KEY) — Unique bot instance ID (`bot_xxxxxx`)
- `name` (TEXT) — User-defined bot name
- `strategy_name` (TEXT) — Name of registered strategy (e.g. `Momentum_Confluence_v1`)
- `symbol` (TEXT) — Target trading instrument
- `status` (TEXT) — `ACTIVE`, `PAUSED`, `HALTED`, `STOPPED`
- `allocated_capital` (REAL) — Maximum allocated trading capital
- `max_drawdown_pct` (REAL) — Bot-level circuit breaker drawdown limit
- `created_at` (TIMESTAMP) — Creation timestamp

#### 3. `trades` & `orders` (Accounting Ledger)
- `trade_id` (TEXT PRIMARY KEY) — Unique trade identifier
- `bot_id` (TEXT) — Originating bot or `MANUAL`
- `symbol` (TEXT) — Executed instrument
- `side` (TEXT) — `BUY` or `SELL`
- `order_type` (TEXT) — `MARKET`, `LIMIT`, `STOP_LOSS`
- `quantity` (REAL) — Executed share or contract quantity
- `price` (REAL) — Executed fill price
- `pnl` (REAL) — Realized Profit / Loss
- `status` (TEXT) — `FILLED`, `CANCELLED`, `REJECTED`
- `timestamp` (TIMESTAMP) — Execution timestamp

#### 4. `stock_favorites` & `saved_screens` (`market_data/stocks/repository.py`)
- `instrument_id` (TEXT PRIMARY KEY) — Saved favorite stock ID
- `screen_id` (TEXT PRIMARY KEY) — Saved user screen identifier
- `screen_name` (TEXT) — Display name
- `filter_criteria_json` (TEXT) — Serialized JSON query filter state

---

## 4. API Schemas & Standard Envelope

All backend endpoints use the standardized `ApiResponseEnvelope`:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "meta": {
    "total": 19,
    "page": 1,
    "page_size": 50,
    "receivedTimestamp": 1788090000000,
    "latency_ms": 4.2
  },
  "errors": []
}
```

### Core API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/market-data/stocks` | `GET` | Paginated, filtered, and sorted pure equities screener |
| `/api/market-data/stocks/<id>` | `GET` | Individual stock quote snapshot with OHLC & 52W range |
| `/api/market-data/stocks/<id>/history` | `GET` | Multi-timeframe OHLCV candle series (`1m`, `5m`, `15m`, `1h`, `1d`) |
| `/api/market-data/stocks/<id>/fundamentals`| `GET` | Fundamental valuation multiples (P/E, P/B, EPS, ROE) |
| `/api/market-data/stocks/<id>/analysis` | `GET` | Explainable quantitative score (0-100) & English reasoning |
| `/api/market-data/stocks/movers` | `GET` | Top Gainers, Losers, and Most Active stocks |
| `/api/market-data/stocks/favorites` | `GET`/`POST` | Retrieve and toggle user favorite stocks |
| `/api/universe/instruments` | `GET` | Global multi-asset instrument registry |
| `/api/bots` | `GET`/`POST` | List and spawn algorithmic trading bots |
| `/api/risk/status` | `GET` | Universal risk engine status and kill-switch state |

---

## 5. Operations & Management Guide

### 5.1 How to Start the Complete System

To launch the backend, market data gateway, and frontend with a single command:

```bash
# From the root directory:
python run_system.py
```

Or run individual services in separate terminals:

```bash
# Terminal 1: Backend Flask API (Port 5050)
python dashboard.py

# Terminal 2: Market Data Gateway (Port 5051)
python start_gateway.py

# Terminal 3: Next.js Frontend (Port 3100)
cd frontend
npm run dev
```

*Access the Web Application*: Open **`http://localhost:3100`** in your browser.

---

### 5.2 Environment Variables & Configuration (`.env`)

Configure your credentials in `.env` in the root directory:

```env
# Flask Backend Configuration
FLASK_PORT=5050
FLASK_DEBUG=False
SECRET_KEY=your_secure_secret_key_here

# Upstox API (Indian Equities & F&O)
UPSTOX_API_KEY=your_upstox_api_key
UPSTOX_API_SECRET=your_upstox_api_secret
UPSTOX_REDIRECT_URI=http://localhost:3100/api/upstox/callback

# Delta Exchange (Crypto Options & Futures)
DELTA_API_KEY=your_delta_api_key
DELTA_API_SECRET=your_delta_api_secret

# Binance (Global Crypto Spot & Futures)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Telegram Alert Notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

---

### 5.3 How to Add a New Trading Strategy

1. Open `src/strategy.py` or `src/strategy_builder.py`.
2. Define a new strategy class inheriting from `BaseStrategy`:
   ```python
   class RsiBreakoutStrategy(BaseStrategy):
       def evaluate(self, quote, indicators):
           rsi = indicators.get("rsi_14", 50)
           if rsi < 30:
               return Signal(type="BUY", confidence=0.85, reason="Oversold RSI")
           elif rsi > 70:
               return Signal(type="SELL", confidence=0.85, reason="Overbought RSI")
           return Signal(type="HOLD")
   ```
3. Register the strategy in `src/strategy_ide_service.py`. It will immediately appear in the **Strategies Studio** and **Bot Fleet Creator** in the UI!

---

### 5.4 How to Run Automated Verification & Tests

```bash
# 1. Run Python Backend Pytest Suite
python -m pytest market_data/stocks/tests/

# 2. Run TypeScript Typecheck
cd frontend
npm run typecheck

# 3. Run Automated Real Browser Verification (Headless Chrome)
node scripts/test_stocks_universe_browser.js
```

---

### 5.5 System Recovery & Emergency Kill-Switch

- **Global Kill-Switch**: In the top navigation bar, click **`HALT`** to instantly pause all active bots, cancel pending orders, and prevent new trade execution.
- **Bot Deletion & Cleanup**: Use `python clean_leftover_test_bots.py` to reset test bots.
- **Database Self-Healing**: Database connections automatically self-heal and run schema migrations upon startup in `src/db.py`.
