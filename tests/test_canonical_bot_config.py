import pytest
from src.canonical_bot_config import (
    CanonicalBotConfig,
    BotIdentityConfig,
    BotEnvironmentConfig,
    BotUniverseConfig,
    BotStrategyConfig,
    BotCapitalConfig,
    BotRiskConfig,
    BotExecutionConfig,
    BotMonitoringConfig,
    BotExecutionMode,
    OrderType,
    generate_bot_slug,
    compute_config_hash,
    migrate_v1_to_canonical,
)

def test_generate_bot_slug():
    slug1 = generate_bot_slug("Alpha Momentum Trend", "NSE", "NIFTY")
    assert "alpha-momentum-trend-nse-nifty" in slug1

    slug2 = generate_bot_slug("Special & Symbols! 100", "BINANCE", "BTC-USDT")
    assert "special-symbols-100-binance-btcusdt" in slug2 or "special-symbols-100-binance-btc-usdt" in slug2

def test_canonical_bot_config_creation_and_hashing():
    config = CanonicalBotConfig(
        identity=BotIdentityConfig(
            bot_id="bot_test_123",
            name="Alpha Trend Follower",
            slug="alpha-trend-follower",
            tags=["trend", "momentum"],
            description="Automated breakout trader"
        ),
        environment=BotEnvironmentConfig(
            execution_mode=BotExecutionMode.PAPER,
            timezone="Asia/Kolkata",
        ),
        universe=BotUniverseConfig(
            asset_class="NSE",
            display_symbol="NIFTY",
            canonical_instrument_id="NSE:INDEX:NIFTY50",
        ),
        strategy=BotStrategyConfig(
            strategy_id="supertrend_v1",
            primary_timeframe="5m"
        ),
        capital=BotCapitalConfig(
            total_capital=100000.0,
            allocated_capital=20000.0,
            currency="INR"
        ),
        risk=BotRiskConfig(
            max_daily_loss_amount=5000.0,
            max_daily_drawdown_pct=5.0,
            stop_loss_pct=1.5,
            profit_target_pct=3.0
        ),
        execution=BotExecutionConfig(
            order_type=OrderType.LIMIT,
            max_slippage_pct=0.05
        ),
        monitoring=BotMonitoringConfig(
            heartbeat_enabled=True
        )
    )

    h1 = config.compute_hash()
    assert len(h1) == 64

    # Verify to_dict and from_dict
    d = config.to_dict()
    assert d["identity"]["name"] == "Alpha Trend Follower"
    assert d["risk"]["stop_loss_pct"] == 1.5

    restored = CanonicalBotConfig.from_dict(d)
    assert restored.identity.bot_id == "bot_test_123"
    assert restored.universe.canonical_instrument_id == "NSE:INDEX:NIFTY50"
    assert restored.to_dict() == config.to_dict()
    assert restored.compute_hash() == h1

def test_canonical_bot_config_validation():
    # Valid config
    config = CanonicalBotConfig(
        identity=BotIdentityConfig(bot_id="b1", name="Bot 1", slug="bot-1"),
        universe=BotUniverseConfig(asset_class="NSE", display_symbol="SBIN", canonical_instrument_id="NSE:EQ:SBIN"),
        strategy=BotStrategyConfig(strategy_id="s1"),
        capital=BotCapitalConfig(allocated_capital=50000.0),
        risk=BotRiskConfig(max_daily_loss_amount=1000.0, max_daily_drawdown_pct=10.0, stop_loss_pct=2.0),
        execution=BotExecutionConfig()
    )
    is_valid, errors = config.validate()
    assert is_valid is True
    assert len(errors) == 0

    # Invalid config: empty name, zero capital, max daily loss > capital
    invalid_config = CanonicalBotConfig(
        identity=BotIdentityConfig(bot_id="b2", name="  ", slug=""),
        capital=BotCapitalConfig(allocated_capital=0.0),
        risk=BotRiskConfig(max_daily_loss_amount=10000.0, max_daily_drawdown_pct=150.0, stop_loss_pct=-5.0),
        execution=BotExecutionConfig()
    )
    is_valid, errors = invalid_config.validate()
    assert is_valid is False
    assert any("Bot Name" in e for e in errors)
    assert any("Allocated capital" in e for e in errors)
    assert any("Max drawdown" in e for e in errors)

def test_migrate_v1_to_canonical():
    v1_data = {
        "id": "v1_bot_99",
        "name": "Legacy Bot",
        "market": "CRYPTO",
        "symbol": "ETH/USDT",
        "timeframe": "15m",
        "strategy": "EMA_CROSS",
        "allocated_capital": 2500.0,
        "max_daily_loss": 100.0,
        "stop_loss_pct": 2.0,
        "profit_target_pct": 4.0,
        "broker": "BINANCE",
        "mode": "PAPER"
    }
    canonical = migrate_v1_to_canonical(v1_data)
    assert canonical.identity.bot_id == "v1_bot_99"
    assert canonical.identity.name == "Legacy Bot"
    assert canonical.universe.display_symbol == "ETH/USDT"
    assert canonical.capital.allocated_capital == 2500.0
    assert canonical.environment.execution_mode == "PAPER"
