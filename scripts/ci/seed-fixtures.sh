#!/usr/bin/env bash
set -euo pipefail

echo "Seeding fixtures (adapt this script to your schema)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install via 'npm i -g supabase' or adjust this script to use psql/curl."
  exit 0
fi

if [ -f supabase/seeds/test-fixtures.sql ]; then
  echo "Applying supabase seed: supabase/seeds/test-fixtures.sql"
  npx supabase db query < supabase/seeds/test-fixtures.sql
else
  echo "No supabase/seeds/test-fixtures.sql found. Please add seed SQL or update this script."
fi
