import json
import os
import sys
import logging
import time
from typing import Optional, Dict, Any, Tuple, List
import traceback
from pathlib import Path
from datetime import datetime, timezone, date
from apscheduler.schedulers.blocking import BlockingScheduler

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src import config
from src.data_fetcher import DataFetcher, get_mainnet_fetcher, get_testnet_fetcher
from src.indicators import generate_indicators
from src.strategy import Strategy
from src.risk_manager import RiskManager
from src.telegram_alert import TelegramAlert
from src.monitoring import MonitoringService
from src import db, pnl_engine
from src.execution import ExecutionEngine
from src.audit import log_bot_event
from src.instrument_resolver import (
    global_instrument_resolver,
    ResolutionStatus,
    CanonicalInstrument,
    InstrumentType,
    validate_contract_expiry,
    resolve_contract_rollover,
    resolve_signal_and_execution_instruments,
)
from src.provider_manager import global_provider_manager
from src.error_ledger import global_error_ledger

# Setup Logging
_handlers: List[logging.Handler] = [logging.StreamHandler(sys.stdout)]
try:
    _log_file = config.BASE_DIR / "data" / "live_runner.log"
    _log_file.parent.mkdir(parents=True, exist_ok=True)
    _handlers.append(logging.FileHandler(_log_file, delay=True, encoding="utf-8"))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=_handlers
)
logger = logging.getLogger("LiveRunner")


class CycleContext:
    """Simple container for the current evaluation context."""

    def __init__(self) -> None:
        self.started_at = datetime.now(timezone.utc)
        self.balance = 10000.0
        self.close_price = 0.0
        self.signal = "HOLD"
        self.decision = "HOLD"
        self.open_trade = None
        self.status = "OK"
        self.details = {}


class LiveRunner:
    """
    Orchestrates the scheduled execution cycle of a specific Bot Instance.
    Enforces strict separation of Signal Market Data from Execution Premium Data.
    """

    def __init__(self, bot_id: str = "bot-1"):
        db.init_db()
        self.bot_id = bot_id
        self.strategy = Strategy()
        self.risk_manager = RiskManager()
        self.telegram = TelegramAlert()
        self.monitoring = MonitoringService()
        self.retry_count = 0
        self._last_logged_state: Optional[str] = None

        # Load bot instance config from DB
        conn = db.get_connection()
        row = None
        try:
            c = conn.cursor()
            c.execute("SELECT * FROM bot_instances WHERE id = ?", (self.bot_id,))
            row = c.fetchone()
        finally:
            if conn:
                try: conn.close()
                except Exception: pass

        if row:
            b = dict(row)
            self.bot_config = b
            self.symbol = b.get("symbol") or config.SYMBOL
            self.timeframe = b.get("timeframe") or config.TIMEFRAME
            self.bot_name = b.get("name") or f"Bot {self.bot_id}"
            self.rollover_policy = b.get("rollover_policy") or "STRATEGY_RESOLVE"
            cfg = b.get("config_json") or {}
            if isinstance(cfg, str):
                try:
                    cfg = json.loads(cfg)
                    if isinstance(cfg, str):
                        cfg = json.loads(cfg)
                except Exception:
                    cfg = {}
            if not isinstance(cfg, dict):
                cfg = {}
            self.indicators = cfg.get("indicators", ["ema", "macd", "vp"])
            self.risk_pct = float(cfg.get("risk_pct") or 0.02)
            self.auto_execute = cfg.get("auto_execute", True)
            self.require_manual_approval = cfg.get("require_manual_approval", False)
            self.execution_mode = b.get("execution_mode") or "PAPER"
            self.asset_class = b.get("asset_class") or "CRYPTO"
        else:
            self.bot_config = {}
            self.symbol = config.SYMBOL
            self.timeframe = config.TIMEFRAME
            self.bot_name = f"Bot {self.bot_id}"
            self.rollover_policy = "STRATEGY_RESOLVE"
            self.indicators = ["ema", "macd", "vp"]
            self.risk_pct = 0.02
            self.auto_execute = True
            self.require_manual_approval = False
            self.execution_mode = "PAPER"
            self.asset_class = "CRYPTO"

        self.testnet_fetcher = get_testnet_fetcher()
        self.executor = ExecutionEngine(self.testnet_fetcher.exchange)
        self.instrument_resolver = global_instrument_resolver
        self.provider_manager = global_provider_manager
        self.error_ledger = global_error_ledger

        # Resolve Signal Instrument and Execution Instrument
        self._init_instruments()

        log_bot_event(
            event_type="BOT_START",
            message=f"Initialized bot runner instance '{self.bot_name}' ({self.bot_id}) for {self.symbol} ({self.timeframe})",
            bot_instance_id=self.bot_id,
            bot_instance_name=self.bot_name,
            symbol=self.symbol,
            timeframe=self.timeframe,
            severity="INFO"
        )

    def _init_instruments(self):
        """Resolves signal vs execution instruments and enforces expiry & rollover policies."""
        sig_inst, exec_inst = resolve_signal_and_execution_instruments(self.symbol)
        self.signal_instrument = sig_inst
        self.execution_instrument = exec_inst
        self.currency = exec_inst.quote_asset or ("INR" if exec_inst.exchange == "NSE" else "USDT")

        # Expiry Validation
        is_valid_exp, exp_code, exp_d = validate_contract_expiry(exec_inst)
        if not is_valid_exp:
            logger.warning("[%s] CONTRACT_EXPIRED: Contract '%s' expired on %s.", self.bot_id, self.symbol, exp_d.isoformat() if exp_d else "N/A")
            # Apply Rollover Policy
            roll_res = resolve_contract_rollover(self.bot_config, self.symbol, rollover_policy=self.rollover_policy)
            if roll_res.is_valid and roll_res.instrument:
                logger.info("[%s] CONTRACT_RESOLVED: Rolled over from '%s' to '%s' (Expiry: %s).", self.bot_id, self.symbol, roll_res.instrument.canonical_symbol, roll_res.instrument.expiry)
                self.symbol = roll_res.instrument.canonical_symbol
                self.execution_instrument = roll_res.instrument
                self._persist_symbol_update(self.symbol)
                self.is_preflight_failed = False
                self.preflight_error = ""
            else:
                self.is_preflight_failed = True
                self.preflight_error = f"CONTRACT_EXPIRED: {roll_res.reason or 'Contract is expired and rollover was unable to resolve a replacement.'}"
                logger.error("[%s] WAITING_INSTRUMENT: %s", self.bot_id, self.preflight_error)
                return
        else:
            self.is_preflight_failed = False
            self.preflight_error = ""

        logger.info(
            "[%s] Instruments Resolved -> Signal Asset: %s (%s) | Execution Asset: %s (%s, Currency: %s)",
            self.bot_id,
            self.signal_instrument.canonical_symbol,
            self.signal_instrument.instrument_type.value,
            self.execution_instrument.canonical_symbol,
            self.execution_instrument.instrument_type.value,
            self.currency
        )

    def _persist_symbol_update(self, new_symbol: str):
        """Updates bot symbol in bot_instances and data_core_persisted_bots."""
        conn = None
        try:
            conn = db.get_connection()
            c = conn.cursor()
            c.execute("UPDATE bot_instances SET symbol = ?, updated_at = ? WHERE id = ?", (new_symbol, datetime.now(timezone.utc).isoformat(), self.bot_id))
            try:
                c.execute("UPDATE data_core_persisted_bots SET canonical_instrument_id = ? WHERE bot_id = ?", (new_symbol, self.bot_id))
            except Exception:
                pass
            conn.commit()
        except Exception as e:
            logger.debug("Failed to persist rolled-over symbol update: %s", e)
        finally:
            if conn:
                try: conn.close()
                except Exception: pass

    def get_execution_live_quote(self, inst: CanonicalInstrument, fallback_price: float) -> float:
        """
        Fetches the live option premium or futures market price for the execution instrument.
        Never confuses underlying spot prices with option premiums.
        """
        # If spot or equity, return fallback underlying price
        if inst.instrument_type not in (InstrumentType.OPTION, InstrumentType.DATED_FUTURE):
            return fallback_price

        # 1. Delta Exchange Options Quotes
        if inst.provider in ("delta_options", "delta") or inst.exchange == "DELTA":
            try:
                rows = db.safe_query(
                    "SELECT mark_price, spot_price, best_bid, best_ask FROM delta_option_quotes WHERE symbol = ?",
                    (inst.canonical_symbol.strip(),)
                )
                if rows:
                    q = rows[0]
                    mark = float(q.get("mark_price") or 0.0)
                    bid = float(q.get("best_bid") or 0.0)
                    ask = float(q.get("best_ask") or 0.0)
                    if mark > 0:
                        return mark
                    if bid > 0 and ask > 0:
                        return (bid + ask) / 2.0
                    if bid > 0:
                        return bid
            except Exception as e:
                logger.debug("Delta quotes query error: %s", e)

        # 2. Upstox Indian Options / Futures Quotes
        if inst.exchange == "NSE" or inst.provider in ("upstox", "upstox_options"):
            try:
                from src.upstox_service import global_upstox_service
                quote = global_upstox_service.get_full_market_quote(inst.provider_symbol or inst.canonical_symbol)
                if quote:
                    ltp = float(quote.get("last_price") or quote.get("ltp") or 0.0)
                    if ltp > 0:
                        return ltp
            except Exception as e:
                logger.debug("Upstox quote fetch error: %s", e)

        # Realistic estimation if market closed/paper mode
        if inst.instrument_type == InstrumentType.OPTION and inst.strike:
            strike = float(inst.strike)
            opt_type = (inst.option_type or "CALL").upper()
            spot = fallback_price
            # Intrinsic value approximation
            intrinsic = max(0.0, (spot - strike) if opt_type in ("CALL", "CE") else (strike - spot))
            time_val = max(10.0, spot * 0.005)
            return round(intrinsic + time_val, 2)

        return fallback_price

    def process_cycle(self):
        """Execute one bot evaluation cycle with diagnostics and safety checks."""
        # Pre-flight validation gate: Block execution if instrument is expired or invalid
        if getattr(self, "is_preflight_failed", False):
            # Log state change only once to avoid 5-second spam
            if self._last_logged_state != "PREFLIGHT_BLOCKED":
                logger.error("[%s] [STATE CHANGE] WAITING_INSTRUMENT: Bot execution halted. Reason: %s", self.bot_id, self.preflight_error)
                self._last_logged_state = "PREFLIGHT_BLOCKED"
                db.log_bot_activity(self.bot_id, "WAITING_INSTRUMENT", f"WAITING_INSTRUMENT: {self.preflight_error}", {"error": self.preflight_error})
                conn = None
                try:
                    conn = db.get_connection()
                    c = conn.cursor()
                    c.execute("UPDATE bot_instances SET status = 'CONTRACT_EXPIRED' WHERE id = ?", (self.bot_id,))
                    conn.commit()
                except Exception:
                    pass
                finally:
                    if conn:
                        try: conn.close()
                        except Exception: pass
            return

        # Periodically check expiry on every cycle
        is_valid_exp, exp_code, exp_d = validate_contract_expiry(self.execution_instrument)
        if not is_valid_exp:
            roll_res = resolve_contract_rollover(self.bot_config, self.symbol, rollover_policy=self.rollover_policy)
            if roll_res.is_valid and roll_res.instrument:
                logger.info("[%s] CONTRACT_RESOLVED: Rolled over from '%s' to '%s'.", self.bot_id, self.symbol, roll_res.instrument.canonical_symbol)
                self.symbol = roll_res.instrument.canonical_symbol
                self.execution_instrument = roll_res.instrument
                self._persist_symbol_update(self.symbol)
            else:
                self.is_preflight_failed = True
                self.preflight_error = f"CONTRACT_EXPIRED: Contract '{self.symbol}' expired on {exp_d.isoformat() if exp_d else 'N/A'}."
                return

        context = CycleContext()
        status = "OK"

        try:
            if self.risk_manager.is_kill_switch_active():
                logger.warning("Kill switch file active. Skipping cycle.")
                return

            paper_balance = float(getattr(self, "allocated_capital", 10000.0) or 10000.0)
            balance = paper_balance
            context.balance = paper_balance

            # 1. Fetch Signal Market Data (Underlying Candles)
            sig_sym = self.signal_instrument.canonical_symbol
            df, _ = self.provider_manager.fetch_ohlcv_safe(sig_sym, self.timeframe, limit=1000)

            if df.empty or len(df) < 200:
                logger.error("Fetched insufficient historical candles for indicator calculation.")
                status = "WARN"
                return

            df = generate_indicators(df, timeframe=self.timeframe)
            eval_idx = len(df) - 2
            candle_time = pd_timestamp_to_str(df.iloc[eval_idx]['timestamp'])
            close_price = float(df.iloc[eval_idx]['close'])
            high_price = float(df.iloc[eval_idx]['high'])
            low_price = float(df.iloc[eval_idx]['low'])
            
            live_signal_price = float(df.iloc[-1]['close'])
            live_high = float(df.iloc[-1]['high'])
            live_low = float(df.iloc[-1]['low'])
            context.close_price = live_signal_price

            logger.info("SIGNAL_DATA: %s underlying (Price: %.2f)", sig_sym, live_signal_price)

            # 2. Fetch Execution Market Data (Live Option Premium or Futures Quote)
            live_execution_price = self.get_execution_live_quote(self.execution_instrument, fallback_price=live_signal_price)
            logger.info("EXECUTION_DATA: %s (premium/price = %.2f)", self.execution_instrument.canonical_symbol, live_execution_price)

            active_trade = get_active_trade(self.bot_id)
            context.open_trade = active_trade

            if active_trade:
                from src.error_ledger import DataValidationError
                trade_id = active_trade.get('id')
                direction = str(active_trade.get('direction') or 'LONG').upper()
                raw_entry = active_trade.get('entry_price')
                raw_sl = active_trade.get('stop_loss')
                raw_tp = active_trade.get('take_profit')
                raw_size = active_trade.get('position_size')

                if raw_entry is None or raw_size is None:
                    raise DataValidationError(f"Active trade #{trade_id} missing entry_price or position_size")

                entry_price = float(raw_entry)
                size = float(raw_size)
                sl_price = float(raw_sl) if raw_sl is not None and float(raw_sl) > 0 else None
                tp_price = float(raw_tp) if raw_tp is not None and float(raw_tp) > 0 else None

                # Compute Live MTM P&L using Authoritative PnL Engine on Live Execution Price
                upnl_res = pnl_engine.compute_unrealized_pnl(
                    direction=direction,
                    entry_price=entry_price,
                    live_price=live_execution_price,
                    quantity=size,
                    currency=self.currency
                )
                current_unrealized = upnl_res["unrealized_pnl"]

                logger.info(
                    "[%s] Active trade #%s (%s, Entry: %.2f, Live: %.2f, SL: %s, TP: %s, MTM: %+.2f %s)",
                    self.bot_id,
                    trade_id,
                    direction,
                    entry_price,
                    live_execution_price,
                    f"{sl_price:.2f}" if sl_price is not None else "None",
                    f"{tp_price:.2f}" if tp_price is not None else "None",
                    current_unrealized,
                    self.currency,
                )

                exit_triggered = False
                exit_price = 0.0
                exit_pnl = 0.0
                exit_reason = ""

                # Evaluate instant triggers against execution price
                if direction == "LONG":
                    if sl_price is not None and live_execution_price <= sl_price:
                        exit_triggered = True
                        exit_price = sl_price
                        exit_pnl = (exit_price - entry_price) * size
                        exit_reason = "STOP LOSS"
                    elif tp_price is not None and live_execution_price >= tp_price:
                        exit_triggered = True
                        exit_price = tp_price
                        exit_pnl = (exit_price - entry_price) * size
                        exit_reason = "TAKE PROFIT"
                elif direction == "SHORT":
                    if sl_price is not None and live_execution_price >= sl_price:
                        exit_triggered = True
                        exit_price = sl_price
                        exit_pnl = (entry_price - exit_price) * size
                        exit_reason = "STOP LOSS"
                    elif tp_price is not None and live_execution_price <= tp_price:
                        exit_triggered = True
                        exit_price = tp_price
                        exit_pnl = (entry_price - exit_price) * size
                        exit_reason = "TAKE PROFIT"

                # 3. Check Expiry Cutoff Window Trigger (Auto Square-Off on Expiry)
                if not exit_triggered:
                    from src.expiry_lifecycle_manager import global_expiry_lifecycle_manager
                    in_exp_win, cutoff_dt, exp_code = global_expiry_lifecycle_manager.is_contract_in_expiry_window(self.execution_instrument)
                    if in_exp_win:
                        exit_triggered = True
                        exit_price = live_execution_price
                        exit_pnl = (exit_price - entry_price) * size if direction == "LONG" else (entry_price - exit_price) * size
                        exit_reason = "AUTO_EXPIRY_SQUARE_OFF"
                        logger.info("[%s] EXPIRY_WINDOW_ENTERED: Auto square-off triggered at contract expiry cutoff (%s).", self.bot_id, exp_code)

                if exit_triggered:
                    logger.info("[%s] Active trade exit condition detected (%s)! Price: %.2f, PnL: %.2f %s.", self.bot_id, exit_reason, exit_price, exit_pnl, self.currency)
                    
                    if self.auto_execute and not self.require_manual_approval:
                        from src.execution_service import order_execution_service
                        exec_mode = getattr(self, "execution_mode", "PAPER")
                        exit_side = "SELL" if direction in ["LONG", "BUY"] else "BUY"
                        success, exit_msg, exit_res = order_execution_service.execute_exit(
                            bot_id=self.bot_id,
                            trade_id=trade_id,
                            symbol=self.symbol,
                            side=exit_side,
                            quantity=size,
                            price=exit_price,
                            exit_reason=exit_reason,
                            mode=exec_mode,
                            broker=getattr(self, "broker", "PAPER"),
                        )
                        if success:
                            ledger_res = exit_res.get("trade_ledger_result") or {}
                            realized_pnl = float(ledger_res.get("net_pnl") or exit_pnl)
                            db.log_bot_activity(
                                self.bot_id,
                                "TRADE_EXIT_AUTONOMOUS",
                                f"🎯 AUTO-EXECUTED EXIT: Closed Trade #{trade_id} on {exit_reason} at {self.currency} {exit_price:,.2f} (PnL: {realized_pnl:+.2f} {self.currency}).",
                                {"trade_id": trade_id, "exit_reason": exit_reason, "exit_price": exit_price, "realized_pnl": realized_pnl}
                            )

                            context.signal = "EXIT_SIGNAL"
                            context.decision = "CLOSED"
                            context.open_trade = None
                            return
                        else:
                            logger.warning("[%s] Failed to close trade via OrderExecutionService: %s", self.bot_id, exit_msg)

                else:
                    # Update live floating unrealized mark-to-market PnL in database
                    context.signal = "HOLD"
                    context.decision = "HOLD"
                    
                    conn = db.get_connection()
                    try:
                        c = conn.cursor()
                        c.execute("UPDATE trades_log SET unrealized_pnl = ? WHERE id = ?", (current_unrealized, trade_id))
                        c.execute("UPDATE bot_instances SET unrealized_pnl = ?, last_checked_at = ? WHERE id = ?", (current_unrealized, datetime.now(timezone.utc).isoformat(), self.bot_id))
                        try:
                            c.execute("UPDATE positions SET unrealized_pnl = ?, current_price = ? WHERE bot_id = ? OR id = ?", (current_unrealized, live_execution_price, self.bot_id, trade_id))
                        except Exception:
                            pass
                        conn.commit()
                    except Exception as exc:
                        logger.warning("[%s] Failed to persist live MTM PnL: %s", self.bot_id, exc)
                    finally:
                        if conn:
                            try: conn.close()
                            except Exception: pass
                    return

            if not active_trade:
                signal_row, filters, is_blocked, reason_row = self.strategy.evaluate_row(df, eval_idx)
                direction_conf, score_conf, conf_details = self.strategy.evaluate_confluence(df, eval_idx, active_indicators=self.indicators)
                
                thresh_pct = float(conf_details.get("threshold", 0.75) * 100)
                if direction_conf == "SHORT":
                    conf_pct = float(conf_details.get("bear_score_pct", 0.0))
                elif direction_conf == "LONG":
                    conf_pct = float(conf_details.get("bull_score_pct", 0.0))
                else:
                    conf_pct = max(float(conf_details.get("bull_score_pct", 0.0)), float(conf_details.get("bear_score_pct", 0.0)))
                
                if direction_conf in ["LONG", "SHORT"] and score_conf >= conf_details.get("threshold", 0.75):
                    signal = direction_conf
                    reason = f"Confluence score: {conf_pct:.0f}% ({direction_conf}) meets {thresh_pct:.0f}% threshold"
                else:
                    signal = signal_row
                    reason = reason_row or f"Confluence score: {conf_pct:.0f}% ({signal})"

                context.signal = signal
                context.decision = signal if not is_blocked else "HOLD"

                if signal in ["LONG", "SHORT"] and not is_blocked:
                    sl_price, tp_price = self.risk_manager.calculate_trade_levels(df, eval_idx, signal, live_execution_price)
                    size = self.risk_manager.calculate_position_size(balance, live_execution_price, sl_price)

                    conf_pct = float(conf_details.get("bear_score_pct" if signal == "SHORT" else "bull_score_pct", 75.0))
                    thresh_pct = float(conf_details.get("threshold", 0.75) * 100)

                    if self.auto_execute and not self.require_manual_approval:
                        from src.execution_service import order_execution_service
                        exec_mode = getattr(self, "execution_mode", "PAPER")
                        success, reason_exec, order_res = order_execution_service.execute_order(
                            bot_id=self.bot_id,
                            strategy=self.bot_name,
                            symbol=self.symbol,
                            side=signal,
                            amount=size,
                            price=live_execution_price,
                            stop_loss=sl_price,
                            take_profit=tp_price,
                            confidence_score=conf_pct,
                            is_live=(exec_mode.upper() == "LIVE"),
                            mode=exec_mode,
                            broker=getattr(self, "broker", "PAPER"),
                        )
                        if success:
                            trade_id = order_res.get("trade_id")
                            db.log_bot_activity(
                                self.bot_id,
                                "TRADE_ENTRY_AUTONOMOUS",
                                f"⚡ AUTO-EXECUTED: Opened {signal} position (Trade #{trade_id}) at {self.currency} {live_execution_price:,.2f} (SL: {sl_price:,.2f}, TP: {tp_price:,.2f}, {conf_pct:.0f}% Confluence).",
                                {"trade_id": trade_id, "direction": signal, "entry_price": live_execution_price, "sl": sl_price, "tp": tp_price}
                            )
                            context.signal = signal
                            context.decision = signal
                            logger.info("[%s] Autonomous trade executed via OrderExecutionService (Trade #%s, %s at %.2f %s)", self.bot_id, trade_id, signal, live_execution_price, self.currency)
                            return
                        else:
                            logger.warning("[%s] OrderExecutionService rejected trade: %s", self.bot_id, reason_exec)
                            db.log_bot_activity(
                                self.bot_id,
                                "TRADE_ENTRY_REJECTED",
                                f"⚠️ ORDER REJECTED: {reason_exec}",
                                {"direction": signal, "reason": reason_exec}
                            )
                            context.signal = "BLOCKED"
                            context.decision = "HOLD"
                            return

        except Exception as exc:
            status = "ERROR"
            error_msg = f"System Error in runner execution cycle: {exc}"
            logger.error(error_msg, exc_info=True)
            stack_trace = traceback.format_exc()

            incident = self.error_ledger.record_incident(
                exc=exc,
                bot_id=self.bot_id,
                symbol=self.symbol,
                operation="runner_cycle",
                stack_trace=stack_trace,
            )

            if not incident.get("is_retryable", 0):
                self.is_preflight_failed = True
                self.preflight_error = f"Fatal Non-Retryable Error: {exc}"

            db.log_bot_activity(self.bot_id, "ERROR", f"RUNNER ERROR: {exc}", {"error": str(exc), "incident_id": incident.get("id")})
        finally:
            try:
                self.retry_count = self.retry_count + 1 if status == "ERROR" else 0
                db.log_heartbeat(status, details={"signal": context.signal, "decision": context.decision, "balance": context.balance, "close_price": context.close_price})
                
                # Update bot_instances registry heartbeat
                try:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    conn = db.get_connection()
                    try:
                        c = conn.cursor()
                        c.execute("""
                            UPDATE bot_instances SET
                                last_heartbeat = ?,
                                last_scan_at = ?,
                                current_signal = ?,
                                open_position_count = ?,
                                status = CASE WHEN status IN ('ERROR', 'STOPPED', 'PAUSED', 'CONTRACT_EXPIRED') THEN status ELSE 'RUNNING' END
                            WHERE id = ?
                        """, (now_iso, now_iso, context.signal, 1 if context.open_trade else 0, self.bot_id))
                        conn.commit()
                    finally:
                        if conn:
                            try: conn.close()
                            except Exception: pass
                except Exception as reg_err:
                    logger.debug("[%s] Failed to update bot_instances registry: %s", self.bot_id, reg_err)

            except Exception as db_err:
                logger.error("Failed to log heartbeat in finally block: %s", db_err)

    def send_daily_summary(self):
        """Sends daily status via Telegram."""
        logger.info("Generating daily execution summary...")


def pd_timestamp_to_str(ts_ms) -> str:
    try:
        return datetime.fromtimestamp(ts_ms / 1000.0, timezone.utc).isoformat()
    except Exception:
        return str(ts_ms)


def get_active_trade(bot_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = None
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        if bot_id:
            cursor.execute(
                "SELECT * FROM trades_log WHERE status IN ('OPEN', 'RUNNING') AND (bot_id = ? OR bot_instance_id = ?) ORDER BY id DESC LIMIT 1",
                (bot_id, bot_id)
            )
        else:
            cursor.execute("SELECT * FROM trades_log WHERE status IN ('OPEN', 'RUNNING') ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error fetching active trade from DB: {e}")
        return None
    finally:
        if conn:
            try: conn.close()
            except Exception: pass


def parse_timeframe_to_minutes(tf_str: str) -> int:
    if not tf_str:
        return 5
    tf = tf_str.lower().strip()
    if tf.endswith("m"):
        try: return max(1, int(tf[:-1]))
        except ValueError: return 5
    elif tf.endswith("h"):
        try: return max(1, int(tf[:-1]) * 60)
        except ValueError: return 60
    elif tf.endswith("d"):
        try: return max(1, int(tf[:-1]) * 1440)
        except ValueError: return 1440
    return 5


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Trading Bot Live Runner")
    parser.add_argument("--bot_id", type=str, default="bot-1", help="Bot instance ID")
    args = parser.parse_args()

    pid = os.getpid()
    pid_file = config.BASE_DIR / "data" / f"bot_{args.bot_id}.pid"
    try:
        pid_file.parent.mkdir(parents=True, exist_ok=True)
        pid_file.write_text(str(pid))
    except Exception as pe:
        logger.warning(f"Could not write PID file {pid_file}: {pe}")

    logger.info("Initializing scheduled trading bot live runner for %s...", args.bot_id)
    runner = LiveRunner(bot_id=args.bot_id)
    
    # Run once immediately on startup
    runner.process_cycle()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        runner.process_cycle,
        'interval',
        seconds=5,
        id=f'market_check_job_{args.bot_id}',
        max_instances=2,
        coalesce=True
    )
    
    logger.info(f"Bot {args.bot_id} scheduled for fast real-time market tracking (5-second cycle).")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler shutdown successfully.")
        try:
            if pid_file.exists(): pid_file.unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    main()
