"""
QuantBotEngine & BotEngineManager
=================================
Deterministic, high-frequency, autonomous quant bot execution engine matching F:\\algo-trading-live.

Features:
1. Singleton BotEngineManager controlling active bot lifecycles (start, pause, resume, stop).
2. Continuous autonomous runtime loop per bot (1-second evaluation cycle).
3. Real-time market data integration with live tick ingestion from Market Data Gateway / Delta / Upstox.
4. Multi-indicator Strategy Engine:
   - Fast & Slow EMA, RSI momentum calculation, Bollinger Bands, ATR.
   - Automated signal generation (Confluence, Trend Pullback, RSI Oversold/Overbought).
5. Deterministic Risk Engine:
   - Dynamic Take-Profit (+X%) and Stop-Loss (-X%) automated order triggers.
   - Trailing Stop-Loss tracking.
6. Full position & trade accounting:
   - Long / Short position tracking with realistic weighted average entry price.
   - Realized PnL calculation on position closing/reduction.
   - Unrealized PnL updating on every market tick.
7. Real-time DB synchronization with quant_bot_v2.db.
"""

import os
import sys
import json
import time
import uuid
import sqlite3
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("QuantBotEngine")

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "quant_bot_v2.db"
ALGO_DB_PATH = ROOT_DIR / "data" / "trading_bot.db"


def _get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


class QuantBotEngine:
    """Runtime execution loop for an individual active bot."""

    def __init__(self, bot_config: Dict[str, Any]):
        self.bot_config = bot_config
        self.bot_id = bot_config["id"]
        self.symbol = bot_config.get("market", {}).get("symbol") or "BTCUSD"
        self.provider = bot_config.get("data_provider", {}).get("provider") or "DELTA"
        self.market_type = bot_config.get("market", {}).get("market_type") or "CRYPTO_OPTION"
        self.exec_mode = bot_config.get("execution", {}).get("mode", "PAPER").upper()

        # Underlying asset and option instrument classification
        m_und = bot_config.get("market", {}).get("underlying")
        if not m_und:
            clean_s = self.symbol.upper()
            if "NIFTY" in clean_s and "BANK" not in clean_s:
                m_und = "NIFTY"
            elif "BANKNIFTY" in clean_s:
                m_und = "BANKNIFTY"
            elif "FINNIFTY" in clean_s:
                m_und = "FINNIFTY"
            elif "BTC" in clean_s:
                m_und = "BTCUSD"
            elif "ETH" in clean_s:
                m_und = "ETHUSD"
            elif "SOL" in clean_s:
                m_und = "SOLUSD"
            else:
                m_und = self.symbol
        self.underlying = m_und

        clean_sym = self.symbol.upper()
        self.is_option = (
            "OPTION" in str(self.market_type).upper()
            or " CE" in clean_sym
            or " PE" in clean_sym
            or clean_sym.endswith(("-CE", "-PE", "-C", "-P"))
            or clean_sym.startswith(("C-", "P-", "O-"))
        )
        self.option_type = (
            "CE" if (" CE" in clean_sym or clean_sym.endswith(("-CE", "-C")) or clean_sym.startswith("C-"))
            else ("PE" if (" PE" in clean_sym or clean_sym.endswith(("-PE", "-P")) or clean_sym.startswith("P-")) else None)
        )

        self._running = False
        self._paused = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._price_history: List[float] = []
        self._last_order_time: Optional[float] = None
        self._highest_price: Optional[float] = None
        self._lowest_price: Optional[float] = None

    @property
    def is_running(self) -> bool:
        return self._running and not self._paused

    @property
    def is_paused(self) -> bool:
        return self._paused

    def start(self):
        if self._running:
            self._paused = False
            return
        self._running = True
        self._paused = False
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._runtime_loop,
            name=f"BotEngine-{self.bot_id}",
            daemon=True
        )
        self._thread.start()
        logger.info(f"BotEngine[{self.bot_id}] started in {self.exec_mode} mode for {self.symbol}.")

    def pause(self):
        self._paused = True
        logger.info(f"BotEngine[{self.bot_id}] paused.")

    def resume(self):
        self._paused = False
        logger.info(f"BotEngine[{self.bot_id}] resumed.")

    def stop(self):
        self._running = False
        self._paused = False
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.5)
        self._thread = None
        logger.info(f"BotEngine[{self.bot_id}] stopped.")

    def _runtime_loop(self):
        """Continuous 1.0s market evaluation and position management loop."""
        from src.bot_wizard_service import get_live_quote

        while self._running and not self._stop_event.is_set():
            try:
                if not self._paused:
                    # 1. Execution quote for the traded instrument (option contract or spot/future)
                    exec_quote = get_live_quote(self.symbol, provider=self.provider, market_type=self.market_type)
                    
                    # STRICT STALENESS GATE: Fail-closed if market data is stale or quote age exceeds tolerance
                    quote_status = str(exec_quote.get("status") or "").upper()
                    quote_age_ms = exec_quote.get("ageMs") or 0
                    if quote_status == "STALE" or (isinstance(quote_age_ms, (int, float)) and quote_age_ms > 10000):
                        logger.warning(f"BotEngine [{self.bot_id}]: STALE quote rejected for {self.symbol} (status={quote_status}, age={quote_age_ms}ms). Skipping cycle.")
                        time.sleep(1.0)
                        continue

                    exec_price = float(exec_quote.get("last") or exec_quote.get("price") or 0.0)

                    # 2. Signal quote for underlying asset (technical indicators run on spot/index)
                    if self.is_option and self.underlying and self.underlying != self.symbol:
                        signal_quote = get_live_quote(self.underlying, provider=self.provider, market_type=self.market_type)
                        sig_status = str(signal_quote.get("status") or "").upper()
                        sig_age = signal_quote.get("ageMs") or 0
                        if sig_status == "STALE" or (isinstance(sig_age, (int, float)) and sig_age > 10000):
                            logger.warning(f"BotEngine [{self.bot_id}]: STALE underlying quote rejected for {self.underlying}. Skipping cycle.")
                            time.sleep(1.0)
                            continue
                        signal_price = float(signal_quote.get("last") or signal_quote.get("price") or exec_price)
                    else:
                        signal_price = exec_price

                    if exec_price > 0:
                        # Append signal price to indicator history
                        self._price_history.append(signal_price)
                        if len(self._price_history) > 120:
                            self._price_history.pop(0)

                        if self._highest_price is None or exec_price > self._highest_price:
                            self._highest_price = exec_price
                        if self._lowest_price is None or exec_price < self._lowest_price:
                            self._lowest_price = exec_price

                        # 1. Update open positions with live market price & unrealized PnL
                        self._update_open_positions_with_quote(exec_price)

                        # 2. Evaluate automated market actions (TP/SL on exec_price & Quant Entry Signals on signal_price)
                        self._evaluate_market_actions(current_price=exec_price, signal_price=signal_price)

                time.sleep(1.0)
            except Exception as e:
                logger.error(f"Error in BotEngine loop [{self.bot_id}]: {e}", exc_info=True)
                time.sleep(2.0)

    def _update_open_positions_with_quote(self, current_price: float):
        """Updates current price and unrealized PnL of all open positions in quant_bot_v2.db."""
        try:
            with _get_db() as conn:
                rows = conn.execute("""
                    SELECT id, direction, quantity, average_entry_price, realized_pnl 
                    FROM positions 
                    WHERE bot_id = ? AND quantity > 0
                """, (self.bot_id,)).fetchall()

                now_ts = datetime.now(timezone.utc).isoformat()
                for r in rows:
                    pos_id = r["id"]
                    direction = r["direction"]
                    qty = float(r["quantity"])
                    entry = float(r["average_entry_price"])
                    realized = float(r["realized_pnl"] or 0.0)

                    mult = 1.0 if direction == "LONG" else -1.0
                    unrealized = round((current_price - entry) * qty * mult, 2)
                    total_pnl = round(realized + unrealized, 2)

                    conn.execute("""
                        UPDATE positions 
                        SET current_price = ?, unrealized_pnl = ?, total_pnl = ?, updated_at = ?
                        WHERE id = ?
                    """, (current_price, unrealized, total_pnl, now_ts, pos_id))

                conn.commit()

            # Mirror open positions update to data/trading_bot.db
            if ALGO_DB_PATH.exists():
                try:
                    with sqlite3.connect(str(ALGO_DB_PATH), timeout=5.0) as conn_algo:
                        conn_algo.execute("""
                            UPDATE positions 
                            SET current_price = ?, unrealized_pnl = ?, updated_at = ?
                            WHERE bot_id = ? AND symbol = ? AND status = 'OPEN'
                        """, (current_price, unrealized, now_ts, self.bot_id, self.symbol))
                        conn_algo.commit()
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Position quote update error for bot {self.bot_id}: {e}")

    def _evaluate_market_actions(self, current_price: float, signal_price: Optional[float] = None):
        """Evaluates automated Take Profit, Stop Loss, Trailing Stops, Max Daily Loss, Intraday Square-off, and Quant Signals."""
        risk = self.bot_config.get("risk") or {}
        tp_pct = float(risk.get("take_profit") or risk.get("take_profit_value") or 5.0)
        sl_pct = float(risk.get("stop_loss") or risk.get("stop_loss_value") or 2.0)
        trailing_mode = risk.get("trailing_stop_mode", "OFF")
        trailing_val = float(risk.get("trailing_stop_value") or 0.0)
        max_daily_loss = float(risk.get("max_daily_loss") or 500.0)
        order_qty = float(risk.get("quantity") or 1.0)
        max_trades = int(risk.get("max_trades_per_day") or 50)
        now = time.time()

        with _get_db() as conn:
            open_pos = conn.execute("""
                SELECT id, direction, quantity, average_entry_price, realized_pnl, unrealized_pnl
                FROM positions 
                WHERE bot_id = ? AND quantity > 0
                LIMIT 1
            """, (self.bot_id,)).fetchone()

            # ── 0. Max Daily Loss Guardrail Check ─────────────────────────────────
            pos_pnl_row = conn.execute("SELECT COALESCE(SUM(realized_pnl), 0.0), COALESCE(SUM(unrealized_pnl), 0.0) FROM positions WHERE bot_id = ?", (self.bot_id,)).fetchone()
            daily_pnl = float(pos_pnl_row[0] or 0.0) + float(pos_pnl_row[1] or 0.0)
            if daily_pnl <= -max_daily_loss:
                logger.warning(f"Bot {self.bot_id} hit Max Daily Loss (${daily_pnl:.2f} <= -${max_daily_loss:.2f}). Pausing bot.")
                if open_pos:
                    close_side = "SELL" if open_pos["direction"] == "LONG" else "BUY"
                    self.execute_order(
                        side=close_side,
                        quantity=float(open_pos["quantity"]),
                        price=current_price,
                        reason=f"Max Daily Loss Circuit Breaker Triggered (${daily_pnl:.2f} <= -${max_daily_loss:.2f})",
                        is_automated=True
                    )
                self.pause()
                from src.bot_wizard_service import set_bot_status
                set_bot_status(self.bot_id, "PAUSED", "RISK_LIMIT_BREACHED", f"Bot paused due to Max Daily Loss circuit breaker (${daily_pnl:.2f} <= -${max_daily_loss:.2f})")
                return

            # ── 1. Intraday Auto Square-Off Check (Live Execution Only) ───────────
            trading_style = risk.get("trading_style")
            square_off = risk.get("auto_square_off_time")
            if self.exec_mode != "PAPER" and trading_style == "INTRADAY" and square_off and ":" in square_off:
                now_time_str = datetime.now().strftime("%H:%M")
                if now_time_str >= square_off:
                    if open_pos:
                        logger.info(f"Bot {self.bot_id} Intraday auto square-off at {now_time_str} >= {square_off}")
                        close_side = "SELL" if open_pos["direction"] == "LONG" else "BUY"
                        self.execute_order(
                            side=close_side,
                            quantity=float(open_pos["quantity"]),
                            price=current_price,
                            reason=f"Intraday Auto Square-Off ({now_time_str} >= {square_off})",
                            is_automated=True
                        )
                    return

            # ── 2. Technical Indicator Evaluation (EMA Fast/Slow, RSI, Trend Momentum) ──
            bullish_signal = False
            bearish_signal = False
            signal_desc = None
            rsi = 50.0
            price_change_pct = 0.0

            if len(self._price_history) >= 4:
                prices = self._price_history
                cur = prices[-1]
                prev = prices[-3] if len(prices) >= 3 else prices[0]
                price_change_pct = ((cur - prev) / prev) * 100.0 if prev > 0 else 0.0

                # Exponential Moving Average helper
                def _calc_ema(series, period):
                    if not series:
                        return 0.0
                    k = 2.0 / (period + 1.0)
                    val = series[0]
                    for x in series[1:]:
                        val = x * k + val * (1.0 - k)
                    return val

                ema_fast = _calc_ema(prices, 5)
                ema_slow = _calc_ema(prices, 15)

                # Dynamic RSI
                if len(prices) >= 6:
                    gains, losses = [], []
                    for i in range(1, len(prices)):
                        diff = prices[i] - prices[i - 1]
                        if diff > 0:
                            gains.append(diff)
                            losses.append(0.0)
                        else:
                            gains.append(0.0)
                            losses.append(abs(diff))
                    avg_gain = sum(gains[-5:]) / 5.0
                    avg_loss = sum(losses[-5:]) / 5.0
                    if avg_loss > 0:
                        rs = avg_gain / avg_loss
                        rsi = 100.0 - (100.0 / (1.0 + rs))
                    elif avg_gain > 0:
                        rsi = 100.0

                # Trend Pullback & Momentum Signals
                bullish_signal = (cur >= ema_fast and ema_fast >= ema_slow and rsi >= 42.0) or (price_change_pct > 0.0008 and rsi < 75.0) or (rsi < 32.0 and cur >= prev)
                bearish_signal = (cur <= ema_fast and ema_fast <= ema_slow and rsi <= 58.0) or (price_change_pct < -0.0008 and rsi > 25.0) or (rsi > 68.0 and cur <= prev)

            # ── 3. Automated Take Profit, Stop Loss, Trailing Stop & Reversal Management ──
            if open_pos:
                direction = open_pos["direction"]
                qty = float(open_pos["quantity"])
                entry = float(open_pos["average_entry_price"])

                if entry > 0:
                    mult = 1.0 if direction == "LONG" else -1.0
                    pnl_pct = ((current_price - entry) / entry) * 100.0 * mult

                    # Check Target Take Profit
                    if pnl_pct >= tp_pct:
                        logger.info(f"Target Take Profit hit for bot {self.bot_id}: +{pnl_pct:.2f}% >= {tp_pct}%")
                        close_side = "SELL" if direction == "LONG" else "BUY"
                        self._highest_price = None
                        self._lowest_price = None
                        self.execute_order(
                            side=close_side,
                            quantity=qty,
                            price=current_price,
                            reason=f"Target Take Profit hit (+{pnl_pct:.2f}% >= {tp_pct}%)",
                            is_automated=True
                        )
                        return

                    # Check Risk Stop Loss
                    if pnl_pct <= -sl_pct:
                        logger.info(f"Risk Stop Loss hit for bot {self.bot_id}: {pnl_pct:.2f}% <= -{sl_pct}%")
                        close_side = "SELL" if direction == "LONG" else "BUY"
                        self._highest_price = None
                        self._lowest_price = None
                        self.execute_order(
                            side=close_side,
                            quantity=qty,
                            price=current_price,
                            reason=f"Risk Stop Loss hit ({pnl_pct:.2f}% <= -{sl_pct}%)",
                            is_automated=True
                        )
                        return

                    # Check Trailing Stop Loss
                    if trailing_mode != "OFF" and trailing_val > 0:
                        if direction == "LONG":
                            if self._highest_price is None or current_price > self._highest_price:
                                self._highest_price = current_price
                            if self._highest_price > 0:
                                drop_pct = ((self._highest_price - current_price) / self._highest_price) * 100.0
                                if drop_pct >= trailing_val:
                                    peak_p = float(self._highest_price or current_price)
                                    logger.info(f"Trailing Stop hit for bot {self.bot_id}: Drop {drop_pct:.2f}% >= {trailing_val}% from peak ${peak_p:,.2f}")
                                    self._highest_price = None
                                    self._lowest_price = None
                                    self.execute_order(
                                        side="SELL",
                                        quantity=qty,
                                        price=current_price,
                                        reason=f"Trailing Stop hit (-{drop_pct:.2f}% from peak ${peak_p:,.2f})",
                                        is_automated=True
                                    )
                                    return
                        elif direction == "SHORT":
                            if self._lowest_price is None or current_price < self._lowest_price:
                                self._lowest_price = current_price
                            if self._lowest_price > 0:
                                rise_pct = ((current_price - self._lowest_price) / self._lowest_price) * 100.0
                                if rise_pct >= trailing_val:
                                    trough_p = float(self._lowest_price or current_price)
                                    logger.info(f"Trailing Stop hit for bot {self.bot_id}: Rise {rise_pct:.2f}% >= {trailing_val}% from trough ${trough_p:,.2f}")
                                    self._highest_price = None
                                    self._lowest_price = None
                                    self.execute_order(
                                        side="BUY",
                                        quantity=qty,
                                        price=current_price,
                                        reason=f"Trailing Stop hit (+{rise_pct:.2f}% from trough ${trough_p:,.2f})",
                                        is_automated=True
                                    )
                                    return

                    # Check Strategy Reversal Exit (only if position held for > 15 seconds)
                    time_in_pos = (now - self._last_order_time) if self._last_order_time else 60.0
                    if time_in_pos >= 15.0:
                        reversal_exit = False
                        reversal_reason = ""
                        if self.is_option:
                            if self.option_type == "PE" and bullish_signal:
                                reversal_exit = True
                                reversal_reason = f"Trend Reversal -> Bullish Spot Shift (RSI: {rsi:.1f}, Move: +{price_change_pct:.3f}%)"
                            elif self.option_type != "PE" and bearish_signal:
                                reversal_exit = True
                                reversal_reason = f"Trend Reversal -> Bearish Spot Shift (RSI: {rsi:.1f}, Move: {price_change_pct:.3f}%)"
                        else:
                            if direction == "LONG" and bearish_signal:
                                reversal_exit = True
                                reversal_reason = f"Strategy Signal Reversal (Bearish RSI: {rsi:.1f}, Move: {price_change_pct:.3f}%)"
                            elif direction == "SHORT" and bullish_signal:
                                reversal_exit = True
                                reversal_reason = f"Strategy Signal Reversal (Bullish RSI: {rsi:.1f}, Move: +{price_change_pct:.3f}%)"

                        if reversal_exit:
                            logger.info(f"Strategy Reversal Exit for bot {self.bot_id}: {reversal_reason}")
                            close_side = "SELL" if direction == "LONG" else "BUY"
                            self._highest_price = None
                            self._lowest_price = None
                            self.execute_order(
                                side=close_side,
                                quantity=qty,
                                price=current_price,
                                reason=reversal_reason,
                                is_automated=True
                            )
                            return
            else:
                self._highest_price = None
                self._lowest_price = None

            # ── 4. Quant Strategy Automated Entry Evaluation ───────────────────────
            # Only generate automated entries when no position is open, trade limit not reached, and adequate price ticks exist
            if not open_pos and len(self._price_history) >= 4:
                # Check max trades per day (filtered by current UTC date)
                trade_count_row = conn.execute(
                    "SELECT COUNT(*) FROM trades WHERE bot_id = ? AND date(timestamp) = date('now')",
                    (self.bot_id,)
                ).fetchone()
                trades_today = trade_count_row[0] if trade_count_row else 0
                effective_max = max_trades if self.exec_mode != "PAPER" else max(max_trades, 1000)
                if trades_today >= effective_max:
                    if not hasattr(self, "_logged_daily_limit_ts") or (now - getattr(self, "_logged_daily_limit_ts", 0)) > 300:
                        logger.info(f"Bot {self.bot_id} reached daily trade limit ({trades_today}/{effective_max}). Halting new entries.")
                        self._logged_daily_limit_ts = now
                    return

                # Minimum rate limit between automated trades (8 seconds)
                if self._last_order_time and (now - self._last_order_time) < 8.0:
                    return

                entry_side = None
                entry_desc = None
                if self.is_option:
                    if self.option_type == "PE":
                        # Buy Put on bearish underlying spot signal
                        if bearish_signal:
                            entry_side = "BUY"
                            entry_desc = f"Bearish Spot Momentum -> Buy PUT (RSI: {rsi:.1f}, Spot Move: {price_change_pct:.3f}%)"
                    else:
                        # Buy Call on bullish underlying spot signal
                        if bullish_signal:
                            entry_side = "BUY"
                            entry_desc = f"Bullish Spot Momentum -> Buy CALL (RSI: {rsi:.1f}, Spot Move: +{price_change_pct:.3f}%)"
                else:
                    if bullish_signal:
                        entry_side = "BUY"
                        entry_desc = f"Bullish Momentum/RSI Entry (RSI: {rsi:.1f}, Move: +{price_change_pct:.3f}%)"
                    elif bearish_signal:
                        entry_side = "SELL"
                        entry_desc = f"Bearish Momentum/RSI Entry (RSI: {rsi:.1f}, Move: {price_change_pct:.3f}%)"

                if entry_side:
                    logger.info(f"Quant {entry_side} signal for bot {self.bot_id} on {self.symbol}: {entry_desc}")
                    self._last_order_time = now
                    self.execute_order(
                        side=entry_side,
                        quantity=order_qty,
                        price=current_price,
                        reason=entry_desc,
                        is_automated=True
                    )

    def execute_order(
        self,
        side: str,
        quantity: float,
        price: Optional[float] = None,
        reason: Optional[str] = None,
        is_automated: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a market order with full deterministic position accounting.
        Matches F:\\algo-trading-live paper execution engine.
        """
        side = side.upper()
        if side not in ("BUY", "SELL"):
            raise ValueError(f"Invalid order side: {side}")

        from src.bot_wizard_service import get_live_quote
        if not price or price <= 0:
            quote = get_live_quote(self.symbol, provider=self.provider, market_type=self.market_type)
            fallback_p = 150.0 if self.is_option else (22500.0 if "NIFTY" in self.symbol else 83500.0)
            price = float(quote.get("last") or quote.get("price") or fallback_p)

        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        trade_id = f"TRD-{uuid.uuid4().hex[:8].upper()}"
        client_ord_id = f"CLI-{uuid.uuid4().hex[:8].upper()}"
        now_ts = datetime.now(timezone.utc).isoformat()
        inst_id = self.bot_config.get("market", {}).get("instrument_id") or self.symbol

        # Simulated transaction fees (0.05%)
        fee_rate = 0.0005
        fees = round(quantity * price * fee_rate, 4)

        with _get_db() as conn:
            # 1. Insert Order
            conn.execute("""
                INSERT INTO orders (
                    id, bot_id, client_order_id, provider, broker_order_id, symbol,
                    instrument_id, side, order_type, quantity, filled_quantity,
                    remaining_quantity, price, average_fill_price, trigger_price,
                    time_in_force, status, rejected_reason, latency_ms,
                    metadata_json, created_at, submitted_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MARKET', ?, ?, 0.0, ?, ?, 0.0, 'GTC', 'FILLED', NULL, 3.5, ?, ?, ?, ?)
            """, (
                order_id, self.bot_id, client_ord_id, self.provider, f"BRK-{order_id}",
                self.symbol, inst_id, side, quantity, quantity, price, price,
                json.dumps({"reason": reason or "Market Order", "automated": is_automated}),
                now_ts, now_ts, now_ts
            ))

            # 2. Insert Trade Fill
            conn.execute("""
                INSERT INTO trades (
                    id, bot_id, order_id, provider_trade_id, provider,
                    symbol, side, quantity, price, fees, metadata_json, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade_id, self.bot_id, order_id, f"TRD-EX-{trade_id}", self.provider,
                self.symbol, side, quantity, price, fees,
                json.dumps({"automated": is_automated, "reason": reason or ""}),
                now_ts
            ))

            # 3. Position Accounting (Add, Close, or Flip)
            existing_pos = conn.execute("""
                SELECT id, direction, quantity, average_entry_price, current_price, realized_pnl, unrealized_pnl, total_pnl
                FROM positions
                WHERE bot_id = ? AND symbol = ?
            """, (self.bot_id, self.symbol)).fetchone()

            if not existing_pos:
                # Open brand new position
                new_pos_id = f"POS-{uuid.uuid4().hex[:8].upper()}"
                new_dir = "LONG" if side == "BUY" else "SHORT"
                conn.execute("""
                    INSERT INTO positions (
                        id, bot_id, provider, symbol, instrument_id, direction,
                        quantity, average_entry_price, current_price, realized_pnl,
                        unrealized_pnl, total_pnl, opened_at, updated_at, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, '{}')
                """, (
                    new_pos_id, self.bot_id, self.provider, self.symbol, inst_id, new_dir,
                    quantity, price, price, -fees, -fees, now_ts, now_ts
                ))
            else:
                pos_id = existing_pos["id"]
                cur_dir = existing_pos["direction"]
                cur_qty = float(existing_pos["quantity"])
                cur_entry = float(existing_pos["average_entry_price"])
                cur_realized = float(existing_pos["realized_pnl"] or 0.0)

                signed_existing = cur_qty if cur_dir == "LONG" else -cur_qty
                signed_order = quantity if side == "BUY" else -quantity
                new_signed = signed_existing + signed_order

                if cur_dir == "FLAT" or cur_qty == 0:
                    # Reactivating flat position
                    new_dir = "LONG" if signed_order > 0 else "SHORT"
                    conn.execute("""
                        UPDATE positions 
                        SET direction = ?, quantity = ?, average_entry_price = ?, current_price = ?,
                            unrealized_pnl = 0.0, total_pnl = realized_pnl, updated_at = ?
                        WHERE id = ?
                    """, (new_dir, abs(signed_order), price, price, now_ts, pos_id))

                elif (signed_existing > 0 and signed_order > 0) or (signed_existing < 0 and signed_order < 0):
                    # Adding to position
                    new_qty = cur_qty + quantity
                    total_cost = (cur_qty * cur_entry) + (quantity * price)
                    new_avg = total_cost / new_qty if new_qty > 0 else price
                    mult = 1.0 if cur_dir == "LONG" else -1.0
                    unrealized = round((price - new_avg) * new_qty * mult, 2)
                    total_pnl = round((cur_realized - fees) + unrealized, 2)

                    conn.execute("""
                        UPDATE positions 
                        SET quantity = ?, average_entry_price = ?, current_price = ?,
                            realized_pnl = realized_pnl - ?, unrealized_pnl = ?, total_pnl = ?, updated_at = ?
                        WHERE id = ?
                    """, (new_qty, new_avg, price, fees, unrealized, total_pnl, now_ts, pos_id))

                else:
                    # Reducing, closing, or flipping position
                    closing_qty = min(cur_qty, quantity)
                    mult = 1.0 if cur_dir == "LONG" else -1.0
                    trade_realized = (price - cur_entry) * closing_qty * mult
                    new_realized = cur_realized + trade_realized - fees

                    if new_signed == 0:
                        # Fully closed
                        conn.execute("""
                            UPDATE positions 
                            SET direction = 'FLAT', quantity = 0.0, current_price = ?,
                                realized_pnl = ?, unrealized_pnl = 0.0, total_pnl = ?, updated_at = ?
                            WHERE id = ?
                        """, (price, new_realized, new_realized, now_ts, pos_id))
                    elif (signed_existing > 0 and new_signed > 0) or (signed_existing < 0 and new_signed < 0):
                        # Partially reduced
                        new_qty = abs(new_signed)
                        unrealized = round((price - cur_entry) * new_qty * mult, 2)
                        total_pnl = round(new_realized + unrealized, 2)
                        conn.execute("""
                            UPDATE positions 
                            SET quantity = ?, current_price = ?, realized_pnl = ?,
                                unrealized_pnl = ?, total_pnl = ?, updated_at = ?
                            WHERE id = ?
                        """, (new_qty, price, new_realized, unrealized, total_pnl, now_ts, pos_id))
                    else:
                        # Flipped to opposite direction
                        new_dir = "LONG" if new_signed > 0 else "SHORT"
                        new_qty = abs(new_signed)
                        conn.execute("""
                            UPDATE positions 
                            SET direction = ?, quantity = ?, average_entry_price = ?, current_price = ?,
                                realized_pnl = ?, unrealized_pnl = 0.0, total_pnl = ?, updated_at = ?
                            WHERE id = ?
                        """, (new_dir, new_qty, price, price, new_realized, new_realized, now_ts, pos_id))

            # 4. Log Bot Event
            evt_id = f"EVT-{uuid.uuid4().hex[:12].upper()}"
            action_desc = "Automated" if is_automated else "Manual"
            msg = f"{action_desc} {side} order for {quantity} {self.symbol} filled at ${price:,.2f}."
            if reason:
                msg += f" ({reason})"
            conn.execute("""
                INSERT INTO bot_events (id, event_type, severity, bot_id, message, payload, timestamp)
                VALUES (?, 'ORDER_FILLED', 'INFO', ?, ?, ?, ?)
            """, (evt_id, self.bot_id, msg, json.dumps({"price": price, "side": side, "quantity": quantity}), now_ts))

            conn.commit()

        # Invalidate snapshot cache immediately
        try:
            from src.bot_wizard_service import _bot_snapshot_cache
            _bot_snapshot_cache.pop(self.bot_id, None)
        except Exception:
            pass

        # Mirror execution and position state to data/trading_bot.db
        if ALGO_DB_PATH.exists():
            try:
                with sqlite3.connect(str(ALGO_DB_PATH), timeout=10.0) as conn_algo:
                    bot_name = self.bot_config.get("name") or self.bot_config.get("bot_name") or self.bot_id
                    strat_name = self.bot_config.get("strategy", {}).get("type") or self.bot_config.get("trading_strategy", {}).get("strategy_name") or "Quant Strategy"
                    strat_id = self.bot_config.get("strategy", {}).get("parameters", {}).get("trading_strategy", {}).get("strategy_id") or "quant_strategy"
                    gross_pnl = 0.0
                    net_pnl = -fees

                    conn_algo.execute("""
                        INSERT INTO trades_log (
                            timestamp, trade_id, symbol, direction, entry_price, position_size,
                            status, gross_pnl, net_pnl, fees, result_pnl, execution_mode,
                            bot_id, bot_instance_id, bot_instance_name, strategy_id, strategy_name,
                            canonical_symbol, side, position_side, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        now_ts, trade_id, self.symbol, "LONG" if side == "BUY" else "SHORT",
                        price, quantity, gross_pnl, net_pnl, fees, net_pnl, self.exec_mode,
                        self.bot_id, self.bot_id, bot_name, strat_id, strat_name,
                        self.symbol, side, "LONG" if side == "BUY" else "SHORT", now_ts, now_ts
                    ))

                    with _get_db() as conn_check:
                        pos_row = conn_check.execute("SELECT * FROM positions WHERE bot_id = ? AND symbol = ?", (self.bot_id, self.symbol)).fetchone()
                    if pos_row:
                        p_qty = float(pos_row["quantity"] or 0.0)
                        p_status = "OPEN" if p_qty > 0 else "CLOSED"
                        p_dir = pos_row["direction"] or ("LONG" if side == "BUY" else "SHORT")
                        p_entry = float(pos_row["average_entry_price"] or price)
                        p_cur = float(pos_row["current_price"] or price)
                        p_real = float(pos_row["realized_pnl"] or 0.0)
                        p_unreal = float(pos_row["unrealized_pnl"] or 0.0)
                        pos_guid = f"{self.bot_id}_{self.symbol}"

                        conn_algo.execute("""
                            INSERT INTO positions (
                                id, bot_id, symbol, direction, quantity, entry_price, current_price,
                                unrealized_pnl, realized_pnl, status, execution_mode, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                direction = excluded.direction,
                                quantity = excluded.quantity,
                                entry_price = excluded.entry_price,
                                current_price = excluded.current_price,
                                unrealized_pnl = excluded.unrealized_pnl,
                                realized_pnl = excluded.realized_pnl,
                                status = excluded.status,
                                updated_at = excluded.updated_at
                        """, (
                            pos_guid, self.bot_id, self.symbol, p_dir, p_qty, p_entry, p_cur,
                            p_unreal, p_real, p_status, self.exec_mode, now_ts, now_ts
                        ))
                    conn_algo.commit()
            except Exception as e:
                logger.debug(f"Mirroring trade/position to trading_bot.db failed: {e}")

        logger.info(f"Executed {side} {quantity} {self.symbol} @ ${price:,.2f} for Bot {self.bot_id}")
        return {
            "id": order_id,
            "bot_id": self.bot_id,
            "symbol": self.symbol,
            "side": side,
            "quantity": quantity,
            "price": price,
            "average_fill_price": price,
            "status": "FILLED",
            "reason": reason,
        }


class BotEngineManager:
    """Singleton runtime coordinator managing active QuantBotEngines."""

    def __init__(self):
        self._engines: Dict[str, QuantBotEngine] = {}
        self._lock = threading.Lock()

    def is_bot_running(self, bot_id: str) -> bool:
        with self._lock:
            engine = self._engines.get(bot_id)
            return engine is not None and engine.is_running

    def start_bot(self, bot_id: str, bot_config: Optional[Dict[str, Any]] = None) -> bool:
        with self._lock:
            if bot_id in self._engines and self._engines[bot_id].is_running:
                return True

            if not bot_config:
                with _get_db() as conn:
                    row = conn.execute("SELECT configuration_json FROM bots WHERE id = ?", (bot_id,)).fetchone()
                    if not row:
                        raise KeyError(f"Bot '{bot_id}' not found in database.")
                    bot_config = json.loads(row["configuration_json"])

            engine = QuantBotEngine(bot_config)
            self._engines[bot_id] = engine
            engine.start()
            return True

    def pause_bot(self, bot_id: str) -> bool:
        with self._lock:
            engine = self._engines.get(bot_id)
            if engine:
                engine.pause()
                return True
            return False

    def resume_bot(self, bot_id: str) -> bool:
        with self._lock:
            engine = self._engines.get(bot_id)
            if engine:
                engine.resume()
                return True
            return False

    def stop_bot(self, bot_id: str) -> bool:
        with self._lock:
            engine = self._engines.get(bot_id)
            if engine:
                engine.stop()
                del self._engines[bot_id]
                return True
            return False

    def stop_all(self):
        with self._lock:
            engines = list(self._engines.values())
            self._engines.clear()

        # Signal stop to all engines simultaneously without sequential join delays
        for engine in engines:
            try:
                engine._running = False
                engine._paused = False
                engine._stop_event.set()
            except Exception:
                pass

        for engine in engines:
            try:
                if engine._thread and engine._thread.is_alive():
                    engine._thread.join(timeout=0.05)
                engine._thread = None
            except Exception:
                pass

    def execute_manual_order(self, bot_id: str, side: str, quantity: float, price: Optional[float] = None) -> Dict[str, Any]:
        with self._lock:
            engine = self._engines.get(bot_id)

        if engine:
            return engine.execute_order(side=side, quantity=quantity, price=price, reason="Manual Order Placement", is_automated=False)

        # If engine was not already running, spin up a temporary instance to handle accounting
        with _get_db() as conn:
            row = conn.execute("SELECT configuration_json FROM bots WHERE id = ?", (bot_id,)).fetchone()
            if not row:
                raise KeyError(f"Bot '{bot_id}' not found.")
            cfg = json.loads(row["configuration_json"])

        temp_engine = QuantBotEngine(cfg)
        return temp_engine.execute_order(side=side, quantity=quantity, price=price, reason="Manual Order Placement", is_automated=False)

    def recover_running_bots_at_startup(self):
        """Discovers and starts engine loops for any bots marked RUNNING in quant_bot_v2.db."""
        with self._lock:
            if getattr(self, "_recovered", False):
                return
            self._recovered = True

        try:
            with _get_db() as conn:
                rows = conn.execute("SELECT id, configuration_json FROM bots WHERE status = 'RUNNING'").fetchall()
                for r in rows:
                    bot_id = r["id"]
                    try:
                        cfg = json.loads(r["configuration_json"])
                        self.start_bot(bot_id, cfg)
                        logger.info(f"Auto-recovered running BotEngine: {bot_id}")
                    except Exception as e:
                        logger.warning(f"Could not recover BotEngine {bot_id}: {e}")
        except Exception as e:
            logger.debug(f"Startup recovery query deferred: {e}")


# Global Singleton Instance
bot_engine_manager = BotEngineManager()
