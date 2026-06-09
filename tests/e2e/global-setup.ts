/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { type FullConfig } from "@playwright/test";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execFileP = promisify(execFile);

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects?.[0]?.use?.baseURL ?? "http://127.0.0.1:4173";
  console.log(`[Global Setup] Generating storage state against ${baseURL}...`);

  const outPath = "tests/e2e/storageState.json";

  try {
    const env = { ...process.env, E2E_BASE_URL: baseURL, PLAYWRIGHT_STORAGE_STATE: outPath };
    console.log("[Global Setup] Running generate-storage-state.js");
    const { stdout, stderr } = await execFileP("node", ["./scripts/ci/generate-storage-state.js"], {
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    if (!fs.existsSync(outPath)) {
      throw new Error(`${outPath} was not created by generate-storage-state.js`);
    }

    console.log("[Global Setup] Storage state saved successfully.");
  } catch (_err) {
    console.error("[Global Setup] Failed to generate storage state via script:", _err);
    throw _err;
  }
}
