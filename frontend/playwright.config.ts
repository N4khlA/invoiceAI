import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a running stack:
//   npm run db:local · npm run dev:backend · npm run dev:frontend   (repo root)
// The backend must run without Stripe keys so "Pay now" uses the demo checkout.
// No Playwright browser installed? Point at any Chromium:
//   PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // One at a time: logging in as the demo user ends its other sessions
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: "desktop" },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
