#!/usr/bin/env python3
"""
Quant.OS Root Launcher
Executes the unified developer orchestrator.
Usage: python run_system.py
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import dev_orchestrator

if __name__ == "__main__":
    try:
        dev_orchestrator.main()
    except KeyboardInterrupt:
        sys.exit(0)

