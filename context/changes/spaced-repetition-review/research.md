---
date: 2026-05-28T19:53:17.508+02:00
researcher: "Copilot CLI"
git_commit: "239c97704d0beb86892adab3cba697041d4d94cd"
branch: "main"
repository: "pawel0802/10xCards"
topic: "spaced-repetition-review: ts-fsrs compatibility analysis"
tags: [research, spaced-repetition, ts-fsrs, s-04]
status: complete
last_updated: 2026-05-28
last_updated_by: "Copilot CLI"
---

# Research: spaced-repetition-review — ts-fsrs compatibility analysis

**Date**: 2026-05-28T19:53:17.508+02:00
**Researcher**: Copilot CLI
**Git Commit**: 239c97704d0beb86892adab3cba697041d4d94cd
**Branch**: main
**Repository**: pawel0802/10xCards

## Research Question
Is the ts-fsrs library compatible with this codebase and what is required to implement S-04 (spaced-repetition-review)?

## Short verdict
Partially compatible. ts-fsrs (FSRS) is TypeScript and browser/Node compatible (see snapshot). The repo has Supabase auth/client and basic flashcard flows, but lacks SR columns, APIs for due-card retrieval and rating, and wiring to persist ts-fsrs generator parameters.

## Rationale (evidence)
- ts-fsrs exposes repeat()/next()/generatorParameters() (context/changes/spaced-repetition-review/ts-fsrs-docs.md:18-26,31-39).
- Roadmap specifies S-04 depends on S-01 and F-01 (context/foundation/roadmap.md:24-36,114-125).
- Current save flow inserts basic card fields but not SR fields: src/pages/api/save-flashcards.ts:40-48.
- Flashcard service reads/writes flashcards but does not handle due_at/ef/interval/generator_params: src/lib/services/flashcards.ts:11-23,34-40.
- Supabase client + middleware present for server-side handlers: src/lib/supabase.ts:1-5; src/middleware.ts:6-13.
- Review UI island exists and posts saves for candidates: src/components/ReviewFlashcards.tsx:58,126; review route exists: src/pages/review.astro:9.

## Recommended integration approach
Server-side scheduling (recommended)
- Flow: client requests due cards → server rehydrates card into ts-fsrs scheduler (using stored generator_params or mapped fields) → client shows card → client posts rating → server calls scheduler.next(card, now, Rating.X), updates flashcards row and inserts review_log.
- Pros: consistent canonical schedule, RLS/permissions enforced, multi-device sync, smaller client bundle (Cloudflare Workers concerns).
- Cons: server CPU and request latency per rating; must verify ts-fsrs bundling on Cloudflare Workers.

Client-side scheduling (alternative)
- Pros: instant UX, offline-capable.
- Cons: conflict resolution, security, sync complexity. Given current server-centric patterns, server-side is pragmatic for MVP.

## Suggested DB schema (Postgres / Supabase)
Flashcards (excerpt):
- id uuid PK default gen_random_uuid()
- user_id uuid NOT NULL REFERENCES auth.users(id)
- front text NOT NULL
- back text NOT NULL
- source text NOT NULL DEFAULT 'auto'
- state text NOT NULL DEFAULT 'new' -- e.g. new/learning/review/relearning
- ease_factor double precision NOT NULL DEFAULT 2.5
- interval_days integer NOT NULL DEFAULT 0
- repetition integer NOT NULL DEFAULT 0
- due_at timestamptz NOT NULL DEFAULT now()
- generator_params jsonb -- ts-fsrs serialization
- created_at/updated_at timestamptz

Review_logs (excerpt):
- id uuid PK
- user_id uuid NOT NULL
- flashcard_id uuid NOT NULL
- rating smallint NOT NULL -- map to Again/Hard/Good/Easy
- prev_interval/new_interval, prev_ease/new_ease
- generator_params_before/after jsonb
- created_at timestamptz

(See migration sample in repository analysis for full SQL.)

## API endpoints required (high-level)
- GET /api/review/due — returns due cards for current user (select flashcards where due_at <= now()).
- POST /api/flashcards/:id/review — body { rating }, server rehydrates card, calls scheduler.next(), persists updated SR fields and inserts review_log, returns updated card and log.

TS skeleton (conceptual) — server-side handler (place under src/pages/api/review/[id].ts):

```ts
import { fsrs, Rating } from 'ts-fsrs';
import { createClient } from '@/lib/supabase';
export const POST = async (context) => {
  const user = context.locals.user; if (!user) return new Response(null,{status:401});
  const id = context.params.id; const body = await context.request.json();
  const rating = Number(body.rating);
  const supabase = createClient(context.request.headers, context.cookies);
  const { data: cardRow } = await supabase.from('flashcards').select('*').eq('id', id).single();
  const scheduler = fsrs();
  // rehydrate card (map fields or use generator_params)
  const result = scheduler.next(rehydratedCard, new Date(), rating as Rating);
  const genParams = scheduler.generatorParameters?.() ?? null;
  await supabase.from('flashcards').update({ ease_factor: result.card.ef, interval_days: Math.round(result.card.interval), repetition: result.card.repetition ?? 0, due_at: new Date(result.card.next_due ?? Date.now()).toISOString(), generator_params: genParams }).eq('id', id);
  await supabase.from('review_logs').insert({ user_id: user.id, flashcard_id: id, rating, prev_interval: /*...*/, new_interval: Math.round(result.card.interval), prev_ease: /*...*/, new_ease: result.card.ef, generator_params_before: cardRow.generator_params, generator_params_after: genParams });
  return new Response(JSON.stringify({ success:true }), { status: 200 });
};
```

## Implementation checklist (ordered)
1. F-01: Add migration for flashcards + review_logs + RLS (see roadmap: context/foundation/roadmap.md:61-71).
2. Add/confirm src/types.ts Flashcard/ReviewLog types.
3. Install ts-fsrs (npm) and ensure Cloudflare Workers bundling passes.
4. Initialize generator_params on new flashcards in save-flashcards endpoint.
5. Implement GET /api/review/due and POST /api/flashcards/:id/review (server-side scheduler.next()).
6. Update services/flashcards.ts to read/store SR columns.
7. Update ReviewFlashcards React island to fetch due cards and post ratings.
8. Add unit/integration tests and run migration.

Dependencies: S-04 requires S-01 and F-01 (roadmap). See: context/foundation/roadmap.md:30-36 and 114-125.

## Blockers & risk assessment
- ts-fsrs bundling on Cloudflare Workers: medium risk — ts-fsrs claims browser/Node support (context/changes/.../ts-fsrs-docs.md:5-6) but verify bundle size and any Node-only deps.
- Schema migration/backfill for existing flashcards: medium.
- Concurrency/race conditions during reviews: medium (use DB transactions or optimistic updates).
- Data-model choices (interval unit, rounding): low→medium; ensure consistent units.

## Open questions
- Prefer server-side or client-side scheduler? Recommendation: server-side for consistency and privacy.
- Which AI/model provider to use for S-01 generation? Roadmap left this as Owner=user.

---

### Code references (quick links)
- context/changes/spaced-repetition-review/ts-fsrs-docs.md:18-26,31-39
- context/foundation/roadmap.md:24-36,114-125
- src/pages/api/save-flashcards.ts:40-48
- src/lib/services/flashcards.ts:11-23,34-40
- src/lib/supabase.ts:1-5
- src/components/ReviewFlashcards.tsx:58,126
- src/pages/review.astro:9


