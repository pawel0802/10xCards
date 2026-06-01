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
    expect(screen.queryByText(/back/i)).not.toBeInTheDocument();
  });

  it('renders flashcards and shows row actions only when selected', async () => {
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
    // Edit/Delete not visible initially
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    // Select first row
    const rows = screen.getAllByRole('row');
    const row1 = rows.find(row => row.textContent?.includes('Front 1'));
    if (row1) fireEvent.click(row1);
    // Now Edit/Delete should appear for that row
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    // 'Delete Selected' not visible for one selection
    expect(screen.queryByRole('button', { name: 'Delete Selected' })).not.toBeInTheDocument();
    // Select second row
    const row2 = rows.find(row => row.textContent?.includes('Front 2'));
    if (row2) fireEvent.click(row2);
    // Now 'Delete Selected' should appear
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Selected' })).toBeInTheDocument());
  });
});

it('shows/hides pagination buttons correctly', async () => {
  const cards: Flashcard[] = [];
  for (let i = 1; i <= 25; i++) {
    cards.push({ id: String(i), front: `Front ${i}`, back: `Back ${i}`, user_id: 'u', created_at: '', updated_at: '', source: 'auto', due_date: '', interval_days: 1, ease_factor: 2.5, repetitions: 0 });
  }
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ data: cards.slice(0, 10), count: 25 }) });
  render(<FlashcardList />);
  // Wait for first page
  expect(await screen.findByText('Front 1')).toBeInTheDocument();
  // On first page: Previous hidden, Next visible
  expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

  // Go to page 2
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ data: cards.slice(10, 20), count: 25 }) });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Front 11')).toBeInTheDocument();
  // On middle page: both visible
  expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

  // Go to last page
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ data: cards.slice(20, 25), count: 25 }) });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Front 21')).toBeInTheDocument();
  // On last page: Previous visible, Next hidden
  expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
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
    // Select the correct data row (skip header)
    const rows = screen.getAllByRole('row');
    // The first row is usually the header, so select the second row
    const dataRow = rows[1];
    fireEvent.click(dataRow);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());
    const editButton = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);
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
      // Select the row first so Delete button appears
      const row = screen.getAllByRole('row').find(r => r.textContent?.includes('Front 1'));
      if (row) fireEvent.click(row);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument());
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);
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
    // Select the correct data row (skip header)
    const rows = screen.getAllByRole('row');
    // The first row is usually the header, so select the second row
    const dataRow = rows[1];
    fireEvent.click(dataRow);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument());
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);
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

  // Interact with the custom modal for mass delete
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete Selected' })[0]);
  // Wait for modal to appear
  expect(await screen.findByText(/delete 2 flashcards/i)).toBeInTheDocument();
  // Click the Delete button in the modal (last Delete button)
  const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
  fireEvent.click(deleteButtons[deleteButtons.length - 1]);

  await waitFor(() => {
   expect(screen.queryByText('Front 1', { selector: 'td' })).not.toBeInTheDocument();
   expect(screen.queryByText('Front 2', { selector: 'td' })).not.toBeInTheDocument();
  });
  await waitFor(() => expect(screen.getByText('Flashcards deleted!')).toBeInTheDocument());
});
});
