---
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
---

## Why this stack

10xCards is a solo, after-hours web-app with a hard 3-week deadline — the exact profile the 10x Astro Starter was designed for. Supabase covers FR-001 (user registration and login) without custom auth plumbing. Astro API routes provide a clean, typed surface to proxy AI flashcard generation (FR-002), keeping secrets server-side. React islands handle the interactive review and spaced repetition UI (FR-003–FR-006) while keeping the default bundle lean. Tailwind CSS 4 and TypeScript project-wide enforce the agent-friendly contract (typed, convention-based, popular in training data, well-documented) across all four quality gates. Cloudflare Pages is the natural deploy target — zero-config with the included `@astrojs/cloudflare` adapter, free tier sufficient for a medium-scale MVP.
