import json
import sys
import logging
import time
from typing import Optional, Dict, Any
import traceback
from pathlib import Path
from datetime import datetime, timezone
from apscheduler.schedulers.blocking import BlockingScheduler

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src import config
from src.data_fetcher import DataFetcher, get_mainnet_fetcher, get_testnet_fetcher
from src.indicators import generate_indicators
from src.strategy import Strategy
from src.risk_manager import RiskManager
from src.telegram_alert import TelegramAlert
from src.monitoring import MonitoringService
from src import db
from src.audit import log_bot_event

# Setup Logging
_handlers = [logging.StreamHandler(sys.stdout)]
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
    Runs in alert-only paper trading mode connected to Binance Testnet.
    """

    def __init__(self, bot_id: str = "bot-1"):
        db.init_db()
        self.bot_id = bot_id
        self.strategy = Strategy()
        self.risk_manager = RiskManager()
        self.telegram = TelegramAlert()
        self.monitoring = MonitoringService()
        self.retry_count = 0

        # Load bot instance config from DB
        conn = db.get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM bot_instances WHERE id = ?", (self.bot_id,))
        row = c.fetchone()
        conn.close()
        if row:
            b = dict(row)
            self.symbol = b.get("symbol") or config.SYMBOL
            self.timeframe = b.get("timeframe") or config.TIMEFRAME
            self.bot_name = b.get("name") or f"Bot {self.bot_id}"
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
            self.auto_execute = bool(cfg.get("auto_execute", False))
            self.require_manual_approval = bool(cfg.get("require_manual_approval", True))
        else:
            self.symbol = config.SYMBOL
            self.timeframe = config.TIMEFRAME
            self.bot_name = f"Bot {self.bot_id}"
            self.indicators = ["ema", "macd", "vp"]
            self.risk_pct = 0.02
            self.auto_execute = False
            self.require_manual_approval = True

        # Keep market-data connectivity separate from order execution.  The
        # runner never owns a direct broker order client; all paper orders must
        # pass through OrderExecutionService.
        self.testnet_fetcher = get_testnet_fetcher()
        self.executor = None
        # Canonical Instrument Pre-Flight Resolution
        from src.instrument_resolver import global_instrument_resolver, ResolutionStatus
        from src.provider_manager import global_provider_manager
        from src.error_ledger import global_error_ledger

        self.instrument_resolver = global_instrument_resolver
        self.provider_manager = global_provider_manager
        self.error_ledger = global_error_ledger

        exec_mode = b.get("execution_mode") or "PAPER" if row else "PAPER"
        self.execution_mode = str(exec_mode or "PAPER").upper()
        # A runner may auto-submit only through the paper adapter.  Live
        # execution requires a separate, explicitly armed operator workflow.
        if self.execution_mode != "PAPER" or str(getattr(config, "TRADING_MODE", "PAPER")).upper() != "PAPER":
            self.auto_execute = False
            self.require_manual_approval = True
        asset_class = b.get("asset_class") or "CRYPTO" if row else "CRYPTO"
        res = self.instrument_resolver.resolve_for_bot(self.symbol, execution_mode=exec_mode, asset_class=asset_class)
        if not res.is_valid:
            self.is_preflight_failed = True
            self.preflight_error = f"INSTRUMENT_PREFLIGHT_FAILED: {res.reason} (Code: {res.error_code}). Suggested: {res.suggested_action}"
            logger.error("[%s] %s", self.bot_id, self.preflight_error)
        else:
            self.is_preflight_failed = False
            self.preflight_error = ""
            self.canonical_instrument = res.instrument
            self.feed_symbol = res.instrument.canonical_symbol
            logger.info("[%s] Pre-flight instrument resolved: %s (feed: %s, %s via %s)", self.bot_id, self.symbol, self.feed_symbol, res.instrument.instrument_type.value, res.instrument.provider)

        log_bot_event(
            event_type="BOT_START",
            message=f"Initialized bot runner instance '{self.bot_name}' ({self.bot_id}) for {self.symbol} ({self.timeframe})",
            bot_instance_id=self.bot_id,
            bot_instance_name=self.bot_name,
            symbol=self.symbol,
            timeframe=self.timeframe,
            severity="INFO"
        )

    def process_cycle(self):
        """Execute one bot evaluation cycle with diagnostics and safety checks."""
        # Pre-flight validation gate: Block execution if instrument is a generic category or invalid
        if getattr(self, "is_preflight_failed", False):
            logger.error("[%s] Halting runner cycle: Bot is configured with unexecutable instrument '%s'. Error: %s", self.bot_id, self.symbol, self.preflight_error)
            exc = ValueError(self.preflight_error)
            self.error_ledger.record_incident(exc, bot_id=self.bot_id, symbol=self.symbol, stack_trace="")
            db.log_bot_activity(self.bot_id, "ERROR", f"PRE-FLIGHT BLOCKED: {self.preflight_error}", {"error": self.preflight_error})
            try:
                conn = db.get_connection()
                c = conn.cursor()
                c.execute("UPDATE bot_instances SET status = 'CONFIG_ERROR' WHERE id = ?", (self.bot_id,))
                conn.commit()
                conn.close()
            except Exception:
                pass
            return

        # Reload latest bot instance config dynamically from DB
        if getattr(self, "bot_id", None):
            try:
                conn = db.get_connection()
                c = conn.cursor()
                c.execute("SELECT config_json, allocated_capital, timeframe, symbol FROM bot_instances WHERE id = ?", (self.bot_id,))
                row = c.fetchone()
                conn.close()
                if row and row["config_json"]:
                    cfg = json.loads(row["config_json"])
                    if isinstance(cfg, str):
                        cfg = json.loads(cfg)
                    if isinstance(cfg, dict) and "indicators" in cfg:
                        self.indicators = cfg["indicators"]
                    if row and "allocated_capital" in row.keys() and row["allocated_capital"]:
                        self.allocated_capital = float(row["allocated_capital"])
            except Exception as exc:
                logger.warning("[%s] Failed to dynamically reload config from DB: %s", self.bot_id, exc)

        logger.info("[%s] Starting signal check cycle for %s (%s)...", self.bot_id, self.symbol, self.timeframe)
        db.log_bot_activity(self.bot_id, "EVALUATION_START", f"Starting {self.timeframe} candle evaluation cycle for {self.symbol}", {"symbol": self.symbol, "timeframe": self.timeframe})
        context = CycleContext()
        status = "OK"

        try:
            if self.risk_manager.is_kill_switch_active():
                logger.warning("Kill switch file active. Skipping cycle.")
                self.telegram.send_message("⚠️ <b>BTC Trading Bot alert</b>: Cycle skipped. kill_switch.flag is present in the workspace.")
                return

            # Paper trading capital allocated to this bot instance ($10,000.00 default)
            paper_balance = float(getattr(self, "allocated_capital", 10000.0) or 10000.0)
            balance = paper_balance
            context.balance = paper_balance

            if config.FORCE_TEST_SIGNAL:
                logger.info("FORCE_TEST_SIGNAL is enabled; injecting a LONG signal for Telegram testing.")
                context.signal = "LONG"
                context.decision = "LONG"

            feed_sym = getattr(self, "feed_symbol", None) or self.symbol
            logger.info("Fetching recent candles for %s (feed: %s, %s) [Bot: %s] via ProviderManager...", self.symbol, feed_sym, self.timeframe, self.bot_id)
            df, _ = self.provider_manager.fetch_ohlcv_safe(feed_sym, self.timeframe, limit=1000)

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
            context.close_price = close_price
            logger.info("[%s] Evaluating strategy on completed candle: %s at Close price: %.2f", self.bot_id, candle_time, close_price)

            # Update last_checked_at in DB and log activity
            db.log_bot_activity(self.bot_id, "EVALUATION", f"Evaluating {self.timeframe} candle close at ${close_price:,.2f}", {"close_price": close_price, "timeframe": self.timeframe})

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

                # Strict Null Validation
                if raw_entry is None or raw_size is None:
                    raise DataValidationError(f"Active trade #{trade_id} missing entry_price ({raw_entry}) or position_size ({raw_size})")

                try:
                    entry_price = float(raw_entry)
                    size = float(raw_size)
                except (ValueError, TypeError) as num_err:
                    raise DataValidationError(f"Active trade #{trade_id} invalid numeric format: {num_err}")

                if entry_price <= 0 or size <= 0:
                    raise DataValidationError(f"Active trade #{trade_id} non-positive values (entry: {entry_price}, size: {size})")

                sl_price = float(raw_sl) if raw_sl is not None and float(raw_sl) > 0 else None
                tp_price = float(raw_tp) if raw_tp is not None and float(raw_tp) > 0 else None

                logger.info(
                    "[%s] Active trade found in DB (ID: %s, %s, Entry: %.2f, SL: %s, TP: %s)",
                    self.bot_id,
                    trade_id,
                    direction,
                    entry_price,
                    f"{sl_price:.2f}" if sl_price is not None else "None",
                    f"{tp_price:.2f}" if tp_price is not None else "None",
                )

                exit_triggered = False
                exit_price = 0.0
                exit_pnl = 0.0
                exit_reason = ""

                if direction == "LONG":
                    if sl_price is not None and low_price <= sl_price:
                        exit_triggered = True
                        exit_price = sl_price
                        exit_pnl = (exit_price - entry_price) * size
                        exit_reason = "STOP LOSS"
                    elif tp_price is not None and high_price >= tp_price:
                        exit_triggered = True
                        exit_price = tp_price
                        exit_pnl = (exit_price - entry_price) * size
                        exit_reason = "TAKE PROFIT"
                elif direction == "SHORT":
                    if sl_price is not None and high_price >= sl_price:
                        exit_triggered = True
                        exit_price = sl_price
                        exit_pnl = (entry_price - exit_price) * size
                        exit_reason = "STOP LOSS"
                    elif tp_price is not None and low_price <= tp_price:
                        exit_triggered = True
                        exit_price = tp_price
                        exit_pnl = (entry_price - exit_price) * size
                        exit_reason = "TAKE PROFIT"

                if exit_triggered:
                    logger.info("[%s] Active trade exit condition detected (%s)! Price: %.2f, PnL: %.2f.", self.bot_id, exit_reason, exit_price, exit_pnl)
                    
                    if (
                        self.auto_execute
                        and not self.require_manual_approval
                        and self.execution_mode == "PAPER"
                        and str(getattr(config, "TRADING_MODE", "PAPER")).upper() == "PAPER"
                    ):
                        # The only autonomous path is the centralized paper
                        # adapter.  A broker failure must not become a local
                        # fabricated OPEN trade.
                        try:
                            from src.execution_service import order_execution_service

                            order_res = order_execution_service.route_order(
                                symbol=self.symbol,
                                direction=signal,
                                quantity=size,
                                price=close_price,
                                stop_loss=sl_price,
                                take_profit=tp_price,
                                bot_id=self.bot_id,
                                strategy=self.bot_name,
                                confidence_score=conf_pct,
                                mode="PAPER",
                                broker="PAPER",
                                client_order_id=f"{self.bot_id}:{self.symbol}:{candle_time}:{signal}",
                            )
                        except Exception as exc:
                            logger.error(
                                "[%s] Paper order gateway error; no trade was recorded: %s",
                                self.bot_id,
                                exc,
                                exc_info=True,
                            )
                            db.log_bot_activity(
                                self.bot_id,
                                "ORDER_REJECTED",
                                f"PAPER order gateway error: {exc}",
                                {"symbol": self.symbol, "signal": signal, "error": str(exc)},
                            )
                            context.decision = "ORDER_REJECTED"
                            return

                        if not order_res.get("success"):
                            reason = str(order_res.get("reason") or "Paper order rejected by execution gateway.")
                            logger.warning("[%s] Paper order rejected: %s", self.bot_id, reason)
                            db.log_bot_activity(
                                self.bot_id,
                                "ORDER_REJECTED",
                                f"PAPER order rejected: {reason}",
                                {"symbol": self.symbol, "signal": signal, "reason": reason},
                            )
                            context.decision = "ORDER_REJECTED"
                            return

                        order_id = str(order_res.get("order_id") or "")
                        trade_id = order_res.get("trade_id")
                        exec_price = float(order_res.get("fill_price") or 0.0)
                        if not order_id or trade_id is None or exec_price <= 0:
                            logger.error(
                                "[%s] Paper gateway returned incomplete fill; no local trade was created: %s",
                                self.bot_id,
                                order_res,
                            )
                            context.decision = "ORDER_REJECTED"
                            return

                        db.log_bot_activity(
                            self.bot_id,
                            "TRADE_ENTRY_AUTONOMOUS",
                            f"PAPER EXECUTED: Opened {signal} position (Trade #{trade_id}) at {exec_price:,.2f} "
                            f"(SL: {sl_price:,.2f}, TP: {tp_price:,.2f}, {conf_pct:.0f}% Confluence).",
                            {
                                "trade_id": trade_id,
                                "order_id": order_id,
                                "direction": signal,
                                "entry_price": exec_price,
                                "sl": sl_price,
                                "tp": tp_price,
                                "execution_mode": "PAPER",
                            },
                        )

                        self.telegram.send_message(
                            f"🧪 <b>[PAPER EXECUTED ENTRY]</b>\n"
                            f"• <b>Bot</b>: {self.bot_name} (<code>{self.bot_id}</code>)\n"
                            f"• <b>Symbol</b>: {self.symbol}\n"
                            f"• <b>Direction</b>: <b>{signal}</b>\n"
                            f"• <b>Entry Price</b>: {exec_price:,.2f}\n"
                            f"• <b>Stop Loss</b>: {sl_price:,.2f}\n"
                            f"• <b>Take Profit</b>: {tp_price:,.2f}\n"
                            f"• <b>Confluence</b>: {conf_pct:.0f}% (Threshold: {thresh_pct:.0f}%)\n"
                            f"• <b>Status</b>: PAPER / OPEN (Trade #{trade_id})"
                        )

                        context.signal = signal
                        context.decision = signal
                        logger.info(
                            "[%s] Paper order executed through centralized gateway (Trade #%s, %s at %.2f)",
                            self.bot_id,
                            trade_id,
                            signal,
                            exec_price,
                        )
                        return
                    else:
                        # Semi-Automated Mode: Queue for trader approval
                        pending_list = db.get_pending_signal_approvals(self.bot_id)
                        existing_pending = [p for p in pending_list if p.get("signal_type") == signal]
                        
                        if not existing_pending:
                            sig_id = db.create_pending_signal_approval(
                                bot_id=self.bot_id,
                                symbol=self.symbol,
                                signal_type=signal,
                                price=close_price,
                                confluence_pct=conf_pct,
                                threshold_pct=thresh_pct,
                                sl_price=sl_price,
                                tp_price=tp_price,
                                position_size=size,
                                strategy_details=conf_details,
                                timeframe=self.timeframe,
                                strategy=self.bot_name
                            )

                            curr_pos_dir = active_trade.get("direction", "FLAT") if active_trade else "FLAT"
                            curr_pos_entry = float(active_trade.get("entry_price", 0.0)) if active_trade else 0.0
                            
                            self.telegram.send_interactive_signal_alert(
                                signal_id=sig_id,
                                symbol=self.symbol,
                                signal_type=signal,
                                price=close_price,
                                confluence_pct=conf_pct,
                                threshold_pct=thresh_pct,
                                current_position=curr_pos_dir,
                                entry_price=curr_pos_entry
                            )
                            
                            db.log_bot_activity(
                                self.bot_id,
                                "SIGNAL_APPROVAL_WAITING",
                                f"🚨 TRADE SIGNAL GENERATED: Signal {signal} ({conf_pct:.0f}% confidence) created (ID: #{sig_id}). Waiting for user decision.",
                                {"signal_id": sig_id, "signal": signal, "confluence_pct": conf_pct}
                            )
                            logger.info("[%s] Signal %s generated (ID: %s). Waiting for manual user approval.", self.bot_id, signal, sig_id)
                        else:
                            logger.info("[%s] Signal %s active pending approval already exists (ID: %s).", self.bot_id, signal, existing_pending[0].get("id"))
                        
                        context.decision = "WAITING_APPROVAL"
                        return
                else:
                    logger.info("Signal evaluated: HOLD. Reason/Details: %s", reason)
                    if is_blocked:
                        self.telegram.send_message(
                            f"🚫 <b>SIGNAL BLOCKED</b>\n"
                            f"• <b>Reason</b>: {reason}"
                        )

        except Exception as exc:
            status = "ERROR"
            error_msg = f"System Error in runner execution cycle: {exc}"
            logger.error(error_msg, exc_info=True)
            stack_trace = traceback.format_exc()

            # Record deduplicated, fingerprinted incident in Error Ledger
            incident = self.error_ledger.record_incident(
                exc=exc,
                bot_id=self.bot_id,
                symbol=self.symbol,
                operation="runner_cycle",
                stack_trace=stack_trace,
            )

            # Check if this error is non-retryable (bad symbol, unsupported option, missing key)
            if not incident.get("is_retryable", 0):
                self.is_preflight_failed = True
                self.preflight_error = f"Fatal Non-Retryable Error: {exc}"
                logger.warning("[%s] Marked bot as non-retryable configuration error to prevent infinite error storm.", self.bot_id)

            db.log_bot_activity(self.bot_id, "ERROR", f"RUNNER ERROR: {exc}", {"error": str(exc), "incident_id": incident.get("id")})
            try:
                conn = db.get_connection()
                c = conn.cursor()
                bot_status_str = "CONFIG_ERROR" if not incident.get("is_retryable", 0) else "ERROR"
                c.execute("UPDATE bot_instances SET status = ? WHERE id = ?", (bot_status_str, self.bot_id))
                conn.commit()
                conn.close()
            except Exception:
                pass
            try:
                self.telegram.send_message(f"🚨 <b>SYSTEM INCIDENT</b> #{incident.get('id')}: {error_msg}")
            except Exception as tg_err:
                logger.error("Failed to send Telegram error alert: %s", tg_err)
        finally:
            try:
                self.retry_count = self.retry_count + 1 if status == "ERROR" else 0
                db.log_heartbeat(status, details={"signal": context.signal, "decision": context.decision, "balance": context.balance, "close_price": context.close_price})
                db.log_bot_status(status, exchange_status="CONNECTED", telegram_status="OK" if self.telegram.enabled else "DISABLED", database_status="OK", details={"signal": context.signal, "decision": context.decision})
                
                # Update authoritative Bot Instance Registry scan & heartbeat metrics
                try:
                    from src.indicators import get_timeframe_minutes
                    from datetime import timedelta
                    tf_mins = get_timeframe_minutes(self.timeframe)
                    now_dt = datetime.now(timezone.utc)
                    next_dt = now_dt + timedelta(minutes=tf_mins)
                    now_iso = now_dt.isoformat()
                    next_iso = next_dt.isoformat()

                    conn = db.get_connection()
                    c = conn.cursor()
                    c.execute("""
                        UPDATE bot_instances SET
                            last_heartbeat = ?,
                            last_scan_at = ?,
                            next_scan_at = ?,
                            scan_count = COALESCE(scan_count, 0) + 1,
                            current_signal = ?,
                            signal_confidence = ?,
                            required_confidence = 75.0,
                            open_position_count = ?,
                            status = CASE WHEN status IN ('ERROR', 'STOPPED', 'PAUSED') THEN status ELSE 'RUNNING' END
                        WHERE id = ?
                    """, (now_iso, now_iso, next_iso, context.signal, getattr(context, 'confidence', 0.0), 1 if context.open_trade else 0, self.bot_id))
                    conn.commit()
                    conn.close()
                except Exception as reg_err:
                    logger.warning("[%s] Failed to update bot_instances registry stats: %s", self.bot_id, reg_err)

                health = self.monitoring.collect_health_snapshot(balance=context.balance, equity=context.balance, current_position=0.0)
                db.log_daily_statistics({"total_trades": 0, "winning_trades": 0, "losing_trades": 0, "win_rate": 0.0, "daily_pnl": 0.0, "balance": context.balance, "equity": context.balance})
                if config.SEND_HEARTBEAT_MESSAGES and status != "ERROR":
                    self.telegram.send_message(
                        f"❤️ <b>BOT STATUS</b>\n"
                        f"• <b>Status</b>: {status}\n"
                        f"• <b>Exchange Connected</b>: {'YES' if self.testnet_fetcher.exchange else 'NO'}\n"
                        f"• <b>Current Price</b>: ${context.close_price:.2f}\n"
                        f"• <b>Balance</b>: ${context.balance:.2f} USDT\n"
                        f"• <b>Open Trades</b>: {'YES' if context.open_trade else 'NO'}\n"
                        f"• <b>Last Signal</b>: {context.signal}\n"
                        f"• <b>Database Status</b>: OK\n"
                        f"• <b>Internet Status</b>: {'CONNECTED' if health['internet_connected'] else 'OFFLINE'}\n"
                        f"• <b>Telegram Status</b>: {'OK' if self.telegram.enabled else 'DISABLED'}"
                    )
                logger.info("Logged heartbeat status: %s", status)
            except Exception as db_err:
                logger.error("Failed to log heartbeat in finally block: %s", db_err)

    def send_daily_summary(self):
        """
        Sends a daily status and execution summary via Telegram.
        """
        logger.info("Generating daily execution summary...")
        try:
            stats = db.get_daily_summary_stats()
            
            cycles_run = stats['cycles_run']
            errors_count = stats['errors_count']
            signals_fired = stats['signals_fired']
            
            # Format signals list
            signals_str = ""
            if signals_fired:
                signals_str = "\n".join([
                    f"• {s['timestamp'][:16]} - <b>{s['signal_type']}</b> at ${s['price']:.2f} (Reason: {s['reason'] or 'N/A'})"
                    for s in signals_fired
                ])
            else:
                signals_str = "None"
                
            summary_msg = (
                f"📊 <b>DAILY BOT SUMMARY (UTC)</b>\n"
                f"• <b>Status</b>: Active & Running\n"
                f"• <b>Timeframe</b>: {self.timeframe}\n"
                f"• <b>Total Cycles Run</b>: {cycles_run}\n"
                f"• <b>Errors Encountered</b>: {errors_count}\n"
                f"• <b>Signals Fired (excl. HOLD)</b>:\n{signals_str}"
            )
            
            self.telegram.send_message(summary_msg)
            logger.info("Daily summary sent successfully.")
        except Exception as e:
            logger.error(f"Failed to generate or send daily summary: {e}")

def pd_timestamp_to_str(ts_ms) -> str:
    """
    Converts milliseconds timestamp to ISO datetime string.
    """
    try:
        return datetime.fromtimestamp(ts_ms / 1000.0, timezone.utc).isoformat()
    except:
        return str(ts_ms)

def get_active_trade(bot_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Helper to fetch the current active open trade from SQLite.
    """
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
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error fetching active trade from DB: {e}")
        return None

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
    import os
    parser = argparse.ArgumentParser(description="BTC Trading Bot Live Runner")
    parser.add_argument("--bot_id", type=str, default="bot-1", help="Bot instance ID")
    args = parser.parse_args()

    # Single instance enforcement via PID lock
    pid = os.getpid()
    pid_file = config.BASE_DIR / "data" / f"bot_{args.bot_id}.pid"
    try:
        pid_file.parent.mkdir(parents=True, exist_ok=True)
        pid_file.write_text(str(pid))
    except Exception as pe:
        logger.warning(f"Could not write PID file {pid_file}: {pe}")


    logger.info("Initializing scheduled trading bot live runner for %s...", args.bot_id)
    runner = LiveRunner(bot_id=args.bot_id)
    
    # Startup Telegram notification
    startup_msg = (
        f"🚀 <b>{runner.bot_name} Started</b>\n"
        f"• <b>Symbol</b>: {runner.symbol}\n"
        f"• <b>Timeframe</b>: {runner.timeframe}\n"
        f"• <b>Status</b>: RUNNING"
    )
    try:
        runner.telegram.send_message(startup_msg)
    except Exception as e:
        logger.error(f"Failed to send startup Telegram alert: {e}")
    
    # Run once immediately on startup
    runner.process_cycle()

    # Calculate check interval in minutes from timeframe accurately
    mins = parse_timeframe_to_minutes(runner.timeframe)

    # Schedule blocking loop
    scheduler = BlockingScheduler()
    scheduler.add_job(
        runner.process_cycle,
        'interval',
        minutes=mins,
        id=f'market_check_job_{args.bot_id}'
    )
    
    logger.info(f"Bot {args.bot_id} scheduled to check every {mins} minutes.")
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
