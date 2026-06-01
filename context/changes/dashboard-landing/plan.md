# Dashboard Landing Page Implementation Plan

## Overview

Replace the minimal `/dashboard` stub with a proper navigation hub. After signing in, users land on a page with a Topbar (email + sign-out) and three feature cards linking to Generate, My Flashcards, and Learn. As part of this work, route protection is consolidated into middleware so that all feature pages require auth via a single config, not scattered inline checks.

## Current State Analysis

`src/pages/dashboard.astro` exists as a placeholder: it shows the user's email, a static "This page is only for authenticated users." message, and a bare sign-out button — no links to any feature page.

Route protection is split:
- `src/middleware.ts` protects only `/dashboard`.
- `src/pages/flashcards.astro` has an inline redirect (`if (!user) return Astro.redirect("/auth/signin")`).
- `src/pages/learning.astro` conditionally loads data with `if (user)` but does not redirect unauthenticated users.
- `src/pages/generate.astro` and `src/pages/manual-create.astro` have **no auth protection** at all.

The visual language is established in `src/components/Welcome.astro`: cosmic background (`bg-cosmic`), CSS blur orbs, a star-field overlay, `Topbar.astro` at the top, and a 3-column feature card grid with inline SVG icons — this is the exact pattern the dashboard will reuse.

## Desired End State

An authenticated user who signs in is redirected to `/dashboard` and sees:
- `Topbar` at the top showing their email and a Sign out button.
- A welcome greeting.
- Three clickable navigation cards: **Generate Flashcards** (`/generate`), **My Flashcards** (`/flashcards`), **Start Learning** (`/learning`).
- Clicking any card navigates to that page without additional sign-in prompts.

Unauthenticated requests to `/dashboard`, `/generate`, `/flashcards`, `/learning`, or `/manual-create` are redirected to `/auth/signin` by middleware — no inline checks needed.

### Key Discoveries

- `src/components/Topbar.astro` already renders the user email and sign-out form; it only needs to be imported on the dashboard.
- `src/components/Welcome.astro` provides the complete visual template (cosmic orbs, star field, card grid) to copy from.
- `src/middleware.ts` — `PROTECTED_ROUTES` is a plain string array; adding entries there is sufficient to protect new routes.
- The inline redirect in `flashcards.astro` becomes redundant once middleware covers it and should be removed.
- `learning.astro`'s `if (user)` guard is for **data loading**, not a redirect — it stays but becomes unreachable for unauthenticated users once middleware protects the route.

## What We're NOT Doing

- No new shared layout or nav component — Topbar is already the right primitive.
- No user stats, card counts, or "due today" summary — pure navigation only.
- No changes to the public landing page (`/`, `Welcome.astro`).
- No protection of `/auth/*` routes (they are already public by design).
- No changes to `/review.astro` (not a user-facing page in the current flows).

## Implementation Approach

Two sequential phases:

1. **Route protection consolidation** — extend `PROTECTED_ROUTES` in middleware; remove the now-redundant inline redirect from `flashcards.astro`.
2. **Dashboard UI rebuild** — replace the stub in `dashboard.astro` with the full navigation hub: cosmic background, Topbar, welcome heading, 3 navigation cards.

Phase 1 is independent of Phase 2 and can be verified in isolation; Phase 2 depends only on Topbar working (already confirmed).

---

## Phase 1: Consolidate Route Protection in Middleware

### Overview

Extend `PROTECTED_ROUTES` to cover all feature pages; remove the inline auth redirect from `flashcards.astro`. After this phase every feature route redirects unauthenticated users to `/auth/signin` via middleware with no per-page checks required.

### Changes Required

#### 1. Extend PROTECTED_ROUTES

**File**: `src/middleware.ts`

**Intent**: Add `/generate`, `/flashcards`, `/learning`, and `/manual-create` to the `PROTECTED_ROUTES` array so that middleware redirects unauthenticated users before any page handler runs.

**Contract**: The `PROTECTED_ROUTES` array (line 4) becomes:
```
const PROTECTED_ROUTES = ["/dashboard", "/generate", "/flashcards", "/learning", "/manual-create"];
```

#### 2. Remove inline auth redirect from flashcards page

**File**: `src/pages/flashcards.astro`

**Intent**: The inline `if (!user) { return Astro.redirect("/auth/signin"); }` block is now redundant — middleware guarantees auth before this page runs. Remove it to keep the page clean.

**Contract**: Delete the three-line block (lines 4–6: `const { user } = Astro.locals;` / `if (!user) {…}`) from the frontmatter. The `user` variable is no longer needed in this file after removal.

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification

- Visiting `/generate`, `/flashcards`, `/learning`, `/manual-create` while signed out redirects to `/auth/signin`.
- All four pages load normally when signed in.

**Implementation Note**: Pause after manual verification passes before moving to Phase 2.

---

## Phase 2: Rebuild Dashboard UI

### Overview

Replace the minimal stub in `dashboard.astro` with the full navigation hub: cosmic background (matching `Welcome.astro`), `Topbar`, a welcome heading, and three feature navigation cards.

### Changes Required

#### 1. Rebuild dashboard.astro

**File**: `src/pages/dashboard.astro`

**Intent**: Replace the entire file content with a proper navigation hub page. The page reuses the established visual language (cosmic background, glass-morphism cards, purple gradient headings) and the existing `Topbar` component. Three feature cards link to `/generate`, `/flashcards`, and `/learning`, each with a descriptive title, subtitle, and inline SVG icon.

**Contract**: 
- Import `Layout` and `Topbar` from their existing paths.
- Outer wrapper: `bg-cosmic`, full-screen, `relative overflow-hidden` — same as `Welcome.astro`.
- Include the three CSS blur orbs and star-field overlay from `Welcome.astro` verbatim (these are pure decoration, not logic).
- After the orbs, a `relative z-10 p-4 sm:p-8` wrapper contains `<Topbar />` followed by the content area.
- Content area: centred column, max-width `max-w-4xl`, a welcome heading (`Welcome back,` + `{user?.email}` in a `span`) with purple gradient text, then a 3-column responsive card grid (`grid-cols-1 sm:grid-cols-3`).
- Each card: `<a href="…">` wrapping `rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:bg-white/10 transition-colors`. Inside: SVG icon (purple-300), bold title, short description in `text-blue-100/60`.

Card content:
| Card | href | Icon | Title | Description |
|---|---|---|---|---|
| Generate | `/generate` | Sparkles/wand (see below) | Generate Flashcards | Paste text and let AI create cards for you |
| Flashcards | `/flashcards` | Stack/cards | My Flashcards | Browse, edit, or delete your saved cards |
| Learn | `/learning` | Brain/graduation cap | Start Learning | Review your due cards with spaced repetition |

Suggested SVG icons (Lucide-style, 24×24, `stroke="currentColor"` `stroke-width="2"`):
- **Generate**: `<path d="M12 3l1.88 5.76a2 2 0 0 0 1.36 1.36L21 12l-5.76 1.88a2 2 0 0 0-1.36 1.36L12 21l-1.88-5.76a2 2 0 0 0-1.36-1.36L3 12l5.76-1.88a2 2 0 0 0 1.36-1.36L12 3z"/>` (sparkle star)
- **Flashcards**: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>` (card)
- **Learn**: `<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>` (clock/timer representing due review)

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification

- Signing in redirects to `/dashboard` (or navigating there while signed in works).
- Dashboard shows Topbar with user email and sign-out button.
- Dashboard shows three feature cards: Generate Flashcards, My Flashcards, Start Learning.
- Clicking each card navigates to the correct page.
- Sign out from Topbar redirects to sign-in page.
- Dashboard is inaccessible when signed out (redirects to `/auth/signin`).
- Page is visually consistent with the cosmic design: gradient heading, glass-morphism cards, blur orbs.
- No console errors on page load.

**Implementation Note**: Pause after all manual verification passes before marking the change complete.

---

## Testing Strategy

### Manual Testing Steps

1. Sign out completely, then visit `/dashboard` — verify redirect to `/auth/signin`.
2. Visit `/generate`, `/flashcards`, `/learning`, `/manual-create` while signed out — verify each redirects.
3. Sign in — verify landing on `/dashboard`.
4. Verify all three nav cards are visible and correctly labelled.
5. Click each card — verify correct page loads.
6. Use Topbar sign-out — verify redirect to sign-in page.
7. Check responsive layout on mobile viewport (cards stack vertically).

## References

- Similar visual pattern: `src/components/Welcome.astro`
- Topbar component: `src/components/Topbar.astro`
- Middleware auth: `src/middleware.ts`
- Roadmap slice: `context/foundation/roadmap.md` § S-05

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Consolidate Route Protection in Middleware

#### Automated

- [x] 1.1 Linting passes
- [x] 1.2 Build succeeds

#### Manual

- [x] 1.3 Unauthenticated requests to /generate, /flashcards, /learning, /manual-create redirect to /auth/signin
- [x] 1.4 All four pages load normally when signed in

### Phase 2: Rebuild Dashboard UI

#### Automated

- [ ] 2.1 Linting passes
- [ ] 2.2 Build succeeds

#### Manual

- [ ] 2.3 Dashboard shows Topbar with user email and sign-out
- [ ] 2.4 Dashboard shows three feature cards with correct labels and links
- [ ] 2.5 Clicking each card navigates to correct page
- [ ] 2.6 Sign out from Topbar redirects to sign-in page
- [ ] 2.7 Dashboard inaccessible when signed out
- [ ] 2.8 Visual consistency verified (gradient heading, glass-morphism cards, cosmic background)
- [ ] 2.9 No console errors on page load
