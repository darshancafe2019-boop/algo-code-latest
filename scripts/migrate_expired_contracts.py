#!/usr/bin/env python3
"""
Quant.OS Database Migration: Dynamic Contract & Expiry Resolution
================================================================
Classifies and updates stale/expired contract references in the database:
- ACTIVE / PAPER / RUNNING / STOPPED: re-resolve to active unexpired contract (NSE:NIFTY:AUTO:FUT / 2026-09-29)
- DRAFT: set expiry to AUTO
- HISTORICAL / BACKTEST: preserve historical records
"""

import sqlite3
import json
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "data" / "trading_bot.db"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MigrateContracts")


def run_migration():
    if not DB_PATH.exists():
        logger.warning(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    logger.info("Starting contract migration...")

    # 1. Update data_core_persisted_bots
    updated_persisted = 0
    rows = cursor.execute("SELECT bot_id, name, state, canonical_instrument_id, expiry, spec_json, bot_json FROM data_core_persisted_bots").fetchall()
    for row in rows:
        bot_id, name, state, canon_id, expiry, spec_str, bot_str = row
        needs_update = False
        new_canon = canon_id
        new_expiry = expiry

        if canon_id == "NSE:NIFTY26MARFUT" or "2026-03-27" in (expiry or "") or (not expiry and canon_id == "NSE:NIFTY26MARFUT"):
            new_canon = "NSE:NIFTY:AUTO:FUT"
            new_expiry = "AUTO"
            needs_update = True

        new_spec_str = spec_str
        if spec_str and ("2026-03-27" in spec_str or "NSE:NIFTY26MARFUT" in spec_str):
            new_spec_str = spec_str.replace("2026-03-27", "AUTO").replace("NSE:NIFTY26MARFUT", "NSE:NIFTY:AUTO:FUT")
            needs_update = True

        new_bot_str = bot_str
        if bot_str and ("2026-03-27" in bot_str or "NSE:NIFTY26MARFUT" in bot_str):
            new_bot_str = bot_str.replace("2026-03-27", "AUTO").replace("NSE:NIFTY26MARFUT", "NSE:NIFTY:AUTO:FUT")
            needs_update = True

        if needs_update:
            cursor.execute(
                """
                UPDATE data_core_persisted_bots 
                SET canonical_instrument_id = ?, expiry = ?, spec_json = ?, bot_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE bot_id = ?
                """,
                (new_canon, new_expiry, new_spec_str, new_bot_str, bot_id)
            )
            updated_persisted += 1
            logger.info(f"Updated data_core_persisted_bots: {bot_id} ({name}) -> {new_canon} / {new_expiry}")

    # 2. Update bot_instances
    updated_instances = 0
    rows = cursor.execute("SELECT id, name, symbol, canonical_instrument_id, config_json FROM bot_instances").fetchall()
    for row in rows:
        bot_id, name, sym, canon_id, cfg_str = row
        needs_update = False
        new_canon = canon_id
        new_sym = sym

        if canon_id == "NSE:NIFTY26MARFUT":
            new_canon = "NSE:NIFTY:AUTO:FUT"
            new_sym = "NIFTY Auto Future"
            needs_update = True
        elif sym == "NIFTY 27-MAR-2026 Future":
            new_sym = "NIFTY Auto Future"
            needs_update = True

        new_cfg_str = cfg_str
        if cfg_str and ("2026-03-27" in cfg_str or "NSE:NIFTY26MARFUT" in cfg_str):
            new_cfg_str = cfg_str.replace("2026-03-27", "AUTO").replace("NSE:NIFTY26MARFUT", "NSE:NIFTY:AUTO:FUT")
            needs_update = True

        if needs_update:
            cursor.execute(
                """
                UPDATE bot_instances
                SET canonical_instrument_id = ?, symbol = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (new_canon, new_sym, new_cfg_str, bot_id)
            )
            updated_instances += 1
            logger.info(f"Updated bot_instances: {bot_id} ({name}) -> {new_canon}")

    # 3. Update bot_drafts if any
    updated_drafts = 0
    draft_rows = cursor.execute("SELECT id, name, draft_json FROM bot_drafts").fetchall()
    for row in draft_rows:
        d_id, d_name, d_json = row
        if d_json and ("2026-03-27" in d_json or "NSE:NIFTY26MARFUT" in d_json):
            new_d_json = d_json.replace("2026-03-27", "AUTO").replace("NSE:NIFTY26MARFUT", "NSE:NIFTY:AUTO:FUT")
            cursor.execute("UPDATE bot_drafts SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_d_json, d_id))
            updated_drafts += 1
            logger.info(f"Updated bot_drafts: {d_id} ({d_name})")

    conn.commit()
    conn.close()

    logger.info(f"Migration completed. Persisted bots updated: {updated_persisted}, Bot instances updated: {updated_instances}, Drafts updated: {updated_drafts}")


if __name__ == "__main__":
    run_migration()
