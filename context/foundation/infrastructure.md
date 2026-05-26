---
project: 10xCards
researched_at: 2026-05-21T10:00:00+02:00
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd)
  database: Supabase (external, hosted)
  adapter: "@astrojs/cloudflare@13.5.0"
---

## Recommendation

**Deploy on Cloudflare Workers.**

The project already runs Astro 6 SSR with `@astrojs/cloudflare@13.5.0` — the adapter is installed, `wrangler.jsonc` is present, and `npm run build` passes. Cloudflare scores 5/5 on all agent-friendly criteria, costs $0/month at MVP-scale traffic (100k requests/month is 3.3% of the 100k/day free limit), the user already has Cloudflare experience, and Cloudflare publishes the most comprehensive agent tooling in the field (15+ MCP servers, per-product `llms.txt`). No other platform matched this combination of zero cost, zero adapter work, and user familiarity.

## Platform Comparison

| Platform       | CLI-first | Managed/Serverless | Agent docs | Stable deploy API | MCP  | Total     |
| -------------- | --------- | ------------------ | ---------- | ----------------- | ---- | --------- |
| **Cloudflare** | Pass      | Pass               | Pass       | Pass              | Pass | **10/10** |
| Vercel         | Pass      | Pass               | Pass       | Pass              | Pass | **10/10** |
| Railway        | Pass      | Pass               | Pass       | Partial           | Pass | **9/10**  |
| Render         | Pass      | Pass               | Partial    | Pass              | Pass | **9/10**  |
| Fly.io         | Partial   | Partial            | Partial    | Partial           | Fail | **5/10**  |
| ~~Netlify~~    | —         | —                  | —          | —                 | —    | **DROP**  |

**Netlify dropped (hard filter):** `@astrojs/netlify@6.1.0` declares `peerDependencies: { "astro": "^5.0.0" }` — does not support Astro 6. Using it would require downgrading Astro or waiting for adapter update.

**CLI-first notes:** Fly.io has no native rollback command (manual image-digest lookup via `fly releases`); Railway's `railway redeploy` only re-deploys the latest version (true rollback is dashboard-only). All others: full CLI lifecycle.

**Managed/Serverless notes:** Fly.io runs managed microVMs (Firecracker), not serverless — higher operational surface than true serverless platforms; Render runs persistent Web Service containers on managed infrastructure.

**Agent docs notes:** Render has no `llms.txt` and docs are not open-sourced as markdown. Fly.io has docs on GitHub as markdown but `llms.txt` returns 404.

**Soft weights applied (interview answers):**

- Q2 (minimize cost): Fly.io dropped to bottom (no free tier). Railway at $5/month minimum. Render free tier has 60-second cold starts that break UX.
- Q3 (Cloudflare familiarity): broke the 10/10 tie between Cloudflare and Vercel in favor of Cloudflare.
- Q4 (single region fine): no effect — all platforms work for single-region.
- Q5 (co-location unknown): neutral — all platforms support external Supabase.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

The adapter is already installed at v13.5.0 (Astro 6 compatible), `wrangler.jsonc` is scaffolded, and `npm run build` produces a valid Workers bundle today. Free tier covers 100k requests/day (3M/month) with zero configuration. `wrangler` CLI is the single tool for deploy, rollback, log tailing, and secrets. Cloudflare publishes 15+ MCP servers (docs, bindings, observability, builds) and per-product `llms.txt` — the best agent tooling of any platform evaluated. User already has operational familiarity.

#### 2. Vercel

Scores identically to Cloudflare on all 5 criteria. `@astrojs/vercel@10.0.7` supports Astro 6 (`peerDeps: "astro": "^6.0.0"`), the adapter is available on npm, and the free Hobby plan covers ~500k requests/month before hitting Active CPU limits. The Vercel MCP went GA in January 2026 and `llms-full.txt` covers all docs in one file. Gap vs. Cloudflare: requires swapping the adapter, zero user familiarity, and cold starts on Hobby after periods of inactivity. Would be the recommendation if the user had no Cloudflare context.

#### 3. Railway

Strong DX-focused PaaS on Railway Metal infrastructure (EU West Amsterdam available on Hobby). Railpack auto-detects Astro SSR via `@astrojs/node` and injects `HOST=0.0.0.0` automatically. Official MCP server (GA August 2025) integrates with Claude Code, Cursor, and GitHub Copilot. Docs available as `llms-full.txt`. Gap: $5/month minimum (Hobby required for EU region), no user familiarity, no true CLI rollback (dashboard only), and requires switching from `@astrojs/cloudflare` to `@astrojs/node`. Best choice if Cloudflare's `workerd` runtime constraints ever become blocking.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **10ms CPU limit on free tier is tight for Astro 6 SSR.** Cloudflare's own docs note average Workers use 2.2ms CPU; SSR with React hydration "typically uses 10–20ms." A single server-rendered page with Supabase queries may hit the 10ms cap consistently. The first sign is error 1101 (Worker threw an exception with CPU timeout). Fix: upgrade to paid Workers ($5/month) — but this negates the "zero cost" argument.

2. **`workerd` is not Node.js — `node:fs` does not exist.** Any AI library (has_ai: true) that internally depends on filesystem access, `child_process`, or undocumented Node internals will break silently at runtime. `astro dev` and Vite may mask this during development because they run in Node. The `nodejs_compat` flag helps with crypto/buffer/stream but does not polyfill the full Node surface.

3. **`process.env` is dead in the Workers runtime.** Every third-party library (OpenAI SDK, Supabase client, etc.) that internally calls `process.env.XYZ` gets `undefined`. The project currently reads `SUPABASE_URL`/`SUPABASE_KEY` via `astro:env/server` (which works), but any new AI library added may fail silently until a runtime error surfaces in production.

4. **3MB bundle limit on the free plan.** Astro 6 + React 19 + `@supabase/supabase-js@2.106` + any AI SDK can approach or exceed 3MB. Verify with `du -sh dist/_worker.js` after build. Exceeding 3MB requires paid plan ($5/month) just to deploy — independent of request volume.

5. **Cloudflare Auto Minify breaks React 19 hydration.** Enabling Auto Minify in the Cloudflare dashboard (Speed → Optimization) mangles HTML and causes React 19 `Hydration completed but contains mismatches` errors across the app. This setting must be explicitly disabled — it is not mentioned in any starter guide or CLI tool.

### Pre-Mortem — How This Could Fail

The team shipped the MVP on Cloudflare Workers free tier. Within six weeks, dashboard pages that aggregated flashcard data triggered CPU timeout errors on 20–30% of requests — the Supabase query + response formatting pushed the SSR render past the 10ms CPU cap. Upgrading to the paid Workers plan ($5/month) fixed this for three weeks.

Then: an OpenAI client library upgrade. The new version used `node:crypto.getRandomValues` via an internal `CryptoProvider` abstraction that behaved differently under `workerd` than under Node.js. The bug manifested on 25% of AI generation requests — non-deterministically, depending on which V8 isolate cold-started. `astro dev` was clean because Vite ran under Node. Three hours of debugging before tracing it to the runtime difference.

Finally: the Workers bundle grew to 3.9MB after adding a spaced repetition algorithm library (SM-2 implementation with bundled test data). `wrangler deploy` began failing with "Script too large." Tree-shaking required a week of effort to bring the bundle under 3MB. During that week, deployments were blocked and the paid Workers plan's 10MB limit was needed — raising the effective cost.

The incorrect assumption throughout: that "it works in dev" meant "it works in production." The `workerd` runtime's divergence from Node.js created a class of bugs invisible until production.

### Unknown Unknowns

- **Pages deploy vs. Workers deploy — the starter is ambiguous.** The repo has `wrangler.jsonc` (Workers config format) but was scaffolded as a Cloudflare Pages project. `wrangler pages deploy` ignores the `--config` flag and doesn't read `wrangler.jsonc`. Astro 6 docs now recommend `wrangler deploy` (Workers + Static Assets), not `wrangler pages deploy`. This distinction needs to be resolved before the first production deploy — running the wrong command deploys to the wrong product.

- **`astro:env/server` and Cloudflare Bindings are two separate systems with no unified API.** `SUPABASE_URL` and `SUPABASE_KEY` work via `astro:env/server`. If you add Workers AI, KV, R2, or D1, those bindings are accessible only via `Astro.locals.runtime.env.MY_BINDING` — not via `astro:env`. Mixing both systems in the same project creates two access patterns for "environment configuration."

- **Wrangler config is JSONC; 90% of tutorials and StackOverflow answers use TOML.** Copy-pasting from official docs or community answers without converting to JSONC format causes silent configuration errors. The TOML and JSONC key names are identical but the syntax is not.

- **Smart Placement (routing Workers to the region nearest your Supabase DB) is Enterprise-only.** There is no way to force Workers execution to a specific region on Free/Paid tier. At MVP scale with Polish users, the Frankfurt PoP handles requests — fast. But if the app goes global, Workers may execute from US PoPs while Supabase is in EU, adding 150–250ms to every DB-backed SSR render. Fixing this requires Enterprise Data Localization Suite.

- **Adapter version must be v13+ for Astro 6.** Verified: `@astrojs/cloudflare@13.5.0` is installed ✅. If `npm install` is run fresh from a clone without `--ignore-scripts` and the lockfile resolves differently, verify the adapter version before assuming Astro 6 compatibility.

## Operational Story

- **Preview deploys:** Cloudflare Workers Versions (`wrangler versions deploy`) creates a versioned deployment reachable at a unique `*.workers.dev` URL before promoting to production. Requires `wrangler.jsonc` in Workers mode (not Pages). Alternative: Cloudflare Pages git integration auto-creates preview URLs per branch at `<branch>.<project>.pages.dev` — protected by Cloudflare Access on paid plans, public on free.

- **Secrets:** Set via `wrangler secret put KEY` (interactive) or `echo "value" | wrangler secret put KEY` (CI-friendly). Secrets are encrypted at rest in Cloudflare's vault and injected into the Workers runtime — never visible in plaintext after upload. For local dev: `.dev.vars` file (already present in this project, gitignored). Rotate by re-running `wrangler secret put KEY` with the new value.

- **Rollback:** `npx wrangler rollback` (defaults to previous version) or `npx wrangler rollback <VERSION_ID>` for a specific version. Lists versions: `npx wrangler versions list`. Typical time-to-rollback: <30 seconds. DB migrations (Supabase) do not roll back automatically — coordinate schema changes with app rollbacks manually.

- **Approval:** Agents may run `wrangler deploy` and `wrangler rollback` unattended with a `CLOUDFLARE_API_TOKEN` set in the environment. Actions requiring a human: billing tier changes (dashboard only), domain routing changes that affect DNS, enabling/disabling Cloudflare Access rules, rotating the primary API token.

- **Logs:** Real-time: `npx wrangler tail` (streams structured JSON, max 10 concurrent sessions, up to 24h on free). Filter by status: `npx wrangler tail --status error`. Structured log retention: 200k events/day, 3 days on free tier; 7 days on paid. MCP alternative: `observability.mcp.cloudflare.com/mcp` provides structured log queries without CLI.

## Risk Register

| Risk                                                                                      | Source           | Likelihood | Impact | Mitigation                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ---------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10ms CPU limit exceeded by Astro SSR on free tier                                         | Devil's advocate | High       | High   | Run `wrangler tail` in production and monitor CPU time. If p95 >8ms, upgrade to paid Workers ($5/month). Budget this as likely.                                                |
| AI library uses `node:fs` or Node-only internals; breaks silently in workerd              | Devil's advocate | Medium     | High   | Audit every new AI/utility dependency with `npx wrangler dev` before committing. Check for `node:fs`, `child_process`, `os` usage.                                             |
| `process.env` access in third-party library returns `undefined`                           | Devil's advocate | Medium     | Medium | Wrap all third-party client initialization in explicit env-var injection rather than relying on `process.env`. Add a startup check that throws if required vars are undefined. |
| Workers bundle exceeds 3MB free-tier limit                                                | Devil's advocate | Medium     | High   | After each significant dependency addition, run `du -sh dist/_worker.js`. Set a CI check that fails if bundle >2.8MB to give headroom.                                         |
| React 19 hydration broken by Cloudflare Auto Minify dashboard setting                     | Devil's advocate | Low        | High   | Document "disable Auto Minify" as a required setup step. Add to AGENTS.md. Verify after any Cloudflare dashboard change.                                                       |
| `workerd` runtime divergence causes prod-only bugs invisible in dev                       | Pre-mortem       | Medium     | High   | Always test with `wrangler dev` (workerd runtime), not just `astro dev` (Node), before deploying AI-related features.                                                          |
| Pages deploy vs Workers deploy confusion on first production push                         | Unknown unknowns | High       | Medium | Decide on deployment model before first push: use `wrangler deploy` (Workers + Static Assets, recommended for Astro 6), not `wrangler pages deploy`. Document in AGENTS.md.    |
| Dual env-var access pattern (`astro:env` vs `locals.runtime.env`) causes misconfiguration | Unknown unknowns | Medium     | Medium | Add a comment in `src/lib/supabase.ts` explaining which system to use for which type of config. Bindings: `locals.runtime.env`. Plain secrets: `astro:env/server`.             |

## Getting Started

1. **Verify deployment model** — the repo uses `wrangler.jsonc` (Workers format). Deploy with:

   ```bash
   npm run build
   npx wrangler deploy
   ```

   Do **not** use `wrangler pages deploy` — it ignores `wrangler.jsonc` and deploys to the wrong Cloudflare product.

2. **Push secrets to Cloudflare:**

   ```bash
   echo "your-supabase-url" | npx wrangler secret put SUPABASE_URL
   echo "your-supabase-anon-key" | npx wrangler secret put SUPABASE_KEY
   ```

3. **Verify bundle size before each deploy:**

   ```bash
   npm run build && Get-Item dist/_worker.js | Select-Object -ExpandProperty Length
   ```

   If output >3,000,000 bytes (3MB), the free plan will reject the deploy — upgrade to paid or reduce bundle.

4. **Set up log tailing for post-deploy validation:**

   ```bash
   npx wrangler tail --status error
   ```

   Run this for 10 minutes after first production deploy. If you see 1101 errors, SSR CPU is exceeding the 10ms limit.

5. **Disable Cloudflare Auto Minify** in the Cloudflare dashboard: Speed → Optimization → Content Optimization → Auto Minify → uncheck all three boxes (HTML, CSS, JS). Required to prevent React 19 hydration errors.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (GitHub Actions workflows for `wrangler deploy`)
- Production-scale architecture (multi-region, HA, Cloudflare Enterprise Data Localization)
