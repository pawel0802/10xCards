# Dashboard Landing Page — Plan Brief

> Full plan: `context/changes/dashboard-landing/plan.md`

## What & Why

The `/dashboard` page is the first screen users see after signing in, but it currently shows a bare stub with no links to any feature. S-05 replaces it with a proper navigation hub so users can immediately reach the three core features (Generate, My Flashcards, Learn) and sign out. Without this, every authenticated user is stranded at an empty page.

## Starting Point

`src/pages/dashboard.astro` exists but is a placeholder: it shows the user email, a static "This page is only for authenticated users." message, and a sign-out button — no feature links. Route protection is also fragmented: middleware guards only `/dashboard`, while other pages have inline checks or none at all.

## Desired End State

After signing in, the user lands on `/dashboard` and sees a `Topbar` with their email and sign-out, plus three navigation cards (Generate Flashcards, My Flashcards, Start Learning) in the established cosmic/glass-morphism visual style. All feature pages (`/generate`, `/flashcards`, `/learning`, `/manual-create`) redirect unauthenticated users to sign-in via middleware — no per-page auth checks required.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Navigation layout | 3 feature cards (grid) | Matches the visual pattern already established in `Welcome.astro` | Plan |
| Header / sign-out placement | Topbar component (email + sign-out) | Reuses existing `Topbar.astro` — no new component needed | Plan |
| Features on dashboard | Generate, My Flashcards, Learn (3 cards) | These are the three primary user journeys; Manual Create is secondary | Plan |
| Route protection | Extend middleware PROTECTED_ROUTES | Centralises auth logic — cleaner than scattered inline checks | Plan |

## Scope

**In scope:**
- Rebuild `src/pages/dashboard.astro` as a navigation hub
- Extend `PROTECTED_ROUTES` in `src/middleware.ts` to cover `/generate`, `/flashcards`, `/learning`, `/manual-create`
- Remove now-redundant inline redirect from `src/pages/flashcards.astro`

**Out of scope:**
- User stats or "due today" counts on the dashboard
- Changes to the public landing page (`/`)
- New shared layout or navigation component
- Any backend/API changes

## Architecture / Approach

The dashboard page reuses two existing primitives: `Topbar.astro` (user email + sign-out) and the cosmic background pattern from `Welcome.astro` (blur orbs, star field, glass-morphism cards). No new components are introduced. Route protection is consolidated in one place — the `PROTECTED_ROUTES` array in `src/middleware.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Consolidate route protection | All feature routes redirect unauthenticated users via middleware | Could inadvertently block a public route if path prefix overlaps |
| 2. Rebuild dashboard UI | Full navigation hub with Topbar + 3 feature cards | Visual mismatch vs cosmic style if orb/card markup drifts from Welcome.astro |

**Prerequisites:** Auth baseline is present (Supabase SSR, middleware, Topbar all working).  
**Estimated effort:** ~1 session, 2 small file changes.

## Open Risks & Assumptions

- `/review.astro` is not added to `PROTECTED_ROUTES` — assumed not a user-facing route in current flows; revisit if that changes.
- Target pages (`/generate`, `/flashcards`, `/learning`) are assumed to exist and be functional; cards will link to them regardless of S-01/S-03/S-04 completion status.

## Success Criteria (Summary)

- Signing in lands the user on `/dashboard` with three clearly labelled navigation cards.
- Visiting any feature page while signed out redirects to `/auth/signin` (no per-page auth code required).
- Visual design is consistent with the rest of the app (cosmic background, glass-morphism cards, purple gradient heading).
