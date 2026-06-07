import type { Page } from "@playwright/test";

export async function ensureSignedIn(page: Page) {
  await page.goto("/");

  const signOutBtn = page.getByRole("button", { name: /Sign out/i });
  const isSignedIn = (await signOutBtn.count()) > 0;

  if (isSignedIn) {
    return;
  }

  const signInLink = page.getByRole("link", { name: /Sign in|Log in/i });
  if ((await signInLink.count()) === 0) {
    throw new Error(
      "User is not authenticated. Ensure PLAYWRIGHT_STORAGE_STATE is set and points to valid authenticated session.",
    );
  }

  throw new Error(
    `Not signed in and credentials unavailable. Set E2E_TEST_USER and E2E_TEST_PASS, or regenerate storage state with: node ./scripts/ci/generate-storage-state.js`,
  );
}
