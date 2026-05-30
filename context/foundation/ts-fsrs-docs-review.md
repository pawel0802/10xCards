Dokumentacja przygotowana przez model GPT-5.1 mini jest na wysokim poziomie, dobrze rozumie architekturę systemów rozproszonych (zwrócenie uwagi na transakcje i FOR UPDATE zasługuje na dużego plusa), ale zawiera kilka fundamentalnych, krytycznych błędów w zrozumieniu działania samej biblioteki ts-fsrs oraz algorytmu FSRS.
Model pomylił parametry globalne algorytmu (wagi w, pożądana retencja) ze stanem pojedynczej karty (stability, difficulty). Ponowne ładowanie tych danych do konstruktora doprowadzi do błędów i nadpisania logiki algorytmu.
Poniżej znajduje się szczegółowe review z podziałem na błędy krytyczne, mniejsze nieścisłości oraz wersja poprawiona (refaktoryzacja kodu).
------------------------------
## ❌ Błędy Krytyczne (Musisz to poprawić)## 1. Fundamentalne pomieszanie generatorParameters ze stanem karty

* Jak napisał model: Sugeruje, aby zapisywać generatorParameters() jako generator_params (JSONB) w każdej karcie, a potem inicjalizować scheduler per karta: fsrs(cardRow.generator_params).
* Dlaczego to błąd: generatorParameters (w bibliotece ts-fsrs poprawna nazwa to po prostu generatorParameters() lub właściwość p / parameters) to globalne ustawienia algorytmu (19 wag w, request_retention, maximum_interval). Te parametry są takie same dla całego użytkownika lub całej aplikacji!
* Konsekwencja: Przechowywanie tego w każdej karcie to ogromny overhead (marnowanie pamięci DB). Co gorsza, model myśli, że to tam zapisuje się "pamięć karty" (stability, difficulty). To błąd – stanem karty są jej własne pola (stability, difficulty, state), a nie parametry generatora.

## 2. Błędne mapowanie Rating (Rating.Manual)

* Jak napisał model: Rating: Manual=0, Again=1, Hard=2, Good=3, Easy=4 oraz mapowanie w kodzie case 0: return Rating.Again.
* Dlaczego to błąd: W ts-fsrs enum Rating nie zawiera wartości Manual=0 jako oceny powtórki. Typowy enum w bibliotece wygląda tak:

export enum Rating {
Again = 1,
Hard = 2,
Good = 3,
Easy = 4,
}

W kodzie pseudofunkcji model mapuje clientRating (0..3) na Rating (1..4). Jeśli Twój frontend wysyła 0,1,2,3, to mapowanie jest poprawne matematycznie, ale opis tekstowy Manual=0 wprowadza w błąd i sugeruje istnienie 5-stopniowej skali w algorytmie.

## 3. Nieprawidłowe użycie scheduler.generatorParameters w kodzie serwera

* Jak napisał model: const newParams = typeof scheduler.generatorParameters === 'function' ? scheduler.generatorParameters() : null i zapisywanie tego po każdej powtórce.
* Dlaczego to błąd: Metoda generatorParameters() zwraca statyczną konfigurację, którą sam przekazałeś do fsrs(). Wywołanie scheduler.next() w żaden sposób nie zmienia parametrów globalnych (wag w). Zmienia tylko parametry karty (card.stability, card.difficulty). Zapisywanie tego do bazy po każdej powtórce nie ma sensu.

------------------------------
## ⚠️ Mniejsze błędy i nieścisłości

1. prev_ease_factor i new_ease_factor w logach: Algorytm FSRS (w przeciwieństwie do starego SM-2 z Anki) nie używa w ogóle pojęcia Ease Factor (EF). Używa stability i difficulty. Model zostawił to ze znakiem zapytania, ale należy to bezwzględnie usunąć z bazy, aby nie mylić pojęć.
2. last_review: db.updated_at || ...: W algorytmie FSRS last_review jest kluczowe do obliczenia czasu, jaki upłynął od ostatniej powtórki (elapsed_days). Używanie updated_at (które może się zmienić, gdy użytkownik np. edytuje treść fiszki) jako daty ostatniej powtórki popsuje matematykę algorytmu. last_review musi być osobną kolumną w DB (typu timestamp, nullable dla nowych kart).

------------------------------
## 🛠️ Jak powinna wyglądać poprawna architektura danych?

1. Ustawienia globalne (FSRSParameters): Trzymasz w pamięci aplikacji (jako stałą) lub w tabeli users / user_settings (jeśli użytkownik może sam zmieniać pożądaną retencję lub gdy optymalizator wyliczy mu własne wagi w).
2. Karta (Flashcard): Przechowuje wyłącznie swój aktualny stan: state, reps, lapses, stability, difficulty, due, last_review.

------------------------------
## 💻 Poprawiony i zoptymalizowany kod serwera
Oto jak powinien wyglądać ten handler przy poprawnym użyciu ts-fsrs:

import { fsrs, Rating, State, Card, FSRSParameters } from 'ts-fsrs'import { getPgClient } from './db'
// 1. Definiujesz globalne parametry (np. domyślne lub pobrane z ustawień użytkownika)const GLOBAL_FSRS_PARAMS: FSRSParameters = {
request_retention: 0.9,
maximum_interval: 365,
w: [0.4025, 0.8913, 3.0082, 16.7118, 5.234, 1.2505, 0.9412, 0.0543, 1.5434, 0.1557, 1.0118, 4.9082, 0.222, 0.4042, 1.4721, 0.2079, 2.7668, 0.4616, 0.2241],
enable_short_term: true,
learning_steps: [],
relearning_steps: []
};
// Inicjalizacja schedulera raz (lub per request, jeśli użytkownicy mają różne wagi)const scheduler = fsrs(GLOBAL_FSRS_PARAMS);
async function handleReview({ userId, flashcardId, clientRating }: { userId: string, flashcardId: string, clientRating: number }) {
const pg = await getPgClient()
try {
await pg.query('BEGIN')

    // Blokada wiersza (FOR UPDATE) - super, że model o tym pomyślał!
    const res = await pg.query(
      'SELECT id, state, reps, lapses, stability, difficulty, due_date, last_review FROM flashcards WHERE id=$1 AND user_id=$2 FOR UPDATE', 
      [flashcardId, userId]
    )
    const cardRow = res.rows[0]
    if (!cardRow) throw new Error('Card not found');

    // 2. POPRAWNE mapowanie na obiekt Card akceptowany przez ts-fsrs
    const cardInput: Card = {
      due: new Date(cardRow.due_date),
      stability: cardRow.stability ? Number(cardRow.stability) : 0,
      difficulty: cardRow.difficulty ? Number(cardRow.difficulty) : 0,
      reps: Number(cardRow.reps ?? 0),
      lapses: Number(cardRow.lapses ?? 0),
      state: cardRow.state as State, // W DB przechowuj jako int (0,1,2,3) odpowiadający enum State
      last_review: cardRow.last_review ? new Date(cardRow.last_review) : undefined,
    }

    // 3. Mapowanie ratingu (0..3 z frontu na 1..4 z biblioteki)
    const mapRating = (r: number): Rating => {
      const mapping: Record<number, Rating> = { 0: Rating.Again, 1: Rating.Hard, 2: Rating.Good, 3: Rating.Easy };
      return mapping[r] ?? Rating.Good;
    }

    // 4. Wywołanie algorytmu
    const now = new Date();
    const result = scheduler.next(cardInput, now, mapRating(clientRating));
    
    // result.card zawiera zaktualizowany stan karty
    // result.log zawiera log powtórki (przydatny do historii i optymalizatora)

    // 5. Zapis do bazy danych (wagi w aplikacji się NIE zmieniły, zapisujemy tylko stan karty)
    await pg.query(`
      UPDATE flashcards SET 
        state = $1,
        reps = $2,
        lapses = $3,
        stability = $4,
        difficulty = $5,
        due_date = $6,
        last_review = $7,
        updated_at = $8
      WHERE id = $9
    `, [
      result.card.state,
      result.card.reps,
      result.card.lapses,
      result.card.stability,
      result.card.difficulty,
      result.card.due,
      result.card.last_review,
      now,
      flashcardId
    ]);

    // 6. Zapis do review_logs dla optymalizatora (zapisujemy stan PRZED powtórką)
    await pg.query(`
      INSERT INTO review_logs 
        (flashcard_id, user_id, rating, state, elapsed_days, scheduled_days, reviewed_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      flashcardId, 
      userId, 
      mapRating(clientRating), 
      cardInput.state,                 // Stan przed powtórką
      result.log.elapsed_days, 
      result.log.scheduled_days, 
      now
    ]);

    await pg.query('COMMIT')
    return { success: true, newDueDate: result.card.due }
} catch(e) {
await pg.query('ROLLBACK');
throw e
}
}

------------------------------
## 📝 Co musisz poprawić w dokumentacji (Checklista dla Ciebie):

* Usuń kolumnę generator_params z tabeli flashcards. Przenieś te parametry na poziom globalny lub do tabeli z ustawieniami użytkownika.
* Zmień nazwę kolumny w DB z repetitions na reps oraz dodaj kolumnę lapses (FSRS śledzi błędy osobno).
* Zmień definicję logów: Usuń z logów prev_generator_params, new_generator_params oraz ease_factor. Do optymalizatora FSRS potrzebujesz w logach tylko: card_id, rating (1-4), reviewed_at oraz opcjonalnie stanu karty przed powtórką (state, elapsed_days).
* Skoryguj mapowanie dat: last_review w bazy danych musi odzwierciedlać dokładny moment wykonania powtórki, a nie ogólną edycję karty (updated_at).

W razie wdrażania optymalizatora @open-spaced-repetition/binding (krok z sekcji Parameter training), funkcja convertCsvToFsrsItems będzie oczekiwać dokładnie takiej struktury logów: ID karty, ID powtórki, ocena (1-4) i timestamp.
Czy chcesz, żebym pomógł Ci zaprojektować dokładny schemat tabel w SQL (np. dla Supabase/PostgreSQL) uwzględniający te poprawki pod algorytm FSRS?

