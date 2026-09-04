"""
Upstox Broker Adapter & Multi-Mode Execution Engine
===================================================
Concrete broker adapter providing paper and live order execution for:
- Indian Equities (NSE Cash / Intraday)
- Indian Indices (NIFTY / BANKNIFTY)
- Indian Derivatives (NSE Futures & Options)

Safety Invariants:
1. Enforces TRADING_MODE=PAPER by default.
2. In PAPER mode, executes high-fidelity simulated fills with realistic slippage,
   NSE transaction charges (STT, GST, SEBI fee, Stamp duty), and trade ledger tracking.
3. In LIVE mode, routes to official Upstox API V2 order endpoints with strict pre-trade validation.
"""

from __future__ import annotations

import os
import time
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from src import config, db
from src.market_data.interfaces import (
    BrokerAdapter,
    BrokerCapability,
    ProviderStatus,
    AssetClass,
)
from src.upstox_service import global_upstox_service, OFFICIAL_UPSTOX_KEYS
from src.audit import log_bot_event

logger = logging.getLogger("UpstoxBrokerAdapter")


class UpstoxBrokerAdapter(BrokerAdapter):
    """
    Production-grade Upstox Broker Adapter supporting dual-mode (PAPER / LIVE)
    order routing, positions querying, funds inspection, and risk enforcement.
    """

    def __init__(self, initial_capital: float = 1000000.0, base_currency: str = "INR"):
        self.broker_id = "upstox"
        self.broker_name = "Upstox V3 Indian Broker"
        self.base_currency = base_currency
        self.balance = float(initial_capital)
        self.available_margin = float(initial_capital)
        self.used_margin = 0.0
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.orders: Dict[str, Dict[str, Any]] = {}

        self._capability = BrokerCapability(
            broker_id=self.broker_id,
            broker_name=self.broker_name,
            supported_countries=["India"],
            supported_exchanges=["NSE", "BSE", "NFO"],
            supported_asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "OPTIONS", "FUTURES"],
            market_data_availability="LIVE",
            historical_data_availability="LIVE",
            option_chain_availability="LIVE",
            greeks_availability="ANALYTICAL_BS",
            paper_trading_availability=True,
            live_trading_availability=True,
            multileg_order_support=True,
            basket_order_support=True,
            supported_order_types=["MARKET", "LIMIT", "SL", "SL-M"],
            supported_time_in_force=["DAY", "IOC"],
            margin_api_availability=True,
            position_api_availability=True,
            exercise_assignment_support=True,
            required_subscriptions=[],
            last_heartbeat_utc=datetime.now(timezone.utc).isoformat(),
            last_quote_utc=datetime.now(timezone.utc).isoformat(),
            status=ProviderStatus.LIVE if global_upstox_service.is_authenticated else ProviderStatus.PAPER_ONLY,
        )

    def get_capability(self) -> BrokerCapability:
        self._capability.last_heartbeat_utc = datetime.now(timezone.utc).isoformat()
        self._capability.status = ProviderStatus.LIVE if global_upstox_service.is_authenticated else ProviderStatus.PAPER_ONLY
        return self._capability

    def get_account_summary(self) -> Dict[str, Any]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and global_upstox_service.is_authenticated:
            funds = global_upstox_service.get_funds_and_margin()
            return {
                "broker_id": self.broker_id,
                "broker_name": self.broker_name,
                "currency": self.base_currency,
                "cash_balance": round(funds.get("available_margin", 0.0), 2),
                "available_margin": round(funds.get("available_margin", 0.0), 2),
                "used_margin": round(funds.get("used_margin", 0.0), 2),
                "total_equity": round(funds.get("available_margin", 0.0) + funds.get("used_margin", 0.0), 2),
                "open_positions_count": len(self.positions),
                "mode": "LIVE",
                "status": "HEALTHY",
            }

        return {
            "broker_id": self.broker_id,
            "broker_name": self.broker_name,
            "currency": self.base_currency,
            "cash_balance": round(self.balance, 2),
            "available_margin": round(self.available_margin, 2),
            "used_margin": round(self.used_margin, 2),
            "total_equity": round(self.balance, 2),
            "open_positions_count": len(self.positions),
            "mode": "PAPER",
            "status": "HEALTHY",
        }

    def get_positions(self) -> List[Dict[str, Any]]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and global_upstox_service.is_authenticated:
            try:
                res = global_upstox_service._make_request("portfolio/short-term-positions")
                if res.get("status") == "success" and "data" in res:
                    live_pos = []
                    for p in res["data"]:
                        qty = float(p.get("quantity", 0))
                        if qty != 0:
                            live_pos.append({
                                "symbol": p.get("trading_symbol", ""),
                                "instrument_key": p.get("instrument_token", ""),
                                "quantity": qty,
                                "side": "BUY" if qty > 0 else "SELL",
                                "average_price": float(p.get("average_price", 0.0)),
                                "last_price": float(p.get("last_price", 0.0)),
                                "unrealized_pnl": float(p.get("pnl", 0.0)),
                                "realized_pnl": float(p.get("realised", 0.0)),
                                "execution_mode": "LIVE",
                            })
                    return live_pos
            except Exception as e:
                logger.warning("Failed to fetch Upstox live positions: %s", e)

        return list(self.positions.values())

    def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price: float = 0.0,
        order_type: str = "MARKET",
        product: str = "I",  # I = Intraday, D = Delivery
        tag: str = "QUANTOS_BOT",
    ) -> Dict[str, Any]:
        """
        Executes or simulates order for an Indian instrument.
        Guarantees paper simulation by default.
        """
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        clean_sym = symbol.strip().upper()
        order_side = side.strip().upper()
        if order_side in ["LONG"]:
            order_side = "BUY"
        elif order_side in ["SHORT"]:
            order_side = "SELL"

        ik = global_upstox_service.resolve_instrument_key(clean_sym) or f"NSE_EQ|{clean_sym}"
        order_id = f"UPSTOX_ORD_{uuid.uuid4().hex[:10]}"

        # --- AUTHORITATIVE LIVE LOCK & PAPER GATE ---
        from src.trading_authorization_service import global_trading_authorization_service
        is_locked = global_trading_authorization_service.is_live_trading_locked()

        if is_locked and trading_mode == "LIVE":
            raise PermissionError("LIVE Indian trading is strictly BLOCKED by authoritative Global Live Trading Lock.")

        # --- LIVE ORDER ROUTING ---
        if trading_mode == "LIVE" and not is_locked:
            if not getattr(config, "ENABLE_INDIA_MARKET", True):
                raise PermissionError("LIVE Indian trading is disabled in configuration (ENABLE_INDIA_MARKET=false).")

            if not global_upstox_service.is_authenticated:
                raise ValueError("Upstox live order execution failed: UPSTOX_ACCESS_TOKEN is missing or expired.")

            logger.info("[LIVE_ORDER] Routing order to Upstox API V2: %s %s Qty: %s @ %s", order_side, ik, quantity, price)
            try:
                payload = {
                    "quantity": int(quantity),
                    "product": product,
                    "validity": "DAY",
                    "price": float(price) if order_type == "LIMIT" else 0.0,
                    "tag": tag,
                    "instrument_token": ik,
                    "order_type": order_type,
                    "transaction_type": order_side,
                    "disclosed_quantity": 0,
                    "trigger_price": 0.0,
                    "is_amo": False,
                }
                res = global_upstox_service._make_request("order/place", method="POST", data=payload)
                if res.get("status") == "success" and "data" in res:
                    broker_ord_id = res["data"].get("order_id", order_id)
                    order_result = {
                        "success": True,
                        "order_id": order_id,
                        "broker_order_id": broker_ord_id,
                        "client_order_id": order_id,
                        "symbol": clean_sym,
                        "instrument_key": ik,
                        "side": order_side,
                        "requested_quantity": quantity,
                        "filled_quantity": quantity,
                        "remaining_quantity": 0.0,
                        "average_price": price,
                        "fees": round(quantity * price * 0.0015, 2),
                        "status": "SUBMITTED",
                        "execution_mode": "LIVE",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    self.orders[order_id] = order_result
                    log_bot_event(
                        event_type="LIVE_ORDER_PLACED",
                        message=f"Placed LIVE Upstox order #{broker_ord_id}: {order_side} {quantity} {clean_sym} @ {price}",
                        severity="INFO",
                        symbol=clean_sym,
                    )
                    return order_result
                else:
                    err_msg = res.get("errors", [{}])[0].get("message", "Unknown Upstox order error")
                    raise RuntimeError(f"Upstox live order rejected: {err_msg}")
            except Exception as e:
                logger.error("Live order execution error on Upstox: %s", e)
                raise e

        # --- HIGH-FIDELITY PAPER SIMULATION ---
        quotes = global_upstox_service.fetch_market_quotes([clean_sym])
        quote = quotes.get(clean_sym, {})
        market_price = float(quote.get("last_price") or price or 0.0)
        if market_price <= 0:
            raise ValueError(f"Cannot execute paper order for {clean_sym}: Real market price is unavailable from provider. Provide an explicit price or set UPSTOX_ACCESS_TOKEN.")

        # Realistic Indian market slippage (0.05% for equities, 0.1% for F&O)
        slippage_pct = 0.0005 if "NSE_EQ" in ik else 0.0010
        if order_side == "BUY":
            fill_price = round(market_price * (1.0 + slippage_pct), 2)
        else:
            fill_price = round(market_price * (1.0 - slippage_pct), 2)

        # Indian transaction costs: STT (0.1% on delivery / 0.025% intraday), Exchange turnover (0.00345%), GST (18%), Stamp duty (0.015%)
        gross_value = quantity * fill_price
        est_fees = round(gross_value * 0.0012, 2)  # ~0.12% total transaction charges

        paper_order = {
            "success": True,
            "order_id": order_id,
            "broker_order_id": f"SIM_{order_id}",
            "client_order_id": order_id,
            "symbol": clean_sym,
            "instrument_key": ik,
            "side": order_side,
            "requested_quantity": quantity,
            "filled_quantity": quantity,
            "remaining_quantity": 0.0,
            "average_price": fill_price,
            "requested_price": market_price,
            "slippage": round(abs(fill_price - market_price) * quantity, 2),
            "fees": est_fees,
            "status": "FILLED",
            "execution_mode": "PAPER",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Update simulated position ledger
        pos = self.positions.get(clean_sym)
        if not pos:
            if order_side == "BUY":
                self.positions[clean_sym] = {
                    "symbol": clean_sym,
                    "instrument_key": ik,
                    "quantity": quantity,
                    "side": "BUY",
                    "average_price": fill_price,
                    "last_price": fill_price,
                    "unrealized_pnl": 0.0,
                    "realized_pnl": 0.0,
                    "execution_mode": "PAPER",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            else:
                self.positions[clean_sym] = {
                    "symbol": clean_sym,
                    "instrument_key": ik,
                    "quantity": -quantity,
                    "side": "SELL",
                    "average_price": fill_price,
                    "last_price": fill_price,
                    "unrealized_pnl": 0.0,
                    "realized_pnl": 0.0,
                    "execution_mode": "PAPER",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
        else:
            old_qty = pos["quantity"]
            if (old_qty > 0 and order_side == "BUY") or (old_qty < 0 and order_side == "SELL"):
                # Adding to position
                new_qty = old_qty + (quantity if order_side == "BUY" else -quantity)
                total_cost = (abs(old_qty) * pos["average_price"]) + (quantity * fill_price)
                pos["average_price"] = round(total_cost / abs(new_qty), 2)
                pos["quantity"] = new_qty
            else:
                # Closing or flipping position
                closed_qty = min(abs(old_qty), quantity)
                pnl = (fill_price - pos["average_price"]) * closed_qty if old_qty > 0 else (pos["average_price"] - fill_price) * closed_qty
                pos["realized_pnl"] += round(pnl - est_fees, 2)
                new_qty = old_qty + (quantity if order_side == "BUY" else -quantity)
                pos["quantity"] = new_qty
                if new_qty == 0:
                    del self.positions[clean_sym]

        self.orders[order_id] = paper_order
        log_bot_event(
            event_type="PAPER_ORDER_FILLED",
            message=f"[PAPER_ORDER] Filled {order_side} {quantity} {clean_sym} @ ₹{fill_price:.2f} (Fees: ₹{est_fees:.2f})",
            severity="INFO",
            symbol=clean_sym,
        )
        return paper_order

    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and global_upstox_service.is_authenticated:
            try:
                res = global_upstox_service._make_request(f"order/cancel?order_id={order_id}", method="DELETE")
                return {"success": res.get("status") == "success", "order_id": order_id}
            except Exception as e:
                logger.error("Failed cancelling Upstox live order: %s", e)
                return {"success": False, "error": str(e), "order_id": order_id}

        if order_id in self.orders:
            self.orders[order_id]["status"] = "CANCELLED"
            return {"success": True, "order_id": order_id, "status": "CANCELLED"}
        return {"success": False, "error": "Order not found", "order_id": order_id}

    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and global_upstox_service.is_authenticated:
            try:
                res = global_upstox_service._make_request(f"order/history?order_id={order_id}")
                if res.get("status") == "success" and "data" in res:
                    return {"success": True, "order_id": order_id, "data": res["data"]}
            except Exception as e:
                logger.error("Failed fetching Upstox order status: %s", e)

    def place_multileg_order(self, order_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Executes or simulates multi-leg options / futures spread orders."""
        legs = order_payload.get("legs", [])
        placed_legs = []
        for leg in legs:
            sym = leg.get("symbol", "")
            side = leg.get("side", "BUY")
            qty = float(leg.get("quantity", 1))
            px = float(leg.get("price", 0.0))
            leg_res = self.place_order(symbol=sym, side=side, quantity=qty, price=px, tag="MULTILEG")
            placed_legs.append(leg_res)

        return {
            "order_id": f"UPSTOX_MULTI_{uuid.uuid4().hex[:8]}",
            "status": "FILLED",
            "exchange": "NSE",
            "legs_count": len(legs),
            "legs": placed_legs,
            "placed_at": datetime.now(timezone.utc).isoformat(),
        }

    def square_off_position(self, position_id: str) -> Dict[str, Any]:
        """Closes open position for symbol or position ID."""
        clean_sym = position_id.strip().upper()
        if clean_sym in self.positions:
            pos = self.positions[clean_sym]
            qty = abs(pos["quantity"])
            side = "SELL" if pos["quantity"] > 0 else "BUY"
            close_ord = self.place_order(symbol=clean_sym, side=side, quantity=qty, tag="SQUARE_OFF")
            return {"status": "SQUARED_OFF", "position_id": position_id, "order": close_ord}

        return {"status": "NOT_FOUND", "position_id": position_id}


# Global Singleton Instance
global_upstox_broker_adapter = UpstoxBrokerAdapter()
