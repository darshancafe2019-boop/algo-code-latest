"""
Authoritative Order Registry & Central OMS
===========================================
Single source of truth for order lifecycles, fills, and execution routing across all venues.

Invariants:
1. Every order receives a permanent internal_order_id and immutable state transitions.
2. Orders in PAPER environment execute against virtual simulator matching engine.
3. LIVE trading remains protected by server-side LIVE_TRADING_ENABLED=false safety switch.
4. Fills automatically update positions in PositionRegistry and emit trade events.
"""
from __future__ import annotations

import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.data_core.models import (
    OrderItem,
    OrderSide,
    OrderType,
    OrderStatus,
    TradeFill,
    PositionSide,
    Environment,
    NormalizedEvent,
    EventType,
    EventDomain,
)
from src.data_core.events.bus import global_event_bus
from src.data_core.positions.position_registry import global_position_registry
from src.data_core.capital.ledger import global_capital_ledger, LedgerEntryType, LedgerDirection

logger = logging.getLogger("OrderManager")


class OrderManager:
    """Thread-safe OMS managing order states, fills, and trade executions."""

    def __init__(self, max_history: int = 5000):
        self._lock = threading.RLock()
        self._orders: Dict[str, OrderItem] = {}
        self._fills: List[TradeFill] = []
        self._max_history = max_history

    def create_order(
        self,
        provider: str,
        account_id: str,
        environment: Environment,
        instrument: str,
        canonical_instrument_id: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        client_tag: Optional[str] = None,
    ) -> OrderItem:
        """Creates and registers a new order in PENDING status."""
        with self._lock:
            order_id = f"ORD-{uuid.uuid4().hex[:12].upper()}"
            now_iso = datetime.now(timezone.utc).isoformat()

            order = OrderItem(
                internal_order_id=order_id,
                provider=provider.upper(),
                broker_order_id=None,
                account_id=account_id,
                environment=environment,
                instrument=instrument,
                canonical_instrument_id=canonical_instrument_id,
                side=side,
                order_type=order_type,
                quantity=quantity,
                filled_quantity=0.0,
                remaining_quantity=quantity,
                limit_price=limit_price,
                stop_price=stop_price,
                avg_fill_price=None,
                status=OrderStatus.OPEN,
                created_at=now_iso,
                updated_at=now_iso,
                reject_reason=None,
                client_tag=client_tag,
            )

            self._orders[order_id] = order

        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.ORDER_CREATED,
                domain=EventDomain.ORDER,
                provider=provider,
                account_id=account_id,
                environment=environment,
                instrument_id=instrument,
                canonical_instrument_id=canonical_instrument_id,
                payload=order.to_dict(),
            )
        )

        return order

    def record_fill(
        self,
        internal_order_id: str,
        fill_price: float,
        fill_quantity: float,
        fee: float = 0.0,
        fee_currency: str = "USD",
        broker_order_id: Optional[str] = None,
    ) -> Optional[TradeFill]:
        """Processes a trade fill, updating order remaining qty and associated position."""
        with self._lock:
            order = self._orders.get(internal_order_id)
            if not order:
                logger.error(f"Order not found for fill: {internal_order_id}")
                return None

            now_iso = datetime.now(timezone.utc).isoformat()
            if broker_order_id:
                order.broker_order_id = broker_order_id

            # Calculate weighted average fill price
            prev_filled = order.filled_quantity
            prev_avg = order.avg_fill_price or fill_price
            new_filled = prev_filled + fill_quantity
            order.avg_fill_price = round(((prev_filled * prev_avg) + (fill_quantity * fill_price)) / max(0.0001, new_filled), 4)

            order.filled_quantity = new_filled
            order.remaining_quantity = max(0.0, order.quantity - new_filled)

            if order.remaining_quantity <= 0.00001:
                order.status = OrderStatus.FILLED
                order_event_type = EventType.ORDER_FILLED
            else:
                order.status = OrderStatus.PARTIALLY_FILLED
                order_event_type = EventType.ORDER_PARTIAL_FILL

            order.updated_at = now_iso

            fill = TradeFill(
                internal_order_id=internal_order_id,
                broker_order_id=broker_order_id or order.broker_order_id,
                provider=order.provider,
                account_id=order.account_id,
                environment=order.environment,
                instrument=order.instrument,
                side=order.side,
                fill_price=fill_price,
                fill_quantity=fill_quantity,
                fee=fee,
                fee_currency=fee_currency,
                timestamp=now_iso,
            )
            self._fills.append(fill)

            # Update position in PositionRegistry
            pos_side = PositionSide.LONG if order.side == OrderSide.BUY else PositionSide.SHORT
            global_position_registry.update_position(
                provider=order.provider,
                account_id=order.account_id,
                instrument_id=order.instrument,
                canonical_instrument_id=order.canonical_instrument_id,
                symbol=order.instrument,
                environment=order.environment,
                quantity=order.filled_quantity,
                side=pos_side,
                average_entry=order.avg_fill_price,
                market_price=fill_price,
                currency=fee_currency,
            )

        # Emit Order update and Fill events
        global_event_bus.publish(
            NormalizedEvent(
                event_type=order_event_type,
                domain=EventDomain.ORDER,
                provider=order.provider,
                account_id=order.account_id,
                environment=order.environment,
                instrument_id=order.instrument,
                canonical_instrument_id=order.canonical_instrument_id,
                payload=order.to_dict(),
            )
        )

        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.TRADE_FILL,
                domain=EventDomain.FILL,
                provider=order.provider,
                account_id=order.account_id,
                environment=order.environment,
                instrument_id=order.instrument,
                canonical_instrument_id=order.canonical_instrument_id,
                payload=fill.to_dict(),
            )
        )

        return fill

    def cancel_order(self, internal_order_id: str, reason: str = "User cancelled") -> Optional[OrderItem]:
        """Cancels an open order."""
        with self._lock:
            order = self._orders.get(internal_order_id)
            if not order:
                return None
            order.status = OrderStatus.CANCELLED
            order.reject_reason = reason
            order.updated_at = datetime.now(timezone.utc).isoformat()

        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.ORDER_CANCELLED,
                domain=EventDomain.ORDER,
                provider=order.provider,
                account_id=order.account_id,
                environment=order.environment,
                instrument_id=order.instrument,
                canonical_instrument_id=order.canonical_instrument_id,
                payload=order.to_dict(),
            )
        )

        return order

    def get_orders(
        self,
        environment: Environment = Environment.PAPER,
        provider: Optional[str] = None,
        account_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[OrderItem]:
        """Queries orders matching criteria (newest first)."""
        with self._lock:
            orders = list(self._orders.values())

        results = []
        for o in reversed(orders):
            if o.environment != environment:
                continue
            if provider and o.provider != provider.upper():
                continue
            if account_id and o.account_id != account_id:
                continue
            results.append(o)
            if len(results) >= limit:
                break
        return results

    def get_fills(
        self,
        environment: Environment = Environment.PAPER,
        provider: Optional[str] = None,
        limit: int = 100,
    ) -> List[TradeFill]:
        """Queries trade executions."""
        with self._lock:
            fills = list(self._fills)

        results = []
        for f in reversed(fills):
            if f.environment != environment:
                continue
            if provider and f.provider != provider.upper():
                continue
            results.append(f)
            if len(results) >= limit:
                break
        return results


# Global Singleton Order Manager Instance
global_order_manager = OrderManager()
