#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p logs
if [[ -f .backend.pid ]] && kill -0 "$(cat .backend.pid)" 2>/dev/null; then
  echo "CROSS backend already running (PID $(cat .backend.pid))."
else
  python server/app.py > logs/backend.log 2>&1 &
  echo $! > .backend.pid
  echo "Started backend on port 8300."
fi

if [[ -f .static.pid ]] && kill -0 "$(cat .static.pid)" 2>/dev/null; then
  echo "CROSS static server already running (PID $(cat .static.pid))."
else
  python -m http.server 8301 --bind 0.0.0.0 --directory . > logs/static.log 2>&1 &
  echo $! > .static.pid
  echo "Started website server on port 8301."
fi

sleep 2
echo
echo "Backend health:"
curl -fsS http://127.0.0.1:8300/api/health || {
  echo "Backend did not respond. See logs/backend.log"
  exit 1
}
echo
echo
echo "Open in your Android browser:"
echo "http://127.0.0.1:8301/studio/editor.html"
echo "Playground:"
echo "http://127.0.0.1:8301/studio/playground.html"
