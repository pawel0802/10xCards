import { describe, it, expect } from 'vitest';
import { applyRating } from '@/lib/scheduler';

describe('SR integration smoke', () => {
  it('scheduler.applyRating smoke test', async () => {
    const card = {
      id: '1',
      user_id: 'u',
      front: 'Front',
      back: 'Back',
      source: 'auto',
      due_date: new Date().toISOString(),
      state: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;

    const res = await applyRating(card, 3);
    expect(res).toBeDefined();
    expect(res.updatedFlashcardFields).toBeDefined();
    expect(res.reviewLogEntry).toBeDefined();
  });
});