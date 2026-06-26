import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:5180" },
  webServer: {
    command: "pnpm --filter turbofocus dev",
    port: 5180,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
