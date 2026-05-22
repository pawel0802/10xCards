---
bootstrapped_at: 2026-05-20T07:54:54Z
rescaffolded_at: 2026-05-21T00:00:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: 10x-cards
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: 10x-cards
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

10xCards is a solo, after-hours web-app with a hard 3-week deadline — the exact profile the 10x Astro Starter was designed for. Supabase covers FR-001 (user registration and login) without custom auth plumbing. Astro API routes provide a clean, typed surface to proxy AI flashcard generation (FR-002), keeping secrets server-side. React islands handle the interactive review and spaced repetition UI (FR-003–FR-006) while keeping the default bundle lean. Tailwind CSS 4 and TypeScript project-wide enforce the agent-friendly contract (typed, convention-based, popular in training data, well-documented) across all four quality gates. Cloudflare Pages is the natural deploy target — zero-config with the included `@astrojs/cloudflare` adapter, free tier sufficient for a medium-scale MVP.

## Pre-scaffold verification

| Signal      | Value                                                      | Severity | Notes                                                   |
| ----------- | ---------------------------------------------------------- | -------- | ------------------------------------------------------- |
| npm package | not run                                                    | n/a      | cmd_template starts with `git clone`; npm check skipped |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17 | fresh    | within 3 months of scaffold date                        |

## Scaffold log (run — 2026-05-20)

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install --ignore-scripts --registry https://registry.npmjs.org`
**Strategy**: git-clone (clone into temp directory, strip git history, move files up)
**Exit code**: 0
**Files moved**: 20
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently (no .gitignore existed in cwd)
**.bootstrap-scaffold cleanup**: deleted

**Note on corporate network workarounds applied:**
- Used `--registry https://registry.npmjs.org` to bypass corporate Nexus proxy (which quarantined `devalue@5.8.0`)
- Used `--ignore-scripts` to skip the `supabase` package's postinstall binary download (GitHub release URL unreachable from corporate network). The Supabase CLI binary should be installed separately when needed for local dev (`supabase start`, migrations, etc.).

## Post-scaffold audit

**Tool**: `npm audit`
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: not distinguished by this tool

No vulnerabilities found (0 across installed packages in cwd — cwd's existing `node_modules` was audited, not the re-cloned scaffold).

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | true                 |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- Install the Supabase CLI separately (e.g. `scoop install supabase` or download from https://github.com/supabase/cli/releases) when you need `supabase start` for local dev.
- Review `.env.example` and create `.env` with your Supabase project URL and anon key.
- `npm run dev` to start the Astro dev server.
- Commit the scaffold: `git add -A && git commit -m "scaffold 10x-astro-starter"`.
