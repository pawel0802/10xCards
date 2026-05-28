import { describe, it, vi, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
afterEach(cleanup);
import { FlashcardList } from './FlashcardList';
import type { Flashcard } from '@/types';

vi.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.join(' ') }));

describe('FlashcardList', () => {
  it('renders loading state', () => {
    render(<FlashcardList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: [], count: 0 })
    });
    render(<FlashcardList />);
    expect(await screen.findByText(/you don't have any flashcards yet/i)).toBeInTheDocument();
    expect(screen.getByText(/generate flashcards/i)).toBeInTheDocument();
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

describe('FlashcardList advanced actions', () => {
  const card: Flashcard = { id: '1', front: 'Front', back: 'Back', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 };

  it('opens edit modal and saves changes', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ data: [card], count: 1 }) }) // initial fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH
    render(<FlashcardList />);
      // Wait for the table cell, not the label
      expect((await screen.findAllByText('Front', { selector: 'td' })).length).toBeGreaterThan(0);
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
        fireEvent.click(editButtons[0]);
        expect(screen.getByText('Edit Flashcard')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Front', { selector: 'input' }), { target: { value: 'Edited Front' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.queryByText('Edit Flashcard')).not.toBeInTheDocument());
    expect(screen.getByText('Flashcard updated!')).toBeInTheDocument();
  });

  it('deletes a flashcard', async () => {
    const cards: Flashcard[] = [
      { id: '1', front: 'Front 1', back: 'Back 1', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 },
      { id: '2', front: 'Front 2', back: 'Back 2', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 }
    ];
    global.fetch = vi.fn()
          .mockResolvedValueOnce({ json: async () => ({ data: cards, count: 2 }) }) // initial fetch
      .mockResolvedValueOnce({ json: async () => ({}) }); // DELETE
    render(<FlashcardList />);
      // Wait for the table cell, not the label
      expect(await screen.findByText('Front 1', { selector: 'td' })).toBeInTheDocument();
      window.confirm = vi.fn(() => true);
        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
        fireEvent.click(deleteButtons[0]);
        await waitFor(() => expect(screen.queryByText('Front 1', { selector: 'td' })).not.toBeInTheDocument());
        // Should only see Front 2 cell (Front 1 deleted)
            await waitFor(() => expect(screen.getByText('Front 2', { selector: 'td' })).toBeInTheDocument());
        expect(screen.queryByText('Front 1', { selector: 'td' })).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('Flashcard deleted!')).toBeInTheDocument());
  });

  it('shows toast on error', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ data: [card], count: 1 }) }) // initial fetch
      .mockResolvedValueOnce({ json: async () => ({ error: 'fail' }) }); // DELETE
    render(<FlashcardList />);
      // Wait for the table cell, not the label
      expect((await screen.findAllByText('Front', { selector: 'td' })).length).toBeGreaterThan(0);
      window.confirm = vi.fn(() => true);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
        fireEvent.click(deleteButtons[0]);
        await waitFor(() => expect(screen.getByText('fail')).toBeInTheDocument());
  });

  it('deletes multiple flashcards', async () => {
  const cards: Flashcard[] = [
    { id: '1', front: 'Front 1', back: 'Back 1', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 },
    { id: '2', front: 'Front 2', back: 'Back 2', user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 }
  ];
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ json: async () => ({ data: cards, count: 2 }) }) // initial fetch
    .mockResolvedValueOnce({ json: async () => ({}) }); // DELETE
  render(<FlashcardList />);
  expect(await screen.findByText('Front 1', { selector: 'td' })).toBeInTheDocument();

  // Select only data rows for 'Front 1' and 'Front 2' by clicking the row
  const rows = screen.getAllByRole('row');
  rows.forEach(row => {
    const cell = row.querySelector('td');
    if (cell && (cell.textContent === 'Front 1' || cell.textContent === 'Front 2')) {
      fireEvent.click(row);
    }
  });

  window.confirm = vi.fn(() => true);
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete Selected' })[0]);

  await waitFor(() => {
    expect(screen.queryByText('Front 1', { selector: 'td' })).not.toBeInTheDocument();
    expect(screen.queryByText('Front 2', { selector: 'td' })).not.toBeInTheDocument();
  });
  await waitFor(() => expect(screen.getByText('Flashcards deleted!')).toBeInTheDocument());
});
});
