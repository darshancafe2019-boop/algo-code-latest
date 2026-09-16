"""
Database Schema Initializer for Trading Orchestrator
===================================================
Creates all persistent tables and indexes required for durable workflows,
scheduled checkpoints, AI proposals, risk evaluations, journals, and distributed locks.
"""

from src import db


def init_orchestrator_tables() -> None:
    """Creates SQLite/PostgreSQL schema for orchestrator if not already present."""
    # 1. Checkpoint configurations
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_checkpoints (
            checkpoint_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
            is_enabled INTEGER NOT NULL DEFAULT 1,
            last_run TEXT,
            next_run TEXT,
            last_status TEXT DEFAULT 'IDLE',
            last_duration_sec REAL DEFAULT 0.0,
            last_result_summary TEXT DEFAULT '',
            updated_at TEXT
        )
        """
    )

    # 2. Workflow runs
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_workflow_runs (
            run_id TEXT PRIMARY KEY,
            session_id TEXT DEFAULT '',
            routine_id TEXT DEFAULT '',
            strategy_id TEXT DEFAULT '',
            broker TEXT DEFAULT 'PAPER',
            broker_account_id TEXT DEFAULT 'DEFAULT',
            market_data_source TEXT DEFAULT 'AUTO',
            mode TEXT DEFAULT 'PAPER',
            checkpoint_id TEXT NOT NULL,
            checkpoint_name TEXT NOT NULL,
            trigger_type TEXT NOT NULL DEFAULT 'SCHEDULED',
            status TEXT NOT NULL DEFAULT 'IDLE',
            state_history_json TEXT DEFAULT '[]',
            decisions_count INTEGER DEFAULT 0,
            orders_count INTEGER DEFAULT 0,
            started_at TEXT NOT NULL,
            scheduled_at TEXT,
            finished_at TEXT,
            completed_at TEXT,
            duration_sec REAL DEFAULT 0.0,
            error_code TEXT DEFAULT '',
            error_message TEXT DEFAULT '',
            request_id TEXT DEFAULT '',
            data_freshness_timestamp TEXT DEFAULT '',
            model_provider_version TEXT DEFAULT 'QuantOS-AI-v2',
            audit_event_json TEXT DEFAULT '{}'
        )
        """
    )

    # 3. AI Decisions & Proposals
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_decisions (
            decision_id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            checkpoint_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            symbol TEXT NOT NULL,
            instrument_id TEXT DEFAULT '',
            exchange TEXT NOT NULL DEFAULT 'NSE',
            provider TEXT NOT NULL DEFAULT 'AUTO',
            broker TEXT DEFAULT 'PAPER',
            broker_account_id TEXT DEFAULT 'DEFAULT',
            market_data_source TEXT DEFAULT 'AUTO',
            action TEXT NOT NULL DEFAULT 'BUY',
            decision_type TEXT NOT NULL DEFAULT 'PROPOSE_ENTRY',
            strategy TEXT NOT NULL,
            strategy_id TEXT DEFAULT 'STRAT_MOMENTUM_v1',
            strategy_version TEXT DEFAULT '1.0.0',
            entry_price REAL DEFAULT 0.0,
            quantity REAL DEFAULT 1.0,
            stop_loss REAL DEFAULT 0.0,
            take_profit REAL DEFAULT 0.0,
            expiry TEXT DEFAULT '',
            strike REAL DEFAULT 0.0,
            option_type TEXT DEFAULT '',
            time_in_force TEXT DEFAULT 'DAY',
            validity_window_sec INTEGER DEFAULT 300,
            confidence REAL DEFAULT 0.0,
            reason TEXT DEFAULT '',
            risk_explanation TEXT DEFAULT '',
            market_regime TEXT DEFAULT 'NORMAL',
            data_quality_status TEXT DEFAULT 'FRESH',
            evidence_ids_json TEXT DEFAULT '[]',
            source_timestamps_json TEXT DEFAULT '{}',
            idempotency_key TEXT DEFAULT '',
            risk_status TEXT DEFAULT 'PENDING',
            risk_score REAL DEFAULT 0.0,
            risk_reasons_json TEXT DEFAULT '[]',
            approval_status TEXT DEFAULT 'PENDING',
            approved_by TEXT DEFAULT '',
            approved_at TEXT,
            execution_status TEXT DEFAULT 'PENDING',
            order_id TEXT,
            broker_order_id TEXT,
            execution_details_json TEXT DEFAULT '{}',
            execution_mode TEXT DEFAULT 'PAPER',
            created_at TEXT NOT NULL
        )
        """
    )

    # 4. Trading Journal
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_journal (
            journal_id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            checkpoint_id TEXT NOT NULL,
            market_regime TEXT NOT NULL,
            market_context_json TEXT DEFAULT '{}',
            analysis_summary TEXT DEFAULT '',
            candidate_setups_json TEXT DEFAULT '[]',
            decisions_json TEXT DEFAULT '[]',
            risk_summary_json TEXT DEFAULT '{}',
            execution_summary_json TEXT DEFAULT '{}',
            positions_snapshot_json TEXT DEFAULT '[]',
            outcome_summary TEXT DEFAULT '',
            ai_observations TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
        """
    )

    # 5. Daily Reports
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_daily_reports (
            report_id TEXT PRIMARY KEY,
            report_date TEXT NOT NULL UNIQUE,
            timestamp TEXT NOT NULL,
            total_trades INTEGER DEFAULT 0,
            winning_trades INTEGER DEFAULT 0,
            losing_trades INTEGER DEFAULT 0,
            win_rate_pct REAL DEFAULT 0.0,
            gross_pnl REAL DEFAULT 0.0,
            net_pnl REAL DEFAULT 0.0,
            total_fees REAL DEFAULT 0.0,
            max_drawdown REAL DEFAULT 0.0,
            risk_utilization_pct REAL DEFAULT 0.0,
            blocked_trades_count INTEGER DEFAULT 0,
            execution_errors_count INTEGER DEFAULT 0,
            strategy_performance_json TEXT DEFAULT '{}',
            ai_observations TEXT DEFAULT '',
            next_session_watchlist_json TEXT DEFAULT '[]',
            report_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        )
        """
    )

    # 6. Distributed / Durable Locks
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_locks (
            lock_id TEXT PRIMARY KEY,
            routine_id TEXT NOT NULL,
            strategy_id TEXT NOT NULL,
            broker TEXT NOT NULL,
            account_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            acquired_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            holder_pid INTEGER NOT NULL
        )
        """
    )

    # 7. Orchestrator Orders Lifecycle
    db.safe_execute(
        """
        CREATE TABLE IF NOT EXISTS orchestrator_orders (
            order_id TEXT PRIMARY KEY,
            decision_id TEXT NOT NULL,
            run_id TEXT NOT NULL,
            idempotency_key TEXT UNIQUE NOT NULL,
            symbol TEXT NOT NULL,
            instrument_id TEXT NOT NULL,
            side TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            order_type TEXT NOT NULL DEFAULT 'LIMIT',
            time_in_force TEXT NOT NULL DEFAULT 'DAY',
            broker TEXT NOT NULL,
            account_id TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'PAPER',
            status TEXT NOT NULL DEFAULT 'INTENT_CREATED',
            broker_order_id TEXT,
            filled_quantity REAL DEFAULT 0.0,
            average_price REAL DEFAULT 0.0,
            fee REAL DEFAULT 0.0,
            error_code TEXT DEFAULT '',
            error_message TEXT DEFAULT '',
            reconciliation_status TEXT DEFAULT 'SYNCED',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )


# Automatically initialize schema upon module load
init_orchestrator_tables()
