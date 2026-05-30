import { fsrs, Rating } from 'ts-fsrs';

// Minimal FSRS parameters (example values). These are not tuned.
const GLOBAL_FSRS_PARAMS = {
  request_retention: 0.9,
  maximum_interval: 365,
  w: [0.4025, 0.8913, 3.0082, 16.7118, 5.234, 1.2505, 0.9412, 0.0543, 1.5434, 0.1557, 1.0118, 4.9082, 0.222, 0.4042, 1.4721, 0.2079, 2.7668, 0.4616, 0.2241],
  enable_short_term: true,
  learning_steps: [],
  relearning_steps: []
};

async function main() {
  try {
    const scheduler = fsrs(GLOBAL_FSRS_PARAMS);

    const card = {
      due: new Date(),
      stability: 1,
      difficulty: 1,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: undefined
    };

    const now = new Date();
    const result = scheduler.next(card, now, Rating.Good);

    console.log('ts-fsrs smoke test: SUCCESS');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ts-fsrs smoke test: ERROR');
    console.error(err);
    process.exit(2);
  }
}

main();
