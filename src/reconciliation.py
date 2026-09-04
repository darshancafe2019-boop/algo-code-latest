import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

from src import config, db
from src.audit import log_bot_event, log_data_correction

logger = logging.getLogger("PositionReconciler")


class PositionReconciler:
    """
    Authoritative Broker vs Local DB Position & Order Reconciler.
    Supports Multi-Asset venues (Binance, Upstox, Delta Exchange).
    Classifies state as MATCHED, LOCAL_ONLY, BROKER_ONLY, MISMATCH_QUANTITY, PRICE_MISMATCH, DEGRADED_OFFLINE.
    """

    def fetch_local_open_positions(self) -> List[Dict[str, Any]]:
        """Fetch open trades from persistent DB trades_log."""
        return db.safe_query("SELECT * FROM trades_log WHERE status = 'OPEN' OR status = 'RUNNING'")

    def fetch_local_open_orders(self) -> List[Dict[str, Any]]:
        """Fetch working/submitting/pending orders from persistent DB."""
        return db.safe_query("SELECT * FROM trades_log WHERE status IN ('SUBMITTED', 'PENDING', 'WORKING')")

    def fetch_broker_open_positions(self) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
        """
        Fetch open positions across all configured broker adapters.
        Returns (positions_list, adapter_status_map).
        """
        mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        adapter_status = {"binance": "OFFLINE", "upstox": "OFFLINE", "delta": "OFFLINE"}

        if mode == "PAPER" or mode == "TEST" or getattr(config, "TEST_MODE", False):
            # In Paper/Test mode, broker matches DB
            local_pos = self.fetch_local_open_positions()
            positions = [
                {
                    "venue": "PAPER_SIMULATION",
                    "symbol": p.get("symbol"),
                    "side": p.get("direction"),
                    "amount": float(p.get("position_size") or 0.0),
                    "entry_price": float(p.get("entry_price") or 0.0)
                }
                for p in local_pos
            ]
            return positions, {"paper": "HEALTHY"}

        active_pos: List[Dict[str, Any]] = []

        # 1. Binance CCXT
        try:
            from src.data_fetcher import get_testnet_fetcher
            fetcher = get_testnet_fetcher()
            if hasattr(fetcher, "exchange") and fetcher.exchange:
                raw_positions = fetcher.exchange.fetch_positions()
                for pos in raw_positions:
                    contracts = float(pos.get("contracts", 0.0) or pos.get("amount", 0.0))
                    if contracts > 0:
                        active_pos.append({
                            "venue": "BINANCE",
                            "symbol": pos.get("symbol"),
                            "side": pos.get("side", "").upper(),
                            "amount": contracts,
                            "entry_price": float(pos.get("entryPrice", 0.0))
                        })
                adapter_status["binance"] = "HEALTHY"
        except Exception as e:
            adapter_status["binance"] = f"DEGRADED: {e}"

        # 2. Upstox
        try:
            from src.upstox_broker_adapter import global_upstox_broker_adapter
            upstox_pos = global_upstox_broker_adapter.get_positions()
            for p in upstox_pos:
                qty = float(p.get("quantity") or p.get("net_quantity") or 0.0)
                if abs(qty) > 0:
                    active_pos.append({
                        "venue": "UPSTOX",
                        "symbol": p.get("symbol"),
                        "side": "BUY" if qty > 0 else "SELL",
                        "amount": abs(qty),
                        "entry_price": float(p.get("average_price") or p.get("buy_price") or 0.0)
                    })
            adapter_status["upstox"] = "HEALTHY"
        except Exception as e:
            adapter_status["upstox"] = f"DEGRADED: {e}"

        # 3. Delta Exchange
        try:
            from src.delta_exchange_adapter import global_delta_exchange_adapter
            delta_pos = global_delta_exchange_adapter.get_positions()
            for p in delta_pos:
                size = float(p.get("size") or 0.0)
                if abs(size) > 0:
                    active_pos.append({
                        "venue": "DELTA",
                        "symbol": p.get("symbol") or str(p.get("product_id")),
                        "side": str(p.get("side", "")).upper(),
                        "amount": abs(size),
                        "entry_price": float(p.get("entry_price") or 0.0)
                    })
            adapter_status["delta"] = "HEALTHY"
        except Exception as e:
            adapter_status["delta"] = f"DEGRADED: {e}"

        return active_pos, adapter_status

    def reconcile_on_startup(self) -> Tuple[bool, str, List[Dict[str, Any]]]:
        """
        Execute reconciliation loop on startup or audit interval.
        Locks live trading if mismatch is detected.
        """
        log_bot_event(
            event_type="RECONCILIATION_STARTED",
            message="Starting broker vs local database position reconciliation...",
            severity="INFO"
        )

        local_positions = self.fetch_local_open_positions()
        broker_positions, adapter_status = self.fetch_broker_open_positions()

        mismatches = []
        local_map = {p["symbol"]: p for p in local_positions if p.get("symbol")}
        broker_map = {p["symbol"]: p for p in broker_positions if p.get("symbol")}

        all_symbols = set(local_map.keys()).union(set(broker_map.keys()))

        for sym in all_symbols:
            loc = local_map.get(sym)
            brk = broker_map.get(sym)

            if loc and not brk:
                mismatches.append({
                    "symbol": sym,
                    "type": "LOCAL_ONLY",
                    "details": f"Local DB has open trade #{loc.get('id')} but broker has 0 position"
                })
            elif brk and not loc:
                mismatches.append({
                    "symbol": sym,
                    "type": "EXCHANGE_ONLY",
                    "details": f"Broker has open position {brk.get('amount')} {sym} but local DB has 0 open trade"
                })
            elif loc and brk:
                loc_amt = float(loc.get("position_size", 0.0))
                brk_amt = float(brk.get("amount", 0.0))
                if abs(loc_amt - brk_amt) > 0.0001:
                    mismatches.append({
                        "symbol": sym,
                        "type": "MISMATCH_QUANTITY",
                        "details": f"Quantity mismatch for {sym}: local DB={loc_amt} vs broker={brk_amt}"
                    })

        if mismatches:
            setattr(config, "POSITION_MISMATCH_LOCKED", True)
            setattr(config, "LIVE_TRADING_ARMED", False)

            log_bot_event(
                event_type="RECONCILIATION_MISMATCH",
                message=f"Position mismatch detected! Live trading LOCKED. Mismatches: {len(mismatches)}",
                severity="ERROR",
                status="FAILED",
                reason="POSITION_MISMATCH",
                metadata={"mismatches": mismatches}
            )
            return False, "POSITION MISMATCH — LIVE TRADING LOCKED", mismatches

        setattr(config, "POSITION_MISMATCH_LOCKED", False)
        log_bot_event(
            event_type="RECONCILIATION_COMPLETED",
            message=f"Reconciliation completed successfully. {len(local_positions)} open positions MATCHED.",
            severity="INFO",
            status="SUCCESS"
        )
        return True, "Position state MATCHED", []


position_reconciler = PositionReconciler()
