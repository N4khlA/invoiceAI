// src/__tests__/integration/contract.routes.test.ts
// Locks the frontend↔backend contract: pagination envelope (totalPages),
// client inclusion on invoice reads, create-time currency/issueDate,
// and billing status usage.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";
import { InvoiceStatus, Plan } from "@prisma/client";

const app = createApp();

function makeToken(plan: string = Plan.PRO) {
  return signAccessToken({ sub: "user-1", email: "test@example.com", plan });
}

describe("Response contract (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  // ── GET /v1/invoices ────────────────────────────────────────────────────────

  it("invoice list returns totalPages and rows include their client", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
      {
        id: "inv-1",
        number: "INV-0001",
        status: InvoiceStatus.SENT,
        total: 100,
        items: [],
        client: { id: "cl-1", name: "Acme", email: "a@acme.test" },
      },
    ]);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(45);

    const res = await request(app)
      .get("/v1/invoices?limit=20")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(45);
    expect(res.body.totalPages).toBe(3); // ceil(45/20)
    expect(res.body.data[0].client.name).toBe("Acme");
    // query param the frontend actually sends must be honored
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  // ── GET /v1/clients ────────────────────────────────────────────────────────

  it("client list returns totalPages", async () => {
    (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get("/v1/clients")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, page: 1, totalPages: 1 });
  });

  // ── POST /v1/invoices — currency + issueDate honored ───────────────────────

  it("create honors explicit currency and issueDate, defaults currency to the user's business currency otherwise", async () => {
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: "user-1",
      plan: Plan.PRO,
      invoicesThisMonth: 0,
      bizName: "B",
      bizAddress: null,
      bizPhone: null,
      bizWebsite: null,
      email: "test@example.com",
      currency: "EUR",
    });
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: "cl-1", name: "C", email: "c@c.com" });
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") return cb(prisma);
      return Promise.all(cb as Promise<unknown>[]);
    });
    (prisma.invoice.create as jest.Mock).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "inv-1",
      number: "INV-0001",
      status: InvoiceStatus.DRAFT,
      items: [],
      ...args.data,
    }));

    const issueDate = "2026-01-15T00:00:00.000Z";
    const res = await request(app)
      .post("/v1/invoices")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        clientId: "clm000000000000000000000",
        dueDate: "2026-02-01T00:00:00.000Z",
        issueDate,
        currency: "USD",
        lineItems: [{ description: "Dev", quantity: 1, unitPrice: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.currency).toBe("USD");
    expect(new Date(res.body.issueDate).toISOString()).toBe(issueDate);
    // explicit currency was passed through to the create call
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: "USD", issueDate: expect.any(Date) }),
      }),
    );
  });

  it("create defaults currency to the user's business currency when omitted", async () => {
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: "user-1",
      plan: Plan.PRO,
      invoicesThisMonth: 0,
      bizName: "B",
      bizAddress: null,
      bizPhone: null,
      bizWebsite: null,
      email: "test@example.com",
      currency: "EUR",
    });
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: "cl-1", name: "C", email: "c@c.com" });
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") return cb(prisma);
      return Promise.all(cb as Promise<unknown>[]);
    });
    (prisma.invoice.create as jest.Mock).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "inv-2",
      number: "INV-0002",
      status: InvoiceStatus.DRAFT,
      items: [],
      ...args.data,
    }));

    const res = await request(app)
      .post("/v1/invoices")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        clientId: "clm000000000000000000000",
        dueDate: "2026-02-01T00:00:00.000Z",
        lineItems: [{ description: "Dev", quantity: 1, unitPrice: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.currency).toBe("EUR");
  });

  // ── GET /v1/invoices/:id includes client ───────────────────────────────────

  it("invoice detail includes the client for display", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: "inv-1",
      number: "INV-0001",
      status: InvoiceStatus.DRAFT,
      items: [],
      followUps: [],
      client: { id: "cl-1", name: "Acme", email: "a@acme.test" },
    });

    const res = await request(app)
      .get("/v1/invoices/inv-1")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.client.name).toBe("Acme");
  });

  // ── GET /v1/billing/status includes usage ──────────────────────────────────

  it("billing status returns invoicesThisMonth for the plan meter", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      plan: Plan.FREE,
      subscriptionStatus: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      invoicesThisMonth: 3,
    });

    const res = await request(app)
      .get("/v1/billing/status")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ plan: "FREE", invoicesThisMonth: 3 });
  });
});
