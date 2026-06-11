# Spaced Repetition Review (S-04) — Plan Brief

> Full plan: `context/changes/spaced-repetition-review/plan.md`
> Research: `context/changes/spaced-repetition-review/research.md`

## What & Why

Add a dedicated spaced-repetition "learning" flow backed by an FSRS-compatible schema and an atomic review RPC. This separates AI candidate generation (/api/review) from learner-facing scheduling (/api/learning), ensuring correct scheduler state, reproducible logs for optimizer training, and a clean UX for study sessions.

## Starting Point

- Supabase auth and flashcard CRUD exist; current DB uses SM-2 fields.
- No server-side ts-fsrs integration or transactional review API.
- Frontend has AI candidate review UI but no learning session UI.

## Desired End State

- New FSRS-ready DB tables and an RPC to record reviews atomically.
- Cloudflare Worker–compatible scheduler wrapper (with Node fallback if needed).
- API: GET /api/learning/due (default 10 cards) and POST /api/learning/review for rating submissions.
- Frontend: /learning page with a SpacedReview component that enforces a 4-point rating and blocks advance on submit errors.

## Key Decisions

| Decision | Choice | Why | Source |
|---|---:|---|---|
| Where FSRS params live | Global server config | Simpler, smaller DB footprint | User decision
| Atomic updates | DB RPC `public.record_review` | Atomic, minimal race window | Research + discussion
| Runtime for scheduler | Cloudflare Workers (with fallback) | Single deployment model; test compatibility | User decision
| Session batch size | 10 cards | Balanced payload vs frequency | User input

## Scope

**In scope:** DB schema (FSRS), RPC, scheduler wrapper, GET/POST learning APIs, learning UI page and component, tests, RLS.
**Out of scope:** Migrating existing cards; per-card generator_parameters; offline sync.

## Architecture / Approach

- DB: FSRS-ready tables with RLS + RPC for atomic update.
- Server: scheduler wrapper callable from Cloudflare Worker runtime; fallback to Node serverless if needed.
- Frontend: dedicated /learning page mounting SpacedReview (client:load).

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. DB & Types | FSRS tables + RPC + types | RLS & RPC security review
| 2. Server | Scheduler wrapper + endpoints | ts-fsrs compatibility in Worker
| 3. Frontend | /learning page + SpacedReview | UX error handling
| 4. Tests & Deploy | Integration + RLS tests | Concurrency edges

**Prerequisites:** Supabase admin migration access; service role key for staging if RPC SECURITY DEFINER not used.
**Estimated effort:** ~3–6 dev-days across phases (MVP scope).

## Open Risks & Assumptions

- ts-fsrs may require Node APIs not available in Workers; fallback is assumed.
- Security: RPCs require careful policy & validation.

## Success Criteria (Summary)

- Learner can fetch 10 due cards and submit ratings; DB updates reflect scheduler output and review_logs contain optimizer fields.
- Automated tests cover scheduler, RPC atomicity, and RLS policies.
- Learning UI handles failures by blocking advance and allowing retry.
