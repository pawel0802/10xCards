# Quality gates wiring and narrow e2e smoke — Implementation Plan

## Overview

Wire CI quality gates and add a narrow Playwright e2e smoke that protects the critical happy path (sign-up → generate → review). The change will: add CI jobs (lint/typecheck, unit/integration quick checks), create a single Playwright smoke spec, configure CI to run the smoke (optional initially), and add a local post-edit hook for quick feedback.

## Current State Analysis

- package.json lists `@playwright/test` (dev dep) and `vitest` as the test runner; `vitest.config.ts` exists. (see `package.json`).
- No `playwright.config.*` found in repo root (Playwright dep present but no project config).
- A `seed.spec.ts` exists at repo root — useful as an exemplar for the seed test pattern.
- CI workflow exists at `.github/workflows/ci.yml` and currently runs lint/tests (inspect for insertion point).

## Desired End State

- CI runs lint/typecheck and a narrow Playwright e2e smoke on PRs (optional run at first).
- Smoke authenticates via `storageState` (seeded test user) and uses seeded fixtures in the shared dev DB as per your choice.
- Failure of the smoke produces clear logs and fails the PR job (initially optional; later can be required for protected branches).
- Developers get fast local feedback via a post-edit hook that runs lint/typecheck and quick unit/integration checks.

## Key Discoveries

- `package.json` includes `@playwright/test` and `vitest` — Playwright is available as a dependency; no config file yet.
- `vitest.config.ts` exists in repo root.
- `.github/workflows/ci.yml` exists and is the correct place to add a CI job.
- `seed.spec.ts` found at repo root and can seed the seed-test pattern.

## What We're NOT Doing

- Not provisioning a dedicated ephemeral test Supabase DB in this change (you chose seeded fixtures in shared dev DB). This can be a follow-up change.
- Not adding a full Playwright suite or many e2e tests — only a single narrow smoke for cross-boundary signal.

## Implementation Approach

- Phase-based, small iterations: wire CI + quick checks; add Playwright config + smoke test and storageState handling; enable and observe gate in CI as optional then promote to required as agreed.
- Keep the smoke minimal: one spec in `tests/e2e/smoke.spec.ts` that proves the sign-up → generate → review happy path and deliberately verifies the risk the test protects.
- Use `storageState` for auth; store encrypted state/credentials in CI secrets.
- Seed fixtures in the shared dev DB before the smoke run (per your choice) to guarantee required data exists.

## Critical Implementation Details

- CI job should run the app (webServer) before Playwright runs, or use a preview build if available. Ensure the webServer health check is reliable and times out gracefully.
- Name the CI job `e2e-smoke` and expose a single-spec invocation: `npx playwright test tests/e2e/smoke.spec.ts --project=chromium` (adjust project per team preference).
- Store `PLAYWRIGHT_STORAGE_STATE` or equivalent as an encrypted secret and write a small `scripts/ci/generate-storage-state.sh` (or Node script) to refresh it when needed.
- Because fixtures are seeded into a shared dev DB, include steps to clean or namespace test data to reduce cross-test interference.

## Phase 1: CI & quick checks

### Overview
Add lint/typecheck and a CI job placeholder for the e2e smoke; add a post-edit hook for local dev feedback.

### Changes Required

- Update `.github/workflows/ci.yml` to include a new job `e2e-smoke` (initially optional) after lint/test jobs.
- Add a `scripts/ci/run-e2e-smoke.sh` script to start the app, wait for health, and invoke Playwright single-spec.
- Add Husky post-edit hook config that runs `npm run lint` and `npm test -- -g quick` (or similar quick checks).

### Success Criteria

#### Automated Verification:
- CI `e2e-smoke` job runs on PRs (job present and runnable).
- `npm run lint` and `npm test` complete in CI.

#### Manual Verification:
- Running the CI job manually starts the app and exits with a non-zero code if smoke fails.

## Phase 2: Playwright infra & smoke

### Overview
Create Playwright config, a single narrow smoke spec, and storageState auth flow in CI.

### Changes Required

- Add `playwright.config.ts` with a `webServer` entry (or document how CI starts the app) and default project(s).
- Add `tests/e2e/smoke.spec.ts` implementing the sign-up → generate → review happy path (seed-based data); model the file on `seed.spec.ts` exemplar.
- Add `scripts/ci/seed-fixtures.sh` to seed required test data into the shared dev DB before the smoke runs.
- Add CI secret(s) for test user credentials and storageState, and a small script to produce `storageState` for CI runs.

### Success Criteria

#### Automated Verification:
- `npx playwright test tests/e2e/smoke.spec.ts` passes locally against a running preview server.
- CI can run the same invocation (with provided secrets) and produce logs/artifacts.

#### Manual Verification:
- Manually run the smoke locally with `npm run preview` and verify the smoke reproduces the intended flow.

## Phase 3: Gate wiring & rollout

### Overview
Run the smoke job on PRs (optional initially), wire failure notifications, and prepare branch-protection steps for later rollout.

### Changes Required

- Configure `.github/workflows/ci.yml` to run `e2e-smoke` on PRs.
- Add a lightweight notifier (comment or GitHub Checks annotation) that surfaces the e2e failure and link to logs.
- Prepare documentation and a short rollout checklist for enabling the gate as a required check on protected branches.

### Success Criteria

#### Automated Verification:
- e2e-smoke runs on PRs and exits non-zero on failure.
- CI creates a clear failure artifact/log link in the PR.

#### Manual Verification:
- Review a failing run with logs to confirm failure is actionable and actionable errors are surfaced to reviewers.

---

## Testing Strategy

### Unit & Integration
- Keep existing Vitest tests; ensure `npm test` is part of CI.

### E2E Smoke
- One smoke spec that protects the cross-boundary risk; stored at `tests/e2e/smoke.spec.ts`.
- Auth via `storageState` and seeded fixtures in the shared dev DB.

### Manual Testing Steps
1. Start preview locally: `npm run preview`.
2. Run `npx playwright test tests/e2e/smoke.spec.ts` and confirm pass.
3. Intentionally break the targeted behavior locally (deliberate-break) and confirm the smoke fails, then revert.

## Migration Notes
- Document how to rotate storageState secrets and who owns the credential.

## References
- Test plan: `context/foundation/test-plan.md`
- Package manifest: `package.json`
- CI workflow: `.github/workflows/ci.yml`
- Seed exemplar: `seed.spec.ts`

## Progress

### Phase 1: CI & quick checks

#### Automated
- [x] 1.1 Add CI job `e2e-smoke` (optional)
- [x] 1.2 Add post-edit hook and quick-check script

#### Manual
- [ ] 1.3 Verify CI job runs and produces logs

### Phase 2: Playwright infra & smoke

#### Automated
- [ ] 2.1 Add `playwright.config.ts` and `tests/e2e/smoke.spec.ts`
- [ ] 2.2 Add seed-fixtures script and CI seed step
- [ ] 2.3 Add CI secrets and storageState script

#### Manual
- [ ] 2.4 Local run verification and deliberate-break check

### Phase 3: Gate wiring & rollout

#### Automated
- [ ] 3.1 Run e2e-smoke on PRs (optional)
- [ ] 3.2 Add failure notifications in PR checks

#### Manual
- [ ] 3.3 Review failing run and confirm actionable logs

