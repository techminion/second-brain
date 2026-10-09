import { defineConfig, devices } from "@playwright/test";

// CI-06: when PLAYWRIGHT_BASE_URL is set the suite targets a remote
// deployment (Vercel preview) instead of starting a local dev server.
// VERCEL_AUTOMATION_BYPASS_SECRET carries Standard Preview Protection;
// x-vercel-set-bypass-cookie makes browser navigations inherit the bypass.
const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: remoteBaseUrl ?? "http://localhost:3000",
    trace: "on-first-retry",
    ...(bypassSecret
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          },
        }
      : {}),
  },
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          reuseExistingServer: !process.env.CI,
          url: "http://localhost:3000",
        },
      }),
  projects: [
    // Desktop specs stay on the desktop viewport; mobile-only specs (UX-10)
    // run in their own 390x844 touch project.
    { name: "chromium", testIgnore: /mobile\.spec\.ts$/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], hasTouch: true, viewport: { height: 844, width: 390 } },
    },
  ],
});
