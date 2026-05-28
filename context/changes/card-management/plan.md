# Card Management (CRUD) Implementation Plan

## Overview

Wdrażamy panel zarządzania fiszkami: przeglądanie, edycja, usuwanie (pojedynczo i masowo), paginacja, sortowanie, modal edycji, toast powiadomienia. Dostęp tylko dla zalogowanych. Brak eksportu/importu.

## Current State Analysis

- Brak backendowego pobierania/usuwania fiszek (CRUD lokalny lub częściowy)
- Edycja i tworzenie obsługiwane lokalnie lub przez API tylko dla zapisu
- Paginacja to lokalny indeks, nie backendowa
- Autoryzacja użytkownika obecna w middleware i API

## Desired End State

- Użytkownik widzi listę swoich fiszek z paginacją (10 na stronę), sortowaną po dacie utworzenia (najnowsze na górze)
- Może edytować treść i odpowiedź fiszki (modal); jeśli source="auto", zmienia się na "hybrid"
- Może usuwać pojedynczo (bez potwierdzenia) i masowo (z potwierdzeniem)
- Po operacjach pojawia się toast, lista odświeża się automatycznie
- Panel dostępny tylko dla zalogowanych

### Key Discoveries:

- Model: src/types.ts:8-20
- Migracje: supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql, 20260527151900_recreate_flashcards_and_review_logs.sql
- Walidacja: src/pages/api/save-flashcards.ts:5-13
- Edycja/logika hybrid: src/components/ReviewFlashcards.tsx:80-95
- Autoryzacja: src/middleware.ts, src/pages/api/save-flashcards.ts

## What We're NOT Doing

- Eksport/import fiszek
- Edycja innych pól niż treść/odpowiedź
- Undo usuwania

## Implementation Approach

Backend-first: najpierw API (CRUD, paginacja, autoryzacja), potem UI (lista, modal, masowe akcje), na końcu testy i weryfikacja.

---

## Phase 1: Backend API: CRUD fiszek

### Overview
Dodanie endpointów do pobierania, edycji, usuwania (pojedynczo i masowo) oraz paginacji. Autoryzacja po stronie API.

### Changes Required:

#### 1. API endpoints
**File**: src/pages/api/flashcards.ts
**Intent**: Udostępnić GET (lista z paginacją), PATCH (edycja), DELETE (usuwanie pojedyncze i masowe)
**Contract**: Zgodność z modelem, autoryzacja, walidacja zod

#### 2. Supabase query helpers
**File**: src/lib/services/flashcards.ts
**Intent**: Funkcje do pobierania, edycji, usuwania, paginacji
**Contract**: Zwracają tylko fiszki zalogowanego użytkownika

### Success Criteria:
#### Automated Verification:
- Endpointy zwracają poprawne dane (unit testy)
- Walidacja zod działa
- Autoryzacja blokuje niezalogowanych

#### Manual Verification:
- Pobieranie, edycja, usuwanie działa przez API (np. Postman)

---

## Phase 2: Widok listy fiszek

### Overview
Nowy widok z paginacją, sortowaniem, zaznaczaniem wielu, akcjami edycji/usuwania.

### Changes Required:

#### 1. Komponent listy
**File**: src/components/FlashcardList.tsx
**Intent**: Wyświetla listę z paginacją, sortowaniem, zaznaczaniem wielu. Jeśli lista jest pusta, pokazuje tekst "You don't have any flashcards yet" oraz dwa przyciski: niebieski "Generate the first one" (przenosi na /generate) i bordowy "Back" (przenosi na /dashboard).
**Contract**: Pobiera dane z API, obsługuje loading/error, obsługuje stan pustej listy zgodnie z powyższym opisem.

#### 2. Integracja z panelem
**File**: src/pages/flashcards.astro
**Intent**: Nowa strona panelu zarządzania
**Contract**: Dostęp tylko dla zalogowanych

### Success Criteria:
#### Automated Verification:
- Komponent renderuje poprawnie (unit testy)

#### Manual Verification:
- Lista działa, paginacja i sortowanie poprawne

---

## Phase 3: Edycja i usuwanie fiszek

### Overview
Modal do edycji, obsługa usuwania pojedynczego i masowego (z potwierdzeniem).

### Changes Required:

#### 1. Modal edycji
**File**: src/components/EditFlashcardModal.tsx
**Intent**: Edycja treści/odpowiedzi, zmiana source na hybrid jeśli trzeba
**Contract**: Wywołuje PATCH na API

#### 2. Usuwanie
**File**: src/components/FlashcardList.tsx
**Intent**: Usuwanie pojedyncze (bez potwierdzenia), masowe (z potwierdzeniem)
**Contract**: Wywołuje DELETE na API

#### 3. Toasty
**File**: src/components/ui/Toast.tsx
**Intent**: Powiadomienia po operacjach
**Contract**: Pokazuje sukces/błąd

### Success Criteria:
#### Automated Verification:
- Edycja/usuwanie działa (unit testy)

#### Manual Verification:
- Modal działa, toasty się pojawiają, lista odświeża się automatycznie

---

## Phase 4: Integracja z autoryzacją

### Overview
Ograniczenie dostępu do panelu tylko dla zalogowanych.

### Changes Required:

#### 1. Middleware/guard
**File**: src/middleware.ts, src/pages/flashcards.astro
**Intent**: Blokuje niezalogowanych
**Contract**: Przekierowanie na signin

### Success Criteria:
#### Automated Verification:
- Middleware działa (unit testy)

#### Manual Verification:
- Niezalogowany nie ma dostępu

---

## Phase 5: Testy i weryfikacja

### Overview
Pokrycie testami, manualna weryfikacja edge-case’ów.

### Changes Required:

#### 1. Testy jednostkowe i integracyjne
**File**: src/lib/services/flashcards.test.ts, src/components/FlashcardList.test.tsx
**Intent**: Pokrycie kluczowych ścieżek
**Contract**: Testy edge-case’ów (brak fiszek, błąd API, masowe usuwanie)

### Success Criteria:
#### Automated Verification:
- Wszystkie testy przechodzą

#### Manual Verification:
- Edge-case’y zweryfikowane ręcznie

---

## Testing Strategy

### Unit Tests:
- API endpoints (CRUD, autoryzacja)
- Komponent listy (render, paginacja, sortowanie)
- Modal edycji
- Usuwanie (pojedyncze/masowe)

### Integration Tests:
- End-to-end: zalogowany użytkownik zarządza fiszkami

### Manual Testing Steps:
1. Zaloguj się i przejdź do panelu
2. Dodaj, edytuj, usuń fiszkę (pojedynczo i masowo)
3. Sprawdź paginację, sortowanie, toasty
4. Zweryfikuj brak dostępu dla niezalogowanych

## Performance Considerations
- Paginacja backendowa, limity zapytań

## Migration Notes
- Brak migracji (model już istnieje)

## References
- Model: src/types.ts
- Migracje: supabase/migrations/
- Walidacja: src/pages/api/save-flashcards.ts
- Edycja/logika hybrid: src/components/ReviewFlashcards.tsx
- Autoryzacja: src/middleware.ts

## Progress

### Phase 1: Backend API: CRUD fiszek
#### Automated
- [ ] 1.1 Endpointy zwracają poprawne dane (unit testy)
- [ ] 1.2 Walidacja zod działa
- [ ] 1.3 Autoryzacja blokuje niezalogowanych
#### Manual
- [ ] 1.4 Pobieranie, edycja, usuwanie działa przez API (np. Postman)

### Phase 2: Widok listy fiszek
#### Automated
- [ ] 2.1 Komponent renderuje poprawnie (unit testy)
#### Manual
- [ ] 2.2 Lista działa, paginacja i sortowanie poprawne

### Phase 3: Edycja i usuwanie fiszek
#### Automated
- [ ] 3.1 Edycja/usuwanie działa (unit testy)
#### Manual
- [ ] 3.2 Modal działa, toasty się pojawiają, lista odświeża się automatycznie

### Phase 4: Integracja z autoryzacją
#### Automated
- [ ] 4.1 Middleware działa (unit testy)
#### Manual
- [ ] 4.2 Niezalogowany nie ma dostępu

### Phase 5: Testy i weryfikacja
#### Automated
- [ ] 5.1 Wszystkie testy przechodzą
#### Manual
- [ ] 5.2 Edge-case’y zweryfikowane ręcznie
