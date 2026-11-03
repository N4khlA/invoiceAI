import { expect, test, type Page } from "@playwright/test";
import { sharedPage } from "./helpers";

// The whole money path for a brand-new (FREE) user:
// sign up → add a client → create & send an invoice → the client opens the
// link and pays → the invoice shows as paid online.

const stamp = Date.now();
const user = {
  business: `E2E Studio ${stamp}`,
  email: `e2e-${stamp}@invoiceai.test`,
  password: "E2eTest1234!",
};
const client = { name: "Ada Client", email: `ada-${stamp}@client.test` };

test.describe.configure({ mode: "serial" });

// One signed-in owner page for the whole flow: logins are rate-limited
// (10 per 15 min) and each login ends the account's other sessions.
let page: Page;
let invoiceUrl = "";
let publicUrl = "";

test.beforeAll(async ({ browser }, testInfo) => {
  page = await sharedPage(browser, testInfo);
});

test.afterAll(async () => {
  await page.close();
});

test("sign up lands on the dashboard", async () => {
  await page.goto("/register");
  await page.getByLabel("Business name").fill(user.business);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});

test("add a client, then create and send an invoice", async () => {
  await page.goto("/clients/new");
  await page.getByLabel("Contact name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: client.name })).toBeVisible();

  await page.goto("/invoices/new");
  await page.getByLabel("Bill to").selectOption({ label: client.name });
  await page.getByLabel("Line 1 description").fill("Brand identity");
  await page.getByLabel("Rate").fill("1200");
  await page.getByLabel("Tax %").fill("10");
  await expect(page.getByText("$1,320.00").first()).toBeVisible();

  // FREE plan: AI writing is offered as an upgrade instead of a broken button
  await expect(page.getByText("is included with Pro")).toBeVisible();
  await expect(page.getByRole("button", { name: "Write with AI" })).toHaveCount(0);

  await page.getByRole("button", { name: "Create & send" }).click();
  await expect(page).toHaveURL(/\/invoices\/[a-z0-9]+$/);
  await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

  invoiceUrl = page.url();
  publicUrl = await page.getByLabel("Client link", { exact: true }).inputValue();
  expect(publicUrl).toContain("/invoices/view/");
});

test("the client opens the link and pays with the demo checkout", async ({ browser }) => {
  // Fresh context: the client has no account and no cookies
  const context = await browser.newContext();
  const clientPage = await context.newPage();

  await clientPage.goto(publicUrl);
  await expect(clientPage.getByText("Brand identity").filter({ visible: true })).toBeVisible();
  await clientPage.getByRole("button", { name: "Pay now" }).click();

  await expect(clientPage).toHaveURL(/\/checkout$/);
  await expect(clientPage.getByText("Demo checkout.")).toBeVisible();
  await clientPage.getByRole("button", { name: /Pay \$1,320\.00/ }).click();

  await expect(clientPage).toHaveURL(/payment=success/);
  await expect(clientPage.getByText("Paid — thank you!")).toBeVisible();
  await expect(clientPage.getByRole("button", { name: "Pay now" })).toHaveCount(0);
  await context.close();
});

test("the owner sees it paid online", async () => {
  await page.goto(invoiceUrl);

  await expect(page.getByText("Paid online by client")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as paid" })).toHaveCount(0);
});
