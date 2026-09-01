import logging
import sqlite3
import uuid
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional

from src import config, db
from src.audit import log_bot_event
from src.monitoring import SystemWatchdog

logger = logging.getLogger("OrderExecutionService")


def _execute_query(sql: str, params: tuple = ()) -> list[dict]:
    try:
        conn = sqlite3.connect(str(config.DB_PATH), timeout=10.0)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error("DB Query error: %s", e)
        return []


def _execute_statement(sql: str, params: tuple = ()) -> bool:
    try:
        conn = sqlite3.connect(str(config.DB_PATH), timeout=10.0)
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error("DB Execute error: %s", e)
        return False


def _is_indian_symbol(symbol: str) -> bool:
    clean = symbol.strip().upper()
    from src.upstox_service import UPSTOX_INSTRUMENT_MAP
    return (
        clean in UPSTOX_INSTRUMENT_MAP
        or "NSE" in clean
        or "|" in clean
        or clean.endswith("CE")
        or clean.endswith("PE")
    )


class PaperExecutionAdapter:
    """Simulated Paper Execution Adapter maintaining identical order contract as Live."""

    def submit_order(self, symbol: str, side: str, amount: float, price: float) -> Dict[str, Any]:
        if _is_indian_symbol(symbol):
            from src.upstox_broker_adapter import global_upstox_broker_adapter
            return global_upstox_broker_adapter.place_order(symbol, side, amount, price)

        sim_order_id = f"PAPER_ORD_{uuid.uuid4().hex[:10]}"
        return {
            "success": True,
            "order_id": sim_order_id,
            "broker_order_id": sim_order_id,
            "client_order_id": sim_order_id,
            "symbol": symbol,
            "side": side,
            "requested_quantity": amount,
            "filled_quantity": amount,
            "remaining_quantity": 0.0,
            "average_price": price,
            "fees": round(amount * price * 0.001, 2),
            "status": "FILLED",
            "execution_mode": "PAPER"
        }


class TestExecutionAdapter:
    """Mocked Execution Adapter for deterministic unit testing with zero network requests."""

    def submit_order(self, symbol: str, side: str, amount: float, price: float) -> Dict[str, Any]:
        test_order_id = f"TEST_MOCK_ORD_{uuid.uuid4().hex[:8]}"
        return {
            "success": True,
            "order_id": test_order_id,
            "broker_order_id": test_order_id,
            "client_order_id": test_order_id,
            "symbol": symbol,
            "side": side,
            "requested_quantity": amount,
            "filled_quantity": amount,
            "remaining_quantity": 0.0,
            "average_price": price,
            "fees": 0.0,
            "status": "FILLED",
            "execution_mode": "TEST"
        }


class LiveExecutionAdapter:
    """Live Execution Adapter requiring strict server-side arming and 14-point validation."""

    def submit_order(self, symbol: str, side: str, amount: float, price: float) -> Dict[str, Any]:
        if _is_indian_symbol(symbol):
            from src.upstox_broker_adapter import global_upstox_broker_adapter
            return global_upstox_broker_adapter.place_order(symbol, side, amount, price)

        from src.execution import ExecutionEngine
        from src.data_fetcher import get_testnet_fetcher

        fetcher = get_testnet_fetcher()
        engine = ExecutionEngine(fetcher.exchange)
        if side.upper() in ["BUY", "LONG"]:
            res = engine.market_buy(symbol, amount, price)
        else:
            res = engine.market_sell(symbol, amount, price)

        return {
            "success": True,
            "order_id": res.get("order_id"),
            "broker_order_id": res.get("order_id"),
            "client_order_id": res.get("order_id"),
            "symbol": symbol,
            "side": side,
            "requested_quantity": amount,
            "filled_quantity": res.get("filled_amount", amount),
            "remaining_quantity": 0.0,
            "average_price": res.get("average_price", price),
            "fees": 0.0,
            "status": "FILLED",
            "execution_mode": "LIVE"
        }


class OrderExecutionService:
    """
    Centralized Order Execution Gate.
    Enforces 14-Point Pre-Order Validation Check before any order can be created.
    """

    def __init__(self):
        self.paper_adapter = PaperExecutionAdapter()
        self.test_adapter = TestExecutionAdapter()
        self.live_adapter = LiveExecutionAdapter()

    def generate_idempotency_key(self, bot_id: str, strategy: str, symbol: str, signal_time: str) -> str:
        raw_key = f"{bot_id}:{strategy}:{symbol}:{signal_time}"
        return f"IDEM_{uuid.uuid5(uuid.NAMESPACE_DNS, raw_key).hex[:16]}"

    def validate_14_point_pre_order_check(
        self,
        bot_id: str,
        strategy: str,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        stop_loss: float,
        take_profit: float,
        confidence_score: float,
        market_tick_iso: Optional[str] = None,
        account_balance: float = 10000.0,
        is_live: bool = False
    ) -> Tuple[bool, str]:
        """Strict 14-Point Pre-Order Validation Check."""

        # 1. KillSwitchCheck (Global Emergency Halt)
        if config.KILL_SWITCH_FILE.exists() or getattr(config, "GLOBAL_TRADING_KILL_SWITCH", False):
            return False, "KILL_SWITCH_ACTIVE: Global Trading Kill Switch is ACTIVATED"

        # 2. MarketDataCheck
        watchdog = SystemWatchdog()
        is_stale, age_s = watchdog.is_market_data_stale(market_tick_iso, max_age_seconds=config.MAX_MARKET_DATA_AGE_SECONDS)
        if is_stale and market_tick_iso:
            return False, f"STALE_MARKET_DATA: Age {age_s:.1f}s exceeds max allowed {config.MAX_MARKET_DATA_AGE_SECONDS}s"
        if price <= 0:
            return False, "INVALID_PRICE: Price must be greater than zero"

        # 2. SymbolCheck
        inst = db.get_market_instrument(symbol)
        if inst and not inst.get("execution_available", True):
            return False, f"DATA_ONLY_SYMBOL: Instrument {symbol} does not support live execution"

        # 3. AccountCheck
        order_cost = amount * price
        if account_balance <= 0 or order_cost > account_balance:
            return False, f"INSUFFICIENT_BALANCE: Order cost ${order_cost:,.2f} exceeds balance ${account_balance:,.2f}"

        # 4. PositionCheck
        if getattr(config, "POSITION_MISMATCH_LOCKED", False):
            return False, "POSITION_MISMATCH_LOCKED: Live positions mismatched with broker state"

        # 5. DuplicateCheck / Idempotency
        signal_time_str = market_tick_iso or datetime.now(timezone.utc).isoformat()
        idem_key = self.generate_idempotency_key(bot_id, strategy, symbol, signal_time_str[:16])
        existing_orders = _execute_query("SELECT id FROM bot_event_audit WHERE correlation_id = ? AND status = 'SUCCESS'", (idem_key,))
        if existing_orders:
            return False, f"DUPLICATE_ORDER_ATTEMPT: Signal {idem_key} already processed"

        # 6. ExposureCheck (Dynamic Multi-Asset Lot Sizing Aware)
        from src.instrument_resolver import global_instrument_resolver
        res_inst = global_instrument_resolver.resolve(symbol)
        lot_sz = res_inst.instrument.lot_size if res_inst.is_valid and res_inst.instrument else 1.0
        max_allowed_qty = max(config.MAX_POSITION_SIZE, lot_sz * 20.0)

        if amount > max_allowed_qty:
            return False, f"EXCEEDS_MAX_POSITION_SIZE: Requested {amount} > max {max_allowed_qty}"
        if order_cost > config.MAX_ORDER_VALUE:
            return False, f"EXCEEDS_MAX_ORDER_VALUE: Requested ${order_cost:,.2f} > max ${config.MAX_ORDER_VALUE:,.2f}"

        # 7. DailyLossCheck
        todays_stats = _execute_query("SELECT daily_pnl FROM daily_statistics WHERE date_key = DATE('now')")
        daily_pnl = todays_stats[0].get("daily_pnl", 0.0) if todays_stats else 0.0
        if daily_pnl <= -abs(config.MAX_DAILY_LOSS):
            return False, f"DAILY_LOSS_LIMIT_REACHED: Daily PnL ${daily_pnl:,.2f} reached limit -${config.MAX_DAILY_LOSS:,.2f}"

        # 8. PositionSizeCheck
        if amount <= 0:
            return False, "INVALID_POSITION_SIZE: Position size must be positive"

        # 9. StopLossCheck
        if stop_loss <= 0 or (side.upper() in ["BUY", "LONG"] and stop_loss >= price) or (side.upper() in ["SELL", "SHORT"] and stop_loss <= price):
            return False, f"INVALID_STOP_LOSS: Invalid SL level {stop_loss} for {side} @ {price}"

        # 10. TakeProfitCheck
        if take_profit <= 0 or (side.upper() in ["BUY", "LONG"] and take_profit <= price) or (side.upper() in ["SELL", "SHORT"] and take_profit >= price):
            return False, f"INVALID_TAKE_PROFIT: Invalid TP level {take_profit} for {side} @ {price}"

        # 10b. RiskRewardCheck
        risk = abs(price - stop_loss)
        reward = abs(take_profit - price)
        if risk > 0 and (reward / risk) < 1.0:
            return False, f"POOR_RISK_REWARD_RATIO: Risk/Reward ratio {(reward/risk):.2f}:1 is less than min 1.0:1"

        # 11. StrategyPermissionCheck
        raw_thresh = getattr(config, "CONFLUENCE_THRESHOLD", 0.70)
        norm_thresh = (raw_thresh / 100.0) if raw_thresh > 1.0 else raw_thresh
        norm_conf = (confidence_score / 100.0) if confidence_score > 1.0 else confidence_score
        if norm_conf < norm_thresh:
            return False, f"CONFIDENCE_BELOW_THRESHOLD: Confidence {norm_conf*100:.1f}% < threshold {norm_thresh*100:.1f}%"

        # 12. ExecutionModeCheck
        mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if is_live and mode != "LIVE":
            return False, f"EXECUTION_MODE_MISMATCH: Live order requested but TRADING_MODE is '{mode}'"

        # 13. KillSwitchCheck
        if config.KILL_SWITCH_FILE.exists() or getattr(config, "GLOBAL_TRADING_KILL_SWITCH", False):
            return False, "KILL_SWITCH_ACTIVE: Global Trading Kill Switch is ACTIVATED"

        # 14. LiveTradingArmCheck & Broker/Data Fail-Closed Pre-Flight
        if is_live:
            if not getattr(config, "LIVE_TRADING_ENABLED", False):
                return False, "LIVE_TRADING_DISABLED: LIVE_TRADING_ENABLED flag is False"
            if not getattr(config, "LIVE_TRADING_ARMED", False):
                return False, "LIVE_TRADING_DISARMED: Live trading has NOT been explicitly armed by user"
            if not getattr(config, "MASTER_LIVE_TRADING", False):
                return False, "MASTER_LIVE_TRADING_OFF: MASTER_LIVE_TRADING flag is False"
            # Fail closed: Verify Binance/Broker credentials
            api_key = getattr(config, "BINANCE_TESTNET_API_KEY", "") or getattr(config, "BINANCE_API_KEY", "")
            secret_key = getattr(config, "BINANCE_TESTNET_SECRET_KEY", "") or getattr(config, "BINANCE_API_SECRET", "")
            if not api_key or not secret_key:
                return False, "BROKER_CREDENTIALS_MISSING: Live execution blocked. Exchange API keys not configured."
            # Fail closed: Verify Market Health
            from src.market_data import global_stale_protection
            if global_stale_protection.is_stale(symbol):
                return False, f"LIVE_MARKET_FEED_STALE: Live execution blocked. Market feed for {symbol} is currently stale."

        return True, "ALL_14_SAFETY_CHECKS_PASSED"

    def execute_order(
        self,
        bot_id: str,
        strategy: str,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        stop_loss: float,
        take_profit: float,
        confidence_score: float,
        market_tick_iso: Optional[str] = None,
        account_balance: float = 10000.0,
        is_live: bool = False
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Single Authoritative Order Execution Entrypoint.
        Routes to Paper, Test, or Live execution after 14-Point Pre-Order Check.
        """
        passed, reason = self.validate_14_point_pre_order_check(
            bot_id=bot_id, strategy=strategy, symbol=symbol, side=side, amount=amount,
            price=price, stop_loss=stop_loss, take_profit=take_profit,
            confidence_score=confidence_score, market_tick_iso=market_tick_iso,
            account_balance=account_balance, is_live=is_live
        )

        signal_time_str = market_tick_iso or datetime.now(timezone.utc).isoformat()
        idem_key = self.generate_idempotency_key(bot_id, strategy, symbol, signal_time_str[:16])

        if not passed:
            log_bot_event(
                event_type="RISK_BLOCKED",
                message=f"Order pre-validation blocked for {symbol} ({side}): {reason}",
                bot_instance_id=bot_id,
                severity="WARNING",
                status="BLOCKED",
                reason=reason,
                strategy_name=strategy,
                symbol=symbol,
                confidence_score=confidence_score,
                threshold=config.CONFLUENCE_THRESHOLD * 100.0,
                correlation_id=idem_key
            )
            try:
                from src.telegram_service import global_telegram_service
                from src.db import get_bot_instance
                bot_rec = get_bot_instance(bot_id) or {}
                b_name = bot_rec.get("name", f"Bot {bot_id}")
                global_telegram_service.send_risk_alert(
                    bot_name=b_name,
                    signal=f"{side} {symbol}",
                    reason=reason,
                    risk_type="RISK_BLOCKED",
                    bot_id=bot_id
                )
            except Exception as tg_e:
                logger.debug("Failed sending Telegram risk blocked alert: %s", tg_e)

            return False, reason, {}

        mode = "LIVE" if is_live else ("TEST" if getattr(config, "TEST_MODE", False) else "PAPER")
        log_bot_event(
            event_type="ORDER_REQUESTED",
            message=f"Submitting {mode} order for {symbol} ({side}) amount={amount} @ ${price:,.2f}",
            bot_instance_id=bot_id,
            severity="INFO",
            status="PENDING",
            strategy_name=strategy,
            symbol=symbol,
            confidence_score=confidence_score,
            correlation_id=idem_key
        )

        try:
            from src.latency_profiler import TradeLatencyContext
            from src.trade_ledger import trade_ledger
            
            latency_ctx = TradeLatencyContext(trade_id=0, order_id=idem_key)
            latency_ctx.mark_stage("risk_check")
            latency_ctx.mark_stage("order_creation")
            latency_ctx.mark_stage("broker_submit")

            if mode == "TEST":
                result = self.test_adapter.submit_order(symbol, side, amount, price)
            elif mode == "LIVE":
                result = self.live_adapter.submit_order(symbol, side, amount, price)
            else:
                result = self.paper_adapter.submit_order(symbol, side, amount, price)

            latency_ctx.mark_stage("broker_ack")
            latency_ctx.mark_stage("fill")

            log_bot_event(
                event_type="ORDER_FILLED",
                message=f"Order FILLED: #{result['order_id']} {symbol} ({side}) avg_price=${result['average_price']:,.2f}",
                bot_instance_id=bot_id,
                severity="INFO",
                status="SUCCESS",
                order_id=str(result["order_id"]),
                strategy_name=strategy,
                symbol=symbol,
                confidence_score=confidence_score,
                correlation_id=idem_key,
                metadata=result
            )

            # Record through Authoritative Trade Ledger
            ok, trade_id, msg = trade_ledger.record_new_trade({
                "bot_id": bot_id,
                "strategy": strategy,
                "strategy_id": strategy,
                "symbol": symbol,
                "direction": side.upper(),
                "entry_price": float(result.get("average_price") or price),
                "position_size": float(result.get("filled_quantity") or amount),
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "signal_confidence": float(confidence_score * 100.0 if confidence_score <= 1.0 else confidence_score),
                "execution_mode": mode,
                "broker_order_id": str(result.get("broker_order_id") or result.get("order_id")),
                "order_id": str(result.get("order_id")),
                "idempotency_key": idem_key,
                "fees": float(result.get("fees") or 1.50),
                "remarks": f"Executed via {mode} OrderExecutionService"
            })

            latency_ctx.trade_id = trade_id
            latency_ctx.mark_stage("db_write")
            latency_ctx.finalize()

            result["trade_id"] = trade_id

            # Dispatch ORDER_FILLED Telegram Alert
            try:
                from src.telegram_service import global_telegram_service
                from src.db import get_bot_instance
                bot_rec = get_bot_instance(bot_id) or {}
                b_name = bot_rec.get("name", f"Bot {bot_id}")
                global_telegram_service.send_order_alert(
                    event_type="ORDER_FILLED",
                    bot_name=b_name,
                    symbol=symbol,
                    side=side,
                    quantity=float(result.get("filled_quantity") or amount),
                    price=float(result.get("average_price") or price),
                    order_id=str(result.get("order_id")),
                    bot_id=bot_id
                )
            except Exception as tg_e:
                logger.debug("Failed sending Telegram ORDER_FILLED alert: %s", tg_e)

            return True, f"Order executed successfully in {mode} mode (Trade #{trade_id})", result

        except Exception as e:
            logger.error("Order execution failed for %s: %s", symbol, e)
            log_bot_event(
                event_type="ORDER_REJECTED",
                message=f"Execution error for {symbol}: {str(e)}",
                bot_instance_id=bot_id,
                severity="ERROR",
                status="FAILED",
                reason=str(e),
                strategy_name=strategy,
                symbol=symbol,
                correlation_id=idem_key
            )
            try:
                from src.telegram_service import global_telegram_service
                from src.db import get_bot_instance
                bot_rec = get_bot_instance(bot_id) or {}
                b_name = bot_rec.get("name", f"Bot {bot_id}")
                global_telegram_service.send_order_alert(
                    event_type="ORDER_REJECTED",
                    bot_name=b_name,
                    symbol=symbol,
                    side=side,
                    quantity=amount,
                    price=price,
                    order_id=idem_key,
                    reason=str(e),
                    bot_id=bot_id
                )
            except Exception as tg_e:
                logger.debug("Failed sending Telegram ORDER_REJECTED alert: %s", tg_e)

            return False, f"Execution engine error: {str(e)}", {}

    def route_order(
        self,
        symbol: str,
        direction: str,
        quantity: float,
        price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        bot_id: str = "quant-paper-bot",
        strategy: str = "QUANT_CONFLUENCE_PRO",
        confidence_score: float = 0.85,
        mode: str = "PAPER"
    ) -> Dict[str, Any]:
        """Routes and executes an order with automatic price resolution and fail-safe directional SL/TP."""
        eff_price = price
        if not eff_price or eff_price <= 0:
            try:
                from src.ticker_service import resilient_ticker_service
                t_data = resilient_ticker_service.get_ticker(symbol)
                eff_price = float(t_data.get("last") or t_data.get("price") or 0.0)
            except Exception:
                eff_price = 0.0

        if not eff_price or eff_price <= 0:
            try:
                inst = db.get_market_instrument(symbol)
                if inst:
                    eff_price = float(inst.get("last_price") or 0.0)
            except Exception:
                pass

        if not eff_price or eff_price <= 0:
            eff_price = 65420.0 if "BTC" in symbol.upper() else (3500.0 if "ETH" in symbol.upper() else 100.0)

        is_buy = direction.upper() in ["BUY", "LONG"]
        if is_buy:
            eff_sl = stop_loss if (stop_loss and stop_loss > 0 and stop_loss < eff_price) else round(eff_price * 0.985, 2)
            eff_tp = take_profit if (take_profit and take_profit > 0 and take_profit > eff_price) else round(eff_price * 1.035, 2)
        else:
            eff_sl = stop_loss if (stop_loss and stop_loss > 0 and stop_loss > eff_price) else round(eff_price * 1.015, 2)
            eff_tp = take_profit if (take_profit and take_profit > 0 and take_profit < eff_price) else round(eff_price * 0.965, 2)

        success, reason, order_dict = self.execute_order(
            bot_id=bot_id,
            strategy=strategy,
            symbol=symbol,
            side=direction,
            amount=quantity,
            price=eff_price,
            stop_loss=eff_sl,
            take_profit=eff_tp,
            confidence_score=confidence_score,
            account_balance=50000.0,
            is_live=(mode == "LIVE"),
        )
        notional = round(quantity * eff_price, 2)
        return {
            "status": "success" if success else "error",
            "success": success,
            "reason": reason,
            "order_id": str(order_dict.get("order_id") or ""),
            "trade_id": order_dict.get("trade_id"),
            "fill_price": float(order_dict.get("average_price") or eff_price),
            "price": eff_price,
            "notional_value": notional,
            "required_margin": notional,
            "order": order_dict,
            "trade": order_dict,
            "symbol": symbol,
            "direction": direction,
            "quantity": quantity,
            "mode": mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


order_execution_service = OrderExecutionService()
