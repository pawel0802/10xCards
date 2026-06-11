# Quality gates wiring and narrow e2e smoke — Plan Brief

> Full plan: `context/changes/testing-quality-gates-wiring/plan.md`
> Research: none provided

## What & Why

Wire CI quality gates and add a narrow Playwright e2e smoke to protect the most critical cross-boundary flow (sign-up → generate → review). The goal is to raise the floor in CI with minimal infra and maintenance cost.

## Starting Point

- `package.json` includes `@playwright/test` and `vitest`.
- `vitest.config.ts` exists; no `playwright.config.*` was found.
- CI workflow lives at `.github/workflows/ci.yml`.
- A `seed.spec.ts` exemplar exists at repo root.

## Desired End State

A CI job runs a single Playwright smoke on PRs (optional at first). The smoke authenticates via `storageState`; fixtures are seeded in the shared dev DB. Developers have a post-edit hook for fast local feedback.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---:|---|---|
| Scope | ⭐ CI gates + e2e smoke | Best tradeoff between signal and cost | Plan session
| E2E approach | ⭐ Playwright browser-driven | Highest integration signal; roles-based locators | Plan session
| Auth | ⭐ storageState with seeded test user | Deterministic, avoids UI login flakiness | Plan session
| Test data | Seeded fixtures in shared dev DB | Low infra overhead (team choice) | Plan session
| Rollout | Start optional on PRs | Observe before enforcing | Plan session

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. CI & quick checks | CI job skeleton, post-edit hook | CI wiring mistakes or flaky job |
| 2. Playwright infra & smoke | Playwright config + single smoke spec | Auth/data flakiness in CI |
| 3. Gate wiring & rollout | Run smoke on PRs (optional), notifications | False positives block merges if enabled too early |

**Prerequisites:** CI secrets for test user/storageState; ability to seed the shared dev DB. 
**Estimated effort:** ~3–7 working days across the three phases (small team, incremental).

## Open Risks & Assumptions

- Shared dev DB seeding may cause flakes; a dedicated ephemeral test DB is a recommended follow-up.
- Playwright will require CI webServer startup; ensure preview or start command is reliable in CI.

## Success Criteria (Summary)

- CI exposes `e2e-smoke` job and runs it on PRs (optional initially).
- The smoke passes locally and in CI using storageState and seeded fixtures.
- Developers run quick local checks via the post-edit hook and see failures before PRs.

