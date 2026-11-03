import { expect, test, type Page } from "@playwright/test";
import { sharedPage } from "./helpers";

// The seeded demo account (npm run db:setup): PRO, invoices in every status.
// Signs in once and shares the page: logins are rate-limited.

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }, testInfo) => {
  page = await sharedPage(browser, testInfo);
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore the demo account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test.afterAll(async () => {
  await page.close();
});

test("exports the invoice list as CSV", async () => {
  await page.goto("/invoices");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^invoices-\d{4}-\d{2}-\d{2}\.csv$/);
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain("Number,Client,Client email,Status");
  expect(csv).toContain("INV-0001");
});

test("Pro users get AI-written payment terms with undo", async () => {
  await page.goto("/invoices/new");
  const terms = page.getByRole("textbox", { name: /^Payment terms/ });
  await expect(terms).toHaveValue("");

  await page.getByRole("button", { name: "Write with AI" }).nth(1).click();
  await expect(terms).not.toHaveValue("");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(terms).toHaveValue("");
});

test("duplicates an invoice into a new draft", async () => {
  await page.goto("/invoices");
  await page.getByRole("link", { name: "INV-0001" }).first().click();
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();

  await expect(page).toHaveURL(/\/invoices\/[a-z0-9]+\/edit$/);
  await expect(page.getByText(/Copied to draft INV-\d{4}/)).toBeVisible();
});

test("settings: automatic reminders switch is available on Pro @mobile", async () => {
  await page.goto("/account");
  const toggle = page.getByRole("switch", { name: /Automatic reminders/ });
  await expect(toggle).toBeEnabled();
  await expect(page.getByRole("button", { name: /Upload logo|Replace/ })).toBeVisible();
  // No sideways scrolling on any viewport
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
