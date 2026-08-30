"""
Stock Corporate Actions Engine
==============================
Tracks stock splits, dividends, bonus issues, and trading halts.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class StockCorporateActionsEngine:
    """Manages corporate action adjustments and records."""

    SAMPLE_ACTIONS = {
        "RELIANCE": [
            {"type": "BONUS", "ratio": "1:1", "ex_date": "2024-10-28", "record_date": "2024-10-28", "description": "Bonus Issue 1:1"},
            {"type": "DIVIDEND", "amount": 10.0, "currency": "INR", "ex_date": "2024-08-19", "description": "Final Dividend ₹10/share"}
        ],
        "TCS": [
            {"type": "DIVIDEND", "amount": 28.0, "currency": "INR", "ex_date": "2024-07-20", "description": "Interim Dividend ₹28/share"}
        ],
        "AAPL": [
            {"type": "DIVIDEND", "amount": 0.25, "currency": "USD", "ex_date": "2024-08-09", "description": "Quarterly Cash Dividend $0.25"}
        ],
        "NVDA": [
            {"type": "SPLIT", "ratio": "10:1", "ex_date": "2024-06-10", "description": "Forward Stock Split 10 for 1"}
        ]
    }

    @classmethod
    def get_actions(cls, symbol: str) -> List[Dict[str, Any]]:
        return cls.SAMPLE_ACTIONS.get(symbol.upper(), [])


global_stock_corporate_actions_engine = StockCorporateActionsEngine()
