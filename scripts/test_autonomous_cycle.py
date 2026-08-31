import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.live_runner import LiveRunner

print("[TEST] Initializing LiveRunner for 'bot-scalper-75d4eaea'...")
runner = LiveRunner(bot_id="bot-scalper-75d4eaea")
print(f"  Bot Name:       {runner.bot_name}")
print(f"  Symbol:         {runner.symbol}")
print(f"  Timeframe:      {runner.timeframe}")
print(f"  Auto-Execute:   {runner.auto_execute}")
print(f"  Manual Approval:{runner.require_manual_approval}")

print("\n[TEST] Executing autonomous evaluation cycle...")
runner.process_cycle()
print("[TEST] Autonomous cycle executed successfully!")
