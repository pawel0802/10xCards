# Deploy Plan — 10xCards (First Production Deployment)

**Platform:** Cloudflare Workers + Static Assets  
**Deployment command:** `wrangler deploy` (NOT `wrangler pages deploy`)  
**Researched in:** `context/foundation/infrastructure.md`  
**Status:** ✅ First deploy completed — https://10x-cards.pawel0802.workers.dev

---

## Corporate Network Note

All `wrangler` commands must be prefixed with the following on Windows behind a corporate proxy with SSL inspection:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

`wrangler login` (OAuth browser flow) **does not work** on the corporate network. Use a Cloudflare API Token instead:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CLOUDFLARE_API_TOKEN = "your-api-token"
npx wrangler whoami  # verify auth
```

`.dev.vars` is **local dev only** — wrangler never reads it during `wrangler deploy`. Secrets must be pushed to Cloudflare Vault separately (see Phase 2).

---

## Pre-deploy Audit

### Gaps found vs. infrastructure.md recommendations

| #   | Gap                                                               | Status        | Resolution                                                           |
| --- | ----------------------------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| G1  | `wrangler.jsonc` name was `"10x-astro-starter"` (starter default) | ✅ Fixed      | Renamed to `"10x-cards"`                                             |
| G2  | No Cloudflare API token for CI                                    | ✅ Fixed      | Token generated, added as `CLOUDFLARE_API_TOKEN` repo secret         |
| G3  | CI workflow had no deploy step                                    | ✅ Fixed      | `.github/workflows/deploy.yml` added                                 |
| G4  | No bundle size guard in CI                                        | ✅ Fixed      | Bundle check added to `deploy.yml`                                   |
| G5  | Cloudflare Auto Minify not documented as disabled                 | ✅ Documented | See Phase 5 — required after custom domain attached                  |
| G6  | Supabase secrets not yet in Cloudflare Vault                      | ✅ Fixed      | Pushed via `wrangler secret put`                                     |
| G7  | SESSION KV binding auto-provisioned without id                    | ✅ Fixed      | `wrangler.jsonc` updated with `id: 940493403a3a41c18e04383935e9e05a` |

---

## Phase 1 — Configuration Fixes ✅

### 1.1 Worker name in `wrangler.jsonc`

```jsonc
{
  "name": "10x-cards",  // production subdomain: 10x-cards.pawel0802.workers.dev
  ...
  "kv_namespaces": [
    {
      "binding": "SESSION",
      "id": "940493403a3a41c18e04383935e9e05a"  // auto-provisioned on first deploy
    }
  ]
}
```

> **Why the KV id matters:** Without `id`, wrangler tries to create a new `10x-cards-session` namespace on every deploy and fails with `code: 10014` (already exists). The id locks it to the existing namespace.

---

## Phase 2 — Secrets & Credentials ✅

### 2.1 Push Supabase secrets to Cloudflare Workers Vault

Run once. Secrets persist in Cloudflare — no need to repeat on future deploys.

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CLOUDFLARE_API_TOKEN = "your-api-token"

# Values taken from .dev.vars — never commit these
echo "https://ienydkltkzzxsxvtquxe.supabase.co" | npx wrangler secret put SUPABASE_URL
echo "<your-supabase-anon-key>" | npx wrangler secret put SUPABASE_KEY

# Verify
npx wrangler secret list
```

### 2.2 Cloudflare API Token for CI/CD ✅

1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Template: **"Edit Cloudflare Workers"**
3. Add to GitHub repo secrets:
   - `CLOUDFLARE_API_TOKEN` — the token value
   - `CLOUDFLARE_ACCOUNT_ID` — found in Cloudflare dashboard right sidebar

---

## Phase 3 — Bundle Size Verification ✅

**Current size: ~1.88 MB server bundle (well within 3MB free-tier limit)**

Re-check after any significant dependency addition:

```powershell
npm run build

# Windows (PowerShell) — check server bundle total
$size = (Get-ChildItem dist\server -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Server bundle: $([math]::Round($size/1MB, 2)) MB"
if ($size -gt 2949120) { Write-Error "Exceeds 2.8MB threshold!" }
```

CI bundle check uses `du -sb dist/server/` in `deploy.yml` (Ubuntu runner).

---

## Phase 4 — Deploy ✅

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CLOUDFLARE_API_TOKEN = "your-api-token"

# Build
npm run build

# Deploy
npx wrangler deploy
```

**First deploy output:**

```
Total Upload: 1919.97 KiB / gzip: 392.75 KiB
Uploaded 10x-cards (16.47 sec)
Deployed 10x-cards triggers (6.02 sec)
  https://10x-cards.pawel0802.workers.dev
Current Version ID: c0564ad0-0f08-429d-b5a9-5d56c193074b
```

---

## Phase 5 — Post-Deploy Validation

### 5.1 Smoke test

> ⚠️ **Cannot be executed from corporate network** — Cloudflare Workers URLs are blocked by the Commerzbank firewall proxy. Test manually in a browser or from a mobile device/home network.

URL to test: **https://10x-cards.pawel0802.workers.dev**

| Route          | Expected                          |
| -------------- | --------------------------------- |
| `/`            | 200 or redirect to `/auth/signin` |
| `/auth/signin` | 200 — sign-in form                |
| `/auth/signup` | 200 — sign-up form                |

### 5.2 Error monitoring

> ⚠️ `wrangler tail` also blocked by corporate proxy. Run from outside the corporate network:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CLOUDFLARE_API_TOKEN = "your-api-token"
npx wrangler tail --status error
```

Watch for:

- **Error 1101** → CPU timeout (10ms free tier limit). Fix: upgrade to Workers Paid ($5/month).
- **500 errors** → Supabase client misconfiguration or missing secrets.

Alternative: check logs in Cloudflare Dashboard → Workers & Pages → 10x-cards → Logs (no proxy issues).

### 5.3 Disable Cloudflare Auto Minify

**Required to prevent React 19 hydration mismatches — only relevant once a custom domain is attached.**

1. Cloudflare Dashboard → your zone → Speed → Optimization → Content Optimization → Auto Minify
2. Uncheck **HTML**, **CSS**, **JavaScript** → Save

> Not applicable on `workers.dev` subdomain (no zone settings available).

---

## Phase 6 — CI/CD: Automated Deploy Workflow ✅

`.github/workflows/deploy.yml` — runs on every push to `master`:

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
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
          SIZE=$(du -sb dist/server/ | cut -f1)
          echo "Server bundle: $(echo "scale=2; $SIZE / 1048576" | bc) MB"
          if [ "$SIZE" -gt 2949120 ]; then
            echo "::error::Bundle exceeds 2.8MB (${SIZE} bytes)"
            exit 1
          fi
      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

> `NODE_TLS_REJECT_UNAUTHORIZED` is **not needed in CI** — GitHub Actions runners connect to Cloudflare without a corporate proxy.

---

## Phase 7 — Custom Domain (Optional, Post-MVP)

Via Dashboard: Workers & Pages → 10x-cards → Triggers → Custom Domains → Add.

Once attached: complete Phase 5.3 (disable Auto Minify for the zone).

---

## Rollback Procedure

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CLOUDFLARE_API_TOKEN = "your-api-token"

npx wrangler versions list          # list recent versions
npx wrangler rollback               # roll back to previous version (<30s)
npx wrangler rollback <VERSION_ID>  # roll back to specific version
```

> DB migrations (Supabase) do NOT roll back automatically. Prefer additive schema changes.

---

## Risk Mitigations

| Risk                                     | Status        | Mitigation                                                                        |
| ---------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| 10ms CPU limit on free tier              | ⚠️ Monitor    | Check Cloudflare Dashboard logs; upgrade to paid ($5/month) if 1101 errors appear |
| Workers bundle >3MB                      | ✅ Guarded    | Bundle check in Phase 3 (manual) and `deploy.yml` (CI)                            |
| React 19 hydration broken by Auto Minify | ✅ Documented | Phase 5.3 — disable after custom domain attached                                  |
| SESSION KV namespace conflict on deploy  | ✅ Fixed      | KV `id` committed to `wrangler.jsonc`                                             |
| `wrangler` failing on corporate network  | ✅ Documented | Use `$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"` + API token                         |

---

## Execution Order Checklist

- [x] **P1:** `wrangler.jsonc` — name `"10x-cards"`, SESSION KV id added
- [x] **P2a:** Supabase secrets pushed to Cloudflare Vault via `wrangler secret put`
- [x] **P2b:** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` added to GitHub Secrets
- [x] **P3:** Build verified — server bundle ~1.88 MB (< 2.8 MB limit)
- [x] **P4:** First deploy — https://10x-cards.pawel0802.workers.dev (version `c0564ad0`)
- [ ] **P5:** Smoke test — verify manually in browser / mobile (corporate network blocks curl/wrangler tail)
- [ ] **P5.3:** Disable Auto Minify — required after custom domain attached
- [x] **P6:** `.github/workflows/deploy.yml` committed — automated CD on push to `master`
