// src/__tests__/integration/publicView.routes.test.ts
// Regression tests for the public invoice-view route (route shadowing fix)
// and the JSON 404 envelope. These go through createApp() on purpose —
// the original shadowing bug was invisible to service-level tests.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";
import { InvoiceStatus, Plan } from "@prisma/client";

const app = createApp();

function makeToken() {
  return signAccessToken({ sub: "user-1", email: "test@example.com", plan: Plan.PRO });
}

const publicInvoice = {
  id: "inv-1",
  number: "INV-0007",
  status: InvoiceStatus.SENT,
  issueDate: new Date(),
  dueDate: new Date(),
  currency: "USD",
  subtotal: 42,
  taxAmount: 0,
  total: 42,
  notes: null,
  terms: null,
  snapshotData: { business: { name: "Biz" }, client: { name: "Client" } },
  userId: "user-1", // must NOT appear in the response
  viewToken: "real-token-abc",
  items: [{ id: "item-1", description: "Consulting", quantity: 1, unitPrice: 42 }],
};

describe("Public invoice view route (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  // ── The shadowing regression ────────────────────────────────────────────────

  it("200 WITHOUT auth for GET /v1/invoices/view/:token (was 401 when the whole invoice router was mounted here)", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...publicInvoice });
    (prisma.invoice.update as jest.Mock).mockResolvedValue({});

    const res = await request(app).get("/v1/invoices/view/real-token-abc");

    expect(res.status).toBe(200);
    expect(res.body.number).toBe("INV-0007");
    // whitelisted payload only
    expect(res.body.userId).toBeUndefined();
    expect(res.body.viewToken).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    // SENT → VIEWED flip on first open
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvoiceStatus.VIEWED }),
      }),
    );
  });

  it("does not flip to VIEWED when the sender turned read receipts off", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...publicInvoice, user: { readReceipts: false } });

    const res = await request(app).get("/v1/invoices/view/real-token-abc");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(InvoiceStatus.SENT);
    expect(res.body.user).toBeUndefined();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("404 JSON for an unknown token (no auth required)", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/v1/invoices/view/bogus-token");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("regression: the public prefix no longer exposes authenticated handlers unauthenticated", async () => {
    // Before the fix, POST /v1/invoices/view/:id/mark-paid reached markPaid()
    // without the authenticate middleware (only guarded per-handler).
    const res = await request(app)
      .post("/v1/invoices/view/inv-1/mark-paid")
      .send({});

    expect(res.status).toBe(401);
  });

  it("authenticated mutation attempts under the view prefix resolve as JSON 404 (no matching route)", async () => {
    const res = await request(app)
      .delete("/v1/invoices/view/inv-1")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("authenticated GET /v1/invoices/:id still requires auth (401 without token)", async () => {
    const res = await request(app).get("/v1/invoices/inv-1");
    expect(res.status).toBe(401);
  });
});

describe("JSON 404 envelope (Integration)", () => {
  it("unknown authenticated /v1 path returns JSON, not HTML", async () => {
    const res = await request(app)
      .get("/v1/definitely-not-a-route")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });

  it("unknown non-/v1 path returns JSON 404 without auth", async () => {
    const res = await request(app).get("/nope/nope");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.success).toBe(false);
  });
});
