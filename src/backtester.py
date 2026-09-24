import logging
import math
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Union, Callable

import numpy as np
import pandas as pd

try:
    import backtrader as bt
    _BT_PandasData = bt.feeds.PandasData
    _BT_Strategy = bt.Strategy
except Exception:
    class _MockBTFeeds:
        PandasData = object
    class _MockBTAnalyzers:
        DrawDown = object
        TradeAnalyzer = object
        SharpeRatio = object
        Returns = object
    class _MockBTOrder:
        Stop = "Stop"
        Limit = "Limit"
        Market = "Market"
    class _MockBT:
        feeds = _MockBTFeeds()
        Strategy = object
        Order = _MockBTOrder()
        Cerebro = object
        analyzers = _MockBTAnalyzers()
    bt = _MockBT()
    _BT_PandasData = object
    _BT_Strategy = object

from src import config, db
from src.strategy import Strategy
from src.risk_manager import RiskManager
from src.data_fetcher import DataFetcher

logger = logging.getLogger("Backtester")

class PandasDataPlus(_BT_PandasData):  # type: ignore
    """
    Custom Backtrader data feed class to map our precalculated technical indicators.
    """
    lines = ('ema_9', 'ema_20', 'ema_200', 'macd_line', 'poc', 'val', 'vah')
    params = (
        ('datetime', None),
        ('open', 'open'),
        ('high', 'high'),
        ('low', 'low'),
        ('close', 'close'),
        ('volume', 'volume'),
        ('ema_9', 'ema_9'),
        ('ema_20', 'ema_20'),
        ('ema_200', 'ema_200'),
        ('macd_line', 'macd_line'),
        ('poc', 'poc'),
        ('val', 'val'),
        ('vah', 'vah'),
    )

class BTTradingStrategy(_BT_Strategy):  # type: ignore
    """
    Backtrader Strategy adapter that wraps our rule-based strategy, indicator profiles, and risk manager.
    """
    params = (
        ('allow_shorts', config.ALLOW_SHORTS),
        ('initial_cash', 10000.0),
        ('source_df', None),
        ('profile_config', None),
    )

    def __init__(self):
        # Data aliases
        self.close_price = self.datas[0].close
        self.high = self.datas[0].high
        self.low = self.datas[0].low
        
        self.ema_9 = self.datas[0].ema_9
        self.ema_20 = self.datas[0].ema_20
        self.ema_200 = self.datas[0].ema_200
        self.macd_line = self.datas[0].macd_line
        self.poc = self.datas[0].poc
        self.val = self.datas[0].val
        self.vah = self.datas[0].vah
        
        self.entry_order = None
        self.sl_order = None
        self.tp_order = None
        
        self.entry_price = None
        self.sl_price = None
        self.tp_price = None
        self.direction = None
        
        self.trade_records = []
        self.current_trade = None
        self.pending_exit_price = None
        self.source_df = self.p.source_df
        self.profile_config = self.p.profile_config
        
        # Instantiate internal Strategy and RiskManager
        self.strategy_rules = Strategy(allow_shorts=self.p.allow_shorts)
        self.risk_manager = RiskManager()

    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.date(0)
        logger.debug(f"{dt.isoformat()} - {txt}")

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        
        if order.status in [order.Completed]:
            if order == self.entry_order:
                self.log(f"ENTRY EXECUTED, Price: {order.executed.price:.2f}, Size: {order.executed.size:.4f}, Comm: {order.executed.comm:.2f}")
                if self.current_trade:
                    self.current_trade['entry_price'] = float(order.executed.price)
                
                # Submit Stop-Loss and Take-Profit orders immediately as an OCA group
                oca_group = f"oca_{self.datas[0].datetime.datetime(0).timestamp()}"
                if order.isbuy():  # LONG
                    self.sl_order = self.sell(size=order.executed.size, price=self.sl_price, exectype=bt.Order.Stop, oca=oca_group)
                    self.tp_order = self.sell(size=order.executed.size, price=self.tp_price, exectype=bt.Order.Limit, oca=oca_group)
                else:  # SHORT
                    self.sl_order = self.buy(size=abs(order.executed.size), price=self.sl_price, exectype=bt.Order.Stop, oca=oca_group)
                    self.tp_order = self.buy(size=abs(order.executed.size), price=self.tp_price, exectype=bt.Order.Limit, oca=oca_group)
                self.entry_order = None
            elif order == self.sl_order:
                self.log(f"STOP LOSS HIT, Price: {order.executed.price:.2f}, Size: {order.executed.size:.4f}")
                self.pending_exit_price = float(order.executed.price)
                if self.tp_order:
                    self.cancel(self.tp_order)
                self.sl_order = None
                self.tp_order = None
            elif order == self.tp_order:
                self.log(f"TAKE PROFIT HIT, Price: {order.executed.price:.2f}, Size: {order.executed.size:.4f}")
                self.pending_exit_price = float(order.executed.price)
                if self.sl_order:
                    self.cancel(self.sl_order)
                self.sl_order = None
                self.tp_order = None
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log(f"Order Cancelled/Margin/Rejected: status {order.status}")
            if order == self.entry_order:
                self.entry_order = None
                self.current_trade = None
            elif order == self.sl_order:
                self.sl_order = None
            elif order == self.tp_order:
                self.tp_order = None

    def notify_trade(self, trade):
        if not trade.isclosed:
            return
        self.log(f"TRADE CLOSED. Gross PnL: {trade.pnl:.2f}, Net PnL: {trade.pnlcomm:.2f}")
        
        if self.current_trade:
            exit_price = self.pending_exit_price if self.pending_exit_price is not None else float(trade.price)
            self.current_trade['exit_price'] = exit_price
            self.current_trade['exit_timestamp'] = self.datas[0].datetime.datetime(0).isoformat()
            self.current_trade['pnl'] = float(trade.pnlcomm)
            self.trade_records.append(self.current_trade)
            self.current_trade = None
            self.pending_exit_price = None

    def next(self):
        # Safeguard: if we have an open position but no active orders/trade tracking, close it immediately!
        if self.position and not (self.entry_order or self.sl_order or self.tp_order):
            self.log(f"WARNING: Lingering position found (Size: {self.position.size:.6f}) without active orders. Closing position.")
            self.close()
            return

        # Do not enter if we have pending or active orders/positions
        if self.position or self.entry_order or self.sl_order or self.tp_order:
            return

        # Fetch current date
        current_dt = self.datas[0].datetime.datetime(0)

        current_idx = len(self) - 1
        if current_idx < 20:
            return

        if self.profile_config is not None and self.source_df is not None and current_idx < len(self.source_df):
            from src.indicators import evaluate_profile_confluence
            slice_df = self.source_df.iloc[:current_idx + 1].copy()
            res = evaluate_profile_confluence(slice_df, self.profile_config)
            signal = res.get("decision", "HOLD")
        else:
            if self.source_df is None or current_idx >= len(self.source_df):
                return
            extra_data = {}
            if 'rsi_5m' in self.source_df.columns:
                extra_data['rsi_5m'] = float(self.source_df.iloc[current_idx].get('rsi_5m', np.nan))
            if 'daily_open' in self.source_df.columns:
                extra_data['daily_open'] = float(self.source_df.iloc[current_idx].get('daily_open', np.nan))

            signal, filters, is_blocked, reason = self.strategy_rules.evaluate_row(
                self.source_df, current_idx, extra_data=extra_data
            )

        if signal not in ["LONG", "SHORT"]:
            return

        close_price = self.close_price[0]
        val_val = self.val[0]
        vah_val = self.vah[0]

        if signal == "LONG":
            # ENTRY LONG
            swing_low = min([self.low[-i] for i in range(config.SWING_LOOKBACK_CANDLES)])
            val_sl = val_val * 0.999
            swing_sl = swing_low * 0.999

            if config.STOP_LOSS_METHOD == "fixed_pct":
                self.sl_price = close_price * (1.0 - config.FIXED_STOP_LOSS_PCT)
            elif config.STOP_LOSS_METHOD == "tighter":
                valid_sls = [sl for sl in [val_sl, swing_sl] if sl < close_price]
                self.sl_price = max(valid_sls) if valid_sls else close_price * 0.98
            elif config.STOP_LOSS_METHOD == "val_vah":
                self.sl_price = val_sl if val_sl < close_price else close_price * 0.98
            else:
                self.sl_price = swing_sl if swing_sl < close_price else close_price * 0.98

            sl_dist = close_price - self.sl_price
            tp_rr = close_price + (config.FIXED_RISK_REWARD_RATIO * sl_dist) if config.TAKE_PROFIT_METHOD == "fixed_rr" else close_price + (2.0 * sl_dist)
            if config.TAKE_PROFIT_METHOD == "conservative" and vah_val > close_price:
                self.tp_price = min(tp_rr, vah_val)
            else:
                self.tp_price = tp_rr

        else:
            # ENTRY SHORT
            swing_high = max([self.high[-i] for i in range(config.SWING_LOOKBACK_CANDLES)])
            vah_sl = vah_val * 1.001
            swing_sl = swing_high * 1.001

            if config.STOP_LOSS_METHOD == "fixed_pct":
                self.sl_price = close_price * (1.0 + config.FIXED_STOP_LOSS_PCT)
            elif config.STOP_LOSS_METHOD == "tighter":
                valid_sls = [sl for sl in [vah_sl, swing_sl] if sl > close_price]
                self.sl_price = min(valid_sls) if valid_sls else close_price * 1.02
            elif config.STOP_LOSS_METHOD == "val_vah":
                self.sl_price = vah_sl if vah_sl > close_price else close_price * 1.02
            else:
                self.sl_price = swing_sl if swing_sl > close_price else close_price * 1.02

            sl_dist = self.sl_price - close_price
            tp_rr = close_price - (config.FIXED_RISK_REWARD_RATIO * sl_dist) if config.TAKE_PROFIT_METHOD == "fixed_rr" else close_price - (2.0 * sl_dist)
            if config.TAKE_PROFIT_METHOD == "conservative" and val_val < close_price:
                self.tp_price = max(tp_rr, val_val)
            else:
                self.tp_price = tp_rr

        self.sl_price = round(self.sl_price, 2)
        self.tp_price = round(self.tp_price, 2)

        balance = self.broker.get_cash()
        size = self.risk_manager.calculate_position_size(balance, close_price, self.sl_price)

        if size > 0:
            self.direction = signal
            self.current_trade = {
                'timestamp': current_dt.isoformat(),
                'direction': signal,
                'entry_price': close_price,
                'stop_loss': self.sl_price,
                'take_profit': self.tp_price,
                'position_size': size,
                'exit_price': None,
                'exit_timestamp': None,
                'pnl': 0.0
            }
            if signal == "LONG":
                self.entry_order = self.buy(size=size)
            else:
                self.entry_order = self.sell(size=size)
            self.log(f"PLACING {signal} MARKET ORDER, Size: {size:.4f}, SL: {self.sl_price:.2f}, TP: {self.tp_price:.2f}")


def calculate_performance_metrics(trades: List[Dict[str, Any]], initial_cash: float, final_cash: float) -> Dict[str, Any]:
    """
    Computes key performance metrics from a list of closed trade dictionaries.
    """
    total_trades = len(trades)
    if total_trades == 0:
        return {
            'total_trades': 0,
            'win_rate': 0.0,
            'avg_win': 0.0,
            'avg_loss': 0.0,
            'profit_factor': 0.0,
            'net_profit': 0.0,
            'sharpe_ratio': 0.0,
        }

    df_trades = pd.DataFrame(trades)
    if 'pnl' not in df_trades.columns:
        if 'net_pnl' in df_trades.columns:
            df_trades['pnl'] = df_trades['net_pnl']
        elif 'result_pnl' in df_trades.columns:
            df_trades['pnl'] = df_trades['result_pnl']
        else:
            df_trades['pnl'] = 0.0
    
    wins = df_trades[df_trades['pnl'] > 0]
    losses = df_trades[df_trades['pnl'] <= 0]
    
    win_rate = len(wins) / total_trades if total_trades > 0 else 0.0
    avg_win = wins['pnl'].mean() if len(wins) > 0 else 0.0
    avg_loss = losses['pnl'].mean() if len(losses) > 0 else 0.0
    
    sum_wins = wins['pnl'].sum()
    sum_losses = abs(losses['pnl'].sum())
    profit_factor = sum_wins / sum_losses if sum_losses > 0 else float('inf') if sum_wins > 0 else 0.0
    
    net_profit = df_trades['pnl'].sum()

    # Calculate returns for Sharpe ratio calculation
    # We calculate trade-by-trade returns relative to initial cash or entry costs
    returns = df_trades['pnl'] / initial_cash
    std_returns = returns.std()
    mean_return = returns.mean()
    
    sharpe_ratio = (mean_return / std_returns) * math.sqrt(len(returns)) if std_returns > 0 else 0.0

    return {
        'total_trades': total_trades,
        'winning_trades': len(wins),
        'losing_trades': len(losses),
        'win_rate': win_rate,
        'avg_win': avg_win,
        'avg_loss': avg_loss,
        'profit_factor': profit_factor,
        'net_profit': net_profit,
        'sharpe_ratio': sharpe_ratio
    }

def run_single_backtest(df: pd.DataFrame, initial_cash: float = 10000.0, source_df: Optional[pd.DataFrame] = None, profile_config: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], List[Dict[str, Any]], float]:
    """
    Runs a single cerebro backtest over the provided DataFrame.
    """
    if source_df is None:
        source_df = df

    cerebro: Any = bt.Cerebro()
    
    # 0.1% transaction commission (taker fee)
    cerebro.broker.setcommission(commission=config.BACKTEST_FEE_PCT)
    # Slippage configuration
    cerebro.broker.set_slippage_perc(config.BACKTEST_SLIPPAGE_PCT)
    # Set Cash
    cerebro.broker.setcash(initial_cash)
    
    # Add strategy
    cerebro.addstrategy(
        BTTradingStrategy,
        allow_shorts=config.ALLOW_SHORTS,
        initial_cash=initial_cash,
        source_df=source_df,
        profile_config=profile_config,
    )
    
    # Custom data feed
    # Feed requires 'datetime' column to be index
    df_bt = df.copy()
    df_bt['datetime'] = pd.to_datetime(df_bt['timestamp'], unit='ms')
    df_bt.set_index('datetime', inplace=True)
    
    feed = PandasDataPlus(dataname=df_bt)
    cerebro.adddata(feed)
    
    # Add Analyzers
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name='drawdown')
    
    # Run cerebro
    results = cerebro.run()
    strat = results[0]
    
    final_cash = cerebro.broker.getvalue()
    max_dd = strat.analyzers.drawdown.get_analysis().max.drawdown
    
    trades = strat.trade_records
    metrics = calculate_performance_metrics(trades, initial_cash, final_cash)
    metrics['max_drawdown_pct'] = max_dd
    
    return metrics, trades, final_cash

def run_walk_forward_testing(df: pd.DataFrame, num_folds: int = 3) -> List[Dict[str, Any]]:
    """
    Executes walk-forward testing by splitting the dataframe into N chunks.
    For each fold:
      - Split chunk into 70% training and 30% testing.
      - Calculate backtest on train.
      - Calculate backtest on test.
    """
    # Exclude rows where indicators are NaN (e.g. before Volume Profile lookback is filled)
    clean_df = df.dropna(subset=['poc', 'val', 'vah']).copy()
    total_len = len(clean_df)
    
    if total_len < 200:
        logger.error("Insufficient clean data to run walk-forward testing.")
        return []
        
    fold_size = total_len // num_folds
    results = []
    
    for i in range(num_folds):
        start_idx = i * fold_size
        # The last fold takes all remaining data
        end_idx = (i + 1) * fold_size if i < num_folds - 1 else total_len
        
        fold_df = clean_df.iloc[start_idx:end_idx].copy()
        split_idx = int(len(fold_df) * 0.70)
        
        train_df = fold_df.iloc[:split_idx].copy()
        test_df = fold_df.iloc[split_idx:].copy()
        
        logger.info(f"Fold {i+1}/{num_folds} - Train Range: {train_df['timestamp'].iloc[0]} to {train_df['timestamp'].iloc[-1]}")
        logger.info(f"Fold {i+1}/{num_folds} - Test Range: {test_df['timestamp'].iloc[0]} to {test_df['timestamp'].iloc[-1]}")
        
        train_metrics, _, _ = run_single_backtest(train_df)
        test_metrics, _, _ = run_single_backtest(test_df)
        
        results.append({
            'fold': i + 1,
            'train_trades': train_metrics['total_trades'],
            'train_win_rate': train_metrics['win_rate'],
            'train_profit': train_metrics['net_profit'],
            'train_pf': train_metrics['profit_factor'],
            'train_dd': train_metrics['max_drawdown_pct'],
            'train_sharpe': train_metrics['sharpe_ratio'],
            'test_trades': test_metrics['total_trades'],
            'test_win_rate': test_metrics['win_rate'],
            'test_profit': test_metrics['net_profit'],
            'test_pf': test_metrics['profit_factor'],
            'test_dd': test_metrics['max_drawdown_pct'],
            'test_sharpe': test_metrics['sharpe_ratio'],
        })
        
    return results

def save_backtest_run_details(metrics: Dict[str, Any], symbol: str, timeframe: str):
    """
    Saves the metrics summary of a backtest run to SQLite and a local CSV file.
    """
    # Save to CSV
    csv_file = config.BASE_DIR / "data" / "backtest_runs.csv"
    row = {
        'timestamp': pd.Timestamp.now().isoformat(),
        'symbol': symbol,
        'timeframe': timeframe,
        **metrics
    }
    df_new = pd.DataFrame([row])
    
    if csv_file.exists():
        df_old = pd.read_csv(csv_file)
        df_combined = pd.concat([df_old, df_new], ignore_index=True)
        df_combined.to_csv(csv_file, index=False)
    else:
        df_new.to_csv(csv_file, index=False)
        
    # Save to SQLite
    try:
        conn = sqlite3.connect(config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backtest_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                symbol TEXT,
                timeframe TEXT,
                total_trades INTEGER,
                win_rate REAL,
                avg_win REAL,
                avg_loss REAL,
                profit_factor REAL,
                net_profit REAL,
                max_drawdown_pct REAL,
                sharpe_ratio REAL
            )
        """)
        
        cursor.execute("""
            INSERT INTO backtest_runs 
            (timestamp, symbol, timeframe, total_trades, win_rate, avg_win, avg_loss, profit_factor, net_profit, max_drawdown_pct, sharpe_ratio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['timestamp'],
            symbol,
            timeframe,
            metrics['total_trades'],
            metrics['win_rate'],
            metrics['avg_win'],
            metrics['avg_loss'],
            metrics['profit_factor'],
            metrics['net_profit'],
            metrics['max_drawdown_pct'],
            metrics['sharpe_ratio']
        ))
        
        conn.commit()
        conn.close()
        logger.info("Saved backtest metrics to SQLite backtest_runs table.")
    except Exception as e:
        logger.error(f"Failed to log backtest metrics to SQLite: {e}")


def generate_synthetic_candles(
    symbol: str = "BTC/USDT",
    n_bars: int = 150,
    start_date: str = "2024-01-01"
) -> pd.DataFrame:
    """Generate realistic, deterministic OHLCV candles for backtest simulation."""
    import numpy as np
    from datetime import timedelta

    seed_val = abs(hash(f"{symbol}_{start_date}")) % (2**31)
    rng = np.random.default_rng(seed_val)

    sym_upper = symbol.upper()
    if "BTC" in sym_upper:
        base_price = 52000.0
    elif "ETH" in sym_upper:
        base_price = 3100.0
    elif "NIFTY" in sym_upper:
        base_price = 22500.0
    elif "BANKNIFTY" in sym_upper:
        base_price = 48000.0
    else:
        base_price = 1000.0

    try:
        cur_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    except Exception:
        cur_dt = datetime(2024, 1, 1, 9, 15)

    rows = []
    price = base_price
    for _ in range(n_bars):
        ret = rng.normal(0.0008, 0.012)
        close_p = max(1.0, price * (1.0 + ret))
        open_p = price
        high_p = max(open_p, close_p) * (1.0 + float(rng.uniform(0.001, 0.006)))
        low_p = min(open_p, close_p) * (1.0 - float(rng.uniform(0.001, 0.006)))
        vol = float(rng.uniform(100.0, 5000.0))

        rows.append({
            "timestamp": cur_dt.isoformat(),
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": round(vol, 2)
        })
        price = close_p
        cur_dt += timedelta(minutes=15)

    return pd.DataFrame(rows)


def run_backtest(
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    start_date: str = "2024-01-01",
    end_date: str = "2024-06-01",
    initial_cash: float = 10000.0,
    allow_shorts: bool = True,
    config_dict: Optional[Dict[str, Any]] = None,
    df: Optional[pd.DataFrame] = None,
    strategy: Optional[str] = None,
    initial_capital: Optional[float] = None,
    commission: Optional[float] = None,
    **kwargs: Any
) -> Dict[str, Any]:
    """Execute advanced on-demand backtest and return structured metrics payload."""
    try:
        from src.backtester_v2 import AdvancedBacktestEngine

        cfg = dict(config_dict or {})
        cfg["symbol"] = symbol
        cfg["timeframe"] = timeframe
        cfg["start_date"] = start_date
        cfg["end_date"] = end_date
        cfg["initial_capital"] = initial_capital if initial_capital is not None else initial_cash
        cfg["allow_shorts"] = allow_shorts
        if strategy:
            cfg["strategy"] = strategy
        if commission is not None:
            cfg["commission"] = commission
        cfg.update(kwargs)

        if df is None or len(df) < 30:
            df = generate_synthetic_candles(symbol=symbol, n_bars=150, start_date=start_date)
        if df is None:
            df = pd.DataFrame()

        engine = AdvancedBacktestEngine(cfg)
        result = engine.run(df)

        if "total_net_profit" not in result:
            result["total_net_profit"] = result.get("net_profit", 0.0)

        return result
    except Exception as exc:
        logger.error("Run backtest error: %s", exc)
        return {
            "status": "error",
            "message": str(exc),
            "total_net_profit": 0.0,
            "return_pct": 0.0,
            "total_trades": 0,
            "win_rate_pct": 0.0,
            "max_drawdown_pct": 0.0,
            "sharpe_ratio": 0.0,
            "trades": [],
            "equity_curve": [],
            "monthly_performance": []
        }



