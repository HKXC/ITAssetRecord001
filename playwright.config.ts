import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * They drive the real application against a real Supabase project, so they are not wired to
 * a webServer here: start the app yourself and point the tests at it.
 *
 *   npm run dev            # or: docker compose up
 *   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
 *
 * Without E2E_EMAIL / E2E_PASSWORD the suite skips itself and says so, rather than reporting
 * a green run that never touched the application. See docs/operations.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
