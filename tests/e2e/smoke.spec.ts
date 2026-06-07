import { test, expect } from '@playwright/test';

test('sign-in → generate → review happy path', async ({ page }) => {
  const front = `E2E Front ${Date.now()}`;
  const back = `E2E Back ${Date.now()}`;
  await page.goto('/');

  // If the 'Generate Flashcards' button is present, assume authenticated; otherwise sign in
  if (await page.getByRole('button', { name: 'Generate Flashcards' }).count() === 0) {
    // Try sign-in flow (selectors may need adjustment)
    await page.getByRole('link', { name: 'Sign in' }).click();
    const email = process.env.E2E_TEST_USER || `e2e+${Date.now()}@example.com`;
    const password = process.env.E2E_TEST_PASS || 'Password123!';
    // Adjust selectors below if your auth form uses different labels
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Generate Flashcards' })).toBeVisible({ timeout: 10000 });
  }

  // Create card manually
  await page.getByRole('button', { name: 'Generate Flashcards' }).click();
  await expect(page.getByRole('button', { name: 'Create manually' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Create manually' }).click();

  // Wait for form fields to appear
  await expect(page.getByRole('textbox', { name: 'Front' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('textbox', { name: 'Back' })).toBeVisible({ timeout: 5000 });

  await page.getByRole('textbox', { name: 'Front' }).fill(front);
  await page.getByRole('textbox', { name: 'Back' }).fill(back);
  await page.getByRole('button', { name: 'Create card' }).click();

  // Wait for finish/summary and click Finish
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Finish' }).click();

  // Verify that card was created
  await page.getByRole('button', { name: 'My Flashcards' }).click();

  // Wait for the table row that contains front text
  const row = page.locator('tr', { hasText: front }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // Verify front and back values in the list
  await expect(row.getByText(front)).toBeVisible();
  await expect(row.getByText(back)).toBeVisible();

  // Click the card row to reveal actions (delete)
  await row.click();

  // Find delete button associated with the card (try in-row first, fallback global)
  let deleteBtn = row.getByRole('button', { name: 'Delete' });
  if (await deleteBtn.count() === 0) {
    deleteBtn = page.getByRole('button', { name: 'Delete' });
  }
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();

  // If a confirmation appears, click confirm
  if (await page.getByRole('button', { name: 'Confirm' }).count() > 0) {
    await page.getByRole('button', { name: 'Confirm' }).click();
  }

  // Verify the card was removed from the list
  await expect(page.locator('tr', { hasText: front })).toHaveCount(0, { timeout: 10000 });
});
