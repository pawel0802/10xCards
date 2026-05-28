import { describe, it, vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlashcardList } from './FlashcardList';
import type { Flashcard } from '@/types';

vi.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.join(' ') }));

describe('FlashcardList', () => {
  it('renders loading state', () => {
    render(<FlashcardList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: [], count: 0 })
    });
    render(<FlashcardList />);
    expect(await screen.findByText(/you don't have any flashcards yet/i)).toBeInTheDocument();
    expect(screen.getByText(/generate the first one/i)).toBeInTheDocument();
    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });

  it('renders flashcards', async () => {
    const cards: Flashcard[] = [
      { id: '1', front: 'Front 1', back: 'Back 1', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 },
            { id: '2', front: 'Front 2', back: 'Back 2', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 }
    ];
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: cards, count: 2 })
    });
    render(<FlashcardList />);
    expect(await screen.findByText('Front 1')).toBeInTheDocument();
    expect(screen.getByText('Back 2')).toBeInTheDocument();
  });
});
