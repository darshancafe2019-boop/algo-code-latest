import shutil
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
next_dir = root / "frontend" / ".next"

if next_dir.exists():
    print(f"Removing {next_dir}...")
    shutil.rmtree(next_dir, ignore_errors=True)
    print("Frontend .next cache cleared successfully.")
else:
    print("No .next directory found.")
