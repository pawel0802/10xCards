#!/usr/bin/env bash
set -euo pipefail

echo "Building app..."
npm run build

echo "Starting preview server..."
npm run preview -- --port 4173 &
SERVER_PID=$!

echo "Waiting for server to respond on http://localhost:4173 ..."
for i in {1..30}; do
  if curl -sSf http://localhost:4173/ >/dev/null 2>&1; then
    echo "Server is up"
    break
  fi
  sleep 1
done

echo "Running Playwright smoke spec..."
npx playwright test tests/e2e/smoke.spec.ts --project=chromium --reporter=list
EXIT_CODE=$?

echo "Stopping server..."
kill $SERVER_PID || true
wait $SERVER_PID 2>/dev/null || true

exit $EXIT_CODE
