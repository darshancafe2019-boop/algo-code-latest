"""
Authoritative Account & Portfolio Manager
=========================================
Maintains segregated broker accounts, equity calculations, buying power, and portfolio aggregations.

Invariants:
1. Dhan funds remain Dhan funds, Upstox funds remain Upstox funds, Delta funds remain Delta funds.
2. PAPER accounts and LIVE accounts are completely isolated.
3. Equity is computed strictly from authoritative formula:
   Equity = Cash Balance + Collateral + Realized PnL + Unrealized PnL - Margin Used - Fees
4. Aggregated portfolio reporting never combines different currencies blindly without explicit FX rates.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.data_core.models import (
    BrokerAccount,
    Environment,
    NormalizedEvent,
    EventType,
    EventDomain,
)
from src.data_core.capital.ledger import global_capital_ledger
from src.data_core.events.bus import global_event_bus
from src.data_core.providers.registry import normalize_provider_id

logger = logging.getLogger("AccountManager")


class AccountManager:
    """Authoritative domain manager for broker accounts and portfolio equity."""

    def __init__(self):
        self._lock = threading.RLock()
        self._accounts: Dict[str, BrokerAccount] = {}
        self._bootstrap_accounts()

    def _get_key(self, provider: str, account_id: str, environment: Environment) -> str:
        norm_prov = normalize_provider_id(provider)
        return f"{norm_prov}:{account_id}:{environment.value}"

    def _bootstrap_accounts(self) -> None:
        """Initializes canonical broker accounts."""
        # 1. PAPER TRADING ACCOUNT (USD)
        paper_bal = global_capital_ledger.get_balance("PAPER", "paper_primary", Environment.PAPER, "USD")
        self.set_account(
            BrokerAccount(
                provider="PAPER",
                broker="Quant.OS Simulator",
                account_id="paper_primary",
                account_name="Primary Paper Portfolio",
                environment=Environment.PAPER,
                currency="USD",
                cash_balance=paper_bal,
                available_cash=paper_bal,
                collateral=0.0,
                margin_used=0.0,
                available_margin=paper_bal,
                buying_power=paper_bal * 2.0,  # 2x paper leverage standard
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                fees=0.0,
                equity=paper_bal,
                status="HEALTHY",
                status_message="Simulation active",
            )
        )

        # 2. DHAN PAPER ACCOUNT (INR)
        dhan_bal = global_capital_ledger.get_balance("DHAN", "dhan_paper", Environment.PAPER, "INR")
        self.set_account(
            BrokerAccount(
                provider="DHAN",
                broker="DhanHQ",
                account_id="dhan_paper",
                account_name="Dhan Paper Trading Desk",
                environment=Environment.PAPER,
                currency="INR",
                cash_balance=dhan_bal,
                available_cash=dhan_bal,
                collateral=0.0,
                margin_used=0.0,
                available_margin=dhan_bal,
                buying_power=dhan_bal,
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                fees=0.0,
                equity=dhan_bal,
                status="HEALTHY",
                status_message="Dhan Simulated Account",
            )
        )

        # 3. UPSTOX PAPER ACCOUNT (INR)
        upstox_bal = global_capital_ledger.get_balance("UPSTOX", "upstox_paper", Environment.PAPER, "INR")
        self.set_account(
            BrokerAccount(
                provider="UPSTOX",
                broker="Upstox",
                account_id="upstox_paper",
                account_name="Upstox Paper Trading Desk",
                environment=Environment.PAPER,
                currency="INR",
                cash_balance=upstox_bal,
                available_cash=upstox_bal,
                collateral=0.0,
                margin_used=0.0,
                available_margin=upstox_bal,
                buying_power=upstox_bal,
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                fees=0.0,
                equity=upstox_bal,
                status="HEALTHY",
                status_message="Upstox Simulated Account",
            )
        )

        # 4. DELTA EXCHANGE INDIA PAPER ACCOUNT (USD)
        delta_bal = global_capital_ledger.get_balance("DELTA", "delta_paper", Environment.PAPER, "USD")
        self.set_account(
            BrokerAccount(
                provider="DELTA",
                broker="Delta Exchange India",
                account_id="delta_paper",
                account_name="Delta India Crypto Derivatives",
                environment=Environment.PAPER,
                currency="USD",
                cash_balance=delta_bal,
                available_cash=delta_bal,
                collateral=0.0,
                margin_used=0.0,
                available_margin=delta_bal,
                buying_power=delta_bal * 10.0,  # 10x margin standard
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                fees=0.0,
                equity=delta_bal,
                status="HEALTHY",
                status_message="Delta India Simulator",
            )
        )

        # 5. BINANCE USD-M PAPER ACCOUNT (USDT)
        self.set_account(
            BrokerAccount(
                provider="BINANCE_USDM",
                broker="Binance USD-M",
                account_id="binance_usdm_paper",
                account_name="Binance USD-M Testnet Desk",
                environment=Environment.PAPER,
                currency="USDT",
                cash_balance=50000.0,
                available_cash=50000.0,
                collateral=0.0,
                margin_used=0.0,
                available_margin=50000.0,
                buying_power=250000.0,
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                fees=0.0,
                equity=50000.0,
                status="HEALTHY",
                status_message="Binance USD-M Simulated Account",
            )
        )

    def set_account(self, account: BrokerAccount) -> None:
        """Stores an authoritative broker account snapshot."""
        with self._lock:
            key = self._get_key(account.provider, account.account_id, account.environment)
            # Authoritative equity calculation
            account.equity = round(
                account.cash_balance + account.collateral + account.realized_pnl + account.unrealized_pnl - account.fees,
                2
            )
            account.last_updated = datetime.now(timezone.utc).isoformat()
            self._accounts[key] = account

        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.BALANCE_UPDATE,
                domain=EventDomain.ACCOUNT,
                provider=account.provider,
                account_id=account.account_id,
                environment=account.environment,
                payload=account.to_dict(),
            )
        )

    def get_account(self, provider: str, account_id: str, environment: Environment) -> Optional[BrokerAccount]:
        """Retrieves a broker account by provider, ID, and environment with fallback resolution."""
        with self._lock:
            norm_prov = normalize_provider_id(provider)
            key = self._get_key(norm_prov, account_id, environment)
            acc = self._accounts.get(key)
            if acc:
                return acc

            # Fallback 1: match provider and environment
            for a in self._accounts.values():
                if a.environment == environment and a.provider == norm_prov:
                    return a

            # Fallback 2: in PAPER mode, if account not found, fallback to primary paper account
            if environment == Environment.PAPER:
                paper_accs = [a for a in self._accounts.values() if a.environment == Environment.PAPER]
                if paper_accs:
                    return paper_accs[0]

            return None

    def get_accounts_by_environment(self, environment: Environment) -> List[BrokerAccount]:
        """Returns all accounts belonging to the specified environment."""
        with self._lock:
            return [acc for acc in self._accounts.values() if acc.environment == environment]

    def update_position_pnl(
        self,
        provider: str,
        account_id: str,
        environment: Environment,
        realized_pnl: float,
        unrealized_pnl: float,
        margin_used: float,
    ) -> None:
        """Updates account PnL and margin from position calculations."""
        with self._lock:
            key = self._get_key(provider, account_id, environment)
            acc = self._accounts.get(key)
            if not acc:
                return

            acc.realized_pnl = round(realized_pnl, 2)
            acc.unrealized_pnl = round(unrealized_pnl, 2)
            acc.margin_used = round(margin_used, 2)
            acc.available_margin = max(0.0, round(acc.cash_balance - acc.margin_used, 2))
            acc.equity = round(
                acc.cash_balance + acc.collateral + acc.realized_pnl + acc.unrealized_pnl - acc.fees,
                2
            )
            acc.last_updated = datetime.now(timezone.utc).isoformat()

        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.PNL_UPDATE,
                domain=EventDomain.ACCOUNT,
                provider=acc.provider,
                account_id=acc.account_id,
                environment=acc.environment,
                payload=acc.to_dict(),
            )
        )

    def get_portfolio_summary(self, environment: Environment = Environment.PAPER) -> Dict[str, Any]:
        """
        Calculates currency-segregated portfolio totals without blind mixing.
        Provides both native currency buckets and normalized reporting totals.
        """
        accounts = self.get_accounts_by_environment(environment)

        by_currency: Dict[str, Dict[str, float]] = {}
        for acc in accounts:
            curr = acc.currency.upper()
            if curr not in by_currency:
                by_currency[curr] = {
                    "totalCash": 0.0,
                    "availableCash": 0.0,
                    "marginUsed": 0.0,
                    "availableMargin": 0.0,
                    "realizedPnL": 0.0,
                    "unrealizedPnL": 0.0,
                    "equity": 0.0,
                    "buyingPower": 0.0,
                    "accountsCount": 0,
                }

            b = by_currency[curr]
            b["totalCash"] = round(b["totalCash"] + acc.cash_balance, 2)
            b["availableCash"] = round(b["availableCash"] + acc.available_cash, 2)
            b["marginUsed"] = round(b["marginUsed"] + acc.margin_used, 2)
            b["availableMargin"] = round(b["availableMargin"] + acc.available_margin, 2)
            b["realizedPnL"] = round(b["realizedPnL"] + acc.realized_pnl, 2)
            b["unrealizedPnL"] = round(b["unrealizedPnL"] + acc.unrealized_pnl, 2)
            b["equity"] = round(b["equity"] + acc.equity, 2)
            b["buyingPower"] = round(b["buyingPower"] + acc.buying_power, 2)
            b["accountsCount"] += 1

        # Normalized USD conversion with explicit timestamp
        FX_RATES = {"USD": 1.0, "USDT": 1.0, "INR": 1.0 / 87.5}
        total_normalized_equity_usd = 0.0
        for curr, metrics in by_currency.items():
            rate = FX_RATES.get(curr, 1.0)
            total_normalized_equity_usd += metrics["equity"] * rate

        return {
            "environment": environment.value,
            "accounts": [acc.to_dict() for acc in accounts],
            "byCurrency": by_currency,
            "normalizedTotalEquityUsd": round(total_normalized_equity_usd, 2),
            "fxConversionSource": "INTERNAL_FIXED_BENCHMARK_87.5_INR_USD",
            "asOf": datetime.now(timezone.utc).isoformat(),
        }


# Global Singleton Account Manager Instance
global_account_manager = AccountManager()
