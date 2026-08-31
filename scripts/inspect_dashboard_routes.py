import re

def search_file(filename, pattern):
    print(f"=== Searching '{pattern}' in {filename} ===")
    regex = re.compile(pattern, re.IGNORECASE)
    with open(filename, "r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, 1):
            if regex.search(line):
                print(f"{i:5d}: {line.strip()}")

# 1. Search for bots endpoints
search_file("dashboard.py", r"@app\.route\([\"']/api/bots")

# 2. Search for status endpoints
search_file("dashboard.py", r"@app\.route\([\"']/(api/)?status")

# 3. Search for pnl endpoints
search_file("dashboard.py", r"@app\.route\([\"']/(api/)?pnl")
