#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

for file in .backend.pid .static.pid; do
  if [[ -f "$file" ]]; then
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "Stopped process $pid."
    fi
    rm -f "$file"
  fi
done
echo "CROSS local servers stopped."
