// src/__tests__/integration/followup.routes.test.ts
// Routes the frontend calls that used to 404: void, follow-up list/send,
// and the `search` filter on invoice/client lists.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";
import { InvoiceStatus, Plan } from "@prisma/client";

const app = createApp();
const auth = () => `Bearer ${signAccessToken({ sub: "user-1", email: "test@example.com", plan: Plan.PRO })}`;

const sentInvoice = {
  id: "inv-1",
  userId: "user-1",
  number: "INV-0001",
  status: InvoiceStatus.SENT,
  viewToken: "tok-1",
  client: { id: "cl-1", name: "Acme", email: "a@acme.test" },
};

describe("Invoice follow-up & void routes (Integration)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("POST /:id/void voids a sent invoice", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(sentInvoice);
    (prisma.invoice.update as jest.Mock).mockResolvedValue({ ...sentInvoice, status: InvoiceStatus.VOID });

    const res = await request(app).post("/v1/invoices/inv-1/void").set("Authorization", auth());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(InvoiceStatus.VOID);
  });

  it("GET /:id/followups lists follow-ups for an owned invoice", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(sentInvoice);
    (prisma.followUp.findMany as jest.Mock).mockResolvedValue([{ id: "fu-1", notes: "Reminder" }]);

    const res = await request(app).get("/v1/invoices/inv-1/followups").set("Authorization", auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("POST /:id/followups emails the client and records the follow-up", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(sentInvoice);
    (prisma.followUp.create as jest.Mock).mockResolvedValue({ id: "fu-2", notes: "Reminder", method: "EMAIL" });

    const res = await request(app)
      .post("/v1/invoices/inv-1/followups")
      .set("Authorization", auth())
      .send({ subject: "Reminder", body: "Please pay." });

    expect(res.status).toBe(201);
    expect(prisma.followUp.create).toHaveBeenCalledWith({
      data: { invoiceId: "inv-1", method: "EMAIL", notes: "Reminder" },
    });
  });

  it("POST /:id/followups rejects drafts", async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...sentInvoice, status: InvoiceStatus.DRAFT });

    const res = await request(app)
      .post("/v1/invoices/inv-1/followups")
      .set("Authorization", auth())
      .send({ subject: "Reminder", body: "Please pay." });

    expect(res.status).toBe(422);
    expect(prisma.followUp.create).not.toHaveBeenCalled();
  });

  it("POST /:id/followups validates the payload", async () => {
    const res = await request(app)
      .post("/v1/invoices/inv-1/followups")
      .set("Authorization", auth())
      .send({ subject: "" });

    expect(res.status).toBe(422);
  });

  it("search filters invoice and client lists", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.client.count as jest.Mock).mockResolvedValue(0);

    await request(app).get("/v1/invoices?search=acme").set("Authorization", auth());
    await request(app).get("/v1/clients?search=acme").set("Authorization", auth());

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });
});

describe("Client summary (Integration)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("counts only paid + open invoices; drafts and voids are excluded", async () => {
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: "cl-1", userId: "user-1", name: "Acme" });
    (prisma.invoice.aggregate as jest.Mock).mockImplementation(({ where }: { where: { status: unknown } }) =>
      Promise.resolve({ _sum: { total: where.status === InvoiceStatus.PAID ? 300 : 120 } }),
    );

    const res = await request(app).get("/v1/clients/cl-1").set("Authorization", auth());

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ totalInvoiced: 420, totalPaid: 300, outstanding: 120 });
    for (const [args] of (prisma.invoice.aggregate as jest.Mock).mock.calls) {
      expect(args.where.status).toBeDefined(); // never an unfiltered sum
    }
  });
});
