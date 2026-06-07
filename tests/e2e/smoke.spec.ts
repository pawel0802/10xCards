import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./auth";

test("sign-in → generate → review happy path", async ({ page }) => {
  const front = `E2E Front ${Date.now()}`;
  const back = `E2E Back ${Date.now()}`;
  await ensureSignedIn(page);
  await page.goto("/dashboard");

  const generateLink = page.getByRole("link", { name: "Generate Flashcards" });
  await expect(generateLink).toBeVisible({ timeout: 5000 });
  await generateLink.click();
  await expect(page.getByRole("button", { name: "Create manually" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Create manually" }).click();

  // Wait for form fields to appear
  await expect(page.getByRole("textbox", { name: "Front" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("textbox", { name: "Back" })).toBeVisible({ timeout: 5000 });

  // Type into fields to trigger React controlled inputs reliably
  const frontField = page.getByRole("textbox", { name: "Front" });
  const backField = page.getByRole("textbox", { name: "Back" });
  await frontField.click();
  await page.keyboard.type(front, { delay: 20 });
  await backField.click();
  await page.keyboard.type(back, { delay: 20 });

  const createBtn = page.getByRole("button", { name: "Create card" });
  // Wait for the button to become enabled (client-side validation)
  try {
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
  } catch (err) {
    // Debug info if still disabled
    const isDisabled = await createBtn.isDisabled();
    const frontVal = await frontField.inputValue().catch(() => "<no front>");
    const backVal = await backField.inputValue().catch(() => "<no back>");
    console.error(
      "Create button disabled:",
      isDisabled,
      "front:",
      frontVal.slice(0, 200),
      "back:",
      backVal.slice(0, 200),
    );
    throw err;
  }

  await createBtn.click();

  // Wait for finish/summary and click Finish
  await expect(page.getByRole("button", { name: "Finish" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Finish" }).click();

  // Verify that card was created
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "My Flashcards" }).click();

  // Wait for the table row that contains front text
  const row = page.locator("tr", { hasText: front }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // Verify front and back values in the list
  await expect(row.getByText(front)).toBeVisible();
  await expect(row.getByText(back)).toBeVisible();

  // Click the card row to reveal actions (delete)
  await row.click();

  // Find delete button associated with the card (try in-row first, fallback global)
  let deleteBtn = row.getByRole("button", { name: "Delete" });
  if ((await deleteBtn.count()) === 0) {
    deleteBtn = page.getByRole("button", { name: "Delete" });
  }
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();

  // If a confirmation appears, click confirm
  if ((await page.getByRole("button", { name: "Confirm" }).count()) > 0) {
    await page.getByRole("button", { name: "Confirm" }).click();
  }

  // Verify the card was removed from the list
  await expect(page.locator("tr", { hasText: front })).toHaveCount(0, { timeout: 10000 });
});
