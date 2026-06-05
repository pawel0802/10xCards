import { defineConfig } from "vitest/config";

import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/setupTests.ts"],
    exclude: ["node_modules/**", "tests/e2e/**", "**/seed.spec.ts"],
  },
});
