import pytest
import sqlite3
import os
import json
from src.bot_runtime_service import (
    BotRuntimeService,
    BotLifecycleState,
    record_config_version,
    get_config_history,
    save_draft,
    get_draft,
    list_drafts,
    delete_draft
)
from src.db import init_db

@pytest.fixture
def clean_db():
    init_db()
    yield

def test_bot_lifecycle_transitions(clean_db):
    service = BotRuntimeService()
    
    # Check valid transitions
    assert service.is_valid_transition(BotLifecycleState.STOPPED, BotLifecycleState.STARTING) is True
    assert service.is_valid_transition(BotLifecycleState.STARTING, BotLifecycleState.RUNNING) is True
    assert service.is_valid_transition(BotLifecycleState.RUNNING, BotLifecycleState.PAUSING) is True
    assert service.is_valid_transition(BotLifecycleState.PAUSED, BotLifecycleState.RUNNING) is True
    assert service.is_valid_transition(BotLifecycleState.RUNNING, BotLifecycleState.QUARANTINED) is True
    assert service.is_valid_transition(BotLifecycleState.QUARANTINED, BotLifecycleState.STOPPED) is True

    # Check invalid transitions
    assert service.is_valid_transition(BotLifecycleState.DRAFT, BotLifecycleState.RUNNING) is False
    assert service.is_valid_transition(BotLifecycleState.DISABLED, BotLifecycleState.RUNNING) is False

def test_bot_draft_persistence(clean_db):
    draft_id = "test_draft_99"
    draft_data = {
        "step": 3,
        "identity": {"name": "Draft Strategy Test"},
        "universe": {"market": "NSE", "symbol": "RELIANCE"},
        "capital": {"allocated_capital": 50000.0}
    }
    
    # Save draft
    res = save_draft(draft_id, "Draft Strategy Test", draft_data)
    assert res.get("status") == "success"

    # Get draft
    retrieved = get_draft(draft_id)
    assert retrieved is not None
    assert retrieved["name"] == "Draft Strategy Test"
    assert retrieved["draft"]["step"] == 3
    assert retrieved["draft"]["universe"]["symbol"] == "RELIANCE"

    # List drafts
    draft_list = list_drafts()
    assert any(d["id"] == draft_id for d in draft_list)

    # Delete draft
    deleted = delete_draft(draft_id)
    assert deleted is True
    assert get_draft(draft_id) is None

def test_config_version_audit_trail(clean_db):
    bot_id = "bot_audit_test_01"
    from src.db import safe_execute
    safe_execute("DELETE FROM bot_config_versions WHERE bot_id = ?", (bot_id,))
    safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
    try:
        safe_execute(
            "INSERT INTO bot_instances (id, name, symbol, strategy, timeframe, allocated_capital, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (bot_id, "Audit Test Bot", "BTC/USDT", "RSI", "5m", 10000.0, "STOPPED")
        )
        cfg1 = {"version": 1, "capital": 10000.0}
        cfg2 = {"version": 2, "capital": 15000.0}

        # Record v1
        record_config_version(bot_id, 1, cfg1, "Initial creation", "test_user")

        # Record v2
        record_config_version(bot_id, 2, cfg2, "Capital increased", "test_user")

        # Retrieve history
        history = get_config_history(bot_id)
        assert len(history) >= 2
        versions = [h["version"] for h in history]
        assert 1 in versions
        assert 2 in versions
    finally:
        safe_execute("DELETE FROM bot_config_versions WHERE bot_id = ?", (bot_id,))
        safe_execute("DELETE FROM bot_instances WHERE id = ?", (bot_id,))
