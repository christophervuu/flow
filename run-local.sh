#!/usr/bin/env bash
set -e

if [ -z "${GITHUB_TOKEN}" ]; then
  echo "Error: GITHUB_TOKEN environment variable is required. Set it with a PAT that has GitHub Models (models: read) access."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Ensure flow-web dependencies
if [ ! -d "flow-web/node_modules" ]; then
  echo "Installing flow-web dependencies..."
  (cd flow-web && npm install)
fi

cleanup() {
  echo "Shutting down..."
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting flow-api on http://localhost:5180 ..."
dotnet run --project flow-api &
API_PID=$!

echo "Starting flow-web on http://localhost:5173 ..."
(cd flow-web && npm run dev) &
WEB_PID=$!

echo "Flow is running. API: http://localhost:5180  Web: http://localhost:5173"
echo "Press Ctrl+C to stop both."
wait
