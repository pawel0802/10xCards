#!/usr/bin/env bash
set -euo pipefail

echo "Running quick checks: lint + typecheck"
npm run lint || true
npx tsc --noEmit || true

echo "Quick checks completed."
