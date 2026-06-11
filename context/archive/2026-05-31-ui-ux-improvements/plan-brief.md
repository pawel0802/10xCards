# UI/UX Improvements — Plan Brief

> Full plan: `context/changes/ui-ux-improvements/plan.md`

## What & Why

Polish the visual and interactive experience across all non-dashboard pages. The app accumulated inconsistent button colours (hard-coded blues/greens vs near-black shadcn defaults), no icons, no persistent back-navigation, and an unfriendly empty-state message on /learning. This slice brings the whole UI into a consistent, modern cosmic style.

## Starting Point

Five app pages (`/generate`, `/flashcards`, `/learning`, `/manual-create`, `/review`) have no Topbar, no Lucide icons, inconsistent button colours, and "No flashcards to review." as the /learning empty-state. The Topbar component and lucide-react package already exist in the codebase.

## Desired End State

Every app page shows the Topbar (purple "Dashboard" pill + "Sign out" link, both with icons). All interactive buttons across the app carry a matching Lucide icon. The shadcn `Button` default variant renders vivid violet. /learning shows "All caught up! 🎉" when there is nothing to review.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Finish button location | Topbar Dashboard pill | Topbar already exists with Dashboard link; avoids duplicating navigation in content | Plan |
| Dashboard link style | Purple pill button with icon | Reads as a primary CTA, not just a text nav link | Plan |
| Topbar icons approach | Inline SVG in Topbar.astro | Topbar is a static Astro component — React Lucide icons require `client:*` | Plan |
| Button colour strategy | Update `--primary` CSS variable | Single-token change propagates to all shadcn Button default variants automatically | Plan |
| Icon scope | All interactive buttons | Consistent icon coverage across the full app | Plan |

## Scope

**In scope:**
- Add Topbar to `/generate`, `/flashcards`, `/learning`, `/manual-create`, `/review`
- Style Topbar Dashboard link as purple pill + layout icon (inline SVG)
- Add Sign out icon to Topbar (inline SVG)
- Update `--primary` / `--primary-foreground` CSS variables to violet
- Add Lucide icons to all interactive buttons in 5 React components
- "All caught up! 🎉" in SpacedReview empty state

**Out of scope:**
- Auth pages (`/auth/*`) and index/landing page
- `--secondary`, `--destructive`, or other CSS tokens
- Error / toast message icons
- Spaced-repetition logic changes
- Second "Finish" button inside page content

## Architecture / Approach

Phase 1 is a pure CSS + text + Astro-component change — zero React logic touched. Phase 2 imports from the already-installed `lucide-react` package into five existing `.tsx` components and adds `<Topbar />` to five `.astro` pages. No new files, no API changes, no migrations.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Foundation | Violet primary token · Topbar pill · "All caught up!" | Wrong oklch value could clash with existing accent colours |
| 2. Topbar + Icons | Topbar on all app pages · Lucide icons everywhere | Icon import count is large; missing imports will fail the build |

**Prerequisites:** S-05 dashboard landing (adds Topbar to dashboard page) should be implemented first for full consistency, but S-06 is independently shippable.  
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- Topbar's `Astro.locals.user` is always populated on protected routes (true after S-05 middleware changes); if S-05 is not merged first, Topbar still renders correctly for authenticated users.
- `oklch(0.546 0.245 274)` is a reasonable violet choice — may need minor tuning against the actual rendered cosmic background.

## Success Criteria (Summary)

- Every non-dashboard page has the Topbar with a purple Dashboard pill
- All interactive buttons show a contextual Lucide icon with no layout breakage
- `/learning` shows "All caught up! 🎉" with zero due cards
