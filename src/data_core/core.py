"""
Authoritative Quant.OS Data Core Master Orchestrator
===================================================
Coordinates and unifies all Quant.OS financial, execution, and market domains:
- CanonicalInstrumentDomain (Master multi-asset universe index)
- MarketDataDomain (Normalized ticks, order books, tape, futures, options)
- OrderBookDomain (L1 to L200 depth ladders and flow analytics)
- OptionsDomain (Analytical Black-Scholes Greeks, IV skew, Max Pain, PCR)
- AccountDomain (Segregated broker balances, collateral, buying power)
- PortfolioDomain (Currency-segregated multi-broker equity aggregations)
- PositionDomain (Marked-to-market positions and exposures)
- OrderDomain (Centralized OMS order lifecycle management)
- ExecutionDomain (Trade fills and execution audits)
- CapitalDomain (Append-only immutable financial ledger)
- RiskDomain (20-Gate Risk Intelligence Matrix)
- ReconciliationDomain (Continuous cross-broker state audits)
- SubscriptionDomain (Reference-counted adaptive feed orchestrator)
- QualityDomain (NaN/Inf guards, sequence continuity, feed age metrics)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from src.data_core.models import (
    BrokerAccount,
    Environment,
    OrderItem,
    PositionItem,
    ProviderInfo,
    ReconciliationReport,
    TradeFill,
)
from src.data_core.events.bus import global_event_bus, GlobalEventBus
from src.data_core.providers.registry import global_provider_registry, ProviderRegistry
from src.data_core.instruments.registry import global_instrument_registry, CanonicalInstrumentRegistry
from src.data_core.orderbook.engine import global_order_book_engine, OrderBookEngine
from src.data_core.options.engine import OptionsEngine
from src.data_core.subscriptions.orchestrator import SubscriptionOrchestrator
from src.data_core.quality.engine import DataQualityEngine
from src.data_core.accounts.account_manager import global_account_manager, AccountManager
from src.data_core.positions.position_registry import global_position_registry, PositionRegistry
from src.data_core.orders.order_manager import global_order_manager, OrderManager
from src.data_core.capital.ledger import global_capital_ledger, CapitalLedger
from src.data_core.risk.risk_engine import global_risk_engine, RiskEngine
from src.data_core.reconciliation.engine import global_reconciliation_engine, ReconciliationEngine
from src.data_core.bots.deployment_engine import global_bot_deployment_engine, BotDeploymentEngine

logger = logging.getLogger("QuantDataCore")


class QuantDataCore:
    """Central authority and façade for all Quant.OS runtime state."""

    def __init__(self):
        self.events: GlobalEventBus = global_event_bus
        self.providers: ProviderRegistry = global_provider_registry
        self.instruments: CanonicalInstrumentRegistry = global_instrument_registry
        self.orderbook: OrderBookEngine = global_order_book_engine
        self.options: OptionsEngine = OptionsEngine()
        self.subscriptions: SubscriptionOrchestrator = SubscriptionOrchestrator()
        self.quality: DataQualityEngine = DataQualityEngine()
        self.accounts: AccountManager = global_account_manager
        self.positions: PositionRegistry = global_position_registry
        self.orders: OrderManager = global_order_manager
        self.ledger: CapitalLedger = global_capital_ledger
        self.risk: RiskEngine = global_risk_engine
        self.reconciliation: ReconciliationEngine = global_reconciliation_engine
        self.bots: BotDeploymentEngine = global_bot_deployment_engine

    def get_system_health(self) -> Dict[str, Any]:
        """Provides holistic system diagnostic state for global header & drawer."""
        provider_summary = self.providers.get_summary()
        stream_metrics = self.events.get_stream_metrics()
        recon = self.reconciliation.get_latest_report()

        return {
            "status": "HEALTHY" if provider_summary["healthy"] and recon.status.value == "HEALTHY" else "WARNING",
            "providers": provider_summary,
            "stream": stream_metrics,
            "reconciliation": {
                "status": recon.status.value,
                "drifts": recon.drifts_found,
                "lastAudited": recon.timestamp,
            },
        }


# Global Singleton Master Instance
quant_data_core = QuantDataCore()
