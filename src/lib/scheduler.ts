import { fsrs, Rating } from "ts-fsrs";
import type { Flashcard } from "@/types";

// Global FSRS parameters (DEFAULTS for MVP). Tune later or move to env/user settings.
const GLOBAL_FSRS_PARAMS = {
  request_retention: 0.9,
  maximum_interval: 365,
  w: [
    0.4025, 0.8913, 3.0082, 16.7118, 5.234, 1.2505, 0.9412, 0.0543, 1.5434, 0.1557, 1.0118, 4.9082, 0.222, 0.4042,
    1.4721, 0.2079, 2.7668, 0.4616, 0.2241,
  ],
  enable_short_term: true,
  learning_steps: [],
  relearning_steps: [],
};

// Minimal local types for the parts of the fsrs result used here.
interface CardInput {
  due: Date;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: Date | undefined;
}

interface FsrsCardResult {
  state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  due: Date | string;
  last_review?: Date | string | undefined;
}

interface FsrsLog {
  rating: number;
  elapsed_days?: number | null;
  scheduled_days?: number | null;
}

interface FsrsNextResult {
  card: FsrsCardResult;
  log: FsrsLog;
}

const scheduler = fsrs(GLOBAL_FSRS_PARAMS) as unknown as {
  next: (card: CardInput, now: Date, rating: Rating) => FsrsNextResult;
};

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

function toNumber(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v: unknown, fallback?: Date): Date | undefined {
  if (v === undefined || v === null) return fallback;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}

export function applyRating(cardRow: Partial<Flashcard>, ratingNumber: number) {
  // Defensive mapping from DB row -> ts-fsrs card input
  const now = new Date();
  const S_MIN = 1e-3;

  const rawStability = toNumber(cardRow.stability);
  const rawDifficulty = toNumber(cardRow.difficulty);
  const rawReps = toNumber(cardRow.reps);
  const rawLapses = toNumber(cardRow.lapses);
  const rawState = toNumber(cardRow.state);

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

  const cardInput: CardInput = {
    due: toDate(cardRow.due_date, now) ?? now,
    stability: stability,
    difficulty: difficulty,
    reps: rawReps,
    lapses: rawLapses,
    state: rawState,
    last_review: toDate(cardRow.last_review),
  };

  let result: FsrsNextResult;
  try {
    result = scheduler.next(cardInput, now, mapClientRating(ratingNumber));
  } catch (e: unknown) {
    // Log the scheduler error for observability and rethrow so callers can decide
    // how to handle the failure instead of silently masking it.
    let errMsg: string;
    if (typeof e === "object" && e !== null && "message" in e) {
      const em = (e as { message?: unknown }).message;
      errMsg = typeof em === "string" ? em : String(em);
    } else {
      errMsg = String(e);
    }

    console.error("scheduler.next error:", errMsg, { cardInput });
    throw new Error(`Scheduler computation failed: ${errMsg}`);
  }

  const dueIso =
    result.card.due instanceof Date ? result.card.due.toISOString() : new Date(result.card.due).toISOString();
  const lastReviewIso =
    result.card.last_review instanceof Date
      ? result.card.last_review.toISOString()
      : result.card.last_review
        ? new Date(result.card.last_review).toISOString()
        : now.toISOString();

  const updatedFlashcardFields: Partial<Flashcard> & { due_date: string; last_review: string } = {
    state: result.card.state,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    reps: result.card.reps,
    lapses: result.card.lapses,
    due_date: dueIso,
    last_review: lastReviewIso,
  };

  const reviewLogEntry = {
    rating: result.log.rating,
    prior_state: {
      state: cardRow.state ?? 0,
      stability: cardRow.stability ?? 0,
      difficulty: cardRow.difficulty ?? 0,
      reps: cardRow.reps ?? 0,
      lapses: cardRow.lapses ?? 0,
      last_review: cardRow.last_review ?? null,
    } as Record<string, unknown>,
    elapsed_days: result.log.elapsed_days ?? null,
    scheduled_days: result.log.scheduled_days ?? null,
    reviewed_at: now.toISOString(),
  };

  return { updatedFlashcardFields, reviewLogEntry };
}
