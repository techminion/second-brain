import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    reuseExistingServer: !process.env.CI,
    url: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
