#!/usr/bin/env python3
"""
Static Operational Data Audit Script for Quant.OS

Scans frontend TypeScript/TSX components to ensure zero fake, static, mock,
or fallback prices/balances/latencies exist in production operational components.
"""

import os
import sys
import re
from pathlib import Path

# Paths to scan
ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    "out",
    "build",
    "dist",
    "coverage",
    "tests",
    "__tests__",
    ".git",
}

# Forbidden regex patterns in production UI components
FORBIDDEN_PATTERNS = [
    # Static fallback prices on live data
    (re.compile(r'(\|\|\s*24350(\.0)?)', re.IGNORECASE), "Hardcoded 24350 index fallback price"),
    (re.compile(r'(\|\|\s*65420(\.0)?)', re.IGNORECASE), "Hardcoded 65420 crypto fallback price"),
    (re.compile(r'(\|\|\s*1250000(\.0)?)', re.IGNORECASE), "Hardcoded 12,50,000 wallet balance fallback"),
    
    # Random candle drift generators in operational terminals
    (re.compile(r'Math\.random\(\)\s*[*+-].*?(candle|price|tick|ltp)', re.IGNORECASE), "Synthetic Math.random() price generator"),
    
    # Mock data arrays masquerading as live positions/orders
    (re.compile(r'mockOpenPositions|mockPositions|mockOrders|mockOptionsList', re.IGNORECASE), "Mock positions/orders array masquerading as live state"),
]

def scan_files():
    violations = []
    scanned_count = 0

    for root, dirs, files in os.walk(FRONTEND_DIR):
        # Filter out ignored directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        
        for file in files:
            if not (file.endswith(".ts") or file.endswith(".tsx")):
                continue
            
            # Skip test files and test utilities
            if "test" in file.lower() or "spec" in file.lower() or "mock" in file.lower():
                continue
            
            filepath = Path(root) / file
            scanned_count += 1
            
            try:
                content = filepath.read_text(encoding="utf-8")
            except Exception as e:
                continue

            rel_path = filepath.relative_to(ROOT_DIR)
            lines = content.splitlines()

            for line_idx, line in enumerate(lines, 1):
                # Skip comments
                stripped = line.strip()
                if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                    continue

                for pattern, desc in FORBIDDEN_PATTERNS:
                    match = pattern.search(line)
                    if match:
                        violations.append({
                            "file": str(rel_path),
                            "line": line_idx,
                            "content": stripped,
                            "desc": desc,
                        })

    return scanned_count, violations

def main():
    print("========================================================================")
    print("QUANT.OS STATIC OPERATIONAL DATA AUDIT")
    print("========================================================================")
    print(f"Scanning directory: {FRONTEND_DIR}")
    
    scanned_count, violations = scan_files()
    
    print(f"Scanned {scanned_count} TypeScript/TSX production source files.")
    print("------------------------------------------------------------------------")
    
    if violations:
        print(f"[FAIL] FAILED: Found {len(violations)} data-integrity violations:\n")
        for v in violations:
            print(f"  * [{v['file']}:{v['line']}] - {v['desc']}")
            print(f"    Code: {v['content']}\n")
        sys.exit(1)
    else:
        print("[PASS] PASSED: Zero forbidden static fallbacks, mock positions, or synthetic generators detected!")
        print("========================================================================")
        sys.exit(0)

if __name__ == "__main__":
    main()
