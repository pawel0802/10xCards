# Card Management (CRUD) — Plan Brief

> Full plan: `context/changes/card-management/plan.md`

## What & Why

Budujemy panel zarządzania fiszkami: przeglądanie, edycja, usuwanie (pojedynczo i masowo), paginacja, sortowanie, modal edycji, toast powiadomienia. Ułatwi to użytkownikom zarządzanie własnymi fiszkami w jednym miejscu.

## Starting Point

Obecnie CRUD działa lokalnie lub częściowo przez API (brak pobierania/usuwania z backendu). Paginacja i sortowanie są lokalne. Autoryzacja użytkownika jest obecna.

## Desired End State

Użytkownik widzi listę swoich fiszek z paginacją (10 na stronę), sortowaną po dacie utworzenia. Może edytować treść/odpowiedź (modal, source="hybrid" po edycji), usuwać pojedynczo (bez potwierdzenia) i masowo (z potwierdzeniem). Po operacjach pojawia się toast, lista odświeża się automatycznie. Panel tylko dla zalogowanych.

## Key Decisions Made

| Decision                        | Choice                                    | Why (1 sentence)                                 | Source |
|----------------------------------|-------------------------------------------|--------------------------------------------------|--------|
| CRUD zakres                      | Przeglądanie, edycja, usuwanie, masowe    | Najczęstsze operacje, zgodnie z feedbackiem      | Plan   |
| Edycja pól                       | Tylko treść/odpowiedź, source→hybrid      | Minimalizacja ryzyka błędów, zgodność z modelem  | Plan   |
| Usuwanie pojedyncze/masowe       | Pojedyncze bez potwierdzenia, masowe z    | UX: szybkość i bezpieczeństwo                    | Plan   |
| Modal edycji                     | Tak                                       | Spójność z istniejącym UI                        | Plan   |
| Toasty                           | Tak                                       | Szybka informacja zwrotna                       | Plan   |
| Paginacja/sortowanie             | Backendowa, 10 na stronę, po dacie        | Wydajność i czytelność                           | Plan   |
| Autoryzacja                      | Tylko zalogowani                          | Bezpieczeństwo danych                            | Plan   |
| Eksport/import                   | Brak                                      | Zgodnie z PRD                                    | Plan   |
| Undo usuwania                    | Brak                                      | Prostota, UX                                     | Plan   |

## Scope

**In scope:**
- Panel zarządzania fiszkami (CRUD)
- Paginacja, sortowanie, modal edycji, toast
- Usuwanie pojedyncze/masowe
- Autoryzacja

**Out of scope:**
- Eksport/import
- Undo usuwania
- Edycja innych pól niż treść/odpowiedź

## Architecture / Approach

Backend-first: najpierw API (CRUD, paginacja, autoryzacja), potem UI (lista, modal, masowe akcje), na końcu testy i weryfikacja.

## Phases at a Glance

| Phase     | What it delivers                        | Key risk                  |
|-----------|-----------------------------------------|---------------------------|
| 1. API    | Endpointy CRUD, paginacja, autoryzacja  | Błędy w walidacji lub auth|
| 2. Lista  | Widok z paginacją, sortowaniem, akcjami | Integracja z API          |
| 3. Edycja/usuwanie | Modal, masowe akcje, toasty     | UX edge-case’y            |
| 4. Auth   | Ograniczenie dostępu                    | Przekierowania            |
| 5. Testy  | Pokrycie testami, manualna weryfikacja  | Edge-case’y               |

**Prerequisites:** Model fiszki, autoryzacja, migracje istnieją
**Estimated effort:** ~2-3 sesje, 5 faz

## Open Risks & Assumptions
- Integracja z istniejącym modelem i auth
- Możliwe edge-case’y przy masowych operacjach

## Success Criteria (Summary)
- Użytkownik może zarządzać fiszkami zgodnie z zakresem
- Operacje są szybkie, bezpieczne i czytelne
- Brak regresji w innych funkcjach
