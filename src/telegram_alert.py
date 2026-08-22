"""
Telegram Alert Adapter (Backward Compatible Bridge)
===================================================
Bridges legacy TelegramAlert instances to the high-performance, non-blocking
TelegramService singleton (global_telegram_service).
"""

import logging
from typing import Optional, Dict, Any, Tuple
from src.telegram_service import global_telegram_service, TelegramService

logger = logging.getLogger("TelegramAlert")


class TelegramAlert:
    """Send formatted notifications to Telegram while logging delivery attempts."""

    def __init__(self, token: Optional[str] = None, chat_id: Optional[str] = None) -> None:
        if token or chat_id:
            # Custom instance
            self.service = TelegramService(token=token, chat_id=chat_id)
        else:
            # Shared global singleton
            self.service = global_telegram_service

        self.token = self.service.token
        self.chat_id = self.service.chat_id
        self.enabled = self.service.enabled

    def send_message(self, text: str, parse_mode: str = "HTML") -> Tuple[bool, Dict[str, Any]]:
        """Send a formatted text message to Telegram via non-blocking prioritized queue."""
        return self.service.send_message(text=text, parse_mode=parse_mode)

    def send_interactive_signal_alert(
        self,
        signal_id: int,
        symbol: str,
        signal_type: str,
        price: float,
        confluence_pct: float,
        threshold_pct: float = 75.0,
        current_position: str = "FLAT",
        entry_price: float = 0.0,
        timeframe: str = "15m",
        bot_id: str = "bot-1",
    ) -> Tuple[bool, Dict[str, Any]]:
        """Send interactive signal approval message to Telegram with action buttons."""
        return self.service.send_interactive_signal_alert(
            signal_id=signal_id,
            symbol=symbol,
            signal_type=signal_type,
            price=price,
            confluence_pct=confluence_pct,
            threshold_pct=threshold_pct,
            current_position=current_position,
            entry_price=entry_price,
            timeframe=timeframe,
            bot_id=bot_id,
        )
