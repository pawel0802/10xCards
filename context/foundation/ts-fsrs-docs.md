# ts-fsrs Integration Notes (S-04 reference)

Purpose
- Local, shareable reference for integrating ts-fsrs into 10xCards (spaced-repetition review S-04). Includes install, core APIs, rehydration mapping, server integration examples, concurrency guidance, optimizer usage, debugging tips, and recommended next steps.

Date: 2026-05-30

---

## Install

- Scheduler only: `npm install ts-fsrs`
- Optimizer / parameter training (optional): `npm install @open-spaced-repetition/binding`

## Core concepts & API (quick)

```ts
import { createEmptyCard, fsrs, Rating, State, generatorParameters } from 'ts-fsrs'

const scheduler = fsrs() // or fsrs(params)
const card = createEmptyCard()

// Preview outcomes
const preview = scheduler.repeat(card, new Date())
// Apply rating
const result = scheduler.next(card, new Date(), Rating.Good)
```

Key types/fields
- Rating: Manual=0, Again=1, Hard=2, Good=3, Easy=4
- Card (high level): due (Date), reps (number), lapses, stability, difficulty, scheduled_days, last_review, state
- FSRSParameters: request_retention, maximum_interval, w, enable_short_term, learning_steps, relearning_steps

repeat() vs next()
- repeat(card, now): returns preview for all Rating outcomes (useful for UI preview)
- next(card, now, Rating.X): apply chosen rating, returns { card, log }

After-handler
- Both repeat/next accept an optional afterHandler to transform record logs (e.g., convert Date → ISO/ms) before persisting.

## generatorParameters and persistence
- `scheduler.generatorParameters()` returns a serializable FSRSParameters object (use JSON.parse(JSON.stringify(...)) to clone safely before DB write).
- To rehydrate full internal state, pass saved parameters to `fsrs(params)` when creating the scheduler. This preserves internal memory (stability/difficulty/reps).
- `fsrs()` already applies default generatorParameters internally; storing explicit params lets you reproduce/tune behavior.

## DB mapping recommendations (flashcards table)
Recommended columns (Flashcards):
- id (pk), user_id
- front, back, source
- state (enum)
- due_date (timestamptz)
- interval_days (int) or scheduled_days (numeric)
- repetitions (int) -- map to ts-fsrs `reps`
- generator_params (jsonb) -- canonical algorithm state
- stability (numeric, optional)
- difficulty (numeric, optional)
- created_at, updated_at

Review logs (review_logs) should keep prev/new snapshots:
- flashcard_id, user_id, rating, prev_generator_params, new_generator_params, prev_interval_days, new_interval_days, prev_ease_factor?, new_ease_factor?, reviewed_at

Notes:
- Prefer storing ts-fsrs Rating (1..4) in review_logs to avoid client/server mapping confusion. If client uses 0..3, map on server.
- Keep generator_params as JSONB; it is the authoritative serializer of internal parameters.

## Rehydration mapping (DB → fsrs CardInput)
- Use `fsrs(savedParams)` when savedParams exist, else `fsrs()` with fallback.
- CardInput mapping:
  - due: new Date(db.due_date)
  - state: map DB string/enum → ts-fsrs State
  - reps: Number(db.repetitions || 0)
  - last_review: db.last_review || db.updated_at || new Date()
  - stability/difficulty: if stored, include them

Beware: ts-fsrs expects `reps` (not `repetition`); map accordingly.

## Server-side POST review handler (pattern)
- Use a DB transaction with `SELECT ... FOR UPDATE` on the flashcard row to prevent concurrent races. Supabase REST does not directly expose FOR UPDATE; use a server-side Postgres connection or RPC/stored procedure.

Pseudocode (TypeScript, node-postgres style):

```ts
import { fsrs, Rating, State } from 'ts-fsrs'
import { getPgClient } from './db' // your server pg client helper

async function handleReview({ userId, flashcardId, clientRating }){
  const pg = await getPgClient()
  try {
    await pg.query('BEGIN')
    const res = await pg.query('SELECT * FROM flashcards WHERE id=$1 AND user_id=$2 FOR UPDATE', [flashcardId, userId])
    const cardRow = res.rows[0]
    const params = cardRow.generator_params ?? undefined
    const scheduler = fsrs(params)

    const cardInput = {
      due: cardRow.due_date ?? new Date(),
      state: /* map cardRow.state */,
      reps: Number(cardRow.repetitions ?? 0),
      stability: cardRow.stability ?? undefined,
      difficulty: cardRow.difficulty ?? undefined,
      last_review: cardRow.updated_at ?? cardRow.created_at ?? new Date(),
    }

    const mapClientRating = (r: number) => {
      switch(r){ case 0: return Rating.Again; case 1: return Rating.Hard; case 2: return Rating.Good; case 3: return Rating.Easy }
    }

    const result = scheduler.next(cardInput, new Date(), mapClientRating(clientRating))
    const newParams = typeof scheduler.generatorParameters === 'function' ? scheduler.generatorParameters() : null

    const updatedFields = {
      repetitions: result.card.reps,
      interval_days: Math.round(result.card.scheduled_days ?? 0),
      due_date: result.card.due instanceof Date ? result.card.due.toISOString() : new Date(result.card.due).toISOString(),
      generator_params: newParams,
      stability: result.card.stability,
      difficulty: result.card.difficulty,
    }

    await pg.query('UPDATE flashcards SET ... WHERE id=$1', [ /* ... */ ])
    await pg.query('INSERT INTO review_logs (...) VALUES (...)', [ /* prev/new snapshots */ ])
    await pg.query('COMMIT')
    return { updated: updatedFields }
  } catch(e){ await pg.query('ROLLBACK'); throw e }
}
```

Tips
- Use fsrs(...params) rather than trying to mutate an existing scheduler instance with unknown update_parameters() bindings. The constructor accepts FSRSParameters.
- Use the optional afterHandler on `next()` to serialize Dates and avoid double-conversion before DB writes.

## Concurrency options for Supabase
- Recommended: run the scheduler inside a server function that talks to Postgres directly (pg) and performs `FOR UPDATE` + transaction.
- Alternative: write a secure Postgres stored procedure (PL/pgSQL) that runs on the DB server and returns updated rows; call via Supabase RPC.
- Do NOT rely on two separate REST calls to read then update without an explicit lock; race conditions will corrupt SR state.

## Parameter training & binding
- Use `@open-spaced-repetition/binding` to computeParameters from review logs (CSV or programmatic). Example usage in binding README:

```ts
import { computeParameters, convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
const csv = readFileSync('revlog.csv')
const items = convertCsvToFsrsItems(csv, 4, 'UTC', tzOffsetFn)
const params = await computeParameters(items, { enableShortTerm: true })
```

Notes: binding may require WASI or dynamic loading in browser contexts; server/node usage is straightforward.

## Debugging & gotchas seen in 10xCards
- generator_params was null on new cards: ensure `save-flashcards` initializes generator_params using scheduler.generatorParameters() and serializes/clones it.
- `reps` vs `repetitions`: ts-fsrs uses `reps` in Card; map DB `repetitions` → `reps` when building CardInput.
- If ef/ease_factor doesn't change: likely scheduler lacked generator_params or reps was zero — rehydrate fully.
- Date parsing: always pass ISO strings or Date objects to fsrs; normalize with `new Date(val)` and guard invalid dates.
- DB constraint on review_logs.rating: decide whether to store ts-fsrs Rating (1..4) or client 0..3. Storing ts-fsrs Rating is recommended.

## Implementation checklist (recommended next steps)
- [ ] Ensure save-flashcards seeds generator_params for new cards (done / verify)
- [ ] Backfill generator_params for existing cards (script)
- [ ] Implement transactional POST /api/flashcards/:id/review using pg FOR UPDATE or RPC
- [ ] Add columns for stability/difficulty if you want to surface analytics
- [ ] Add unit/integration tests that simulate repeat/next sequences and assert DB writes
- [ ] Reconcile review_logs.rating constraint with chosen rating mapping

## References
- ts-fsrs repo: https://github.com/open-spaced-repetition/ts-fsrs
- ts-fsrs package README: packages/fsrs/README.md (Quickstart, repeat/next, generatorParameters)
- binding README: packages/binding/README.md (optimizer, computeParameters examples)
- TypeDoc: https://open-spaced-repetition.github.io/ts-fsrs/

---

If you want this file moved to another path, or want me to also create a backfill script and a transactional review endpoint implemention, say which next step to take.
