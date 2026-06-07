import { defineConfig, devices } from '@playwright/test';

const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE || 'tests/e2e/storageState.json';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npm run preview -- --port 3000',
    url: 'http://127.0.0.1:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: storageStatePath },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', storageState: storageStatePath },
    },
  ],
});
