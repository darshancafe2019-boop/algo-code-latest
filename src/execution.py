"""Low-level broker execution adapter.

This module is intentionally narrower than the order execution service.  It may
submit an order to an exchange only after the process is explicitly configured
and armed for LIVE execution.  PAPER and TEST orders must use their simulated
adapters so a broker SDK can never be reached accidentally.
"""

import logging
import math
from typing import Any, Dict

logger = logging.getLogger("ExecutionEngine")


class ExecutionEngine:
    """Strictly gated wrapper around a CCXT exchange instance."""

    def __init__(self, exchange: Any):
        self.exchange = exchange

        # Loading markets can make a network request.  Do not contact a broker
        # while the application is in its normal paper-first configuration.
        if self._live_execution_is_configured():
            try:
                self.exchange.load_markets()
            except Exception as exc:
                logger.warning("ExecutionEngine: failed to load markets: %s", exc)
        else:
            logger.info("ExecutionEngine initialized without broker I/O; live execution is not armed.")

    @staticmethod
    def _live_execution_is_configured() -> bool:
        try:
            from src import config

            return (
                str(getattr(config, "TRADING_MODE", "PAPER")).upper() == "LIVE"
                and bool(getattr(config, "LIVE_TRADING_ENABLED", False))
                and bool(getattr(config, "LIVE_TRADING_ARMED", False))
                and bool(getattr(config, "MASTER_LIVE_TRADING", False))
                and not bool(getattr(config, "PAPER_TRADING", True))
            )
        except Exception:
            # Configuration errors must never open a broker path.
            return False

    def _assert_live_execution_allowed(self) -> None:
        from src import config
        from src.trading_authorization_service import global_trading_authorization_service

        mode = str(getattr(config, "TRADING_MODE", "PAPER")).upper()
        if mode != "LIVE":
            raise PermissionError(
                f"Direct exchange execution blocked while TRADING_MODE={mode}; "
                "route PAPER orders through OrderExecutionService."
            )
        if not bool(getattr(config, "LIVE_TRADING_ENABLED", False)):
            raise PermissionError("Direct exchange execution blocked: LIVE_TRADING_ENABLED is false.")
        if not bool(getattr(config, "LIVE_TRADING_ARMED", False)):
            raise PermissionError("Direct exchange execution blocked: live trading is not armed.")
        if not bool(getattr(config, "MASTER_LIVE_TRADING", False)):
            raise PermissionError("Direct exchange execution blocked: MASTER_LIVE_TRADING is false.")
        if bool(getattr(config, "PAPER_TRADING", True)):
            raise PermissionError("Direct exchange execution blocked while PAPER_TRADING is enabled.")
        if config.KILL_SWITCH_FILE.exists() or bool(getattr(config, "GLOBAL_KILL_SWITCH", False)):
            raise PermissionError("Direct exchange execution blocked: global kill switch is active.")
        if global_trading_authorization_service.is_live_trading_locked():
            raise PermissionError("Direct exchange execution blocked by the authoritative live-trading lock.")

    def _check_minimums(self, symbol: str, amount: float, ref_price: float) -> None:
        if not math.isfinite(amount) or amount <= 0:
            raise ValueError(f"Amount must be a positive finite number for {symbol}")
        if not math.isfinite(ref_price) or ref_price <= 0:
            raise ValueError(f"Reference price must be a positive finite number for {symbol}")

        market = self.exchange.market(symbol)
        if not market:
            raise ValueError(f"Market metadata unavailable for {symbol}")

        limits = market.get("limits", {}) or {}
        amount_limit = limits.get("amount", {}) or {}
        min_amount = amount_limit.get("min")
        if min_amount is not None and amount < float(min_amount):
            raise ValueError(f"Amount {amount} below market minimum amount {min_amount} for {symbol}")

        cost_limit = limits.get("cost", {}) or {}
        min_cost = cost_limit.get("min")
        if min_cost is not None:
            cost = amount * ref_price
            if cost < float(min_cost):
                raise ValueError(f"Order cost {cost} below market minimum cost {min_cost} for {symbol}")

    def _prepare_amount(self, symbol: str, amount: float) -> float:
        try:
            prepared = float(self.exchange.amount_to_precision(symbol, amount))
        except (AttributeError, TypeError, ValueError):
            logger.debug("Exchange precision unavailable for %s; using bounded fallback.", symbol)
            prepared = round(amount, 8)

        if not math.isfinite(prepared) or prepared <= 0:
            raise ValueError(f"Exchange returned invalid order quantity {prepared} for {symbol}")
        return prepared

    def _submit_market_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        ref_price: float,
    ) -> Dict[str, Any]:
        self._assert_live_execution_allowed()

        raw_amount = float(amount)
        if not math.isfinite(raw_amount) or raw_amount <= 0:
            raise ValueError(f"Amount must be a positive finite number for {symbol}")

        prepared_amount = self._prepare_amount(symbol, raw_amount)
        self._check_minimums(symbol, prepared_amount, float(ref_price))

        order = self.exchange.create_order(symbol, "market", side, prepared_amount)
        if not isinstance(order, dict):
            raise ValueError("Exchange returned an invalid order response.")

        filled = order.get("filled")
        average = order.get("average")
        filled_amount = prepared_amount if filled is None else float(filled)
        average_price = float(ref_price) if average is None else float(average)

        if not math.isfinite(filled_amount) or filled_amount < 0:
            raise ValueError("Exchange returned an invalid filled quantity.")
        if not math.isfinite(average_price) or average_price <= 0:
            raise ValueError("Exchange returned an invalid average price.")

        return {
            "order_id": order.get("id"),
            "filled_amount": filled_amount,
            "average_price": average_price,
            "raw": order,
        }

    def market_buy(self, symbol: str, amount: float, ref_price: float) -> Dict[str, Any]:
        return self._submit_market_order(symbol, "buy", amount, ref_price)

    def market_sell(self, symbol: str, amount: float, ref_price: float) -> Dict[str, Any]:
        return self._submit_market_order(symbol, "sell", amount, ref_price)
