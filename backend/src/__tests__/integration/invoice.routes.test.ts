// src/__tests__/integration/invoice.routes.test.ts
// Integration tests for /v1/invoices/* using supertest + mocked Prisma.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";
import { InvoiceStatus, Plan } from "@prisma/client";

const app = createApp();

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeToken(plan: string = Plan.PRO) {
  return signAccessToken({ sub: "user-1", email: "test@example.com", plan });
}

// ── Shared mock data ──────────────────────────────────────────────────────────

const baseInvoice = {
  id: "inv-1",
  number: "INV-0001",
  total: 110,
  subtotal: 100,
  taxAmount: 10,
  dueDate: new Date(),
  userId: "user-1",
  clientId: "client-1",
  currency: "USD",
  notes: null,
  terms: null,
  snapshotData: {},
};

// ─────────────────────────────────────────────────────────────────────────────

describe("Invoice Routes (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults so tests that don't care don't blow up
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  // ── POST /v1/invoices ───────────────────────────────────────────────────────

  describe("POST /v1/invoices", () => {
    it("201 with totals calculated server-side", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: "user-1",
        plan: Plan.PRO,
        invoicesThisMonth: 0,
        bizName: "B",
        bizAddress: null,
        bizPhone: null,
        bizWebsite: null,
        email: "test@example.com",
        currency: "USD",
      });
      (prisma.client.findFirst as jest.Mock).mockResolvedValue({
        id: "client-1",
        name: "C",
        email: "c@c.com",
        address: null,
        phone: null,
        company: null,
      });
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: unknown) => {
        if (typeof cb === "function") return cb(prisma);
        return Promise.all(cb as Promise<unknown>[]);
      });
      (prisma.invoice.create as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.DRAFT,
        items: [],
      });

      const res = await request(app)
        .post("/v1/invoices")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({
          clientId: "clm000000000000000000000",
          dueDate: new Date().toISOString(),
          lineItems: [{ description: "Dev", quantity: 1, unitPrice: 100, taxPct: 10 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("inv-1");
    });

    it("402 when Free plan invoice limit is reached", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: "user-1",
        plan: Plan.FREE,
        invoicesThisMonth: 5,
      });

      const res = await request(app)
        .post("/v1/invoices")
        .set("Authorization", `Bearer ${makeToken(Plan.FREE)}`)
        .send({
          clientId: "clm000000000000000000000",
          dueDate: new Date().toISOString(),
          lineItems: [{ description: "Dev", quantity: 1, unitPrice: 100 }],
        });

      expect(res.status).toBe(402);
    });

    it("401 when not authenticated (no Bearer token)", async () => {
      const res = await request(app)
        .post("/v1/invoices")
        .send({ clientId: "clm000000000000000000000", dueDate: new Date().toISOString(), lineItems: [] });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /v1/invoices/:id ────────────────────────────────────────────────────

  describe("GET /v1/invoices/:id", () => {
    it("200 and returns the invoice for the authenticated user", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.DRAFT,
        items: [],
        followUps: [],
      });

      const res = await request(app)
        .get("/v1/invoices/inv-1")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("inv-1");
    });

    it("404 for another user's invoice (tenant isolation)", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get("/v1/invoices/inv-other-user")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });

    it("401 when not authenticated", async () => {
      const res = await request(app).get("/v1/invoices/inv-1");
      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/invoices/:id/send ──────────────────────────────────────────────

  describe("POST /v1/invoices/:id/send", () => {
    it("200 and status becomes SENT", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.DRAFT,
        user: {
          id: "user-1",
          email: "user@example.com",
          bizName: "Biz",
          bizAddress: null,
          bizPhone: null,
          bizWebsite: null,
          currency: "USD",
        },
        client: {
          id: "client-1",
          name: "ClientName",
          email: "client@example.com",
          address: null,
          phone: null,
          company: null,
        },
        items: [],
      });
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      const res = await request(app)
        .post("/v1/invoices/inv-1/send")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("SENT");
    });

    it("422 if invoice is not DRAFT", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.SENT,
        user: { email: "user@example.com", bizName: "B" },
        client: { email: "c@c.com" },
        items: [],
      });

      const res = await request(app)
        .post("/v1/invoices/inv-1/send")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(422);
    });
  });

  // ── POST /v1/invoices/:id/mark-paid ────────────────────────────────────────

  describe("POST /v1/invoices/:id/mark-paid", () => {
    it("200 and status becomes PAID", async () => {
      // First findFirst for markInvoicePaid: SENT is in the allowed list
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.SENT,
      });
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.PAID,
        items: [],
      });

      const res = await request(app)
        .post("/v1/invoices/inv-1/mark-paid")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("PAID");
    });

    it("422 if invoice is already PAID", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.PAID,
      });

      const res = await request(app)
        .post("/v1/invoices/inv-1/mark-paid")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(422);
    });
  });
});
