import { describe, it, expect, vi } from 'vitest';

const handler = async (body: any) => {
  // Simulate Astro API POST handler
  const mod = await import('./generate-flashcards');
  const req = { json: async () => body } as any;
  return mod.POST({ request: req } as any);
};

describe('POST /api/generate-flashcards', () => {
  it('returns 400 for missing text', async () => {
    const res = await handler({});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(Array.isArray(data.error)).toBe(true);
      expect(data.error[0].message).toMatch(/expected string, received undefined/i);
  });

  it('returns 400 for empty text', async () => {
    const res = await handler({ text: '' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error[0].message).toMatch(/required/i);
  });

  it('returns 400 for invalid batchSize', async () => {
    const res = await handler({ text: 'foo', batchSize: 0 });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error[0].message).toMatch(/expected number to be >=1/i);
  });

  // Top-level mock for AI service
  vi.mock('@/lib/services/ai', () => ({
    generateFlashcardsFromText: vi.fn(async (text: string) => {
      if (text === 'fail') throw new Error('fail');
      return [{ front: 'Q', back: 'A' }];
    }),
  }));

  it('returns 200 and flashcards for valid input', async () => {
    const res = await handler({ text: 'foo', batchSize: 2 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.flashcards)).toBe(true);
    expect(data.flashcards[0]).toEqual({ front: 'Q', back: 'A' });
  });

  it('returns 500 if AI service throws', async () => {
    const res = await handler({ text: 'fail' });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('fail');
  });

  it('returns 500 for invalid JSON body', async () => {
    // Simulate request.json() throwing
    const mod = await import('./generate-flashcards');
    const req = { json: async () => { throw new Error('bad json'); } } as any;
    const res = await mod.POST({ request: req } as any);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/invalid request/i);
  });
});
