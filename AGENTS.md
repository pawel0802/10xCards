# Repository Guidelines

10xCards is an AI-powered flashcard generation and spaced repetition web app. Stack: Astro 6 SSR + React 19 + TypeScript + Tailwind CSS 4 + Supabase (auth + PostgreSQL) + Cloudflare Workers.

## Hard Rules

- **Full SSR only.** `output: "server"` is set in `astro.config.mjs`. Every API route must export `const prerender = false`.
- **React islands for interactivity only.** Use Astro components for static content and layout; add a React `.tsx` component only when client-side state or event handling is required.
- **Class merging via `cn()`.** Import from `@/lib/utils` (clsx + tailwind-merge). Never manually concatenate Tailwind class strings.
- **Validate API inputs with zod.** Every handler in `src/pages/api/` must parse and validate its input with zod before acting on it. Use uppercase `GET` / `POST` exports.
- **RLS on every new Supabase table.** Every migration that creates a table must enable Row Level Security and add granular per-operation, per-role policies in the same file.
- **No Next.js directives.** `"use client"` and similar are not valid in this codebase.
- **Non-goals (PRD-enforced).** Do not implement: custom SR algorithm, file/document import, shared flashcard sets, Anki/SuperMemo export, native mobile.

## Project Structure

Source lives under `src/`: `components/` (Astro `.astro` for static, React `.tsx` for interactive; `components/ui/` holds shadcn/ui components); `layouts/`; `lib/` (supabase.ts, utils.ts; business logic in `lib/services/`); `pages/` (file-based routing; `pages/api/` for API handlers); `middleware.ts` (per-request auth, populates `context.locals.user`); `types.ts` (shared entity and DTO types). Path alias `@/*` → `src/*`. Add shadcn/ui components with `npx shadcn@latest add [name]` — do not hand-write files in `src/components/ui/`. Supabase migrations: `supabase/migrations/YYYYMMDDHHmmss_<desc>.sql`.

## Commands

- `npm run dev` — dev server (Cloudflare workerd runtime)
- `npm run build` — production SSR build
- `npm run preview` — preview production build locally
- `npm run lint` / `npm run lint:fix` — ESLint with type-checked rules
- `npm run format` — Prettier (Astro + Tailwind plugins)

Pre-commit hooks (husky + lint-staged) automatically run `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}` — do not skip hooks.

## Auth Flow

- `src/lib/supabase.ts` — Supabase SSR client via `@supabase/ssr` with cookie-based sessions. Reads `SUPABASE_URL` and `SUPABASE_KEY` via `astro:env/server` (declared in `astro.config.mjs` env schema).
- `src/middleware.ts` — runs on every request, resolves the current user, attaches to `context.locals.user`. Redirects unauthenticated users away from `PROTECTED_ROUTES`.
- API endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`
- Protected page example: `src/pages/dashboard.astro`

## Environment

- Node.js v22.14.0 (see `.nvmrc`)
- Local dev env vars: copy `.env.example` → `.env` (Node) or use `.dev.vars` (Cloudflare workerd via `wrangler dev`) — both are gitignored
- Local Supabase: `npx supabase start` (requires Docker)
- Deploy: `npx wrangler deploy` — requires `CLOUDFLARE_API_TOKEN` set in environment (OAuth login blocked on corporate proxies; use `$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"` when behind SSL-inspecting proxy)

## Commit Convention

Lowercase imperative, no prefix: `add flashcard generation endpoint`, `fix session refresh bug`. No Conventional Commits prefixes observed in history.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint + build on every push and PR to `master`. Requires `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets.