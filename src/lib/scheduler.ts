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
  const cardInput = {
    due: cardRow.due_date ? new Date(cardRow.due_date) : new Date(),
    stability: Number(cardRow.stability ?? 0),
    difficulty: Number(cardRow.difficulty ?? 0.3),
    reps: Number(cardRow.reps ?? 0),
    lapses: Number(cardRow.lapses ?? 0),
    state: Number(cardRow.state ?? 0),
    last_review: cardRow.last_review ? new Date(cardRow.last_review) : undefined,
  } as any;

  const now = new Date();
  const result = scheduler.next(cardInput, now, mapClientRating(ratingNumber));

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
