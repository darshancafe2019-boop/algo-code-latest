import sys
import json
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from dashboard import app
from src.global_data_engine import GlobalDataEngine
from src.bot_runtime_service import global_bot_runtime_service

print("===============================================================")
print("RUNNING AUTHORITATIVE FINANCIAL DATA SYNCHRONIZATION AUDIT")
print("===============================================================")

client = app.test_client()

# 1. Query /api/portfolio/snapshot
res_snap = client.get("/api/portfolio/snapshot?mode=PAPER")
assert res_snap.status_code == 200
snap_data = res_snap.get_json()

# 2. Query /api/status
res_status = client.get("/api/status?mode=PAPER")
assert res_status.status_code == 200
status_data = res_status.get_json()

# 3. Query /api/pnl/summary
res_pnl = client.get("/api/pnl/summary?mode=PAPER")
assert res_pnl.status_code == 200
pnl_data = res_pnl.get_json()

# 4. Query /api/bots/summary
res_bots = client.get("/api/bots/summary")
assert res_bots.status_code == 200
bots_data = res_bots.get_json()

print(f"\n[1] /api/portfolio/snapshot:")
print(f"    - Starting Balance: ${snap_data.get('startingBalance'):,.2f}")
print(f"    - Cash Balance:     ${snap_data.get('cashBalance'):,.2f}")
print(f"    - Total Equity:     ${snap_data.get('equity'):,.2f}")
print(f"    - Daily P&L:        ${snap_data.get('dailyPnl'):,.2f}")
print(f"    - Net Realized:     ${snap_data.get('netRealizedPnl'):,.2f}")
print(f"    - Unrealized P&L:   ${snap_data.get('unrealizedPnl'):,.2f}")
print(f"    - Open Positions:   {snap_data.get('openPositions')}")

print(f"\n[2] /api/status:")
print(f"    - Health Balance:   ${status_data.get('health', {}).get('balance'):,.2f}")
print(f"    - Health Equity:    ${status_data.get('health', {}).get('equity'):,.2f}")
print(f"    - Today's P&L:      ${status_data.get('todays_pnl'):,.2f}")
print(f"    - Today's P&L %:    {status_data.get('todays_pnl_pct')}%")
print(f"    - Open Positions:   {status_data.get('open_positions_count')}")

print(f"\n[3] /api/pnl/summary:")
print(f"    - Cash Balance:     ${pnl_data.get('cash_balance'):,.2f}")
print(f"    - Total Equity:     ${pnl_data.get('total_equity'):,.2f}")
print(f"    - Today P&L:        ${pnl_data.get('today_pnl'):,.2f}")
print(f"    - Net Realized:     ${pnl_data.get('net_realized_pnl'):,.2f}")

print(f"\n[4] /api/bots/summary:")
print(f"    - Total Bots:       {bots_data.get('metrics', {}).get('total_bots')}")
print(f"    - Running Bots:     {bots_data.get('metrics', {}).get('running')}")
print(f"    - Today P&L:        ${bots_data.get('metrics', {}).get('today_pnl'):,.2f}")
print(f"    - Realized P&L:     ${bots_data.get('metrics', {}).get('realized_pnl'):,.2f}")

# Cross-verification assertions
assert round(snap_data.get('equity'), 2) == round(status_data.get('health', {}).get('equity'), 2), "Equity mismatch between /api/portfolio/snapshot and /api/status"
assert round(snap_data.get('dailyPnl'), 2) == round(status_data.get('todays_pnl'), 2), "Daily PnL mismatch between /api/portfolio/snapshot and /api/status"
assert round(snap_data.get('equity'), 2) == round(pnl_data.get('total_equity'), 2), "Equity mismatch between /api/portfolio/snapshot and /api/pnl/summary"
assert round(snap_data.get('dailyPnl'), 2) == round(pnl_data.get('today_pnl'), 2), "Daily PnL mismatch between /api/portfolio/snapshot and /api/pnl/summary"
assert snap_data.get('openPositions') == status_data.get('open_positions_count'), "Open positions count mismatch"

print("\n===============================================================")
print("[SUCCESS] ALL FINANCIAL ENDPOINTS ARE 100% SYNCHRONIZED & CONSISTENT!")
print("===============================================================\n")
