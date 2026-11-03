// src/__tests__/integration/features.routes.test.ts
// Client "Pay now" + Stripe webhook, duplicate, CSV export, logo upload,
// and PRO gating of the AI writing endpoints.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import { getStripe } from "../../lib/stripe";
import { signAccessToken } from "../../lib/jwt";
import { InvoiceStatus, Plan } from "@prisma/client";

const app = createApp();
const auth = () => `Bearer ${signAccessToken({ sub: "user-1", email: "test@example.com", plan: Plan.PRO })}`;

const openInvoice = {
  id: "inv-1",
  userId: "user-1",
  number: "INV-0007",
  status: InvoiceStatus.SENT,
  currency: "USD",
  total: 1234.5,
  viewToken: "tok-1",
  client: { id: "cl-1", name: "Acme", email: "billing@acme.test" },
  user: { bizName: "Studio", email: "me@studio.test" },
};

const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("Pay now (public)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a Stripe Checkout Session in minor units, without payment_method_types", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(openInvoice);
    const create = getStripe().checkout.sessions.create as jest.Mock;
    create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1" });

    const res = await request(app).post("/v1/invoices/view/tok-1/pay");

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.stripe.test/cs_test_1");
    const params = create.mock.calls[0][0];
    expect(params.mode).toBe("payment");
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params.line_items[0].price_data.unit_amount).toBe(123450);
    expect(params.metadata).toEqual({ kind: "invoice_payment", invoiceId: "inv-1" });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { stripeCheckoutSessionId: "cs_test_1" },
    });
  });

  it("does not multiply zero-decimal currencies", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...openInvoice, currency: "JPY", total: 5000 });
    const create = getStripe().checkout.sessions.create as jest.Mock;
    create.mockResolvedValue({ id: "cs_test_2", url: "https://checkout.stripe.test/cs_test_2" });

    await request(app).post("/v1/invoices/view/tok-1/pay");

    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(5000);
  });

  it("409 when the invoice is already paid", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...openInvoice, status: InvoiceStatus.PAID });

    const res = await request(app).post("/v1/invoices/view/tok-1/pay");

    expect(res.status).toBe(409);
  });

  it("demo-pay is unavailable once Stripe is configured", async () => {
    const res = await request(app).post("/v1/invoices/view/tok-1/demo-pay");

    expect(res.status).toBe(404);
    expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — invoice payments", () => {
  beforeEach(() => jest.clearAllMocks());

  const sendWebhook = (event: unknown) => {
    (getStripe().webhooks.constructEvent as jest.Mock).mockReturnValue(event);
    return request(app)
      .post("/v1/billing/webhook")
      .set("stripe-signature", "t=1,v1=sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({}));
  };

  it("marks the invoice PAID when the session is paid", async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...openInvoice,
      user: { email: "me@studio.test" },
    });

    const res = await sendWebhook({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "paid", metadata: { kind: "invoice_payment", invoiceId: "inv-1" } } },
    });

    expect(res.status).toBe(200);
    const call = (prisma.invoice.updateMany as jest.Mock).mock.calls[0][0];
    expect(call.where.id).toBe("inv-1");
    expect(call.data).toMatchObject({ status: InvoiceStatus.PAID, paidVia: "STRIPE", stripeCheckoutSessionId: "cs_1" });
  });

  it("waits for async_payment_succeeded when a delayed method completes unpaid", async () => {
    const res = await sendWebhook({
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", payment_status: "unpaid", metadata: { kind: "invoice_payment", invoiceId: "inv-1" } } },
    });

    expect(res.status).toBe(200);
    expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent: a retried event changes nothing and sends no second email", async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const res = await sendWebhook({
      type: "checkout.session.async_payment_succeeded",
      data: { object: { id: "cs_3", payment_status: "paid", metadata: { kind: "invoice_payment", invoiceId: "inv-1" } } },
    });

    expect(res.status).toBe(200);
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
  });
});

describe("Duplicate & CSV export", () => {
  beforeEach(() => jest.clearAllMocks());

  it("POST /:id/duplicate creates a new draft from the invoice's items", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      ...openInvoice,
      clientId: "cl-1",
      issueDate: new Date("2026-01-01"),
      dueDate: new Date("2026-01-31"),
      notes: "Thanks",
      terms: null,
      items: [{ description: "Design", quantity: 2, unitPrice: 100, taxPct: 20 }],
    });
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "user-1", plan: Plan.PRO, invoicesThisMonth: 0, currency: "USD" });
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: "cl-1", name: "Acme", email: "billing@acme.test" });
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([{ number: "INV-0007" }]);
    (prisma.$transaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    (prisma.invoice.create as jest.Mock).mockImplementation(({ data }) => ({ id: "inv-2", ...data }));

    const res = await request(app).post("/v1/invoices/inv-1/duplicate").set("Authorization", auth());

    expect(res.status).toBe(201);
    const data = (prisma.invoice.create as jest.Mock).mock.calls[0][0].data;
    expect(data.number).toBe("INV-0008");
    expect(data.total).toBe(240);
    expect(data.notes).toBe("Thanks");
    // 30-day window kept, counted from today
    const days = Math.round((data.dueDate.getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(30);
  });

  it("GET /export.csv returns CSV and neutralises spreadsheet formulas", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([{
      ...openInvoice,
      client: { name: "=HYPERLINK(\"evil\")", email: "a@b.test" },
      issueDate: new Date("2026-01-01"),
      dueDate: new Date("2026-01-31"),
      subtotal: 1000, taxAmount: 234.5, sentAt: null, paidAt: null, paidVia: null,
    }]);

    const res = await request(app).get("/v1/invoices/export.csv?status=SENT").set("Authorization", auth());

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const [header, row] = res.text.replace(/^﻿/, "").trim().split("\r\n");
    expect(header.startsWith("Number,Client,")).toBe(true);
    expect(row).toContain(`"'=HYPERLINK(""evil"")"`);
    expect(row).toContain("1234.50");
    expect((prisma.invoice.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ userId: "user-1", status: "SENT" });
  });
});

describe("Logo upload", () => {
  beforeEach(() => jest.clearAllMocks());

  const upload = (dataUrl: string) =>
    request(app).put("/v1/account/logo").set("Authorization", auth()).send({ dataUrl });

  it("stores a real PNG inline", async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user-1", logoUrl: "data:image/png;base64,..." });

    const res = await upload(`data:image/png;base64,${PNG_1PX}`);

    expect(res.status).toBe(200);
    expect((prisma.user.update as jest.Mock).mock.calls[0][0].data.logoUrl).toBe(`data:image/png;base64,${PNG_1PX}`);
  });

  it("rejects SVG", async () => {
    const res = await upload(`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`);
    expect(res.status).toBe(422);
  });

  it("rejects a file whose bytes don't match its type", async () => {
    const res = await upload(`data:image/png;base64,${Buffer.from("GIF89a not a png").toString("base64")}`);
    expect(res.status).toBe(422);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses non-http logo URLs through PATCH /account", async () => {
    const res = await request(app)
      .patch("/v1/account")
      .set("Authorization", auth())
      .send({ logoUrl: "javascript:alert(1)" });
    expect(res.status).toBe(422);
  });
});

describe("PRO gating — AI writing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("402 for FREE users, read from the database not the token", async () => {
    // Token says PRO, database says FREE (e.g. just downgraded)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: Plan.FREE });

    const res = await request(app)
      .post("/v1/ai/invoice-text")
      .set("Authorization", auth())
      .send({ kind: "terms" });

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("PLAN_LIMIT_REACHED");
  });

  it("returns drafted text for PRO users", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: Plan.PRO, bizName: "Studio", aiTone: "PROFESSIONAL" });

    const res = await request(app)
      .post("/v1/ai/invoice-text")
      .set("Authorization", auth())
      .send({ kind: "notes", items: ["Logo design"] });

    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe("string");
    expect(res.body.text.length).toBeGreaterThan(0);
  });
});
