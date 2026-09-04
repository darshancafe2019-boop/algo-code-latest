# Data Ownership & Canonical Store Matrix

Authoritative Source-of-Truth Architecture for Quant.OS / Alpha Algo Terminal.

---

## Authoritative Database Architecture

```text
CANONICAL STORE: H:\New folder\algo-code-main\data\trading_bot.db
ENGINE: SQLite with WAL (Write-Ahead Logging), 30s busy_timeout, with_db_retry jittered backoff
TOTAL TABLES: 113
```

All subsystems, services, and background workers must read from and write to this single authoritative database. No secondary operational databases are permitted.

---

## Domain Entity Ownership Matrix

| Domain / Entity | Authoritative Store (Table / Collection) | Primary Access Layer | Write Concurrency Control |
| :--- | :--- | :--- | :--- |
| **Users & Credentials** | `users`, `totp_enrollments`, `step_up_tokens` | `src/security_auth.py` | Bcrypt hashing, DB transaction |
| **User Sessions** | `user_sessions` | `src/security_auth.py` | Token rotation, HttpOnly cookie |
| **Security Audit** | `security_audit_events`, `security_alerts` | `src/security_rbac.py`, `src/db.py` | Append-only audit log |
| **Bot Instances & Leases** | `bot_instances`, `bot_worker_leases`, `bot_status` | `src/process_manager.py` | UUID-lease heartbeat, DB lock |
| **Bot Decision Logs** | `bot_decision_logs`, `decision_snapshots` | `src/trade_audit_engine.py` | Immutable decision audit trace |
| **Bot Activity Audit** | `bot_activity_logs`, `bot_event_audit` | `src/audit.py` | 32-field correlation-tagged event log |
| **Instruments Master** | `instruments`, `stock_instruments`, `delta_underlyings` | `src/instrument_resolver.py`, `src/symbol_master.py` | Canonical ID indexing |
| **Delta Options Contracts** | `delta_option_contracts`, `delta_option_expiries` | `src/market_data/options_workstation_service.py` | Synchronized contract catalog |
| **Orders Ledger** | `derivative_orders`, `multileg_orders`, `options_orders` | `src/execution_service.py`, `src/command_bus.py` | Idempotency key, atomic state updates |
| **Trades & Fills** | `trades_log`, `trade_fills`, `trade_history` (view) | `src/trade_ledger.py` | Primary key execution uniqueness |
| **Active Positions** | `derivative_positions`, `options_positions` | `src/trade_ledger.py`, `src/reconciliation.py` | Reconciled against broker state |
| **Position Transitions** | `position_transitions` | `src/trade_ledger.py` | Append-only state transition ledger |
| **Pre-Trade Risk State** | `risk_limits`, `risk_profiles`, `risk_rules`, `pre_trade_analysis` | `src/universal_risk_engine.py` | 14-Point Pre-Order Validation Gate |
| **Risk Decisions** | `risk_decisions`, `risk_gate_evaluations` | `src/universal_risk_engine.py` | Comprehensive Pass/Reject audit records |
| **Strategy Definitions** | `strategies`, `strategy_versions`, `custom_strategy_definitions` | `src/strategy_builder.py`, `src/strategy_ide_service.py` | Versioned immutable definition hash |
| **Backtest Runs** | `backtest_runs`, `backtest_trades`, `backtest_presets` | `src/backtester_v2.py` | Parameter-hashed reproducible runs |
| **Candles Cache** | `candles_cache` | `market_data_gateway/candle_store.py`, `src/candle_engine.py` | Composite unique index `(symbol, timeframe, timestamp)` |
| **Alerts & Incidents** | `alerts`, `alert_rules`, `alert_notifications`, `incidents` | `src/alert_engine.py`, `src/telegram_service.py` | Rate-limited deduplicated dispatch |
| **System Health** | `system_health`, `provider_health_status`, `heartbeat_log` | `src/monitoring.py`, `src/autonomous_repair_engine.py` | Periodic background health heartbeat |
