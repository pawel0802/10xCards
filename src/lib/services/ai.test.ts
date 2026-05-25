import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFlashcardsFromText } from './ai';

beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  vi.stubEnv('OPENROUTER_MODEL', 'gpt-4.1');
});

const mockFetch = (content: string, ok = true) =>
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Error',
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response);

describe('generateFlashcardsFromText', () => {
  it('parses valid JSON flashcard array from AI response', async () => {
    mockFetch(JSON.stringify([{ front: 'What is AI?', back: 'Artificial Intelligence' }]));
    const result = await generateFlashcardsFromText('AI basics');
    expect(result).toEqual([{ front: 'What is AI?', back: 'Artificial Intelligence' }]);
  });

  it('throws when AI returns invalid JSON', async () => {
    mockFetch('not json');
    await expect(generateFlashcardsFromText('test')).rejects.toThrow('AI returned invalid JSON');
  });

  it('throws when AI returns JSON with wrong shape', async () => {
    mockFetch(JSON.stringify([{ question: 'What?', answer: 'This.' }]));
    await expect(generateFlashcardsFromText('test')).rejects.toThrow(
      'AI response did not match expected flashcard format.',
    );
  });

  it('throws on API error', async () => {
    mockFetch('', false);
    await expect(generateFlashcardsFromText('fail')).rejects.toThrow(
      'OpenRouter API error: 500 Internal Error',
    );
  });

  it('throws when OPENROUTER_API_KEY is missing', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    await expect(generateFlashcardsFromText('test')).rejects.toThrow(
      'OPENROUTER_API_KEY is not set in environment variables.',
    );
  });
});
