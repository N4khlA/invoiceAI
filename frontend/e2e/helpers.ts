import type { Browser, TestInfo } from "@playwright/test";

/**
 * A page that outlives a single test (for beforeAll), with the project's
 * device and baseURL settings — browser.newPage() doesn't apply `use` itself.
 */
export function sharedPage(browser: Browser, testInfo: TestInfo) {
  const { baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use;
  return browser.newPage({ baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });
}
