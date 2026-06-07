// seed.spec.ts
import { test, expect } from '@playwright/test';

test('create flashcard, verify in My flashcards, then delete it', async ({ page }) => {
  const front = `Seed Front ${Date.now()}`;
  const back = `Seed Back ${Date.now()}`;

  await page.goto('/');

  // Sign in if necessary
  if (await page.getByRole('button', { name: /Generate Flashcards|New card|Add card|Create card/i }).count() === 0) {
    if (await page.getByRole('link', { name: /Sign in|Log in/i }).count() > 0) {
      await page.getByRole('link', { name: /Sign in|Log in/i }).click();
      const user = process.env.E2E_TEST_USER || `e2e+${Date.now()}@example.com`;
      const pass = process.env.E2E_TEST_PASS || 'Password123!';
      await page.getByLabel(/Email/i).fill(user);
      await page.getByLabel(/Password/i).fill(pass);
      await page.getByRole('button', { name: /Sign in|Log in/i }).click();
      await expect(page.getByRole('button', { name: /Generate Flashcards|My Flashcards|New card/i })).toBeVisible({ timeout: 10000 });
    }
  }

  // Navigate to My Flashcards
  if (await page.getByRole('link', { name: /My Flashcards/i }).count() > 0) {
    await page.getByRole('link', { name: /My Flashcards/i }).click();
  } else {
    await page.goto('/my-flashcards');
  }

  // Open new card form
  const newCardBtn = page.getByRole('button', { name: /New card|Create manually|Create flashcard|Add card/i });
  await expect(newCardBtn).toBeVisible({ timeout: 5000 });
  await newCardBtn.click();

  // Fill form fields
  await expect(page.getByRole('textbox', { name: /Front/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole('textbox', { name: /Front/i }).fill(front);
  await expect(page.getByRole('textbox', { name: /Back/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole('textbox', { name: /Back/i }).fill(back);

  // Submit
  await page.getByRole('button', { name: /Save|Create card|Create|Add/i }).click();

  // If Finish shows, click
  if (await page.getByRole('button', { name: /Finish|Done/i }).count() > 0) {
    await page.getByRole('button', { name: /Finish|Done/i }).click();
  }

  // Verify the card appears in the list
  const row = page.locator('tr', { hasText: front }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.getByText(front)).toBeVisible();
  await expect(row.getByText(back)).toBeVisible();

  // Delete the card
  await row.click();
  let deleteBtn = row.getByRole('button', { name: /Delete|Remove/i });
  if (await deleteBtn.count() === 0) {
    deleteBtn = page.getByRole('button', { name: /Delete|Remove/i });
  }
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  if (await page.getByRole('button', { name: /Confirm|Yes|Delete/i }).count() > 0) {
    await page.getByRole('button', { name: /Confirm|Yes|Delete/i }).click();
  }
  await expect(page.locator('tr', { hasText: front })).toHaveCount(0, { timeout: 10000 });
});