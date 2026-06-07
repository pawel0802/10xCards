#!/usr/bin/env node
import { chromium } from 'playwright';

const user = process.env.E2E_TEST_USER;
const pass = process.env.E2E_TEST_PASS;
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const outPath = process.env.PLAYWRIGHT_STORAGE_STATE || 'tests/e2e/storageState.json';

if (!user || !pass) {
  console.error('E2E_TEST_USER and E2E_TEST_PASS must be set');
  process.exit(2);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseUrl);

  try {
    // If there is a Sign in / Log in link, use it
    if ((await page.locator('a', { hasText: /Sign in|Log in/i }).count()) > 0) {
      await page.locator('a', { hasText: /Sign in|Log in/i }).click();
      try {
        await page.getByLabel(/Email/i).fill(user);
      } catch {
        await page.fill('input[name="email"]', user);
      }
      try {
        await page.getByLabel(/Password/i).fill(pass);
      } catch {
        await page.fill('input[name="password"]', pass);
      }
      if (await page.getByRole('button', { name: /Sign in|Log in|Submit/i }).count() > 0) {
        await page.getByRole('button', { name: /Sign in|Log in|Submit/i }).click();
      } else {
        await page.click('button[type="submit"]').catch(() => {});
      }
    } else {
      // Try filling any visible login form on the landing page
      try {
        if ((await page.getByLabel(/Email/i).count()) > 0) {
          await page.getByLabel(/Email/i).fill(user);
          await page.getByLabel(/Password/i).fill(pass);
          await page.getByRole('button', { name: /Sign in|Log in|Submit/i }).click();
        }
      } catch {}
    }

    // Wait for an element that indicates logged-in state
    await page.waitForSelector('text=Generate Flashcards, text=My Flashcards, text=New card, text=New deck', { timeout: 10000 }).catch(() => {});
  } catch (err) {
    console.warn('Login flow may have failed or selectors need adjusting:', err.message || err);
  }

  await context.storageState({ path: outPath });
  await browser.close();
  console.log(`Saved storageState to ${outPath}`);
})();
