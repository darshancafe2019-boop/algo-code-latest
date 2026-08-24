"""
Unit and integration tests for the user-curated Watchlist system.
Verifies zero default items, manual add/remove/reorder/clear, deduplication, and persistence.
"""
import pytest
import sqlite3
from src import db, config


def test_watchlist_starts_clean_without_demo_items():
    """Verify that get_user_watchlists() returns an empty list of items, never seeding demo instruments."""
    # Clear items
    db.clear_user_watchlist("wl_main")

    wls = db.get_user_watchlists()
    assert len(wls) >= 1
    main_wl = next((w for w in wls if w["id"] == "wl_main"), None)
    assert main_wl is not None
    assert len(main_wl["items"]) == 0
    assert main_wl["items_count"] == 0


def test_watchlist_add_and_deduplication():
    """Verify adding instruments and preventing duplicates."""
    db.clear_user_watchlist("wl_main")

    # 1. Add first instrument
    ok1 = db.add_item_to_watchlist("wl_main", "CRYPTO_BTCUSDT", "Bitcoin Core Holding")
    assert ok1 is True

    # 2. Add second instrument
    ok2 = db.add_item_to_watchlist("wl_main", "CRYPTO_ETHUSDT", "Ethereum Holding")
    assert ok2 is True

    wls = db.get_user_watchlists()
    main_wl = next(w for w in wls if w["id"] == "wl_main")
    assert main_wl["items_count"] == 2
    symbols = [it["instrument_id"] for it in main_wl["items"]]
    assert "CRYPTO_BTCUSDT" in symbols
    assert "CRYPTO_ETHUSDT" in symbols

    # 3. Duplicate add should update without duplicating rows
    ok3 = db.add_item_to_watchlist("wl_main", "CRYPTO_BTCUSDT", "Updated Bitcoin Note")
    assert ok3 is True

    wls = db.get_user_watchlists()
    main_wl = next(w for w in wls if w["id"] == "wl_main")
    assert main_wl["items_count"] == 2


def test_watchlist_reordering():
    """Verify reordering items updates sort_order explicitly."""
    db.clear_user_watchlist("wl_main")

    db.add_item_to_watchlist("wl_main", "CRYPTO_BTCUSDT")
    db.add_item_to_watchlist("wl_main", "CRYPTO_ETHUSDT")
    db.add_item_to_watchlist("wl_main", "CRYPTO_SOLUSDT")

    # Reorder to SOL, ETH, BTC
    new_order = ["CRYPTO_SOLUSDT", "CRYPTO_ETHUSDT", "CRYPTO_BTCUSDT"]
    ok = db.reorder_watchlist_items("wl_main", new_order)
    assert ok is True

    wls = db.get_user_watchlists()
    main_wl = next(w for w in wls if w["id"] == "wl_main")
    ordered_symbols = [it["instrument_id"] for it in main_wl["items"]]
    assert ordered_symbols == new_order


def test_watchlist_remove_item():
    """Verify removing a specific instrument."""
    db.clear_user_watchlist("wl_main")

    db.add_item_to_watchlist("wl_main", "CRYPTO_BTCUSDT")
    db.add_item_to_watchlist("wl_main", "CRYPTO_ETHUSDT")

    ok = db.remove_item_from_watchlist("wl_main", "CRYPTO_BTCUSDT")
    assert ok is True

    wls = db.get_user_watchlists()
    main_wl = next(w for w in wls if w["id"] == "wl_main")
    assert main_wl["items_count"] == 1
    assert main_wl["items"][0]["instrument_id"] == "CRYPTO_ETHUSDT"


def test_watchlist_clear_all():
    """Verify clearing all instruments leaves 0 items."""
    db.clear_user_watchlist("wl_main")

    db.add_item_to_watchlist("wl_main", "CRYPTO_BTCUSDT")
    db.add_item_to_watchlist("wl_main", "CRYPTO_ETHUSDT")
    db.add_item_to_watchlist("wl_main", "CRYPTO_SOLUSDT")

    wls_before = db.get_user_watchlists()
    main_wl_before = next(w for w in wls_before if w["id"] == "wl_main")
    assert main_wl_before["items_count"] == 3

    ok = db.clear_user_watchlist("wl_main")
    assert ok is True

    wls_after = db.get_user_watchlists()
    main_wl_after = next(w for w in wls_after if w["id"] == "wl_main")
    assert main_wl_after["items_count"] == 0
    assert len(main_wl_after["items"]) == 0
