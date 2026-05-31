import { fsrs, Rating } from 'ts-fsrs';
import type { Flashcard } from '@/types';

// Global FSRS parameters (DEFAULTS for MVP). Tune later or move to env/user settings.
const GLOBAL_FSRS_PARAMS = {
  request_retention: 0.9,
  maximum_interval: 365,
  w: [0.4025, 0.8913, 3.0082, 16.7118, 5.234, 1.2505, 0.9412, 0.0543, 1.5434, 0.1557, 1.0118, 4.9082, 0.222, 0.4042, 1.4721, 0.2079, 2.7668, 0.4616, 0.2241],
  enable_short_term: true,
  learning_steps: [],
  relearning_steps: []
};

const scheduler = fsrs(GLOBAL_FSRS_PARAMS);

function mapClientRating(r: number) {
  // Client uses 4-point scale: 1=Again,2=Hard,3=Good,4=Easy
  switch (r) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
    default:
      return Rating.Good;
  }
}

export async function applyRating(cardRow: Flashcard, ratingNumber: number) {
  // Defensive mapping from DB row -> ts-fsrs card input
  const now = new Date();
  const S_MIN = 1e-3;

  const rawStability = cardRow.stability === undefined || cardRow.stability === null ? 0 : Number(cardRow.stability);
  const rawDifficulty = cardRow.difficulty === undefined || cardRow.difficulty === null ? 0 : Number(cardRow.difficulty);
  const rawReps = Number(cardRow.reps ?? 0);
  const rawLapses = Number(cardRow.lapses ?? 0);
  const rawState = Number(cardRow.state ?? 0);

  // Normalize difficulty: ts-fsrs expects difficulty in [1,10]. Some existing data may use 0..1 scale.
  let difficulty = rawDifficulty;
  if (rawDifficulty > 0 && rawDifficulty < 1) {
    // map 0..1 -> 1..10
    difficulty = 1 + rawDifficulty * 9;
  }
  // If both are zero, keep zeros to let the scheduler treat card as NEW
  if (rawDifficulty === 0 && rawStability === 0) {
    difficulty = 0;
  }
  // Ensure difficulty meets algorithm minimum when non-zero
  if (difficulty > 0 && difficulty < 1) difficulty = 1;

  // Normalize stability: ensure non-zero stability is at least S_MIN
  let stability = rawStability;
  if (stability > 0 && stability < S_MIN) stability = S_MIN;

  const cardInput: any = {
    due: cardRow.due_date ? new Date(cardRow.due_date) : now,
    stability: stability,
    difficulty: difficulty,
    reps: rawReps,
    lapses: rawLapses,
    state: rawState,
    last_review: cardRow.last_review ? new Date(cardRow.last_review) : undefined,
  };

  let result: any;
  try {
    result = scheduler.next(cardInput, now, mapClientRating(ratingNumber));
  } catch (e: any) {
    // If scheduler validation fails (e.g. invalid memory state), fall back to treating
    // the card as NEW so the algorithm can initialize sensible defaults.
    console.error('scheduler.next validation error, falling back to NEW card:', e?.message ?? e, { cardInput });
    const fallbackInput = { ...cardInput, difficulty: 0, stability: 0, state: 0 };
    result = scheduler.next(fallbackInput, now, mapClientRating(ratingNumber));
  }

  const updatedFlashcardFields = {
    state: result.card.state,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    reps: result.card.reps,
    lapses: result.card.lapses,
    due_date: result.card.due instanceof Date ? result.card.due.toISOString() : new Date(result.card.due).toISOString(),
    last_review: result.card.last_review instanceof Date ? result.card.last_review.toISOString() : (result.card.last_review ? new Date(result.card.last_review).toISOString() : now.toISOString())
  } as any;

  const reviewLogEntry = {
    rating: result.log.rating,
    prior_state: {
      state: cardRow.state,
      stability: cardRow.stability,
      difficulty: cardRow.difficulty,
      reps: cardRow.reps,
      lapses: cardRow.lapses,
      last_review: cardRow.last_review,
    },
    elapsed_days: result.log.elapsed_days,
    scheduled_days: result.log.scheduled_days,
    reviewed_at: now.toISOString(),
  } as any;

  return { updatedFlashcardFields, reviewLogEntry };
}
