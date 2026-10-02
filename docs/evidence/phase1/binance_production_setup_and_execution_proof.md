# QUANT.OS — BINANCE SPOT PRODUCTION EXECUTION PIPELINE

## Executive Summary

The execution pipeline has been updated to support separated **Binance Spot PRODUCTION (`https://api.binance.com`)** and **Binance Spot TESTNET (`https://testnet.binance.vision`)**, with strict fail-closed enforcement and zero silent fallbacks.

---

## 1. Production vs Testnet Separation Architecture

| Layer | Binance Spot Testnet | Binance Spot Production (`LIVE`) |
|---|---|---|
| **API Endpoint** | `https://testnet.binance.vision` | `https://api.binance.com` |
| **API Key Variable** | `BINANCE_TESTNET_API_KEY` | `BINANCE_LIVE_API_KEY` |
| **Secret Key Variable** | `BINANCE_TESTNET_SECRET_KEY` | `BINANCE_LIVE_SECRET_KEY` |
| **Sandbox Mode** | `set_sandbox_mode(True)` | `set_sandbox_mode(False)` |
| **Data Fetcher** | `DataFetcher(mode="TESTNET")` | `DataFetcher(mode="LIVE")` |
| **Execution Adapter** | `TestnetExecutionAdapter` | `LiveExecutionAdapter` |
| **Fallback on Missing Key**| Sandbox testnet | **FAIL CLOSED** (`PermissionError: LIVE_CREDENTIALS_MISSING`) |
| **Silent Paper Fallback** | Prohibited | **STRICTLY PROHIBITED** |

---

## 2. Invariants Enforced

1. **Explicit Production Credentials**:
   `BINANCE_LIVE_API_KEY` and `BINANCE_LIVE_SECRET_KEY` are isolated in `src/config.py` and `.env`. If either is unset when `execution_mode=LIVE`, the system fails closed immediately with `PermissionError`.
2. **Hard Live Lock Protection**:
   `LIVE_TRADING_ENABLED=True`, `LIVE_TRADING_ARMED=True`, and `global_trading_authorization_service.is_live_trading_locked() == False` are all strictly validated prior to dispatch.
3. **No Simulated or Testnet Order IDs in Production**:
   `LiveExecutionAdapter` asserts that returned order IDs are official Binance production order IDs and explicitly rejects any `PAPER_ORD_*` or `TEST_*` IDs.
4. **Authoritative Broker Fill Settlement**:
   Ledger positions are only instantiated after Binance confirms filled quantities (`status: closed` or `filled > 0`). If Binance rejects or cancels an order, no position is created in the ledger.
5. **Bidirectional Production Exit Execution**:
   `OrderExecutionService.execute_exit()` dispatches reverse market orders to `https://api.binance.com`, queries actual broker fills and fees, closes the ledger position, and computes realized P&L from actual fills.
6. **Order Reconciliation Engine**:
   `OrderExecutionService.reconcile_order_with_broker()` enables post-submission and restart order status queries directly from `api.binance.com`.

---

## 3. Automated Test Suite Results

- `tests/test_real_execution_chain.py`: **8/8 Passed**
  - `test_full_trade_lifecycle_entry_to_exit_pnl`: PASSED
  - `test_api_broker_order_routes_through_execution_service`: PASSED
  - `test_api_broker_order_fails_closed_on_unauthorized_live`: PASSED
  - `test_position_quantity_matches_actual_fill_quantity`: PASSED
  - `test_reduce_position_routes_through_execute_exit`: PASSED
  - `test_binance_testnet_real_broker_execution`: PASSED
  - `test_binance_production_live_fails_closed_when_credentials_missing`: PASSED
  - `test_binance_production_live_fails_closed_when_live_disabled`: PASSED
- `tests/test_phase1_config_and_live_lock.py`: **16/16 Passed**
- **Total Suite Passing**: **24/24 (100%)**
