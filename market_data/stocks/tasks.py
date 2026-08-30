"""
Stock Background Tasks & Synchronization Jobs
==============================================
Manages scheduled background synchronization, periodic quote refreshes,
and precalculated technical metrics.
"""

import threading
import time
import logging
from market_data.stocks.discovery_engine import global_stock_discovery_engine
from market_data.stocks.repository import StockRepository

logger = logging.getLogger("StockTasks")


class StockBackgroundManager:
    """Manages scheduled background tasks for equities."""

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start_background_jobs(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="StockBackgroundSync")
        self._thread.start()
        logger.info("Stock Background Sync worker started.")

    def stop_background_jobs(self) -> None:
        self._running = False

    def _run_loop(self) -> None:
        while self._running:
            try:
                # Periodic sync (every 30 minutes)
                time.sleep(1800)
                if not self._running:
                    break
                logger.info("Executing scheduled stock catalog metadata refresh...")
                stocks = global_stock_discovery_engine.discover_all_stocks()
                for s in stocks:
                    StockRepository.upsert_instrument(s)
            except Exception as e:
                logger.warning(f"Stock background task notice: {e}")
                time.sleep(60)


global_stock_tasks = StockBackgroundManager()
