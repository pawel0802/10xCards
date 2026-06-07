#!/usr/bin/env node
/* global process, console */
/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/use-unknown-in-catch-callback-variable */
/**
 * Generates a Playwright storageState file with an authenticated Supabase session.
 *
 * Strategy: authenticate directly against the Supabase API from Node.js (where
 * SUPABASE_URL / SUPABASE_KEY are available as normal env vars), then inject the
 * resulting cookies into a Playwright browser context using @supabase/ssr's own
 * createServerClient so the cookie format matches exactly what the server expects.
 *
 * This bypasses the app's sign-in route entirely, so the preview server does NOT
 * need to have the Supabase env vars configured.
 */
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";

const user = process.env.E2E_TEST_USER;
const pass = process.env.E2E_TEST_PASS;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const outPath = process.env.PLAYWRIGHT_STORAGE_STATE ?? "tests/e2e/storageState.json";

console.log("Configuration:");
console.log(`  Base URL:            ${baseUrl}`);
console.log(`  Storage State Path:  ${outPath}`);
console.log(`  User:                ${user ? "***" : "NOT SET"}`);
console.log(`  Pass:                ${pass ? "***" : "NOT SET"}`);
console.log(`  SUPABASE_URL:        ${supabaseUrl ? `${supabaseUrl.slice(0, 20)}...` : "NOT SET"}`);
console.log(`  SUPABASE_KEY:        ${supabaseKey ? "***" : "NOT SET"}`);

if (!user || !pass) {
  console.error("\nError: E2E_TEST_USER and E2E_TEST_PASS must be set");
  process.exit(2);
}
if (!supabaseUrl || !supabaseKey) {
  console.error("\nError: SUPABASE_URL and SUPABASE_KEY must be set");
  process.exit(2);
}

(async () => {
  // --- Step 1: sign in directly via Supabase API from Node.js ---
  console.log(`\nSigning in to Supabase as ${user}...`);

  const sessionCookies = {};

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => Object.entries(sessionCookies).map(([name, value]) => ({ name, value: String(value) })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          sessionCookies[name] = value;
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email: user, password: pass });

  if (error || !data.session) {
    console.error("Sign-in failed:", error?.message ?? "No session returned");
    process.exit(1);
  }

  const cookieNames = Object.keys(sessionCookies);
  console.log(`✓ Signed in as ${data.user?.email ?? "(unknown)"}`);
  console.log(`  Session cookies set: ${cookieNames.join(", ") || "(none)"}`);

  if (cookieNames.length === 0) {
    console.error("No cookies were collected after sign-in. @supabase/ssr may have changed its storage format.");
    process.exit(1);
  }

  // --- Step 2: inject cookies into a Playwright context ---
  const domain = new URL(baseUrl).hostname;
  const playwrightCookies = cookieNames.map((name) => ({
    name,
    value: String(sessionCookies[name]),
    domain,
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }));

  // Add an E2E bypass cookie so server-side middleware can recognize test runs and
  // short-circuit auth when necessary. This cookie is only honored when
  // E2E_TEST_USER is present in the server environment (CI), see middleware.ts.
  playwrightCookies.push({
    name: "E2E_BYPASS",
    value: "1",
    domain,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  });

  console.log(`\nCreating Playwright browser context with ${playwrightCookies.length} cookie(s)...`);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);

  // --- Step 3: verify the session works against the running server ---
  const page = await context.newPage();
  console.log(`Navigating to ${baseUrl}/dashboard to verify session...`);
  try {
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 15000 });
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    if (currentUrl.includes("/auth/signin")) {
      console.warn("⚠ Redirected to sign-in — cookies may not be recognised by the server.");
      console.warn("  The storage state will be saved but tests may still fail.");
    } else {
      console.log("✓ Dashboard accessible — session is valid");
    }
  } catch (navErr) {
    console.warn("Navigation failed (server may not be running):", navErr.message);
    console.warn("Saving storage state without verification.");
  }

  // --- Step 4: save storage state ---
  await context.storageState({ path: outPath });
  await browser.close();
  console.log(`\n✓ Saved storageState to ${outPath}`);
})().catch((err) => {
  console.error("Fatal error:", err.message ?? err);
  process.exit(1);
});
