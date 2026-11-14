# BTC Options Intelligence Scanner

## Scope
Read-only Delta Exchange India BTC options scanner. Scans every active/future expiry returned by the existing DeltaOptionsService and evaluates bullish and bearish candidates independently. The scanner never places orders.

## API
- `GET /api/btc-options-intelligence/health`: Delta REST/WebSocket subsystem health and safety state.
- `GET /api/btc-options-intelligence/scan`: all-expiry scan, multi-timeframe candles, BTCUSD futures ticker, per-direction scores, top-volume contracts, evidence and missing-data list.
- Optional query: `paper_capital=<positive number>` to calculate the 0.5% paper risk budget. No position quantity is produced without a valid option premium, stop distance and contract multiplier.

## Scoring
Weights are fixed: price structure 20, options activity 20, OI change 20, futures 15, IV/Greeks 10, liquidity/volume 15. Missing inputs contribute zero and are listed. Scores are not probabilities. A directional setup is blocked unless price structure, aggressor-side options flow, comparable OI change and futures confirmation are all present and the score reaches 65.

## Data limitations
- A current option-chain volume/OI snapshot is not equivalent to aggressor-side call/put flow.
- Current OI alone cannot produce OI change; comparable prior snapshots or exchange-provided COI are required.
- Funding rate alone is not directional confirmation.
- This initial endpoint surfaces these gaps rather than inferring missing values.
- Trade prints need buyer/seller aggressor classification before they can be used as taker flow. Do not infer aggressor side from maker role without checking the exchange's field semantics.

## Safety
The endpoint is read-only. It forces `mode=PAPER` and `live_execution_enabled=false`; no broker order methods are imported or called. Keep project-wide `TRADING_MODE=PAPER` and `LIVE_TRADING_ENABLED=false`.
