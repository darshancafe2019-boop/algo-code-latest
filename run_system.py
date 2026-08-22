#!/usr/bin/env python3
"""
Quant.OS Root Launcher
Executes the unified developer orchestrator.
Usage: python run_system.py
"""

import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
ORCHESTRATOR = ROOT_DIR / "scripts" / "dev_orchestrator.py"

if __name__ == "__main__":
    try:
        sys.exit(subprocess.call([sys.executable, str(ORCHESTRATOR)]))
    except KeyboardInterrupt:
        sys.exit(0)
