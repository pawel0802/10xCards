import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./auth";

test("create flashcard, verify in My flashcards, then delete it", async ({ page }) => {
  const front = `Seed Front ${Date.now()}`;
  const back = `Seed Back ${Date.now()}`;

  await ensureSignedIn(page);
  await page.goto("/dashboard");

  await page.getByRole("link", { name: "Generate Flashcards" }).click();
  await expect(page.getByRole("button", { name: "Create manually" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Create manually" }).click();

  // Fill form fields
  await expect(page.getByRole("textbox", { name: /Front/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole("textbox", { name: /Front/i }).fill(front);
  await expect(page.getByRole("textbox", { name: /Back/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole("textbox", { name: /Back/i }).fill(back);

  // Submit
  await page.getByRole("button", { name: /Save|Create card|Create|Add/i }).click();

  // If Finish shows, click
  if ((await page.getByRole("button", { name: /Finish|Done/i }).count()) > 0) {
    await page.getByRole("button", { name: /Finish|Done/i }).click();
  }

  // Verify the card appears in the list
  await page.goto("/flashcards");
  const row = page.locator("tr", { hasText: front }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.getByText(front)).toBeVisible();
  await expect(row.getByText(back)).toBeVisible();

  // Delete the card
  await row.click();
  let deleteBtn = row.getByRole("button", { name: /Delete|Remove/i });
  if ((await deleteBtn.count()) === 0) {
    deleteBtn = page.getByRole("button", { name: /Delete|Remove/i });
  }
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  if ((await page.getByRole("button", { name: /Confirm|Yes|Delete/i }).count()) > 0) {
    await page.getByRole("button", { name: /Confirm|Yes|Delete/i }).click();
  }
  await expect(page.locator("tr", { hasText: front })).toHaveCount(0, { timeout: 10000 });
});
