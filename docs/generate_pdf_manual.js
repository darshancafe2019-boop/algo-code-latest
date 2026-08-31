/**
 * Quant.OS Executive PDF Manual Generator
 * Uses Headless Chrome Puppeteer to render a high-res PDF manual.
 */

const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\059e8ae9-b1ec-4c9a-9c83-24ea329d5482";
const ROOT_DIR = "H:\\New folder\\algo-code-main";

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quant.OS System Architecture & Operations Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=JetBrains+Mono:wght@400;600;800&display=swap');

    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
      @bottom-right {
        content: counter(page);
        font-family: 'JetBrains Mono', monospace;
        font-size: 8pt;
        color: #64748b;
      }
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: #050811;
      color: #cbd5e1;
      line-height: 1.5;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4 {
      color: #f8fafc;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-top: 1.4em;
      margin-bottom: 0.5em;
    }

    h1 {
      font-size: 22pt;
      color: #38bdf8;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 0;
    }

    h2 {
      font-size: 14pt;
      color: #06b6d4;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 4px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      color: #e2e8f0;
      page-break-after: avoid;
    }

    p {
      margin: 0.5em 0;
    }

    code, pre {
      font-family: 'JetBrains Mono', monospace;
    }

    code {
      background-color: #0f172a;
      color: #38bdf8;
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 8.5pt;
      border: 1px solid #1e293b;
    }

    pre {
      background-color: #090d16;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      font-size: 8pt;
      color: #e2e8f0;
      overflow-x: auto;
      white-space: pre-wrap;
      line-height: 1.35;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #1e293b;
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background-color: #0f172a;
      color: #38bdf8;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.05em;
    }

    tr:nth-child(even) {
      background-color: #0a0f1d;
    }

    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-cyan {
      background-color: rgba(6, 182, 212, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }

    .badge-green {
      background-color: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .header-box {
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      border: 1px solid #0284c7;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .toc {
      background-color: #090d16;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .toc ul {
      list-style-type: none;
      padding-left: 0;
      margin: 0;
    }

    .toc li {
      margin: 4px 0;
      font-size: 9pt;
    }

    .toc a {
      color: #38bdf8;
      text-decoration: none;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- Cover / Header Banner -->
  <div class="header-box">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="margin: 0; border: none; padding: 0; font-size: 20pt;">QUANT.OS</h1>
        <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 10pt; font-weight: 600;">
          Institutional Algorithmic Trading, Multi-Asset Market Data &amp; Risk Platform
        </p>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-cyan">v2.0.0 ENTERPRISE</span><br>
        <span style="font-size: 8pt; color: #64748b;">Architecture &amp; Operations Manual</span>
      </div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h3 style="margin-top: 0; color: #38bdf8; font-size: 10pt; text-transform: uppercase;">Table of Contents</h3>
    <ul>
      <li><strong>1. System Technology Stack &amp; Architecture Overview</strong></li>
      <li><strong>2. Complete Master Directory &amp; File Map</strong></li>
      <li><strong>3. Database Schemas &amp; Data Models</strong></li>
      <li><strong>4. API Endpoints &amp; Standard Envelope Protocol</strong></li>
      <li><strong>5. Operations Guide: Launch, Manage, &amp; Monitor</strong></li>
      <li><strong>6. Strategy Development, Testing, &amp; Risk Forensics</strong></li>
    </ul>
  </div>

  <!-- Section 1 -->
  <h2>1. System Technology Stack &amp; Architecture Overview</h2>
  <p>
    Quant.OS is built on a decoupled, multi-process architecture engineered for high throughput, sub-10ms tick ingestion, deterministic quantitative analysis, and zero cross-asset contamination.
  </p>

  <table>
    <thead>
      <tr>
        <th>Layer</th>
        <th>Technologies</th>
        <th>Responsibilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend</strong></td>
        <td>Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query</td>
        <td>Institutional Trading Desk, Pro Charting, Stock Screener, Risk Terminal, Bot Fleet Management</td>
      </tr>
      <tr>
        <td><strong>Backend API</strong></td>
        <td>Python 3.10+, Flask, SQLite3, Multi-threading, Pytest</td>
        <td>REST API, SSE Event Streams, Strategy Evaluation, Technical Pipelines, Portfolio Accounting</td>
      </tr>
      <tr>
        <td><strong>Gateway</strong></td>
        <td>AsyncIO, WebSockets, Protobuf, Upstox SDK, CCXT, Delta API</td>
        <td>High-frequency market feeds, Tick multiplexing, Failover recovery, Decimal normalization</td>
      </tr>
      <tr>
        <td><strong>Persistence</strong></td>
        <td>SQLite (<code>trading_platform.db</code>), Thread-Safe TTL Caches</td>
        <td>Instrument Catalogs, Bot Configuration, Immutable Trade Ledgers, User Presets &amp; Favorites</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 2 -->
  <div class="page-break"></div>
  <h2>2. Complete Master Directory &amp; File Map</h2>
  <p>Detailed file locations and responsibilities across the entire workspace:</p>

  <h3>2.1 Python Backend Core (<code>src/</code>)</h3>
  <table>
    <thead>
      <tr>
        <th>File Path</th>
        <th>Description &amp; Key Functions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/config.py</code></td>
        <td>Centralized configuration, environment variables loader, and exchange URL registries.</td>
      </tr>
      <tr>
        <td><code>src/db.py</code></td>
        <td>SQLite database engine, connection pooling, transactional queries, and self-healing schema migrations.</td>
      </tr>
      <tr>
        <td><code>src/bot_runtime_service.py</code></td>
        <td>Bot lifecycle controller (spawn, start, pause, stop, parameter hot-reloading).</td>
      </tr>
      <tr>
        <td><code>src/live_runner.py</code></td>
        <td>Real-time algorithmic execution engine evaluating strategy signals against incoming tick streams.</td>
      </tr>
      <tr>
        <td><code>src/universal_risk_engine.py</code></td>
        <td>Global risk firewall: max drawdown circuit breaker, position sizing limits, and kill-switch control.</td>
      </tr>
      <tr>
        <td><code>src/trade_ledger.py</code></td>
        <td>Immutable transaction ledger recording fills, slippage, realized P&amp;L, and execution timestamps.</td>
      </tr>
      <tr>
        <td><code>src/indicators.py</code></td>
        <td>50+ mathematical indicator calculations: RSI, EMA (9/20/50/200), MACD, ATR, Bollinger, SuperTrend.</td>
      </tr>
      <tr>
        <td><code>src/option_chain_engine.py</code></td>
        <td>Options pricing engine calculating Black-Scholes Greeks (Delta, Gamma, Theta, Vega, IV) and strike ladders.</td>
      </tr>
      <tr>
        <td><code>src/upstox_service.py</code></td>
        <td>Upstox broker integration for Indian Equities (NSE/BSE) and Derivatives (NIFTY/BANKNIFTY).</td>
      </tr>
      <tr>
        <td><code>src/delta_options_service.py</code></td>
        <td>Delta Exchange integration for BTC/ETH crypto options and perpetual contracts.</td>
      </tr>
      <tr>
        <td><code>src/binance_market_data_service.py</code></td>
        <td>Binance real-time spot and USDT-M futures tick processor.</td>
      </tr>
    </tbody>
  </table>

  <h3>2.2 Modular Market Data Layer (<code>market_data/</code>)</h3>
  <table>
    <thead>
      <tr>
        <th>File Path</th>
        <th>Role in Stocks &amp; Multi-Asset Architecture</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>market_data/common/provider_interfaces.py</code></td>
        <td>Abstract base classes for market providers, streaming contracts, and capability bitmasks.</td>
      </tr>
      <tr>
        <td><code>market_data/common/canonical_ids.py</code></td>
        <td>Unified instrument identifier parser &amp; resolver (<code>{provider}:{exchange}:{key}</code>).</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/taxonomy.py</code></td>
        <td>Pure equity classification engine ensuring 0 derivative options leaks on stocks or spot crypto.</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/quote_engine.py</code></td>
        <td>Real-time snapshot engine producing normalized stock quotes with Decimal arithmetic.</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/analysis_engine.py</code></td>
        <td>Deterministic quantitative scoring engine (0-100 score, directional bias, plain-English summary).</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/fundamentals_engine.py</code></td>
        <td>Corporate filings multiples (P/E, P/B, EPS, ROE, Debt/Equity) with strict <code>None</code> fallback.</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/technical_engine.py</code></td>
        <td>Technical indicators &amp; floor trader pivot levels (R1, R2, PP, S1, S2).</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/screener_engine.py</code></td>
        <td>Multi-parameter filtered, sorted, and paginated screener engine.</td>
      </tr>
      <tr>
        <td><code>market_data/stocks/routes.py</code></td>
        <td>Flask blueprint registering all <code>/api/market-data/stocks</code> REST &amp; SSE routes.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <h3>2.3 Frontend Application (<code>frontend/</code>)</h3>
  <table>
    <thead>
      <tr>
        <th>Directory / Component</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>frontend/app/markets/page.tsx</code></td>
        <td>Unified Markets &amp; Screener page hosting the dedicated Stocks Universe and Multi-Asset tables.</td>
      </tr>
      <tr>
        <td><code>frontend/src/features/markets/stocks/</code></td>
        <td>Self-contained Stocks Universe feature (API client, Zustand store, React Query hooks, and components).</td>
      </tr>
      <tr>
        <td><code>StocksUniverseView.tsx</code></td>
        <td>Master Stocks Screener container orchestrating headers, search chips, table, and details drawer.</td>
      </tr>
      <tr>
        <td><code>StockDetailsDrawer.tsx</code></td>
        <td>6-tab sliding drawer: Overview (OHLC/52W), SVG Chart, Analysis, Fundamentals, Technicals, Diagnostics.</td>
      </tr>
      <tr>
        <td><code>StockFiltersDrawer.tsx</code></td>
        <td>10-category collapsible filter drawer with instant match preview and reset actions.</td>
      </tr>
      <tr>
        <td><code>frontend/app/dashboard/page.tsx</code></td>
        <td>Command Center overview displaying fleet KPIs, active positions, P&amp;L charts, and system status.</td>
      </tr>
      <tr>
        <td><code>frontend/app/charts/page.tsx</code></td>
        <td>TradingView Pro multi-timeframe interactive charting workstation.</td>
      </tr>
      <tr>
        <td><code>frontend/app/bots/page.tsx</code></td>
        <td>Bot Fleet Commander: spawn new bots, monitor decision logs, view real-time tick execution.</td>
      </tr>
      <tr>
        <td><code>frontend/app/options/page.tsx</code></td>
        <td>Options Command Center featuring live strike ladders, Greeks matrix, and multi-leg strategy builder.</td>
      </tr>
      <tr>
        <td><code>frontend/app/risk/page.tsx</code></td>
        <td>Universal Risk Engine forensics, max loss monitors, and emergency kill-switch controls.</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 3 -->
  <h2>3. Database Schemas &amp; Models</h2>
  <pre>
-- 1. Master Instruments Catalog (trading_platform.db)
CREATE TABLE instruments (
    instrument_id TEXT PRIMARY KEY,       -- e.g. "upstox:NSE:RELIANCE"
    symbol TEXT NOT NULL,                -- e.g. "RELIANCE"
    company_name TEXT,                   -- e.g. "Reliance Industries Limited"
    asset_class TEXT NOT NULL,           -- STOCKS, CRYPTO, FUTURES, OPTIONS, FOREX
    exchange TEXT NOT NULL,              -- NSE, BSE, NASDAQ, NYSE, BINANCE, DELTA
    currency TEXT DEFAULT 'INR',         -- INR, USD, USDT
    lot_size INTEGER DEFAULT 1,
    tick_size REAL DEFAULT 0.05,
    isin TEXT,
    is_fno_enabled BOOLEAN DEFAULT 0
);

-- 2. Algorithmic Bot Instances
CREATE TABLE bots (
    bot_id TEXT PRIMARY KEY,             -- e.g. "bot_a8f9c1"
    name TEXT NOT NULL,
    strategy_name TEXT NOT NULL,         -- e.g. "Momentum_Confluence_v1"
    symbol TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',        -- ACTIVE, PAUSED, HALTED, STOPPED
    allocated_capital REAL NOT NULL,
    max_drawdown_pct REAL DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Immutable Trade & Order Ledger
CREATE TABLE trades (
    trade_id TEXT PRIMARY KEY,
    bot_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,                  -- BUY, SELL
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    pnl REAL DEFAULT 0.0,
    status TEXT DEFAULT 'FILLED',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  </pre>

  <!-- Section 4 -->
  <div class="page-break"></div>
  <h2>4. Standard API Envelope &amp; Core Endpoints</h2>
  <pre>
// Standard API Envelope Contract (ApiResponseEnvelope)
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
  </pre>

  <table>
    <thead>
      <tr>
        <th>Endpoint</th>
        <th>Method</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>/api/market-data/stocks</code></td>
        <td><code>GET</code></td>
        <td>Paginated pure equity screener with multi-criteria filters and sorting.</td>
      </tr>
      <tr>
        <td><code>/api/market-data/stocks/&lt;id&gt;</code></td>
        <td><code>GET</code></td>
        <td>Real-time stock quote snapshot with OHLC, 52W range, and volume.</td>
      </tr>
      <tr>
        <td><code>/api/market-data/stocks/&lt;id&gt;/history</code></td>
        <td><code>GET</code></td>
        <td>Multi-timeframe OHLCV historical candle series (<code>1m</code> to <code>1d</code>).</td>
      </tr>
      <tr>
        <td><code>/api/market-data/stocks/&lt;id&gt;/analysis</code></td>
        <td><code>GET</code></td>
        <td>Explainable quantitative analysis (0-100 score &amp; English reasoning).</td>
      </tr>
      <tr>
        <td><code>/api/market-data/stocks/movers</code></td>
        <td><code>GET</code></td>
        <td>Ranked Top Gainers, Losers, and Most Active equities.</td>
      </tr>
      <tr>
        <td><code>/api/bots</code></td>
        <td><code>GET/POST</code></td>
        <td>List active trading bots or spawn new algorithmic bot instances.</td>
      </tr>
      <tr>
        <td><code>/api/risk/status</code></td>
        <td><code>GET</code></td>
        <td>Universal risk status, drawdown meters, and global kill-switch state.</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 5 -->
  <h2>5. Operations &amp; Management Guide</h2>

  <h3>5.1 Launching the Complete System</h3>
  <pre>
# Single-command launch from repository root:
python run_system.py

# Or launch services independently:
python dashboard.py          # Port 5050 (Flask Backend API)
python start_gateway.py      # Port 5051 (Market Data Gateway)
cd frontend &amp;&amp; npm run dev   # Port 3100 (Next.js Frontend)
  </pre>

  <h3>5.2 Verification &amp; Automated Testing</h3>
  <pre>
# 1. Run Python Backend Test Suite (Pytest)
python -m pytest market_data/stocks/tests/

# 2. Run TypeScript Typecheck
cd frontend &amp;&amp; npm run typecheck

# 3. Run Automated Chrome Browser Verification
node scripts/test_stocks_universe_browser.js
  </pre>

  <h3>5.3 Emergency Controls</h3>
  <ul>
    <li><strong>Global Emergency Kill-Switch:</strong> Click the red <code>HALT</code> button on the top command bar or write <code>{"kill": true}</code> to <code>kill_switch.flag</code>. All active bots will immediately pause and cancel unfulfilled orders.</li>
    <li><strong>Database Reset &amp; Cleanup:</strong> Run <code>python clean_leftover_test_bots.py</code> to clear orphaned test bots.</li>
  </ul>

  <div style="margin-top: 30px; padding: 12px; border: 1px solid #1e293b; border-radius: 8px; font-size: 8pt; color: #64748b; text-align: center;">
    Quant.OS Platform Manual &bull; Generated Automatically &bull; Confidential &amp; Proprietary
  </div>

</body>
</html>
`;

async function generatePdf() {
  console.log("Generating styled HTML template...");
  const tempHtmlPath = path.join(ROOT_DIR, "docs", "quantos_manual.html");
  fs.writeFileSync(tempHtmlPath, HTML_CONTENT, "utf-8");

  console.log("Launching Headless Chrome for PDF compilation...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(HTML_CONTENT, { waitUntil: "networkidle0" });

  const rootPdfPath = path.join(ROOT_DIR, "QuantOS_Complete_Codebase_Manual.pdf");
  const artifactPdfPath = path.join(ARTIFACTS_DIR, "QuantOS_Complete_Codebase_Manual.pdf");

  console.log(`Printing PDF to: ${rootPdfPath}...`);
  await page.pdf({
    path: rootPdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "15mm",
      bottom: "15mm",
      left: "15mm",
      right: "15mm",
    },
  });

  // Copy to artifacts
  fs.copyFileSync(rootPdfPath, artifactPdfPath);
  console.log(`Copied PDF to artifacts: ${artifactPdfPath}`);

  await browser.close();
  console.log("PDF manual generation complete!");
}

generatePdf().catch(console.error);
