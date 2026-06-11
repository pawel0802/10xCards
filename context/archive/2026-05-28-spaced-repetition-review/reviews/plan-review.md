<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Spaced Repetition Review (S-04)

- **Plan**: context/changes/spaced-repetition-review/plan.md
- **Mode**: Deep
- **Date**: 2026-05-30
- **Verdict**: REVISE
- **Findings**: 1 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | WARNING |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
Grounding: 8/8 paths ✓, 3/3 symbols ✓, brief↔plan ✓

## Findings

### F1 — ts-fsrs compatibility with Cloudflare Workers

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; test early and choose fallback before large work begins
- **Dimension**: Blind Spots
- **Location**: Phase 2 — Server / Critical Implementation Details

- **Detail**: The plan assumes a Cloudflare Worker–compatible scheduler wrapper for ts-fsrs (plan lines: "Cloudflare Worker-compatible scheduler wrapper" / "early compatibility test is mandatory"). research.md already flags this as a potential runtime mismatch (Worker vs Node) but no explicit engineering step (bundle+smoke test) is gated as the first task in Phase 2. If ts-fsrs requires Node-only APIs, implementing the scheduler in Workers will fail and force a design pivot mid-implementation.

- **Fix A ⭐ Recommended**: Add an explicit, high-priority compatibility task at the start of Phase 2 that bundles ts-fsrs for the Worker runtime (esbuild/rollup + polyfills), runs a smoke test in a Worker dev/runtime, and records the result. If incompatible, route the scheduler to a Node serverless fallback (Lambda/Vercel) and document the deployment steps.
  - Strength: Confirms feasibility before committing schema/API changes; keeps Phase 2 incremental and reversible. 
  - Tradeoff: Small upfront effort (few hours) to test and confirm; may add a fallback deployment to maintain.
  - Confidence: HIGH — research already flagged this as the primary risk.
  - Blind spot: Need to decide hosting and service key handling for Node fallback.

- **Fix B**: Proceed to implement Worker-compatible wrapper and only fall back if tests later fail.
  - Strength: Fastest path to start implementation in the intended runtime.
  - Tradeoff: Higher risk of wasted work if ts-fsrs is incompatible; rework cost is significant.
  - Confidence: MEDIUM — risky without early test.

- **Decision**: FIXED — Applied Fix A (Added compatibility smoke test task)

---

### F2 — Endpoint naming / contract inconsistency

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — implementation will stall on ambiguous contracts
- **Dimension**: Plan Completeness / Contract
- **Location**: Desired End State (lines 16-18) vs Phase 2 (lines 86-88)

- **Detail**: The plan alternately refers to `POST /api/learning` and `src/pages/api/learning/review.ts` (`POST /api/learning/review`). This is a contract-level inconsistency: implementers need exact endpoint paths, request/response shapes, and error semantics.

- **Fix**: Pick a canonical API surface and update the plan. Recommended: use explicit endpoints `GET /api/learning/due` and `POST /api/learning/review` to keep intent clear (GET returns due cards; POST submits a rating for a specific card). Document request/response DTOs (ReviewLogCreateDto) and expected status codes (200/400/409/500).
  - Strength: Removes ambiguity and makes tests and clients straightforward to implement.
  - Tradeoff: Slightly more verbose route naming vs a single RESTy `/api/learning` resource. 
  - Confidence: HIGH — straightforward decision.

- **Decision**: FIXED — Applied Fix A (Canonical endpoints chosen: GET /api/learning/due & POST /api/learning/review)

---

### F3 — RLS + SECURITY DEFINER RPC: missing concrete policy & audit steps

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — security-sensitive; needs explicit policy and review
- **Dimension**: Architectural Fitness / Blind Spots
- **Location**: Phase 1 (DB & Types) / Phase 2 (Contract for RPC)

- **Detail**: The plan proposes an RPC `public.record_review(...)` implemented as SECURITY DEFINER (or an alternative server-side transaction). The repo already enables RLS for flashcards/review_logs (migration file shows owner-only policies). Adding a SECURITY DEFINER function changes access patterns and requires explicit validation inside the function and a security review. The plan does not include example RPC signature, input validation, or the RLS policy adjustments nor an audit checklist.

- **Fix A ⭐ Recommended**: Keep the DB-side RPC for atomicity but include in Phase 1 a concrete subtask: (1) define RPC signature and zod-like validation rules, (2) implement SECURITY DEFINER function with strict input validation, (3) add minimal RLS policy that allows only the function to bypass row-level checks while keeping the function checks on `auth.uid()`, and (4) schedule a security audit/PR checklist item to review function body and policies before merging.
  - Strength: Preserves DB atomicity and performance while limiting attack surface via explicit validation and policy review.
  - Tradeoff: Requires careful review and developer discipline; SECURITY DEFINER functions can be audited but add operational burden.
  - Confidence: MEDIUM — depends on team's comfort with SECURITY DEFINER in Supabase.
  - Blind spot: If organizational policy forbids SECURITY DEFINER, fallback is required.

- **Fix B**: Use a server-side transaction (service-role key) implemented by the backend (SELECT ... FOR UPDATE + scheduler logic) and avoid SECURITY DEFINER RPCs.
  - Strength: Keeps sensitive logic in application code under normal code review workflows.
  - Tradeoff: Requires safe handling of service-role key and slightly more chattiness between server and DB.
  - Confidence: MEDIUM — operationally sound but needs secret management.

- **Decision**: FIXED — Applied Fix A (Define RPC signature, validation, SECURITY DEFINER body, RLS policy, and security audit) 

---

### F4 — Idempotency and duplicate submissions

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — duplicates corrupt scheduler logs or repeat state transitions
- **Dimension**: Blind Spots / Lean Execution
- **Location**: Phase 2 — API endpoints / Phase 3 — Frontend UI behavior

- **Detail**: The plan requires the UI to block advance on submit failure (good). However, there is no server-side idempotency strategy described. Transient retries (user clicking, flaky networks) may produce duplicate review_log entries or double-apply scheduler.next unless handled.

- **Fix**: Add an idempotency contract: require clients to send an idempotency key (UUID) with rating submissions, persist the key with the review_log, and have `public.record_review` or service.submitReview detect and return the existing result for duplicate keys. Alternatively, enforce a dedupe rule inside the RPC based on a recent timestamp window, but idempotency keys are recommended for robustness.
  - Strength: Prevents duplicates safely and simplifies client retry logic.
  - Tradeoff: Slight schema addition (idempotency_key column) and server-side checks.
  - Confidence: HIGH — standard practice for write idempotency.

- **Decision**: FIXED — Applied Fix B (Server-side dedupe by recent timestamp window, default 5s)

---

### F5 — Observability, metrics and deployment guardrails (smoke + rollback)

- **Severity**: ⚠️ OBSERVATION
- **Impact**: 🏃 LOW — operational but important for production readiness
- **Dimension**: Blind Spots / Plan Completeness
- **Location**: Phase 2/4 — Server & Tests

- **Detail**: The plan lists tests and staging verification but omits specific observability (metrics, error counts, latency) and a simple rollback strategy for the new tables/RPC. Even though this is a greenfield FSRS rollout (no migration), RPCs and scheduler failures can impact users and should be monitored.

- **Fix**: Add to Phase 4 a short checklist: record metrics (RPC success/failure rate, review latency, scheduler errors), create a health-check endpoint for the scheduler wrapper, and capture logs to an existing monitoring sink. Add a simple rollback/deactivate step for RPC (e.g., deploy knob or revoke function permission) to the runbook.
  - Strength: Low-effort improvements that dramatically reduce time-to-detect-and-recover.
  - Tradeoff: Small extra work for instrumentation and playbook docs.
  - Confidence: HIGH — straightforward and valuable.

- **Decision**: FIXED — Applied Fix B (Added scheduler health-check and basic logging; no metrics dashboard yet)

---

## Summary Verdict

End-State Alignment: PASS ✅
Lean Execution: WARNING ⚠️
Architectural Fitness: PASS ✅
Blind Spots: WARNING ⚠️
Plan Completeness: WARNING ⚠️

► Overall: REVISE — plan is sound but needs the fixes above before implementation starts (especially F1 and F3/F4).


Saved report path: `context/changes/spaced-repetition-review/reviews/plan-review.md`
