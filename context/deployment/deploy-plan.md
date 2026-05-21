# Deploy Plan — 10xCards (First Production Deployment)

**Platform:** Cloudflare Workers + Static Assets  
**Deployment command:** `wrangler deploy` (NOT `wrangler pages deploy`)  
**Researched in:** `context/foundation/infrastructure.md`

---

## Pre-deploy Audit

### Gaps found vs. infrastructure.md recommendations

| # | Gap | Status | Action |
|---|-----|--------|--------|
| G1 | `wrangler.jsonc` name is `"10x-astro-starter"` (starter default) | ❌ | Rename to `"10x-cards"` |
| G2 | No Cloudflare API token for CI | ❌ | Generate token, add as repo secret |
| G3 | CI workflow has no deploy step | ❌ | Add `deploy.yml` for production deploys |
| G4 | No bundle size guard in CI | ❌ | Add check: fail if `dist/_worker.js > 2.8MB` |
| G5 | Cloudflare Auto Minify not documented as disabled | ❌ | Add to checklist + AGENTS.md |
| G6 | Supabase secrets not yet in Cloudflare Vault | ❌ | Push via `wrangler secret put` |
| G7 | `wrangler tail` post-deploy monitoring not scripted | ❌ | Document as manual step |

---

## Phase 1 — Configuration Fixes

### 1.1 Fix worker name in `wrangler.jsonc`

```jsonc
// wrangler.jsonc — change name from starter default to production name
{
  "name": "10x-cards",   // was: "10x-astro-starter"
  ...
}
```

> **Why:** The `name` field becomes the subdomain: `10x-cards.workers.dev`. The starter default would create a confusing production URL.

---

## Phase 2 — Secrets & Credentials

### 2.1 Push Supabase secrets to Cloudflare Workers Vault

Run once (interactive, requires `wrangler` login):

```bash
# Authenticate if not already logged in
npx wrangler login

# Push secrets (taken from .dev.vars — never commit these)
echo "https://ienydkltkzzxsxvtquxe.supabase.co" | npx wrangler secret put SUPABASE_URL
echo "<your-supabase-anon-key>" | npx wrangler secret put SUPABASE_KEY
```

> **Security note:** `.dev.vars` is gitignored and contains the real values. The anon key is safe to expose client-side per Supabase architecture, but treat it as a secret to allow rotation without code changes.

### 2.2 Generate Cloudflare API Token for CI/CD

1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Use template: **"Edit Cloudflare Workers"**
3. Scope: Account = your account, Zone Resources = All zones (or restrict to specific zone)
4. Copy the token value
5. Add to GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: the token

> Also add `CLOUDFLARE_ACCOUNT_ID` (found in the Cloudflare dashboard right sidebar).

---

## Phase 3 — Bundle Size Verification

Run before every deploy to avoid hitting the 3MB free-tier hard limit:

```bash
npm run build

# Windows (PowerShell)
$size = (Get-Item dist\_worker.js).Length
Write-Host "Bundle size: $([math]::Round($size/1MB, 2)) MB"
if ($size -gt 2949120) { Write-Error "Bundle exceeds 2.8MB threshold!" }

# Unix/CI
du -sh dist/_worker.js
```

**Current expected size:** <1MB (no AI SDK bundled yet). Re-check after adding any AI library.

---

## Phase 4 — First Manual Deploy

```bash
# 1. Verify login
npx wrangler whoami

# 2. Build
npm run build

# 3. Check bundle size (see Phase 3)

# 4. Deploy to production
npx wrangler deploy

# Expected output:
#   Uploaded 10x-cards (X sec)
#   Deployed 10x-cards triggers (X sec)
#   https://10x-cards.<account-subdomain>.workers.dev
```

---

## Phase 5 — Post-Deploy Validation

### 5.1 Smoke test

```bash
curl -I https://10x-cards.<account>.workers.dev/
# Expect: HTTP/2 200

curl -I https://10x-cards.<account>.workers.dev/auth/signin
# Expect: HTTP/2 200
```

### 5.2 Error monitoring (run for 10 minutes post-deploy)

```bash
npx wrangler tail --status error
```

Watch for:
- **Error 1101** → CPU timeout (10ms limit exceeded). Fix: upgrade to Workers Paid ($5/month).
- **500 errors** → likely `process.env` undefined in a dependency or Supabase client misconfiguration.

### 5.3 Disable Cloudflare Auto Minify (manual, dashboard)

**Required to prevent React 19 hydration mismatches.**

1. Cloudflare Dashboard → your domain (if using custom domain) or account → Workers & Pages → 10x-cards
2. Speed → Optimization → Content Optimization → Auto Minify
3. Uncheck **HTML**, **CSS**, **JavaScript**
4. Save

> If you are on the `workers.dev` subdomain only (no custom domain), this setting is not reachable yet and will only matter once you attach a domain.

---

## Phase 6 — CI/CD: Automated Deploy Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: []   # runs independently; rely on branch protection requiring CI to pass first
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

      - name: Check bundle size
        run: |
          SIZE=$(stat -c%s dist/_worker.js)
          echo "Bundle size: $(( SIZE / 1024 ))KB"
          if [ "$SIZE" -gt 2949120 ]; then
            echo "::error::Bundle exceeds 2.8MB threshold (${SIZE} bytes)"
            exit 1
          fi

      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

> **Note:** Existing `ci.yml` runs on every push + PR (lint + build). This deploy workflow runs on push to master only. Branch protection rules should require `ci` to pass before merge — deploy happens after merge.

---

## Phase 7 — Custom Domain (Optional, Post-MVP)

```bash
# Attach a custom domain to the Worker via wrangler
npx wrangler deploy --routes "yourdomain.com/*"
```

Or via Dashboard: Workers & Pages → 10x-cards → Triggers → Custom Domains → Add.

Once custom domain is attached: **revisit Phase 5.3** (Auto Minify) as the setting becomes accessible per-zone.

---

## Rollback Procedure

```bash
# List recent versions
npx wrangler versions list

# Roll back to previous version (instant, <30s)
npx wrangler rollback

# Roll back to specific version
npx wrangler rollback <VERSION_ID>
```

> DB migrations (Supabase) do NOT roll back automatically. Coordinate schema changes with app rollbacks manually. Prefer additive migrations (new columns/tables) over destructive ones to make rollback safe.

---

## Risk Mitigations (from infrastructure.md Risk Register)

| Risk | Status | Mitigation Applied |
|------|--------|--------------------|
| 10ms CPU limit on free tier | ⚠️ Monitor | `wrangler tail --status error` post-deploy; upgrade if 1101 errors appear |
| Workers bundle >3MB | ✅ Guarded | Bundle size check in Phase 3 and Phase 6 CI |
| React 19 hydration broken by Auto Minify | ✅ Documented | Phase 5.3 — explicit disable step |
| `wrangler pages deploy` vs `wrangler deploy` confusion | ✅ Resolved | All commands in this plan use `wrangler deploy` |
| Dual env-var access pattern | ✅ Noted | Supabase uses `astro:env/server`; Cloudflare Bindings use `locals.runtime.env` |

---

## Execution Order Checklist

- [ ] **P1:** Rename `wrangler.jsonc` name to `"10x-cards"`
- [ ] **P2a:** `npx wrangler login` → push secrets to Cloudflare Vault
- [ ] **P2b:** Generate Cloudflare API Token → add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` to GitHub Secrets
- [ ] **P3:** `npm run build` → verify bundle <2.8MB
- [ ] **P4:** `npx wrangler deploy` → first production deploy
- [ ] **P5a:** Smoke test the `*.workers.dev` URL
- [ ] **P5b:** `npx wrangler tail --status error` for 10 minutes
- [ ] **P5c:** Disable Auto Minify in Cloudflare Dashboard (if custom domain attached)
- [ ] **P6:** Commit `.github/workflows/deploy.yml` to automate future deploys
