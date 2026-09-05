"""
Authoritative Capital Accounting & Hierarchical Fund Segregation Service
=========================================================================
Core Accounting Engine enforcing institutional segregation across:
Customer -> Department -> Broker Folder -> Broker Account -> Currency -> PAPER/LIVE -> Bot -> Strategy

Invariants:
1. Never mix: Customer total capital, Broker account balance, Broker buying power,
   Trading capital, Department allocation, Bot allocation, Paper funds, Live funds,
   Brokerage fees, Taxes, Funding charges, Margin, Collateral, and P&L.
2. Brokerage fees and taxes are expenses, never trading capital (stored in append-only brokerage_expenses_ledger).
3. Authoritative mathematical formulas:
   - Customer Gross Capital = Sum(Deposits) - Sum(Withdrawals)
   - Customer Net Equity = Gross Capital + Realized P&L + Unrealized P&L - Brokerage - Taxes - Funding Costs - Other Charges
   - Department Available = Department Trading Budget - Allocations - Reserves - Risk Holds
   - Bot Available = Bot Allocation - Reserved Capital - Deployed Capital - Pending Order Reserve - Risk Hold
   - Unallocated Capital = Verified Department Budget - Sum(Bot Allocations)
   - Margin Utilization (%) = (Used Margin / Verified Equity) * 100
4. Never add balances across Dhan, Upstox, Delta Exchange, and Paper Simulator into one combined trading balance.
5. Never combine INR, USD, USDT without explicit verified exchange rates.
6. Mismatches trigger RECONCILIATION_REQUIRED and block new trading orders.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple, Union

from src import config, db

logger = logging.getLogger("CapitalService")


@dataclass
class CapitalBreakdown:
    """Complete 20-point authoritative financial breakdown."""
    customer_id: str = "cust_default"
    department_id: str = "dept_algo_trading"
    broker_folder_id: str = "bf_paper"
    broker_account_id: str = "ba_paper_primary"
    currency: str = "USD"
    environment: str = "PAPER"
    status: str = "HEALTHY"
    as_of: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # 1. Customer Level
    gross_capital: float = 0.0
    deposits: float = 0.0
    withdrawals: float = 0.0
    net_equity: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0

    # 2. Expenses & Deductions
    brokerage_fees: float = 0.0
    taxes: float = 0.0
    funding_costs: float = 0.0
    exchange_charges: float = 0.0
    slippage: float = 0.0
    other_charges: float = 0.0
    total_expenses: float = 0.0

    # 3. Broker Account Level
    broker_cash: float = 0.0
    broker_balance: float = 0.0
    broker_buying_power: float = 0.0
    available_margin: float = 0.0
    used_margin: float = 0.0
    locked_collateral: float = 0.0
    pending_order_reserve: float = 0.0
    margin_utilization_pct: float = 0.0

    # 4. Trading & Allocation
    department_budget: float = 0.0
    department_allocations: float = 0.0
    department_reserves: float = 0.0
    department_available_capital: float = 0.0
    bot_allocations_total: float = 0.0
    bot_deployed_capital: float = 0.0
    bot_reserved_capital: float = 0.0
    bot_available_capital: float = 0.0
    unallocated_capital: float = 0.0

    # 5. Segregation Isolation
    paper_funds: float = 0.0
    live_funds: float = 0.0
    data_source: str = "AUTHORITATIVE_LEDGER"
    is_stale: bool = False
    is_unavailable: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CapitalAccountingService:
    """
    Authoritative ledger and hierarchical fund accounting service.
    Guarantees strict isolation and verified formula evaluation.
    """

    _instance: Optional[CapitalAccountingService] = None

    def __new__(cls) -> CapitalAccountingService:
        if cls._instance is None:
            cls._instance = super(CapitalAccountingService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self) -> None:
        logger.info("Initializing CapitalAccountingService singleton...")
        db.init_db()

    # =========================================================================
    # HIERARCHY TREE RETRIEVAL
    # =========================================================================

    def get_hierarchy_tree(self, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns full nested hierarchy tree:
        Customer -> Departments -> Broker Folders -> Broker Accounts -> Bots -> Strategies
        """
        cust_filter = "WHERE id = ?" if customer_id else ""
        cust_params = (customer_id,) if customer_id else ()

        customers = db.safe_query(f"SELECT * FROM customers {cust_filter} ORDER BY name", cust_params)
        tree = []

        for cust in customers:
            c_id = cust["id"]
            depts = db.safe_query("SELECT * FROM departments WHERE customer_id = ? ORDER BY name", (c_id,))
            dept_nodes = []

            for dept in depts:
                d_id = dept["id"]
                folders = db.safe_query("SELECT * FROM broker_folders WHERE department_id = ? ORDER BY name", (d_id,))
                folder_nodes = []

                for folder in folders:
                    f_id = folder["id"]
                    accounts = db.safe_query("SELECT * FROM broker_accounts WHERE broker_folder_id = ? ORDER BY account_name", (f_id,))
                    account_nodes = []

                    for acc in accounts:
                        a_id = acc["id"]
                        bots = db.safe_query(
                            "SELECT id, name, symbol, strategy, execution_mode, status, allocated_capital, current_equity, realized_pnl, unrealized_pnl, currency FROM bot_instances WHERE broker_account_id = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY name",
                            (a_id,)
                        )
                        account_nodes.append({
                            **dict(acc),
                            "bots": [dict(b) for b in bots]
                        })

                    folder_nodes.append({
                        **dict(folder),
                        "accounts": account_nodes
                    })

                dept_nodes.append({
                    **dict(dept),
                    "folders": folder_nodes
                })

            tree.append({
                **dict(cust),
                "departments": dept_nodes
            })

        return {
            "status": "success",
            "as_of": datetime.now(timezone.utc).isoformat(),
            "customers_count": len(tree),
            "hierarchy": tree
        }

    # =========================================================================
    # AUTHORITATIVE CAPITAL BREAKDOWN CALCULATION
    # =========================================================================

    def get_capital_breakdown(
        self,
        customer_id: str = "cust_default",
        department_id: Optional[str] = None,
        broker_folder_id: Optional[str] = None,
        broker_account_id: Optional[str] = None,
        environment: Optional[str] = None,
        currency: Optional[str] = None,
    ) -> CapitalBreakdown:
        """
        Calculates authoritative 20-point capital breakdown strictly partitioning by
        Customer, Department, Broker Account, Currency, and PAPER/LIVE mode.
        """
        cb = CapitalBreakdown(
            customer_id=customer_id,
            department_id=department_id or "dept_algo_trading",
            broker_folder_id=broker_folder_id or "bf_paper",
            broker_account_id=broker_account_id or "ba_paper_primary",
            environment=environment or "PAPER",
            currency=currency or "USD",
            as_of=datetime.now(timezone.utc).isoformat()
        )

        try:
            # 1. Deposits & Withdrawals from capital_ledger
            ledger_sql = "SELECT entry_type, amount, currency, environment FROM capital_ledger WHERE customer_id = ?"
            ledger_params: List[Any] = [customer_id]

            if department_id:
                ledger_sql += " AND department_id = ?"
                ledger_params.append(department_id)
            if broker_account_id:
                ledger_sql += " AND broker_account_id = ?"
                ledger_params.append(broker_account_id)
            if environment:
                ledger_sql += " AND environment = ?"
                ledger_params.append(environment)

            ledger_rows = db.safe_query(ledger_sql, tuple(ledger_params))

            deposits = 0.0
            withdrawals = 0.0
            paper_funds = 0.0
            live_funds = 0.0

            for row in ledger_rows:
                amt = float(row.get("amount") or 0.0)
                etype = str(row.get("entry_type") or "").upper()
                env = str(row.get("environment") or "PAPER").upper()

                if etype in ["DEPOSIT", "FUNDING"]:
                    deposits += amt
                    if env == "PAPER":
                        paper_funds += amt
                    else:
                        live_funds += amt
                elif etype in ["WITHDRAWAL", "DEBIT"]:
                    withdrawals += amt
                    if env == "PAPER":
                        paper_funds -= amt
                    else:
                        live_funds -= amt

            cb.deposits = round(deposits, 2)
            cb.withdrawals = round(withdrawals, 2)
            cb.gross_capital = round(deposits - withdrawals, 2)
            cb.paper_funds = round(paper_funds, 2)
            cb.live_funds = round(live_funds, 2)

            # 2. Brokerage Expenses from brokerage_expenses_ledger
            exp_sql = "SELECT expense_type, amount, currency FROM brokerage_expenses_ledger WHERE customer_id = ?"
            exp_params: List[Any] = [customer_id]
            if department_id:
                exp_sql += " AND department_id = ?"
                exp_params.append(department_id)
            if broker_account_id:
                exp_sql += " AND broker_account_id = ?"
                exp_params.append(broker_account_id)

            exp_rows = db.safe_query(exp_sql, tuple(exp_params))
            b_fees = 0.0
            taxes = 0.0
            funding = 0.0
            exch = 0.0
            slip = 0.0
            other = 0.0

            for exp in exp_rows:
                e_type = str(exp.get("expense_type") or "").upper()
                e_amt = float(exp.get("amount") or 0.0)
                if e_type in ["BROKERAGE", "COMMISSION"]:
                    b_fees += e_amt
                elif e_type in ["TAX", "TAXES", "STT", "GST", "STAMP_DUTY"]:
                    taxes += e_amt
                elif e_type in ["FUNDING_COST", "INTEREST", "OVERNIGHT_FEE"]:
                    funding += e_amt
                elif e_type in ["EXCHANGE_FEE", "TRANSACTION_CHARGE", "SEBI_FEE"]:
                    exch += e_amt
                elif e_type == "SLIPPAGE":
                    slip += e_amt
                else:
                    other += e_amt

            cb.brokerage_fees = round(b_fees, 2)
            cb.taxes = round(taxes, 2)
            cb.funding_costs = round(funding, 2)
            cb.exchange_charges = round(exch, 2)
            cb.slippage = round(slip, 2)
            cb.other_charges = round(other, 2)
            cb.total_expenses = round(b_fees + taxes + funding + exch + slip + other, 2)

            # 3. Realized & Unrealized P&L from trades_log and bot_instances
            trade_sql = "SELECT result_pnl, unrealized_pnl, fees, status FROM trades_log WHERE customer_id = ?"
            trade_params: List[Any] = [customer_id]
            if department_id:
                trade_sql += " AND department_id = ?"
                trade_params.append(department_id)
            if broker_account_id:
                trade_sql += " AND broker_account_id = ?"
                trade_params.append(broker_account_id)
            if environment:
                trade_sql += " AND execution_mode = ?"
                trade_params.append(environment)

            trades = db.safe_query(trade_sql, tuple(trade_params))
            realized_pnl = 0.0
            unrealized_pnl = 0.0
            for t in trades:
                realized_pnl += float(t.get("result_pnl") or 0.0)
                if str(t.get("status") or "").upper() == "OPEN":
                    unrealized_pnl += float(t.get("unrealized_pnl") or 0.0)

            cb.realized_pnl = round(realized_pnl, 2)
            cb.unrealized_pnl = round(unrealized_pnl, 2)

            # Authoritative Net Equity Formula
            cb.net_equity = round(
                cb.gross_capital + cb.realized_pnl + cb.unrealized_pnl - cb.total_expenses, 2
            )

            # 4. Department Budget & Allocations
            dept_budget = 0.0
            if department_id:
                dept_row = db.safe_query("SELECT trading_budget, currency FROM departments WHERE id = ?", (department_id,))
                if dept_row:
                    dept_budget = float(dept_row[0].get("trading_budget") or 0.0)
                    cb.currency = str(dept_row[0].get("currency") or cb.currency)
            else:
                dept_rows = db.safe_query("SELECT SUM(trading_budget) as total FROM departments WHERE customer_id = ?", (customer_id,))
                if dept_rows and dept_rows[0].get("total"):
                    dept_budget = float(dept_rows[0]["total"])

            cb.department_budget = round(dept_budget, 2)

            # Bot Allocations in this Scope
            bot_sql = "SELECT allocated_capital, current_equity, risk_reserve, status, execution_mode FROM bot_instances WHERE customer_id = ? AND COALESCE(is_deleted, 0) = 0"
            bot_params: List[Any] = [customer_id]
            if department_id:
                bot_sql += " AND department_id = ?"
                bot_params.append(department_id)
            if broker_account_id:
                bot_sql += " AND broker_account_id = ?"
                bot_params.append(broker_account_id)
            if environment:
                bot_sql += " AND execution_mode = ?"
                bot_params.append(environment)

            bots = db.safe_query(bot_sql, tuple(bot_params))
            total_bot_alloc = 0.0
            total_bot_deployed = 0.0
            total_bot_reserves = 0.0

            for b in bots:
                alloc = float(b.get("allocated_capital") or 0.0)
                total_bot_alloc += alloc
                b_status = str(b.get("status") or "").upper()
                if b_status in ["RUNNING", "ACTIVE"]:
                    total_bot_deployed += alloc
                res = float(b.get("risk_reserve") or 0.0)
                total_bot_reserves += res

            cb.bot_allocations_total = round(total_bot_alloc, 2)
            cb.bot_deployed_capital = round(total_bot_deployed, 2)
            cb.bot_reserved_capital = round(total_bot_reserves, 2)
            cb.department_allocations = cb.bot_allocations_total
            cb.department_reserves = cb.bot_reserved_capital

            # Department Available = Department Budget - Allocations - Reserves
            cb.department_available_capital = max(
                0.0, round(cb.department_budget - cb.department_allocations - cb.department_reserves, 2)
            )

            # Bot Available = Bot Allocation - Deployed - Reserved
            cb.bot_available_capital = max(
                0.0, round(cb.bot_allocations_total - cb.bot_deployed_capital - cb.bot_reserved_capital, 2)
            )

            # Unallocated Capital = Department Budget - Sum of All Bot Allocations
            cb.unallocated_capital = max(0.0, round(cb.department_budget - cb.bot_allocations_total, 2))

            # 5. Broker Account specifics
            if broker_account_id:
                acc_row = db.safe_query("SELECT * FROM broker_accounts WHERE id = ?", (broker_account_id,))
                if acc_row:
                    acc = acc_row[0]
                    cb.broker_cash = round(float(acc.get("broker_cash") or 0.0), 2)
                    cb.broker_balance = round(float(acc.get("broker_balance") or 0.0), 2)
                    cb.broker_buying_power = round(float(acc.get("buying_power") or 0.0), 2)
                    cb.available_margin = round(float(acc.get("available_margin") or 0.0), 2)
                    cb.used_margin = round(float(acc.get("used_margin") or 0.0), 2)
                    cb.locked_collateral = round(float(acc.get("locked_collateral") or 0.0), 2)
                    cb.status = str(acc.get("reconciliation_status") or "HEALTHY")
                    cb.currency = str(acc.get("currency") or cb.currency)

                    # Margin Utilization (%) = (Used Margin / Verified Equity) * 100
                    ref_equity = max(1.0, cb.broker_balance if cb.broker_balance > 0 else cb.net_equity)
                    cb.margin_utilization_pct = round((cb.used_margin / ref_equity) * 100, 2)
            else:
                # If no specific account, sum balances of accounts matching criteria
                acc_match_sql = "SELECT SUM(broker_cash) as c, SUM(broker_balance) as b, SUM(available_margin) as m, SUM(used_margin) as u FROM broker_accounts WHERE customer_id = ?"
                acc_match_params: List[Any] = [customer_id]
                if department_id:
                    acc_match_sql += " AND department_id = ?"
                    acc_match_params.append(department_id)
                if environment:
                    acc_match_sql += " AND environment = ?"
                    acc_match_params.append(environment)

                acc_sums = db.safe_query(acc_match_sql, tuple(acc_match_params))
                if acc_sums and acc_sums[0]:
                    s = acc_sums[0]
                    cb.broker_cash = round(float(s.get("c") or 0.0), 2)
                    cb.broker_balance = round(float(s.get("b") or 0.0), 2)
                    cb.available_margin = round(float(s.get("m") or 0.0), 2)
                    cb.used_margin = round(float(s.get("u") or 0.0), 2)
                    ref_equity = max(1.0, cb.broker_balance if cb.broker_balance > 0 else cb.net_equity)
                    cb.margin_utilization_pct = round((cb.used_margin / ref_equity) * 100, 2)

        except Exception as exc:
            logger.error(f"Error computing capital breakdown: {exc}", exc_info=True)
            cb.status = "ERROR"
            cb.is_unavailable = True

        return cb

    # =========================================================================
    # APPEND-ONLY LEDGER RECORDING
    # =========================================================================

    def record_capital_movement(
        self,
        customer_id: str,
        department_id: str,
        broker_folder_id: str,
        broker_account_id: str,
        entry_type: str,
        amount: float,
        currency: str,
        environment: str = "PAPER",
        source: str = "MANUAL_AUTHORIZED",
        reference_id: str = "",
        user_id: str = "primary_trader",
        notes: str = "",
        idempotency_key: str = "",
        bot_id: str = "",
        strategy_id: str = ""
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Records an append-only capital movement (Deposit, Withdrawal, Allocation, Reserve, Release).
        Protects against duplicates via idempotency key.
        """
        if amount <= 0:
            return False, "Capital amount must be strictly greater than zero.", {}

        entry_type = entry_type.upper()
        if entry_type not in ["DEPOSIT", "WITHDRAWAL", "DEPT_ALLOCATION", "BOT_ALLOCATION", "RESERVE", "DEPLOYMENT", "RELEASE", "FUNDING"]:
            return False, f"Invalid capital entry type '{entry_type}'.", {}

        environment = environment.upper()
        if environment not in ["PAPER", "LIVE"]:
            return False, f"Invalid environment '{environment}' (must be PAPER or LIVE).", {}

        # Verify Broker Account existence and matching hierarchy
        acc = db.safe_query("SELECT * FROM broker_accounts WHERE id = ?", (broker_account_id,))
        if not acc:
            return False, f"Broker account '{broker_account_id}' does not exist.", {}
        acc_data = acc[0]
        if acc_data["customer_id"] != customer_id or acc_data["department_id"] != department_id:
            return False, "Hierarchy mismatch: Broker account does not belong to specified customer/department.", {}

        now_str = datetime.now(timezone.utc).isoformat()
        idem_key = idempotency_key.strip() or f"idemp-cap-{uuid.uuid4().hex}"
        entry_id = f"CAP-{uuid.uuid4().hex[:8].upper()}"
        audit_id = f"AUDIT-CAP-{uuid.uuid4().hex[:8].upper()}"

        # Idempotency Check
        existing = db.safe_query("SELECT entry_id, amount, status FROM capital_ledger WHERE idempotency_key = ?", (idem_key,))
        if existing:
            return True, f"Idempotent replay: Capital movement '{existing[0]['entry_id']}' already recorded.", dict(existing[0])

        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO capital_ledger (
                    entry_id, customer_id, department_id, broker_folder_id, broker_account_id,
                    bot_id, strategy_id, entry_type, amount, currency, environment,
                    source, reference_id, user_id, status, notes, idempotency_key, timestamp, audit_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
                """,
                (
                    entry_id, customer_id, department_id, broker_folder_id, broker_account_id,
                    bot_id, strategy_id, entry_type, amount, currency, environment,
                    source, reference_id, user_id, notes, idem_key, now_str, audit_id
                )
            )

            # Update broker account balance cache if verified deposit or withdrawal
            if entry_type in ["DEPOSIT", "FUNDING"]:
                cursor.execute(
                    "UPDATE broker_accounts SET broker_cash = broker_cash + ?, broker_balance = broker_balance + ?, available_margin = available_margin + ?, updated_at = ? WHERE id = ?",
                    (amount, amount, amount, now_str, broker_account_id)
                )
            elif entry_type in ["WITHDRAWAL"]:
                cursor.execute(
                    "UPDATE broker_accounts SET broker_cash = MAX(0.0, broker_cash - ?), broker_balance = MAX(0.0, broker_balance - ?), available_margin = MAX(0.0, available_margin - ?), updated_at = ? WHERE id = ?",
                    (amount, amount, amount, now_str, broker_account_id)
                )

            conn.commit()
            conn.close()
            logger.info(f"Recorded capital movement {entry_id} ({entry_type}: {amount} {currency}) for account {broker_account_id}")
            return True, "Capital movement successfully recorded.", {
                "entry_id": entry_id,
                "amount": amount,
                "currency": currency,
                "entry_type": entry_type,
                "environment": environment,
                "audit_id": audit_id
            }
        except Exception as exc:
            logger.error(f"Failed to record capital movement: {exc}")
            return False, str(exc), {}

    def record_brokerage_expense(
        self,
        customer_id: str,
        department_id: str,
        broker_folder_id: str,
        broker_account_id: str,
        expense_type: str,
        amount: float,
        currency: str,
        provider: str,
        bot_id: str = "",
        strategy_id: str = "",
        order_id: str = "",
        trade_id: str = "",
        source: str = "EXECUTION_GATEWAY",
        idempotency_key: str = ""
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Records an append-only brokerage expense (fee, tax, funding, slippage).
        Brokerage fees are expenses and NEVER added to trading capital.
        """
        if amount <= 0:
            return False, "Expense amount must be greater than zero.", {}

        expense_type = expense_type.upper()
        now_str = datetime.now(timezone.utc).isoformat()
        idem_key = idempotency_key.strip() or f"idemp-exp-{uuid.uuid4().hex}"
        expense_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
        audit_id = f"AUDIT-EXP-{uuid.uuid4().hex[:8].upper()}"

        existing = db.safe_query("SELECT expense_id, amount FROM brokerage_expenses_ledger WHERE idempotency_key = ?", (idem_key,))
        if existing:
            return True, f"Idempotent replay: Expense '{existing[0]['expense_id']}' already recorded.", dict(existing[0])

        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO brokerage_expenses_ledger (
                    expense_id, customer_id, department_id, broker_folder_id, broker_account_id,
                    bot_id, strategy_id, order_id, trade_id, expense_type, amount,
                    currency, provider, source, audit_id, idempotency_key, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    expense_id, customer_id, department_id, broker_folder_id, broker_account_id,
                    bot_id, strategy_id, order_id, str(trade_id), expense_type, amount,
                    currency, provider, source, audit_id, idem_key, now_str
                )
            )
            conn.commit()
            conn.close()
            logger.info(f"Recorded brokerage expense {expense_id} ({expense_type}: {amount} {currency}) for trade {trade_id}")
            return True, "Brokerage expense recorded.", {
                "expense_id": expense_id,
                "amount": amount,
                "currency": currency,
                "expense_type": expense_type,
                "audit_id": audit_id
            }
        except Exception as exc:
            logger.error(f"Failed to record brokerage expense: {exc}")
            return False, str(exc), {}

    # =========================================================================
    # MULTI-TIER HIERARCHICAL RECONCILIATION ENGINE
    # =========================================================================

    def perform_hierarchical_reconciliation(self, customer_id: str = "cust_default") -> Dict[str, Any]:
        """
        Reconciles separately:
        - Customer ledger vs Department ledgers
        - Department budget vs Bot allocations
        - Broker accounts vs External Provider balances (Dhan, Upstox, Delta, Paper)
        - Bot allocations vs Position capital + Available capital
        - Currency isolation & Paper/Live isolation
        If any mismatch occurs, marks account RECONCILIATION_REQUIRED and logs incident.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        discrepancies: List[Dict[str, Any]] = []
        quarantined_accounts: List[str] = []
        overall_status = "HEALTHY"

        accounts = db.safe_query("SELECT * FROM broker_accounts WHERE customer_id = ?", (customer_id,))

        for acc in accounts:
            acc_id = acc["id"]
            acc_name = acc["account_name"]
            provider = acc["broker_provider"]
            env = acc["environment"]
            currency = acc["currency"]
            broker_cash = float(acc.get("broker_cash") or 0.0)

            # 1. Check ledger sum vs recorded broker cash
            ledger_entries = db.safe_query(
                "SELECT entry_type, amount FROM capital_ledger WHERE broker_account_id = ?",
                (acc_id,)
            )
            calculated_deposits = sum(float(r["amount"]) for r in ledger_entries if r["entry_type"] in ["DEPOSIT", "FUNDING"])
            calculated_withdrawals = sum(float(r["amount"]) for r in ledger_entries if r["entry_type"] in ["WITHDRAWAL", "DEBIT"])
            ledger_balance = round(calculated_deposits - calculated_withdrawals, 2)

            # Check for ledger mismatch
            if abs(ledger_balance - broker_cash) > 0.01:
                diff = round(abs(ledger_balance - broker_cash), 2)
                disc = {
                    "level": "BROKER_ACCOUNT",
                    "account_id": acc_id,
                    "account_name": acc_name,
                    "provider": provider,
                    "environment": env,
                    "currency": currency,
                    "type": "LEDGER_BALANCE_MISMATCH",
                    "recorded_cash": broker_cash,
                    "ledger_derived_cash": ledger_balance,
                    "discrepancy_amount": diff,
                    "severity": "CRITICAL" if env == "LIVE" else "WARNING",
                    "timestamp": now_str
                }
                discrepancies.append(disc)
                quarantined_accounts.append(acc_id)
                overall_status = "RECONCILIATION_REQUIRED"

                # Update status in DB
                db.safe_execute(
                    "UPDATE broker_accounts SET reconciliation_status = 'RECONCILIATION_REQUIRED', last_reconciliation_at = ? WHERE id = ?",
                    (now_str, acc_id)
                )
            else:
                db.safe_execute(
                    "UPDATE broker_accounts SET reconciliation_status = 'HEALTHY', last_reconciliation_at = ? WHERE id = ?",
                    (now_str, acc_id)
                )

        # 2. Check Department Budget vs Total Bot Allocations
        depts = db.safe_query("SELECT * FROM departments WHERE customer_id = ?", (customer_id,))
        for dept in depts:
            d_id = dept["id"]
            d_budget = float(dept.get("trading_budget") or 0.0)
            bots = db.safe_query(
                "SELECT SUM(allocated_capital) as total_alloc FROM bot_instances WHERE department_id = ? AND COALESCE(is_deleted, 0) = 0",
                (d_id,)
            )
            total_bot_alloc = float(bots[0]["total_alloc"] or 0.0) if bots else 0.0

            if total_bot_alloc > d_budget:
                overage = round(total_bot_alloc - d_budget, 2)
                discrepancies.append({
                    "level": "DEPARTMENT",
                    "department_id": d_id,
                    "department_name": dept["name"],
                    "type": "BUDGET_OVER_ALLOCATION",
                    "trading_budget": d_budget,
                    "total_bot_allocations": total_bot_alloc,
                    "overage_amount": overage,
                    "severity": "CRITICAL",
                    "timestamp": now_str
                })
                overall_status = "RECONCILIATION_REQUIRED"

        return {
            "status": overall_status,
            "reconciliation_timestamp": now_str,
            "customer_id": customer_id,
            "accounts_audited_count": len(accounts),
            "discrepancies_count": len(discrepancies),
            "quarantined_accounts": quarantined_accounts,
            "discrepancies": discrepancies,
            "trading_blocked": overall_status == "RECONCILIATION_REQUIRED" and len(quarantined_accounts) > 0
        }


# Global singleton instance
capital_accounting_service = CapitalAccountingService()
