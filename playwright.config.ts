import fs from "fs";
import path from "path";
import { defineConfig, devices } from "@playwright/test";

const defaultStorageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE ?? "tests/e2e/storageState.json";
const storageStatePath = fs.existsSync(path.resolve(defaultStorageStatePath)) ? defaultStorageStatePath : undefined;

export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "tests/e2e",
  outputDir: "test-results",
  reporter: [["list"], ["html", { outputFolder: "test-results/html-report", open: "never" }]],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: storageStatePath,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],
});
