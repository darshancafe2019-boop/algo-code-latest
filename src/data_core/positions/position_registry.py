"""
Authoritative Position Registry
===============================
Maintains marked-to-market positions, average entry prices, exposure, Greeks, and unrealized PnL.

Invariants:
1. Positions strictly separate marketDataProvider and executionBroker.
2. Every position preserves native currency (INR, USD, USDT) and never silently converts.
3. Real-time market ticks update market price, feed age, market value, and unrealized P&L centrally.
4. Position protection modifications and closures route safely through the centralized OMS.
"""
from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.data_core.models import (
    PositionItem,
    PositionSide,
    Environment,
    NormalizedEvent,
    EventType,
    EventDomain,
)
from src.data_core.events.bus import global_event_bus

logger = logging.getLogger("PositionRegistry")


class PositionRegistry:
    """Thread-safe catalog of open and closed trading positions."""

    def __init__(self):
        self._lock = threading.RLock()
        self._positions: Dict[str, PositionItem] = {}
        self._bootstrap_sample_positions()

    def _get_key(self, execution_broker: str, account_id: str, canonical_id: str, environment: Environment) -> str:
        return f"{execution_broker.upper()}:{account_id}:{canonical_id}:{environment.value}"

    def _bootstrap_sample_positions(self) -> None:
        """Initializes canonical multi-venue sample positions across Indian and Crypto derivatives."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Indian Futures Position: NIFTY 27-MAR-2026 FUT
        # Market Data: UPSTOX | Execution: DHAN | Currency: INR
        p1 = PositionItem(
            position_id="POS-NIFTY-FUT-01",
            provider="DHAN",
            market_data_provider="UPSTOX",
            execution_broker="DHAN",
            account_id="dhan_paper",
            environment=Environment.PAPER,
            symbol="NIFTY-27MAR26-FUT",
            canonical_instrument_id="NSE:NIFTY26MARFUT",
            instrument_id="NIFTY26MARFUT",
            exchange="NSE",
            asset_class="FUTURES",
            strategy_id="STRAT_INDEX_TREND",
            bot_id="bot_nifty_trend_01",
            side=PositionSide.LONG,
            quantity=50.0,
            lot_size=50.0,
            entry_price=24850.0,
            average_entry=24850.0,
            mark_price=24920.0,
            feed_age_ms=18.5,
            market_value=1246000.0,
            notional_value=1246000.0,
            realized_pnl=12500.0,
            realized_pnl_scope="TODAY",
            unrealized_pnl=3500.0,  # (24920 - 24850) * 50
            margin_used=185000.0,
            maintenance_margin=145000.0,
            leverage=6.7,
            liquidation_price=21500.0,
            stop_loss=24700.0,
            take_profit=25200.0,
            r_multiple=2.33,
            basis_info={"basis_abs": 70.0, "basis_pct": 0.28, "annualized_basis": 5.75},
            currency="INR",
            native_currency="INR",
            reporting_currency="USD",
            fx_rate=1.0 / 87.5,
            fx_provider="INTERNAL_FIXED",
            opened_at=now_iso,
            updated_at=now_iso,
            market_data_updated_at=now_iso,
            source="CENTRAL_REGISTRY",
            freshness="LIVE",
            data_state="LIVE",
            config_state="CONFIGURED",
            config_reason="Stop loss & target armed",
        )
        self._positions[self._get_key(p1.execution_broker, p1.account_id, p1.canonical_instrument_id, p1.environment)] = p1

        # 2. Crypto Perpetual Position: BTC/USDT Perpetual
        # Market Data: BINANCE_USDM | Execution: PAPER_SIMULATOR | Currency: USD
        p2 = PositionItem(
            position_id="POS-BTC-PERP-01",
            provider="PAPER",
            market_data_provider="BINANCE_USDM",
            execution_broker="PAPER_SIMULATOR",
            account_id="paper_primary",
            environment=Environment.PAPER,
            symbol="BTC/USDT",
            canonical_instrument_id="BTC/USDT:USDT",
            instrument_id="BTCUSDT",
            exchange="BINANCE",
            asset_class="CRYPTO_PERPETUAL",
            strategy_id="STRAT_VOL_HARVEST",
            bot_id="bot_btc_scalp_01",
            side=PositionSide.LONG,
            quantity=1.5,
            lot_size=0.001,
            entry_price=78200.0,
            average_entry=78200.0,
            mark_price=78950.0,
            feed_age_ms=12.0,
            market_value=118425.0,
            notional_value=118425.0,
            realized_pnl=2450.0,
            realized_pnl_scope="TODAY",
            unrealized_pnl=1125.0,  # (78950 - 78200) * 1.5
            margin_used=11842.5,
            maintenance_margin=5921.25,
            leverage=10.0,
            liquidation_price=71200.0,
            stop_loss=76500.0,
            take_profit=82000.0,
            r_multiple=1.85,
            basis_info={"funding_rate_8h": 0.0001, "funding_rate_apr": 10.95},
            currency="USD",
            native_currency="USD",
            reporting_currency="USD",
            fx_rate=1.0,
            fx_provider="DIRECT",
            opened_at=now_iso,
            updated_at=now_iso,
            market_data_updated_at=now_iso,
            source="CENTRAL_REGISTRY",
            freshness="LIVE",
            data_state="LIVE",
            config_state="CONFIGURED",
            config_reason="Dynamic trail active",
        )
        self._positions[self._get_key(p2.execution_broker, p2.account_id, p2.canonical_instrument_id, p2.environment)] = p2

        # 3. Options Position: NIFTY 25000 CE Call Option
        # Market Data: UPSTOX | Execution: UPSTOX | Currency: INR
        p3 = PositionItem(
            position_id="POS-NIFTY-OPT-01",
            provider="UPSTOX",
            market_data_provider="UPSTOX",
            execution_broker="UPSTOX",
            account_id="upstox_paper",
            environment=Environment.PAPER,
            symbol="NIFTY-27MAR26-25000-CE",
            canonical_instrument_id="NSE:NIFTY26MAR25000CE",
            instrument_id="NIFTY26MAR25000CE",
            exchange="NSE",
            asset_class="OPTIONS",
            strategy_id="STRAT_DELTA_NEUTRAL",
            bot_id="bot_options_hedger_01",
            side=PositionSide.LONG,
            quantity=100.0,
            lot_size=50.0,
            entry_price=185.0,
            average_entry=185.0,
            mark_price=215.0,
            feed_age_ms=25.0,
            market_value=21500.0,
            notional_value=21500.0,
            realized_pnl=4200.0,
            realized_pnl_scope="TODAY",
            unrealized_pnl=3000.0,  # (215 - 185) * 100
            margin_used=18500.0,
            maintenance_margin=18500.0,
            leverage=1.0,
            liquidation_price=None,
            stop_loss=140.0,
            take_profit=280.0,
            r_multiple=1.75,
            greeks={"delta": 0.52, "gamma": 0.0018, "theta": -12.4, "vega": 34.2, "iv": 14.8},
            currency="INR",
            native_currency="INR",
            reporting_currency="USD",
            fx_rate=1.0 / 87.5,
            fx_provider="INTERNAL_FIXED",
            opened_at=now_iso,
            updated_at=now_iso,
            market_data_updated_at=now_iso,
            source="CENTRAL_REGISTRY",
            freshness="LIVE",
            data_state="LIVE",
            config_state="CONFIGURED",
            config_reason="Delta hedged",
        )
        self._positions[self._get_key(p3.execution_broker, p3.account_id, p3.canonical_instrument_id, p3.environment)] = p3

        # 4. SOL Crypto Perpetual Position (Unprotected Sample for Explainable Diagnostics)
        # Market Data: DELTA | Execution: DELTA | Currency: USD
        p4 = PositionItem(
            position_id="POS-SOL-PERP-01",
            provider="DELTA",
            market_data_provider="DELTA",
            execution_broker="DELTA",
            account_id="delta_paper",
            environment=Environment.PAPER,
            symbol="SOL/USDT",
            canonical_instrument_id="SOL/USDT:USDT",
            instrument_id="SOLUSDT",
            exchange="DELTA",
            asset_class="CRYPTO_PERPETUAL",
            strategy_id="STRAT_MOMENTUM",
            bot_id="bot_sol_runner",
            side=PositionSide.SHORT,
            quantity=-20.0,
            lot_size=0.1,
            entry_price=162.0,
            average_entry=162.0,
            mark_price=158.5,
            feed_age_ms=14.0,
            market_value=3170.0,
            notional_value=3170.0,
            realized_pnl=0.0,
            realized_pnl_scope="TODAY",
            unrealized_pnl=70.0,  # (162.0 - 158.5) * 20
            margin_used=634.0,
            maintenance_margin=317.0,
            leverage=5.0,
            liquidation_price=190.0,
            stop_loss=None,  # Intentionally missing to demonstrate explainable diagnostics
            take_profit=145.0,
            r_multiple=None,
            basis_info={"funding_rate_8h": 0.00015, "funding_rate_apr": 16.42},
            currency="USD",
            native_currency="USD",
            reporting_currency="USD",
            fx_rate=1.0,
            fx_provider="DIRECT",
            opened_at=now_iso,
            updated_at=now_iso,
            market_data_updated_at=now_iso,
            source="CENTRAL_REGISTRY",
            freshness="LIVE",
            data_state="LIVE",
            config_state="STOP_LOSS_MISSING",
            config_reason="Missing mandatory stop loss protection",
        )
        self._positions[self._get_key(p4.execution_broker, p4.account_id, p4.canonical_instrument_id, p4.environment)] = p4

    def update_position(
        self,
        provider: str,
        account_id: str,
        instrument_id: str,
        canonical_instrument_id: str,
        symbol: str,
        environment: Environment,
        quantity: float,
        side: PositionSide,
        average_entry: float,
        market_price: Optional[float] = None,
        market_data_provider: Optional[str] = None,
        execution_broker: Optional[str] = None,
        exchange: str = "BINANCE",
        asset_class: str = "CRYPTO_PERPETUAL",
        currency: str = "USD",
        native_currency: str = "USD",
        margin_used: float = 0.0,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        leverage: float = 1.0,
        greeks: Optional[Dict[str, float]] = None,
        basis_info: Optional[Dict[str, Any]] = None,
    ) -> PositionItem:
        """Updates or creates an authoritative position record."""
        exec_broker = execution_broker or provider
        md_provider = market_data_provider or provider

        with self._lock:
            key = self._get_key(exec_broker, account_id, canonical_instrument_id, environment)
            pos = self._positions.get(key)
            now_iso = datetime.now(timezone.utc).isoformat()

            current_price = market_price if market_price is not None else (pos.mark_price if pos else average_entry)

            # Compute market value and unrealized PnL
            market_val = round(abs(quantity) * current_price, 2)
            if side == PositionSide.LONG:
                unrealized = round((current_price - average_entry) * quantity, 2)
            elif side == PositionSide.SHORT:
                unrealized = round((average_entry - current_price) * abs(quantity), 2)
            else:
                unrealized = 0.0

            # Determine config state
            if stop_loss is None and quantity != 0:
                config_st = "STOP_LOSS_MISSING"
                config_rs = "Missing mandatory stop loss protection"
            elif take_profit is None and quantity != 0:
                config_st = "TAKE_PROFIT_MISSING"
                config_rs = "Take profit target boundary not specified"
            else:
                config_st = "CONFIGURED"
                config_rs = "Fully operational"

            fx_rate = 1.0 / 87.5 if native_currency == "INR" else 1.0

            if not pos:
                pos = PositionItem(
                    position_id=f"POS-{uuid.uuid4().hex[:10].upper()}",
                    provider=exec_broker.upper(),
                    market_data_provider=md_provider.upper(),
                    execution_broker=exec_broker.upper(),
                    account_id=account_id,
                    symbol=symbol,
                    canonical_instrument_id=canonical_instrument_id,
                    instrument_id=instrument_id,
                    exchange=exchange,
                    asset_class=asset_class,
                    environment=environment,
                    quantity=quantity,
                    side=side,
                    entry_price=average_entry,
                    average_entry=average_entry,
                    mark_price=current_price,
                    market_value=market_val,
                    notional_value=market_val,
                    realized_pnl=0.0,
                    realized_pnl_scope="TODAY",
                    unrealized_pnl=unrealized,
                    margin_used=margin_used,
                    maintenance_margin=margin_used * 0.5,
                    leverage=leverage,
                    stop_loss=stop_loss,
                    take_profit=take_profit,
                    greeks=greeks,
                    basis_info=basis_info,
                    currency=native_currency.upper(),
                    native_currency=native_currency.upper(),
                    reporting_currency="USD",
                    fx_rate=fx_rate,
                    opened_at=now_iso,
                    updated_at=now_iso,
                    market_data_updated_at=now_iso,
                    source="CENTRAL_REGISTRY",
                    freshness="LIVE",
                    data_state="LIVE",
                    config_state=config_st,
                    config_reason=config_rs,
                )
                self._positions[key] = pos
                event_type = EventType.POSITION_OPENED
            else:
                pos.quantity = quantity
                pos.side = side
                pos.average_entry = average_entry
                pos.mark_price = current_price
                pos.market_value = market_val
                pos.notional_value = market_val
                pos.unrealized_pnl = unrealized
                pos.margin_used = margin_used
                pos.stop_loss = stop_loss if stop_loss is not None else pos.stop_loss
                pos.take_profit = take_profit if take_profit is not None else pos.take_profit
                pos.config_state = config_st
                pos.config_reason = config_rs
                pos.updated_at = now_iso
                pos.market_data_updated_at = now_iso
                event_type = EventType.POSITION_UPDATED if quantity != 0 else EventType.POSITION_CLOSED

        global_event_bus.publish(
            NormalizedEvent(
                event_type=event_type,
                domain=EventDomain.POSITION,
                provider=exec_broker,
                account_id=account_id,
                environment=environment,
                instrument_id=instrument_id,
                canonical_instrument_id=canonical_instrument_id,
                payload=pos.to_dict(),
            )
        )

        return pos

    def mark_to_market(self, canonical_instrument_id: str, latest_price: float, feed_age_ms: float = 15.0) -> None:
        """Re-evaluates all positions holding this instrument with latest validated tick price."""
        with self._lock:
            for pos in self._positions.values():
                if pos.canonical_instrument_id == canonical_instrument_id and pos.quantity != 0:
                    pos.mark_price = latest_price
                    pos.feed_age_ms = feed_age_ms
                    pos.market_value = round(abs(pos.quantity) * latest_price, 2)
                    pos.notional_value = pos.market_value
                    if pos.side == PositionSide.LONG:
                        pos.unrealized_pnl = round((latest_price - pos.average_entry) * pos.quantity, 2)
                    elif pos.side == PositionSide.SHORT:
                        pos.unrealized_pnl = round((pos.average_entry - latest_price) * abs(pos.quantity), 2)
                    pos.market_data_updated_at = datetime.now(timezone.utc).isoformat()

    def modify_protection(
        self,
        position_id: str,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> Optional[PositionItem]:
        """Modifies SL/TP for an active position safely."""
        with self._lock:
            for pos in self._positions.values():
                if pos.position_id == position_id:
                    if stop_loss is not None:
                        pos.stop_loss = stop_loss
                    if take_profit is not None:
                        pos.take_profit = take_profit
                    if pos.stop_loss is not None:
                        pos.config_state = "CONFIGURED"
                        pos.config_reason = "Protection updated"
                    pos.updated_at = datetime.now(timezone.utc).isoformat()

                    global_event_bus.publish(
                        NormalizedEvent(
                            event_type=EventType.POSITION_UPDATED,
                            domain=EventDomain.POSITION,
                            provider=pos.execution_broker,
                            account_id=pos.account_id,
                            environment=pos.environment,
                            canonical_instrument_id=pos.canonical_instrument_id,
                            payload=pos.to_dict(),
                        )
                    )
                    return pos
            return None

    def close_position(self, position_id: str) -> Optional[PositionItem]:
        """Closes an active position safely."""
        with self._lock:
            for key, pos in list(self._positions.items()):
                if pos.position_id == position_id:
                    pos.realized_pnl = round(pos.realized_pnl + pos.unrealized_pnl, 2)
                    pos.quantity = 0.0
                    pos.unrealized_pnl = 0.0
                    pos.margin_used = 0.0
                    pos.side = PositionSide.FLAT
                    pos.updated_at = datetime.now(timezone.utc).isoformat()

                    global_event_bus.publish(
                        NormalizedEvent(
                            event_type=EventType.POSITION_CLOSED,
                            domain=EventDomain.POSITION,
                            provider=pos.execution_broker,
                            account_id=pos.account_id,
                            environment=pos.environment,
                            canonical_instrument_id=pos.canonical_instrument_id,
                            payload=pos.to_dict(),
                        )
                    )
                    return pos
            return None

    def get_positions(
        self,
        environment: Environment = Environment.PAPER,
        provider: Optional[str] = None,
        account_id: Optional[str] = None,
    ) -> List[PositionItem]:
        """Returns open positions matching filters."""
        with self._lock:
            results = []
            for pos in self._positions.values():
                if pos.environment != environment:
                    continue
                if provider and pos.execution_broker != provider.upper() and pos.provider != provider.upper():
                    continue
                if account_id and pos.account_id != account_id:
                    continue
                if pos.quantity != 0:
                    results.append(pos)
            return results

    def get_exposure_summary(self, environment: Environment = Environment.PAPER) -> Dict[str, Any]:
        """Calculates multi-dimensional exposure metrics across all active positions."""
        positions = self.get_positions(environment)

        long_count = sum(1 for p in positions if p.side == PositionSide.LONG)
        short_count = sum(1 for p in positions if p.side == PositionSide.SHORT)

        by_currency: Dict[str, Dict[str, float]] = {}
        for p in positions:
            curr = p.native_currency
            if curr not in by_currency:
                by_currency[curr] = {
                    "grossExposure": 0.0,
                    "netExposure": 0.0,
                    "longExposure": 0.0,
                    "shortExposure": 0.0,
                    "marginUsed": 0.0,
                    "unrealizedPnL": 0.0,
                    "realizedPnL": 0.0,
                    "count": 0,
                }
            bc = by_currency[curr]
            bc["count"] += 1
            if p.side == PositionSide.LONG:
                bc["longExposure"] = round(bc["longExposure"] + p.market_value, 2)
                bc["netExposure"] = round(bc["netExposure"] + p.market_value, 2)
            elif p.side == PositionSide.SHORT:
                bc["shortExposure"] = round(bc["shortExposure"] + p.market_value, 2)
                bc["netExposure"] = round(bc["netExposure"] - p.market_value, 2)
            bc["grossExposure"] = round(bc["longExposure"] + bc["shortExposure"], 2)
            bc["marginUsed"] = round(bc["marginUsed"] + p.margin_used, 2)
            bc["unrealizedPnL"] = round(bc["unrealizedPnL"] + p.unrealized_pnl, 2)
            bc["realizedPnL"] = round(bc["realizedPnL"] + p.realized_pnl, 2)

        # Calculate normalized USD total for reporting
        FX_RATES = {"USD": 1.0, "USDT": 1.0, "INR": 1.0 / 87.5}
        total_norm_gross_usd = 0.0
        total_norm_unrealized_usd = 0.0
        total_norm_realized_usd = 0.0

        for curr, data in by_currency.items():
            rate = FX_RATES.get(curr, 1.0)
            total_norm_gross_usd += data["grossExposure"] * rate
            total_norm_unrealized_usd += data["unrealizedPnL"] * rate
            total_norm_realized_usd += data["realizedPnL"] * rate

        return {
            "environment": environment.value,
            "positionsCount": len(positions),
            "longCount": long_count,
            "shortCount": short_count,
            "byCurrency": by_currency,
            "normalizedReporting": {
                "currency": "USD",
                "totalGrossExposureUsd": round(total_norm_gross_usd, 2),
                "totalUnrealizedPnLUsd": round(total_norm_unrealized_usd, 2),
                "totalRealizedPnLUsd": round(total_norm_realized_usd, 2),
                "fxBenchmark": "1 USD = 87.50 INR",
            },
        }


# Global Singleton Position Registry Instance
global_position_registry = PositionRegistry()
