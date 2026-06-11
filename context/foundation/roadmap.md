---
project: "10xCards"
version: 1
status: complete
created: 2026-05-25
updated: 2026-06-11
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: 10xCards

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

10xCards eliminuje barierę manualnego tworzenia fiszek dla samouków uczących się przez powtórki z odstępem (spaced repetition — metoda nauki, która planuje kolejne powtórki na podstawie wyników, tak by utrwalać wiedzę przy minimalnym nakładzie czasu). Kluczowe założenie: jeśli AI może wygenerować ≥ 75% kart, które użytkownik i tak by napisał, operacyjne tarcie znika i spaced repetition staje się domyślnym trybem nauki, nie wyjątkiem. Wyróżnikiem produktu — cechą, której usunięcie sprowadziłoby go do poziomu zwykłego chatbota — jest to, że generowanie AI jest przepuszczane przez krok weryfikacji użytkownika zanim karty trafią do talii.

## North star

**S-04: pełna pętla end-to-end** — wybrana, bo jest bezpośrednim przełożeniem pierwszorzędnego kryterium sukcesu PRD: „end-to-end flow works" (sign-up → paste → AI generates → review → SR session). Dopóki S-04 nie działa, nie ma sensu mierzyć acceptance rate ani walidować hipotezy produktu.

> „Gwiazda przewodnia" oznacza tu: najmniejszy kompletny przepływ produktu, który — gdy zostanie dostarczony — udowadnia, że rdzeń aplikacji działa. Umieszczamy go tak wcześnie w kolejności, jak pozwalają wymagania wstępne, bo wszystko inne ma znaczenie tylko wtedy, gdy ten przepływ działa.

## At a glance

| ID   | Change ID                | Outcome (użytkownik może …)                                                                                           | Prerequisites | PRD refs                                                         | Status   |
| ---- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------- | -------- |
| F-01 | flashcard-data-schema    | (foundation) tabele flashcards i review_logs gotowe w Supabase z RLS; typy TypeScript dostępne w src/types.ts         | —             | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, NFR (prywatność) | done     |
| S-01 | ai-generation-and-review | wkleić tekst i uzyskać kandydatki na fiszki od AI, a następnie zaakceptować, edytować lub odrzucić każdą z osobna     | F-01          | FR-002, FR-003, US-01                                            | done     |
| S-02 | manual-card-creation     | ręcznie stworzyć fiszkę z pytaniem i odpowiedzią                                                                      | F-01          | FR-004                                                           | done     |
| S-03 | card-management          | przeglądać pełną listę swoich fiszek, edytować treść dowolnej fiszki lub ją usunąć                                    | F-01          | FR-005                                                           | done     |
| S-04 | spaced-repetition-review | rozpocząć i ukończyć sesję powtórek spaced repetition, z kartami zaplanowanymi przez algorytm SR na podstawie wyników | S-01          | FR-006                                                           | done     |
| S-05 | dashboard-landing        | po zalogowaniu wejść na dashboard: centrum nawigacyjne z linkami do generatora kart, zarządzania kartami, sesji SR i wylogowania | —             | —                                                                | done     |
| S-06 | ui-ux-improvements      | poprawki UI/UX: Finish button dostępny na każdej stronie (oprócz dashboardu); na /learning zamiast "No flashcards to review." tekst "All caught up!"; nowoczesne kolory przycisków i ikony dla kluczowych CTA | —             | —                                                                | done     |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme             | Chain                    | Note                                                                                  |
| ------ | ----------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| A      | Ścieżka krytyczna | `F-01` → `S-01` → `S-04` | Sekwencja bezpośrednio prowadząca do gwiazdy przewodniej; główna oś dla celu `speed`. |
| B      | Prace równoległe  | `S-02` / `S-03`          | Oba wymagają F-01 (Stream A); realizowane równolegle z S-01.                          |

## Baseline

What's already in place in the codebase as of 2026-05-25 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — Astro + React + Tailwind + Radix/shadcn scaffold; auth UI pages present; brak UI specyficznego dla fiszek (`src/pages/dashboard.astro`, `src/components/ui/button.tsx`)
- **Backend / API:** partial — auth routes present (`src/pages/api/auth/signin.ts`, `signup.ts`, `signout.ts`), middleware present (`src/middleware.ts`); `src/lib/services/` absent — brak serwisów dla fiszek/generowania/SR
- **Data:** absent — brak migracji (`supabase/migrations/` puste), brak `types.ts`, brak seed data; `supabase/config.toml` obecny
- **Auth:** present — Supabase SSR w pełni podłączony: provider (`src/lib/supabase.ts`), weryfikacja sesji (`src/middleware.ts:10-13`), ochrona tras, strony auth (`src/pages/auth/`)
- **Deploy / infra:** present — `.github/workflows/ci.yml` (lint + build na push/PR), `wrangler.jsonc` (Cloudflare config); brak Dockerfile
- **Observability:** absent — brak biblioteki logowania, error trackingu ani metryk

## Foundations

### F-01: Flashcard data schema

- **Outcome:** (foundation) tabele `flashcards` i `review_logs` gotowe w Supabase z politykami RLS (per-user insert/select/update/delete); typy TypeScript wygenerowane i dostępne w `src/types.ts`.
- **Change ID:** flashcard-data-schema
- **PRD refs:** FR-001 (izolacja danych per-user — RLS buduje na istniejącym auth), FR-002, FR-003, FR-004, FR-005, FR-006 (wszystkie FRy wymagają tabel fiszek), NFR (prywatność — dane użytkownika niedostępne dla innych użytkowników)
- **Unlocks:** S-01, S-02, S-03 bezpośrednio; S-04 pośrednio przez S-01
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Błędna definicja schematu — np. brak kolumny dla harmonogramu SR lub złe typy danych — wymusi migrację w połowie projektu; warto uwzględnić wymagania S-04 (pola due_date, ease_factor, interval) zanim schemat zostanie zatwierdzony.
- **Status:** done

## Slices

### S-01: AI generation and review

- **Outcome:** użytkownik może wkleić tekst i uzyskać kandydatki na fiszki od AI, a następnie zaakceptować, edytować lub odrzucić każdą z osobna; zaakceptowane fiszki trafiają natychmiast na listę.
- **Change ID:** ai-generation-and-review
- **PRD refs:** FR-002, FR-003, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-02, S-03
- **Blockers:** —
- **Unknowns:**
  - Który dostawca AI i model użyć do generowania fiszek? — Owner: user. Block: no.
  - Jak zapewnić widoczny postęp podczas generowania (NFR: ≤ 10s z ciągłym feedbackiem)? — Owner: team. Block: no.
- **Risk:** Jakość generowania AI to rdzeń produktu — zbyt niska acceptance rate (poniżej 75%) od razu podważa założenie, na którym zbudowany jest produkt; slice o najwyższym ryzyku produktowym w całym roadmapie.
- **Status:** done

### S-02: Manual card creation

- **Outcome:** użytkownik może ręcznie stworzyć fiszkę, podając pytanie i odpowiedź; fiszka trafia natychmiast na listę.
- **Change ID:** manual-card-creation
- **PRD refs:** FR-004
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Niskie ryzyko — standardowy formularz CRUD; pełni funkcję siatki bezpieczeństwa dla kart, których AI nie wygenerowało lub wygenerowało źle.
- **Status:** done

### S-03: Card management

- **Outcome:** użytkownik może przeglądać pełną listę swoich fiszek, edytować treść dowolnej fiszki lub ją usunąć.
- **Change ID:** card-management
- **PRD refs:** FR-005
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Niskie ryzyko — standardowy widok CRUD; weryfikacja wymaga fiszek w bazie (dostarczonych przez S-01 lub S-02).
- **Status:** done

### S-04: Spaced repetition review

- **Outcome:** użytkownik może rozpocząć sesję powtórek i przejść przez karty zaplanowane przez algorytm SR na podstawie wyników poprzednich sesji; po sesji harmonogram każdej karty jest zaktualizowany.
- **Change ID:** spaced-repetition-review
- **PRD refs:** FR-006
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Która biblioteka SR zintegrować (np. ts-fsrs, srs-js, własna implementacja algorytmu SM-2)? — Owner: user. Block: no.
- **Risk:** Gwiazda przewodnia — wszystkie poprzednie slajzy prowadzą tutaj; błędna biblioteka SR może wymagać refaktoru harmonogramowania kart, ale nie blokuje podstawowego przepływu MVP.
- **Status:** done

### S-05: Dashboard landing page

- **Outcome:** po zalogowaniu użytkownik trafia na dashboard — centralne miejsce z szybkim dostępem do generatora kart (S-01), zarządzania kartami (S-03), sesji nauki (S-04) oraz przyciskiem wylogowania.
- **Change ID:** dashboard-landing
- **PRD refs:** —
- **Prerequisites:** (auth) — baseline (auth pages present)
- **Parallel with:** S-01, S-02, S-03, S-04
- **Blockers:** —
- **Unknowns:**
  - Dokładny układ i CTA (kafelki vs. listy)? — Owner: user. Block: no.
- **Risk:** Niskie ryzyko — podstawowa nawigacja; wpływ głównie na odkrywalność funkcji.
- **Status:** done

### S-06: UI/UX improvements

- **Outcome:** Finish button dostępny na każdej stronie poza dashboardem; na /learning zamiast "No flashcards to review." wiadomość "All caught up!"; przyciski otrzymują nowoczesną paletę kolorów i kluczowe CTA dostają ikonę.
- **Change ID:** ui-ux-improvements
- **PRD refs:** —
- **Prerequisites:** —
- **Parallel with:** S-01, S-02, S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:**
  - Dokładna paleta kolorów i zestaw ikon? — Owner: user. Block: no.
- **Risk:** Niskie ryzyko — kosmetyczne zmiany zwiększające odkrywalność i spójność UI.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID                | Suggested issue title                        | Ready for `/10x-plan` | Notes                                 |
| ---------- | ------------------------ | -------------------------------------------- | --------------------- | ------------------------------------- |
| F-01       | flashcard-data-schema    | Define flashcard and review schema with RLS  | no                    | Implemented                            |
| S-01       | ai-generation-and-review | AI flashcard generation and candidate review | no                    | Implemented                            |
| S-02       | manual-card-creation     | Manual flashcard creation form               | no                    | Implemented                            |
| S-03       | card-management          | Flashcard list, edit, and delete             | no                    | Implemented                            |
| S-04       | spaced-repetition-review | Spaced repetition review session             | no                    | Implemented                            |
| S-05       | dashboard-landing       | Dashboard landing page with navigation and sign-out | no                    | Implemented                            |
| S-06       | ui-ux-improvements      | UI/UX polish: Finish button everywhere (except dashboard), 'All caught up!' message, modern button colors and icons | no                    | Implemented                            |

## Open Roadmap Questions

Brak. PRD nie zawierał otwartych pytań (`quality_check_status: accepted`), a framing roadmapy zamknął wszystkie decyzje sequencingowe. Pytania dotyczące wyboru dostawcy AI i biblioteki SR zostały zarejestrowane jako Unknowns (Block: no) w odpowiednich slajzach i nie blokują planowania.

## Parked

- **Niestandardowy algorytm SR** — Why parked: PRD §Non-Goals: "No custom spaced repetition algorithm." Istniejąca biblioteka SR wystarczy dla MVP.
- **Import plików (PDF, DOCX, itp.)** — Why parked: PRD §Non-Goals: "No file import." Wklejanie tekstu wystarczy do walidacji AI generation loop.
- **Współdzielone zestawy fiszek** — Why parked: PRD §Non-Goals: "No shared flashcard sets." Wszystkie fiszki są prywatne dla konta użytkownika.
- **Integracje z innymi platformami** — Why parked: PRD §Non-Goals: "No integrations with other learning platforms." Brak eksportu do Anki, LMS, itp.
- **Aplikacje mobilne** — Why parked: PRD §Non-Goals: "No mobile apps." Web only for MVP.
- **Observability (logging, error tracking, metryki)** — Why parked: brak NFR w PRD + cel `speed`; domyślna obsługa błędów platformy Cloudflare wystarczy na MVP.


- **S-06: Finish button dostępny na każdej stronie poza dashboardem; na /learning zamiast "No flashcards to review." wiadomość "All caught up!"; przyciski otrzymują nowoczesną paletę kolorów i kluczowe CTA dostają ikonę.
- **Change ID:** ui-ux-improvements
- **PRD refs:** —
- **Prerequisites:** —
- **Parallel with:** S-01, S-02, S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:**
  - Dokładna paleta kolorów i zestaw ikon? — Owner: user. Block: no.
- **Risk:** Niskie ryzyko — kosmetyczne zmiany zwiększające odkrywalność i spójność UI.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID                | Suggested issue title                        | Ready for `/10x-plan` | Notes                                 |
| ---------- | ------------------------ | -------------------------------------------- | --------------------- | ------------------------------------- |
| F-01       | flashcard-data-schema    | Define flashcard and review schema with RLS  | no                    | Implemented                            |
| S-01       | ai-generation-and-review | AI flashcard generation and candidate review | no                    | Implemented                            |
| S-02       | manual-card-creation     | Manual flashcard creation form               | no                    | Implemented                            |
| S-03       | card-management          | Flashcard list, edit, and delete             | no                    | Implemented                            |
| S-04       | spaced-repetition-review | Spaced repetition review session             | no                    | Implemented                            |
| S-05       | dashboard-landing       | Dashboard landing page with navigation and sign-out | no                    | Implemented                            |
| S-06       | ui-ux-improvements      | UI/UX polish: Finish button everywhere (except dashboard), 'All caught up!' message, modern button colors and icons | no                    | Implemented                            |

## Open Roadmap Questions

Brak. PRD nie zawierał otwartych pytań (`quality_check_status: accepted`), a framing roadmapy zamknął wszystkie decyzje sequencingowe. Pytania dotyczące wyboru dostawcy AI i biblioteki SR zostały zarejestrowane jako Unknowns (Block: no) w odpowiednich slajzach i nie blokują planowania.

## Parked

- **Niestandardowy algorytm SR** — Why parked: PRD §Non-Goals: "No custom spaced repetition algorithm." Istniejąca biblioteka SR wystarczy dla MVP.
- **Import plików (PDF, DOCX, itp.)** — Why parked: PRD §Non-Goals: "No file import." Wklejanie tekstu wystarczy do walidacji AI generation loop.
- **Współdzielone zestawy fiszek** — Why parked: PRD §Non-Goals: "No shared flashcard sets." Wszystkie fiszki są prywatne dla konta użytkownika.
- **Integracje z innymi platformami** — Why parked: PRD §Non-Goals: "No integrations with other learning platforms." Brak eksportu do Anki, LMS, itp.
- **Aplikacje mobilne** — Why parked: PRD §Non-Goals: "No mobile apps." Web only for MVP.
- **Observability (logging, error tracking, metryki)** — Why parked: brak NFR w PRD + cel `speed`; domyślna obsługa błędów platformy Cloudflare wystarczy na MVP.


