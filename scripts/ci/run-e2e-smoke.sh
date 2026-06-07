#!/usr/bin/env bash
set -euo pipefail

echo "Building app..."
npm run build

# Wymuszenie załadowania sekretów przez silnik Cloudflare / Astro Preview
echo "Writing production vars for Cloudflare adapter..."
mkdir -p dist/server
cat > dist/server/.dev.vars <<EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
EOF

echo "Running Playwright smoke spec..."
export DEBUG=${DEBUG:-pw:webserver}
npx playwright test tests/e2e/smoke.spec.ts --project=chromium --reporter=list
