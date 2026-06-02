# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-02

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e feels safer. Do not add a
   broad provider smoke if a narrower app-layer test already proves the
   behavior.
2. **User concerns are first-class evidence.** Risks anchored in “the team is
   worried about X, and the failure would surface somewhere in Y” carry the
   same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents what
   could fail and why we believe it's likely — drawn from documents,
   interview, and codebase signal (churn, structure, test base). It does NOT
   claim to know which line owns the failure. That knowledge is produced by
   `/10x-research` during each rollout phase. If the plan and research
   disagree about where the failure lives, research is the ground truth.

Hot-spot scope used for likelihood weighting: `src`, `supabase/migrations`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by risk
= impact × likelihood. Risks are failure scenarios in user / business terms,
not test names. The Source column cites the evidence that surfaced the risk —
never a specific file as where the failure lives.

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | AI generation fails or returns unusable candidates, so logged-in users cannot create useful cards | High | High | PRD FR-002/FR-003/US-01 (37-61, 69-76); roadmap S-01 (78-90); interview Q1; hot-spot dirs `src/components` (99 commits/30d), `src/lib` (14 commits/30d) |
| 2 | Flashcard list pagination regresses and hides or duplicates cards during list/edit work | High | High | PRD FR-005 (81-84); roadmap S-03 (104-114); interview Q4; hot-spot dirs `src/components` (99), `src/pages` (49) |
| 3 | Review sessions surface the wrong cards or fail to advance scheduling correctly after answers | High | High | PRD FR-006 (85-86); roadmap S-04 (116-127); interview Q3; hot-spot dirs `src/components` (99), `src/lib` (14) |
| 4 | Accepted or edited flashcards do not persist reliably, or come back under the wrong user | High | Medium | PRD guardrails + FR-003/FR-005 (46-47, 73-84); roadmap F-01/S-02/S-03 (63-114); hot-spot dirs `supabase/migrations` (5), `src/pages` (49) |
| 5 | One user can see or modify another user's flashcards, or content leaks through boundaries or logs | High | Medium | PRD access control + privacy guardrails (46-47, 102-108); AGENTS RLS rule (11); hot-spot dirs `supabase/migrations` (5), `src/lib` (14) |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Pasted study text reliably produces reviewable candidates, and the user can continue without a dead-end | “A successful provider response means the user got useful cards” | Generation request/response boundary, candidate acceptance state, error path when generation fails | integration + focused UI check | oracle tests that copy expected cards from the implementation or prompt |
| #2 | Paging through a large card set never drops, duplicates, or misorders user-owned cards after edits | “The first page looks right, so pagination is fine” | List query/page boundary, ownership filter, edit-after-list flow | integration | snapshot-only list tests or mocked in-memory state that never exercises paging |
| #3 | A review session serves due cards in the right order and advances scheduling based on actual answers | “A finished session means scheduling was correct” | Session state, review result persistence, SR update boundary | unit + integration | asserting the current scheduling formula from production code |
| #4 | Accepted or edited cards survive reload/session and remain attached to the same user | “A 200 response means persistence happened” | Write transaction, read-after-write boundary, auth context | integration | testing only local component state without verifying persistence |
| #5 | One authenticated user cannot read or update another user's cards, and sensitive data stays out of responses or logs | “Logged in is enough” | Session/auth boundary, RLS policy, server-side validation | integration / contract | client-side-only filtering or over-mocking Supabase/Cloudflare behavior |

Challenger findings: provider-specific tests for Supabase and Cloudflare were excluded from the top risks per user preference; they belong in infra/monitoring, not the phased product-test rollout.

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder via
`/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path coverage | Prove generation and persistence on the cheapest path | #1, #4 | unit + integration | implementing | context/changes/testing-critical-path-coverage/ |
| 2 | Pagination and review integration | Prove card list paging and review-session progression stay correct under churn | #2, #3 | integration | not started | — |
| 3 | Security and ownership coverage | Prove user isolation and persistence boundaries stay intact | #5 | integration + contract | not started | — |
| 4 | Quality-gates wiring | Lock the floor in CI and add a narrow end-to-end smoke for the happy path | cross-cutting | gates + e2e smoke | not started | — |

| Value | Meaning |
|-------|---------|
| `not started` | No change folder for this rollout phase yet. |
| `change opened` | `context/changes/<id>/` exists with `change.md`; research not done. |
| `researched` | `research.md` exists in the change folder. |
| `planned` | `plan.md` exists with a `## Progress` section. |
| `implementing` | Progress section has at least one `[x]` and at least one `[ ]`. |
| `complete` | Progress section is fully `[x]`. |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.

| Layer | Tool | Version | Notes |
|------|------|---------|------|
| unit + integration | Vitest | 4.1.7 | Configured with `jsdom` and `src/setupTests.ts`; suite is sparse but real |
| API mocking | none yet | n/a | No dedicated network-mocking layer in the repo yet; use focused fakes/fixtures where needed |
| e2e | none yet | n/a | No browser suite yet; phase 4 adds only a narrow smoke if it adds signal |
| accessibility | none yet | n/a | Not wired for this MVP rollout |
| (optional) AI-native | none yet — see §3 Phase 4 | n/a | User explicitly does not want budget spent on provider-specific checks |

**Stack grounding tools (current session):**
- Docs: none available in current session — no Context7 or framework docs MCP exposed; checked: 2026-06-02
- Search: none available in current session — no Exa.ai or equivalent search MCP exposed; checked: 2026-06-02
- Runtime/browser: none used — no browser automation tool was needed for Phase 1; checked: 2026-06-02
- Provider/platform: GitHub MCP available for CI/PR inspection; not used; checked: 2026-06-02

Use docs MCPs for current framework/library APIs and setup details. Use
search MCPs for discovery or current status only, then prefer official docs
as the evidence. Do not use MCP docs/search to infer code failure anchors;
those belong in per-phase `/10x-research`.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
“Required for §3 Phase <N>” means the gate is enforced once that rollout
phase lands; before that, the gate is planned.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required | syntactic and type drift |
| unit + integration | local + CI | required after §3 Phase 1 | generation, pagination, review, persistence regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 4 | broken sign-up → generate → review paths |
| post-edit hook | local (agent loop) | recommended after §3 Phase 4 | regressions at edit time |
| pre-prod smoke | between merge + prod | optional after §3 Phase 4 | environment-specific failures |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once the
relevant rollout phase ships; before that, the sub-section reads “TBD — see
§3 Phase <N>.”

### 6.1 Adding a unit test

- TBD — see §3 Phase 1 for generation/persistence boundary coverage.

### 6.2 Adding an integration test

- TBD — see §3 Phase 2 for pagination/review-session coverage and §3 Phase 3 for ownership/RLS coverage.

### 6.3 Adding an e2e test

- TBD — see §3 Phase 4 for the narrow critical-flow smoke.

### 6.4 Adding a test for a new API endpoint

- **Test type**: integration (preferred).
- **Pattern**: validate inputs with zod, then assert request/response shape and side-effect.
- **Reference test**: `src/pages/api/generate-flashcards.test.ts`
- **Run locally**: `npm test`

### 6.5 Adding a test for a new content-build rule

- Not used in this app today; no content-build pipeline is part of the MVP.
- If a new rule appears, see §3 Phase 1 for the generation/persistence boundary pattern first.

### 6.6 Per-rollout-phase notes

- Empty for now. Add a short note after each phase lands if the phase reveals a new fixture, helper, or boundary pattern.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Provider-specific Supabase and Cloudflare behavior** — the user does not want test budget spent here; re-evaluate only if the provider choice or failure pattern changes.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-02
- Stack versions last verified: 2026-06-02
- AI-native tool references last verified: 2026-06-02

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative space no longer matches what the team believes.
