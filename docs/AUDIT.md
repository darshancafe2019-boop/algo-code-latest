# QUANT.OS — PHASE 0 AUTHORITATIVE READ-ONLY AUDIT REPORT

**Date of Audit:** 2026-10-02  
**Audit Mode:** Strict Read-Only Under AUDIT LOCK  
**Audit Scope:** Full-Stack Architecture, Execution Pathways, Database Writers, Market Data Gateway, Safety Gates, Fallback Mechanics, and Risk Engines.

---

## 1. Executive Summary & Core Architectural Invariants

Quant.OS is a modular institutional algorithmic trading workstation composed of:
- **Frontend Workstation:** Next.js 14 / TypeScript / Tailwind / Shadcn UI on port `3100` (`http://localhost:3100`)
- **Backend API & Supervisor:** Python FastAPI/Flask REST & SSE engine on port `5050`
- **Market Data Gateway:** Multi-provider WebSocket streaming hub on port `5051`
- **Authoritative Persistence:** SQLite database (`data/trading_bot.db` ~18.4 MB)

### Primary Findings:
1. **Execution Path Divergence:** Trade execution routes through multiple competing files (`src/execution_service.py`, `src/execution.py`, `src/broker_router.py`, `src/order_router.py`, and `src/live_runner.py`).
2. **Database Single-Writer Violations:** Several legacy routines execute direct `INSERT/UPDATE` queries into `positions`, `orders`, and `trades` rather than delegating exclusively to `OrderExecutionService` and `TradeLedger`.
3. **Live Fallback Risks:** Certain pricing routines contain fallbacks that default to synthetic, estimated, or previous tick values if quotes drop. In `LIVE` mode, all risk-increasing actions must fail closed.
4. **Configuration Deserialization Gaps:** Parameter naming differences between frontend wizard state (`sizingMode`, `maxDailyLoss`) and backend schema (`sizing_method`, `max_daily_loss_amount`) require strict canonical serialization.

---

## 2. Search Coverage Manifest

| PATH / AREA | INSPECTED | SKIPPED | REASON |
| :--- | :--- | :--- | :--- |
| `src/` | **YES** | NO | Core backend services, runtime, execution, risk, adapters |
| `frontend/` | **YES** | NO | React components, Next.js routes, stores, state machine |
| `market_data_gateway/` | **YES** | NO | Port 5051 WebSocket gateway, provider feeds |
| `tests/` | **YES** | NO | Complete automated pytest test suite (1396 test items) |
| `scripts/` | **YES** | NO | Orchestrators, maintenance scripts, database utilities |
| `data/` | **YES** | NO | Database schema inspection on safe local database copies |
| `docs/` | **YES** | NO | Architecture manuals, schema specs, migration logs |
| `notebooks/` | **SKIPPED** | **YES** | Directory does not exist in repository root |
| `legacy/` | **SKIPPED** | **YES** | Directory does not exist in repository root |

---

## 3. Database Schema & Ledger Architecture Map

**Authoritative Database File:** `data/trading_bot.db`

| Domain / Responsibility | Table Name | Primary Key | Foreign Keys / Link IDs | Authoritative Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Bot Instances** | `bot_instances` | `id` (TEXT) | `broker_account_id`, `customer_id` | Bot configuration, lifecycle state (`STOPPED`, `STARTING`, `RUNNING`, `PAUSED`), mode (`PAPER`, `LIVE`) |
| **Bot Deployments** | `bot_deployments` | `deployment_id` (TEXT) | `bot_id`, `config_hash` | Immutable snapshot of deployed bot configuration version |
| **Configuration Versions**| `bot_config_versions` | `id` (INTEGER AUTO) | `bot_id`, `version` | Version history of all parameter updates and change reasons |
| **Orders Ledger** | `orders` | `id` (TEXT / UUID) | `bot_id`, `client_order_id`, `broker_order_id`, `correlation_id` | Authoritative order state transitions |
| **Order Events** | `order_events` | `id` (INTEGER AUTO) | `order_id`, `correlation_id` | Append-only event history for every order transition |
| **Fills & Executions** | `fills` / `order_fills` | `fill_id` (TEXT) | `order_id`, `broker_order_id`, `bot_id` | Exact execution fill quantity, price, fee, slippage, timestamp |
| **Positions Ledger** | `positions` | `id` (TEXT / UUID) | `bot_id`, `symbol`, `canonical_instrument_id` | Open position size, average entry price, unrealized MTM PnL |
| **Trade History** | `trades` | `id` (TEXT) | `bot_id`, `position_id`, `entry_order_id`, `exit_order_id` | Closed trade cycles with realized PnL and hold duration |
| **Capital Movements** | `capital_ledger` | `id` (TEXT) | `broker_account_id`, `bot_id` | Portfolio capital reservations, allocations, and releases |
| **Audit Log** | `bot_event_audit` | `id` (INTEGER AUTO) | `bot_instance_id`, `correlation_id` | Immutable security and operational audit trail |
| **Idempotent Commands**| `bot_commands` | `command_id` (TEXT) | `bot_id`, `idempotency_key` | Deduplication lock for bot start/stop/pause commands |
| **Worker Leases** | `bot_worker_leases`| `bot_id` (TEXT) | `process_pid`, `lease_token` | Exclusive single-worker process lease lock |

---

## 4. Direct Broker Call Table

| File & Line | Function | Broker / API | Caller / Call Chain | Mode | Reachable? | Through `OrderExecutionService`? | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/execution_service.py:382` | `submit_order_intent()` | Upstox / Dhan / Binance / Delta | `live_runner.py` $\rightarrow$ `OrderExecutionService` | PAPER / LIVE | **REACHABLE** | **YES** | Authoritative unified order entry path |
| `src/execution_service.py:590` | `execute_exit()` | Upstox / Dhan / Binance / Delta | `live_runner.py` / Risk Engine $\rightarrow$ `OrderExecutionService` | PAPER / LIVE | **REACHABLE** | **YES** | Authoritative exit execution path |
| `src/execution.py:145` | `execute_order()` | Direct Broker Adapters | Legacy test runners / scripts | PAPER / LIVE | **REACHABLE** | **NO (Legacy)** | Bypasses `OrderExecutionService` event ledger |
| `src/broker_router.py:410` | `place_broker_order()` | Upstox / Dhan / Delta | Direct API endpoints in `dashboard.py` | LIVE | **REACHABLE** | **NO (Direct)** | Direct manual order placement endpoint |
| `src/dhan_broker_adapter.py:210`| `place_order()` | Dhan HQ REST API | `ExecutionEngine` $\rightarrow$ `DhanBrokerAdapter` | LIVE | **REACHABLE** | Conditional | Low-level transport adapter |
| `src/upstox_service.py:1420` | `place_order()` | Upstox API V2/V3 | `ExecutionEngine` $\rightarrow$ `UpstoxService` | LIVE | **REACHABLE** | Conditional | Low-level transport adapter |
| `src/delta_broker_adapter.py:310`| `create_order()` | Delta Exchange REST API | `ExecutionEngine` $\rightarrow$ `DeltaBrokerAdapter` | LIVE | **REACHABLE** | Conditional | Low-level transport adapter |
| `src/binance_broker_adapter.py:180`| `create_order()` | Binance Futures / Spot REST | `ExecutionEngine` $\rightarrow$ `BinanceBrokerAdapter` | LIVE | **REACHABLE** | Conditional | Low-level transport adapter |

---

## 5. Database Writer Audit

### Orders Ledger Writers
| File & Line | Entity | Operation | Function / Caller | Mode | Transactional? | `bot_id`? | `deployment_id`? | `correlation_id`? | Reachable? | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/execution_service.py:410` | `orders` | `INSERT` | `record_order_intent()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Primary authoritative order creation |
| `src/execution_service.py:495` | `orders` | `UPDATE` | `update_order_state()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Order lifecycle state transitions |
| `src/trade_ledger.py:185` | `orders` | `INSERT` | `log_order_event()` | PAPER/LIVE | **YES** | **YES** | **NO** | **YES** | **REACHABLE** | Audit backup order logging |
| `src/db.py:840` | `orders` | `INSERT` | `insert_order_record()` | PAPER/LIVE | **YES** | **YES** | **NO** | **NO** | **REACHABLE** | Low-level DB helper |

### Positions Ledger Writers
| File & Line | Entity | Operation | Function / Caller | Mode | Transactional? | `bot_id`? | `deployment_id`? | `correlation_id`? | Reachable? | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/execution_service.py:530` | `positions` | `INSERT` | `_create_or_update_position()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Created strictly on broker fill |
| `src/execution_service.py:620` | `positions` | `UPDATE` | `_close_position_on_fill()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Marked `CLOSED`, never deleted |
| `src/trade_ledger.py:310` | `positions` | `UPDATE` | `update_mtm_valuation()` | PAPER/LIVE | **YES** | **YES** | **NO** | **NO** | **REACHABLE** | MTM price & unrealized PnL updates |
| `dashboard.py:1210` | `positions` | `UPDATE` | `manual_close_position()` | PAPER/LIVE | **YES** | **YES** | **NO** | **YES** | **REACHABLE** | User UI manual square-off |

### Fills & Trades Ledger Writers
| File & Line | Entity | Operation | Function / Caller | Mode | Transactional? | `bot_id`? | `deployment_id`? | `correlation_id`? | Reachable? | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/execution_service.py:512` | `fills` | `INSERT` | `record_fill()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Authoritative fill ingestion |
| `src/execution_service.py:640` | `trades` | `INSERT` | `record_completed_trade()` | PAPER/LIVE | **YES** | **YES** | **YES** | **YES** | **REACHABLE** | Realized trade cycle recording |
| `src/trade_ledger.py:440` | `trades` | `INSERT` | `record_trade()` | PAPER/LIVE | **YES** | **YES** | **NO** | **YES** | **REACHABLE** | Legacy trade ledger writer |

---

## 6. LIVE Fallback Audit

| File & Line | Fallback Type | Trigger | Reachable? | Severity | Real Order Possible Today? | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/live_runner.py:260` | Option price estimation | Market closed / unquoted option | **REACHABLE** | **HIGH** | **NO (Gated in LIVE)** | Intrinsic Black-Scholes estimate in paper mode |
| `src/upstox_service.py:1380`| Synthetic candle generation | Unauthenticated REST request | **REACHABLE** | **MEDIUM**| **NO** | Synthetic candles only generated if `allow_fallback=True` |
| `src/resilient_ticker_service.py:180`| Stale cache fallback | Gateway disconnect > 5000ms | **REACHABLE** | **HIGH** | **YES (If unguarded)** | Emits last known cached price with quality warning |
| `src/instrument_resolver.py:410`| Alias resolution fallback | Missing exchange prefix | **REACHABLE** | **MEDIUM**| **NO** | Resolves canonical symbol format |

---

## 7. Responsibility & Component Consolidation Matrix

| Responsibility | Competing / Legacy Implementations | Authoritative Component | Consolidation Plan |
| :--- | :--- | :--- | :--- |
| **Order Execution** | `src/execution.py`, `src/broker_router.py`, `live_runner.py` direct queries | **`src/execution_service.py` (`OrderExecutionService`)** | Route all orders, exits, SL/TP, and kill-switch closes exclusively through `OrderExecutionService`. |
| **Risk & Sizing** | `src/risk_manager.py`, inline checks in `live_runner.py` | **`src/universal_risk_engine.py` (`UniversalRiskEngine`)** | Enforce 4-tier risk validation (account, bot, order, market) in single engine. |
| **Market Data Streaming** | REST polling in `data_fetcher.py`, direct socket clients | **`market_data_gateway/gateway.py` (`MarketDataGateway`)** | Port 5051 WebSocket gateway is single tick streaming authority. |
| **Bot Configuration** | Ad-hoc dicts in `dashboard.py`, unversioned payloads | **`src/canonical_bot_config.py` (`CanonicalBotConfig`)** | All wizard payloads and workers must deserialize via `CanonicalBotConfig.from_dict()`. |
| **Instrument Resolution** | Raw symbol strings in UI / bot configs | **`src/instrument_resolver.py` & `src/contract_resolver.py`** | Resolve canonical instrument keys before evaluating strategy intent. |
| **Position Truth** | Direct DB updates across worker scripts | **`OrderExecutionService` & `src/trade_ledger.py`** | Derive position state strictly from confirmed broker fills. |

---

## 8. Secrets Safety Scan

| File & Line | Secret Type | Severity | Status |
| :--- | :--- | :--- | :--- |
| `.env` | Broker API Keys & Secrets | Informational | Excluded from git via `.gitignore`; credentials redacted in all logs |
| `src/config.py:110` | Environment variable loaders | Informational | Safely reads from `os.getenv` without hardcoded secrets |
| `src/upstox_service.py:618` | Access token logger | Low | Uses masked string `********{token[-4:]}` for logging |
| `src/delta_broker_adapter.py:85` | Signature HMAC generator | Low | Computes SHA-256 HMAC in-memory without logging raw secret |

---

## 9. Baseline Test Suite Audit

**Environment Details:**
- Git Commit: `4a4ac37eb2bc8f73d0788e3716fbaa6e66cc2dd3`
- Operating System: Windows 11 (AMD64)
- Python Version: `3.14.6`
- Node Version: `v24.19.0`
- npm Version: `11.17.0`

### Test Suite Execution Summary
- **Total Test Items Collected:** 1,396 tests
- **Run #1 (Baseline):** 1,345 Passed, 51 Failed, 3 Warnings (Duration: 973.34s)
- **Run #2 (Confirmation):** 1,345 Passed, 51 Failed, 3 Warnings (Duration: 968.10s)
- **Flaky Tests Identified:** 0 (Failures are 100% deterministic)

### Classification of Failing Tests (51 Total):
1. **Mock Gateway Unstarted (28 tests):** Tests in `test_gateway_websocket_live_pipeline.py`, `test_market_gateway.py` expect port 5051 socket server to be pre-spawned. (`TEST_ENVIRONMENT`)
2. **Ghost Database Check (1 test):** `test_wave_a_architecture_and_reconciliation.py` flags backup files in root directory. (`OUTDATED_TEST`)
3. **Legacy Broker Mock Expectations (22 tests):** Tests in `test_actionable_option_chain_execution.py`, `test_direct_option_order_execution.py` expect legacy return dict structures instead of modern `OrderExecutionService` dataclasses. (`OUTDATED_TEST`)

---

## 10. "Could Not Determine" & "Assumptions Made"

### Could Not Determine:
- Real-world fill latency and slippage under high-volatility events on live Indian exchange (NSE) and Delta crypto exchange, as live trading order placement is strictly locked in Phase 0.

### Assumptions Made:
- Broker REST and WebSocket API contracts for Upstox V3, Dhan HQ V2, Binance Futures, and Delta Exchange comply with official documentation specifications.
- SQLite WAL (Write-Ahead Logging) mode is supported by the host filesystem for high-concurrency ledger writes.

---

## 11. Final Phase 0 Status & Recommendation

```text
PHASE 0 = COMPLETE — AWAITING HUMAN REVIEW
```

**Recommended Phase 1 Scope:**
Proceed with Phase 1 (Config Integrity: Wizard to Backend) to reconcile all wizard fields, enforce immutable `bot_config_versions` snapshotting, and validate deterministic `config_hash` generation.
