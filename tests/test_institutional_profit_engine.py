"""
Institutional Quantitative Derivatives & Strategy Engine Tests
Verifying:
1. Long Call / Long Put analytical payoffs & unlimited profit bounds
2. Bull Call Spread / Bear Put Spread / Iron Condor defined risk metrics
3. Short Call / Short Put undefined risk handling
4. Futures & Crypto Perpetuals (margin, leverage, liquidation, funding)
5. Central Contract Validation Service (blocking expired contracts, suggesting replacements)
6. Deterministic Bot Configuration Hashing & Approval Invalidation
7. 24-Gate Pre-flight Consistency Engine
"""

import math
import pytest
from datetime import datetime, date, timedelta, timezone

from src.data_core.derivatives.profit_engine import (
    OptionLeg,
    OptionsProfitEngine,
    FuturesProfitEngine,
    ScenarioAnalysisEngine,
    calculate_black_scholes_greeks,
)
from src.data_core.instruments.contract_validation_service import (
    ContractValidationService,
    ContractValidationResult,
)
from src.data_core.bots.config_integrity import (
    generate_deterministic_bot_hash,
    BotStateGovernance,
)
from src.data_core.bots.models import BotDeploymentSpec, StrategyLegItem
from src.data_core.bots.consistency_engine import DeploymentConsistencyEngine, BotConsistencyEngine


class TestInstitutionalOptionsProfitEngine:
    def test_long_call_metrics(self):
        """Verify Long Call: Max Loss = Premium + Costs, Breakeven = Strike + Net Premium, Profit = Unlimited."""
        leg = OptionLeg(
            strike=100.0,
            option_type="CE",
            side="BUY",
            quantity=1.0,
            premium=5.0,
        )
        res = OptionsProfitEngine.calculate_payoff(
            legs=[leg],
            spot_price=100.0,
            contract_multiplier=1.0,
            estimated_slippage_pct=0.0,
            broker_fee_per_leg=0.0,
        )

        assert res.is_unlimited_profit is True
        assert res.is_defined_risk is True
        assert res.net_premium_flow == -5.0
        assert pytest.approx(res.max_loss, 0.01) == 5.0
        assert len(res.breakeven_points) == 1
        assert pytest.approx(res.breakeven_points[0], 0.01) == 105.0

    def test_long_put_metrics(self):
        """Verify Long Put: Max Loss = Premium + Costs, Breakeven = Strike - Net Premium."""
        leg = OptionLeg(
            strike=100.0,
            option_type="PE",
            side="BUY",
            quantity=1.0,
            premium=4.0,
        )
        res = OptionsProfitEngine.calculate_payoff(
            legs=[leg],
            spot_price=100.0,
            contract_multiplier=1.0,
            estimated_slippage_pct=0.0,
            broker_fee_per_leg=0.0,
        )

        assert res.is_unlimited_profit is False
        assert res.is_defined_risk is True
        assert res.net_premium_flow == -4.0
        assert pytest.approx(res.max_loss, 0.01) == 4.0
        assert len(res.breakeven_points) == 1
        assert pytest.approx(res.breakeven_points[0], 0.01) == 96.0
        assert pytest.approx(res.max_profit, 0.01) == 96.0

    def test_bull_call_spread(self):
        """Verify Bull Call Spread: Buy 100 CE @ 6, Sell 110 CE @ 2."""
        legs = [
            OptionLeg(strike=100.0, option_type="CE", side="BUY", quantity=1.0, premium=6.0),
            OptionLeg(strike=110.0, option_type="CE", side="SELL", quantity=1.0, premium=2.0),
        ]
        res = OptionsProfitEngine.calculate_payoff(
            legs=legs,
            spot_price=100.0,
            strategy_type="BULL_CALL_SPREAD",
            contract_multiplier=1.0,
            estimated_slippage_pct=0.0,
            broker_fee_per_leg=0.0,
        )

        assert res.is_defined_risk is True
        assert res.is_unlimited_profit is False
        assert pytest.approx(res.net_premium_flow, 0.01) == -4.0
        assert pytest.approx(res.max_loss, 0.01) == 4.0
        assert pytest.approx(res.max_profit, 0.01) == 6.0
        assert len(res.breakeven_points) == 1
        assert pytest.approx(res.breakeven_points[0], 0.01) == 104.0
        assert pytest.approx(res.reward_to_risk_ratio, 0.01) == 1.5

    def test_short_call_undefined_risk(self):
        """Verify Short Call: Sell 100 CE @ 5 has undefined risk."""
        leg = OptionLeg(strike=100.0, option_type="CE", side="SELL", quantity=1.0, premium=5.0)
        res = OptionsProfitEngine.calculate_payoff(
            legs=[leg],
            spot_price=100.0,
            strategy_type="SHORT_CALL",
            contract_multiplier=1.0,
            estimated_slippage_pct=0.0,
            broker_fee_per_leg=0.0,
        )

        assert res.is_defined_risk is False
        assert res.is_unlimited_profit is False
        assert pytest.approx(res.max_profit, 0.01) == 5.0
        assert res.max_loss is None or math.isinf(res.max_loss)

    def test_iron_condor(self):
        """Verify Iron Condor: Buy 90 PE @ 1, Sell 95 PE @ 3, Sell 105 CE @ 3, Buy 110 CE @ 1."""
        legs = [
            OptionLeg(strike=90.0, option_type="PE", side="BUY", quantity=1.0, premium=1.0),
            OptionLeg(strike=95.0, option_type="PE", side="SELL", quantity=1.0, premium=3.0),
            OptionLeg(strike=105.0, option_type="CE", side="SELL", quantity=1.0, premium=3.0),
            OptionLeg(strike=110.0, option_type="CE", side="BUY", quantity=1.0, premium=1.0),
        ]
        res = OptionsProfitEngine.calculate_payoff(
            legs=legs,
            spot_price=100.0,
            strategy_type="IRON_CONDOR",
            contract_multiplier=1.0,
            estimated_slippage_pct=0.0,
            broker_fee_per_leg=0.0,
        )

        assert res.is_defined_risk is True
        assert pytest.approx(res.net_premium_flow, 0.01) == 4.0
        assert pytest.approx(res.max_profit, 0.01) == 4.0
        assert pytest.approx(res.max_loss, 0.01) == 1.0
        assert len(res.breakeven_points) == 2
        assert pytest.approx(res.breakeven_points[0], 0.01) == 91.0
        assert pytest.approx(res.breakeven_points[1], 0.01) == 109.0


class TestFuturesAndPerpetualEngine:
    def test_btc_perpetual_long(self):
        """Verify BTC perpetual long margin, leverage, and liquidation."""
        res = FuturesProfitEngine.calculate_futures_profit(
            entry_price=80000.0,
            exit_price=84000.0,
            side="LONG",
            quantity=1.0,
            contract_multiplier=1.0,
            leverage=10.0,
            is_crypto_perp=True,
            funding_rate_pct=0.01,
            funding_periods=3,
        )

        assert res.gross_pnl == 4000.0
        assert res.margin_required == 8000.0
        assert res.liquidation_price is not None
        assert res.liquidation_price < 80000.0
        assert res.liquidation_distance_pct is not None
        assert res.liquidation_distance_pct > 0
        assert res.net_pnl > 0
        assert res.return_on_margin_pct > 0


class TestContractValidationService:
    def test_expired_contract_blocking(self):
        """Verify that past/expired contracts are strictly blocked with replacement suggestions."""
        past_date = (date.today() - timedelta(days=5)).strftime("%Y-%m-%d")
        available = [
            (date.today() + timedelta(days=2)).strftime("%Y-%m-%d"),
            (date.today() + timedelta(days=9)).strftime("%Y-%m-%d"),
            (date.today() + timedelta(days=30)).strftime("%Y-%m-%d"),
        ]

        result = ContractValidationService.validate_expiry(
            expiry_str=past_date,
            underlying="BTC",
            provider="DELTA",
            active_catalog_expiries=available,
        )
        assert result.is_valid is False
        assert result.is_expired is True
        assert result.is_blocked is True
        assert result.status == "EXPIRED"
        assert available[0] in result.suggested_expiries

    def test_active_future_contract(self):
        """Verify active future contracts pass validation."""
        future_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        result = ContractValidationService.validate_expiry(future_date)
        assert result.is_valid is True
        assert result.is_expired is False
        assert result.is_blocked is False
        assert result.status in ("ACTIVE", "NORMAL")


class TestConfigIntegrityAndHash:
    def test_deterministic_bot_hash(self):
        """Verify identical configuration gives identical SHA-256 hash, mutations change hash."""
        config_a = {
            "bot_name": "BTC Bull Bot",
            "strategy": "BULL_CALL_SPREAD",
            "symbol": "BTC",
            "expiry": "2026-10-30",
            "capital": 10000,
            "lots": 1,
            "stop_loss": 1.0,
        }
        config_b = dict(config_a)
        config_mutated = dict(config_a, stop_loss=1.5)

        hash_a = generate_deterministic_bot_hash(config_a)
        hash_b = generate_deterministic_bot_hash(config_b)
        hash_mutated = generate_deterministic_bot_hash(config_mutated)

        assert hash_a == hash_b
        assert hash_a != hash_mutated
        assert len(hash_a) == 64

    def test_approval_invalidation_on_change(self):
        """Verify that any modification invalidates prior user approval."""
        config = {"bot_id": "bot-1", "strategy_type": "BULL_CALL_SPREAD", "capital_allocation": 5000}
        approval = BotStateGovernance.register_user_approval(config, approved_by="senior_trader")
        assert approval.is_live_confirmed is False

        is_valid, _ = BotStateGovernance.verify_approval_valid(config)
        assert is_valid is True

        # Mutate config
        config_mutated = dict(config, capital_allocation=6000)
        is_valid_after_mutation, reason = BotStateGovernance.verify_approval_valid(config_mutated)
        assert is_valid_after_mutation is False
        assert "MUTATED" in reason or "invalidated" in reason.lower()


class TestConsistencyEngine24Gates:
    def test_24_gates_execution(self):
        """Verify that the upgraded DeploymentConsistencyEngine evaluates all 24 gates and blocks expired contracts."""
        future_expiry = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        past_expiry = (date.today() - timedelta(days=2)).strftime("%Y-%m-%d")

        leg1 = StrategyLegItem(
            leg_id="l1",
            canonical_instrument_id=f"BTC-{future_expiry}-80000-CE",
            underlying_canonical_id="BTC",
            underlying_symbol="BTC",
            strike=80000.0,
            expiry=future_expiry,
            option_type="CE",
            side="BUY",
            lots=1,
            lot_size=1,
            quantity=1,
            limit_price=500.0,
            quote={"ltp": 500.0, "spot_price": 80000.0, "iv": 0.50},
        )
        leg2 = StrategyLegItem(
            leg_id="l2",
            canonical_instrument_id=f"BTC-{future_expiry}-85000-CE",
            underlying_canonical_id="BTC",
            underlying_symbol="BTC",
            strike=85000.0,
            expiry=future_expiry,
            option_type="CE",
            side="SELL",
            lots=1,
            lot_size=1,
            quantity=1,
            limit_price=200.0,
            quote={"ltp": 200.0, "spot_price": 80000.0, "iv": 0.50},
        )

        # Valid setup
        spec_valid = BotDeploymentSpec(
            bot_id="BOT-VALID-01",
            bot_name="BTC Bull Call Spread",
            underlying_symbol="BTC",
            underlying_canonical_id="BTC",
            strategy_type="BULL_CALL_SPREAD",
            expiry=future_expiry,
            execution_broker="PAPER",
            legs=[leg1, leg2],
            capital_allocation=10000.0,
        )
        report_valid = DeploymentConsistencyEngine.validate_deployment_spec(spec_valid)
        assert len(report_valid.gates) == 24
        assert report_valid.gates[1].name == "Strategy Expiry Consistency & Validity"
        assert report_valid.gates[1].status == "PASS"

        # Expired setup
        leg1_expired = StrategyLegItem(
            leg_id="l1",
            canonical_instrument_id=f"BTC-{past_expiry}-80000-CE",
            underlying_canonical_id="BTC",
            underlying_symbol="BTC",
            strike=80000.0,
            expiry=past_expiry,
            option_type="CE",
            side="BUY",
            lots=1,
            lot_size=1,
            quantity=1,
            limit_price=500.0,
            quote={"ltp": 500.0, "spot_price": 80000.0, "iv": 0.50},
        )
        spec_expired = BotDeploymentSpec(
            bot_id="BOT-EXPIRED-01",
            bot_name="BTC Expired Spread",
            underlying_symbol="BTC",
            underlying_canonical_id="BTC",
            strategy_type="BULL_CALL_SPREAD",
            expiry=past_expiry,
            execution_broker="PAPER",
            legs=[leg1_expired, leg2],
            capital_allocation=10000.0,
        )
        report_expired = DeploymentConsistencyEngine.validate_deployment_spec(spec_expired)
        assert len(report_expired.gates) == 24
        assert report_expired.is_deployable is False
        assert report_expired.gates[1].status == "FAIL"
        assert "expired" in report_expired.gates[1].actual.lower() or "expired" in report_expired.gates[1].expected.lower()
