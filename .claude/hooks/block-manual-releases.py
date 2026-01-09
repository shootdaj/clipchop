#!/usr/bin/env python3
"""Block manual release commands - deployment is automatic via GitHub Actions."""
import json
import re
import sys

try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)

command = input_data.get("tool_input", {}).get("command", "")
if not command:
    sys.exit(0)

BLOCKED = [
    (r"gh\s+release\s+create", "gh release create"),
    (r"git\s+tag\s+v", "git tag v*"),
]

for pattern, name in BLOCKED:
    if re.search(pattern, command):
        print(f"BLOCKED: {name}", file=sys.stderr)
        print("Deployment is automatic. Just push to master.", file=sys.stderr)
        sys.exit(2)

sys.exit(0)
