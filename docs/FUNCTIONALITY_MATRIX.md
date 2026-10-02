# Quant.OS Live-Trading Functionality & Safety Matrix

**Document Version:** 3.0  
**Audit Phase:** Phase 0 (Baseline Audit)  
**Priority Tiers:**
- **P0:** Safety-Critical / Live-Execution Blocker (Order execution, Risk limits, Position truth, Fills, Reconciliation, Kill-switch)
- **P1:** Core Operational Feature (Indicators, Sizing modes, Wizard flow, Option Chain, Telemetry)
- **P2:** Extended Workflow / Analytics (Replay, Backtest, Exports, UI Polish)

---

## Complete Capabilities Matrix

| ID | Capability / Domain | Component Files | Priority | Verification Test | Expected / Verified Result | Evidence / Log Ref | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CFG-01** | Canonical Config Schema V2 Serialization | `src/canonical_bot_config.py`<br>`frontend/lib/store/useBotCreationStore.ts` | **P0** | `test_canonical_bot_config_v2` | Bi-directional JSON serialization with exact field matching | `docs/AUDIT.md` | **PASS** |
| **CFG-02** | Deterministic Config SHA-256 Hashing | `src/canonical_bot_config.py`<br>`frontend/lib/store/botCreationStateMachine.ts` | **P0** | `test_config_hash_determinism` | Same config generates identical SHA-256 hash | `docs/AUDIT.md` | **PASS** |
| **CFG-03** | Wizard Field Mapping Reconciled (No Silent Drops) | `frontend/components/bot-instance/steps/Step1-7`<br>`src/canonical_bot_config.py` | **P0** | `test_wizard_to_canonical_mapping` | Sizing, risk, market, and provider fields reach canonical store | Phase 1 Gate | **PENDING_P1** |
| **INS-01** | Canonical Instrument Key Resolution | `src/instrument_resolver.py`<br>`src/contract_resolver.py` | **P0** | `test_instrument_resolver_canonical` | Resolves canonical keys (`NSE_FO:...`, `DELTA:...`, `BINANCE:...`) | `tests/test_instrument_resolver.py` | **PASS** |
| **INS-02** | Separate Signal vs Execution Instrument | `src/instrument_resolver.py`<br>`src/bot_runtime_service.py` | **P0** | `test_signal_vs_execution_separation` | Evaluates underlying spot while executing option contract | `tests/test_options_execution.py` | **PASS** |
| **INS-03** | Expired & Invalid Instrument Rejection | `src/instrument_resolver.py`<br>`src/contract_resolver.py` | **P0** | `test_reject_expired_instrument` | Blocks order creation on expired or unmapped contracts | Phase 2 Gate | **PENDING_P2** |
| **MKT-01** | Low-Latency WebSocket Market Gateway | `market_data_gateway/gateway.py` (Port 5051) | **P0** | `test_websocket_gateway_stream` | Live multi-provider WebSocket streaming with sub-50ms latency | Gateway Live (Port 5051) | **PASS** |
| **MKT-02** | Normalized Market Event Envelope | `market_data_gateway/gateway.py`<br>`src/data_core/models/events.py` | **P0** | `test_normalized_tick_structure` | Symbol, bid, ask, last, volume, timestamp, age_ms, is_stale | `docs/AUDIT.md` | **PASS** |
| **MKT-03** | Hard Data Freshness SLA Gate (Fail-Closed) | `src/universal_risk_engine.py`<br>`src/bot_runtime_service.py` | **P0** | `test_stale_data_entry_block` | Live entries blocked when tick age exceeds maxTickAgeMs | Phase 3 Gate | **PENDING_P3** |
| **MKT-04** | Zero Synthetic Price Fallbacks in LIVE Mode | `src/premium_resolver.py`<br>`src/bot_runtime_service.py` | **P0** | `test_no_synthetic_prices_in_live` | Blocks trade with clear error if real quote unavailable | Phase 3 Gate | **PENDING_P3** |
| **IND-01** | 20 Mathematical Indicators Calculation | `src/indicators.py`<br>`frontend/lib/indicators/indicatorsCatalog.ts` | **P1** | `test_indicators_calculation_benchmarks` | EMA, MACD, RSI, Supertrend, VWAP, ATR match benchmarks | `tests/test_indicators.py` | **PASS** |
| **STR-01** | Strategy Pure Signal Generation (HOLD/LONG/SHORT/EXIT) | `src/strategy.py`<br>`src/master_30_strategies.py` | **P1** | `test_strategy_signal_emission` | Pure signal emitted with confidence, timestamp, and reason | `tests/test_master_30_strategies.py` | **PASS** |
| **RSK-01** | 4-Tier Multi-Layered Risk Architecture | `src/universal_risk_engine.py` | **P0** | `test_universal_risk_engine_4tiers` | Bot, Account, Portfolio, and System tiers evaluated | `src/universal_risk_engine.py` | **PASS** |
| **RSK-02** | Stop Loss, Take Profit & Trailing Stop | `src/universal_risk_engine.py`<br>`src/execution_service.py` | **P0** | `test_stop_loss_and_take_profit` | Triggers protective exit order when price crosses threshold | `tests/test_risk_management.py` | **PASS** |
| **RSK-03** | Max Daily Loss & Drawdown Hard Ceiling | `src/universal_risk_engine.py` | **P0** | `test_max_daily_loss_ceiling` | Blocks further entries once daily loss ceiling reached | Phase 5 Gate | **PENDING_P5** |
| **RSK-04** | Global Kill Switch Emergency Halt | `src/universal_risk_engine.py`<br>`src/command_bus.py` | **P0** | `test_kill_switch_halt` | Instantly cancels pending orders and blocks all entries | `tests/test_kill_switch_halt.py` | **PASS** |
| **RSK-05** | Exits Allowed During Outage / Lock | `src/universal_risk_engine.py`<br>`src/execution_service.py` | **P0** | `test_risk_reducing_exits_always_allowed` | Risk-reducing exits pass even when entries are blocked | Phase 5 Gate | **PENDING_P5** |
| **EXE-01** | Single Authoritative Execution Service | `src/execution_service.py` (`OrderExecutionService`) | **P0** | `test_order_execution_service_authority` | 100% of broker orders route through single execution service | Phase 6 Gate | **PENDING_P6** |
| **EXE-02** | Idempotent Order Dispatch (`client_order_id`) | `src/execution_service.py`<br>`src/command_bus.py` | **P0** | `test_idempotent_order_dispatch` | Duplicate command or retry never submits duplicate order | `tests/test_idempotency.py` | **PASS** |
| **EXE-03** | Broker Query on Submission Timeout | `src/execution_service.py` | **P0** | `test_timeout_broker_query_before_retry` | Queries broker state on timeout; never blindly resubmits | Phase 6 Gate | **PENDING_P6** |
| **EXE-04** | Full Order Lifecycle State Machine | `src/execution_service.py`<br>`src/data_core/models/orders.py` | **P0** | `test_order_lifecycle_transitions` | INTENT $\rightarrow$ PREFLIGHT $\rightarrow$ SUBMITTED $\rightarrow$ ACK $\rightarrow$ FILLED | `tests/test_order_lifecycle.py` | **PASS** |
| **POS-01** | Position State from Actual Broker Fills | `src/trade_ledger.py`<br>`src/execution_service.py` | **P0** | `test_position_truth_from_fills` | Position quantity and price calculated strictly from fills | Phase 6 Gate | **PENDING_P6** |
| **POS-02** | Positions Never Deleted on Exit | `src/db.py`<br>`src/trade_ledger.py` | **P0** | `test_position_close_preserves_history` | Positions transition to CLOSED; records are never deleted | `tests/test_trade_ledger.py` | **PASS** |
| **REC-01** | Startup & Periodic State Reconciliation | `src/reconciliation.py`<br>`src/db.py` | **P0** | `test_startup_reconciliation` | Cross-checks internal positions with broker OMS on startup | `tests/test_reconciliation.py` | **PASS** |
| **REC-02** | Discrepancy Detection Blocks Live Entries | `src/reconciliation.py`<br>`src/bot_runtime_service.py` | **P0** | `test_reconciliation_unhealthy_blocks_entry` | Sets status to RECONCILIATION_REQUIRED and blocks entry | Phase 7 Gate | **PENDING_P7** |
| **LFE-01** | Verified Multi-Stage Startup State Machine | `src/bot_runtime_service.py`<br>`src/process_manager.py` | **P0** | `test_startup_state_machine_verified` | Status becomes RUNNING only after data & broker verified | Phase 7 Gate | **PENDING_P7** |
| **LFE-02** | Safe Pause, Stop & Deletion Guards | `src/process_manager.py`<br>`src/command_bus.py` | **P0** | `test_bot_deletion_and_bulk_suite` | Deletion blocked if open positions or orders exist | `test_bot_deletion_and_bulk_suite.py` | **PASS** |
| **SEC-01** | Secret Redaction in Logs & Payloads | `src/security_auth.py`<br>`src/audit.py` | **P0** | `test_secret_redaction_in_audit_and_api` | API keys and tokens never logged or returned in responses | `tests/test_security_hardening.py` | **PASS** |
| **LIV-01** | Supervised Testnet/Sandbox Execution Proof | `src/execution_service.py` | **P0** | `test_testnet_full_lifecycle_proof` | Proves all 16 steps of Section 4C with broker confirmations | Phase 9 Gate | **PENDING_P9** |
